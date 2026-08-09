import type { HttpRequest, HttpResponseInit } from '@azure/functions';

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const rateLimits = new Map<string, RateLimitEntry>();
const MAX_RATE_LIMIT_ENTRIES = 5_000;

export class RequestValidationError extends Error {
  constructor(
    message: string,
    public readonly status: 400 | 413 = 400,
  ) {
    super(message);
  }
}

export async function readJsonBody<T>(
  request: HttpRequest,
  maxBytes: number,
): Promise<T> {
  const contentLength = Number(request.headers.get('content-length'));
  if (Number.isFinite(contentLength) && contentLength > maxBytes) {
    throw new RequestValidationError('요청 본문이 너무 큽니다.', 413);
  }

  const text = await request.text();
  if (Buffer.byteLength(text, 'utf8') > maxBytes) {
    throw new RequestValidationError('요청 본문이 너무 큽니다.', 413);
  }

  try {
    return JSON.parse(text) as T;
  } catch {
    throw new RequestValidationError('올바른 JSON 요청이 아닙니다.');
  }
}

export function validationErrorResponse(error: unknown): HttpResponseInit | null {
  if (!(error instanceof RequestValidationError)) return null;

  return {
    status: error.status,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ error: error.message }),
  };
}

export function getClientIdentifier(request: HttpRequest): string {
  const forwardedFor = request.headers.get('x-forwarded-for');
  const clientIp = forwardedFor?.split(',')[0]?.trim();
  return clientIp || 'unknown-client';
}

export function checkRateLimit(
  scope: string,
  identifier: string,
  limit: number,
  windowMs: number,
): HttpResponseInit | null {
  const now = Date.now();
  const key = `${scope}:${identifier}`;
  const current = rateLimits.get(key);

  if (!current || current.resetAt <= now) {
    rateLimits.set(key, { count: 1, resetAt: now + windowMs });
    cleanupExpiredEntries(now);
    return null;
  }

  if (current.count >= limit) {
    const retryAfterSeconds = Math.max(1, Math.ceil((current.resetAt - now) / 1000));
    return {
      status: 429,
      headers: {
        'Content-Type': 'application/json',
        'Retry-After': String(retryAfterSeconds),
      },
      body: JSON.stringify({ error: '요청이 너무 많습니다. 잠시 후 다시 시도해주세요.' }),
    };
  }

  current.count += 1;
  return null;
}

function cleanupExpiredEntries(now: number): void {
  if (rateLimits.size <= MAX_RATE_LIMIT_ENTRIES) return;

  for (const [key, entry] of rateLimits) {
    if (entry.resetAt <= now) rateLimits.delete(key);
  }

  if (rateLimits.size <= MAX_RATE_LIMIT_ENTRIES) return;

  const overflow = rateLimits.size - MAX_RATE_LIMIT_ENTRIES;
  let removed = 0;
  for (const key of rateLimits.keys()) {
    rateLimits.delete(key);
    removed += 1;
    if (removed >= overflow) break;
  }
}
