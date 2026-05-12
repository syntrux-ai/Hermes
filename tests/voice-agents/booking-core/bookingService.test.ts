import { describe, expect, it } from 'vitest';
import { BookingService } from '../../../src/modules/voice-agents/booking-core/booking.service.js';

const context = {
  organizationId: 'org',
  organizationName: 'GlamNails Studio',
  locationId: 'loc',
  locationName: 'Bandra West',
  timezone: 'Asia/Kolkata',
  vertical: 'nail_salon' as const,
  slotIntervalMinutes: 30,
  sameDayBufferMinutes: 60,
  voiceAgentId: 'va',
  providerAgentId: 'agent',
  webhookSecret: 'secret',
};

describe('BookingService', () => {
  it('returns a direct primary booking object for find-bookings responses', async () => {
    const service = new BookingService({
      findBookingsByPhone: async () => [
        {
          id: 'booking-1',
          booking_date: '2026-05-08',
          start_time: '11:00:00',
          end_time: '12:15:00',
          status: 'confirmed',
          services: { name: 'Mani-Pedi Classic' },
          resources: { name: 'Nisha Joshi' },
        },
      ],
    } as any);

    const response = await service.findBookings({
      context,
      clientPhone: '+919999999999',
      status: 'confirmed',
    });

    expect(response.has_bookings).toBe(true);
    expect(response.booking_count).toBe(1);
    expect(response.booking).toEqual({
      booking_id: 'booking-1',
      service: 'Mani-Pedi Classic',
      resource_name: 'Nisha Joshi',
      date: '2026-05-08',
      start_time: '11:00',
      end_time: '12:15',
      status: 'confirmed',
    });
    expect(response.bookings).toEqual([response.booking]);
    expect(response.message).toBe('Found Mani-Pedi Classic on 2026-05-08 at 11:00 with Nisha Joshi.');
  });

  it('returns a direct empty state for find-bookings responses with no matches', async () => {
    const service = new BookingService({
      findBookingsByPhone: async () => [],
    } as any);

    const response = await service.findBookings({
      context,
      clientPhone: '+919999999999',
      status: 'confirmed',
    });

    expect(response).toEqual({
      has_bookings: false,
      booking_count: 0,
      booking: null,
      bookings: [],
      message: 'No matching bookings found.',
    });
  });

  it('returns direct confirmation fields and a message for create-booking responses', async () => {
    const service = new BookingService(
      {
        findService: async () => ({ id: 'svc', name: 'Gel Manicure', duration_minutes: 45, price: 800 }),
        countBookingsByResource: async () => ({}),
        insertBooking: async () => ({
          id: 'booking-1',
          client_name: 'Voice Test',
          booking_date: '2026-05-08',
          start_time: '15:00:00',
          end_time: '15:45:00',
        }),
        insertBookingEvent: async () => ({}),
      } as any,
      {
        checkAvailability: async () => ({
          slots: [{ start_time: '15:00', end_time: '15:45', resource_id: 'res1', resource_name: 'Priya Sharma' }],
        }),
      } as any,
    );

    const response = await service.createBooking({
      context,
      clientName: 'Voice Test',
      clientPhone: '+919999999999',
      serviceName: 'Gel Manicure',
      date: '2026-05-08',
      startTime: '15:00',
    });

    expect(response).toMatchObject({
      success: true,
      booking_id: 'booking-1',
      client_name: 'Voice Test',
      service: 'Gel Manicure',
      resource_name: 'Priya Sharma',
      date: '2026-05-08',
      start_time: '15:00',
      end_time: '15:45',
      price: 800,
      message: 'Booked Gel Manicure on 2026-05-08 at 15:00 with Priya Sharma.',
    });
  });

  it('returns direct confirmation fields and a message for reschedule-booking responses', async () => {
    const service = new BookingService(
      {
        findBookingById: async () => ({
          id: 'booking-1',
          client_phone: '+919999999999',
          booking_date: '2026-05-08',
          start_time: '11:00:00',
          service_id: 'svc',
          status: 'confirmed',
          services: { name: 'Mani-Pedi Classic', duration_minutes: 75 },
        }),
        countBookingsByResource: async () => ({}),
        updateBooking: async () => ({
          booking_date: '2026-05-09',
          start_time: '16:00:00',
          end_time: '17:15:00',
        }),
        insertBookingEvent: async () => ({}),
      } as any,
      {
        checkAvailability: async () => ({
          slots: [{ start_time: '16:00', end_time: '17:15', resource_id: 'res1', resource_name: 'Nisha Joshi' }],
        }),
      } as any,
    );

    const response = await service.rescheduleBooking({
      context,
      bookingId: 'booking-1',
      clientPhone: '+919999999999',
      newDate: '2026-05-09',
      newStartTime: '16:00',
    });

    expect(response).toMatchObject({
      success: true,
      booking_id: 'booking-1',
      old_date: '2026-05-08',
      old_start_time: '11:00',
      new_date: '2026-05-09',
      new_start_time: '16:00',
      new_end_time: '17:15',
      resource_name: 'Nisha Joshi',
      service: 'Mani-Pedi Classic',
      message: 'Rescheduled Mani-Pedi Classic from 2026-05-08 at 11:00 to 2026-05-09 at 16:00 with Nisha Joshi.',
    });
  });
});
