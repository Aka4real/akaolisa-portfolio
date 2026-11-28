import { NextResponse } from "next/server";
import { requireAdminApiAuth } from "@/lib/admin/auth";
import { runDeepHealthProbe } from "@/lib/telemetry/health";
import { recordAdminAudit } from "@/lib/telemetry/store";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

const NO_STORE_HEADERS = {
  "Cache-Control": "no-store, no-cache, must-revalidate, private",
  "X-Robots-Tag": "noindex, nofollow",
};

function resolveRequestOrigin(request: Request): string {
  const url = new URL(request.url);
  const proto =
    request.headers.get("x-forwarded-proto") ??
    url.protocol.replace(":", "") ??
    "http";
  const host = request.headers.get("host") ?? url.host;
  return `${proto}://${host}`;
}

export async function POST(request: Request) {
  const auth = await requireAdminApiAuth(request);
  if (!auth.ok) return auth.response;

  let probeGemini = false;
  try {
    const body = (await request.json()) as { probeGemini?: boolean };
    probeGemini = Boolean(body?.probeGemini);
  } catch {
    // Allow empty POST body
  }

  const origin = resolveRequestOrigin(request);
  const snapshot = await runDeepHealthProbe({ origin, probeGemini });

  await recordAdminAudit({
    ip: auth.ip,
    action: probeGemini ? "deep_health_and_gemini_probe" : "deep_health_probe",
    status: "success",
    details: `Score ${snapshot.score}/100 (${snapshot.overallStatus}) across ${snapshot.probes.length} probes${probeGemini ? " + Gemini chain" : ""}`,
    userAgent: (request.headers.get("user-agent") ?? "").slice(0, 200),
  });

  return NextResponse.json(snapshot, { headers: NO_STORE_HEADERS });
}

export async function GET(request: Request) {
  const auth = await requireAdminApiAuth(request);
  if (!auth.ok) return auth.response;

  const url = new URL(request.url);
  const probeGemini = url.searchParams.get("probeGemini") === "1";
  const origin = resolveRequestOrigin(request);
  const snapshot = await runDeepHealthProbe({ origin, probeGemini });

  return NextResponse.json(snapshot, { headers: NO_STORE_HEADERS });
}
