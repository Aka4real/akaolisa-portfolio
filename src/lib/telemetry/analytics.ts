import { getAdminAuthConfigStatus } from "@/lib/admin/auth";
import {
  applyGeminiOverride,
  getGeminiConfig,
  getGeminiKeyFingerprint,
} from "@/lib/gemini";
import { formatGeminiModelLabel } from "@/lib/knowledge";
import { buildFastHealthSnapshot } from "./health";
import { isSuspiciousProbePath } from "./ip";
import { getStorageStatus, getTelemetryStore } from "./store";
import type {
  AdminDashboardSnapshot,
  AiRoutingLogEntry,
  BreakdownItem,
  IpAnnotation,
  IpForensicDossier,
  IpProfile,
  ModelRoutingStats,
  PagePerformanceRow,
  TelemetryEvent,
  TelemetryStoreData,
  TimeRangeKey,
  TimeSeriesPoint,
  TrafficFilterKey,
  WebVitalsSummary,
} from "./types";

const ACTIVE_WINDOW_MS = 50 * 1000; // 50s heartbeat freshness = actively on site right now
const VISIT_GAP_MS = 30 * 60 * 1000; // 30-min inactivity separates distinct visits

function getRangeWindowMs(range: TimeRangeKey): number | null {
  switch (range) {
    case "15m":
      return 15 * 60 * 1000;
    case "24h":
      return 24 * 60 * 60 * 1000;
    case "7d":
      return 7 * 24 * 60 * 60 * 1000;
    case "30d":
      return 30 * 24 * 60 * 60 * 1000;
    case "all":
    default:
      return null;
  }
}

function defaultAnnotation(ip: string): IpAnnotation {
  return {
    ip,
    tag: "none",
    note: "",
    blocked: false,
    updatedAt: 0,
  };
}

function isBotTraffic(trafficClass: string): boolean {
  return trafficClass !== "human";
}

function percentile(values: number[], p: number): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const idx = Math.min(
    sorted.length - 1,
    Math.max(0, Math.ceil((p / 100) * sorted.length) - 1)
  );
  return Math.round(sorted[idx] * 100) / 100;
}

/**
 * Counts distinct visits (sessions / visit bursts) for an ordered array of events from one IP.
 * - Distinct browser sessionIds (`s_...`) each count as a distinct visit (e.g., new tab / return visit).
 * - Within the same session or server-only (`srv_...`) events, a >30-minute inactivity gap starts a new visit.
 */
function countDistinctVisitsForIp(sortedEvents: TelemetryEvent[]): number {
  if (sortedEvents.length === 0) return 0;

  const clientSessions = new Map<string, number[]>();
  const serverOnlyTimestamps: number[] = [];

  for (const ev of sortedEvents) {
    if (ev.sessionId && !ev.sessionId.startsWith("srv_")) {
      let list = clientSessions.get(ev.sessionId);
      if (!list) {
        list = [];
        clientSessions.set(ev.sessionId, list);
      }
      list.push(ev.timestamp);
    } else {
      serverOnlyTimestamps.push(ev.timestamp);
    }
  }

  let visits = 0;
  const allClientTimestamps: number[] = [];

  for (const timestamps of clientSessions.values()) {
    timestamps.sort((a, b) => a - b);
    allClientTimestamps.push(...timestamps);
    visits += 1;
    for (let i = 1; i < timestamps.length; i++) {
      if (timestamps[i] - timestamps[i - 1] > VISIT_GAP_MS) {
        visits += 1;
      }
    }
  }

  // Only count server-only events as standalone visits if they aren't adjacent to a client visit
  const orphanServerTs = serverOnlyTimestamps
    .sort((a, b) => a - b)
    .filter(
      (ts) =>
        !allClientTimestamps.some((cts) => Math.abs(ts - cts) <= VISIT_GAP_MS)
    );

  if (orphanServerTs.length > 0) {
    visits += 1;
    for (let i = 1; i < orphanServerTs.length; i++) {
      if (orphanServerTs[i] - orphanServerTs[i - 1] > VISIT_GAP_MS) {
        visits += 1;
      }
    }
  }

  return Math.max(1, visits);
}

function buildBreakdown(
  entries: Array<{ key: string; label: string; sublabel?: string; ip: string }>
): BreakdownItem[] {
  const map = new Map<
    string,
    { label: string; sublabel?: string; count: number; ips: Set<string> }
  >();

  for (const item of entries) {
    const existing = map.get(item.key);
    if (existing) {
      existing.count += 1;
      existing.ips.add(item.ip);
      if (!existing.sublabel && item.sublabel) {
        existing.sublabel = item.sublabel;
      }
    } else {
      map.set(item.key, {
        label: item.label,
        sublabel: item.sublabel,
        count: 1,
        ips: new Set([item.ip]),
      });
    }
  }

  const total = entries.length || 1;
  return Array.from(map.entries())
    .map(([key, v]) => ({
      key,
      label: v.label,
      sublabel: v.sublabel,
      count: v.count,
      uniqueIps: v.ips.size,
      pct: Math.round((v.count / total) * 1000) / 10,
    }))
    .sort((a, b) => b.count - a.count);
}

function buildTimeSeries(
  events: TelemetryEvent[],
  aiLogs: AiRoutingLogEntry[],
  range: TimeRangeKey,
  now: number
): TimeSeriesPoint[] {
  let bucketCount = 24;
  let bucketMs = 60 * 60 * 1000;

  if (range === "15m") {
    bucketCount = 15;
    bucketMs = 60 * 1000;
  } else if (range === "24h") {
    bucketCount = 24;
    bucketMs = 60 * 60 * 1000;
  } else if (range === "7d") {
    bucketCount = 14; // 12-hour intervals
    bucketMs = 12 * 60 * 60 * 1000;
  } else if (range === "30d") {
    bucketCount = 30;
    bucketMs = 24 * 60 * 60 * 1000;
  } else {
    // all-time: adapt to span
    const oldestTs = Math.min(
      ...events.map((e) => e.timestamp),
      ...aiLogs.map((a) => a.timestamp),
      now - 24 * 60 * 60 * 1000
    );
    const span = Math.max(60 * 60 * 1000, now - oldestTs);
    bucketCount = 20;
    bucketMs = Math.ceil(span / bucketCount);
  }

  const alignedEnd = Math.ceil(now / bucketMs) * bucketMs;
  const start = alignedEnd - bucketCount * bucketMs;

  const buckets: Array<{
    bucketStart: number;
    label: string;
    sessions: Set<string>;
    ips: Set<string>;
    pageViews: number;
    resumeViews: number;
    resumeDownloads: number;
    aiQueries: number;
    errors: number;
  }> = [];

  for (let i = 0; i < bucketCount; i++) {
    const bStart = start + i * bucketMs;
    const d = new Date(bStart);
    let label = "";
    if (range === "15m" || range === "24h") {
      label = d.toISOString().slice(11, 16); // HH:MM UTC
    } else if (range === "7d") {
      label = `${d.toISOString().slice(5, 10)} ${d.toISOString().slice(11, 13)}h`;
    } else {
      label = d.toISOString().slice(5, 10); // MM-DD
    }

    buckets.push({
      bucketStart: bStart,
      label,
      sessions: new Set(),
      ips: new Set(),
      pageViews: 0,
      resumeViews: 0,
      resumeDownloads: 0,
      aiQueries: 0,
      errors: 0,
    });
  }

  const indexFor = (ts: number) => {
    const idx = Math.floor((ts - start) / bucketMs);
    if (idx < 0 || idx >= bucketCount) return -1;
    return idx;
  };

  for (const ev of events) {
    const idx = indexFor(ev.timestamp);
    if (idx === -1) continue;
    const b = buckets[idx];
    b.ips.add(ev.ip);
    b.sessions.add(ev.sessionId || ev.ip);
    if (ev.type === "page_view") b.pageViews += 1;
    if (
      ev.type === "resume_modal_open" ||
      ev.type === "resume_new_tab" ||
      ev.type === "resume_direct_view"
    ) {
      b.resumeViews += 1;
    }
    if (ev.type === "resume_download") b.resumeDownloads += 1;
    if (ev.type === "client_error" || ev.severity === "error") b.errors += 1;
  }

  for (const ai of aiLogs) {
    const idx = indexFor(ai.timestamp);
    if (idx === -1) continue;
    const b = buckets[idx];
    b.ips.add(ai.ip);
    b.aiQueries += 1;
  }

  return buckets.map((b) => ({
    bucketStart: b.bucketStart,
    label: b.label,
    visits: b.sessions.size,
    uniqueIps: b.ips.size,
    pageViews: b.pageViews,
    resumeViews: b.resumeViews,
    resumeDownloads: b.resumeDownloads,
    aiQueries: b.aiQueries,
    errors: b.errors,
  }));
}

function buildModelRoutingStats(
  aiLogs: AiRoutingLogEntry[],
  effectivePrimary: string,
  effectiveFallbacks: string[],
  overrideActive: boolean
): ModelRoutingStats[] {
  const modelMap = new Map<
    string,
    {
      model: string;
      role: ModelRoutingStats["role"];
      requestsServed: number;
      attemptsTotal: number;
      failures: number;
      latencies: number[];
      promptTokens: number;
      outputTokens: number;
      thoughtTokens: number;
      totalTokens: number;
      lastServedAt: number | null;
      lastErrorAt: number | null;
      lastErrorMessage?: string;
    }
  >();

  const ensureModel = (
    modelId: string,
    defaultRole: ModelRoutingStats["role"]
  ) => {
    const existing = modelMap.get(modelId);
    if (existing) return existing;
    const created = {
      model: modelId,
      role: defaultRole,
      requestsServed: 0,
      attemptsTotal: 0,
      failures: 0,
      latencies: [] as number[],
      promptTokens: 0,
      outputTokens: 0,
      thoughtTokens: 0,
      totalTokens: 0,
      lastServedAt: null as number | null,
      lastErrorAt: null as number | null,
      lastErrorMessage: undefined as string | undefined,
    };
    modelMap.set(modelId, created);
    return created;
  };

  // Pre-seed configured chain + grounded index so they always appear in the matrix
  ensureModel(effectivePrimary, overrideActive ? "override" : "primary");
  for (const fb of effectiveFallbacks) {
    ensureModel(fb, "fallback");
  }
  ensureModel("grounded-index", "grounded-engine");

  for (const log of aiLogs) {
    for (const att of log.attempts) {
      const m = ensureModel(
        att.model,
        att.model === effectivePrimary
          ? overrideActive
            ? "override"
            : "primary"
          : effectiveFallbacks.includes(att.model)
            ? "fallback"
            : "other"
      );
      if (att.status !== "skipped") {
        m.attemptsTotal += 1;
        m.latencies.push(att.latencyMs);
      }
      if (att.status !== "success" && att.status !== "skipped") {
        m.failures += 1;
        if (!m.lastErrorAt || att.startedAt > m.lastErrorAt) {
          m.lastErrorAt = att.startedAt;
          m.lastErrorMessage = att.errorMessage || att.errorStatus || att.status;
        }
      }
    }

    const servedKey =
      log.mode === "grounded-index" ? "grounded-index" : log.resolvedModel;
    const served = ensureModel(
      servedKey,
      servedKey === "grounded-index"
        ? "grounded-engine"
        : servedKey === effectivePrimary
          ? overrideActive
            ? "override"
            : "primary"
          : effectiveFallbacks.includes(servedKey)
            ? "fallback"
            : "other"
    );
    served.requestsServed += 1;
    if (servedKey === "grounded-index") {
      served.attemptsTotal += 1;
      served.latencies.push(log.latencyMs);
    }
    if (!served.lastServedAt || log.timestamp > served.lastServedAt) {
      served.lastServedAt = log.timestamp;
    }
    if (log.usage) {
      served.promptTokens += log.usage.promptTokenCount ?? 0;
      served.outputTokens += log.usage.candidatesTokenCount ?? 0;
      served.thoughtTokens += log.usage.thoughtsTokenCount ?? 0;
      served.totalTokens += log.usage.totalTokenCount ?? 0;
    }
  }

  const totalServed = aiLogs.length || 1;
  const mostRecentLog = aiLogs[aiLogs.length - 1];
  const latestServedKey = mostRecentLog
    ? mostRecentLog.mode === "grounded-index"
      ? "grounded-index"
      : mostRecentLog.resolvedModel
    : null;

  return Array.from(modelMap.values()).map((entry) => {
    const avgLatencyMs =
      entry.latencies.length > 0
        ? Math.round(
            entry.latencies.reduce((s, v) => s + v, 0) / entry.latencies.length
          )
        : 0;
    const p95LatencyMs = Math.round(percentile(entry.latencies, 95) ?? 0);
    const successCount = Math.max(0, entry.attemptsTotal - entry.failures);
    const successRate =
      entry.attemptsTotal > 0
        ? Math.round((successCount / entry.attemptsTotal) * 1000) / 10
        : 100;

    let status: ModelRoutingStats["status"] = "standby";
    if (entry.model === "grounded-index") {
      status = "fallback-engine";
    } else if (
      entry.model === latestServedKey &&
      entry.model !== effectivePrimary
    ) {
      status = "active-failover";
    } else if (entry.model === effectivePrimary) {
      status =
        entry.attemptsTotal >= 2 && successRate < 60
          ? "degraded"
          : "active-primary";
    } else if (entry.attemptsTotal >= 2 && successRate < 60) {
      status = "degraded";
    }

    return {
      model: entry.model,
      displayLabel:
        entry.model === "grounded-index"
          ? "Grounded Dossier Index"
          : formatGeminiModelLabel(entry.model),
      role: entry.role,
      status,
      requestsServed: entry.requestsServed,
      attemptsTotal: entry.attemptsTotal,
      failures: entry.failures,
      successRate,
      trafficSharePct:
        aiLogs.length > 0
          ? Math.round((entry.requestsServed / totalServed) * 1000) / 10
          : 0,
      avgLatencyMs,
      p95LatencyMs,
      promptTokens: entry.promptTokens,
      outputTokens: entry.outputTokens,
      thoughtTokens: entry.thoughtTokens,
      totalTokens: entry.totalTokens,
      lastServedAt: entry.lastServedAt,
      lastErrorAt: entry.lastErrorAt,
      lastErrorMessage: entry.lastErrorMessage,
    };
  });
}

function buildIpDirectory(
  events: TelemetryEvent[],
  aiLogs: AiRoutingLogEntry[],
  inquiries: TelemetryStoreData["inquiries"],
  activePresenceMap: TelemetryStoreData["activePresence"],
  annotations: TelemetryStoreData["ipAnnotations"],
  now: number
): IpProfile[] {
  const byIp = new Map<
    string,
    {
      events: TelemetryEvent[];
      aiCount: number;
      inquiryCount: number;
    }
  >();

  const ensureIp = (ip: string) => {
    let bucket = byIp.get(ip);
    if (!bucket) {
      bucket = { events: [], aiCount: 0, inquiryCount: 0 };
      byIp.set(ip, bucket);
    }
    return bucket;
  };

  for (const ev of events) {
    ensureIp(ev.ip).events.push(ev);
  }
  for (const ai of aiLogs) {
    ensureIp(ai.ip).aiCount += 1;
  }
  for (const inq of inquiries) {
    ensureIp(inq.ip).inquiryCount += 1;
  }

  // Also include currently active IPs even if heartbeat arrived before event
  const activeByIp = new Map<string, TelemetryStoreData["activePresence"][string]>();
  for (const p of Object.values(activePresenceMap)) {
    if (now - p.lastSeenAt <= ACTIVE_WINDOW_MS) {
      const prev = activeByIp.get(p.ip);
      if (!prev || p.lastSeenAt > prev.lastSeenAt) {
        activeByIp.set(p.ip, p);
      }
      ensureIp(p.ip);
    }
  }

  const profiles: IpProfile[] = [];

  for (const [ip, bucket] of byIp.entries()) {
    const sorted = [...bucket.events].sort((a, b) => a.timestamp - b.timestamp);
    const active = activeByIp.get(ip);
    const firstEvent = sorted[0];
    const lastEvent = sorted[sorted.length - 1];

    const visitCount = Math.max(
      countDistinctVisitsForIp(sorted),
      active ? 1 : 0,
      bucket.aiCount > 0 || bucket.inquiryCount > 0 ? 1 : 0
    );

    let pageViews = 0;
    let resumeViews = 0;
    let resumeNewTabs = 0;
    let resumeDownloads = 0;
    let resumeViewDurationMs = 0;
    let outboundClicks = 0;
    let errorCount = 0;
    let notFoundCount = 0;
    let totalActiveMs = 0;
    const scrollSamples: number[] = [];
    const pageCounts = new Map<string, number>();
    const refCounts = new Map<string, number>();
    let landingPage = active?.currentPath ?? "/";

    for (const ev of sorted) {
      if (ev.type === "page_view") {
        if (pageViews === 0) landingPage = ev.path || "/";
        pageViews += 1;
        pageCounts.set(ev.path || "/", (pageCounts.get(ev.path || "/") ?? 0) + 1);
        if (ev.referrerDomain && ev.referrerDomain !== "Direct / Internal") {
          refCounts.set(
            ev.referrerDomain,
            (refCounts.get(ev.referrerDomain) ?? 0) + 1
          );
        }
      } else if (ev.type === "page_leave") {
        if (typeof ev.durationMs === "number" && ev.durationMs > 0) {
          totalActiveMs += Math.min(ev.durationMs, 3_600_000);
        }
        if (typeof ev.scrollDepth === "number") {
          scrollSamples.push(ev.scrollDepth);
        }
      } else if (
        ev.type === "resume_modal_open" ||
        ev.type === "resume_direct_view"
      ) {
        resumeViews += 1;
      } else if (ev.type === "resume_new_tab") {
        resumeNewTabs += 1;
        resumeViews += 1;
      } else if (ev.type === "resume_modal_close") {
        if (typeof ev.durationMs === "number" && ev.durationMs > 0) {
          resumeViewDurationMs += Math.min(ev.durationMs, 1_800_000);
        }
      } else if (ev.type === "resume_download") {
        resumeDownloads += 1;
      } else if (
        ev.type === "outbound_click" ||
        ev.type === "whatsapp_click" ||
        ev.type === "email_copy"
      ) {
        outboundClicks += 1;
      } else if (ev.type === "client_error" || ev.severity === "error") {
        errorCount += 1;
      } else if (ev.type === "not_found") {
        notFoundCount += 1;
      }
    }

    const pagesVisited = Array.from(pageCounts.entries())
      .map(([p, count]) => ({ path: p, count }))
      .sort((a, b) => b.count - a.count);

    const topReferrer =
      Array.from(refCounts.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] ??
      active?.referrerDomain ??
      "Direct";

    const geo = lastEvent?.geo ??
      active?.geo ?? {
        country: "XX",
        countryName: "Unknown",
        region: "",
        city: "Unknown",
        isPrivate: false,
        source: "unknown" as const,
      };

    const device = lastEvent?.device ??
      active?.device ?? {
        browser: "Unknown",
        browserVersion: "",
        os: "Unknown",
        osVersion: "",
        deviceType: "unknown" as const,
        trafficClass: "human" as const,
        userAgent: "",
      };

    const avgScrollDepth =
      scrollSamples.length > 0
        ? Math.round(
            scrollSamples.reduce((sum, s) => sum + s, 0) / scrollSamples.length
          )
        : active?.scrollDepth ?? 0;

    profiles.push({
      ip,
      visitCount,
      pageViews,
      totalEvents: sorted.length + bucket.aiCount + bucket.inquiryCount,
      resumeViews,
      resumeNewTabs,
      resumeDownloads,
      resumeViewDurationMs,
      aiQueries: bucket.aiCount,
      contactInquiries: bucket.inquiryCount,
      outboundClicks,
      errorCount,
      notFoundCount,
      totalActiveMs,
      avgScrollDepth,
      isOnlineNow: Boolean(active),
      isViewingResumeNow: Boolean(active?.isViewingResume),
      isAssistantOpenNow: Boolean(active?.isAssistantOpen),
      currentPath: active?.currentPath,
      firstSeenAt: firstEvent?.timestamp ?? active?.firstSeenAt ?? now,
      lastSeenAt: Math.max(
        lastEvent?.timestamp ?? 0,
        active?.lastSeenAt ?? 0
      ) || now,
      landingPage,
      topReferrer,
      pagesVisited,
      geo,
      device,
      annotation: annotations[ip] ?? defaultAnnotation(ip),
    });
  }

  return profiles.sort(
    (a, b) =>
      Number(b.isOnlineNow) - Number(a.isOnlineNow) ||
      b.visitCount - a.visitCount ||
      b.lastSeenAt - a.lastSeenAt
  );
}

export async function buildAdminDashboardSnapshot(params: {
  viewerIp: string;
  range: TimeRangeKey;
  traffic: TrafficFilterKey;
  excludeOwner: boolean;
  forceRemote?: boolean;
}): Promise<AdminDashboardSnapshot> {
  const now = Date.now();
  const store = await getTelemetryStore({ forceRemote: params.forceRemote });
  const storage = await getStorageStatus();
  const windowMs = getRangeWindowMs(params.range);
  const cutoff = windowMs !== null ? now - windowMs : 0;

  const ownerIps = new Set(
    Object.values(store.ipAnnotations)
      .filter((a) => a.tag === "owner")
      .map((a) => a.ip)
  );

  // Filter events by time, owner toggle, and traffic class
  const timeEvents = store.events.filter(
    (ev) =>
      ev.timestamp >= cutoff &&
      (!params.excludeOwner || !ownerIps.has(ev.ip))
  );

  const botEventCount = timeEvents.filter((ev) =>
    isBotTraffic(ev.device.trafficClass)
  ).length;
  const botTrafficPct =
    timeEvents.length > 0
      ? Math.round((botEventCount / timeEvents.length) * 1000) / 10
      : 0;

  const filteredEvents = timeEvents.filter((ev) => {
    if (params.traffic === "human") return !isBotTraffic(ev.device.trafficClass);
    if (params.traffic === "bot") return isBotTraffic(ev.device.trafficClass);
    return true;
  });

  const filteredAiLogs = store.aiLogs.filter(
    (log) =>
      log.timestamp >= cutoff &&
      (!params.excludeOwner || !ownerIps.has(log.ip))
  );

  const filteredInquiries = store.inquiries.filter(
    (inq) =>
      inq.timestamp >= cutoff &&
      (!params.excludeOwner || !ownerIps.has(inq.ip))
  );

  // Build IP directory from filtered data
  const ipDirectory = buildIpDirectory(
    filteredEvents,
    filteredAiLogs,
    filteredInquiries,
    store.activePresence,
    store.ipAnnotations,
    now
  );

  const ipProfileMap = new Map(ipDirectory.map((p) => [p.ip, p]));

  // Active visitors right now (within ACTIVE_WINDOW_MS)
  const activeVisitors = Object.values(store.activePresence)
    .filter((p) => {
      if (now - p.lastSeenAt > ACTIVE_WINDOW_MS) return false;
      if (params.excludeOwner && ownerIps.has(p.ip)) return false;
      if (params.traffic === "human" && isBotTraffic(p.device.trafficClass)) {
        return false;
      }
      if (params.traffic === "bot" && !isBotTraffic(p.device.trafficClass)) {
        return false;
      }
      return true;
    })
    .map((p) => {
      const prof = ipProfileMap.get(p.ip);
      const ann = store.ipAnnotations[p.ip];
      return {
        ...p,
        totalVisitsFromIp: prof?.visitCount ?? 1,
        resumeDownloadsFromIp: prof?.resumeDownloads ?? 0,
        resumeViewsFromIp: prof?.resumeViews ?? 0,
        tag: ann?.tag ?? "none",
        idleSeconds: Math.max(0, Math.round((now - p.lastSeenAt) / 1000)),
        sessionDurationSeconds: Math.max(
          1,
          Math.round((now - p.firstSeenAt) / 1000)
        ),
        resumeDwellSeconds:
          p.isViewingResume && p.resumeViewStartedAt
            ? Math.max(1, Math.round((now - p.resumeViewStartedAt) / 1000))
            : null,
      };
    })
    .sort((a, b) => b.lastSeenAt - a.lastSeenAt);

  // Visit frequency buckets across grouped IPs
  const freqSpecs: Array<{
    id: string;
    label: string;
    min: number;
    max: number | null;
  }> = [
    { id: "1", label: "1 Visit (First-Time)", min: 1, max: 1 },
    { id: "2-3", label: "2–3 Visits (Returning)", min: 2, max: 3 },
    { id: "4-9", label: "4–9 Visits (High-Intent)", min: 4, max: 9 },
    { id: "10-24", label: "10–24 Visits (Power)", min: 10, max: 24 },
    { id: "25+", label: "25+ Visits (Heavy / Bot)", min: 25, max: null },
  ];

  const totalUniqueIps = ipDirectory.length;
  const visitFrequencyBuckets = freqSpecs.map((spec) => {
    const matched = ipDirectory.filter(
      (p) =>
        p.visitCount >= spec.min &&
        (spec.max === null || p.visitCount <= spec.max)
    );
    return {
      ...spec,
      ipCount: matched.length,
      totalVisits: matched.reduce((sum, p) => sum + p.visitCount, 0),
      pct:
        totalUniqueIps > 0
          ? Math.round((matched.length / totalUniqueIps) * 1000) / 10
          : 0,
    };
  });

  // Pageview & Resume metrics
  const pageViewEvents = filteredEvents.filter((e) => e.type === "page_view");
  const resumeModalOpens = filteredEvents.filter(
    (e) => e.type === "resume_modal_open"
  );
  const resumeNewTabs = filteredEvents.filter((e) => e.type === "resume_new_tab");
  const resumeDirectViews = filteredEvents.filter(
    (e) => e.type === "resume_direct_view"
  );
  const resumeDownloadEvents = filteredEvents.filter(
    (e) => e.type === "resume_download"
  );
  const resumeCloseEvents = filteredEvents.filter(
    (e) =>
      e.type === "resume_modal_close" &&
      typeof e.durationMs === "number" &&
      e.durationMs > 0
  );

  const resumeAllViewEvents = [
    ...resumeModalOpens,
    ...resumeNewTabs,
    ...resumeDirectViews,
  ];
  const resumeUniqueIpSet = new Set([
    ...resumeAllViewEvents.map((e) => e.ip),
    ...resumeDownloadEvents.map((e) => e.ip),
  ]);

  const avgResumeReadMs =
    resumeCloseEvents.length > 0
      ? Math.round(
          resumeCloseEvents.reduce((sum, e) => sum + (e.durationMs ?? 0), 0) /
            resumeCloseEvents.length
        )
      : 0;

  const totalVisits = ipDirectory.reduce((sum, p) => sum + p.visitCount, 0);
  const returningIps = ipDirectory.filter((p) => p.visitCount >= 2).length;
  const resumeConversionPct =
    totalUniqueIps > 0
      ? Math.round((resumeUniqueIpSet.size / totalUniqueIps) * 1000) / 10
      : 0;

  // Resume funnel & breakdowns
  const resumeViewIpSet = new Set(resumeAllViewEvents.map((e) => e.ip));
  const resumeDownloadIpSet = new Set(resumeDownloadEvents.map((e) => e.ip));
  const deepReadIps = new Set(
    resumeCloseEvents
      .filter((e) => (e.durationMs ?? 0) >= 15_000)
      .map((e) => e.ip)
  );

  const resumeFunnel = [
    {
      stage: "Unique Site Visitors (IPs)",
      count: totalUniqueIps,
      pctOfVisitors: totalUniqueIps > 0 ? 100 : 0,
      detail: `${totalVisits} total visits across ${pageViewEvents.length} pageviews`,
    },
    {
      stage: "Viewed Resume (Modal / Direct / New Tab)",
      count: resumeViewIpSet.size,
      pctOfVisitors:
        totalUniqueIps > 0
          ? Math.round((resumeViewIpSet.size / totalUniqueIps) * 1000) / 10
          : 0,
      detail: `${resumeAllViewEvents.length} total view events (${resumeModalOpens.length} modal · ${resumeNewTabs.length} new tab · ${resumeDirectViews.length} direct)`,
    },
    {
      stage: "Deep Resume Readers (15s+ Dwell)",
      count: deepReadIps.size,
      pctOfVisitors:
        totalUniqueIps > 0
          ? Math.round((deepReadIps.size / totalUniqueIps) * 1000) / 10
          : 0,
      detail:
        avgResumeReadMs > 0
          ? `Avg read duration ${Math.round(avgResumeReadMs / 1000)}s`
          : "Tracking active modal dwell time",
    },
    {
      stage: "Downloaded Resume PDF",
      count: resumeDownloadIpSet.size,
      pctOfVisitors:
        totalUniqueIps > 0
          ? Math.round((resumeDownloadIpSet.size / totalUniqueIps) * 1000) / 10
          : 0,
      detail: `${resumeDownloadEvents.length} total PDF downloads`,
    },
  ];

  const downloadsBySource = buildBreakdown(
    resumeDownloadEvents.map((ev) => ({
      key: ev.source || "unknown",
      label: formatSourceLabel(ev.source || "unknown"),
      ip: ev.ip,
    }))
  );

  const viewsBySource = buildBreakdown(
    resumeAllViewEvents.map((ev) => ({
      key: ev.type,
      label:
        ev.type === "resume_modal_open"
          ? "In-App Modal Viewer"
          : ev.type === "resume_new_tab"
            ? "Opened in New Tab"
            : "Direct PDF URL",
      ip: ev.ip,
    }))
  );

  const recentResumeEvents = filteredEvents
    .filter(
      (e) =>
        e.type === "resume_modal_open" ||
        e.type === "resume_modal_close" ||
        e.type === "resume_new_tab" ||
        e.type === "resume_download" ||
        e.type === "resume_direct_view"
    )
    .slice(-120)
    .reverse();

  const topResumeIps = ipDirectory
    .filter((p) => p.resumeDownloads > 0 || p.resumeViews > 0 || p.isViewingResumeNow)
    .sort(
      (a, b) =>
        Number(b.isViewingResumeNow) - Number(a.isViewingResumeNow) ||
        b.resumeDownloads - a.resumeDownloads ||
        b.resumeViews - a.resumeViews ||
        b.resumeViewDurationMs - a.resumeViewDurationMs
    )
    .slice(0, 50);

  // AI & Gemini Routing Analytics
  const envGemini = getGeminiConfig();
  const effectiveGemini = applyGeminiOverride(envGemini, store.aiOverride);
  const geminiServedLogs = filteredAiLogs.filter((l) => l.mode === "gemini");
  const aiFailoverCount = filteredAiLogs.filter((l) => l.wasFailover).length;
  const aiAvgLatencyMs =
    filteredAiLogs.length > 0
      ? Math.round(
          filteredAiLogs.reduce((s, l) => s + l.latencyMs, 0) /
            filteredAiLogs.length
        )
      : 0;
  const aiTotalTokens = filteredAiLogs.reduce(
    (s, l) => s + (l.usage?.totalTokenCount ?? 0),
    0
  );
  const aiGeminiPct =
    filteredAiLogs.length > 0
      ? Math.round((geminiServedLogs.length / filteredAiLogs.length) * 1000) / 10
      : envGemini.apiKey && !effectiveGemini.forceGroundedIndex
        ? 100
        : 0;

  const latestAiOverall = store.aiLogs[store.aiLogs.length - 1] ?? null;
  const activeRoutedMode: "gemini" | "grounded-index" =
    effectiveGemini.forceGroundedIndex
      ? "grounded-index"
      : latestAiOverall
        ? latestAiOverall.mode
        : envGemini.apiKey
          ? "gemini"
          : "grounded-index";

  const activeRoutedModel =
    effectiveGemini.forceGroundedIndex
      ? "grounded-index"
      : latestAiOverall
        ? latestAiOverall.resolvedModel
        : envGemini.apiKey
          ? effectiveGemini.primaryModel
          : "grounded-index";

  const isCurrentlyFailedOver = Boolean(
    latestAiOverall &&
      !effectiveGemini.forceGroundedIndex &&
      envGemini.apiKey &&
      (latestAiOverall.wasFailover ||
        latestAiOverall.mode === "grounded-index" ||
        latestAiOverall.resolvedModel !== effectiveGemini.primaryModel)
  );

  const modelStats = buildModelRoutingStats(
    filteredAiLogs,
    effectiveGemini.primaryModel,
    effectiveGemini.fallbackModels,
    Boolean(effectiveGemini.overrideActive)
  );

  // Pages & Web Vitals Performance
  const pageMap = new Map<
    string,
    {
      views: number;
      ips: Set<string>;
      durations: number[];
      scrolls: number[];
      lcps: number[];
      ttfbs: number[];
      exits: number;
    }
  >();

  const ensurePage = (routePath: string) => {
    const clean = routePath.split("?")[0] || "/";
    let row = pageMap.get(clean);
    if (!row) {
      row = {
        views: 0,
        ips: new Set(),
        durations: [],
        scrolls: [],
        lcps: [],
        ttfbs: [],
        exits: 0,
      };
      pageMap.set(clean, row);
    }
    return row;
  };

  const ttfbAll: number[] = [];
  const fcpAll: number[] = [];
  const lcpAll: number[] = [];
  const clsAll: number[] = [];
  const loadAll: number[] = [];

  for (const ev of filteredEvents) {
    if (ev.type === "page_view") {
      const row = ensurePage(ev.path);
      row.views += 1;
      row.ips.add(ev.ip);
    } else if (ev.type === "page_leave") {
      const row = ensurePage(ev.path);
      row.exits += 1;
      if (typeof ev.durationMs === "number" && ev.durationMs > 0) {
        row.durations.push(Math.min(ev.durationMs, 1_800_000));
      }
      if (typeof ev.scrollDepth === "number") {
        row.scrolls.push(ev.scrollDepth);
      }
    } else if (ev.type === "web_vitals" && ev.meta) {
      const row = ensurePage(ev.path);
      const ttfb = Number(ev.meta.ttfb);
      const fcp = Number(ev.meta.fcp);
      const lcp = Number(ev.meta.lcp);
      const cls = Number(ev.meta.cls);
      const loadTime = Number(ev.meta.loadTime);
      if (Number.isFinite(ttfb) && ttfb >= 0 && ttfb < 60_000) {
        ttfbAll.push(ttfb);
        row.ttfbs.push(ttfb);
      }
      if (Number.isFinite(fcp) && fcp >= 0 && fcp < 60_000) {
        fcpAll.push(fcp);
      }
      if (Number.isFinite(lcp) && lcp >= 0 && lcp < 60_000) {
        lcpAll.push(lcp);
        row.lcps.push(lcp);
      }
      if (Number.isFinite(cls) && cls >= 0 && cls < 10) {
        clsAll.push(cls);
      }
      if (Number.isFinite(loadTime) && loadTime >= 0 && loadTime < 60_000) {
        loadAll.push(loadTime);
      }
    }
  }

  const pages: PagePerformanceRow[] = Array.from(pageMap.entries())
    .map(([p, v]) => ({
      path: p,
      views: v.views,
      uniqueIps: v.ips.size,
      avgDurationMs:
        v.durations.length > 0
          ? Math.round(v.durations.reduce((s, d) => s + d, 0) / v.durations.length)
          : 0,
      avgScrollDepth:
        v.scrolls.length > 0
          ? Math.round(v.scrolls.reduce((s, d) => s + d, 0) / v.scrolls.length)
          : 0,
      avgLcpMs:
        v.lcps.length > 0
          ? Math.round(v.lcps.reduce((s, d) => s + d, 0) / v.lcps.length)
          : null,
      avgTtfbMs:
        v.ttfbs.length > 0
          ? Math.round(v.ttfbs.reduce((s, d) => s + d, 0) / v.ttfbs.length)
          : null,
      exits: v.exits,
    }))
    .filter((row) => row.views > 0)
    .sort((a, b) => b.views - a.views);

  const webVitals: WebVitalsSummary = {
    sampleCount: Math.max(
      ttfbAll.length,
      fcpAll.length,
      lcpAll.length,
      loadAll.length
    ),
    ttfb: {
      p50: percentile(ttfbAll, 50),
      p75: percentile(ttfbAll, 75),
      p95: percentile(ttfbAll, 95),
    },
    fcp: {
      p50: percentile(fcpAll, 50),
      p75: percentile(fcpAll, 75),
      p95: percentile(fcpAll, 95),
    },
    lcp: {
      p50: percentile(lcpAll, 50),
      p75: percentile(lcpAll, 75),
      p95: percentile(lcpAll, 95),
    },
    cls: {
      p50: percentile(clsAll, 50),
      p75: percentile(clsAll, 75),
      p95: percentile(clsAll, 95),
    },
    loadTime: {
      p50: percentile(loadAll, 50),
      p75: percentile(loadAll, 75),
      p95: percentile(loadAll, 95),
    },
  };

  // Attribution, Geo, Device, Traffic breakdowns
  const sourceEvents = pageViewEvents.length > 0 ? pageViewEvents : filteredEvents;

  const referrers = buildBreakdown(
    sourceEvents.map((ev) => ({
      key: ev.referrerDomain || "Direct",
      label: ev.referrerDomain || "Direct",
      ip: ev.ip,
    }))
  );

  const utmCampaigns = buildBreakdown(
    sourceEvents
      .filter((ev) => ev.utm && (ev.utm.source || ev.utm.campaign || ev.utm.medium))
      .map((ev) => {
        const label = [ev.utm?.source, ev.utm?.medium, ev.utm?.campaign]
          .filter(Boolean)
          .join(" / ");
        return { key: label, label, ip: ev.ip };
      })
  );

  const countries = buildBreakdown(
    sourceEvents.map((ev) => ({
      key: ev.geo.country || "XX",
      label: ev.geo.countryName || "Unknown",
      sublabel: ev.geo.country,
      ip: ev.ip,
    }))
  );

  const cities = buildBreakdown(
    sourceEvents.map((ev) => ({
      key: `${ev.geo.city}|${ev.geo.country}`,
      label: ev.geo.city || "Unknown",
      sublabel: ev.geo.countryName,
      ip: ev.ip,
    }))
  );

  const browsers = buildBreakdown(
    sourceEvents.map((ev) => ({
      key: ev.device.browser || "Unknown",
      label: ev.device.browser || "Unknown",
      ip: ev.ip,
    }))
  );

  const operatingSystems = buildBreakdown(
    sourceEvents.map((ev) => ({
      key: ev.device.os || "Unknown",
      label: ev.device.os || "Unknown",
      ip: ev.ip,
    }))
  );

  const deviceTypes = buildBreakdown(
    sourceEvents.map((ev) => ({
      key: ev.device.deviceType || "unknown",
      label:
        ev.device.deviceType.charAt(0).toUpperCase() +
        ev.device.deviceType.slice(1),
      ip: ev.ip,
    }))
  );

  const trafficClasses = buildBreakdown(
    timeEvents.map((ev) => ({
      key: ev.device.trafficClass,
      label: formatTrafficClassLabel(ev.device.trafficClass),
      ip: ev.ip,
    }))
  );

  // Errors & 404 probes
  const errorEvents = filteredEvents.filter(
    (e) => e.type === "client_error" || e.severity === "error"
  );
  const notFoundEvents = filteredEvents.filter((e) => e.type === "not_found");
  const notFoundMap = new Map<
    string,
    { count: number; ips: Set<string>; lastSeenAt: number; sampleIp: string }
  >();
  for (const nf of notFoundEvents) {
    const existing = notFoundMap.get(nf.path);
    if (existing) {
      existing.count += 1;
      existing.ips.add(nf.ip);
      if (nf.timestamp > existing.lastSeenAt) {
        existing.lastSeenAt = nf.timestamp;
        existing.sampleIp = nf.ip;
      }
    } else {
      notFoundMap.set(nf.path, {
        count: 1,
        ips: new Set([nf.ip]),
        lastSeenAt: nf.timestamp,
        sampleIp: nf.ip,
      });
    }
  }

  const notFounds = Array.from(notFoundMap.entries())
    .map(([p, v]) => ({
      path: p,
      count: v.count,
      uniqueIps: v.ips.size,
      lastSeenAt: v.lastSeenAt,
      suspicious: isSuspiciousProbePath(p),
      sampleIp: v.sampleIp,
    }))
    .sort((a, b) => Number(b.suspicious) - Number(a.suspicious) || b.count - a.count);

  const errorRatePct =
    filteredEvents.length > 0
      ? Math.round((errorEvents.length / filteredEvents.length) * 1000) / 10
      : 0;

  const health = await buildFastHealthSnapshot(errorRatePct);
  const authCfg = getAdminAuthConfigStatus();
  const allAnnotations = Object.values(store.ipAnnotations);

  return {
    generatedAt: now,
    viewerIp: params.viewerIp,
    filters: {
      range: params.range,
      traffic: params.traffic,
      excludeOwner: params.excludeOwner,
    },
    kpis: {
      activeNow: activeVisitors.length,
      activeViewingResumeNow: activeVisitors.filter((v) => v.isViewingResume)
        .length,
      activeUsingAssistantNow: activeVisitors.filter((v) => v.isAssistantOpen)
        .length,
      totalVisits,
      uniqueIps: totalUniqueIps,
      returningIps,
      totalPageViews: pageViewEvents.length,
      totalEvents: filteredEvents.length,
      resumeViews: resumeAllViewEvents.length,
      resumeModalOpens: resumeModalOpens.length,
      resumeNewTabs: resumeNewTabs.length,
      resumeDirectViews: resumeDirectViews.length,
      resumeDownloads: resumeDownloadEvents.length,
      resumeUniqueIps: resumeUniqueIpSet.size,
      resumeConversionPct,
      avgResumeReadMs,
      aiTotalQueries: filteredAiLogs.length,
      aiGeminiPct,
      aiFailoverCount,
      aiAvgLatencyMs,
      aiTotalTokens,
      contactInquiriesTotal: filteredInquiries.length,
      contactUnreadCount: filteredInquiries.filter(
        (i) => !i.reviewed && i.status !== "honeypot_blocked"
      ).length,
      errorCount: errorEvents.length,
      notFoundCount: notFoundEvents.length,
      errorRatePct,
      botTrafficPct,
      healthScore: health.score,
      healthStatus: health.overallStatus,
    },
    activeVisitors,
    timeSeries: buildTimeSeries(filteredEvents, filteredAiLogs, params.range, now),
    ipDirectory: ipDirectory.slice(0, 400),
    visitFrequencyBuckets,
    resumeAnalytics: {
      funnel: resumeFunnel,
      downloadsBySource,
      viewsBySource,
      recentResumeEvents,
      topResumeIps,
    },
    aiRouting: {
      geminiConfigured: Boolean(envGemini.apiKey),
      keyFingerprint: getGeminiKeyFingerprint(),
      envPrimaryModel: envGemini.primaryModel,
      envFallbackModels: envGemini.fallbackModels,
      effectivePrimaryModel: effectiveGemini.primaryModel,
      effectiveFallbackModels: effectiveGemini.fallbackModels,
      effectiveThinkingLevel: effectiveGemini.thinkingLevel,
      effectiveMaxOutputTokens: effectiveGemini.maxOutputTokens,
      activeRoutedModel,
      activeRoutedModelLabel:
        activeRoutedModel === "grounded-index"
          ? "Grounded Dossier Index"
          : formatGeminiModelLabel(activeRoutedModel),
      activeRoutedMode,
      lastRoutedAt: latestAiOverall?.timestamp ?? null,
      isCurrentlyFailedOver,
      override: store.aiOverride,
      models: modelStats,
      recentLogs: filteredAiLogs.slice(-150).reverse(),
    },
    pages,
    referrers: referrers.slice(0, 20),
    utmCampaigns: utmCampaigns.slice(0, 20),
    countries: countries.slice(0, 25),
    cities: cities.slice(0, 25),
    browsers: browsers.slice(0, 15),
    operatingSystems: operatingSystems.slice(0, 15),
    deviceTypes,
    trafficClasses,
    webVitals,
    recentLogs: filteredEvents.slice(-300).reverse(),
    errors: errorEvents.slice(-150).reverse(),
    notFounds: notFounds.slice(0, 50),
    inquiries: filteredInquiries.slice(-150).reverse(),
    auditLogs: store.auditLogs.slice(-150).reverse(),
    health,
    storage,
    authSecurity: {
      isProduction: authCfg.isProduction,
      passwordConfigured: authCfg.passwordConfigured,
      secretConfigured: authCfg.secretConfigured,
      blockedIpCount: allAnnotations.filter((a) => a.blocked || a.tag === "blocked")
        .length,
      ownerIpCount: allAnnotations.filter((a) => a.tag === "owner").length,
      watchedIpCount: allAnnotations.filter((a) => a.tag === "watched").length,
    },
  };
}

export async function buildIpForensicDossier(
  ip: string
): Promise<IpForensicDossier | null> {
  const store = await getTelemetryStore();
  const now = Date.now();
  const ipEvents = store.events
    .filter((e) => e.ip === ip)
    .sort((a, b) => a.timestamp - b.timestamp);
  const ipAiLogs = store.aiLogs
    .filter((l) => l.ip === ip)
    .sort((a, b) => b.timestamp - a.timestamp);
  const ipInquiries = store.inquiries
    .filter((i) => i.ip === ip)
    .sort((a, b) => b.timestamp - a.timestamp);

  const profiles = buildIpDirectory(
    ipEvents,
    ipAiLogs,
    ipInquiries,
    store.activePresence,
    store.ipAnnotations,
    now
  );
  const profile = profiles[0];
  if (!profile) return null;

  // Group events into sessions
  const sessionMap = new Map<
    string,
    {
      sessionId: string;
      startedAt: number;
      lastSeenAt: number;
      eventCount: number;
      pages: Set<string>;
      viewedResume: boolean;
      downloadedResume: boolean;
      usedAi: boolean;
      submittedContact: boolean;
    }
  >();

  for (const ev of ipEvents) {
    const sid = ev.sessionId || `visit_${Math.floor(ev.timestamp / VISIT_GAP_MS)}`;
    let sess = sessionMap.get(sid);
    if (!sess) {
      sess = {
        sessionId: sid,
        startedAt: ev.timestamp,
        lastSeenAt: ev.timestamp,
        eventCount: 0,
        pages: new Set(),
        viewedResume: false,
        downloadedResume: false,
        usedAi: false,
        submittedContact: false,
      };
      sessionMap.set(sid, sess);
    }
    sess.startedAt = Math.min(sess.startedAt, ev.timestamp);
    sess.lastSeenAt = Math.max(sess.lastSeenAt, ev.timestamp);
    sess.eventCount += 1;
    if (ev.type === "page_view") sess.pages.add(ev.path || "/");
    if (
      ev.type === "resume_modal_open" ||
      ev.type === "resume_new_tab" ||
      ev.type === "resume_direct_view"
    ) {
      sess.viewedResume = true;
    }
    if (ev.type === "resume_download") sess.downloadedResume = true;
    if (ev.type === "ai_chat" || ev.type === "assistant_open") sess.usedAi = true;
    if (ev.type === "contact_submit") sess.submittedContact = true;
  }

  const sessions = Array.from(sessionMap.values())
    .map((s) => ({
      sessionId: s.sessionId,
      startedAt: s.startedAt,
      lastSeenAt: s.lastSeenAt,
      durationMs: Math.max(1000, s.lastSeenAt - s.startedAt),
      eventCount: s.eventCount,
      pages: Array.from(s.pages),
      viewedResume: s.viewedResume,
      downloadedResume: s.downloadedResume,
      usedAi: s.usedAi,
      submittedContact: s.submittedContact,
    }))
    .sort((a, b) => b.startedAt - a.startedAt);

  return {
    profile,
    sessions,
    events: [...ipEvents].reverse().slice(0, 300),
    aiLogs: ipAiLogs.slice(0, 100),
    inquiries: ipInquiries,
  };
}

function formatSourceLabel(source: string): string {
  switch (source) {
    case "modal":
      return "Resume Modal";
    case "experience":
      return "Experience Page";
    case "contact":
      return "Contact Page";
    case "header":
      return "Header Nav";
    case "footer":
      return "Footer Access";
    case "direct":
      return "Direct PDF URL";
    case "newtab":
      return "New Tab Viewer";
    default:
      return source.charAt(0).toUpperCase() + source.slice(1);
  }
}

function formatTrafficClassLabel(cls: string): string {
  switch (cls) {
    case "human":
      return "Human Visitors";
    case "crawler":
      return "Search / AI Crawlers";
    case "preview_scraper":
      return "Social Link Previewers";
    case "automation":
      return "HTTP Clients / Headless";
    case "bot":
      return "Monitors / Bots";
    default:
      return cls;
  }
}
