import { createHmac, timingSafeEqual } from 'node:crypto';

export const WEBHOOK_SIGNATURE_HEADER = 'X-PS-Signature';
export const WEBHOOK_TIMESTAMP_HEADER = 'X-PS-Timestamp';
export const WEBHOOK_EVENT_ID_HEADER = 'X-PS-Event-Id';

export function buildWebhookSigningPayload(
  timestamp: string,
  eventId: string,
  body: string,
): string {
  return `${timestamp}.${eventId}.${body}`;
}

export function signWebhookPayload(secret: string, timestamp: string, eventId: string, body: string): string {
  const payload = buildWebhookSigningPayload(timestamp, eventId, body);
  return createHmac('sha256', secret).update(payload).digest('hex');
}

export function verifyWebhookSignature(input: {
  secret: string;
  timestamp: string;
  eventId: string;
  body: string;
  signature: string;
  toleranceSeconds: number;
  nowMs?: number;
}): { valid: boolean; reason: string | null } {
  const nowMs = input.nowMs ?? Date.now();
  const ts = Number(input.timestamp);
  if (!Number.isFinite(ts)) {
    return { valid: false, reason: 'Invalid timestamp.' };
  }

  const ageSeconds = Math.abs(nowMs / 1000 - ts);
  if (ageSeconds > input.toleranceSeconds) {
    return { valid: false, reason: 'Timestamp outside replay tolerance.' };
  }

  const expected = signWebhookPayload(input.secret, input.timestamp, input.eventId, input.body);
  const provided = input.signature.replace(/^sha256=/i, '');

  try {
    const a = Buffer.from(expected, 'hex');
    const b = Buffer.from(provided, 'hex');
    if (a.length !== b.length || !timingSafeEqual(a, b)) {
      return { valid: false, reason: 'Signature mismatch.' };
    }
  } catch {
    return { valid: false, reason: 'Signature mismatch.' };
  }

  return { valid: true, reason: null };
}

export const RETRYABLE_WEBHOOK_STATUS_CODES = new Set([408, 425, 429, 500, 502, 503, 504]);

export function isRetryableWebhookStatus(status: number | null): boolean {
  if (status === null) return true;
  return RETRYABLE_WEBHOOK_STATUS_CODES.has(status);
}

export function webhookBackoffMs(attempt: number): number {
  const base = 1_000;
  const capped = Math.min(attempt, 8);
  return base * 2 ** Math.max(0, capped - 1);
}
