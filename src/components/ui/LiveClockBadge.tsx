"use client";

import { useEffect, useState } from "react";
import { PROFILE } from "@/data/profile";

interface LiveClockBadgeProps {
  compact?: boolean;
  tone?: "light" | "marine";
  className?: string;
}

export function LiveClockBadge({
  compact = false,
  tone = "light",
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

  const primaryText =
    tone === "marine"
      ? "text-[var(--ink-on-marine)]"
      : "text-[var(--ink-primary)]";
  const secondaryText =
    tone === "marine"
      ? "text-[var(--ink-on-marine-muted)]"
      : "text-[var(--ink-muted)]";

  return (
    <p
      className={`type-sm inline-flex flex-wrap items-center gap-x-2 gap-y-0.5 tabular-nums ${secondaryText} ${className}`}
      aria-label={`Availability status and local time in ${PROFILE.utcOffsetLabel}`}
    >
      <span className={`font-medium ${primaryText}`}>
        {compact ? "Available remotely" : "Available worldwide for contracts"}
      </span>
      <span aria-hidden="true">·</span>
      <span
        className={`transition-opacity duration-[180ms] ease-out ${
          timeStr ? "opacity-100" : "opacity-0"
        }`}
      >
        Local time {timeStr ?? "00:00"} {PROFILE.utcOffsetLabel}
      </span>
    </p>
  );
}
