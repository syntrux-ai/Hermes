import crypto from 'node:crypto';
import { describe, expect, it, vi } from 'vitest';
import type { Request } from 'express';
import { verifyElevenLabsSignature } from '../../src/integrations/elevenlabs/elevenlabs.auth.js';

describe('verifyElevenLabsSignature', () => {
  it('accepts a valid HMAC signature when signature verification is enabled', async () => {
    vi.stubEnv('ELEVENLABS_SIGNATURE_REQUIRED', 'true');
    const body = JSON.stringify({ provider_agent_id: 'agent_123' });
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const signature = crypto.createHmac('sha256', 'secret').update(`${timestamp}.${body}`).digest('hex');
    const req = {
      body: JSON.parse(body),
      rawBody: body,
      header: (name: string) => {
        if (name === 'x-elevenlabs-signature') return `sha256=${signature}`;
        if (name === 'x-elevenlabs-timestamp') return timestamp;
        return undefined;
      },
    } as unknown as Request;

    expect(() => verifyElevenLabsSignature(req, 'secret')).not.toThrow();
  });
});
