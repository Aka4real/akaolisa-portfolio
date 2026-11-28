"use client";

import { useState } from "react";
import {
  CheckCircle,
  DownloadSimple,
  EnvelopeSimple,
  Key,
  ShieldCheck,
  Trash,
  UserCheck,
  WarningCircle,
} from "@phosphor-icons/react";
import type { AdminDashboardSnapshot } from "@/lib/telemetry/types";
import { countryFlag, formatDateTime, formatNumber } from "../adminFormat";

interface InquiriesAndOpsViewProps {
  data: AdminDashboardSnapshot;
  onSelectIp: (ip: string) => void;
  onAction: (payload: Record<string, unknown>, message: string) => Promise<void>;
}

export function InquiriesAndOpsView({
  data,
  onSelectIp,
  onAction,
}: InquiriesAndOpsViewProps) {
  const [inquiryFilter, setInquiryFilter] = useState<
    "all" | "unread" | "spam"
  >("all");
  const [confirmReset, setConfirmReset] = useState(false);

  const visibleInquiries = data.inquiries.filter((inq) => {
    if (inquiryFilter === "unread") {
      return !inq.reviewed && inq.status !== "honeypot_blocked";
    }
    if (inquiryFilter === "spam") {
      return inq.status === "honeypot_blocked";
    }
    return true;
  });

  const exportLinks = [
    {
      label: "Full Telemetry Snapshot (JSON)",
      href: "/api/admin/export?type=full_json",
      desc: "Complete raw store: events, IPs, AI traces, inquiries, annotations, audit logs",
    },
    {
      label: "Grouped IP Directory (CSV)",
      href: `/api/admin/export?type=ips_csv&range=${data.filters.range}&traffic=${data.filters.traffic}`,
      desc: "Every IP with visit counts, pageviews, CV views/downloads, geo, device, tags",
    },
    {
      label: "Resume Views & Downloads (CSV)",
      href: `/api/admin/export?type=resume_csv&range=${data.filters.range}`,
      desc: "Chronological resume preview, dwell duration, new-tab, and download report",
    },
    {
      label: "AI & Gemini Routing Log (CSV)",
      href: `/api/admin/export?type=ai_csv&range=${data.filters.range}`,
      desc: "All assistant queries, routed models, failovers, latency, and token metrics",
    },
    {
      label: "Structured Event Logs (CSV)",
      href: `/api/admin/export?type=events_csv&range=${data.filters.range}&traffic=${data.filters.traffic}`,
      desc: "Filtered telemetry event stream with routes, referrers, and scroll depth",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Contact Inquiries Inbox */}
      <section className="surface-elevated rounded-[var(--radius-md)] border border-[var(--border-hairline)] p-5">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border-hairline)] pb-4">
          <div className="flex items-center gap-2.5">
            <EnvelopeSimple
              size={18}
              weight="bold"
              className="text-[var(--accent)]"
            />
            <div>
              <h2 className="text-sm font-semibold text-[var(--ink-primary)]">
                Contact Form Inquiries Inbox ({data.inquiries.length})
              </h2>
              <p className="font-mono text-[11px] text-[var(--ink-muted)]">
                Captures every submission even when RESEND_API_KEY is unset ·{" "}
                {data.kpis.contactUnreadCount} unreviewed
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {(
              [
                { id: "all", label: "All" },
                { id: "unread", label: `Unread (${data.kpis.contactUnreadCount})` },
                { id: "spam", label: "Honeypot Caught" },
              ] as const
            ).map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setInquiryFilter(f.id)}
                className={`rounded-[var(--radius-xs)] px-2.5 py-1 font-mono text-[11px] ${
                  inquiryFilter === f.id
                    ? "bg-[var(--bg-inverse)] text-[var(--ink-inverse)]"
                    : "border border-[var(--border-hairline)] bg-[var(--bg-surface)] text-[var(--ink-secondary)]"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-4 space-y-3">
          {visibleInquiries.length === 0 ? (
            <p className="py-8 text-center font-mono text-xs text-[var(--ink-muted)]">
              No inquiries in this view yet.
            </p>
          ) : (
            visibleInquiries.map((inq) => (
              <div
                key={inq.id}
                className={`rounded-[var(--radius-sm)] border p-4 text-xs ${
                  inq.reviewed
                    ? "border-[var(--border-hairline)] bg-[var(--bg-subtle)]/40"
                    : "border-[var(--accent-border)] bg-[var(--bg-surface)]"
                }`}
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-semibold text-[var(--ink-primary)]">
                        {inq.name}
                      </span>
                      <a
                        href={`mailto:${inq.email}`}
                        className="font-mono text-[11px] text-[var(--accent-deep)] hover:underline"
                      >
                        {inq.email}
                      </a>
                      <span className="rounded border border-[var(--border-hairline)] bg-[var(--bg-subtle)] px-2 py-0.5 font-mono text-[10px] text-[var(--ink-secondary)]">
                        {inq.track} · {inq.scope}
                      </span>
                      <span
                        className={`rounded border px-2 py-0.5 font-mono text-[10px] font-semibold uppercase ${
                          inq.status === "sent"
                            ? "border-[var(--status-positive-border)] bg-[var(--status-positive-bg)] text-[var(--status-positive)]"
                            : inq.status === "honeypot_blocked"
                              ? "border-[var(--status-danger-border)] bg-[var(--status-danger-bg)] text-[var(--status-danger)]"
                              : "border-[var(--status-warning-border)] bg-[var(--status-warning-bg)] text-[var(--status-warning)]"
                        }`}
                      >
                        {inq.deliveryMode}
                      </span>
                    </div>
                    <p className="mt-1 font-mono text-[10.5px] text-[var(--ink-muted)]">
                      {formatDateTime(inq.timestamp)} ·{" "}
                      <button
                        type="button"
                        onClick={() => onSelectIp(inq.ip)}
                        className="text-[var(--accent-deep)] hover:underline"
                      >
                        {inq.ip}
                      </button>{" "}
                      ({countryFlag(inq.geo.country)} {inq.geo.city},{" "}
                      {inq.geo.country})
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      onAction(
                        {
                          action: "mark_inquiry",
                          inquiryId: inq.id,
                          reviewed: !inq.reviewed,
                        },
                        inq.reviewed
                          ? "Marked inquiry as unread"
                          : "Marked inquiry as reviewed"
                      )
                    }
                    className="btn-press inline-flex items-center gap-1 rounded-[var(--radius-xs)] border border-[var(--border-strong)] bg-[var(--bg-surface)] px-2.5 py-1 font-mono text-[10.5px] text-[var(--ink-primary)] hover:border-[var(--accent)]"
                  >
                    <CheckCircle size={12} weight="bold" />
                    {inq.reviewed ? "Mark Unread" : "Mark Reviewed"}
                  </button>
                </div>

                <p className="mt-2.5 whitespace-pre-wrap rounded-[var(--radius-xs)] border border-[var(--border-hairline)] bg-[var(--bg-subtle)]/50 p-3 text-[12.5px] leading-relaxed text-[var(--ink-primary)]">
                  {inq.message}
                </p>
              </div>
            ))
          )}
        </div>
      </section>

      {/* Data Export Center + Security & Maintenance */}
      <div className="grid gap-5 lg:grid-cols-12">
        {/* Export Center */}
        <section className="surface-elevated rounded-[var(--radius-md)] border border-[var(--border-hairline)] p-5 lg:col-span-6">
          <div className="flex items-center gap-2 border-b border-[var(--border-hairline)] pb-3">
            <DownloadSimple
              size={16}
              weight="bold"
              className="text-[var(--accent)]"
            />
            <div>
              <h3 className="text-sm font-semibold text-[var(--ink-primary)]">
                Data Export Center
              </h3>
              <p className="font-mono text-[10.5px] text-[var(--ink-muted)]">
                Download audit-ready CSV &amp; JSON datasets
              </p>
            </div>
          </div>

          <div className="mt-3.5 space-y-2">
            {exportLinks.map((exp) => (
              <a
                key={exp.label}
                href={exp.href}
                className="btn-press flex items-center justify-between gap-3 rounded-[var(--radius-sm)] border border-[var(--border-hairline)] bg-[var(--bg-surface)] p-3 hover:border-[var(--accent-border)] hover:bg-[var(--accent-soft)]/30"
              >
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-[var(--ink-primary)]">
                    {exp.label}
                  </p>
                  <p className="mt-0.5 text-[11px] text-[var(--ink-muted)]">
                    {exp.desc}
                  </p>
                </div>
                <DownloadSimple
                  size={15}
                  weight="bold"
                  className="shrink-0 text-[var(--accent)]"
                />
              </a>
            ))}
          </div>
        </section>

        {/* Security Controls & Storage Maintenance */}
        <section className="surface-elevated space-y-5 rounded-[var(--radius-md)] border border-[var(--border-hairline)] p-5 lg:col-span-6">
          <div>
            <div className="flex items-center gap-2 border-b border-[var(--border-hairline)] pb-3">
              <ShieldCheck
                size={16}
                weight="bold"
                className="text-[var(--status-positive)]"
              />
              <div>
                <h3 className="text-sm font-semibold text-[var(--ink-primary)]">
                  Security Posture &amp; Session Controls
                </h3>
                <p className="font-mono text-[10.5px] text-[var(--ink-muted)]">
                  {data.authSecurity.blockedIpCount} blocked IPs ·{" "}
                  {data.authSecurity.ownerIpCount} owner IPs ·{" "}
                  {data.authSecurity.watchedIpCount} watched IPs
                </p>
              </div>
            </div>

            <div className="mt-3.5 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() =>
                  onAction(
                    { action: "ignore_my_ip" },
                    `Tagged your current IP (${data.viewerIp}) as Owner`
                  )
                }
                className="btn-press inline-flex items-center gap-1.5 rounded-[var(--radius-sm)] border border-[var(--accent-border)] bg-[var(--accent-soft)] px-3 py-2 text-xs font-medium text-[var(--accent-deep)]"
              >
                <UserCheck size={14} weight="bold" />
                Tag My IP ({data.viewerIp}) as Owner
              </button>

              <button
                type="button"
                onClick={() =>
                  onAction(
                    { action: "revoke_other_sessions" },
                    "Revoked all prior admin sessions"
                  )
                }
                className="btn-press inline-flex items-center gap-1.5 rounded-[var(--radius-sm)] border border-[var(--border-strong)] bg-[var(--bg-surface)] px-3 py-2 text-xs font-medium text-[var(--ink-primary)] hover:border-[var(--status-warning-border)] hover:text-[var(--status-warning)]"
              >
                <Key size={14} weight="bold" />
                Revoke Other Admin Sessions
              </button>
            </div>
          </div>

          <div className="border-t border-[var(--border-hairline)] pt-4">
            <h4 className="font-mono text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--ink-secondary)]">
              Storage Retention &amp; Maintenance
            </h4>
            <p className="mt-1 text-xs text-[var(--ink-muted)]">
              Currently storing {formatNumber(data.storage.eventCount)} events.
              Prune old records or reset telemetry cleanly.
            </p>

            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() =>
                  onAction(
                    { action: "prune_data", olderThanDays: 30 },
                    "Pruned telemetry events older than 30 days"
                  )
                }
                className="btn-press rounded-[var(--radius-xs)] border border-[var(--border-strong)] bg-[var(--bg-surface)] px-3 py-1.5 font-mono text-[11px] text-[var(--ink-primary)]"
              >
                Prune &gt; 30 Days
              </button>
              <button
                type="button"
                onClick={() =>
                  onAction(
                    { action: "prune_data", clearErrorsOnly: true },
                    "Cleared error & 404 telemetry entries"
                  )
                }
                className="btn-press rounded-[var(--radius-xs)] border border-[var(--border-strong)] bg-[var(--bg-surface)] px-3 py-1.5 font-mono text-[11px] text-[var(--ink-primary)]"
              >
                Clear Error Logs
              </button>

              {!confirmReset ? (
                <button
                  type="button"
                  onClick={() => setConfirmReset(true)}
                  className="btn-press inline-flex items-center gap-1 rounded-[var(--radius-xs)] border border-[var(--status-danger-border)] bg-[var(--status-danger-bg)] px-3 py-1.5 font-mono text-[11px] font-medium text-[var(--status-danger)]"
                >
                  <Trash size={13} weight="bold" />
                  Reset All Telemetry
                </button>
              ) : (
                <div className="flex items-center gap-2 rounded-[var(--radius-xs)] border border-[var(--status-danger-border)] bg-[var(--status-danger-bg)] px-2.5 py-1">
                  <WarningCircle
                    size={14}
                    className="text-[var(--status-danger)]"
                  />
                  <span className="font-mono text-[10.5px] font-semibold text-[var(--status-danger)]">
                    Confirm wipe?
                  </span>
                  <button
                    type="button"
                    onClick={async () => {
                      await onAction(
                        { action: "prune_data", resetAll: true },
                        "Telemetry store reset (events, AI logs, inquiries cleared)"
                      );
                      setConfirmReset(false);
                    }}
                    className="rounded bg-[var(--status-danger)] px-2 py-0.5 font-mono text-[10.5px] font-semibold text-white"
                  >
                    Yes, Reset
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmReset(false)}
                    className="font-mono text-[10.5px] text-[var(--ink-secondary)]"
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>
          </div>
        </section>
      </div>

      {/* Admin Security & Auth Audit Log */}
      <section className="surface-elevated rounded-[var(--radius-md)] border border-[var(--border-hairline)] p-5">
        <h3 className="text-sm font-semibold text-[var(--ink-primary)]">
          Admin Security &amp; Configuration Audit Log ({data.auditLogs.length})
        </h3>
        <p className="mt-0.5 mb-3 font-mono text-[11px] text-[var(--ink-muted)]">
          Immutable trail of sign-ins, failed auth attempts, IP blocks, AI overrides, probes, and exports
        </p>

        <div className="max-h-72 overflow-auto">
          <table className="w-full min-w-[680px] text-left text-xs">
            <thead>
              <tr className="border-b border-[var(--border-hairline)] font-mono text-[10px] uppercase tracking-[0.06em] text-[var(--ink-muted)]">
                <th className="py-2 pr-3 font-medium">Timestamp</th>
                <th className="py-2 pr-3 font-medium">Action</th>
                <th className="py-2 pr-3 font-medium">Status</th>
                <th className="py-2 pr-3 font-medium">Actor IP</th>
                <th className="py-2 font-medium">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-hairline)]">
              {data.auditLogs.map((aud) => (
                <tr key={aud.id}>
                  <td className="py-2 pr-3 font-mono text-[11px] tabular-nums text-[var(--ink-muted)]">
                    {formatDateTime(aud.timestamp)}
                  </td>
                  <td className="py-2 pr-3 font-mono text-[11px] font-semibold text-[var(--ink-primary)]">
                    {aud.action}
                  </td>
                  <td className="py-2 pr-3">
                    <span
                      className={`rounded border px-1.5 py-0.5 font-mono text-[9.5px] font-semibold uppercase ${
                        aud.status === "success"
                          ? "border-[var(--status-positive-border)] bg-[var(--status-positive-bg)] text-[var(--status-positive)]"
                          : "border-[var(--status-danger-border)] bg-[var(--status-danger-bg)] text-[var(--status-danger)]"
                      }`}
                    >
                      {aud.status}
                    </span>
                  </td>
                  <td className="py-2 pr-3 font-mono text-[11px] tabular-nums text-[var(--accent-deep)]">
                    {aud.ip}
                  </td>
                  <td className="py-2 text-[var(--ink-secondary)]">
                    {aud.details}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
