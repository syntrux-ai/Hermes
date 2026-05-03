import type { Request } from 'express';
import { TenantService } from './tenants/tenant.service.js';
import type { TenantContext } from './tenants/tenant.types.js';

export class VoiceAgentService {
  constructor(private readonly tenantService = new TenantService()) {}

  resolveContext(req: Request): Promise<TenantContext> {
    return this.tenantService.resolveFromVoiceRequest(req);
  }
}
