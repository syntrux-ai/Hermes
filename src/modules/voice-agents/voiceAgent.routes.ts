import { Router } from 'express';
import { asyncHandler } from '../../shared/http.js';
import { VoiceAgentController } from './voiceAgent.controller.js';

const router = Router();
const controller = new VoiceAgentController();

router.post('/init-client-data', asyncHandler(controller.handleInitClientData()));
router.post('/post-call', asyncHandler(controller.handlePostCall()));
router.post('/tools/check-availability', asyncHandler(controller.handleTool('check-availability')));
router.post('/tools/create-booking', asyncHandler(controller.handleTool('create-booking')));
router.post('/tools/find-bookings', asyncHandler(controller.handleTool('find-bookings')));
router.post('/tools/cancel-booking', asyncHandler(controller.handleTool('cancel-booking')));
router.post('/tools/reschedule-booking', asyncHandler(controller.handleTool('reschedule-booking')));

export default router;
