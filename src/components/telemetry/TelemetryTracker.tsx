"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import {
  sendTelemetryPayload,
  trackTelemetryEvent,
} from "@/lib/telemetry/client";
import type { UtmParams } from "@/lib/telemetry/types";

interface TelemetryTrackerProps {
  resumeOpen: boolean;
  assistantOpen: boolean;
}

const HEARTBEAT_INTERVAL_MS = 15_000;

function readUtmParams(): UtmParams | undefined {
  if (typeof window === "undefined") return undefined;
  const params = new URLSearchParams(window.location.search);
  const utm: UtmParams = {
    source: params.get("utm_source") || undefined,
    medium: params.get("utm_medium") || undefined,
    campaign: params.get("utm_campaign") || undefined,
    term: params.get("utm_term") || undefined,
    content: params.get("utm_content") || undefined,
  };
  if (
    !utm.source &&
    !utm.medium &&
    !utm.campaign &&
    !utm.term &&
    !utm.content
  ) {
    return undefined;
  }
  return utm;
}

function getCurrentScrollDepth(): number {
  if (typeof window === "undefined" || typeof document === "undefined") return 0;
  const docEl = document.documentElement;
  const scrollHeight = docEl.scrollHeight - window.innerHeight;
  if (scrollHeight <= 0) return 100;
  return Math.max(
    0,
    Math.min(100, Math.round((window.scrollY / scrollHeight) * 100))
  );
}

function getNetworkEffectiveType(): string | undefined {
  if (typeof navigator === "undefined") return undefined;
  const nav = navigator as Navigator & {
    connection?: { effectiveType?: string };
  };
  return nav.connection?.effectiveType;
}

export function TelemetryTracker({
  resumeOpen,
  assistantOpen,
}: TelemetryTrackerProps) {
  const pathname = usePathname();
  const isAdminRoute = pathname?.startsWith("/admin") ?? false;

  const pageViewsRef = useRef(0);
  const pageEnteredAtRef = useRef(Date.now());
  const maxScrollRef = useRef(0);
  const prevPathRef = useRef<string | null>(null);
  const resumeOpenRef = useRef(resumeOpen);
  const assistantOpenRef = useRef(assistantOpen);
  const resumeOpenedAtRef = useRef<number | null>(null);
  const vitalsReportedRef = useRef(false);

  resumeOpenRef.current = resumeOpen;
  assistantOpenRef.current = assistantOpen;

  const buildPresenceSnapshot = (pathOverride?: string) => ({
    currentPath: pathOverride ?? (pathname || "/"),
    pageViewsInSession: Math.max(1, pageViewsRef.current),
    scrollDepth: Math.max(maxScrollRef.current, getCurrentScrollDepth()),
    visibilityState:
      typeof document !== "undefined" && document.visibilityState === "hidden"
        ? ("hidden" as const)
        : ("visible" as const),
    isViewingResume: resumeOpenRef.current,
    isAssistantOpen: assistantOpenRef.current,
    referrer: typeof document !== "undefined" ? document.referrer : undefined,
    viewport:
      typeof window !== "undefined"
        ? `${window.innerWidth}x${window.innerHeight}`
        : undefined,
    language:
      typeof navigator !== "undefined" ? navigator.language : undefined,
    networkType: getNetworkEffectiveType(),
  });

  // 1. Track route changes, page views, and page leave durations
  useEffect(() => {
    if (isAdminRoute || !pathname) return;

    const now = Date.now();
    const prevPath = prevPathRef.current;

    if (prevPath && prevPath !== pathname) {
      const durationMs = Math.max(0, now - pageEnteredAtRef.current);
      trackTelemetryEvent({
        type: "page_leave",
        path: prevPath,
        durationMs,
        scrollDepth: maxScrollRef.current,
        label: `Left ${prevPath} after ${Math.round(durationMs / 1000)}s`,
      });
    }

    prevPathRef.current = pathname;
    pageEnteredAtRef.current = now;
    maxScrollRef.current = getCurrentScrollDepth();
    pageViewsRef.current += 1;

    sendTelemetryPayload({
      events: [
        {
          type: "page_view",
          path: pathname,
          queryString:
            typeof window !== "undefined" ? window.location.search.slice(1) : undefined,
          referrer: typeof document !== "undefined" ? document.referrer : undefined,
          utm: readUtmParams(),
          scrollDepth: maxScrollRef.current,
          label: `Visited ${pathname}`,
        },
      ],
      presence: buildPresenceSnapshot(pathname),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname, isAdminRoute]);

  // 2. Track ResumeModal live viewing + exact dwell time
  useEffect(() => {
    if (isAdminRoute) return;

    if (resumeOpen) {
      resumeOpenedAtRef.current = Date.now();
      sendTelemetryPayload({
        events: [
          {
            type: "resume_modal_open",
            path: pathname || "/",
            source: "modal",
            label: "Opened in-app Resume PDF preview",
          },
        ],
        presence: buildPresenceSnapshot(),
      });
    } else if (resumeOpenedAtRef.current !== null) {
      const dwellMs = Math.max(500, Date.now() - resumeOpenedAtRef.current);
      resumeOpenedAtRef.current = null;
      sendTelemetryPayload({
        events: [
          {
            type: "resume_modal_close",
            path: pathname || "/",
            source: "modal",
            durationMs: dwellMs,
            label: `Viewed Resume PDF for ${Math.round(dwellMs / 1000)}s`,
          },
        ],
        presence: buildPresenceSnapshot(),
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resumeOpen, isAdminRoute]);

  // 3. Track AI Assistant drawer open + presence sync
  useEffect(() => {
    if (isAdminRoute) return;
    if (assistantOpen) {
      sendTelemetryPayload({
        events: [
          {
            type: "assistant_open",
            path: pathname || "/",
            label: "Opened AI Dossier Assistant",
          },
        ],
        presence: buildPresenceSnapshot(),
      });
    } else if (prevPathRef.current) {
      sendTelemetryPayload({ presence: buildPresenceSnapshot() });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assistantOpen, isAdminRoute]);

  // 4. Periodic live presence heartbeats, scroll tracking, visibility & pagehide
  useEffect(() => {
    if (isAdminRoute) return;

    const onScroll = () => {
      const depth = getCurrentScrollDepth();
      if (depth > maxScrollRef.current) {
        maxScrollRef.current = depth;
      }
    };

    const onVisibility = () => {
      sendTelemetryPayload({ presence: buildPresenceSnapshot() }, true);
    };

    const onPageHide = () => {
      const now = Date.now();
      const events: Array<{
        type: "page_leave" | "resume_modal_close";
        path: string;
        durationMs: number;
        scrollDepth: number;
        label: string;
        source?: string;
      }> = [
        {
          type: "page_leave",
          path: prevPathRef.current || pathname || "/",
          durationMs: Math.max(0, now - pageEnteredAtRef.current),
          scrollDepth: maxScrollRef.current,
          label: `Ended view on ${prevPathRef.current || "/"}`,
        },
      ];

      if (resumeOpenedAtRef.current !== null) {
        const dwellMs = Math.max(500, now - resumeOpenedAtRef.current);
        resumeOpenedAtRef.current = null;
        events.push({
          type: "resume_modal_close",
          path: prevPathRef.current || pathname || "/",
          source: "modal",
          durationMs: dwellMs,
          scrollDepth: maxScrollRef.current,
          label: `Viewed Resume PDF for ${Math.round(dwellMs / 1000)}s`,
        });
      }

      sendTelemetryPayload(
        {
          events,
          presence: {
            ...buildPresenceSnapshot(),
            visibilityState: "hidden",
          },
        },
        true
      );
    };

    const heartbeatTimer = window.setInterval(() => {
      if (document.visibilityState === "visible") {
        sendTelemetryPayload({ presence: buildPresenceSnapshot() });
      }
    }, HEARTBEAT_INTERVAL_MS);

    window.addEventListener("scroll", onScroll, { passive: true });
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pagehide", onPageHide);

    return () => {
      window.clearInterval(heartbeatTimer);
      window.removeEventListener("scroll", onScroll);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pagehide", onPageHide);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdminRoute, pathname]);

  // 5. Real User Monitoring (RUM) Web Vitals (TTFB, FCP, LCP, CLS, Load)
  useEffect(() => {
    if (isAdminRoute || vitalsReportedRef.current) return;
    if (typeof window === "undefined" || typeof performance === "undefined") {
      return;
    }

    let lcpValue: number | undefined;
    let fcpValue: number | undefined;
    let clsValue = 0;

    const observers: PerformanceObserver[] = [];

    try {
      if (typeof PerformanceObserver !== "undefined") {
        const lcpObs = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          const last = entries[entries.length - 1];
          if (last) lcpValue = Math.round(last.startTime);
        });
        lcpObs.observe({ type: "largest-contentful-paint", buffered: true });
        observers.push(lcpObs);

        const paintObs = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (entry.name === "first-contentful-paint") {
              fcpValue = Math.round(entry.startTime);
            }
          }
        });
        paintObs.observe({ type: "paint", buffered: true });
        observers.push(paintObs);

        const clsObs = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            const shift = entry as PerformanceEntry & {
              value?: number;
              hadRecentInput?: boolean;
            };
            if (!shift.hadRecentInput && typeof shift.value === "number") {
              clsValue += shift.value;
            }
          }
        });
        clsObs.observe({ type: "layout-shift", buffered: true });
        observers.push(clsObs);
      }
    } catch {
      // Unsupported PerformanceObserver entry types
    }

    const reportTimer = window.setTimeout(() => {
      if (vitalsReportedRef.current) return;
      vitalsReportedRef.current = true;

      const navEntries = performance.getEntriesByType(
        "navigation"
      ) as PerformanceNavigationTiming[];
      const nav = navEntries[0];

      const ttfb =
        nav && nav.responseStart > 0 ? Math.round(nav.responseStart) : undefined;
      const loadTime =
        nav && nav.loadEventEnd > 0 ? Math.round(nav.loadEventEnd) : undefined;
      const domInteractive =
        nav && nav.domInteractive > 0
          ? Math.round(nav.domInteractive)
          : undefined;

      trackTelemetryEvent({
        type: "web_vitals",
        path: window.location.pathname,
        label: `RUM Vitals (LCP ${lcpValue ?? "—"}ms · TTFB ${ttfb ?? "—"}ms)`,
        meta: {
          ttfb,
          fcp: fcpValue,
          lcp: lcpValue,
          cls: Math.round(clsValue * 1000) / 1000,
          loadTime,
          domInteractive,
        },
      });
    }, 3500);

    return () => {
      window.clearTimeout(reportTimer);
      for (const obs of observers) {
        try {
          obs.disconnect();
        } catch {
          // ignore
        }
      }
    };
  }, [isAdminRoute]);

  // 6. Client JS Error & Unhandled Promise Rejection Capture + Outbound Click Attribution
  useEffect(() => {
    if (isAdminRoute || typeof window === "undefined") return;

    const onError = (event: ErrorEvent) => {
      trackTelemetryEvent({
        type: "client_error",
        severity: "error",
        path: window.location.pathname,
        label: (event.message || "Unhandled runtime error").slice(0, 180),
        meta: {
          filename: event.filename?.slice(0, 180),
          lineno: event.lineno,
          colno: event.colno,
        },
      });
    };

    const onRejection = (event: PromiseRejectionEvent) => {
      const reason =
        event.reason instanceof Error
          ? event.reason.message
          : String(event.reason ?? "Unhandled promise rejection");
      trackTelemetryEvent({
        type: "client_error",
        severity: "error",
        path: window.location.pathname,
        label: `Promise Rejection: ${reason.slice(0, 160)}`,
      });
    };

    const onDocumentClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      const anchor = target?.closest("a");
      if (!anchor) return;
      const href = anchor.getAttribute("href") ?? "";
      if (!href) return;

      if (href.startsWith("https://wa.me") || href.includes("whatsapp")) {
        trackTelemetryEvent({
          type: "whatsapp_click",
          severity: "success",
          path: window.location.pathname,
          label: "Clicked WhatsApp direct contact",
          meta: { href },
        });
        return;
      }

      if (href.startsWith("http://") || href.startsWith("https://")) {
        try {
          const url = new URL(href);
          if (url.host !== window.location.host) {
            trackTelemetryEvent({
              type: "outbound_click",
              path: window.location.pathname,
              label: `Clicked external link: ${url.host}`,
              meta: {
                href: href.slice(0, 240),
                host: url.host,
                text: (anchor.textContent ?? "").trim().slice(0, 80),
              },
            });
          }
        } catch {
          // Ignore malformed hrefs
        }
      }
    };

    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onRejection);
    document.addEventListener("click", onDocumentClick, { capture: true });

    return () => {
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onRejection);
      document.removeEventListener("click", onDocumentClick, { capture: true });
    };
  }, [isAdminRoute]);

  return null;
}
