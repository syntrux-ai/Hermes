import type { Request } from 'express';
import { verifyElevenLabsSignature } from '../../../integrations/elevenlabs/elevenlabs.auth.js';
import type { ElevenLabsToolRequest } from '../../../integrations/elevenlabs/elevenlabs.types.js';
import { badRequest } from '../../../shared/errors.js';
import { TenantRepository } from './tenant.repository.js';
import type { TenantContext } from './tenant.types.js';

const tenantRepository = new TenantRepository();

export class TenantService {
  async resolveFromVoiceRequest(req: Request): Promise<TenantContext> {
    const body = req.body as ElevenLabsToolRequest;
    const providerAgentId = body.provider_agent_id ?? body.agent_id;

    if (!providerAgentId || typeof providerAgentId !== 'string') {
      throw badRequest('provider_agent_id is required');
    }

    const context = await tenantRepository.findByProviderAgentId(providerAgentId);
    verifyElevenLabsSignature(req, context.webhookSecret);
    return context;
  }
}
