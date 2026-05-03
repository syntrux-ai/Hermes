import type { Request } from 'express';
import { normalizePhone } from '../../shared/phone.js';
import { BookingRepository } from './booking-core/booking.repository.js';
import { TenantService } from './tenants/tenant.service.js';

type InitiationRequestBody = {
  caller_id?: string;
  agent_id?: string;
  called_number?: string;
  call_sid?: string;
};

export class InitClientDataService {
  constructor(
    private readonly tenantService = new TenantService(),
    private readonly bookingRepository = new BookingRepository(),
  ) {}

  async buildResponse(req: Request) {
    const context = await this.tenantService.resolveFromInitiationRequest(req);
    const body = req.body as InitiationRequestBody;
    const customerPhone = normalizePhone(body.caller_id ?? '');
    const bookings = customerPhone
      ? await this.bookingRepository.findRecentBookingsByPhone(context, customerPhone)
      : [];

    const confirmedBookings = bookings.filter((booking) => booking.status === 'confirmed');
    const latestBooking = bookings[0];
    const upcomingBooking = [...confirmedBookings].sort((a, b) => {
      const left = `${a.booking_date}T${a.start_time}`;
      const right = `${b.booking_date}T${b.start_time}`;
      return left.localeCompare(right);
    })[0];

    return {
      type: 'conversation_initiation_client_data',
      dynamic_variables: {
        customer_name: latestBooking?.client_name ?? '',
        customer_phone: customerPhone,
        is_existing_customer: bookings.length > 0,
        upcoming_booking_summary: upcomingBooking ? formatBookingSummary(upcomingBooking) : '',
        last_service: latestBooking?.services?.name ?? '',
        preferred_technician: latestBooking?.resources?.name ?? '',
        salon_name: context.organizationName,
        location_name: context.locationName,
        called_number: body.called_number ?? '',
        call_sid: body.call_sid ?? '',
      },
      user_id: customerPhone || undefined,
    };
  }
}

const formatBookingSummary = (booking: any) =>
  `${booking.services.name} on ${booking.booking_date} at ${booking.start_time.slice(0, 5)} with ${booking.resources.name}`;
