/**
 * apiCache.js — Module-level in-memory cache for API responses.
 */

const _cache = new Map();

export const DEFAULT_TTL_MS = 2 * 60 * 1000; // 2 minutes
const MAX_CACHE_SIZE = 100;

// ── Read ────────────────────────────────────────────────────────────────────
export function get(key) {
  const entry = _cache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    _cache.delete(key);
    return null;
  }
  return entry.data;
}

// ── Write ───────────────────────────────────────────────────────────────────
export function set(key, data, ttl = DEFAULT_TTL_MS) {
  // Simple safety limit: if cache is full, wipe it to prevent memory leaks
  if (_cache.size >= MAX_CACHE_SIZE) {
    _cache.clear();
  }

  _cache.set(key, {
    data,
    expiresAt: Date.now() + ttl,
    storedAt:  Date.now(),
  });
}

// ── Invalidate by URL prefix ─────────────────────────────────────────────────
export function invalidatePrefix(prefix) {
  let cleared = 0;
  for (const key of _cache.keys()) {
    if (key.startsWith(prefix)) {
      _cache.delete(key);
      cleared++;
    }
  }
  return cleared;
}

// ── Full wipe ────────────────────────────────────────────────────────────────
export function clear() {
  _cache.clear();
}

// ── Debug helper ─────────────────────────────────────────────────────────────
export function snapshot() {
  const now = Date.now();
  return Array.from(_cache.entries()).map(([key, entry]) => ({
    key,
    ttlRemaining: Math.max(0, Math.round((entry.expiresAt - now) / 1000)) + "s",
    expired: now > entry.expiresAt,
  }));
}
