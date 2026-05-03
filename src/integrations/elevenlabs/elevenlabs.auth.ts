import crypto from 'node:crypto';
import type { Request } from 'express';
import { env } from '../../config/env.js';
import { unauthorized } from '../../shared/errors.js';

const stripPrefix = (signature: string) => signature.replace(/^sha256=/, '');

const safeCompare = (a: string, b: string) => {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && crypto.timingSafeEqual(left, right);
};

export const verifyElevenLabsSignature = (req: Request, webhookSecret: string) => {
  if (!env.elevenLabsSignatureRequired) return;

  const hermesSecret = req.header('x-hermes-secret');
  if (hermesSecret && safeCompare(hermesSecret, webhookSecret)) {
    return;
  }

  const signature = req.header('x-elevenlabs-signature') ?? req.header('x-hermes-signature');
  const timestamp = req.header('x-elevenlabs-timestamp') ?? req.header('x-hermes-timestamp');
  const rawBody = (req as Request & { rawBody?: string }).rawBody ?? JSON.stringify(req.body ?? {});

  if (!signature || !timestamp) {
    throw unauthorized('Missing ElevenLabs signature headers');
  }

  const timestampSeconds = Number(timestamp);
  if (!Number.isFinite(timestampSeconds)) {
    throw unauthorized('Invalid ElevenLabs signature timestamp');
  }

  const age = Math.abs(Date.now() / 1000 - timestampSeconds);
  if (age > env.elevenLabsWebhookToleranceSeconds) {
    throw unauthorized('Stale ElevenLabs signature timestamp');
  }

  const expected = crypto
    .createHmac('sha256', webhookSecret)
    .update(`${timestamp}.${rawBody}`)
    .digest('hex');

  if (!safeCompare(stripPrefix(signature), expected)) {
    throw unauthorized('Invalid ElevenLabs signature');
  }
};
