import { describe, expect, it } from 'vitest';
import { InitClientDataService } from '../../src/modules/voice-agents/initClientData.service.js';

describe('InitClientDataService', () => {
  it('returns dynamic variables for an existing caller', async () => {
    const service = new InitClientDataService(
      {
        resolveFromInitiationRequest: async () => ({
          organizationId: 'org',
          organizationName: 'Glam Nails Salon',
          locationId: 'loc',
          locationName: 'Bandra',
          timezone: 'Asia/Kolkata',
          vertical: 'nail_salon',
          slotIntervalMinutes: 30,
          sameDayBufferMinutes: 60,
          voiceAgentId: 'va',
          providerAgentId: 'agent',
          webhookSecret: 'secret',
        }),
      } as any,
      {
        findRecentBookingsByPhone: async () => [
          {
            client_name: 'Harshita Shah',
            client_phone: '+919820011234',
            booking_date: '2026-05-06',
            start_time: '12:00',
            status: 'confirmed',
            services: { name: 'Gel Manicure' },
            resources: { name: 'Priya Sharma' },
          },
        ],
      } as any,
    );

    const response = await service.buildResponse({
      body: {
        caller_id: '+91 98200 11234',
        agent_id: 'agent_123',
        called_number: '+912212345678',
        call_sid: 'call_123',
      },
      header: () => undefined,
    } as any);

    expect(response.dynamic_variables).toMatchObject({
      customer_name: 'Harshita Shah',
      customer_phone: '+919820011234',
      is_existing_customer: true,
      upcoming_booking_summary: 'Gel Manicure on 2026-05-06 at 12:00 with Priya Sharma',
      last_service: 'Gel Manicure',
      preferred_technician: 'Priya Sharma',
      salon_name: 'Glam Nails Salon',
      location_name: 'Bandra',
    });
  });
});
