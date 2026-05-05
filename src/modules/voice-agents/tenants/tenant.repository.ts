import { assertSupabaseConfigured, supabase } from '../../../integrations/supabase/supabase.client.js';
import { TtlCache } from '../../../shared/cache.js';
import { notFound } from '../../../shared/errors.js';
import type { TenantContext } from './tenant.types.js';

const tenantCache = new TtlCache<TenantContext>(5 * 60 * 1000);

export class TenantRepository {
  async findByProviderAgentId(providerAgentId: string): Promise<TenantContext> {
    assertSupabaseConfigured();
    const normalizedProviderAgentId = providerAgentId.split('?')[0];
    const cached = tenantCache.get(normalizedProviderAgentId);
    if (cached) return cached;

    const { data, error } = await this.findActiveVoiceAgent(normalizedProviderAgentId);

    if (error) throw error;
    const row = data as any;
    const organization = Array.isArray(row?.organizations) ? row.organizations[0] : row?.organizations;
    const location = Array.isArray(row?.locations) ? row.locations[0] : row?.locations;

    if (!row || organization?.status !== 'active' || !location?.active) {
      throw notFound('Voice agent is not configured in Hermes');
    }

    const context = {
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

    tenantCache.set(normalizedProviderAgentId, context);
    tenantCache.set(row.provider_agent_id.split('?')[0], context);
    return context;
  }

  private findActiveVoiceAgent(providerAgentId: string) {
    return supabase
      .from('voice_agents')
      .select(voiceAgentSelect)
      .eq('provider', 'elevenlabs')
      .like('provider_agent_id', `${providerAgentId}%`)
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
