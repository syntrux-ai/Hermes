import { supabase } from '../../integrations/supabase/supabase.client.js';
import type { Json } from '../../integrations/supabase/supabase.types.js';
import { logger } from '../../shared/logger.js';
import type { TenantContext } from './tenants/tenant.types.js';
import type { VoiceToolName } from './tool.types.js';

export class AuditService {
  async record(input: {
    context?: TenantContext;
    providerAgentId?: string;
    toolName: VoiceToolName;
    requestPayload?: Json;
    responsePayload?: Json;
    success: boolean;
    errorMessage?: string;
    latencyMs: number;
  }) {
    const { error } = await supabase.from('voice_tool_audit_logs').insert({
      organization_id: input.context?.organizationId,
      location_id: input.context?.locationId,
      voice_agent_id: input.context?.voiceAgentId,
      provider: 'elevenlabs',
      provider_agent_id: input.providerAgentId ?? input.context?.providerAgentId,
      tool_name: input.toolName,
      request_payload: input.requestPayload,
      response_payload: input.responsePayload,
      success: input.success,
      error_message: input.errorMessage,
      latency_ms: input.latencyMs,
    });

    if (error) {
      logger.warn('Failed to write voice tool audit log', error);
    }
  }
}
