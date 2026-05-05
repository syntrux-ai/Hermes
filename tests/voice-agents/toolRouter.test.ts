import { describe, expect, it } from 'vitest';
import { ToolRouter } from '../../src/modules/voice-agents/toolRouter.js';

const context = {
  organizationId: 'org',
  organizationName: 'Glam Nails Salon',
  locationId: 'loc',
  locationName: 'Bandra',
  timezone: 'Asia/Kolkata',
  vertical: 'nail_salon' as const,
  slotIntervalMinutes: 30,
  sameDayBufferMinutes: 60,
  voiceAgentId: 'va',
  providerAgentId: 'agent',
  webhookSecret: 'secret',
};

describe('ToolRouter', () => {
  it('does not pass generic technician phrases to availability', async () => {
    let capturedResourceName: string | undefined;
    const router = new ToolRouter(
      {
        checkAvailability: async (input: { resourceName?: string }) => {
          capturedResourceName = input.resourceName;
          return {
            available: true,
            service: 'Gel Manicure',
            date: '2026-05-08',
            duration_minutes: 45,
            slots: [],
          };
        },
      } as any,
    );

    await router.execute('check-availability', context, {
      service_name: 'Gel Manicure',
      date: '2026-05-08',
      technician_name: 'whoever is available',
    });

    expect(capturedResourceName).toBeUndefined();
  });
});
