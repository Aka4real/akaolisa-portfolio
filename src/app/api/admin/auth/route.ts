import { NextResponse } from "next/server";
import {
  ADMIN_SESSION_COOKIE,
  createAdminSessionToken,
  getSessionCookieOptions,
  isAdminAuthenticated,
  isAdminPasscodeRequired,
  verifyPasscodeAttempt,
} from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const authenticated = await isAdminAuthenticated();
  return NextResponse.json({
    authenticated,
    passcodeRequired: isAdminPasscodeRequired(),
  });
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { passcode?: string };
    const candidate = typeof body.passcode === "string" ? body.passcode : "";

    if (!isAdminPasscodeRequired()) {
      return NextResponse.json({
        authenticated: true,
        passcodeRequired: false,
      });
    }

    if (!verifyPasscodeAttempt(candidate)) {
      return NextResponse.json(
        { error: "Passcode did not match. Verify ADMIN_PASSCODE and try again." },
        { status: 401 }
      );
    }

    const token = createAdminSessionToken();
    const res = NextResponse.json({
      authenticated: true,
      passcodeRequired: true,
    });
    res.cookies.set(ADMIN_SESSION_COOKIE, token, getSessionCookieOptions());
    return res;
  } catch {
    return NextResponse.json(
      { error: "Invalid authentication request." },
      { status: 400 }
    );
  }
}

export async function DELETE() {
  const res = NextResponse.json({ authenticated: false });
  res.cookies.set(ADMIN_SESSION_COOKIE, "", {
    ...getSessionCookieOptions(),
    maxAge: 0,
  });
  return res;
}
