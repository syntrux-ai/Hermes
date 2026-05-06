import { describe, expect, it } from 'vitest';
import { buildAvailability } from '../../../src/modules/voice-agents/booking-core/availability.engine.js';
import { AvailabilityService } from '../../../src/modules/voice-agents/booking-core/availability.service.js';

const context = {
  organizationId: 'org',
  organizationName: 'Polish Studio',
  locationId: 'loc',
  locationName: 'Bandra',
  timezone: 'Asia/Kolkata',
  vertical: 'nail_salon' as const,
  slotIntervalMinutes: 30,
  sameDayBufferMinutes: 0,
  voiceAgentId: 'va',
  providerAgentId: 'agent',
  webhookSecret: 'secret',
};

describe('buildAvailability', () => {
  it('removes booked and blocked time from resource working hours', () => {
    const slots = buildAvailability({
      context,
      service: { id: 'svc', name: 'Gel Manicure', duration_minutes: 45, price: 800 },
      resources: [{ id: 'res1', name: 'Priya Sharma', role: 'technician' }],
      date: '2099-05-04',
      locationHours: { open_time: '10:00', close_time: '13:00', is_closed: false },
      resourceHours: [{ resource_id: 'res1', start_time: '10:00', end_time: '13:00' }],
      bookings: [{ resource_id: 'res1', start_time: '10:30', end_time: '11:15' }],
      blockedSlots: [{ resource_id: null, start_time: '12:15', end_time: '12:45' }],
    });

    expect(slots.map((slot) => slot.start_time)).toEqual(['11:30']);
  });

  it('filters slots by afternoon preference', () => {
    const slots = buildAvailability({
      context,
      service: { id: 'svc', name: 'Gel Manicure', duration_minutes: 45, price: 800 },
      resources: [{ id: 'res1', name: 'Priya Sharma', role: 'technician' }],
      date: '2099-05-04',
      locationHours: { open_time: '10:00', close_time: '16:00', is_closed: false },
      resourceHours: [{ resource_id: 'res1', start_time: '10:00', end_time: '16:00' }],
      bookings: [],
      blockedSlots: [],
      timePreference: 'afternoon',
    });

    expect(slots[0]?.start_time).toBe('12:00');
  });
});

describe('AvailabilityService', () => {
  it('returns only the recommended slot when the requested exact time is available', async () => {
    const service = new AvailabilityService(
      buildRepository({
        resources: [
          { id: 'res1', name: 'Priya Sharma', role: 'technician' },
          { id: 'res2', name: 'Kavya Pillai', role: 'technician' },
        ],
        bookingCounts: { res1: 3, res2: 0 },
      }),
    );

    const response = await service.checkAvailability({
      context,
      serviceName: 'Gel Manicure',
      date: '2099-05-04',
      requestedStartTime: '15:00',
    });

    expect(response.available).toBe(true);
    expect(response.requested_time_available).toBe(true);
    expect(response.slots).toEqual([
      {
        start_time: '15:00',
        end_time: '15:45',
        resource_id: 'res2',
        resource_name: 'Kavya Pillai',
      },
    ]);
  });

  it('returns the closest three alternatives when the requested exact time is unavailable', async () => {
    const service = new AvailabilityService(
      buildRepository({
        resources: [{ id: 'res1', name: 'Priya Sharma', role: 'technician' }],
        bookings: [{ resource_id: 'res1', start_time: '15:00', end_time: '15:45' }],
      }),
    );

    const response = await service.checkAvailability({
      context,
      serviceName: 'Gel Manicure',
      date: '2099-05-04',
      requestedStartTime: '15:00',
    });

    expect(response.available).toBe(false);
    expect(response.requested_time_available).toBe(false);
    expect(response.slots).toEqual([]);
    expect(response.same_day_alternatives?.map((slot) => slot.start_time)).toEqual(['14:00', '16:00', '16:30']);
  });
});

const buildRepository = (overrides: {
  resources: Array<{ id: string; name: string; role: string }>;
  bookings?: Array<{ resource_id: string | null; start_time: string; end_time: string }>;
  bookingCounts?: Record<string, number>;
}) =>
  ({
    findService: async () => ({ id: 'svc', name: 'Gel Manicure', duration_minutes: 45, price: 800 }),
    listQualifiedResources: async () => overrides.resources,
    getLocationHours: async () => ({ open_time: '14:00', close_time: '17:30', is_closed: false }),
    getResourceHours: async (_context: unknown, resourceIds: string[]) =>
      resourceIds.map((resource_id) => ({ resource_id, start_time: '14:00', end_time: '17:30' })),
    getConfirmedBookings: async () => overrides.bookings ?? [],
    getBlockedSlots: async () => [],
    countBookingsByResource: async () => overrides.bookingCounts ?? {},
  }) as any;
