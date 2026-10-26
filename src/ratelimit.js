// Simple in-memory fixed-window rate limiter per client IP.
export function createRateLimiter({ limit = 20, windowMs = 60000 } = {}) {
  const hits = new Map();
  return function allow(key, now = Date.now()) {
    const entry = hits.get(key);
    if (!entry || now - entry.start >= windowMs) {
      hits.set(key, { start: now, count: 1 });
      if (hits.size > 5000) hits.clear();
      return true;
    }
    entry.count += 1;
    return entry.count <= limit;
  };
}
