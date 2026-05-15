import crypto from 'node:crypto';
import type { Request } from 'express';
import { env } from '../../config/env.js';
import { assertSupabaseConfigured, supabase } from '../../integrations/supabase/supabase.client.js';
import { unauthorized } from '../../shared/errors.js';
import { normalizePhone } from '../../shared/phone.js';
import { TenantService } from './tenants/tenant.service.js';

type PostCallPayload = Record<string, any>;

export class PostCallService {
  constructor(private readonly tenantService = new TenantService()) {}

  async handle(req: Request) {
    assertSupabaseConfigured();
    verifyPostCallSignature(req);

    const rawPayload = req.body as PostCallPayload;
    const payload = getObject(rawPayload.data) ?? rawPayload;
    const providerAgentId = getString(payload.agent_id) ?? getString(payload.provider_agent_id);
    const context = providerAgentId
      ? await this.tenantService.resolveFromInitiationRequest(req)
      : undefined;

    const analysis = getAnalysis(payload);
    const dynamicVariables = getObject(payload.conversation_initiation_client_data?.dynamic_variables);
    const conversationId =
      getString(payload.conversation_id) ??
      getString(payload.conversationId) ??
      getString(payload.call_id) ??
      getString(payload.callSid);
    const startTime = unixSecondsToIso(getNumber(payload.metadata?.start_time_unix_secs));
    const durationSeconds = getNumber(payload.metadata?.call_duration_secs) ?? getNumber(payload.call_duration_secs);

    const customerPhone = normalizePhone(
      getString(dynamicVariables?.customer_phone) ??
        getString(dynamicVariables?.system__caller_id) ??
        getString(payload.metadata?.phone_call?.external_number) ??
        getString(payload.caller_id) ??
        '',
    );

    const row = {
      organization_id: context?.organizationId,
      location_id: context?.locationId,
      voice_agent_id: context?.voiceAgentId,
      source: 'elevenlabs',
      channel: 'voice',
      provider: 'elevenlabs',
      provider_agent_id: providerAgentId,
      provider_conversation_id: conversationId,
      provider_call_id:
        getString(dynamicVariables?.system__call_sid) ??
        getString(payload.call_sid) ??
        getString(payload.callSid),
      customer_name: getString(dynamicVariables?.customer_name),
      customer_phone: customerPhone || undefined,
      is_existing_customer: getBoolean(dynamicVariables?.is_existing_customer),
      booking_id: getString(dynamicVariables?.booking_id),
      interaction_type: normalizeIntent(getString(analysis.call_intent)),
      intent: getString(analysis.call_intent),
      outcome: getString(analysis.booking_outcome),
      status: 'received',
      service_name: getString(analysis.service_requested) ?? getString(dynamicVariables?.booking_service),
      technician_name:
        getString(dynamicVariables?.rescheduled_technician) ??
        getString(dynamicVariables?.booking_technician) ??
        getString(dynamicVariables?.preferred_technician),
      appointment_date:
        getString(dynamicVariables?.new_date) ??
        getString(dynamicVariables?.booking_date),
      start_time:
        getString(dynamicVariables?.new_start_time) ??
        getString(dynamicVariables?.booking_start_time),
      end_time:
        getString(dynamicVariables?.new_end_time) ??
        getString(dynamicVariables?.booking_end_time),
      old_appointment_date: getString(dynamicVariables?.old_date),
      old_start_time: getString(dynamicVariables?.old_start_time),
      new_appointment_date: getString(dynamicVariables?.new_date),
      new_start_time: getString(dynamicVariables?.new_start_time),
      cancellation_reason: getString(analysis.cancellation_reason),
      call_started_at: startTime,
      call_ended_at: addSeconds(startTime, durationSeconds),
      call_duration_seconds: durationSeconds,
      call_transfer: getBoolean(analysis.call_transfer),
      summary: getString(payload.analysis?.transcript_summary) ?? getString(analysis.call_summary),
      transcript: buildTranscript(payload),
      recording_url: getString(payload.recording_url) ?? getString(payload.audio_url),
      user_sentiment: getString(analysis.user_sentiment),
      analysis,
      raw_post_call_payload: rawPayload,
    };

    const { data, error } = await supabase
      .from('customer_interactions')
      .insert(row as any)
      .select('id, provider_conversation_id, customer_phone, intent, outcome, status')
      .single();

    if (error && error.code === '42P01') {
      return {
        success: true,
        stored: false,
        reason: 'customer_interactions table is not created yet',
        provider_conversation_id: row.provider_conversation_id,
        customer_phone: row.customer_phone,
        intent: row.intent,
        outcome: row.outcome,
      };
    }

    if (error) throw error;

    return {
      success: true,
      stored: true,
      customer_interaction_id: data.id,
      provider_conversation_id: data.provider_conversation_id,
      customer_phone: data.customer_phone,
      intent: data.intent,
      outcome: data.outcome,
      status: data.status,
    };
  }
}

const verifyPostCallSignature = (req: Request) => {
  if (!env.elevenLabsPostCallWebhookSecret) return;

  const signature = req.header('ElevenLabs-Signature') ?? req.header('elevenlabs-signature');
  if (!signature) throw unauthorized('Missing ElevenLabs post-call signature');

  const rawBody = (req as Request & { rawBody?: string }).rawBody ?? JSON.stringify(req.body ?? {});
  const expected = crypto
    .createHmac('sha256', env.elevenLabsPostCallWebhookSecret)
    .update(rawBody)
    .digest('hex');

  const provided = signature.replace(/^sha256=/, '');
  const left = Buffer.from(provided);
  const right = Buffer.from(expected);
  if (left.length !== right.length || !crypto.timingSafeEqual(left, right)) {
    throw unauthorized('Invalid ElevenLabs post-call signature');
  }
};

const getAnalysis = (payload: PostCallPayload) => {
  const data = getObject(payload.analysis?.data_collection_results) ?? getObject(payload.data_collection_results) ?? {};
  return Object.fromEntries(
    Object.entries(data).map(([key, value]) => [key, unwrapAnalysisValue(value)]),
  );
};

const normalizeIntent = (intent?: string) => {
  if (!intent) return undefined;
  if (intent === 'rescheduling') return 'reschedule';
  return intent;
};

const unwrapAnalysisValue = (value: unknown) => {
  if (value && typeof value === 'object' && 'value' in value) return (value as { value: unknown }).value;
  return value;
};

const buildTranscript = (payload: PostCallPayload) => {
  const transcript = payload.transcript;
  if (typeof transcript === 'string') return transcript;
  if (!Array.isArray(transcript)) return undefined;

  return transcript
    .map((turn) => {
      const role = getString(turn.role) ?? getString(turn.speaker) ?? 'speaker';
      const message = getString(turn.message) ?? getString(turn.text) ?? '';
      return message ? `${role}: ${message}` : undefined;
    })
    .filter(Boolean)
    .join('\n');
};

const getObject = (value: unknown): Record<string, any> | undefined =>
  value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, any>) : undefined;

const getString = (value: unknown) => (typeof value === 'string' && value.trim() ? value.trim() : undefined);
const getBoolean = (value: unknown) => (typeof value === 'boolean' ? value : undefined);
const getNumber = (value: unknown) => (typeof value === 'number' && Number.isFinite(value) ? value : undefined);

const unixSecondsToIso = (seconds?: number) => (seconds ? new Date(seconds * 1000).toISOString() : undefined);

const addSeconds = (isoDate: string | undefined, seconds: number | undefined) => {
  if (!isoDate || seconds === undefined) return undefined;
  return new Date(new Date(isoDate).getTime() + seconds * 1000).toISOString();
};
