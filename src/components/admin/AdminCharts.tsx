"use client";

import { useState, type ReactNode } from "react";
import type {
  BreakdownItem,
  ModelRoutingStats,
  TimeSeriesPoint,
} from "@/lib/telemetry/types";
import { formatCompact, formatNumber } from "./adminFormat";

/* -------------------------------------------------------------------------- */
/*  KPI Instrument Card                                                       */
/* -------------------------------------------------------------------------- */

interface KpiCardProps {
  label: string;
  value: string | number;
  sublabel?: string;
  tone?: "default" | "accent" | "positive" | "warning" | "danger";
  livePulse?: boolean;
  icon?: ReactNode;
  onClick?: () => void;
}

export function KpiInstrumentCard({
  label,
  value,
  sublabel,
  tone = "default",
  livePulse = false,
  icon,
  onClick,
}: KpiCardProps) {
  const toneColor =
    tone === "positive"
      ? "text-[var(--status-positive)]"
      : tone === "warning"
        ? "text-[var(--status-warning)]"
        : tone === "danger"
          ? "text-[var(--status-danger)]"
          : tone === "accent"
            ? "text-[var(--accent)]"
            : "text-[var(--ink-primary)]";

  const Wrapper = onClick ? "button" : "div";

  return (
    <Wrapper
      type={onClick ? "button" : undefined}
      onClick={onClick}
      className={`surface-elevated flex flex-col justify-between rounded-[var(--radius-md)] border border-[var(--border-hairline)] p-4 text-left ${
        onClick
          ? "card-hover btn-press cursor-pointer hover:border-[var(--accent-border)]"
          : ""
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="font-mono text-[10.5px] font-medium uppercase tracking-[0.08em] text-[var(--ink-muted)]">
          {label}
        </span>
        <div className="flex items-center gap-1.5 text-[var(--ink-muted)]">
          {livePulse && (
            <span className="relative flex h-2 w-2" aria-hidden="true">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--status-positive)] opacity-65" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-[var(--status-positive)]" />
            </span>
          )}
          {icon}
        </div>
      </div>

      <div className={`mt-2.5 font-display text-2xl font-semibold tracking-[-0.03em] tabular-nums ${toneColor}`}>
        {typeof value === "number" ? formatNumber(value) : value}
      </div>

      {sublabel && (
        <p className="mt-1.5 truncate font-mono text-[11px] tabular-nums text-[var(--ink-muted)]">
          {sublabel}
        </p>
      )}
    </Wrapper>
  );
}

/* -------------------------------------------------------------------------- */
/*  Interactive Multi-Series SVG Traffic & Activity Chart                     */
/* -------------------------------------------------------------------------- */

export function TrafficTimelineChart({
  data,
}: {
  data: TimeSeriesPoint[];
}) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  if (data.length === 0) {
    return (
      <div className="flex h-56 items-center justify-center rounded-[var(--radius-sm)] border border-dashed border-[var(--border-strong)] bg-[var(--bg-subtle)]/50 font-mono text-xs text-[var(--ink-muted)]">
        No traffic buckets recorded in this window yet.
      </div>
    );
  }

  const width = 760;
  const height = 228;
  const padLeft = 36;
  const padRight = 14;
  const padTop = 18;
  const padBottom = 30;
  const chartW = width - padLeft - padRight;
  const chartH = height - padTop - padBottom;

  const maxY = Math.max(
    4,
    ...data.map((d) =>
      Math.max(d.pageViews, d.visits, d.resumeViews + d.resumeDownloads + d.aiQueries)
    )
  );

  const stepX = data.length > 1 ? chartW / (data.length - 1) : chartW;
  const xFor = (i: number) =>
    data.length > 1 ? padLeft + i * stepX : padLeft + chartW / 2;
  const yFor = (val: number) => padTop + chartH - (val / maxY) * chartH;

  const pageViewPts = data.map((d, i) => `${xFor(i)},${yFor(d.pageViews)}`).join(" ");
  const pageViewArea = `M ${xFor(0)},${padTop + chartH} L ${data
    .map((d, i) => `${xFor(i)},${yFor(d.pageViews)}`)
    .join(" L ")} L ${xFor(data.length - 1)},${padTop + chartH} Z`;
  const visitsPts = data.map((d, i) => `${xFor(i)},${yFor(d.visits)}`).join(" ");

  const gridLevels = [0, 0.25, 0.5, 0.75, 1];
  const labelStride = Math.max(1, Math.ceil(data.length / 7));
  const hovered = hoveredIdx !== null ? data[hoveredIdx] : null;

  return (
    <div className="relative">
      {/* Legend + Active Hover Readout */}
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="flex flex-wrap items-center gap-4 font-mono text-[11px] text-[var(--ink-secondary)]">
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-[var(--accent)]" />
            Pageviews
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-[var(--ink-primary)]" />
            Visits (Sessions)
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-sm bg-[var(--status-positive)]" />
            Resume Actions
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-sm bg-[var(--status-warning)]" />
            AI Queries
          </span>
        </div>

        <div className="font-mono text-[11px] tabular-nums text-[var(--ink-muted)]">
          {hovered ? (
            <span className="text-[var(--ink-primary)]">
              <strong className="font-semibold">{hovered.label}</strong> ·{" "}
              {hovered.pageViews} views · {hovered.visits} visits ·{" "}
              {hovered.uniqueIps} IPs · {hovered.resumeViews} CV views ·{" "}
              {hovered.resumeDownloads} CV dl · {hovered.aiQueries} AI
            </span>
          ) : (
            <span>Hover chart to inspect bucket metrics</span>
          )}
        </div>
      </div>

      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="h-56 w-full overflow-visible"
        role="img"
        aria-label="Traffic, visits, resume activity, and AI query timeline"
        onMouseLeave={() => setHoveredIdx(null)}
      >
        <defs>
          <linearGradient id="pvAreaFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.16" />
            <stop offset="100%" stopColor="var(--accent)" stopOpacity="0.01" />
          </linearGradient>
        </defs>

        {/* Horizontal hairline gridlines */}
        {gridLevels.map((lvl) => {
          const y = padTop + chartH * (1 - lvl);
          const tickVal = Math.round(maxY * lvl);
          return (
            <g key={lvl}>
              <line
                x1={padLeft}
                y1={y}
                x2={width - padRight}
                y2={y}
                stroke="rgba(15, 20, 30, 0.08)"
                strokeDasharray={lvl === 0 ? undefined : "2 4"}
              />
              <text
                x={padLeft - 8}
                y={y + 3.5}
                textAnchor="end"
                className="fill-[var(--ink-muted)] font-mono text-[10px]"
              >
                {tickVal}
              </text>
            </g>
          );
        })}

        {/* Resume + AI subtle stacked bars */}
        {data.map((d, i) => {
          const cx = xFor(i);
          const barW = Math.max(4, Math.min(12, stepX * 0.34));
          const resumeCount = d.resumeViews + d.resumeDownloads;
          const resumeH = (resumeCount / maxY) * chartH;
          const aiH = (d.aiQueries / maxY) * chartH;
          return (
            <g key={`bars-${d.bucketStart}`}>
              {resumeCount > 0 && (
                <rect
                  x={cx - barW / 2 - 1}
                  y={padTop + chartH - resumeH}
                  width={barW * 0.55}
                  height={Math.max(2, resumeH)}
                  rx={1.5}
                  fill="var(--status-positive)"
                  opacity={0.75}
                />
              )}
              {d.aiQueries > 0 && (
                <rect
                  x={cx + 1}
                  y={padTop + chartH - aiH}
                  width={barW * 0.55}
                  height={Math.max(2, aiH)}
                  rx={1.5}
                  fill="var(--status-warning)"
                  opacity={0.78}
                />
              )}
            </g>
          );
        })}

        {/* Pageviews area & line */}
        <path d={pageViewArea} fill="url(#pvAreaFill)" />
        <polyline
          fill="none"
          stroke="var(--accent)"
          strokeWidth={2}
          strokeLinejoin="round"
          strokeLinecap="round"
          points={pageViewPts}
        />

        {/* Visits line */}
        <polyline
          fill="none"
          stroke="var(--ink-primary)"
          strokeWidth={1.6}
          strokeDasharray="4 3"
          strokeLinejoin="round"
          strokeLinecap="round"
          points={visitsPts}
        />

        {/* Hover crosshair & active dots */}
        {hoveredIdx !== null && data[hoveredIdx] && (
          <g>
            <line
              x1={xFor(hoveredIdx)}
              y1={padTop}
              x2={xFor(hoveredIdx)}
              y2={padTop + chartH}
              stroke="var(--accent)"
              strokeWidth={1}
              strokeOpacity={0.45}
            />
            <circle
              cx={xFor(hoveredIdx)}
              cy={yFor(data[hoveredIdx].pageViews)}
              r={4}
              fill="var(--accent)"
              stroke="#FFFFFF"
              strokeWidth={2}
            />
            <circle
              cx={xFor(hoveredIdx)}
              cy={yFor(data[hoveredIdx].visits)}
              r={3.5}
              fill="var(--ink-primary)"
              stroke="#FFFFFF"
              strokeWidth={1.5}
            />
          </g>
        )}

        {/* X-axis labels */}
        {data.map((d, i) =>
          i % labelStride === 0 || i === data.length - 1 ? (
            <text
              key={`lbl-${d.bucketStart}`}
              x={xFor(i)}
              y={height - 8}
              textAnchor="middle"
              className="fill-[var(--ink-muted)] font-mono text-[10px]"
            >
              {d.label}
            </text>
          ) : null
        )}

        {/* Invisible hit targets for crisp hover */}
        {data.map((d, i) => {
          const hitW = Math.max(12, stepX);
          return (
            <rect
              key={`hit-${d.bucketStart}`}
              x={xFor(i) - hitW / 2}
              y={padTop}
              width={hitW}
              height={chartH}
              fill="transparent"
              className="cursor-crosshair"
              onMouseEnter={() => setHoveredIdx(i)}
            />
          );
        })}
      </svg>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Visit Frequency Distribution Buckets                                      */
/* -------------------------------------------------------------------------- */

export function VisitFrequencyChart({
  buckets,
  activeBucketId,
  onSelectBucket,
}: {
  buckets: Array<{
    id: string;
    label: string;
    ipCount: number;
    totalVisits: number;
    pct: number;
  }>;
  activeBucketId: string | null;
  onSelectBucket: (id: string | null) => void;
}) {
  const maxIps = Math.max(1, ...buckets.map((b) => b.ipCount));

  return (
    <div className="grid gap-2.5 sm:grid-cols-5">
      {buckets.map((b) => {
        const selected = activeBucketId === b.id;
        const barPct = Math.round((b.ipCount / maxIps) * 100);
        return (
          <button
            key={b.id}
            type="button"
            onClick={() => onSelectBucket(selected ? null : b.id)}
            className={`btn-press flex flex-col justify-between rounded-[var(--radius-sm)] border p-3 text-left transition-colors ${
              selected
                ? "border-[var(--accent)] bg-[var(--accent-soft)]"
                : "border-[var(--border-hairline)] bg-[var(--bg-surface)] hover:border-[var(--border-strong)]"
            }`}
          >
            <span className="font-mono text-[10.5px] font-medium text-[var(--ink-muted)]">
              {b.label}
            </span>
            <div className="mt-2 flex items-baseline justify-between gap-2">
              <span className="font-display text-xl font-semibold tabular-nums text-[var(--ink-primary)]">
                {formatNumber(b.ipCount)}
              </span>
              <span className="font-mono text-[10.5px] tabular-nums text-[var(--ink-muted)]">
                {b.pct}%
              </span>
            </div>
            <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-[var(--bg-recessed)]">
              <div
                className="h-full rounded-full bg-[var(--accent)] transition-all duration-300"
                style={{ width: `${Math.max(b.ipCount > 0 ? 8 : 0, barPct)}%` }}
              />
            </div>
            <span className="mt-1.5 font-mono text-[10px] tabular-nums text-[var(--ink-muted)]">
              {formatNumber(b.totalVisits)} total visits
            </span>
          </button>
        );
      })}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Horizontal Proportional Breakdown Bars                                    */
/* -------------------------------------------------------------------------- */

export function ProportionalBarList({
  items,
  emptyLabel = "No data collected yet.",
  accentColor = "var(--accent)",
  maxItems = 8,
}: {
  items: BreakdownItem[];
  emptyLabel?: string;
  accentColor?: string;
  maxItems?: number;
}) {
  const visible = items.slice(0, maxItems);
  if (visible.length === 0) {
    return (
      <p className="py-6 text-center font-mono text-xs text-[var(--ink-muted)]">
        {emptyLabel}
      </p>
    );
  }

  const maxCount = Math.max(1, ...visible.map((i) => i.count));

  return (
    <div className="space-y-3">
      {visible.map((item) => {
        const widthPct = Math.max(4, Math.round((item.count / maxCount) * 100));
        return (
          <div key={item.key} className="space-y-1">
            <div className="flex items-center justify-between gap-2 text-xs">
              <div className="min-w-0 truncate font-medium text-[var(--ink-primary)]">
                {item.label}
                {item.sublabel && (
                  <span className="ml-1.5 font-mono text-[10.5px] text-[var(--ink-muted)]">
                    {item.sublabel}
                  </span>
                )}
              </div>
              <div className="shrink-0 font-mono text-[11px] tabular-nums text-[var(--ink-secondary)]">
                <strong className="font-semibold text-[var(--ink-primary)]">
                  {formatNumber(item.count)}
                </strong>
                <span className="ml-1.5 text-[var(--ink-muted)]">
                  ({item.uniqueIps} IP{item.uniqueIps === 1 ? "" : "s"} · {item.pct}%)
                </span>
              </div>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--bg-subtle)]">
              <div
                className="h-full rounded-full transition-all duration-300"
                style={{ width: `${widthPct}%`, backgroundColor: accentColor }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Health Score Radial Arc Gauge                                             */
/* -------------------------------------------------------------------------- */

export function HealthScoreGauge({
  score,
  status,
}: {
  score: number;
  status: "operational" | "degraded" | "critical";
}) {
  const radius = 52;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.max(0, Math.min(100, score));
  const strokeDashoffset = circumference - (clamped / 100) * circumference;

  const strokeColor =
    status === "operational"
      ? "var(--status-positive)"
      : status === "degraded"
        ? "var(--status-warning)"
        : "var(--status-danger)";

  return (
    <div className="relative inline-flex h-36 w-36 items-center justify-center">
      <svg viewBox="0 0 128 128" className="h-full w-full -rotate-90">
        <circle
          cx="64"
          cy="64"
          r={radius}
          fill="none"
          stroke="var(--bg-recessed)"
          strokeWidth="9"
        />
        <circle
          cx="64"
          cy="64"
          r={radius}
          fill="none"
          stroke={strokeColor}
          strokeWidth="9"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          className="transition-all duration-500"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <span className="font-display text-3xl font-semibold tracking-[-0.03em] tabular-nums text-[var(--ink-primary)]">
          {clamped}
        </span>
        <span className="font-mono text-[10px] uppercase tracking-[0.08em] text-[var(--ink-muted)]">
          / 100 Health
        </span>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  AI Model Routing Pipeline Visual Diagram                                  */
/* -------------------------------------------------------------------------- */

export function AiRoutingPipelineDiagram({
  models,
  activeRoutedModel,
  geminiConfigured,
  forceGrounded,
}: {
  models: ModelRoutingStats[];
  activeRoutedModel: string;
  geminiConfigured: boolean;
  forceGrounded: boolean;
}) {
  return (
    <div className="overflow-x-auto pb-1">
      <div className="flex min-w-[640px] items-stretch gap-3">
        {models.map((m, idx) => {
          const isCurrentlyActive = m.model === activeRoutedModel;
          const isGrounded = m.model === "grounded-index";
          const borderClass = isCurrentlyActive
            ? isGrounded && geminiConfigured && !forceGrounded
              ? "border-[var(--status-warning)] bg-[var(--status-warning-bg)]/45"
              : "border-[var(--accent)] bg-[var(--accent-soft)]/50"
            : "border-[var(--border-hairline)] bg-[var(--bg-surface)]";

          return (
            <div key={m.model} className="flex flex-1 items-center gap-3">
              <div
                className={`flex h-full flex-1 flex-col justify-between rounded-[var(--radius-md)] border p-3.5 ${borderClass}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="font-mono text-[10px] uppercase tracking-[0.08em] text-[var(--ink-muted)]">
                    {m.role === "override"
                      ? "Override Primary"
                      : m.role === "primary"
                        ? "Primary Route"
                        : m.role === "fallback"
                          ? `Failover #${idx}`
                          : "Local Fallback"}
                  </span>
                  {isCurrentlyActive && (
                    <span className="inline-flex items-center gap-1 rounded-full border border-[var(--status-positive-border)] bg-[var(--status-positive-bg)] px-2 py-0.5 font-mono text-[9.5px] font-semibold uppercase tracking-[0.05em] text-[var(--status-positive)]">
                      <span className="h-1.5 w-1.5 rounded-full bg-[var(--status-positive)]" />
                      Active
                    </span>
                  )}
                </div>

                <div className="mt-2">
                  <p className="text-sm font-semibold tracking-[-0.01em] text-[var(--ink-primary)]">
                    {m.displayLabel}
                  </p>
                  <p className="mt-0.5 truncate font-mono text-[10.5px] text-[var(--ink-muted)]">
                    {m.model}
                  </p>
                </div>

                <div className="mt-3 grid grid-cols-3 gap-2 border-t border-[var(--border-hairline)] pt-2.5 font-mono text-[10.5px] tabular-nums">
                  <div>
                    <span className="block text-[9.5px] text-[var(--ink-muted)]">
                      Served
                    </span>
                    <strong className="text-[var(--ink-primary)]">
                      {formatCompact(m.requestsServed)}
                    </strong>
                  </div>
                  <div>
                    <span className="block text-[9.5px] text-[var(--ink-muted)]">
                      Success
                    </span>
                    <strong
                      className={
                        m.successRate >= 90
                          ? "text-[var(--status-positive)]"
                          : m.successRate >= 60
                            ? "text-[var(--status-warning)]"
                            : "text-[var(--status-danger)]"
                      }
                    >
                      {m.successRate}%
                    </strong>
                  </div>
                  <div>
                    <span className="block text-[9.5px] text-[var(--ink-muted)]">
                      Avg ms
                    </span>
                    <strong className="text-[var(--ink-primary)]">
                      {m.avgLatencyMs > 0 ? `${m.avgLatencyMs}` : "—"}
                    </strong>
                  </div>
                </div>
              </div>

              {idx < models.length - 1 && (
                <div
                  aria-hidden="true"
                  className="flex shrink-0 flex-col items-center font-mono text-[10px] text-[var(--ink-muted)]"
                >
                  <span>failover</span>
                  <span className="text-sm leading-none text-[var(--border-strong)]">
                    →
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
