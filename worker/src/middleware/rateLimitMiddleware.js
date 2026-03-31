const buckets = new Map();

export function rateLimitMiddleware(request, env, options = {}) {
  const ip = request.headers.get("cf-connecting-ip") || request.headers.get("x-forwarded-for") || "unknown";
  const path = new URL(request.url).pathname;
  const key = `${ip}:${options.scope || path}`;

  const windowMs = Number(options.windowMs || env.RATE_LIMIT_WINDOW_MS || 60_000);
  const max = Number(options.max || env.RATE_LIMIT_MAX || 120);
  const now = Date.now();

  const bucket = buckets.get(key);
  if (!bucket || now > bucket.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return null;
  }

  if (bucket.count >= max) {
    return Response.json(
      { error: "rate_limited", retry_after_ms: Math.max(bucket.resetAt - now, 0) },
      { status: 429 },
    );
  }

  bucket.count += 1;
  return null;
}

