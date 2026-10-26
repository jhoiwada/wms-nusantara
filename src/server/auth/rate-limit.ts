interface RateLimitEntry {
  timestamps: number[];
  blockedUntil?: number;
}

const rateLimitStore = new Map<string, RateLimitEntry>();

const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000; // 15 menit

export function getRateLimitKey(ip: string, email: string): string {
  const cleanIp = ip.trim() || 'unknown-ip';
  const cleanEmail = email.trim().toLowerCase() || 'unknown-email';
  return `${cleanIp}:${cleanEmail}`;
}

export function checkLoginRateLimit(key: string): {
  allowed: boolean;
  remainingAttempts: number;
  retryAfterSeconds?: number;
} {
  const now = Date.now();
  const entry = rateLimitStore.get(key);

  if (!entry) {
    return { allowed: true, remainingAttempts: MAX_ATTEMPTS };
  }

  if (entry.blockedUntil && entry.blockedUntil > now) {
    const retryAfterSeconds = Math.ceil((entry.blockedUntil - now) / 1000);
    return {
      allowed: false,
      remainingAttempts: 0,
      retryAfterSeconds,
    };
  }

  // Filter out timestamps outside the window
  entry.timestamps = entry.timestamps.filter((ts) => now - ts < WINDOW_MS);

  if (entry.timestamps.length >= MAX_ATTEMPTS) {
    entry.blockedUntil = now + WINDOW_MS;
    const retryAfterSeconds = Math.ceil(WINDOW_MS / 1000);
    return {
      allowed: false,
      remainingAttempts: 0,
      retryAfterSeconds,
    };
  }

  return {
    allowed: true,
    remainingAttempts: MAX_ATTEMPTS - entry.timestamps.length,
  };
}

export function recordLoginFailure(key: string): void {
  const now = Date.now();
  const entry = rateLimitStore.get(key) || { timestamps: [] };

  entry.timestamps = entry.timestamps.filter((ts) => now - ts < WINDOW_MS);
  entry.timestamps.push(now);

  if (entry.timestamps.length >= MAX_ATTEMPTS) {
    entry.blockedUntil = now + WINDOW_MS;
  }

  rateLimitStore.set(key, entry);
}

export function resetLoginRateLimit(key: string): void {
  rateLimitStore.delete(key);
}

export function clearAllRateLimits(): void {
  rateLimitStore.clear();
}
