"use client";

import {
  ArrowRight,
  Cpu,
  DownloadSimple,
  Eye,
  FilePdf,
  Heartbeat,
  Pulse,
  Sparkle,
  UsersThree,
  WarningCircle,
} from "@phosphor-icons/react";
import type { AdminDashboardSnapshot } from "@/lib/telemetry/types";
import {
  KpiInstrumentCard,
  TrafficTimelineChart,
} from "../AdminCharts";
import {
  countryFlag,
  formatDurationMs,
  formatDurationSec,
  formatEventTypeLabel,
  formatNumber,
  formatRelativeTime,
  getSeverityStyle,
  getTagStyle,
} from "../adminFormat";

interface OverviewViewProps {
  data: AdminDashboardSnapshot;
  onSelectIp: (ip: string) => void;
  onNavigateTab: (tab: string) => void;
  onRunHealthProbe: (probeGemini?: boolean) => void;
  probingHealth: boolean;
}

export function OverviewView({
  data,
  onSelectIp,
  onNavigateTab,
  onRunHealthProbe,
  probingHealth,
}: OverviewViewProps) {
  const { kpis, activeVisitors, aiRouting, resumeAnalytics, health } = data;

  return (
    <div className="space-y-6">
      {/* Primary KPI Strip */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <KpiInstrumentCard
          label="Active Visitors Now"
          value={kpis.activeNow}
          livePulse={kpis.activeNow > 0}
          tone={kpis.activeNow > 0 ? "positive" : "default"}
          sublabel={`${kpis.activeViewingResumeNow} viewing CV · ${kpis.activeUsingAssistantNow} in AI chat`}
          icon={<Pulse size={15} weight="bold" />}
          onClick={() => onNavigateTab("ips")}
        />
        <KpiInstrumentCard
          label="Total Visits · Unique IPs"
          value={`${formatNumber(kpis.totalVisits)} / ${formatNumber(kpis.uniqueIps)}`}
          sublabel={`${formatNumber(kpis.totalPageViews)} pageviews · ${formatNumber(kpis.returningIps)} returning IPs`}
          icon={<UsersThree size={15} weight="bold" />}
          onClick={() => onNavigateTab("ips")}
        />
        <KpiInstrumentCard
          label="Resume Views · Downloads"
          value={`${formatNumber(kpis.resumeViews)} / ${formatNumber(kpis.resumeDownloads)}`}
          tone={kpis.resumeDownloads > 0 ? "positive" : "accent"}
          sublabel={`${kpis.resumeConversionPct}% IP conversion · Avg read ${formatDurationMs(kpis.avgResumeReadMs)}`}
          icon={<FilePdf size={15} weight="bold" />}
          onClick={() => onNavigateTab("resume")}
        />
        <KpiInstrumentCard
          label="System Health Score"
          value={`${kpis.healthScore} / 100`}
          tone={
            kpis.healthStatus === "operational"
              ? "positive"
              : kpis.healthStatus === "degraded"
                ? "warning"
                : "danger"
          }
          sublabel={`${kpis.healthStatus.toUpperCase()} · ${kpis.errorCount} errors · ${health.runtime.eventLoopLagMs}ms loop lag`}
          icon={<Heartbeat size={15} weight="bold" />}
          onClick={() => onNavigateTab("health")}
        />
      </div>

      {/* Live Active Visitors Radar + Active Gemini Model Card */}
      <div className="grid gap-5 xl:grid-cols-12">
        {/* Live Active Visitors Radar */}
        <section className="surface-elevated rounded-[var(--radius-md)] border border-[var(--border-hairline)] p-5 xl:col-span-8">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--border-hairline)] pb-3.5">
            <div className="flex items-center gap-2.5">
              <span className="relative flex h-2.5 w-2.5">
                {activeVisitors.length > 0 && (
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--status-positive)] opacity-60" />
                )}
                <span
                  className={`relative inline-flex h-2.5 w-2.5 rounded-full ${
                    activeVisitors.length > 0
                      ? "bg-[var(--status-positive)]"
                      : "bg-[var(--border-strong)]"
                  }`}
                />
              </span>
              <div>
                <h2 className="text-sm font-semibold tracking-[-0.01em] text-[var(--ink-primary)]">
                  Live Active Visitors Radar
                </h2>
                <p className="font-mono text-[11px] text-[var(--ink-muted)]">
                  Real-time sessions active within last 50s · Click any IP for full dossier
                </p>
              </div>
            </div>

            <span className="rounded-full border border-[var(--border-hairline)] bg-[var(--bg-subtle)] px-2.5 py-0.5 font-mono text-[11px] tabular-nums text-[var(--ink-secondary)]">
              {activeVisitors.length} online
            </span>
          </div>

          {activeVisitors.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <p className="text-sm font-medium text-[var(--ink-secondary)]">
                No active visitors detected in the last 50 seconds.
              </p>
              <p className="mt-1 max-w-md font-mono text-[11px] text-[var(--ink-muted)]">
                Open any public portfolio page (/, /work, /experience, /contact) in another tab to watch live presence, scroll depth, and resume viewing appear here immediately.
              </p>
            </div>
          ) : (
            <div className="mt-3 overflow-x-auto">
              <table className="w-full min-w-[600px] text-left text-xs">
                <thead>
                  <tr className="border-b border-[var(--border-hairline)] font-mono text-[10px] uppercase tracking-[0.06em] text-[var(--ink-muted)]">
                    <th className="py-2 pr-3 font-medium">IP &amp; Location</th>
                    <th className="py-2 pr-3 font-medium">Live Activity</th>
                    <th className="py-2 pr-3 font-medium">Route &amp; Scroll</th>
                    <th className="py-2 pr-3 font-medium">IP History</th>
                    <th className="py-2 text-right font-medium">Session</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-hairline)]">
                  {activeVisitors.map((v) => (
                    <tr
                      key={v.sessionId}
                      onClick={() => onSelectIp(v.ip)}
                      className="cursor-pointer transition-colors hover:bg-[var(--bg-subtle)]/70"
                    >
                      <td className="py-2.5 pr-3">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono text-xs font-semibold tabular-nums text-[var(--accent-deep)]">
                            {v.ip}
                          </span>
                          {v.tag !== "none" && (
                            <span
                              className={`rounded border px-1.5 py-0.5 font-mono text-[9.5px] ${getTagStyle(v.tag).className}`}
                            >
                              {getTagStyle(v.tag).label}
                            </span>
                          )}
                        </div>
                        <p className="mt-0.5 font-mono text-[10.5px] text-[var(--ink-muted)]">
                          {countryFlag(v.geo.country)} {v.geo.city},{" "}
                          {v.geo.country} · {v.device.browser}/{v.device.os}
                        </p>
                      </td>
                      <td className="py-2.5 pr-3">
                        <div className="flex flex-wrap gap-1">
                          {v.isViewingResume && (
                            <span className="inline-flex items-center gap-1 rounded border border-[var(--status-positive-border)] bg-[var(--status-positive-bg)] px-2 py-0.5 font-mono text-[10px] font-semibold text-[var(--status-positive)]">
                              <Eye size={11} weight="bold" />
                              VIEWING RESUME
                              {v.resumeDwellSeconds
                                ? ` · ${formatDurationSec(v.resumeDwellSeconds)}`
                                : ""}
                            </span>
                          )}
                          {v.isAssistantOpen && (
                            <span className="inline-flex items-center gap-1 rounded border border-[var(--accent-border)] bg-[var(--accent-soft)] px-2 py-0.5 font-mono text-[10px] font-semibold text-[var(--accent-deep)]">
                              <Sparkle size={11} weight="bold" />
                              AI ASSISTANT
                            </span>
                          )}
                          {!v.isViewingResume && !v.isAssistantOpen && (
                            <span className="inline-flex items-center gap-1 rounded border border-[var(--border-hairline)] bg-[var(--bg-subtle)] px-2 py-0.5 font-mono text-[10px] text-[var(--ink-secondary)]">
                              {v.visibilityState === "visible"
                                ? "Browsing Active"
                                : "Background Tab"}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-2.5 pr-3 font-mono text-[11px]">
                        <span className="text-[var(--ink-primary)]">
                          {v.currentPath}
                        </span>
                        <span className="ml-2 text-[var(--ink-muted)]">
                          {v.scrollDepth}%
                        </span>
                      </td>
                      <td className="py-2.5 pr-3 font-mono text-[11px] tabular-nums text-[var(--ink-secondary)]">
                        {v.totalVisitsFromIp}× visits · {v.resumeDownloadsFromIp} dl
                      </td>
                      <td className="py-2.5 text-right font-mono text-[11px] tabular-nums text-[var(--ink-muted)]">
                        {formatDurationSec(v.sessionDurationSeconds)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Active Gemini & AI Model Routing Card */}
        <section className="surface-elevated flex flex-col justify-between rounded-[var(--radius-md)] border border-[var(--border-hairline)] p-5 xl:col-span-4">
          <div>
            <div className="flex items-center justify-between gap-2 border-b border-[var(--border-hairline)] pb-3.5">
              <div className="flex items-center gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-[var(--radius-xs)] border border-[var(--accent-border)] bg-[var(--accent-soft)] text-[var(--accent)]">
                  <Sparkle size={14} weight="bold" />
                </span>
                <div>
                  <h2 className="text-sm font-semibold tracking-[-0.01em] text-[var(--ink-primary)]">
                    Active AI Model Routing
                  </h2>
                  <p className="font-mono text-[10.5px] text-[var(--ink-muted)]">
                    Gemini Failover Telemetry
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => onNavigateTab("ai")}
                className="font-mono text-[11px] font-medium text-[var(--accent-deep)] hover:underline"
              >
                Inspect →
              </button>
            </div>

            <div className="mt-4 rounded-[var(--radius-sm)] border border-[var(--border-hairline)] bg-[var(--bg-subtle)]/70 p-3.5">
              <div className="flex items-center justify-between gap-2">
                <span className="font-mono text-[10px] uppercase tracking-[0.06em] text-[var(--ink-muted)]">
                  Actively Routed Model
                </span>
                <span
                  className={`rounded-full border px-2 py-0.5 font-mono text-[9.5px] font-semibold uppercase ${
                    aiRouting.activeRoutedMode === "gemini"
                      ? aiRouting.isCurrentlyFailedOver
                        ? "border-[var(--status-warning-border)] bg-[var(--status-warning-bg)] text-[var(--status-warning)]"
                        : "border-[var(--status-positive-border)] bg-[var(--status-positive-bg)] text-[var(--status-positive)]"
                      : "border-[var(--border-strong)] bg-[var(--bg-surface)] text-[var(--ink-secondary)]"
                  }`}
                >
                  {aiRouting.activeRoutedMode === "gemini"
                    ? aiRouting.isCurrentlyFailedOver
                      ? "Failover Active"
                      : "Gemini Live"
                    : "Grounded Index"}
                </span>
              </div>
              <p className="mt-1.5 font-display text-lg font-semibold tracking-[-0.02em] text-[var(--ink-primary)]">
                {aiRouting.activeRoutedModelLabel}
              </p>
              <p className="font-mono text-[11px] text-[var(--ink-muted)]">
                ID: {aiRouting.activeRoutedModel}
              </p>
            </div>

            <dl className="mt-3.5 space-y-2 text-xs">
              <div className="flex items-center justify-between gap-2">
                <dt className="text-[var(--ink-muted)]">Configured Primary</dt>
                <dd className="font-mono text-[11px] font-medium text-[var(--ink-primary)]">
                  {aiRouting.effectivePrimaryModel}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-2">
                <dt className="text-[var(--ink-muted)]">Fallback Chain</dt>
                <dd className="truncate font-mono text-[10.5px] text-[var(--ink-secondary)]">
                  {aiRouting.effectiveFallbackModels.join(" → ") || "None"}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-2">
                <dt className="text-[var(--ink-muted)]">API Key Status</dt>
                <dd className="font-mono text-[11px] text-[var(--ink-primary)]">
                  {aiRouting.geminiConfigured
                    ? aiRouting.keyFingerprint
                    : "Not Set (Fallback)"}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-2">
                <dt className="text-[var(--ink-muted)]">Queries · Avg Latency</dt>
                <dd className="font-mono text-[11px] tabular-nums text-[var(--ink-primary)]">
                  {formatNumber(kpis.aiTotalQueries)} ·{" "}
                  {kpis.aiAvgLatencyMs > 0 ? `${kpis.aiAvgLatencyMs}ms` : "—"}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-2">
                <dt className="text-[var(--ink-muted)]">Tokens Consumed</dt>
                <dd className="font-mono text-[11px] tabular-nums text-[var(--ink-primary)]">
                  {formatNumber(kpis.aiTotalTokens)}
                </dd>
              </div>
            </dl>
          </div>

          <button
            type="button"
            disabled={probingHealth}
            onClick={() => onRunHealthProbe(true)}
            className="btn-press mt-4 flex w-full items-center justify-center gap-2 rounded-[var(--radius-sm)] border border-[var(--border-strong)] bg-[var(--bg-surface)] px-3 py-2 text-xs font-medium text-[var(--ink-primary)] hover:border-[var(--accent-border)] hover:text-[var(--accent-deep)] disabled:opacity-50"
          >
            <Cpu size={14} weight="bold" />
            {probingHealth
              ? "Probing Routes & Gemini..."
              : "Run Live Health & Gemini Probe"}
          </button>
        </section>
      </div>

      {/* Traffic & Conversions Timeline */}
      <section className="surface-elevated rounded-[var(--radius-md)] border border-[var(--border-hairline)] p-5">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-sm font-semibold tracking-[-0.01em] text-[var(--ink-primary)]">
              Traffic, Visits, Resume &amp; AI Activity Timeline
            </h2>
            <p className="font-mono text-[11px] text-[var(--ink-muted)]">
              Window: {data.filters.range.toUpperCase()} · Filter:{" "}
              {data.filters.traffic.toUpperCase()}
            </p>
          </div>
          <div className="flex items-center gap-3 font-mono text-[11px] tabular-nums text-[var(--ink-muted)]">
            <span>Bot share: {kpis.botTrafficPct}%</span>
            <span>Inquiries: {kpis.contactInquiriesTotal}</span>
          </div>
        </div>
        <TrafficTimelineChart data={data.timeSeries} />
      </section>

      {/* Bottom Tri-Column: Top Returning IPs + Resume Funnel Snapshot + Recent Signal Stream */}
      <div className="grid gap-5 lg:grid-cols-12">
        {/* Top Grouped IPs by Visit Count */}
        <section className="surface-elevated rounded-[var(--radius-md)] border border-[var(--border-hairline)] p-5 lg:col-span-5">
          <div className="flex items-center justify-between border-b border-[var(--border-hairline)] pb-3">
            <div>
              <h2 className="text-sm font-semibold text-[var(--ink-primary)]">
                Top IPs by Visit Frequency
              </h2>
              <p className="font-mono text-[10.5px] text-[var(--ink-muted)]">
                Grouped by IP address &amp; visit count
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigateTab("ips")}
              className="inline-flex items-center gap-1 font-mono text-[11px] font-medium text-[var(--accent-deep)] hover:underline"
            >
              All {data.ipDirectory.length} IPs <ArrowRight size={12} />
            </button>
          </div>

          <div className="mt-3 divide-y divide-[var(--border-hairline)]">
            {data.ipDirectory.length === 0 ? (
              <p className="py-6 text-center font-mono text-xs text-[var(--ink-muted)]">
                No IP telemetry recorded yet.
              </p>
            ) : (
              data.ipDirectory.slice(0, 7).map((ipRow) => (
                <button
                  key={ipRow.ip}
                  type="button"
                  onClick={() => onSelectIp(ipRow.ip)}
                  className="flex w-full items-center justify-between gap-3 py-2.5 text-left transition-colors hover:bg-[var(--bg-subtle)]/60"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      {ipRow.isOnlineNow && (
                        <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--status-positive)]" />
                      )}
                      <span className="truncate font-mono text-xs font-semibold tabular-nums text-[var(--ink-primary)]">
                        {ipRow.ip}
                      </span>
                      {ipRow.annotation.tag !== "none" && (
                        <span
                          className={`rounded border px-1.5 py-0.5 font-mono text-[9px] ${getTagStyle(ipRow.annotation.tag).className}`}
                        >
                          {getTagStyle(ipRow.annotation.tag).label}
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 truncate font-mono text-[10.5px] text-[var(--ink-muted)]">
                      {countryFlag(ipRow.geo.country)} {ipRow.geo.city},{" "}
                      {ipRow.geo.country} · {formatRelativeTime(ipRow.lastSeenAt)}
                    </p>
                  </div>
                  <div className="shrink-0 text-right font-mono text-[11px] tabular-nums">
                    <span className="font-semibold text-[var(--accent-deep)]">
                      {ipRow.visitCount} visit{ipRow.visitCount === 1 ? "" : "s"}
                    </span>
                    <div className="mt-0.5 flex items-center justify-end gap-2 text-[10px] text-[var(--ink-muted)]">
                      <span>{ipRow.pageViews} pv</span>
                      {ipRow.resumeViews > 0 && (
                        <span className="text-[var(--ink-secondary)]">
                          {ipRow.resumeViews} cv
                        </span>
                      )}
                      {ipRow.resumeDownloads > 0 && (
                        <span className="inline-flex items-center gap-0.5 font-semibold text-[var(--status-positive)]">
                          <DownloadSimple size={10} weight="bold" />
                          {ipRow.resumeDownloads}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </section>

        {/* Resume Engagement Snapshot */}
        <section className="surface-elevated rounded-[var(--radius-md)] border border-[var(--border-hairline)] p-5 lg:col-span-3">
          <div className="flex items-center justify-between border-b border-[var(--border-hairline)] pb-3">
            <div>
              <h2 className="text-sm font-semibold text-[var(--ink-primary)]">
                Resume Funnel
              </h2>
              <p className="font-mono text-[10.5px] text-[var(--ink-muted)]">
                Views vs Downloads
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigateTab("resume")}
              className="font-mono text-[11px] font-medium text-[var(--accent-deep)] hover:underline"
            >
              Details →
            </button>
          </div>

          <div className="mt-4 space-y-3.5">
            {resumeAnalytics.funnel.map((stage, idx) => (
              <div key={stage.stage}>
                <div className="flex items-baseline justify-between gap-2 text-xs">
                  <span className="font-medium text-[var(--ink-primary)]">
                    {idx + 1}. {stage.stage.split(" (")[0]}
                  </span>
                  <span className="font-mono text-[11px] font-semibold tabular-nums text-[var(--ink-primary)]">
                    {formatNumber(stage.count)}{" "}
                    <span className="font-normal text-[var(--ink-muted)]">
                      ({stage.pctOfVisitors}%)
                    </span>
                  </span>
                </div>
                <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-[var(--bg-subtle)]">
                  <div
                    className="h-full rounded-full transition-all duration-300"
                    style={{
                      width: `${Math.max(stage.count > 0 ? 6 : 0, stage.pctOfVisitors)}%`,
                      backgroundColor:
                        idx === 3
                          ? "var(--status-positive)"
                          : idx === 1
                            ? "var(--accent)"
                            : "var(--ink-primary)",
                    }}
                  />
                </div>
                <p className="mt-1 font-mono text-[10px] text-[var(--ink-muted)]">
                  {stage.detail}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Recent High-Signal Event Stream */}
        <section className="surface-elevated rounded-[var(--radius-md)] border border-[var(--border-hairline)] p-5 lg:col-span-4">
          <div className="flex items-center justify-between border-b border-[var(--border-hairline)] pb-3">
            <div>
              <h2 className="text-sm font-semibold text-[var(--ink-primary)]">
                Recent Telemetry Feed
              </h2>
              <p className="font-mono text-[10.5px] text-[var(--ink-muted)]">
                Latest events across site &amp; APIs
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigateTab("logs")}
              className="font-mono text-[11px] font-medium text-[var(--accent-deep)] hover:underline"
            >
              Explorer →
            </button>
          </div>

          <div className="mt-3 max-h-[300px] space-y-2 overflow-y-auto pr-1">
            {data.recentLogs.length === 0 ? (
              <p className="py-6 text-center font-mono text-xs text-[var(--ink-muted)]">
                Awaiting live events...
              </p>
            ) : (
              data.recentLogs.slice(0, 14).map((ev) => (
                <button
                  key={ev.id}
                  type="button"
                  onClick={() => onSelectIp(ev.ip)}
                  className="block w-full rounded-[var(--radius-xs)] border border-[var(--border-hairline)] bg-[var(--bg-subtle)]/40 px-3 py-2 text-left transition-colors hover:border-[var(--border-strong)] hover:bg-[var(--bg-surface)]"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={`rounded border px-1.5 py-0.5 font-mono text-[9.5px] font-medium ${getSeverityStyle(ev.severity)}`}
                    >
                      {formatEventTypeLabel(ev.type)}
                    </span>
                    <span className="font-mono text-[10px] tabular-nums text-[var(--ink-muted)]">
                      {formatRelativeTime(ev.timestamp)}
                    </span>
                  </div>
                  <p className="mt-1 truncate text-[11.5px] text-[var(--ink-primary)]">
                    {ev.label || ev.path}
                  </p>
                  <p className="mt-0.5 flex items-center justify-between font-mono text-[10px] text-[var(--ink-muted)]">
                    <span>
                      {ev.ip} · {ev.geo.city}
                    </span>
                    <span>{ev.path}</span>
                  </p>
                </button>
              ))
            )}
          </div>

          {kpis.errorCount > 0 && (
            <button
              type="button"
              onClick={() => onNavigateTab("logs")}
              className="mt-3 flex w-full items-center justify-between rounded-[var(--radius-xs)] border border-[var(--status-danger-border)] bg-[var(--status-danger-bg)] px-3 py-2 font-mono text-[11px] font-medium text-[var(--status-danger)]"
            >
              <span className="inline-flex items-center gap-1.5">
                <WarningCircle size={14} weight="bold" />
                {kpis.errorCount} runtime error{kpis.errorCount === 1 ? "" : "s"} logged
              </span>
              <span>Inspect →</span>
            </button>
          )}
        </section>
      </div>
    </div>
  );
}
