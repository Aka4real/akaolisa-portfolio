"use client";

import { useMemo, useState } from "react";
import {
  Bug,
  DownloadSimple,
  MagnifyingGlass,
  ShieldWarning,
} from "@phosphor-icons/react";
import type {
  AdminDashboardSnapshot,
  TelemetryEvent,
  TelemetrySeverity,
} from "@/lib/telemetry/types";
import {
  countryFlag,
  formatDateTime,
  formatDurationMs,
  formatEventTypeLabel,
  formatRelativeTime,
  getSeverityStyle,
} from "../adminFormat";

interface LogsAndErrorsViewProps {
  data: AdminDashboardSnapshot;
  onSelectIp: (ip: string) => void;
}

type CategoryFilter =
  | "all"
  | "pages"
  | "resume"
  | "ai"
  | "contact"
  | "outbound"
  | "vitals"
  | "errors"
  | "security";

function matchesCategory(ev: TelemetryEvent, cat: CategoryFilter): boolean {
  if (cat === "all") return true;
  if (cat === "pages") return ev.type === "page_view" || ev.type === "page_leave";
  if (cat === "resume") return ev.type.startsWith("resume_");
  if (cat === "ai") return ev.type === "ai_chat" || ev.type === "assistant_open";
  if (cat === "contact") {
    return (
      ev.type === "contact_submit" ||
      ev.type === "email_copy" ||
      ev.type === "whatsapp_click"
    );
  }
  if (cat === "outbound") return ev.type === "outbound_click";
  if (cat === "vitals") return ev.type === "web_vitals";
  if (cat === "errors") {
    return (
      ev.type === "client_error" ||
      ev.type === "not_found" ||
      ev.severity === "error"
    );
  }
  if (cat === "security") return ev.type === "security_event";
  return true;
}

export function LogsAndErrorsView({
  data,
  onSelectIp,
}: LogsAndErrorsViewProps) {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<CategoryFilter>("all");
  const [severity, setSeverity] = useState<TelemetrySeverity | "all">("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const filteredLogs = useMemo(() => {
    const q = search.trim().toLowerCase();
    return data.recentLogs.filter((ev) => {
      if (!matchesCategory(ev, category)) return false;
      if (severity !== "all" && ev.severity !== severity) return false;
      if (q) {
        const hay = [
          ev.ip,
          ev.type,
          ev.path,
          ev.label ?? "",
          ev.source ?? "",
          ev.geo.city,
          ev.geo.countryName,
          ev.device.browser,
          ev.device.os,
          ev.referrerDomain ?? "",
          ev.meta ? JSON.stringify(ev.meta) : "",
        ]
          .join(" ")
          .toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [data.recentLogs, search, category, severity]);

  return (
    <div className="space-y-6">
      {/* Structured Event Log Explorer */}
      <section className="surface-elevated rounded-[var(--radius-md)] border border-[var(--border-hairline)] p-5">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border-hairline)] pb-4">
          <div>
            <h2 className="text-sm font-semibold text-[var(--ink-primary)]">
              Unified Telemetry &amp; Event Log Explorer
            </h2>
            <p className="font-mono text-[11px] text-[var(--ink-muted)]">
              Showing {filteredLogs.length} of {data.recentLogs.length} recent structured events · Click any row to expand JSON metadata
            </p>
          </div>
          <a
            href="/api/admin/export?type=events_csv"
            className="btn-press inline-flex items-center gap-1.5 rounded-[var(--radius-sm)] border border-[var(--border-strong)] bg-[var(--bg-surface)] px-3 py-1.5 font-mono text-[11px] font-medium text-[var(--ink-primary)]"
          >
            <DownloadSimple size={13} weight="bold" />
            Export Events CSV
          </a>
        </div>

        {/* Filter Bar */}
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <div className="relative min-w-[220px] flex-1 max-w-md">
            <MagnifyingGlass
              size={14}
              className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-[var(--ink-muted)]"
            />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Filter logs by IP, path, label, browser, JSON..."
              className="w-full rounded-[var(--radius-sm)] border border-[var(--border-strong)] bg-[var(--bg-surface)] py-1.5 pr-3 pl-8 text-xs text-[var(--ink-primary)] focus:border-[var(--accent)] focus:outline-none"
            />
          </div>

          <select
            value={category}
            onChange={(e) => setCategory(e.target.value as CategoryFilter)}
            className="rounded-[var(--radius-xs)] border border-[var(--border-strong)] bg-[var(--bg-surface)] px-2.5 py-1.5 font-mono text-xs text-[var(--ink-primary)]"
          >
            <option value="all">Category: All</option>
            <option value="pages">Page Views &amp; Exits</option>
            <option value="resume">Resume Events</option>
            <option value="ai">AI Assistant</option>
            <option value="contact">Contact &amp; Copies</option>
            <option value="outbound">Outbound Links</option>
            <option value="vitals">Web Vitals</option>
            <option value="errors">Errors &amp; 404s</option>
            <option value="security">Security Events</option>
          </select>

          <select
            value={severity}
            onChange={(e) =>
              setSeverity(e.target.value as TelemetrySeverity | "all")
            }
            className="rounded-[var(--radius-xs)] border border-[var(--border-strong)] bg-[var(--bg-surface)] px-2.5 py-1.5 font-mono text-xs text-[var(--ink-primary)]"
          >
            <option value="all">Severity: All</option>
            <option value="info">Info</option>
            <option value="success">Success</option>
            <option value="warn">Warning</option>
            <option value="error">Error</option>
          </select>
        </div>

        {/* Log Rows */}
        <div className="mt-4 max-h-[520px] space-y-1.5 overflow-y-auto pr-1">
          {filteredLogs.length === 0 ? (
            <p className="py-10 text-center font-mono text-xs text-[var(--ink-muted)]">
              No telemetry logs match your query.
            </p>
          ) : (
            filteredLogs.map((ev) => {
              const isOpen = expandedId === ev.id;
              return (
                <div
                  key={ev.id}
                  className="rounded-[var(--radius-xs)] border border-[var(--border-hairline)] bg-[var(--bg-surface)]"
                >
                  <button
                    type="button"
                    onClick={() => setExpandedId(isOpen ? null : ev.id)}
                    className="grid w-full grid-cols-12 items-center gap-2 px-3 py-2 text-left text-xs hover:bg-[var(--bg-subtle)]/60"
                  >
                    <span className="col-span-4 font-mono text-[10.5px] tabular-nums text-[var(--ink-muted)] sm:col-span-2">
                      {formatDateTime(ev.timestamp)}
                    </span>
                    <div className="col-span-4 sm:col-span-2">
                      <span
                        className={`inline-block rounded border px-1.5 py-0.5 font-mono text-[9.5px] font-medium ${getSeverityStyle(ev.severity)}`}
                      >
                        {formatEventTypeLabel(ev.type)}
                      </span>
                    </div>
                    <span className="col-span-4 truncate font-mono text-[11px] font-semibold tabular-nums text-[var(--accent-deep)] sm:col-span-2">
                      {ev.ip}
                    </span>
                    <span className="col-span-12 truncate text-[var(--ink-primary)] sm:col-span-4">
                      {ev.label || ev.path}
                    </span>
                    <span className="hidden truncate text-right font-mono text-[10.5px] text-[var(--ink-muted)] sm:col-span-2 sm:block">
                      {ev.path}
                      {ev.latencyMs ? ` · ${ev.latencyMs}ms` : ""}
                      {ev.durationMs
                        ? ` · ${formatDurationMs(ev.durationMs)}`
                        : ""}
                    </span>
                  </button>

                  {isOpen && (
                    <div className="border-t border-[var(--border-hairline)] bg-[var(--bg-subtle)]/60 p-3 text-xs">
                      <div className="mb-2 flex flex-wrap items-center justify-between gap-2 font-mono text-[11px]">
                        <span className="text-[var(--ink-secondary)]">
                          {countryFlag(ev.geo.country)} {ev.geo.city},{" "}
                          {ev.geo.countryName} · {ev.device.browser} on{" "}
                          {ev.device.os} ({ev.device.trafficClass})
                        </span>
                        <button
                          type="button"
                          onClick={() => onSelectIp(ev.ip)}
                          className="font-medium text-[var(--accent-deep)] hover:underline"
                        >
                          Inspect IP Dossier ({ev.ip}) →
                        </button>
                      </div>
                      <pre className="max-h-56 overflow-auto rounded-[var(--radius-xs)] border border-[var(--border-hairline)] bg-[var(--bg-surface)] p-3 font-mono text-[10.5px] leading-relaxed text-[var(--ink-secondary)]">
                        {JSON.stringify(ev, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </section>

      {/* Dedicated Client Runtime Errors & 404 Scanner Probes */}
      <div className="grid gap-5 lg:grid-cols-2">
        <section className="surface-elevated rounded-[var(--radius-md)] border border-[var(--border-hairline)] p-5">
          <div className="mb-3 flex items-center gap-2">
            <Bug size={16} weight="bold" className="text-[var(--status-danger)]" />
            <div>
              <h3 className="text-sm font-semibold text-[var(--ink-primary)]">
                Runtime &amp; Client JS Errors ({data.errors.length})
              </h3>
              <p className="font-mono text-[10.5px] text-[var(--ink-muted)]">
                Captured automatically via window.onerror &amp; unhandledrejection
              </p>
            </div>
          </div>

          {data.errors.length === 0 ? (
            <p className="rounded-[var(--radius-sm)] border border-[var(--status-positive-border)] bg-[var(--status-positive-bg)] px-3.5 py-4 text-center font-mono text-xs text-[var(--status-positive)]">
              Zero runtime errors captured in this window.
            </p>
          ) : (
            <div className="max-h-72 space-y-2 overflow-y-auto">
              {data.errors.map((err) => (
                <div
                  key={err.id}
                  className="rounded-[var(--radius-sm)] border border-[var(--status-danger-border)] bg-[var(--status-danger-bg)]/50 p-3 text-xs"
                >
                  <div className="flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => onSelectIp(err.ip)}
                      className="font-mono text-[11px] font-semibold text-[var(--accent-deep)] hover:underline"
                    >
                      {err.ip}
                    </button>
                    <span className="font-mono text-[10px] text-[var(--ink-muted)]">
                      {formatDateTime(err.timestamp)}
                    </span>
                  </div>
                  <p className="mt-1 font-medium text-[var(--status-danger)]">
                    {err.label}
                  </p>
                  <p className="mt-0.5 font-mono text-[10.5px] text-[var(--ink-muted)]">
                    Route: {err.path} · {err.device.browser}/{err.device.os}
                  </p>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="surface-elevated rounded-[var(--radius-md)] border border-[var(--border-hairline)] p-5">
          <div className="mb-3 flex items-center gap-2">
            <ShieldWarning
              size={16}
              weight="bold"
              className="text-[var(--status-warning)]"
            />
            <div>
              <h3 className="text-sm font-semibold text-[var(--ink-primary)]">
                404 Not Found &amp; Scanner Probes ({data.notFounds.length})
              </h3>
              <p className="font-mono text-[10.5px] text-[var(--ink-muted)]">
                Broken paths &amp; automated vulnerability scans (/.env, /wp-login, etc.)
              </p>
            </div>
          </div>

          {data.notFounds.length === 0 ? (
            <p className="rounded-[var(--radius-sm)] border border-[var(--border-hairline)] bg-[var(--bg-subtle)]/50 px-3.5 py-4 text-center font-mono text-xs text-[var(--ink-muted)]">
              No 404 hits logged in this window.
            </p>
          ) : (
            <div className="max-h-72 divide-y divide-[var(--border-hairline)] overflow-y-auto">
              {data.notFounds.map((nf) => (
                <div
                  key={nf.path}
                  className="flex items-center justify-between gap-3 py-2.5 text-xs"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <code className="truncate font-mono text-xs font-medium text-[var(--ink-primary)]">
                        {nf.path}
                      </code>
                      {nf.suspicious && (
                        <span className="rounded border border-[var(--status-danger-border)] bg-[var(--status-danger-bg)] px-1.5 py-0.5 font-mono text-[9.5px] font-semibold text-[var(--status-danger)]">
                          SCANNER PROBE
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 font-mono text-[10.5px] text-[var(--ink-muted)]">
                      Last IP:{" "}
                      <button
                        type="button"
                        onClick={() => onSelectIp(nf.sampleIp)}
                        className="text-[var(--accent-deep)] hover:underline"
                      >
                        {nf.sampleIp}
                      </button>{" "}
                      · {formatRelativeTime(nf.lastSeenAt)}
                    </p>
                  </div>
                  <div className="shrink-0 text-right font-mono text-[11px] tabular-nums">
                    <strong className="text-[var(--ink-primary)]">
                      {nf.count}×
                    </strong>
                    <span className="ml-1 text-[var(--ink-muted)]">
                      ({nf.uniqueIps} IP)
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
