"use client";

import { useEffect, useState } from "react";
import { PROFILE } from "@/data/profile";

interface LiveClockBadgeProps {
  compact?: boolean;
}

export function LiveClockBadge({ compact = false }: LiveClockBadgeProps) {
  const [timeStr, setTimeStr] = useState<string>("--:--:--");

  useEffect(() => {
    const formatter = new Intl.DateTimeFormat("en-GB", {
      timeZone: PROFILE.timeZone,
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    });

    const update = () => setTimeStr(formatter.format(new Date()));
    update();
    const id = window.setInterval(update, 1000);
    return () => window.clearInterval(id);
  }, []);

  return (
    <div
      className="inline-flex items-center gap-2.5 rounded border border-[#E5E2DC] bg-white px-3 py-1.5 font-mono text-[11px] tracking-wide text-[#4B4E54]"
      aria-label={`Availability status and local time in ${PROFILE.utcOffsetLabel}`}
    >
      <span className="relative flex h-2 w-2 shrink-0" aria-hidden="true">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#15803D] opacity-40" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-[#15803D]" />
      </span>
      <span className="font-medium text-[#111214]">
        {compact ? "AVAILABLE" : "AVAILABLE · REMOTE WORLDWIDE"}
      </span>
      <span className="text-[#D1CDC4]" aria-hidden="true">
        |
      </span>
      <span className="tabular-nums text-[#6E727A]">
        {timeStr} {PROFILE.utcOffsetLabel}
      </span>
    </div>
  );
}
