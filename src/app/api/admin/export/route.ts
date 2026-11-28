import { NextResponse } from "next/server";
import { requireAdminApiAuth } from "@/lib/admin/auth";
import { buildAdminDashboardSnapshot } from "@/lib/telemetry/analytics";
import { getTelemetryStore, recordAdminAudit } from "@/lib/telemetry/store";
import type { TimeRangeKey, TrafficFilterKey } from "@/lib/telemetry/types";

export const dynamic = "force-dynamic";

function csvCell(val: unknown): string {
  const s = val === null || val === undefined ? "" : String(val);
  if (s.includes(",") || s.includes('"') || s.includes("\n") || s.includes("\r")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function toCsv(headers: string[], rows: Array<Array<unknown>>): string {
  return [
    headers.map(csvCell).join(","),
    ...rows.map((r) => r.map(csvCell).join(",")),
  ].join("\n");
}

export async function GET(request: Request) {
  const auth = await requireAdminApiAuth(request);
  if (!auth.ok) return auth.response;

  const url = new URL(request.url);
  const type = (url.searchParams.get("type") ?? "full_json").toLowerCase();
  const range = (url.searchParams.get("range") ?? "all") as TimeRangeKey;
  const traffic = (url.searchParams.get("traffic") ?? "all") as TrafficFilterKey;
  const excludeOwner = url.searchParams.get("excludeOwner") === "1";

  const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");

  await recordAdminAudit({
    ip: auth.ip,
    action: "telemetry_exported",
    status: "success",
    details: `Exported ${type} (range=${range}, traffic=${traffic})`,
    userAgent: (request.headers.get("user-agent") ?? "").slice(0, 200),
  });

  if (type === "full_json") {
    const store = await getTelemetryStore({ forceRemote: true });
    return new NextResponse(JSON.stringify(store, null, 2), {
      status: 200,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": `attachment; filename="oxakalabs-telemetry-${stamp}.json"`,
        "Cache-Control": "no-store, private",
      },
    });
  }

  const snapshot = await buildAdminDashboardSnapshot({
    viewerIp: auth.ip,
    range,
    traffic,
    excludeOwner,
  });

  if (type === "ips_csv") {
    const csv = toCsv(
      [
        "IP Address",
        "Tag",
        "Blocked",
        "Visit Count",
        "Pageviews",
        "Resume Views",
        "Resume Downloads",
        "Resume Dwell (s)",
        "AI Queries",
        "Inquiries",
        "Country",
        "City",
        "Browser",
        "OS",
        "Device",
        "Traffic Class",
        "Top Referrer",
        "Landing Page",
        "First Seen (UTC)",
        "Last Seen (UTC)",
        "Note",
      ],
      snapshot.ipDirectory.map((p) => [
        p.ip,
        p.annotation.tag,
        p.annotation.blocked,
        p.visitCount,
        p.pageViews,
        p.resumeViews,
        p.resumeDownloads,
        Math.round(p.resumeViewDurationMs / 1000),
        p.aiQueries,
        p.contactInquiries,
        p.geo.countryName,
        p.geo.city,
        p.device.browser,
        p.device.os,
        p.device.deviceType,
        p.device.trafficClass,
        p.topReferrer,
        p.landingPage,
        new Date(p.firstSeenAt).toISOString(),
        new Date(p.lastSeenAt).toISOString(),
        p.annotation.note,
      ])
    );

    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="oxakalabs-ips-${stamp}.csv"`,
        "Cache-Control": "no-store, private",
      },
    });
  }

  if (type === "resume_csv") {
    const csv = toCsv(
      [
        "Timestamp (UTC)",
        "Event Type",
        "IP Address",
        "Country",
        "City",
        "Source",
        "Duration (s)",
        "Browser",
        "OS",
        "Referrer",
        "Label",
      ],
      snapshot.resumeAnalytics.recentResumeEvents.map((ev) => [
        new Date(ev.timestamp).toISOString(),
        ev.type,
        ev.ip,
        ev.geo.countryName,
        ev.geo.city,
        ev.source ?? "",
        ev.durationMs ? Math.round(ev.durationMs / 1000) : "",
        ev.device.browser,
        ev.device.os,
        ev.referrerDomain ?? "Direct",
        ev.label ?? "",
      ])
    );

    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="oxakalabs-resume-events-${stamp}.csv"`,
        "Cache-Control": "no-store, private",
      },
    });
  }

  if (type === "ai_csv") {
    const csv = toCsv(
      [
        "Timestamp (UTC)",
        "IP Address",
        "Country",
        "Mode",
        "Configured Primary",
        "Resolved Model",
        "Failover",
        "Latency (ms)",
        "Prompt Tokens",
        "Output Tokens",
        "Thought Tokens",
        "Total Tokens",
        "Query",
      ],
      snapshot.aiRouting.recentLogs.map((log) => [
        new Date(log.timestamp).toISOString(),
        log.ip,
        log.geo.countryName,
        log.mode,
        log.configuredPrimary,
        log.resolvedModel,
        log.wasFailover,
        log.latencyMs,
        log.usage?.promptTokenCount ?? "",
        log.usage?.candidatesTokenCount ?? "",
        log.usage?.thoughtsTokenCount ?? "",
        log.usage?.totalTokenCount ?? "",
        log.query,
      ])
    );

    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="oxakalabs-ai-routing-${stamp}.csv"`,
        "Cache-Control": "no-store, private",
      },
    });
  }

  // Default: events_csv
  const csv = toCsv(
    [
      "Timestamp (UTC)",
      "Event Type",
      "Severity",
      "IP Address",
      "Country",
      "City",
      "Path",
      "Referrer",
      "Browser",
      "OS",
      "Device",
      "Traffic Class",
      "Duration (ms)",
      "Scroll (%)",
      "Label",
    ],
    snapshot.recentLogs.map((ev) => [
      new Date(ev.timestamp).toISOString(),
      ev.type,
      ev.severity,
      ev.ip,
      ev.geo.countryName,
      ev.geo.city,
      ev.path,
      ev.referrerDomain ?? "Direct",
      ev.device.browser,
      ev.device.os,
      ev.device.deviceType,
      ev.device.trafficClass,
      ev.durationMs ?? "",
      ev.scrollDepth ?? "",
      ev.label ?? "",
    ])
  );

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="oxakalabs-events-${stamp}.csv"`,
      "Cache-Control": "no-store, private",
    },
  });
}
