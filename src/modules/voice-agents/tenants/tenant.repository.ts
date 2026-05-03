import { assertSupabaseConfigured, supabase } from '../../../integrations/supabase/supabase.client.js';
import { notFound } from '../../../shared/errors.js';
import type { TenantContext } from './tenant.types.js';

export class TenantRepository {
  async findByProviderAgentId(providerAgentId: string): Promise<TenantContext> {
    assertSupabaseConfigured();
    const normalizedProviderAgentId = providerAgentId.split('?')[0];
    const exact = await this.findActiveVoiceAgent(providerAgentId);
    const normalized =
      exact.data || normalizedProviderAgentId === providerAgentId
        ? exact
        : await this.findActiveVoiceAgent(normalizedProviderAgentId);
    const prefixed =
      normalized.data || providerAgentId.includes('?')
        ? normalized
        : await this.findActiveVoiceAgentByBranchPrefix(providerAgentId);

    const { data, error } = prefixed;

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

  private findActiveVoiceAgent(providerAgentId: string) {
    return supabase
      .from('voice_agents')
      .select(voiceAgentSelect)
      .eq('provider', 'elevenlabs')
      .eq('provider_agent_id', providerAgentId)
      .eq('active', true)
      .maybeSingle();
  }

  private findActiveVoiceAgentByBranchPrefix(providerAgentId: string) {
    return supabase
      .from('voice_agents')
      .select(voiceAgentSelect)
      .eq('provider', 'elevenlabs')
      .like('provider_agent_id', `${providerAgentId}?%`)
      .eq('active', true)
      .maybeSingle();
  }
}

const voiceAgentSelect = `
  id,
  provider_agent_id,
  webhook_secret,
  organization_id,
  location_id,
  organizations!inner(id, name, vertical, status),
  locations!inner(id, name, timezone, active, slot_interval_minutes, same_day_buffer_minutes)
`;
