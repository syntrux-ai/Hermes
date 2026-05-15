import type { Request, Response } from 'express';
import { AppError } from '../../shared/errors.js';
import type { Json } from '../../integrations/supabase/supabase.types.js';
import { AuditService } from './audit.service.js';
import { ToolRouter } from './toolRouter.js';
import type { VoiceToolName } from './tool.types.js';
import { VoiceAgentService } from './voiceAgent.service.js';
import { InitClientDataService } from './initClientData.service.js';
import { logger } from '../../shared/logger.js';
import { PostCallService } from './postCall.service.js';

export class VoiceAgentController {
  constructor(
    private readonly voiceAgentService = new VoiceAgentService(),
    private readonly toolRouter = new ToolRouter(),
    private readonly audit = new AuditService(),
    private readonly initClientData = new InitClientDataService(),
    private readonly postCall = new PostCallService(),
  ) {}

  handleTool(toolName: VoiceToolName) {
    return async (req: Request, res: Response) => {
      const startedAt = Date.now();
      let context;
      const providerAgentId =
        typeof req.body?.provider_agent_id === 'string'
          ? req.body.provider_agent_id
          : typeof req.body?.agent_id === 'string'
            ? req.body.agent_id
            : undefined;

      try {
        context = await this.voiceAgentService.resolveContext(req);
        const response = await this.toolRouter.execute(toolName, context, req.body as Record<string, unknown>);

        void this.audit.record({
          context,
          providerAgentId,
          toolName,
          requestPayload: req.body as Json,
          responsePayload: response as Json,
          success: true,
          latencyMs: Date.now() - startedAt,
        }).catch((auditError) => logger.warn('voice_tool_audit_failed', auditError));

        res.json(response);
      } catch (error) {
        void this.audit.record({
          context,
          providerAgentId,
          toolName,
          requestPayload: req.body as Json,
          success: false,
          errorMessage: error instanceof Error ? error.message : 'Unknown error',
          latencyMs: Date.now() - startedAt,
        }).catch((auditError) => logger.warn('voice_tool_audit_failed', auditError));

        throw error;
      }
    };
  }

  handleInitClientData() {
    return async (req: Request, res: Response) => {
      const response = await this.initClientData.buildResponse(req);
      res.json(response);
    };
  }

  handlePostCall() {
    return async (req: Request, res: Response) => {
      const response = await this.postCall.handle(req);
      res.json(response);
    };
  }
}
