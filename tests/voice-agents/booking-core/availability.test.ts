import { describe, expect, it } from 'vitest';
import { buildAvailability } from '../../../src/modules/voice-agents/booking-core/availability.engine.js';

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
