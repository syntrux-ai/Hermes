import { assertSupabaseConfigured, supabase } from '../../../integrations/supabase/supabase.client.js';
import { notFound } from '../../../shared/errors.js';
import type { TenantContext } from './tenant.types.js';

export class TenantRepository {
  async findByProviderAgentId(providerAgentId: string): Promise<TenantContext> {
    assertSupabaseConfigured();
    const { data, error } = await supabase
      .from('voice_agents')
      .select(
        `
        id,
        provider_agent_id,
        webhook_secret,
        organization_id,
        location_id,
        organizations!inner(id, name, vertical, status),
        locations!inner(id, name, timezone, active, slot_interval_minutes, same_day_buffer_minutes)
      `,
      )
      .eq('provider', 'elevenlabs')
      .eq('provider_agent_id', providerAgentId)
      .eq('active', true)
      .maybeSingle();

    if (error) throw error;
    const row = data as any;
    const organization = Array.isArray(row?.organizations) ? row.organizations[0] : row?.organizations;
    const location = Array.isArray(row?.locations) ? row.locations[0] : row?.locations;

    if (!row || organization?.status !== 'active' || !location?.active) {
      throw notFound('Voice agent is not configured in Hermes');
    }

    return {
      organizationId: row.organization_id,
      organizationName: organization.name,
      locationId: row.location_id,
      locationName: location.name,
      timezone: location.timezone,
      vertical: organization.vertical,
      slotIntervalMinutes: location.slot_interval_minutes,
      sameDayBufferMinutes: location.same_day_buffer_minutes,
      voiceAgentId: row.id,
      providerAgentId: row.provider_agent_id,
      webhookSecret: row.webhook_secret,
    };
  }
}
