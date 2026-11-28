import type { IpTag, TelemetrySeverity } from "@/lib/telemetry/types";

export function formatRelativeTime(ts: number | null | undefined): string {
  if (!ts) return "Never";
  const diffSec = Math.max(0, Math.round((Date.now() - ts) / 1000));
  if (diffSec < 5) return "Just now";
  if (diffSec < 60) return `${diffSec}s ago`;
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 30) return `${diffDay}d ago`;
  return new Date(ts).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

export function formatDateTime(ts: number | null | undefined): string {
  if (!ts) return "—";
  return new Date(ts).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
}

export function formatDurationMs(ms: number | null | undefined): string {
  if (!ms || ms <= 0) return "0s";
  const sec = Math.round(ms / 1000);
  return formatDurationSec(sec);
}

export function formatDurationSec(totalSec: number): string {
  if (!Number.isFinite(totalSec) || totalSec <= 0) return "0s";
  const s = Math.round(totalSec);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  const remS = s % 60;
  if (m < 60) return remS > 0 ? `${m}m ${remS}s` : `${m}m`;
  const h = Math.floor(m / 60);
  const remM = m % 60;
  if (h < 24) return remM > 0 ? `${h}h ${remM}m` : `${h}h`;
  const d = Math.floor(h / 24);
  const remH = h % 24;
  return `${d}d ${remH}h`;
}

export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export function formatNumber(n: number): string {
  if (!Number.isFinite(n)) return "0";
  return new Intl.NumberFormat("en-US").format(Math.round(n));
}

export function formatCompact(n: number): string {
  if (!Number.isFinite(n)) return "0";
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 10_000) return `${(n / 1000).toFixed(1)}K`;
  return formatNumber(n);
}

export function countryFlag(code?: string | null): string {
  if (!code) return "🌐";
  const upper = code.trim().toUpperCase();
  if (upper === "LOCAL") return "⌂";
  if (upper.length !== 2 || !/^[A-Z]{2}$/.test(upper)) return "🌐";
  const offset = 127397;
  return String.fromCodePoint(
    upper.charCodeAt(0) + offset,
    upper.charCodeAt(1) + offset
  );
}

export function getTagStyle(tag: IpTag): { label: string; className: string } {
  switch (tag) {
    case "owner":
      return {
        label: "Owner",
        className:
          "border-[var(--accent-border)] bg-[var(--accent-soft)] text-[var(--accent-deep)]",
      };
    case "recruiter":
      return {
        label: "Recruiter",
        className:
          "border-[var(--status-positive-border)] bg-[var(--status-positive-bg)] text-[var(--status-positive)]",
      };
    case "lead":
      return {
        label: "Lead",
        className:
          "border-[var(--status-positive-border)] bg-[var(--status-positive-bg)] text-[var(--status-positive)]",
      };
    case "vip":
      return {
        label: "VIP",
        className:
          "border-[var(--accent-border)] bg-[var(--accent-soft)] text-[var(--accent-deep)]",
      };
    case "watched":
      return {
        label: "Watched",
        className:
          "border-[var(--status-warning-border)] bg-[var(--status-warning-bg)] text-[var(--status-warning)]",
      };
    case "blocked":
      return {
        label: "Blocked",
        className:
          "border-[var(--status-danger-border)] bg-[var(--status-danger-bg)] text-[var(--status-danger)]",
      };
    case "bot":
      return {
        label: "Bot",
        className:
          "border-[var(--border-strong)] bg-[var(--bg-subtle)] text-[var(--ink-secondary)]",
      };
    case "none":
    default:
      return {
        label: "Untagged",
        className:
          "border-[var(--border-hairline)] bg-[var(--bg-subtle)] text-[var(--ink-muted)]",
      };
  }
}

export function getSeverityStyle(severity: TelemetrySeverity): string {
  switch (severity) {
    case "success":
      return "border-[var(--status-positive-border)] bg-[var(--status-positive-bg)] text-[var(--status-positive)]";
    case "warn":
      return "border-[var(--status-warning-border)] bg-[var(--status-warning-bg)] text-[var(--status-warning)]";
    case "error":
      return "border-[var(--status-danger-border)] bg-[var(--status-danger-bg)] text-[var(--status-danger)]";
    case "info":
    default:
      return "border-[var(--border-hairline)] bg-[var(--bg-subtle)] text-[var(--ink-secondary)]";
  }
}

export function formatEventTypeLabel(type: string): string {
  return type
    .replace(/_/g, " ")
    .replace(/\b\w/g, (ch) => ch.toUpperCase());
}
