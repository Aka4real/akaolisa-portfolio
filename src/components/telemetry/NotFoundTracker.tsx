"use client";

import { useEffect } from "react";
import { trackTelemetryEvent } from "@/lib/telemetry/client";

export function NotFoundTracker() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    const missingPath = window.location.pathname || "/404";
    trackTelemetryEvent({
      type: "not_found",
      severity: "warn",
      path: missingPath,
      queryString: window.location.search.slice(1) || undefined,
      referrer: document.referrer || undefined,
      label: `404 Not Found: ${missingPath}`,
    });
  }, []);

  return null;
}
