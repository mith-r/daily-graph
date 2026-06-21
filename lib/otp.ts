import "server-only";
import { createHash, randomInt } from "node:crypto";
import { getRedis } from "./redis";
import { sendOtpEmail, type OtpPurpose } from "./email";

const CODE_TTL_MS = 10 * 60 * 1000; // codes live 10 minutes
const RESEND_COOLDOWN_MS = 60 * 1000; // one send per minute
const RATE_LIMIT_MAX = 5; // ...and at most 5 sends...
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000; // ...per hour
const MAX_ATTEMPTS = 5;

// All records are JSON blobs with explicit timestamps checked in code: the
// in-memory dev stub's TTLs are no-ops, so expiry can't rely on Redis alone.
// {ex} is still passed so real Redis cleans up after itself.
type OtpRecord = {
  codeHash: string;
  email: string; // the address the code was sent to (binds code → address)
  expiresAt: number;
  attemptsLeft: number;
  createdAt: number;
};

const otpKey = (purpose: OtpPurpose, userId: string) =>
  `otp:${purpose}:${userId}`;
const cooldownKey = (purpose: OtpPurpose, key: string) =>
  `otp:cd:${purpose}:${key}`;
const rateLimitKey = (purpose: OtpPurpose, key: string) =>
  `otp:rl:${purpose}:${key}`;

// Domain-separated hash; brute force is bounded by attemptsLeft, not hash
// cost, so sha256 (not bcrypt) is fine here.
function hashCode(userId: string, purpose: OtpPurpose, code: string): string {
  return createHash("sha256")
    .update(`${userId}:${purpose}:${code}`)
    .digest("hex");
}

export type IssueResult =
  | { ok: true }
  | { error: "cooldown" | "rate_limited" | "send_failed" };

// Generate, store, and email a fresh 6-digit code, replacing any outstanding
// one. `limiterKey` scopes the cooldown/rate limit (defaults to userId; the
// forgot-password flow passes the requested email so probes of nonexistent
// accounts are limited too — its caller invokes issueOtp only for real users,
// so unknown emails simply never send).
export async function issueOtp(opts: {
  purpose: OtpPurpose;
  userId: string;
  email: string;
  limiterKey?: string;
  // Skip the resend cooldown (the hourly rate limit still applies). Used when
  // the destination address changes (fix-email), where "wait a minute" would
  // block the very first send to the corrected address.
  ignoreCooldown?: boolean;
}): Promise<IssueResult> {
  const redis = getRedis();
  const limiter = (opts.limiterKey ?? opts.userId).toLowerCase();
  const now = Date.now();

  // Reserve the resend cooldown ATOMICALLY (SET NX). This both enforces the
  // 1/min limit and serializes concurrent requests, so the (non-atomic)
  // rate-limit read-modify-write below can't be raced on the normal path. The
  // fix-email path (ignoreCooldown) must be allowed past the OLD address's
  // cooldown, so it overwrites instead of gating.
  const cdKey = cooldownKey(opts.purpose, limiter);
  const cdSeconds = Math.ceil(RESEND_COOLDOWN_MS / 1000);
  if (opts.ignoreCooldown) {
    await redis.set(cdKey, { at: now }, { ex: cdSeconds });
  } else {
    const reserved = await redis.set(cdKey, { at: now }, { nx: true, ex: cdSeconds });
    if (reserved !== "OK") return { error: "cooldown" };
  }

  // Consume an hourly slot up-front (before sending). Spending it on every
  // attempt — success OR failure — bounds repeated send attempts to a bad /
  // bouncing address (abuse protection), while the cooldown reserved above paces
  // retries so a transient outage can't burn all 5 slots at once.
  const rlKey = rateLimitKey(opts.purpose, limiter);
  const rl = await redis.get<{ count: number; resetAt: number }>(rlKey);
  const windowActive = !!rl && rl.resetAt > now;
  if (windowActive && rl!.count >= RATE_LIMIT_MAX) {
    return { error: "rate_limited" };
  }
  if (windowActive) {
    // Keep the window's TTL — a plain SET would clear it on real Redis.
    await redis.set(
      rlKey,
      { count: rl!.count + 1, resetAt: rl!.resetAt },
      { ex: Math.max(1, Math.ceil((rl!.resetAt - now) / 1000)) }
    );
  } else {
    await redis.set(
      rlKey,
      { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS },
      { ex: Math.ceil(RATE_LIMIT_WINDOW_MS / 1000) }
    );
  }

  // Generate + send. Crucially, do NOT overwrite the stored code until the send
  // succeeds: a failed send must leave any previously-delivered (still-valid)
  // code intact so the user isn't stranded with a code that never arrived.
  const code = randomInt(0, 1_000_000).toString().padStart(6, "0");
  try {
    await sendOtpEmail({ to: opts.email, code, purpose: opts.purpose });
  } catch (err) {
    console.error(`[otp] send failed (${opts.purpose}):`, err);
    // Keep the reserved cooldown AND the consumed slot on failure: retries stay
    // paced at 1/min and capped at 5/hour, so a provider outage or a retry loop
    // can't hammer the email service. The user retries after the cooldown. (We
    // deliberately don't release the cooldown here — doing so would defeat the
    // pacing and could erase a concurrent request's reservation.)
    return { error: "send_failed" };
  }

  const record: OtpRecord = {
    codeHash: hashCode(opts.userId, opts.purpose, code),
    email: opts.email,
    expiresAt: now + CODE_TTL_MS,
    attemptsLeft: MAX_ATTEMPTS,
    createdAt: now,
  };
  await redis.set(otpKey(opts.purpose, opts.userId), record, {
    ex: Math.ceil(CODE_TTL_MS / 1000),
  });
  return { ok: true };
}

export type CheckResult =
  | { ok: true; email: string }
  | { error: "invalid" | "expired" | "too_many_attempts" };

// Verify a submitted code. Burns an attempt BEFORE comparing so a crashed
// comparison can't be replayed; deletes the record on success or exhaustion.
export async function checkOtp(opts: {
  purpose: OtpPurpose;
  userId: string;
  code: string;
}): Promise<CheckResult> {
  const redis = getRedis();
  const key = otpKey(opts.purpose, opts.userId);
  const record = await redis.get<OtpRecord>(key);
  if (!record) return { error: "expired" };
  if (record.expiresAt < Date.now()) {
    await redis.del(key);
    return { error: "expired" };
  }
  if (record.attemptsLeft <= 0) {
    await redis.del(key);
    return { error: "too_many_attempts" };
  }

  record.attemptsLeft -= 1;
  await redis.set(key, record, {
    ex: Math.max(1, Math.ceil((record.expiresAt - Date.now()) / 1000)),
  });

  if (record.codeHash !== hashCode(opts.userId, opts.purpose, opts.code)) {
    if (record.attemptsLeft <= 0) {
      await redis.del(key);
      return { error: "too_many_attempts" };
    }
    return { error: "invalid" };
  }

  await redis.del(key);
  return { ok: true, email: record.email };
}

export async function invalidateOtp(
  purpose: OtpPurpose,
  userId: string
): Promise<void> {
  const redis = getRedis();
  await redis.del(otpKey(purpose, userId));
}
