import { badRequest } from '../../shared/errors.js';
import { normalizePhone } from '../../shared/phone.js';
import { optionalString, requiredString } from '../../shared/validation.js';
import { AvailabilityService } from './booking-core/availability.service.js';
import { BookingService } from './booking-core/booking.service.js';
import type { TenantContext } from './tenants/tenant.types.js';
import { NailSalonAdapter } from './verticals/nail-salon/nailSalon.adapter.js';
import { isSupportedNailSalonVertical } from './verticals/nail-salon/nailSalon.validators.js';
import type { VoiceToolName } from './tool.types.js';

export class ToolRouter {
  constructor(
    private readonly availability = new AvailabilityService(),
    private readonly bookings = new BookingService(),
    private readonly nailSalon = new NailSalonAdapter(),
  ) {}

  async execute(toolName: VoiceToolName, context: TenantContext, body: Record<string, unknown>) {
    if (!isSupportedNailSalonVertical(context.vertical)) {
      throw badRequest(`Unsupported vertical: ${context.vertical}`);
    }

    switch (toolName) {
      case 'check-availability': {
        const response = await this.availability.checkAvailability({
          context,
          serviceId: optionalString(body.service_id),
          serviceName: optionalString(body.service_name) ?? optionalString(body.service),
          date: requiredString(body.date, 'date'),
          timePreference: optionalString(body.time_preference),
          resourceId: optionalString(body.resource_id),
          resourceName:
            optionalString(body.resource_name) ??
            optionalString(body.technician_name) ??
            optionalString(body.technician),
        });
        return this.nailSalon.formatAvailability(response);
      }

      case 'create-booking':
        return this.bookings.createBooking({
          context,
          clientName: requiredString(body.client_name, 'client_name'),
          clientPhone: normalizePhone(requiredString(body.client_phone, 'client_phone')),
          serviceId: optionalString(body.service_id),
          serviceName: optionalString(body.service_name) ?? optionalString(body.service),
          date: requiredString(body.date, 'date'),
          startTime: requiredString(body.start_time, 'start_time'),
          resourceId: optionalString(body.resource_id),
          resourceName:
            optionalString(body.resource_name) ??
            optionalString(body.technician_name) ??
            optionalString(body.technician),
          notes: optionalString(body.notes),
        });

      case 'find-bookings':
        return this.bookings.findBookings({
          context,
          clientPhone: normalizePhone(requiredString(body.client_phone, 'client_phone')),
          status: optionalString(body.status),
        });

      case 'cancel-booking':
        return this.bookings.cancelBooking({
          context,
          bookingId: requiredString(body.booking_id, 'booking_id'),
          clientPhone: normalizePhone(requiredString(body.client_phone, 'client_phone')),
          cancellationReason: optionalString(body.cancellation_reason),
        });

      case 'reschedule-booking':
        return this.bookings.rescheduleBooking({
          context,
          bookingId: requiredString(body.booking_id, 'booking_id'),
          clientPhone: normalizePhone(requiredString(body.client_phone, 'client_phone')),
          newDate: requiredString(body.new_date, 'new_date'),
          newStartTime: requiredString(body.new_start_time, 'new_start_time'),
          resourceId: optionalString(body.resource_id),
          resourceName:
            optionalString(body.resource_name) ??
            optionalString(body.technician_name) ??
            optionalString(body.technician),
        });
    }
  }
}
