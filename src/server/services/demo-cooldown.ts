const COOLDOWN_MS = 15 * 60 * 1000; // 15 menit cooldown
let lastManualResetTimestamp: number | null = null;

export function checkDemoResetCooldown(): {
  allowed: boolean;
  retryAfterSeconds: number;
  lastResetAt: number | null;
} {
  if (!lastManualResetTimestamp) {
    return {
      allowed: true,
      retryAfterSeconds: 0,
      lastResetAt: null,
    };
  }

  const now = Date.now();
  const elapsed = now - lastManualResetTimestamp;

  if (elapsed < COOLDOWN_MS) {
    const retryAfterSeconds = Math.ceil((COOLDOWN_MS - elapsed) / 1000);
    return {
      allowed: false,
      retryAfterSeconds,
      lastResetAt: lastManualResetTimestamp,
    };
  }

  return {
    allowed: true,
    retryAfterSeconds: 0,
    lastResetAt: lastManualResetTimestamp,
  };
}

export function recordDemoReset(): void {
  lastManualResetTimestamp = Date.now();
}

export function clearDemoResetCooldown(): void {
  lastManualResetTimestamp = null;
}
