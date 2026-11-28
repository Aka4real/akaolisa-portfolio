import fs from "fs/promises";
import path from "path";
import { NextResponse } from "next/server";
import { PROFILE } from "@/data/profile";
import {
  extractClientIp,
  normalizeReferrerDomain,
  parseUserAgent,
} from "@/lib/telemetry/ip";
import {
  isIpBlocked,
  recordTelemetryEvent,
  resolveGeoWithCache,
} from "@/lib/telemetry/store";
import type { TelemetryEventType } from "@/lib/telemetry/types";

export const dynamic = "force-dynamic";

const RESUME_FS_PATH = path.join(
  process.cwd(),
  "public",
  "resume",
  "Akaolisa-Enwedo-Resume.pdf"
);

export async function GET(request: Request) {
  const startedAt = Date.now();
  const url = new URL(request.url);
  const mode = (url.searchParams.get("mode") ?? "view").toLowerCase();
  const source = (url.searchParams.get("source") ?? "direct")
    .toLowerCase()
    .slice(0, 40);
  const visitorId = (url.searchParams.get("vid") ?? "").trim().slice(0, 64);
  const sessionId = (url.searchParams.get("sid") ?? "").trim().slice(0, 64);
  const isProbe =
    request.headers.get("x-internal-probe") === "1" ||
    url.searchParams.get("probe") === "1";

  const ip = extractClientIp(request.headers);

  if (!isProbe && (await isIpBlocked(ip))) {
    return NextResponse.json(
      { error: "Access restricted for this IP address." },
      { status: 403 }
    );
  }

  let pdfBuffer: Buffer;
  try {
    pdfBuffer = await fs.readFile(RESUME_FS_PATH);
  } catch {
    return NextResponse.json(
      { error: "Resume PDF asset is temporarily unavailable." },
      { status: 404 }
    );
  }

  const latencyMs = Date.now() - startedAt;

  // Record every real resume view/download (skip synthetic health probes and iframe prefetch duplicates if marked)
  if (!isProbe && source !== "modal-iframe") {
    try {
      const ua = request.headers.get("user-agent") ?? "";
      const referrer = request.headers.get("referer") ?? undefined;
      const siteHost = request.headers.get("host") ?? "";
      const device = parseUserAgent(ua);
      const geo = await resolveGeoWithCache(ip, request.headers);

      let eventType: TelemetryEventType = "resume_direct_view";
      let label = "Viewed Resume PDF directly";
      if (mode === "download") {
        eventType = "resume_download";
        label = `Downloaded ${PROFILE.resumeFileName} (${source})`;
      } else if (mode === "newtab" || source === "newtab") {
        eventType = "resume_new_tab";
        label = `Opened ${PROFILE.resumeFileName} in new tab`;
      } else if (source === "modal") {
        eventType = "resume_modal_open";
        label = "Opened Resume PDF preview";
      }

      await recordTelemetryEvent({
        timestamp: Date.now(),
        type: eventType,
        severity: eventType === "resume_download" ? "success" : "info",
        ip,
        visitorId: visitorId || `srv_v_${ip.replace(/[^a-zA-Z0-9]/g, "")}`,
        sessionId: sessionId || `srv_s_${ip.replace(/[^a-zA-Z0-9]/g, "")}_${Math.floor(Date.now() / 1_800_000)}`,
        path: PROFILE.resumePdfPath,
        referrer,
        referrerDomain: normalizeReferrerDomain(referrer, siteHost),
        geo,
        device,
        statusCode: 200,
        latencyMs,
        label,
        source,
        meta: {
          mode,
          fileName: PROFILE.resumeFileName,
          bytesServed: pdfBuffer.byteLength,
          serverTracked: true,
        },
      });
    } catch {
      // Never block resume PDF download/viewing if telemetry logging encounters an issue
    }
  }

  const disposition =
    mode === "download"
      ? `attachment; filename="${PROFILE.resumeFileName}"`
      : `inline; filename="${PROFILE.resumeFileName}"`;

  return new NextResponse(new Uint8Array(pdfBuffer), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": disposition,
      "Content-Length": String(pdfBuffer.byteLength),
      "Cache-Control": "no-store, max-age=0",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
