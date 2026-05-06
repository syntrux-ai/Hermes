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
        const requestedStartTime = normalizeOptionalToolTime(
          optionalString(body.start_time) ??
            optionalString(body.preferred_time) ??
            optionalString(body.requested_time) ??
            optionalString(body.time_preference),
        );
        const response = await this.availability.checkAvailability({
          context,
          serviceId: optionalString(body.service_id),
          serviceName: optionalString(body.service_name) ?? optionalString(body.service),
          date: requiredString(body.date, 'date'),
          timePreference: requestedStartTime ? undefined : optionalString(body.time_preference),
          requestedStartTime,
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
          startTime: normalizeToolTime(requiredString(body.start_time, 'start_time')),
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
          newStartTime: normalizeToolTime(requiredString(body.new_start_time, 'new_start_time')),
          resourceId: optionalString(body.resource_id),
          resourceName:
            optionalString(body.resource_name) ??
            optionalString(body.technician_name) ??
            optionalString(body.technician),
        });
    }
  }
}

const normalizeToolTime = (value: string) => {
  const trimmed = value.trim();
  const isoTime = trimmed.match(/T(\d{2}:\d{2})/);
  if (isoTime) return isoTime[1];

  const hhmmss = trimmed.match(/^(\d{2}:\d{2}):\d{2}$/);
  if (hhmmss) return hhmmss[1];

  const twelveHour = trimmed.match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)$/i);
  if (twelveHour) {
    let hours = Number(twelveHour[1]);
    const minutes = twelveHour[2] ?? '00';
    const meridiem = twelveHour[3].toLowerCase();
    if (meridiem === 'pm' && hours < 12) hours += 12;
    if (meridiem === 'am' && hours === 12) hours = 0;
    return `${hours.toString().padStart(2, '0')}:${minutes}`;
  }

  const hourOnly = trimmed.match(/^(\d{1,2})$/);
  if (hourOnly) {
    return `${Number(hourOnly[1]).toString().padStart(2, '0')}:00`;
  }

  return trimmed;
};

const normalizeOptionalToolTime = (value?: string) => {
  if (!value) return undefined;
  const normalized = normalizeToolTime(value);
  return /^\d{2}:\d{2}$/.test(normalized) ? normalized : undefined;
};
