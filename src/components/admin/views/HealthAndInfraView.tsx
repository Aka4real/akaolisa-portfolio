"use client";

import {
  ArrowsClockwise,
  CheckCircle,
  Cpu,
  Database,
  FilePdf,
  HardDrives,
  Sparkle,
  WarningCircle,
  XCircle,
} from "@phosphor-icons/react";
import type { AdminDashboardSnapshot } from "@/lib/telemetry/types";
import { HealthScoreGauge } from "../AdminCharts";
import {
  formatBytes,
  formatDateTime,
  formatDurationSec,
  formatNumber,
  formatRelativeTime,
} from "../adminFormat";

interface HealthAndInfraViewProps {
  data: AdminDashboardSnapshot;
  onRunHealthProbe: (probeGemini?: boolean) => Promise<void>;
  probingHealth: boolean;
}

export function HealthAndInfraView({
  data,
  onRunHealthProbe,
  probingHealth,
}: HealthAndInfraViewProps) {
  const { health, storage } = data;

  return (
    <div className="space-y-6">
      {/* Composite Health Banner */}
      <section className="surface-elevated rounded-[var(--radius-md)] border border-[var(--border-hairline)] p-5">
        <div className="flex flex-col items-start justify-between gap-6 md:flex-row md:items-center">
          <div className="flex flex-wrap items-center gap-6">
            <HealthScoreGauge
              score={health.score}
              status={health.overallStatus}
            />
            <div>
              <span
                className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 font-mono text-[10.5px] font-semibold uppercase tracking-[0.06em] ${
                  health.overallStatus === "operational"
                    ? "border-[var(--status-positive-border)] bg-[var(--status-positive-bg)] text-[var(--status-positive)]"
                    : health.overallStatus === "degraded"
                      ? "border-[var(--status-warning-border)] bg-[var(--status-warning-bg)] text-[var(--status-warning)]"
                      : "border-[var(--status-danger-border)] bg-[var(--status-danger-bg)] text-[var(--status-danger)]"
                }`}
              >
                {health.overallStatus === "operational" ? (
                  <CheckCircle size={13} weight="bold" />
                ) : health.overallStatus === "degraded" ? (
                  <WarningCircle size={13} weight="bold" />
                ) : (
                  <XCircle size={13} weight="bold" />
                )}
                System {health.overallStatus}
              </span>

              <h2 className="mt-2 font-display text-xl font-semibold tracking-[-0.02em] text-[var(--ink-primary)]">
                Portfolio Runtime, Endpoint &amp; Asset Health
              </h2>
              <p className="mt-1 font-mono text-xs text-[var(--ink-muted)]">
                {health.runtime.environment} · Node {health.runtime.nodeVersion}{" "}
                ({health.runtime.platform}/{health.runtime.arch}) · Region:{" "}
                {health.runtime.region}
              </p>
              <p className="mt-0.5 font-mono text-[11px] text-[var(--ink-muted)]">
                Last probe snapshot: {formatDateTime(health.checkedAt)} · Uptime:{" "}
                {formatDurationSec(health.runtime.uptimeSeconds)}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              disabled={probingHealth}
              onClick={() => onRunHealthProbe(false)}
              className="btn-press inline-flex items-center gap-1.5 rounded-[var(--radius-sm)] border border-[var(--border-strong)] bg-[var(--bg-surface)] px-3.5 py-2 text-xs font-medium text-[var(--ink-primary)] hover:border-[var(--accent)] hover:text-[var(--accent-deep)] disabled:opacity-50"
            >
              <ArrowsClockwise
                size={14}
                weight="bold"
                className={probingHealth ? "animate-spin" : ""}
              />
              Probe All Routes
            </button>
            <button
              type="button"
              disabled={probingHealth}
              onClick={() => onRunHealthProbe(true)}
              className="btn-press inline-flex items-center gap-1.5 rounded-[var(--radius-sm)] bg-[var(--bg-inverse)] px-3.5 py-2 text-xs font-medium text-[var(--ink-inverse)] hover:bg-[var(--accent)] disabled:opacity-50"
            >
              <Sparkle size={14} weight="bold" />
              Full Probe + Gemini API
            </button>
          </div>
        </div>
      </section>

      {/* Runtime Process Metrics + Storage Engine + Resume Asset Card */}
      <div className="grid gap-5 lg:grid-cols-3">
        {/* Process Memory & Event Loop */}
        <section className="surface-elevated rounded-[var(--radius-md)] border border-[var(--border-hairline)] p-5">
          <div className="flex items-center gap-2 border-b border-[var(--border-hairline)] pb-3">
            <Cpu size={16} weight="bold" className="text-[var(--accent)]" />
            <h3 className="text-sm font-semibold text-[var(--ink-primary)]">
              Node.js Runtime &amp; Memory
            </h3>
          </div>

          <div className="mt-4 space-y-3 text-xs">
            <div>
              <div className="flex justify-between font-mono text-[11px]">
                <span className="text-[var(--ink-muted)]">V8 Heap Usage</span>
                <strong className="tabular-nums text-[var(--ink-primary)]">
                  {health.runtime.memory.heapUsedMb} /{" "}
                  {health.runtime.memory.heapTotalMb} MB (
                  {health.runtime.memory.heapPercent}%)
                </strong>
              </div>
              <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-[var(--bg-subtle)]">
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${health.runtime.memory.heapPercent}%`,
                    backgroundColor:
                      health.runtime.memory.heapPercent > 85
                        ? "var(--status-danger)"
                        : health.runtime.memory.heapPercent > 70
                          ? "var(--status-warning)"
                          : "var(--accent)",
                  }}
                />
              </div>
            </div>

            <dl className="space-y-2 border-t border-[var(--border-hairline)] pt-3 font-mono text-[11px] tabular-nums">
              <div className="flex justify-between">
                <dt className="text-[var(--ink-muted)]">Resident Set (RSS)</dt>
                <dd className="text-[var(--ink-primary)]">
                  {health.runtime.memory.rssMb} MB
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-[var(--ink-muted)]">External Buffers</dt>
                <dd className="text-[var(--ink-primary)]">
                  {health.runtime.memory.externalMb} MB
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-[var(--ink-muted)]">Event Loop Lag</dt>
                <dd
                  className={
                    health.runtime.eventLoopLagMs < 40
                      ? "font-semibold text-[var(--status-positive)]"
                      : "font-semibold text-[var(--status-warning)]"
                  }
                >
                  {health.runtime.eventLoopLagMs} ms
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-[var(--ink-muted)]">Process Uptime</dt>
                <dd className="text-[var(--ink-primary)]">
                  {formatDurationSec(health.runtime.uptimeSeconds)}
                </dd>
              </div>
            </dl>
          </div>
        </section>

        {/* Storage Backend Diagnostics */}
        <section className="surface-elevated rounded-[var(--radius-md)] border border-[var(--border-hairline)] p-5">
          <div className="flex items-center gap-2 border-b border-[var(--border-hairline)] pb-3">
            <Database size={16} weight="bold" className="text-[var(--accent)]" />
            <h3 className="text-sm font-semibold text-[var(--ink-primary)]">
              Telemetry Storage Driver
            </h3>
          </div>

          <div className="mt-4 space-y-2.5 text-xs">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="font-semibold text-[var(--ink-primary)]">
                {storage.label}
              </span>
              <span
                className={`rounded-full border px-2 py-0.5 font-mono text-[9.5px] font-semibold uppercase ${
                  storage.durable
                    ? "border-[var(--status-positive-border)] bg-[var(--status-positive-bg)] text-[var(--status-positive)]"
                    : "border-[var(--status-warning-border)] bg-[var(--status-warning-bg)] text-[var(--status-warning)]"
                }`}
              >
                {storage.distributed
                  ? "Distributed"
                  : storage.durable
                    ? "Durable Disk"
                    : "Ephemeral Warm"}
              </span>
            </div>

            <dl className="space-y-1.5 font-mono text-[11px] tabular-nums">
              <div className="flex justify-between gap-2">
                <dt className="text-[var(--ink-muted)]">Stored Events</dt>
                <dd className="text-[var(--ink-primary)]">
                  {formatNumber(storage.eventCount)}
                </dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-[var(--ink-muted)]">Payload Footprint</dt>
                <dd className="text-[var(--ink-primary)]">
                  {formatBytes(storage.estimatedBytes)}
                </dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-[var(--ink-muted)]">Last Persisted</dt>
                <dd className="text-[var(--ink-primary)]">
                  {formatRelativeTime(storage.lastSavedAt)}
                </dd>
              </div>
            </dl>

            <p className="break-all rounded-[var(--radius-xs)] bg-[var(--bg-subtle)] px-2.5 py-1.5 font-mono text-[10px] text-[var(--ink-muted)]">
              {storage.location}
            </p>
            {storage.lastError && (
              <p className="font-mono text-[10.5px] text-[var(--status-warning)]">
                {storage.lastError}
              </p>
            )}
          </div>
        </section>

        {/* Resume Asset Verification */}
        <section className="surface-elevated rounded-[var(--radius-md)] border border-[var(--border-hairline)] p-5">
          <div className="flex items-center gap-2 border-b border-[var(--border-hairline)] pb-3">
            <FilePdf size={16} weight="bold" className="text-[var(--accent)]" />
            <h3 className="text-sm font-semibold text-[var(--ink-primary)]">
              Resume Asset Integrity
            </h3>
          </div>

          <div className="mt-4 space-y-2.5 text-xs">
            <div className="flex items-center justify-between">
              <span className="font-medium text-[var(--ink-primary)]">
                PDF Verification
              </span>
              <span
                className={`rounded-full border px-2 py-0.5 font-mono text-[10px] font-semibold uppercase ${
                  health.resumeAsset.exists
                    ? "border-[var(--status-positive-border)] bg-[var(--status-positive-bg)] text-[var(--status-positive)]"
                    : "border-[var(--status-danger-border)] bg-[var(--status-danger-bg)] text-[var(--status-danger)]"
                }`}
              >
                {health.resumeAsset.exists ? "VERIFIED OK" : "MISSING"}
              </span>
            </div>

            <dl className="space-y-1.5 font-mono text-[11px] tabular-nums">
              <div className="flex justify-between">
                <dt className="text-[var(--ink-muted)]">File Size</dt>
                <dd className="text-[var(--ink-primary)]">
                  {formatBytes(health.resumeAsset.sizeBytes)}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-[var(--ink-muted)]">SHA-256 Digest</dt>
                <dd className="text-[var(--ink-primary)]">
                  {health.resumeAsset.sha256Short}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-[var(--ink-muted)]">Public Path</dt>
                <dd className="truncate max-w-[170px] text-[var(--ink-primary)]">
                  {health.resumeAsset.path}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-[var(--ink-muted)]">Public Uptime URL</dt>
                <dd className="text-[var(--accent-deep)]">/api/health</dd>
              </div>
            </dl>
          </div>
        </section>
      </div>

      {/* Endpoint Self-Probe Matrix */}
      <section className="surface-elevated rounded-[var(--radius-md)] border border-[var(--border-hairline)] p-5">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <HardDrives size={16} weight="bold" className="text-[var(--accent)]" />
            <div>
              <h3 className="text-sm font-semibold text-[var(--ink-primary)]">
                Live Page, API &amp; SEO Endpoint Probes
              </h3>
              <p className="font-mono text-[11px] text-[var(--ink-muted)]">
                Synthetic internal probes (x-internal-probe: 1) — excluded from visitor counts
              </p>
            </div>
          </div>
        </div>

        {health.probes.length === 0 ? (
          <div className="rounded-[var(--radius-sm)] border border-dashed border-[var(--border-strong)] bg-[var(--bg-subtle)]/50 p-6 text-center">
            <p className="text-xs font-medium text-[var(--ink-secondary)]">
              No live endpoint probe has been triggered in this session yet.
            </p>
            <button
              type="button"
              disabled={probingHealth}
              onClick={() => onRunHealthProbe(true)}
              className="btn-press mt-3 inline-flex items-center gap-1.5 rounded-[var(--radius-sm)] bg-[var(--bg-inverse)] px-3.5 py-2 text-xs font-medium text-[var(--ink-inverse)] hover:bg-[var(--accent)]"
            >
              <ArrowsClockwise size={13} weight="bold" />
              Run First Full Endpoint + Gemini Probe
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[680px] text-left text-xs">
              <thead>
                <tr className="border-b border-[var(--border-hairline)] font-mono text-[10px] uppercase tracking-[0.06em] text-[var(--ink-muted)]">
                  <th className="py-2 pr-3 font-medium">Surface</th>
                  <th className="py-2 pr-3 font-medium">Path</th>
                  <th className="py-2 pr-3 font-medium">Status</th>
                  <th className="py-2 pr-3 font-medium">HTTP</th>
                  <th className="py-2 pr-3 font-medium">Latency</th>
                  <th className="py-2 text-right font-medium">Payload</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-hairline)]">
                {health.probes.map((probe) => (
                  <tr key={probe.id}>
                    <td className="py-2.5 pr-3 font-medium text-[var(--ink-primary)]">
                      {probe.label}
                      <span className="ml-2 rounded bg-[var(--bg-subtle)] px-1.5 py-0.5 font-mono text-[9.5px] uppercase text-[var(--ink-muted)]">
                        {probe.category}
                      </span>
                    </td>
                    <td className="py-2.5 pr-3 font-mono text-[11px] text-[var(--ink-secondary)]">
                      {probe.path}
                    </td>
                    <td className="py-2.5 pr-3">
                      <span
                        className={`rounded-full border px-2 py-0.5 font-mono text-[9.5px] font-semibold uppercase ${
                          probe.status === "healthy"
                            ? "border-[var(--status-positive-border)] bg-[var(--status-positive-bg)] text-[var(--status-positive)]"
                            : probe.status === "degraded"
                              ? "border-[var(--status-warning-border)] bg-[var(--status-warning-bg)] text-[var(--status-warning)]"
                              : "border-[var(--status-danger-border)] bg-[var(--status-danger-bg)] text-[var(--status-danger)]"
                        }`}
                      >
                        {probe.status}
                      </span>
                    </td>
                    <td className="py-2.5 pr-3 font-mono tabular-nums text-[var(--ink-primary)]">
                      {probe.httpStatus || "ERR"}
                    </td>
                    <td className="py-2.5 pr-3 font-mono tabular-nums text-[var(--ink-secondary)]">
                      {probe.latencyMs} ms
                    </td>
                    <td className="py-2.5 text-right font-mono tabular-nums text-[var(--ink-muted)]">
                      {probe.error ? (
                        <span className="text-[var(--status-danger)]">
                          {probe.error}
                        </span>
                      ) : (
                        formatBytes(probe.bytes ?? 0)
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Environment & Integration Readiness Checklist */}
      <section className="surface-elevated rounded-[var(--radius-md)] border border-[var(--border-hairline)] p-5">
        <h3 className="text-sm font-semibold text-[var(--ink-primary)]">
          Integration &amp; Environment Readiness Checklist
        </h3>
        <p className="mt-0.5 mb-4 font-mono text-[11px] text-[var(--ink-muted)]">
          Strictly boolean &amp; masked fingerprint inspection — zero secrets exposed
        </p>

        <div className="grid gap-3 md:grid-cols-2">
          {health.integrations.map((item) => (
            <div
              key={item.id}
              className="rounded-[var(--radius-sm)] border border-[var(--border-hairline)] bg-[var(--bg-subtle)]/40 p-3.5"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-xs font-semibold text-[var(--ink-primary)]">
                    {item.name}
                  </p>
                  <code className="font-mono text-[10px] text-[var(--ink-muted)]">
                    {item.envKey}
                  </code>
                </div>
                <span
                  className={`shrink-0 rounded-full border px-2 py-0.5 font-mono text-[9.5px] font-semibold uppercase ${
                    item.status === "active"
                      ? "border-[var(--status-positive-border)] bg-[var(--status-positive-bg)] text-[var(--status-positive)]"
                      : item.status === "fallback"
                        ? "border-[var(--accent-border)] bg-[var(--accent-soft)] text-[var(--accent-deep)]"
                        : item.status === "warning"
                          ? "border-[var(--status-warning-border)] bg-[var(--status-warning-bg)] text-[var(--status-warning)]"
                          : "border-[var(--status-danger-border)] bg-[var(--status-danger-bg)] text-[var(--status-danger)]"
                  }`}
                >
                  {item.status}
                </span>
              </div>
              <p className="mt-2 text-xs font-medium text-[var(--ink-primary)]">
                {item.summary}
              </p>
              <p className="mt-0.5 text-[11.5px] leading-relaxed text-[var(--ink-secondary)]">
                {item.detail}
              </p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
