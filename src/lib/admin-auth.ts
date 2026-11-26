import crypto from "node:crypto";
import { cookies } from "next/headers";

export const ADMIN_SESSION_COOKIE = "oxaka_admin_session";
const SESSION_TTL_SECONDS = 60 * 60 * 24;

function getConfiguredPasscode(): string {
  return (process.env.ADMIN_PASSCODE ?? "").trim();
}

export function isAdminPasscodeRequired(): boolean {
  return getConfiguredPasscode().length > 0;
}

function sha256Buffer(value: string): Buffer {
  return crypto.createHash("sha256").update(value, "utf8").digest();
}

function signPayload(payload: string, secret: string): string {
  return crypto
    .createHmac("sha256", `${secret}:oxakalabs-studio-v1`)
    .update(payload)
    .digest("base64url");
}

export function verifyPasscodeAttempt(candidate: string): boolean {
  const configured = getConfiguredPasscode();
  if (!configured) return true;
  const a = sha256Buffer(candidate.trim());
  const b = sha256Buffer(configured);
  return crypto.timingSafeEqual(a, b);
}

export function createAdminSessionToken(): string {
  const secret = getConfiguredPasscode();
  const exp = Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS;
  const nonce = crypto.randomBytes(12).toString("base64url");
  const payload = `${exp}.${nonce}`;
  const sig = signPayload(payload, secret);
  return `${payload}.${sig}`;
}

export function isValidAdminSessionToken(token: string | undefined): boolean {
  if (!isAdminPasscodeRequired()) return true;
  if (!token) return false;

  const parts = token.split(".");
  if (parts.length !== 3) return false;

  const [expRaw, nonce, providedSig] = parts;
  const exp = Number.parseInt(expRaw, 10);
  if (!Number.isFinite(exp) || exp < Math.floor(Date.now() / 1000)) {
    return false;
  }

  const secret = getConfiguredPasscode();
  const expectedSig = signPayload(`${expRaw}.${nonce}`, secret);

  const a = sha256Buffer(providedSig);
  const b = sha256Buffer(expectedSig);
  return crypto.timingSafeEqual(a, b);
}

export async function isAdminAuthenticated(): Promise<boolean> {
  if (!isAdminPasscodeRequired()) return true;
  const cookieStore = await cookies();
  const token = cookieStore.get(ADMIN_SESSION_COOKIE)?.value;
  return isValidAdminSessionToken(token);
}

export function getSessionCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  };
}
