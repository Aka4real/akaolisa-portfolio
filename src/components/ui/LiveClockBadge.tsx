"use client";

import { useEffect, useState } from "react";
import { PROFILE } from "@/data/profile";

interface LiveClockBadgeProps {
  compact?: boolean;
  className?: string;
}

export function LiveClockBadge({
  compact = false,
  className = "",
}: LiveClockBadgeProps) {
  const [timeStr, setTimeStr] = useState<string | null>(null);

  useEffect(() => {
    const formatter = new Intl.DateTimeFormat("en-GB", {
      timeZone: PROFILE.timeZone,
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });

    let intervalId: number | null = null;

    const update = () => setTimeStr(formatter.format(new Date()));

    const startPolling = () => {
      if (intervalId !== null) return;
      intervalId = window.setInterval(update, 10_000);
    };

    const stopPolling = () => {
      if (intervalId === null) return;
      window.clearInterval(intervalId);
      intervalId = null;
    };

    const handleVisibility = () => {
      if (document.hidden) {
        stopPolling();
      } else {
        update();
        startPolling();
      }
    };

    update();
    if (!document.hidden) {
      startPolling();
    }

    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      stopPolling();
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, []);

  return (
    <div
      className={`inline-flex max-w-full items-center gap-2 whitespace-nowrap rounded-[var(--radius-pill)] border border-[var(--border-hairline)] bg-[var(--bg-surface)] px-3 py-1.5 text-xs text-[var(--ink-secondary)] ${className}`}
      aria-label={`Availability status and local time in ${PROFILE.utcOffsetLabel}`}
    >
      <span
        className="relative flex h-2 w-2 shrink-0 items-center justify-center"
        aria-hidden="true"
      >
        {!compact && (
          <span className="live-breathe motion-reduce:animate-none absolute inline-flex h-full w-full rounded-full bg-[var(--status-positive)]" />
        )}
        <span className="relative inline-flex h-2 w-2 rounded-full bg-[var(--status-positive)]" />
      </span>

      <span className="font-medium text-[var(--ink-primary)]">
        {compact ? (
          "Available"
        ) : (
          <>
            Available<span className="hidden sm:inline"> Worldwide</span>
          </>
        )}
      </span>

      <span className="text-[var(--border-strong)]" aria-hidden="true">
        ·
      </span>

      <span
        className={`font-mono text-[11px] tabular-nums text-[var(--ink-muted)] transition-opacity duration-[180ms] ease-out ${
          timeStr ? "opacity-100" : "opacity-0"
        }`}
      >
        {timeStr ?? "00:00"} {PROFILE.utcOffsetLabel}
      </span>
    </div>
  );
}
