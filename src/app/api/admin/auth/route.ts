import { NextResponse } from "next/server";
import {
  attachAdminSessionCookie,
  checkLoginRateLimit,
  clearAdminSessionCookie,
  clearLoginRateLimit,
  createAdminSessionToken,
  getAdminAuthConfigStatus,
  getAdminSessionFromRequest,
  invalidateRequestSession,
  recordFailedLoginAttempt,
  verifyAdminCredentials,
} from "@/lib/admin/auth";
import { extractClientIp } from "@/lib/telemetry/ip";
import { recordAdminAudit } from "@/lib/telemetry/store";

export const dynamic = "force-dynamic";

const NO_STORE_HEADERS = {
  "Cache-Control": "no-store, no-cache, must-revalidate, private",
  "X-Robots-Tag": "noindex, nofollow",
};

export async function GET(request: Request) {
  const config = getAdminAuthConfigStatus();
  const session = await getAdminSessionFromRequest(request);
  const ip = extractClientIp(request.headers);

  return NextResponse.json(
    {
      authenticated: Boolean(session),
      username: session?.sub ?? null,
      expiresAt: session?.exp ?? null,
      viewerIp: ip,
      config: {
        isProduction: config.isProduction,
        passwordConfigured: config.passwordConfigured,
        secretConfigured: config.secretConfigured,
        lockedOutUnconfigured: config.lockedOutUnconfigured,
        devFallbackActive: config.devFallbackActive,
        expectedUsername: config.expectedUsername,
      },
    },
    { headers: NO_STORE_HEADERS }
  );
}

interface LoginBody {
  username?: string;
  password?: string;
  rememberMe?: boolean;
}

export async function POST(request: Request) {
  const ip = extractClientIp(request.headers);
  const ua = request.headers.get("user-agent") ?? "";
  const config = getAdminAuthConfigStatus();

  if (config.lockedOutUnconfigured) {
    return NextResponse.json(
      {
        error:
          "Production admin lock: set ADMIN_PASSWORD and ADMIN_SESSION_SECRET in environment variables before signing in.",
        code: "ADMIN_UNCONFIGURED",
      },
      { status: 503, headers: NO_STORE_HEADERS }
    );
  }

  const rate = checkLoginRateLimit(ip);
  if (!rate.allowed) {
    await recordAdminAudit({
      ip,
      action: "admin_login_rate_limited",
      status: "denied",
      details: `Rate limit exceeded; retry after ${rate.retryAfterSeconds}s`,
      userAgent: ua.slice(0, 240),
    });

    return NextResponse.json(
      {
        error: `Too many failed sign-in attempts. Try again in ${rate.retryAfterSeconds} seconds.`,
        retryAfterSeconds: rate.retryAfterSeconds,
      },
      {
        status: 429,
        headers: {
          ...NO_STORE_HEADERS,
          "Retry-After": String(rate.retryAfterSeconds),
        },
      }
    );
  }

  try {
    const body = (await request.json()) as LoginBody;
    const username = (body.username ?? "admin").trim();
    const password = body.password ?? "";
    const rememberMe = Boolean(body.rememberMe);

    if (!verifyAdminCredentials(username, password)) {
      recordFailedLoginAttempt(ip);
      const afterRate = checkLoginRateLimit(ip);
      await recordAdminAudit({
        ip,
        action: "admin_login_failed",
        status: "denied",
        details: `Invalid credentials for user "${username}" (${afterRate.remainingAttempts} attempts left)`,
        userAgent: ua.slice(0, 240),
      });

      return NextResponse.json(
        {
          error: "Invalid username or passphrase.",
          remainingAttempts: afterRate.remainingAttempts,
        },
        { status: 401, headers: NO_STORE_HEADERS }
      );
    }

    clearLoginRateLimit(ip);
    const { token, payload, maxAgeSeconds } = createAdminSessionToken({
      username,
      ip,
      rememberMe,
    });

    await recordAdminAudit({
      ip,
      action: "admin_login_success",
      status: "success",
      details: `Signed in as "${username}" (${rememberMe ? "7d" : "12h"} session)`,
      userAgent: ua.slice(0, 240),
    });

    const response = NextResponse.json(
      {
        authenticated: true,
        username: payload.sub,
        expiresAt: payload.exp,
      },
      { headers: NO_STORE_HEADERS }
    );
    attachAdminSessionCookie(response, token, maxAgeSeconds);
    return response;
  } catch {
    return NextResponse.json(
      { error: "Invalid login payload." },
      { status: 400, headers: NO_STORE_HEADERS }
    );
  }
}

export async function DELETE(request: Request) {
  const ip = extractClientIp(request.headers);
  const ua = request.headers.get("user-agent") ?? "";
  const prev = await invalidateRequestSession(request);

  if (prev) {
    await recordAdminAudit({
      ip,
      action: "admin_logout",
      status: "success",
      details: `Signed out session ${prev.sid}`,
      userAgent: ua.slice(0, 240),
    });
  }

  const response = NextResponse.json(
    { authenticated: false },
    { headers: NO_STORE_HEADERS }
  );
  clearAdminSessionCookie(response);
  return response;
}
