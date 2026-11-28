"use client";

import {
  ArrowSquareOut,
  Clock,
  DownloadSimple,
  Eye,
  FilePdf,
  Users,
} from "@phosphor-icons/react";
import type { AdminDashboardSnapshot } from "@/lib/telemetry/types";
import { KpiInstrumentCard, ProportionalBarList } from "../AdminCharts";
import {
  countryFlag,
  formatDateTime,
  formatDurationMs,
  formatDurationSec,
  formatEventTypeLabel,
  formatNumber,
  formatRelativeTime,
  getSeverityStyle,
} from "../adminFormat";

interface ResumeAnalyticsViewProps {
  data: AdminDashboardSnapshot;
  onSelectIp: (ip: string) => void;
}

export function ResumeAnalyticsView({
  data,
  onSelectIp,
}: ResumeAnalyticsViewProps) {
  const { kpis, resumeAnalytics, activeVisitors } = data;
  const currentlyViewingResume = activeVisitors.filter((v) => v.isViewingResume);

  return (
    <div className="space-y-6">
      {/* Live "Viewing Resume Right Now" Banner */}
      <section
        className={`rounded-[var(--radius-md)] border p-4 ${
          currentlyViewingResume.length > 0
            ? "border-[var(--status-positive-border)] bg-[var(--status-positive-bg)]"
            : "border-[var(--border-hairline)] bg-[var(--bg-surface)]"
        }`}
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-[var(--radius-sm)] border border-[var(--accent-border)] bg-[var(--bg-surface)] text-[var(--accent)]">
              <FilePdf size={18} weight="bold" />
            </span>
            <div>
              <h2 className="text-sm font-semibold text-[var(--ink-primary)]">
                {currentlyViewingResume.length > 0
                  ? `${currentlyViewingResume.length} Visitor${currentlyViewingResume.length === 1 ? "" : "s"} Actively Viewing Your Resume Right Now`
                  : "Live Resume Viewer Monitor Active"}
              </h2>
              <p className="font-mono text-[11px] text-[var(--ink-secondary)]">
                Tracking in-app PDF previews, dwell time, new-tab opens, button downloads, and direct PDF URL access via /api/resume.
              </p>
            </div>
          </div>

          <a
            href="/api/admin/export?type=resume_csv"
            className="btn-press inline-flex items-center gap-1.5 rounded-[var(--radius-sm)] border border-[var(--border-strong)] bg-[var(--bg-surface)] px-3 py-1.5 font-mono text-[11px] font-medium text-[var(--ink-primary)] hover:border-[var(--accent)] hover:text-[var(--accent-deep)]"
          >
            <DownloadSimple size={13} weight="bold" />
            Export Resume CSV
          </a>
        </div>

        {currentlyViewingResume.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {currentlyViewingResume.map((v) => (
              <button
                key={v.sessionId}
                type="button"
                onClick={() => onSelectIp(v.ip)}
                className="btn-press inline-flex items-center gap-2 rounded-[var(--radius-sm)] border border-[var(--status-positive-border)] bg-[var(--bg-surface)] px-3 py-1.5 font-mono text-xs text-[var(--ink-primary)]"
              >
                <span className="h-2 w-2 rounded-full bg-[var(--status-positive)]" />
                <strong className="text-[var(--accent-deep)]">{v.ip}</strong>
                <span className="text-[var(--ink-muted)]">
                  {countryFlag(v.geo.country)} {v.geo.city}
                </span>
                <span className="font-semibold text-[var(--status-positive)]">
                  {formatDurationSec(v.resumeDwellSeconds ?? 1)} open
                </span>
              </button>
            ))}
          </div>
        )}
      </section>

      {/* KPI Strip */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <KpiInstrumentCard
          label="Total Resume Views"
          value={kpis.resumeViews}
          tone="accent"
          sublabel={`${kpis.resumeModalOpens} modal · ${kpis.resumeNewTabs} new tab · ${kpis.resumeDirectViews} direct`}
          icon={<Eye size={15} weight="bold" />}
        />
        <KpiInstrumentCard
          label="Total Resume Downloads"
          value={kpis.resumeDownloads}
          tone="positive"
          sublabel={`${kpis.resumeUniqueIps} unique IPs engaged with CV`}
          icon={<DownloadSimple size={15} weight="bold" />}
        />
        <KpiInstrumentCard
          label="Visitor → CV Conversion"
          value={`${kpis.resumeConversionPct}%`}
          sublabel="Share of unique IPs viewing or downloading CV"
          icon={<Users size={15} weight="bold" />}
        />
        <KpiInstrumentCard
          label="Average CV Read Dwell"
          value={formatDurationMs(kpis.avgResumeReadMs)}
          sublabel="Measured on in-app ResumeModal sessions"
          icon={<Clock size={15} weight="bold" />}
        />
      </div>

      {/* Conversion Funnel + Source Breakdowns */}
      <div className="grid gap-5 lg:grid-cols-12">
        <section className="surface-elevated rounded-[var(--radius-md)] border border-[var(--border-hairline)] p-5 lg:col-span-5">
          <h3 className="text-sm font-semibold text-[var(--ink-primary)]">
            Resume Engagement Funnel
          </h3>
          <p className="mt-0.5 font-mono text-[11px] text-[var(--ink-muted)]">
            Unique IP progression from visit to PDF download
          </p>

          <div className="mt-5 space-y-4">
            {resumeAnalytics.funnel.map((step, i) => (
              <div key={step.stage}>
                <div className="flex items-baseline justify-between gap-2 text-xs">
                  <span className="font-medium text-[var(--ink-primary)]">
                    {step.stage}
                  </span>
                  <span className="font-mono font-semibold tabular-nums text-[var(--ink-primary)]">
                    {formatNumber(step.count)}{" "}
                    <span className="font-normal text-[var(--ink-muted)]">
                      ({step.pctOfVisitors}%)
                    </span>
                  </span>
                </div>
                <div className="mt-1.5 h-2.5 w-full overflow-hidden rounded-full bg-[var(--bg-subtle)]">
                  <div
                    className="h-full rounded-full transition-all duration-300"
                    style={{
                      width: `${Math.max(step.count > 0 ? 5 : 0, step.pctOfVisitors)}%`,
                      backgroundColor:
                        i === 3
                          ? "var(--status-positive)"
                          : i === 2
                            ? "var(--accent-deep)"
                            : i === 1
                              ? "var(--accent)"
                              : "var(--ink-primary)",
                    }}
                  />
                </div>
                <p className="mt-1 font-mono text-[10.5px] text-[var(--ink-muted)]">
                  {step.detail}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section className="surface-elevated rounded-[var(--radius-md)] border border-[var(--border-hairline)] p-5 lg:col-span-3">
          <h3 className="text-sm font-semibold text-[var(--ink-primary)]">
            Downloads by Source
          </h3>
          <p className="mt-0.5 mb-4 font-mono text-[11px] text-[var(--ink-muted)]">
            Which CTA converted the download
          </p>
          <ProportionalBarList
            items={resumeAnalytics.downloadsBySource}
            accentColor="var(--status-positive)"
            emptyLabel="No downloads recorded yet."
          />
        </section>

        <section className="surface-elevated rounded-[var(--radius-md)] border border-[var(--border-hairline)] p-5 lg:col-span-4">
          <h3 className="text-sm font-semibold text-[var(--ink-primary)]">
            Resume Views by Channel
          </h3>
          <p className="mt-0.5 mb-4 font-mono text-[11px] text-[var(--ink-muted)]">
            In-app modal vs new tab vs direct PDF link
          </p>
          <ProportionalBarList
            items={resumeAnalytics.viewsBySource}
            accentColor="var(--accent)"
            emptyLabel="No resume views recorded yet."
          />
        </section>
      </div>

      {/* Top Resume-Engaged IPs */}
      <section className="surface-elevated rounded-[var(--radius-md)] border border-[var(--border-hairline)] p-5">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-[var(--ink-primary)]">
              IPs That Viewed or Downloaded Your Resume
            </h3>
            <p className="font-mono text-[11px] text-[var(--ink-muted)]">
              Ranked by downloads, views, and live viewing status · Click any row for complete IP timeline
            </p>
          </div>
          <span className="font-mono text-[11px] tabular-nums text-[var(--ink-muted)]">
            {resumeAnalytics.topResumeIps.length} IP
            {resumeAnalytics.topResumeIps.length === 1 ? "" : "s"}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-xs">
            <thead>
              <tr className="border-b border-[var(--border-hairline)] font-mono text-[10px] uppercase tracking-[0.06em] text-[var(--ink-muted)]">
                <th className="py-2 pr-3 font-medium">IP Address</th>
                <th className="py-2 pr-3 font-medium">Location</th>
                <th className="py-2 pr-3 font-medium">Site Visits</th>
                <th className="py-2 pr-3 font-medium">CV Views</th>
                <th className="py-2 pr-3 font-medium">CV Downloads</th>
                <th className="py-2 pr-3 font-medium">Read Dwell</th>
                <th className="py-2 pr-3 font-medium">Referrer</th>
                <th className="py-2 text-right font-medium">Last Activity</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-hairline)]">
              {resumeAnalytics.topResumeIps.length === 0 ? (
                <tr>
                  <td
                    colSpan={8}
                    className="py-8 text-center font-mono text-xs text-[var(--ink-muted)]"
                  >
                    No resume views or downloads logged in this window yet.
                  </td>
                </tr>
              ) : (
                resumeAnalytics.topResumeIps.map((p) => (
                  <tr
                    key={p.ip}
                    onClick={() => onSelectIp(p.ip)}
                    className="cursor-pointer transition-colors hover:bg-[var(--bg-subtle)]/70"
                  >
                    <td className="py-2.5 pr-3 font-mono font-semibold tabular-nums text-[var(--accent-deep)]">
                      <div className="flex items-center gap-1.5">
                        {p.isViewingResumeNow && (
                          <span className="h-2 w-2 rounded-full bg-[var(--status-positive)]" />
                        )}
                        {p.ip}
                      </div>
                    </td>
                    <td className="py-2.5 pr-3 text-[var(--ink-primary)]">
                      {countryFlag(p.geo.country)} {p.geo.city},{" "}
                      {p.geo.countryName}
                    </td>
                    <td className="py-2.5 pr-3 font-mono tabular-nums text-[var(--ink-secondary)]">
                      {p.visitCount}×
                    </td>
                    <td className="py-2.5 pr-3 font-mono tabular-nums text-[var(--ink-primary)]">
                      {p.resumeViews}
                      {p.resumeNewTabs > 0 && (
                        <span className="ml-1 inline-flex items-center gap-0.5 text-[10px] text-[var(--ink-muted)]">
                          (<ArrowSquareOut size={10} /> {p.resumeNewTabs})
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 pr-3 font-mono font-semibold tabular-nums text-[var(--status-positive)]">
                      {p.resumeDownloads}
                    </td>
                    <td className="py-2.5 pr-3 font-mono tabular-nums text-[var(--ink-secondary)]">
                      {formatDurationMs(p.resumeViewDurationMs)}
                    </td>
                    <td className="py-2.5 pr-3 text-[var(--ink-secondary)]">
                      {p.topReferrer}
                    </td>
                    <td className="py-2.5 text-right font-mono text-[11px] tabular-nums text-[var(--ink-muted)]">
                      {formatRelativeTime(p.lastSeenAt)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Chronological Resume Access Log */}
      <section className="surface-elevated rounded-[var(--radius-md)] border border-[var(--border-hairline)] p-5">
        <h3 className="text-sm font-semibold text-[var(--ink-primary)]">
          Chronological Resume Access Audit Log
        </h3>
        <p className="mt-0.5 mb-3 font-mono text-[11px] text-[var(--ink-muted)]">
          Every preview open, dwell duration, new-tab open, direct URL hit, and PDF download
        </p>

        <div className="max-h-[380px] overflow-auto">
          <table className="w-full min-w-[740px] text-left text-xs">
            <thead className="sticky top-0 bg-[var(--bg-surface)]">
              <tr className="border-b border-[var(--border-hairline)] font-mono text-[10px] uppercase tracking-[0.06em] text-[var(--ink-muted)]">
                <th className="py-2 pr-3 font-medium">Timestamp</th>
                <th className="py-2 pr-3 font-medium">Action</th>
                <th className="py-2 pr-3 font-medium">IP Address</th>
                <th className="py-2 pr-3 font-medium">Location</th>
                <th className="py-2 pr-3 font-medium">Source / Dwell</th>
                <th className="py-2 font-medium">Device</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-hairline)]">
              {resumeAnalytics.recentResumeEvents.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="py-8 text-center font-mono text-xs text-[var(--ink-muted)]"
                  >
                    No resume events logged yet.
                  </td>
                </tr>
              ) : (
                resumeAnalytics.recentResumeEvents.map((ev) => (
                  <tr
                    key={ev.id}
                    onClick={() => onSelectIp(ev.ip)}
                    className="cursor-pointer hover:bg-[var(--bg-subtle)]/60"
                  >
                    <td className="py-2 pr-3 font-mono text-[11px] tabular-nums text-[var(--ink-muted)]">
                      {formatDateTime(ev.timestamp)}
                    </td>
                    <td className="py-2 pr-3">
                      <span
                        className={`rounded border px-2 py-0.5 font-mono text-[10px] font-medium ${getSeverityStyle(ev.severity)}`}
                      >
                        {formatEventTypeLabel(ev.type)}
                      </span>
                    </td>
                    <td className="py-2 pr-3 font-mono text-xs font-semibold tabular-nums text-[var(--accent-deep)]">
                      {ev.ip}
                    </td>
                    <td className="py-2 pr-3 text-[var(--ink-secondary)]">
                      {countryFlag(ev.geo.country)} {ev.geo.city},{" "}
                      {ev.geo.country}
                    </td>
                    <td className="py-2 pr-3 font-mono text-[11px] text-[var(--ink-secondary)]">
                      {ev.source || "—"}
                      {ev.durationMs
                        ? ` · ${formatDurationMs(ev.durationMs)}`
                        : ""}
                    </td>
                    <td className="py-2 font-mono text-[10.5px] text-[var(--ink-muted)]">
                      {ev.device.browser} / {ev.device.os}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
