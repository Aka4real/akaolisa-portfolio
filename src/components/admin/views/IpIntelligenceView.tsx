"use client";

import { useMemo, useState } from "react";
import {
  DownloadSimple,
  Eye,
  FunnelSimple,
  MagnifyingGlass,
  Prohibit,
  Sparkle,
  UserCheck,
} from "@phosphor-icons/react";
import type { AdminDashboardSnapshot, IpTag } from "@/lib/telemetry/types";
import { VisitFrequencyChart } from "../AdminCharts";
import {
  countryFlag,
  formatDurationMs,
  formatNumber,
  formatRelativeTime,
  getTagStyle,
} from "../adminFormat";

interface IpIntelligenceViewProps {
  data: AdminDashboardSnapshot;
  onSelectIp: (ip: string) => void;
  onQuickAction: (payload: Record<string, unknown>, message: string) => Promise<void>;
}

type SortKey =
  | "visits"
  | "recent"
  | "pageviews"
  | "downloads"
  | "resumeViews"
  | "aiQueries";

export function IpIntelligenceView({
  data,
  onSelectIp,
  onQuickAction,
}: IpIntelligenceViewProps) {
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<SortKey>("visits");
  const [bucketId, setBucketId] = useState<string | null>(null);
  const [tagFilter, setTagFilter] = useState<IpTag | "all">("all");
  const [onlyResume, setOnlyResume] = useState(false);
  const [onlyOnline, setOnlyOnline] = useState(false);

  const selectedBucket = useMemo(
    () => data.visitFrequencyBuckets.find((b) => b.id === bucketId) ?? null,
    [data.visitFrequencyBuckets, bucketId]
  );

  const filteredIps = useMemo(() => {
    const q = search.trim().toLowerCase();
    return data.ipDirectory
      .filter((p) => {
        if (onlyOnline && !p.isOnlineNow) return false;
        if (onlyResume && p.resumeViews === 0 && p.resumeDownloads === 0) {
          return false;
        }
        if (tagFilter !== "all" && p.annotation.tag !== tagFilter) return false;
        if (selectedBucket) {
          if (p.visitCount < selectedBucket.min) return false;
          if (selectedBucket.max !== null && p.visitCount > selectedBucket.max) {
            return false;
          }
        }
        if (q) {
          const hay = [
            p.ip,
            p.geo.city,
            p.geo.country,
            p.geo.countryName,
            p.geo.org ?? "",
            p.device.browser,
            p.device.os,
            p.device.botName ?? "",
            p.topReferrer,
            p.annotation.note,
            p.annotation.tag,
          ]
            .join(" ")
            .toLowerCase();
          if (!hay.includes(q)) return false;
        }
        return true;
      })
      .sort((a, b) => {
        switch (sortBy) {
          case "recent":
            return b.lastSeenAt - a.lastSeenAt;
          case "pageviews":
            return b.pageViews - a.pageViews || b.visitCount - a.visitCount;
          case "downloads":
            return (
              b.resumeDownloads - a.resumeDownloads ||
              b.resumeViews - a.resumeViews
            );
          case "resumeViews":
            return (
              b.resumeViews - a.resumeViews ||
              b.resumeViewDurationMs - a.resumeViewDurationMs
            );
          case "aiQueries":
            return b.aiQueries - a.aiQueries || b.visitCount - a.visitCount;
          case "visits":
          default:
            return (
              b.visitCount - a.visitCount ||
              b.pageViews - a.pageViews ||
              b.lastSeenAt - a.lastSeenAt
            );
        }
      });
  }, [
    data.ipDirectory,
    search,
    sortBy,
    selectedBucket,
    tagFilter,
    onlyResume,
    onlyOnline,
  ]);

  return (
    <div className="space-y-6">
      {/* Visit Frequency Distribution Buckets */}
      <section className="surface-elevated rounded-[var(--radius-md)] border border-[var(--border-hairline)] p-5">
        <div className="mb-3.5 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-sm font-semibold tracking-[-0.01em] text-[var(--ink-primary)]">
              IP Grouping by Visit Frequency
            </h2>
            <p className="font-mono text-[11px] text-[var(--ink-muted)]">
              Click any frequency bucket to filter the IP directory below · Total{" "}
              {formatNumber(data.ipDirectory.length)} unique IPs
            </p>
          </div>
          {bucketId && (
            <button
              type="button"
              onClick={() => setBucketId(null)}
              className="btn-press rounded-[var(--radius-xs)] border border-[var(--border-strong)] bg-[var(--bg-surface)] px-2.5 py-1 font-mono text-[11px] text-[var(--ink-primary)]"
            >
              Clear Bucket Filter
            </button>
          )}
        </div>

        <VisitFrequencyChart
          buckets={data.visitFrequencyBuckets}
          activeBucketId={bucketId}
          onSelectBucket={setBucketId}
        />
      </section>

      {/* Filter Toolbar + IP Directory Table */}
      <section className="surface-elevated rounded-[var(--radius-md)] border border-[var(--border-hairline)] p-5">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border-hairline)] pb-4">
          <div className="relative min-w-[220px] flex-1 max-w-md">
            <MagnifyingGlass
              size={14}
              className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-[var(--ink-muted)]"
            />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search IP, city, country, ISP, browser, note..."
              className="w-full rounded-[var(--radius-sm)] border border-[var(--border-strong)] bg-[var(--bg-surface)] py-1.5 pr-3 pl-8 text-xs text-[var(--ink-primary)] focus:border-[var(--accent)] focus:outline-none"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <label className="inline-flex items-center gap-1.5 font-mono text-[11px] text-[var(--ink-muted)]">
              <FunnelSimple size={13} />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortKey)}
                className="rounded-[var(--radius-xs)] border border-[var(--border-strong)] bg-[var(--bg-surface)] px-2 py-1 text-xs text-[var(--ink-primary)]"
              >
                <option value="visits">Sort: Most Visits</option>
                <option value="recent">Sort: Most Recent</option>
                <option value="pageviews">Sort: Most Pageviews</option>
                <option value="downloads">Sort: Resume Downloads</option>
                <option value="resumeViews">Sort: Resume Views</option>
                <option value="aiQueries">Sort: AI Queries</option>
              </select>
            </label>

            <select
              value={tagFilter}
              onChange={(e) => setTagFilter(e.target.value as IpTag | "all")}
              className="rounded-[var(--radius-xs)] border border-[var(--border-strong)] bg-[var(--bg-surface)] px-2 py-1 font-mono text-xs text-[var(--ink-primary)]"
            >
              <option value="all">All Tags</option>
              <option value="owner">Owner</option>
              <option value="recruiter">Recruiter</option>
              <option value="lead">Lead</option>
              <option value="vip">VIP</option>
              <option value="watched">Watched</option>
              <option value="blocked">Blocked</option>
              <option value="bot">Bot</option>
              <option value="none">Untagged</option>
            </select>

            <button
              type="button"
              onClick={() => setOnlyOnline((prev) => !prev)}
              className={`btn-press rounded-[var(--radius-xs)] border px-2.5 py-1 font-mono text-[11px] ${
                onlyOnline
                  ? "border-[var(--status-positive-border)] bg-[var(--status-positive-bg)] text-[var(--status-positive)]"
                  : "border-[var(--border-hairline)] bg-[var(--bg-surface)] text-[var(--ink-secondary)]"
              }`}
            >
              Online Only
            </button>

            <button
              type="button"
              onClick={() => setOnlyResume((prev) => !prev)}
              className={`btn-press rounded-[var(--radius-xs)] border px-2.5 py-1 font-mono text-[11px] ${
                onlyResume
                  ? "border-[var(--accent-border)] bg-[var(--accent-soft)] text-[var(--accent-deep)]"
                  : "border-[var(--border-hairline)] bg-[var(--bg-surface)] text-[var(--ink-secondary)]"
              }`}
            >
              Resume Activity
            </button>

            <button
              type="button"
              onClick={() =>
                onQuickAction(
                  { action: "ignore_my_ip" },
                  `Tagged your IP (${data.viewerIp}) as Owner`
                )
              }
              className="btn-press inline-flex items-center gap-1 rounded-[var(--radius-xs)] border border-[var(--accent-border)] bg-[var(--accent-soft)] px-2.5 py-1 font-mono text-[11px] font-medium text-[var(--accent-deep)] hover:bg-[var(--accent)] hover:text-white"
            >
              <UserCheck size={13} weight="bold" />
              Tag My IP as Owner
            </button>
          </div>
        </div>

        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[920px] text-left text-xs">
            <thead>
              <tr className="border-b border-[var(--border-hairline)] font-mono text-[10px] uppercase tracking-[0.06em] text-[var(--ink-muted)]">
                <th className="py-2.5 pr-3 font-medium">IP Address &amp; Tag</th>
                <th className="py-2.5 pr-3 font-medium">Visits · Views</th>
                <th className="py-2.5 pr-3 font-medium">Location &amp; Network</th>
                <th className="py-2.5 pr-3 font-medium">Device &amp; Class</th>
                <th className="py-2.5 pr-3 font-medium">Resume &amp; AI</th>
                <th className="py-2.5 pr-3 font-medium">Last Active</th>
                <th className="py-2.5 text-right font-medium">Controls</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-hairline)]">
              {filteredIps.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="py-10 text-center font-mono text-xs text-[var(--ink-muted)]"
                  >
                    No IP addresses match the current filters.
                  </td>
                </tr>
              ) : (
                filteredIps.map((row) => (
                  <tr
                    key={row.ip}
                    onClick={() => onSelectIp(row.ip)}
                    className="cursor-pointer transition-colors hover:bg-[var(--bg-subtle)]/70"
                  >
                    <td className="py-3 pr-3">
                      <div className="flex flex-wrap items-center gap-1.5">
                        {row.isOnlineNow && (
                          <span
                            title="Online right now"
                            className="h-2 w-2 shrink-0 rounded-full bg-[var(--status-positive)]"
                          />
                        )}
                        <span className="font-mono text-xs font-semibold tabular-nums text-[var(--accent-deep)]">
                          {row.ip}
                        </span>
                        {row.ip === data.viewerIp && (
                          <span className="rounded bg-[var(--bg-recessed)] px-1.5 py-0.5 font-mono text-[9.5px] text-[var(--ink-secondary)]">
                            YOU
                          </span>
                        )}
                        {row.annotation.tag !== "none" && (
                          <span
                            className={`rounded border px-1.5 py-0.5 font-mono text-[9.5px] ${getTagStyle(row.annotation.tag).className}`}
                          >
                            {getTagStyle(row.annotation.tag).label}
                          </span>
                        )}
                      </div>
                      {row.annotation.note && (
                        <p className="mt-0.5 max-w-[240px] truncate text-[11px] text-[var(--ink-secondary)]">
                          {row.annotation.note}
                        </p>
                      )}
                      {row.isViewingResumeNow && (
                        <span className="mt-1 inline-flex items-center gap-1 rounded border border-[var(--status-positive-border)] bg-[var(--status-positive-bg)] px-1.5 py-0.5 font-mono text-[9.5px] font-semibold text-[var(--status-positive)]">
                          <Eye size={10} weight="bold" />
                          VIEWING CV NOW
                        </span>
                      )}
                    </td>

                    <td className="py-3 pr-3 font-mono tabular-nums">
                      <span className="inline-flex items-center rounded-[var(--radius-xs)] border border-[var(--accent-border)] bg-[var(--accent-soft)] px-2 py-0.5 text-xs font-semibold text-[var(--accent-deep)]">
                        {row.visitCount}× visit{row.visitCount === 1 ? "" : "s"}
                      </span>
                      <p className="mt-1 text-[10.5px] text-[var(--ink-muted)]">
                        {row.pageViews} views · {formatDurationMs(row.totalActiveMs)}
                      </p>
                    </td>

                    <td className="py-3 pr-3">
                      <p className="font-medium text-[var(--ink-primary)]">
                        {countryFlag(row.geo.country)} {row.geo.city},{" "}
                        {row.geo.countryName}
                      </p>
                      <p className="mt-0.5 max-w-[200px] truncate font-mono text-[10.5px] text-[var(--ink-muted)]">
                        {row.geo.org || row.geo.asn || row.topReferrer}
                      </p>
                    </td>

                    <td className="py-3 pr-3">
                      <p className="text-[var(--ink-primary)]">
                        {row.device.browser}{" "}
                        <span className="text-[var(--ink-muted)]">
                          / {row.device.os}
                        </span>
                      </p>
                      <p className="mt-0.5 font-mono text-[10.5px] uppercase text-[var(--ink-muted)]">
                        {row.device.deviceType} · {row.device.trafficClass}
                      </p>
                    </td>

                    <td className="py-3 pr-3 font-mono text-[11px] tabular-nums">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span
                          className={`inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-[10.5px] ${
                            row.resumeViews > 0
                              ? "border-[var(--accent-border)] bg-[var(--accent-soft)] text-[var(--accent-deep)]"
                              : "border-[var(--border-hairline)] bg-[var(--bg-subtle)] text-[var(--ink-muted)]"
                          }`}
                        >
                          <Eye size={11} /> {row.resumeViews}
                        </span>
                        <span
                          className={`inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-[10.5px] ${
                            row.resumeDownloads > 0
                              ? "border-[var(--status-positive-border)] bg-[var(--status-positive-bg)] font-semibold text-[var(--status-positive)]"
                              : "border-[var(--border-hairline)] bg-[var(--bg-subtle)] text-[var(--ink-muted)]"
                          }`}
                        >
                          <DownloadSimple size={11} weight="bold" />{" "}
                          {row.resumeDownloads}
                        </span>
                        {row.aiQueries > 0 && (
                          <span className="inline-flex items-center gap-1 rounded border border-[var(--status-warning-border)] bg-[var(--status-warning-bg)] px-1.5 py-0.5 text-[10.5px] text-[var(--status-warning)]">
                            <Sparkle size={11} /> {row.aiQueries}
                          </span>
                        )}
                      </div>
                      {row.resumeViewDurationMs > 0 && (
                        <p className="mt-1 text-[10px] text-[var(--ink-muted)]">
                          CV read: {formatDurationMs(row.resumeViewDurationMs)}
                        </p>
                      )}
                    </td>

                    <td className="py-3 pr-3 font-mono text-[11px] tabular-nums">
                      <span className="text-[var(--ink-primary)]">
                        {formatRelativeTime(row.lastSeenAt)}
                      </span>
                      <p className="mt-0.5 truncate max-w-[130px] text-[10px] text-[var(--ink-muted)]">
                        {row.currentPath || row.landingPage}
                      </p>
                    </td>

                    <td
                      className="py-3 text-right"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => onSelectIp(row.ip)}
                          className="btn-press rounded-[var(--radius-xs)] border border-[var(--border-strong)] bg-[var(--bg-surface)] px-2 py-1 font-mono text-[10.5px] font-medium text-[var(--ink-primary)] hover:border-[var(--accent)] hover:text-[var(--accent-deep)]"
                        >
                          Dossier
                        </button>
                        <button
                          type="button"
                          title={
                            row.annotation.blocked ? "Unblock IP" : "Block IP"
                          }
                          onClick={() =>
                            onQuickAction(
                              {
                                action: "annotate_ip",
                                ip: row.ip,
                                blocked: !row.annotation.blocked,
                              },
                              `${row.annotation.blocked ? "Unblocked" : "Blocked"} IP ${row.ip}`
                            )
                          }
                          className={`btn-press inline-flex h-7 w-7 items-center justify-center rounded-[var(--radius-xs)] border ${
                            row.annotation.blocked
                              ? "border-[var(--status-danger-border)] bg-[var(--status-danger-bg)] text-[var(--status-danger)]"
                              : "border-[var(--border-hairline)] bg-[var(--bg-surface)] text-[var(--ink-muted)] hover:border-[var(--status-danger-border)] hover:text-[var(--status-danger)]"
                          }`}
                        >
                          <Prohibit size={13} weight="bold" />
                        </button>
                      </div>
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
