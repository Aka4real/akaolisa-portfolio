import crypto from "crypto";
import { NextResponse } from "next/server";
import { extractClientIp } from "@/lib/telemetry/ip";
import {
  isAdminSessionRevoked,
  revokeAdminSession,
} from "@/lib/telemetry/store";

export const ADMIN_COOKIE_NAME = "aka_admin_session";
const DEV_FALLBACK_PASSWORD = "oxakalabs-dev-admin";
const DEV_FALLBACK_SECRET = "oxakalabs-local-dev-session-signing-secret-v1";
const SESSION_TTL_SHORT_MS = 12 * 60 * 60 * 1000; // 12 hours
const SESSION_TTL_LONG_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

// Brute-force protection per IP
const RATE_WINDOW_MS = 15 * 60 * 1000;
const MAX_FAILED_ATTEMPTS = 8;

interface RateLimitBucket {
  attempts: number[];
}

declare global {
  var __akaAdminRateLimits__: Map<string, RateLimitBucket> | undefined;
}

function getRateLimits(): Map<string, RateLimitBucket> {
  if (!globalThis.__akaAdminRateLimits__) {
    globalThis.__akaAdminRateLimits__ = new Map();
  }
  return globalThis.__akaAdminRateLimits__;
}

export interface AdminSessionPayload {
  sid: string;
  sub: string;
  iat: number;
  exp: number;
  ip: string;
}

export interface AdminAuthConfigStatus {
  isProduction: boolean;
  passwordConfigured: boolean;
  secretConfigured: boolean;
  lockedOutUnconfigured: boolean;
  expectedUsername: string;
  devFallbackActive: boolean;
}

export function getAdminAuthConfigStatus(): AdminAuthConfigStatus {
  const isProduction = process.env.NODE_ENV === "production";
  const password = (process.env.ADMIN_PASSWORD ?? "").trim();
  const secret = (process.env.ADMIN_SESSION_SECRET ?? "").trim();
  const expectedUsername = (process.env.ADMIN_USERNAME ?? "admin").trim() || "admin";

  const passwordConfigured = password.length > 0;
  const secretConfigured = secret.length >= 16;
  const lockedOutUnconfigured = isProduction && !passwordConfigured;
  const devFallbackActive = !isProduction && !passwordConfigured;

  return {
    isProduction,
    passwordConfigured,
    secretConfigured,
    lockedOutUnconfigured,
    expectedUsername,
    devFallbackActive,
  };
}

function getEffectivePassword(): string | null {
  const configured = (process.env.ADMIN_PASSWORD ?? "").trim();
  if (configured.length > 0) return configured;
  if (process.env.NODE_ENV !== "production") {
    return DEV_FALLBACK_PASSWORD;
  }
  return null;
}

function getSigningSecret(): string {
  const configuredSecret = (process.env.ADMIN_SESSION_SECRET ?? "").trim();
  if (configuredSecret.length >= 16) return configuredSecret;
  const password = getEffectivePassword();
  if (password) {
    return crypto
      .createHash("sha256")
      .update(`akaolisa-admin-hmac:${password}:${process.env.NEXT_PUBLIC_SITE_URL ?? "local"}`)
      .digest("hex");
  }
  return DEV_FALLBACK_SECRET;
}

function timingSafeCompareString(a: string, b: string): boolean {
  const hashA = crypto.createHash("sha256").update(a).digest();
  const hashB = crypto.createHash("sha256").update(b).digest();
  return crypto.timingSafeEqual(hashA, hashB);
}

export function checkLoginRateLimit(ip: string): {
  allowed: boolean;
  remainingAttempts: number;
  retryAfterSeconds: number;
} {
  const map = getRateLimits();
  const now = Date.now();
  const bucket = map.get(ip) ?? { attempts: [] };
  bucket.attempts = bucket.attempts.filter((ts) => now - ts < RATE_WINDOW_MS);
  map.set(ip, bucket);

  if (bucket.attempts.length >= MAX_FAILED_ATTEMPTS) {
    const oldest = bucket.attempts[0] ?? now;
    const retryAfterSeconds = Math.max(
      1,
      Math.ceil((RATE_WINDOW_MS - (now - oldest)) / 1000)
    );
    return {
      allowed: false,
      remainingAttempts: 0,
      retryAfterSeconds,
    };
  }

  return {
    allowed: true,
    remainingAttempts: MAX_FAILED_ATTEMPTS - bucket.attempts.length,
    retryAfterSeconds: 0,
  };
}

export function recordFailedLoginAttempt(ip: string): void {
  const map = getRateLimits();
  const now = Date.now();
  const bucket = map.get(ip) ?? { attempts: [] };
  bucket.attempts = bucket.attempts.filter((ts) => now - ts < RATE_WINDOW_MS);
  bucket.attempts.push(now);
  map.set(ip, bucket);
}

export function clearLoginRateLimit(ip: string): void {
  getRateLimits().delete(ip);
}

export function verifyAdminCredentials(
  username: string,
  password: string
): boolean {
  const effectivePassword = getEffectivePassword();
  if (!effectivePassword) return false;

  const { expectedUsername } = getAdminAuthConfigStatus();
  const userOk = timingSafeCompareString(
    username.trim().toLowerCase(),
    expectedUsername.toLowerCase()
  );
  const passOk = timingSafeCompareString(password, effectivePassword);
  return userOk && passOk;
}

function signPayloadB64(payloadB64: string): string {
  return crypto
    .createHmac("sha256", getSigningSecret())
    .update(payloadB64)
    .digest("base64url");
}

export function createAdminSessionToken(params: {
  username: string;
  ip: string;
  rememberMe?: boolean;
}): { token: string; payload: AdminSessionPayload; maxAgeSeconds: number } {
  const now = Date.now();
  const ttlMs = params.rememberMe ? SESSION_TTL_LONG_MS : SESSION_TTL_SHORT_MS;
  const payload: AdminSessionPayload = {
    sid: `adm_${crypto.randomBytes(12).toString("hex")}`,
    sub: params.username,
    iat: now,
    exp: now + ttlMs,
    ip: params.ip,
  };

  const payloadB64 = Buffer.from(JSON.stringify(payload), "utf8").toString(
    "base64url"
  );
  const sig = signPayloadB64(payloadB64);
  return {
    token: `${payloadB64}.${sig}`,
    payload,
    maxAgeSeconds: Math.floor(ttlMs / 1000),
  };
}

export async function verifyAdminSessionToken(
  token?: string | null
): Promise<AdminSessionPayload | null> {
  if (!token || !token.includes(".")) return null;
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const [payloadB64, providedSig] = parts;
  if (!payloadB64 || !providedSig) return null;

  const expectedSig = signPayloadB64(payloadB64);
  if (!timingSafeCompareString(providedSig, expectedSig)) {
    return null;
  }

  try {
    const raw = Buffer.from(payloadB64, "base64url").toString("utf8");
    const payload = JSON.parse(raw) as AdminSessionPayload;
    if (
      !payload.sid ||
      typeof payload.exp !== "number" ||
      typeof payload.iat !== "number"
    ) {
      return null;
    }
    if (Date.now() > payload.exp) {
      return null;
    }
    if (await isAdminSessionRevoked(payload.sid, payload.iat)) {
      return null;
    }
    return payload;
  } catch {
    return null;
  }
}

export function parseCookieFromHeader(
  cookieHeader: string | null,
  cookieName: string
): string | null {
  if (!cookieHeader) return null;
  const pairs = cookieHeader.split(";");
  for (const pair of pairs) {
    const idx = pair.indexOf("=");
    if (idx === -1) continue;
    const key = pair.slice(0, idx).trim();
    if (key === cookieName) {
      return decodeURIComponent(pair.slice(idx + 1).trim());
    }
  }
  return null;
}

export async function getAdminSessionFromRequest(
  request: Request
): Promise<AdminSessionPayload | null> {
  const { lockedOutUnconfigured } = getAdminAuthConfigStatus();
  if (lockedOutUnconfigured) return null;

  const token = parseCookieFromHeader(
    request.headers.get("cookie"),
    ADMIN_COOKIE_NAME
  );
  return verifyAdminSessionToken(token);
}

export async function requireAdminApiAuth(request: Request): Promise<
  | { ok: true; session: AdminSessionPayload; ip: string }
  | { ok: false; response: NextResponse }
> {
  const ip = extractClientIp(request.headers);
  const status = getAdminAuthConfigStatus();

  if (status.lockedOutUnconfigured) {
    return {
      ok: false,
      response: NextResponse.json(
        {
          error:
            "Admin authentication is not configured for production. Set ADMIN_PASSWORD and ADMIN_SESSION_SECRET in your environment.",
          code: "ADMIN_UNCONFIGURED",
        },
        {
          status: 503,
          headers: { "Cache-Control": "no-store, private" },
        }
      ),
    };
  }

  const session = await getAdminSessionFromRequest(request);
  if (!session) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Unauthorized. Admin sign-in required.", code: "UNAUTHORIZED" },
        {
          status: 401,
          headers: { "Cache-Control": "no-store, private" },
        }
      ),
    };
  }

  return { ok: true, session, ip };
}

export function attachAdminSessionCookie(
  response: NextResponse,
  token: string,
  maxAgeSeconds: number
): void {
  response.cookies.set(ADMIN_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: maxAgeSeconds,
  });
}

export function clearAdminSessionCookie(response: NextResponse): void {
  response.cookies.set(ADMIN_COOKIE_NAME, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
}

export async function invalidateRequestSession(
  request: Request
): Promise<AdminSessionPayload | null> {
  const session = await getAdminSessionFromRequest(request);
  if (session) {
    await revokeAdminSession(session.sid, session.exp);
  }
  return session;
}
