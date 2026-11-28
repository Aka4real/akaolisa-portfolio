import { NextResponse } from "next/server";
import {
  extractClientIp,
  normalizeReferrerDomain,
  parseUserAgent,
} from "@/lib/telemetry/ip";
import {
  recordTelemetryBatchAndPresence,
  resolveGeoWithCache,
} from "@/lib/telemetry/store";
import type {
  ActiveVisitorPresence,
  TelemetryEvent,
  TelemetryEventType,
  TelemetrySeverity,
  UtmParams,
} from "@/lib/telemetry/types";

export const dynamic = "force-dynamic";

const ALLOWED_CLIENT_EVENTS = new Set<TelemetryEventType>([
  "page_view",
  "page_leave",
  "resume_modal_open",
  "resume_modal_close",
  "resume_new_tab",
  "resume_download",
  "assistant_open",
  "email_copy",
  "whatsapp_click",
  "outbound_click",
  "project_interaction",
  "web_vitals",
  "client_error",
  "not_found",
]);

interface IncomingEventPayload {
  type?: string;
  severity?: TelemetrySeverity;
  path?: string;
  queryString?: string;
  referrer?: string;
  utm?: UtmParams;
  durationMs?: number;
  scrollDepth?: number;
  label?: string;
  source?: string;
  meta?: Record<string, unknown>;
  timestamp?: number;
}

interface IncomingPresencePayload {
  currentPath?: string;
  pageViewsInSession?: number;
  scrollDepth?: number;
  visibilityState?: "visible" | "hidden";
  isViewingResume?: boolean;
  isAssistantOpen?: boolean;
  referrer?: string;
  viewport?: string;
  language?: string;
  networkType?: string;
}

interface TelemetryRequestBody {
  visitorId?: string;
  sessionId?: string;
  events?: IncomingEventPayload[];
  presence?: IncomingPresencePayload;
}

function sanitizePath(raw?: string): string {
  const s = (raw ?? "/").trim().slice(0, 260);
  if (!s.startsWith("/")) return `/${s}`;
  return s;
}

function sanitizeString(raw: unknown, maxLen: number): string | undefined {
  if (typeof raw !== "string") return undefined;
  const trimmed = raw.trim();
  if (!trimmed) return undefined;
  return trimmed.slice(0, maxLen);
}

function sanitizeNumber(raw: unknown, min: number, max: number): number | undefined {
  if (typeof raw !== "number" || !Number.isFinite(raw)) return undefined;
  return Math.min(max, Math.max(min, Math.round(raw * 100) / 100));
}

function sanitizeUtm(raw?: UtmParams): UtmParams | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const cleaned: UtmParams = {
    source: sanitizeString(raw.source, 80),
    medium: sanitizeString(raw.medium, 80),
    campaign: sanitizeString(raw.campaign, 120),
    term: sanitizeString(raw.term, 80),
    content: sanitizeString(raw.content, 80),
  };
  if (
    !cleaned.source &&
    !cleaned.medium &&
    !cleaned.campaign &&
    !cleaned.term &&
    !cleaned.content
  ) {
    return undefined;
  }
  return cleaned;
}

function defaultSeverityFor(type: TelemetryEventType): TelemetrySeverity {
  if (type === "client_error") return "error";
  if (type === "not_found") return "warn";
  if (type === "resume_download" || type === "contact_submit") return "success";
  return "info";
}

export async function POST(request: Request) {
  try {
    // Skip internal health probes completely
    if (request.headers.get("x-internal-probe") === "1") {
      return new NextResponse(null, { status: 204 });
    }

    const body = (await request.json()) as TelemetryRequestBody;
    const ip = extractClientIp(request.headers);
    const ua = request.headers.get("user-agent") ?? "";
    const siteHost = request.headers.get("host") ?? "";
    const device = parseUserAgent(ua);
    const geo = await resolveGeoWithCache(ip, request.headers);

    const visitorId =
      sanitizeString(body.visitorId, 64) ?? `v_${ip.replace(/[^a-zA-Z0-9]/g, "")}`;
    const sessionId =
      sanitizeString(body.sessionId, 64) ?? `s_${visitorId}_${Date.now()}`;

    const now = Date.now();
    const eventsToStore: Array<Omit<TelemetryEvent, "id">> = [];

    if (Array.isArray(body.events)) {
      for (const item of body.events.slice(0, 20)) {
        if (!item || typeof item !== "object") continue;
        const evType = item.type as TelemetryEventType;
        if (!ALLOWED_CLIENT_EVENTS.has(evType)) continue;

        const cleanPath = sanitizePath(item.path);
        // Never log admin routes as public visitor traffic
        if (cleanPath.startsWith("/admin")) continue;

        const referrer = sanitizeString(item.referrer, 400);
        const referrerDomain = normalizeReferrerDomain(referrer, siteHost);

        const severity: TelemetrySeverity =
          item.severity === "info" ||
          item.severity === "success" ||
          item.severity === "warn" ||
          item.severity === "error"
            ? item.severity
            : defaultSeverityFor(evType);

        // Keep client timestamps within +/- 60s of server time to avoid skewed clocks
        const ts =
          typeof item.timestamp === "number" &&
          Math.abs(now - item.timestamp) < 60_000
            ? item.timestamp
            : now;

        eventsToStore.push({
          timestamp: ts,
          type: evType,
          severity,
          ip,
          visitorId,
          sessionId,
          path: cleanPath,
          queryString: sanitizeString(item.queryString, 260),
          referrer,
          referrerDomain,
          utm: sanitizeUtm(item.utm),
          geo,
          device,
          durationMs: sanitizeNumber(item.durationMs, 0, 7_200_000),
          scrollDepth: sanitizeNumber(item.scrollDepth, 0, 100),
          label: sanitizeString(item.label, 200),
          source: sanitizeString(item.source, 60),
          meta:
            item.meta && typeof item.meta === "object"
              ? sanitizeMeta(item.meta)
              : undefined,
        });
      }
    }

    let presence: ActiveVisitorPresence | undefined;
    if (body.presence && typeof body.presence === "object") {
      const currentPath = sanitizePath(body.presence.currentPath);
      if (!currentPath.startsWith("/admin")) {
        presence = {
          sessionId,
          visitorId,
          ip,
          geo,
          device,
          currentPath,
          firstSeenAt: now,
          lastSeenAt: now,
          pageViewsInSession: Math.max(
            1,
            Math.min(500, Math.round(body.presence.pageViewsInSession ?? 1))
          ),
          scrollDepth: Math.max(
            0,
            Math.min(100, Math.round(body.presence.scrollDepth ?? 0))
          ),
          visibilityState:
            body.presence.visibilityState === "hidden" ? "hidden" : "visible",
          isViewingResume: Boolean(body.presence.isViewingResume),
          isAssistantOpen: Boolean(body.presence.isAssistantOpen),
          referrerDomain: normalizeReferrerDomain(
            sanitizeString(body.presence.referrer, 400),
            siteHost
          ),
          viewport: sanitizeString(body.presence.viewport, 32),
          language: sanitizeString(body.presence.language, 32),
          networkType: sanitizeString(body.presence.networkType, 32),
        };
      }
    }

    if (eventsToStore.length > 0 || presence) {
      await recordTelemetryBatchAndPresence({
        events: eventsToStore,
        presence,
      });
    }

    return new NextResponse(null, {
      status: 204,
      headers: { "Cache-Control": "no-store" },
    });
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
}

function sanitizeMeta(
  raw: Record<string, unknown>
): Record<string, unknown> | undefined {
  const out: Record<string, unknown> = {};
  const keys = Object.keys(raw).slice(0, 16);
  for (const key of keys) {
    const val = raw[key];
    if (typeof val === "string") {
      out[key] = val.slice(0, 320);
    } else if (typeof val === "number" && Number.isFinite(val)) {
      out[key] = Math.round(val * 1000) / 1000;
    } else if (typeof val === "boolean") {
      out[key] = val;
    }
  }
  return Object.keys(out).length > 0 ? out : undefined;
}
