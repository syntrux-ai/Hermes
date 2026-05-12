import { conflict, forbidden } from '../../../shared/errors.js';
import { normalizePhone } from '../../../shared/phone.js';
import { addMinutesToTime } from '../../../shared/time.js';
import { assertDate, assertTime } from '../../../shared/validation.js';
import { AssignmentService } from './assignment.service.js';
import { AvailabilityService } from './availability.service.js';
import { BookingRepository } from './booking.repository.js';
import type { CreateBookingInput, RescheduleInput } from './booking.types.js';

export class BookingService {
  constructor(
    private readonly repository = new BookingRepository(),
    private readonly availability = new AvailabilityService(repository),
    private readonly assignment = new AssignmentService(),
  ) {}

  async createBooking(input: CreateBookingInput) {
    assertDate(input.date, 'date');
    assertTime(input.startTime, 'start_time');

    const service = await this.repository.findService(input.context, {
      serviceId: input.serviceId,
      serviceName: input.serviceName,
    });

    const availability = await this.availability.checkAvailability({
      context: input.context,
      serviceId: service.id,
      date: input.date,
      resourceId: input.resourceId,
      resourceName: input.resourceName,
    });
    if ((input.resourceId || input.resourceName) && availability.preferred_resource_available === false) {
      throw conflict('Requested technician is not available for this slot', {
        preferred_resource_next_available: availability.preferred_resource_next_available,
        same_day_alternatives: availability.same_day_alternatives,
      });
    }

    const slots = availability.slots;

    const exactSlots = slots.filter((slot) => slot.start_time === input.startTime);
    const bookingCounts = await this.repository.countBookingsByResource(
      input.context,
      input.date,
      exactSlots.map((slot) => slot.resource_id),
    );
    const selected = this.assignment.chooseRecommendedSlot(exactSlots, bookingCounts, input.startTime);

    if (!selected) {
      throw conflict('Requested slot is no longer available', {
        requested: {
          date: input.date,
          start_time: input.startTime,
          resource_name: input.resourceName,
          service: service.name,
        },
        available_start_times: [...new Set(slots.map((slot) => slot.start_time))].slice(0, 10),
        alternatives: slots.slice(0, 5),
      });
    }

    const booking = await this.repository.insertBooking({
      context: input.context,
      resourceId: selected.resource_id,
      serviceId: service.id,
      clientName: input.clientName,
      clientPhone: input.clientPhone,
      date: input.date,
      startTime: input.startTime,
      endTime: addMinutesToTime(input.startTime, service.duration_minutes),
      notes: input.notes,
    });

    await this.repository.insertBookingEvent({
      context: input.context,
      bookingId: booking.id,
      eventType: 'created',
      newValues: booking,
    });

    return {
      success: true,
      booking_id: booking.id,
      client_name: booking.client_name,
      service: service.name,
      resource_name: selected.resource_name,
      date: booking.booking_date,
      start_time: booking.start_time.slice(0, 5),
      end_time: booking.end_time.slice(0, 5),
      price: service.price,
      message: `Booked ${service.name} on ${booking.booking_date} at ${booking.start_time.slice(0, 5)} with ${selected.resource_name}.`,
    };
  }

  async findBookings(input: { context: CreateBookingInput['context']; clientPhone: string; status?: string }) {
    const status = input.status ?? 'confirmed';
    const bookings = await this.repository.findBookingsByPhone(input.context, input.clientPhone, status);
    const bookingSummaries = bookings.map((booking) => ({
      booking_id: booking.id,
      service: booking.services.name,
      resource_name: booking.resources.name,
      date: booking.booking_date,
      start_time: booking.start_time.slice(0, 5),
      end_time: booking.end_time.slice(0, 5),
      status: booking.status,
    }));
    const primaryBooking = bookingSummaries[0];

    return {
      has_bookings: bookingSummaries.length > 0,
      booking_count: bookingSummaries.length,
      booking: primaryBooking ?? null,
      bookings: bookingSummaries,
      message: primaryBooking
        ? `Found ${primaryBooking.service} on ${primaryBooking.date} at ${primaryBooking.start_time} with ${primaryBooking.resource_name}.`
        : 'No matching bookings found.',
    };
  }

  async cancelBooking(input: {
    context: CreateBookingInput['context'];
    bookingId: string;
    clientPhone: string;
    cancellationReason?: string;
  }) {
    const booking = await this.repository.findBookingById(input.context, input.bookingId);
    this.assertPhoneMatches(booking.client_phone, input.clientPhone);

    if (booking.status !== 'confirmed') {
      throw conflict('Only confirmed bookings can be cancelled');
    }

    const updated = await this.repository.updateBooking(input.bookingId, {
      status: 'cancelled',
      cancellation_reason: input.cancellationReason,
    });

    await this.repository.insertBookingEvent({
      context: input.context,
      bookingId: input.bookingId,
      eventType: 'cancelled',
      oldValues: booking,
      newValues: updated,
    });

    return {
      success: true,
      booking_id: input.bookingId,
      message: 'Booking cancelled successfully',
    };
  }

  async rescheduleBooking(input: RescheduleInput) {
    assertDate(input.newDate, 'new_date');
    assertTime(input.newStartTime, 'new_start_time');

    const booking = await this.repository.findBookingById(input.context, input.bookingId);
    this.assertPhoneMatches(booking.client_phone, input.clientPhone);

    if (booking.status !== 'confirmed') {
      throw conflict('Only confirmed bookings can be rescheduled');
    }

    const requestedResource =
      input.resourceId || input.resourceName
        ? await this.repository.findResource(input.context, {
            resourceId: input.resourceId,
            resourceName: input.resourceName,
          })
        : undefined;

    const availability = await this.availability.checkAvailability({
      context: input.context,
      serviceId: booking.service_id,
      date: input.newDate,
      resourceId: requestedResource?.id,
    });
    if (requestedResource && availability.preferred_resource_available === false) {
      throw conflict('Requested technician is not available for this reschedule slot', {
        preferred_resource_next_available: availability.preferred_resource_next_available,
        same_day_alternatives: availability.same_day_alternatives,
      });
    }

    const slots = availability.slots;
    const exactSlots = slots.filter((slot) => slot.start_time === input.newStartTime);
    const bookingCounts = await this.repository.countBookingsByResource(
      input.context,
      input.newDate,
      exactSlots.map((slot) => slot.resource_id),
    );
    const selected = this.assignment.chooseRecommendedSlot(exactSlots, bookingCounts, input.newStartTime);

    if (!selected) {
      throw conflict('Requested reschedule slot is not available', {
        requested: {
          date: input.newDate,
          start_time: input.newStartTime,
          resource_name: input.resourceName,
        },
        available_start_times: [...new Set(slots.map((slot) => slot.start_time))].slice(0, 10),
        alternatives: slots.slice(0, 5),
      });
    }

    const updated = await this.repository.updateBooking(input.bookingId, {
      resource_id: selected.resource_id,
      booking_date: input.newDate,
      start_time: input.newStartTime,
      end_time: addMinutesToTime(input.newStartTime, booking.services.duration_minutes),
    });

    await this.repository.insertBookingEvent({
      context: input.context,
      bookingId: input.bookingId,
      eventType: 'rescheduled',
      oldValues: booking,
      newValues: updated,
    });

    return {
      success: true,
      booking_id: input.bookingId,
      old_date: booking.booking_date,
      old_start_time: booking.start_time.slice(0, 5),
      new_date: updated.booking_date,
      new_start_time: updated.start_time.slice(0, 5),
      new_end_time: updated.end_time.slice(0, 5),
      resource_name: selected.resource_name,
      service: booking.services.name,
      message: `Rescheduled ${booking.services.name} from ${booking.booking_date} at ${booking.start_time.slice(0, 5)} to ${updated.booking_date} at ${updated.start_time.slice(0, 5)} with ${selected.resource_name}.`,
    };
  }

  private assertPhoneMatches(storedPhone: string, providedPhone: string) {
    if (normalizePhone(storedPhone) !== normalizePhone(providedPhone)) {
      throw forbidden('Phone number does not match the booking');
    }
  }
}
