import { NextResponse } from "next/server";
import { requireAdminApiAuth } from "@/lib/admin/auth";
import {
  buildAdminDashboardSnapshot,
  buildIpForensicDossier,
} from "@/lib/telemetry/analytics";
import type { TimeRangeKey, TrafficFilterKey } from "@/lib/telemetry/types";

export const dynamic = "force-dynamic";

const NO_STORE_HEADERS = {
  "Cache-Control": "no-store, no-cache, must-revalidate, private",
  "X-Robots-Tag": "noindex, nofollow",
};

const VALID_RANGES = new Set<TimeRangeKey>(["15m", "24h", "7d", "30d", "all"]);
const VALID_TRAFFIC = new Set<TrafficFilterKey>(["all", "human", "bot"]);

export async function GET(request: Request) {
  const auth = await requireAdminApiAuth(request);
  if (!auth.ok) return auth.response;

  const url = new URL(request.url);
  const ipDetail = url.searchParams.get("ip");

  if (ipDetail && ipDetail.trim().length > 0) {
    const dossier = await buildIpForensicDossier(ipDetail.trim());
    if (!dossier) {
      return NextResponse.json(
        { error: "No telemetry records found for this IP address." },
        { status: 404, headers: NO_STORE_HEADERS }
      );
    }
    return NextResponse.json(dossier, { headers: NO_STORE_HEADERS });
  }

  const rawRange = (url.searchParams.get("range") ?? "24h") as TimeRangeKey;
  const rawTraffic = (url.searchParams.get("traffic") ??
    "all") as TrafficFilterKey;
  const excludeOwner = url.searchParams.get("excludeOwner") === "1";
  const forceRemote = url.searchParams.get("fresh") === "1";

  const range: TimeRangeKey = VALID_RANGES.has(rawRange) ? rawRange : "24h";
  const traffic: TrafficFilterKey = VALID_TRAFFIC.has(rawTraffic)
    ? rawTraffic
    : "all";

  const snapshot = await buildAdminDashboardSnapshot({
    viewerIp: auth.ip,
    range,
    traffic,
    excludeOwner,
    forceRemote,
  });

  return NextResponse.json(snapshot, { headers: NO_STORE_HEADERS });
}
