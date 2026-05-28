import { NextRequest, NextResponse } from "next/server";

interface RateLimitOptions {
  limit: number;
  windowMs: number;
}

interface RateLimitBucket {
  count: number;
  resetAt: number;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
  retryAfterSeconds: number;
}

const globalForRateLimit = globalThis as typeof globalThis & {
  __medicalFormRateLimitStore?: Map<string, RateLimitBucket>;
};

function getStore() {
  if (!globalForRateLimit.__medicalFormRateLimitStore) {
    globalForRateLimit.__medicalFormRateLimitStore = new Map();
  }
  return globalForRateLimit.__medicalFormRateLimitStore;
}

function getClientId(request: NextRequest) {
  const forwardedFor = request.headers
    .get("x-forwarded-for")
    ?.split(",")[0]
    ?.trim();
  return (
    forwardedFor ||
    request.headers.get("x-real-ip")?.trim() ||
    request.headers.get("cf-connecting-ip")?.trim() ||
    "unknown"
  );
}

function cleanupExpiredBuckets(
  store: Map<string, RateLimitBucket>,
  now: number,
) {
  if (store.size < 1000) return;
  for (const [key, bucket] of store) {
    if (bucket.resetAt <= now) {
      store.delete(key);
    }
  }
}

export function checkRateLimit(
  request: NextRequest,
  scope: string,
  options: RateLimitOptions,
): RateLimitResult {
  const now = Date.now();
  const store = getStore();
  cleanupExpiredBuckets(store, now);

  const key = `${scope}:${getClientId(request)}`;
  const current = store.get(key);
  const bucket =
    current && current.resetAt > now
      ? current
      : { count: 0, resetAt: now + options.windowMs };

  bucket.count += 1;
  store.set(key, bucket);

  const retryAfterSeconds = Math.max(
    1,
    Math.ceil((bucket.resetAt - now) / 1000),
  );

  return {
    allowed: bucket.count <= options.limit,
    remaining: Math.max(0, options.limit - bucket.count),
    resetAt: bucket.resetAt,
    retryAfterSeconds,
  };
}

export function rateLimitResponse(result: RateLimitResult) {
  return NextResponse.json(
    {
      error:
        "アクセスが集中しています。少し時間をおいて再度お試しください。",
    },
    {
      status: 429,
      headers: {
        "Retry-After": String(result.retryAfterSeconds),
        "X-RateLimit-Remaining": String(result.remaining),
        "X-RateLimit-Reset": new Date(result.resetAt).toISOString(),
      },
    },
  );
}
