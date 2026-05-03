import { config } from 'dotenv';
import { badRequest } from '../shared/errors.js';

config({ path: '.env.local', quiet: true });
config({ quiet: true });

const optionalBoolean = (value: string | undefined, fallback: boolean) => {
  if (value === undefined) return fallback;
  return value === 'true';
};

const optionalInt = (value: string | undefined, fallback: number) => {
  if (value === undefined) return fallback;
  const parsed = Number.parseInt(value, 10);
  if (Number.isNaN(parsed)) throw badRequest(`Invalid integer environment value: ${value}`);
  return parsed;
};

export const env = {
  supabaseUrl: process.env.SUPABASE_URL ?? '',
  supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY ?? '',
  elevenLabsWebhookToleranceSeconds: optionalInt(process.env.ELEVENLABS_WEBHOOK_TOLERANCE_SECONDS, 300),
  elevenLabsSignatureRequired: optionalBoolean(
    process.env.ELEVENLABS_SIGNATURE_REQUIRED,
    process.env.NODE_ENV === 'production',
  ),
  defaultSlotIntervalMinutes: optionalInt(process.env.DEFAULT_SLOT_INTERVAL_MINUTES, 30),
  defaultSameDayBufferMinutes: optionalInt(process.env.DEFAULT_SAME_DAY_BUFFER_MINUTES, 60),
};

export const assertEnv = () => {
  if (!env.supabaseUrl) throw badRequest('SUPABASE_URL is required');
  if (!env.supabaseServiceRoleKey) throw badRequest('SUPABASE_SERVICE_ROLE_KEY is required');
};
