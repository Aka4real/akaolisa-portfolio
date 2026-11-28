"use client";

import type {
  TelemetryEventType,
  TelemetrySeverity,
  UtmParams,
} from "./types";

const VISITOR_STORAGE_KEY = "oxaka_vid_v1";
const SESSION_STORAGE_KEY = "oxaka_sid_v1";

function randomToken(prefix: string): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `${prefix}_${crypto.randomUUID().replace(/-/g, "").slice(0, 16)}`;
  }
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

export function getClientTelemetryIds(): {
  visitorId: string;
  sessionId: string;
} {
  if (typeof window === "undefined") {
    return { visitorId: "ssr", sessionId: "ssr" };
  }

  let visitorId = "";
  let sessionId = "";

  try {
    visitorId = window.localStorage.getItem(VISITOR_STORAGE_KEY) || "";
    if (!visitorId) {
      visitorId = randomToken("v");
      window.localStorage.setItem(VISITOR_STORAGE_KEY, visitorId);
    }
  } catch {
    visitorId = randomToken("v");
  }

  try {
    sessionId = window.sessionStorage.getItem(SESSION_STORAGE_KEY) || "";
    if (!sessionId) {
      sessionId = randomToken("s");
      window.sessionStorage.setItem(SESSION_STORAGE_KEY, sessionId);
    }
  } catch {
    sessionId = randomToken("s");
  }

  return { visitorId, sessionId };
}

export interface ClientTrackPayload {
  type: TelemetryEventType;
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
}

export function sendTelemetryPayload(
  payload: {
    events?: ClientTrackPayload[];
    presence?: {
      currentPath: string;
      pageViewsInSession: number;
      scrollDepth: number;
      visibilityState: "visible" | "hidden";
      isViewingResume: boolean;
      isAssistantOpen: boolean;
      referrer?: string;
      viewport?: string;
      language?: string;
      networkType?: string;
    };
  },
  preferBeacon = false
): void {
  if (typeof window === "undefined") return;
  if (window.location.pathname.startsWith("/admin")) return;

  const { visitorId, sessionId } = getClientTelemetryIds();
  const body = JSON.stringify({
    visitorId,
    sessionId,
    events: payload.events?.map((ev) => ({
      ...ev,
      path: ev.path ?? window.location.pathname,
      timestamp: Date.now(),
    })),
    presence: payload.presence,
  });

  if (
    preferBeacon &&
    typeof navigator !== "undefined" &&
    typeof navigator.sendBeacon === "function"
  ) {
    try {
      const blob = new Blob([body], { type: "application/json" });
      if (navigator.sendBeacon("/api/telemetry", blob)) {
        return;
      }
    } catch {
      // Fall through to keepalive fetch
    }
  }

  fetch("/api/telemetry", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
    keepalive: true,
    cache: "no-store",
  }).catch(() => {
    // Telemetry must never interrupt user experience
  });
}

export function trackTelemetryEvent(
  event: ClientTrackPayload,
  preferBeacon = false
): void {
  sendTelemetryPayload({ events: [event] }, preferBeacon);
}

/**
 * Constructs a tracked /api/resume URL with visitor & session correlation IDs
 * so server-side PDF views and downloads link seamlessly to the client's session.
 */
export function buildTrackedResumeUrl(
  mode: "view" | "download" | "newtab",
  source: string
): string {
  const params = new URLSearchParams({
    mode,
    source,
  });
  if (typeof window !== "undefined") {
    const { visitorId, sessionId } = getClientTelemetryIds();
    params.set("vid", visitorId);
    params.set("sid", sessionId);
  }
  return `/api/resume?${params.toString()}`;
}
