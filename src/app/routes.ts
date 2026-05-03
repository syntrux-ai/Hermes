import { Router } from 'express';
import voiceAgentRoutes from '../modules/voice-agents/voiceAgent.routes.js';

const router = Router();

router.get('/health', (_req, res) => {
  res.json({ ok: true, service: 'hermes' });
});

router.use('/voice-agents', voiceAgentRoutes);

export default router;
