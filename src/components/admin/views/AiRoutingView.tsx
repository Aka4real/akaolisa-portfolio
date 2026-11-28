"use client";

import { useState } from "react";
import {
  ArrowsClockwise,
  CheckCircle,
  Cpu,
  DownloadSimple,
  Key,
  SlidersHorizontal,
  Sparkle,
  WarningCircle,
} from "@phosphor-icons/react";
import type { GeminiThinkingLevel } from "@/lib/gemini";
import type { AdminDashboardSnapshot } from "@/lib/telemetry/types";
import { AiRoutingPipelineDiagram, KpiInstrumentCard } from "../AdminCharts";
import {
  countryFlag,
  formatDateTime,
  formatNumber,
  formatRelativeTime,
} from "../adminFormat";

interface AiRoutingViewProps {
  data: AdminDashboardSnapshot;
  onSelectIp: (ip: string) => void;
  onRunGeminiProbe: () => Promise<void>;
  probingGemini: boolean;
  onSaveOverride: (payload: Record<string, unknown>, msg: string) => Promise<void>;
}

const PRESET_MODELS = [
  "gemini-3.8-flash",
  "gemini-3-flash-preview",
  "gemini-3.5-flash-lite",
  "gemini-2.5-flash",
  "gemini-2.5-pro",
];

export function AiRoutingView({
  data,
  onSelectIp,
  onRunGeminiProbe,
  probingGemini,
  onSaveOverride,
}: AiRoutingViewProps) {
  const { aiRouting, kpis, health } = data;
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);

  // Runtime Override Form State
  const [primaryInput, setPrimaryInput] = useState(
    aiRouting.override?.primaryModel || aiRouting.effectivePrimaryModel
  );
  const [fallbacksInput, setFallbacksInput] = useState(
    (aiRouting.override?.fallbackModels ?? aiRouting.effectiveFallbackModels).join(
      ", "
    )
  );
  const [thinkingInput, setThinkingInput] = useState<GeminiThinkingLevel>(
    aiRouting.override?.thinkingLevel || aiRouting.effectiveThinkingLevel
  );
  const [maxTokensInput, setMaxTokensInput] = useState(
    aiRouting.override?.maxOutputTokens || aiRouting.effectiveMaxOutputTokens
  );
  const [forceGroundedInput, setForceGroundedInput] = useState(
    Boolean(aiRouting.override?.forceGroundedIndex)
  );
  const [savingOverride, setSavingOverride] = useState(false);

  async function applyOverride() {
    setSavingOverride(true);
    try {
      const fallbacks = fallbacksInput
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);

      await onSaveOverride(
        {
          action: "update_ai_override",
          override: {
            enabled: true,
            primaryModel: primaryInput.trim(),
            fallbackModels: fallbacks,
            thinkingLevel: thinkingInput,
            maxOutputTokens: Number(maxTokensInput) || 4096,
            forceGroundedIndex: forceGroundedInput,
          },
        },
        forceGroundedInput
          ? "Runtime override saved: Forced Grounded Dossier Index"
          : `Runtime routing override saved: Primary -> ${primaryInput.trim()}`
      );
    } finally {
      setSavingOverride(false);
    }
  }

  async function resetOverride() {
    setSavingOverride(true);
    try {
      await onSaveOverride(
        { action: "update_ai_override", override: null },
        "Cleared AI override — restored environment variable defaults"
      );
      setPrimaryInput(aiRouting.envPrimaryModel);
      setFallbacksInput(aiRouting.envFallbackModels.join(", "));
      setForceGroundedInput(false);
    } finally {
      setSavingOverride(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Hero Active Model Status Banner */}
      <section className="surface-elevated rounded-[var(--radius-md)] border border-[var(--border-hairline)] p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--accent-border)] bg-[var(--accent-soft)] px-2.5 py-0.5 font-mono text-[10.5px] font-semibold uppercase tracking-[0.06em] text-[var(--accent-deep)]">
                <Sparkle size={12} weight="bold" />
                Actively Routed AI Model
              </span>
              {aiRouting.isCurrentlyFailedOver && (
                <span className="inline-flex items-center gap-1 rounded-full border border-[var(--status-warning-border)] bg-[var(--status-warning-bg)] px-2.5 py-0.5 font-mono text-[10.5px] font-semibold text-[var(--status-warning)]">
                  <WarningCircle size={12} weight="bold" />
                  Failover Active
                </span>
              )}
              {aiRouting.override?.enabled && (
                <span className="inline-flex items-center gap-1 rounded-full border border-[var(--accent-border)] bg-[var(--bg-inverse)] px-2.5 py-0.5 font-mono text-[10px] font-medium text-[var(--ink-inverse)]">
                  Runtime Override Active
                </span>
              )}
            </div>

            <h2 className="font-display text-2xl font-semibold tracking-[-0.025em] text-[var(--ink-primary)]">
              {aiRouting.activeRoutedModelLabel}
            </h2>
            <p className="font-mono text-xs text-[var(--ink-muted)]">
              Model ID:{" "}
              <strong className="text-[var(--ink-primary)]">
                {aiRouting.activeRoutedModel}
              </strong>{" "}
              · Configured Primary:{" "}
              <strong className="text-[var(--ink-primary)]">
                {aiRouting.effectivePrimaryModel}
              </strong>{" "}
              · Thinking: {aiRouting.effectiveThinkingLevel} · Max Output:{" "}
              {formatNumber(aiRouting.effectiveMaxOutputTokens)} tokens
            </p>
            <p className="flex flex-wrap items-center gap-3 font-mono text-[11px] text-[var(--ink-muted)]">
              <span className="inline-flex items-center gap-1">
                <Key size={12} />
                GEMINI_API_KEY:{" "}
                <strong className="text-[var(--ink-primary)]">
                  {aiRouting.geminiConfigured
                    ? aiRouting.keyFingerprint
                    : "Unset (Using Grounded Index)"}
                </strong>
              </span>
              {aiRouting.lastRoutedAt && (
                <span>
                  Last routed: {formatRelativeTime(aiRouting.lastRoutedAt)}
                </span>
              )}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              disabled={probingGemini}
              onClick={onRunGeminiProbe}
              className="btn-press inline-flex items-center gap-2 rounded-[var(--radius-sm)] bg-[var(--bg-inverse)] px-3.5 py-2 text-xs font-medium text-[var(--ink-inverse)] hover:bg-[var(--accent)] disabled:opacity-50"
            >
              <ArrowsClockwise
                size={14}
                weight="bold"
                className={probingGemini ? "animate-spin" : ""}
              />
              {probingGemini
                ? "Probing Gemini API..."
                : "Probe Live Gemini Model Chain"}
            </button>
            <a
              href="/api/admin/export?type=ai_csv"
              className="btn-press inline-flex items-center gap-1.5 rounded-[var(--radius-sm)] border border-[var(--border-strong)] bg-[var(--bg-surface)] px-3 py-2 font-mono text-[11px] font-medium text-[var(--ink-primary)]"
            >
              <DownloadSimple size={13} weight="bold" />
              Export CSV
            </a>
          </div>
        </div>

        {/* Visual Routing Pipeline Diagram */}
        <div className="mt-5 border-t border-[var(--border-hairline)] pt-5">
          <p className="mb-3 font-mono text-[10.5px] uppercase tracking-[0.06em] text-[var(--ink-muted)]">
            Live Routing &amp; Automatic Failover Topology
          </p>
          <AiRoutingPipelineDiagram
            models={aiRouting.models}
            activeRoutedModel={aiRouting.activeRoutedModel}
            geminiConfigured={aiRouting.geminiConfigured}
            forceGrounded={Boolean(aiRouting.override?.forceGroundedIndex)}
          />
        </div>
      </section>

      {/* AI KPI Strip */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <KpiInstrumentCard
          label="Total AI Queries"
          value={kpis.aiTotalQueries}
          sublabel={`${kpis.aiGeminiPct}% served by live Gemini`}
          icon={<Sparkle size={15} weight="bold" />}
        />
        <KpiInstrumentCard
          label="Failover Events"
          value={kpis.aiFailoverCount}
          tone={kpis.aiFailoverCount > 0 ? "warning" : "positive"}
          sublabel="Queries that fell back from primary model"
          icon={<WarningCircle size={15} weight="bold" />}
        />
        <KpiInstrumentCard
          label="Avg Response Latency"
          value={kpis.aiAvgLatencyMs > 0 ? `${kpis.aiAvgLatencyMs} ms` : "—"}
          sublabel="End-to-end /api/chat generation time"
          icon={<Cpu size={15} weight="bold" />}
        />
        <KpiInstrumentCard
          label="Total Tokens Used"
          value={formatNumber(kpis.aiTotalTokens)}
          sublabel="Prompt + Output + Thinking tokens"
          icon={<CheckCircle size={15} weight="bold" />}
        />
      </div>

      {/* Live Gemini Probe Results (if probed) */}
      {health.geminiProbes && health.geminiProbes.length > 0 && (
        <section className="surface-elevated rounded-[var(--radius-md)] border border-[var(--border-hairline)] p-5">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-[var(--ink-primary)]">
                Live Google Gemini API Reachability Probe
              </h3>
              <p className="font-mono text-[11px] text-[var(--ink-muted)]">
                Last probed{" "}
                {health.geminiProbeAt
                  ? formatDateTime(health.geminiProbeAt)
                  : "recently"}{" "}
                via generativelanguage.googleapis.com/v1beta/models
              </p>
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            {health.geminiProbes.map((probe) => (
              <div
                key={probe.model}
                className="rounded-[var(--radius-sm)] border border-[var(--border-hairline)] bg-[var(--bg-subtle)]/50 p-3.5"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono text-xs font-semibold text-[var(--ink-primary)]">
                    {probe.model}
                  </span>
                  <span
                    className={`rounded-full border px-2 py-0.5 font-mono text-[9.5px] font-semibold uppercase ${
                      probe.status === "reachable"
                        ? "border-[var(--status-positive-border)] bg-[var(--status-positive-bg)] text-[var(--status-positive)]"
                        : probe.status === "degraded" ||
                            probe.status === "unconfigured"
                          ? "border-[var(--status-warning-border)] bg-[var(--status-warning-bg)] text-[var(--status-warning)]"
                          : "border-[var(--status-danger-border)] bg-[var(--status-danger-bg)] text-[var(--status-danger)]"
                    }`}
                  >
                    {probe.status}
                  </span>
                </div>
                <p className="mt-1 font-mono text-[10.5px] text-[var(--ink-muted)]">
                  Role: {probe.role} · Latency: {probe.latencyMs}ms
                  {probe.httpStatus ? ` · HTTP ${probe.httpStatus}` : ""}
                </p>
                {probe.displayName && (
                  <p className="mt-1 text-[11px] text-[var(--ink-secondary)]">
                    {probe.displayName}
                    {probe.inputTokenLimit
                      ? ` (${formatNumber(probe.inputTokenLimit)} in / ${formatNumber(probe.outputTokenLimit ?? 0)} out)`
                      : ""}
                  </p>
                )}
                {probe.error && (
                  <p className="mt-1.5 font-mono text-[10.5px] text-[var(--status-danger)]">
                    {probe.error}
                  </p>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Per-Model Telemetry Matrix + Runtime Override Controls */}
      <div className="grid gap-5 xl:grid-cols-12">
        <section className="surface-elevated rounded-[var(--radius-md)] border border-[var(--border-hairline)] p-5 xl:col-span-7">
          <h3 className="text-sm font-semibold text-[var(--ink-primary)]">
            Per-Model Routing &amp; Token Telemetry Matrix
          </h3>
          <p className="mt-0.5 mb-3 font-mono text-[11px] text-[var(--ink-muted)]">
            Exact success rates, latencies, and token breakdown for each candidate model
          </p>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[600px] text-left text-xs">
              <thead>
                <tr className="border-b border-[var(--border-hairline)] font-mono text-[10px] uppercase tracking-[0.06em] text-[var(--ink-muted)]">
                  <th className="py-2 pr-3 font-medium">Model</th>
                  <th className="py-2 pr-3 font-medium">Served / Share</th>
                  <th className="py-2 pr-3 font-medium">Success</th>
                  <th className="py-2 pr-3 font-medium">Avg / P95 ms</th>
                  <th className="py-2 pr-3 font-medium">Tokens (In/Out/Thk)</th>
                  <th className="py-2 text-right font-medium">Last Used</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-hairline)]">
                {aiRouting.models.map((m) => (
                  <tr key={m.model}>
                    <td className="py-2.5 pr-3">
                      <p className="font-semibold text-[var(--ink-primary)]">
                        {m.displayLabel}
                      </p>
                      <p className="font-mono text-[10px] text-[var(--ink-muted)]">
                        {m.model}
                      </p>
                      {m.lastErrorMessage && (
                        <p className="mt-0.5 max-w-[220px] truncate font-mono text-[10px] text-[var(--status-danger)]">
                          Last err: {m.lastErrorMessage}
                        </p>
                      )}
                    </td>
                    <td className="py-2.5 pr-3 font-mono tabular-nums text-[var(--ink-primary)]">
                      {formatNumber(m.requestsServed)}{" "}
                      <span className="text-[var(--ink-muted)]">
                        ({m.trafficSharePct}%)
                      </span>
                    </td>
                    <td className="py-2.5 pr-3 font-mono tabular-nums">
                      <span
                        className={
                          m.successRate >= 90
                            ? "font-semibold text-[var(--status-positive)]"
                            : m.successRate >= 60
                              ? "font-semibold text-[var(--status-warning)]"
                              : "font-semibold text-[var(--status-danger)]"
                        }
                      >
                        {m.successRate}%
                      </span>
                      <span className="ml-1 text-[10px] text-[var(--ink-muted)]">
                        ({m.failures} err)
                      </span>
                    </td>
                    <td className="py-2.5 pr-3 font-mono tabular-nums text-[var(--ink-secondary)]">
                      {m.avgLatencyMs > 0
                        ? `${m.avgLatencyMs} / ${m.p95LatencyMs}`
                        : "—"}
                    </td>
                    <td className="py-2.5 pr-3 font-mono text-[10.5px] tabular-nums text-[var(--ink-secondary)]">
                      {m.totalTokens > 0
                        ? `${formatNumber(m.promptTokens)} / ${formatNumber(m.outputTokens)} / ${formatNumber(m.thoughtTokens)}`
                        : "—"}
                    </td>
                    <td className="py-2.5 text-right font-mono text-[11px] tabular-nums text-[var(--ink-muted)]">
                      {formatRelativeTime(m.lastServedAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Runtime Routing Override Controls */}
        <section className="surface-elevated rounded-[var(--radius-md)] border border-[var(--border-hairline)] p-5 xl:col-span-5">
          <div className="flex items-center justify-between gap-2 border-b border-[var(--border-hairline)] pb-3">
            <div className="flex items-center gap-2">
              <SlidersHorizontal
                size={15}
                weight="bold"
                className="text-[var(--accent)]"
              />
              <div>
                <h3 className="text-sm font-semibold text-[var(--ink-primary)]">
                  Live Runtime Routing Override
                </h3>
                <p className="font-mono text-[10.5px] text-[var(--ink-muted)]">
                  Hot-swap Gemini primary/fallbacks without redeploying
                </p>
              </div>
            </div>
            {aiRouting.override?.enabled && (
              <button
                type="button"
                disabled={savingOverride}
                onClick={resetOverride}
                className="btn-press rounded-[var(--radius-xs)] border border-[var(--border-strong)] bg-[var(--bg-surface)] px-2.5 py-1 font-mono text-[10.5px] text-[var(--ink-primary)] hover:border-[var(--status-danger-border)] hover:text-[var(--status-danger)]"
              >
                Reset to Env
              </button>
            )}
          </div>

          <div className="mt-4 space-y-3.5 text-xs">
            <div>
              <label className="mb-1 block font-mono text-[10.5px] uppercase text-[var(--ink-muted)]">
                Primary Gemini Model ID
              </label>
              <input
                type="text"
                value={primaryInput}
                onChange={(e) => setPrimaryInput(e.target.value)}
                list="gemini-model-presets"
                className="w-full rounded-[var(--radius-xs)] border border-[var(--border-strong)] bg-[var(--bg-surface)] px-3 py-1.5 font-mono text-xs text-[var(--ink-primary)]"
              />
              <datalist id="gemini-model-presets">
                {PRESET_MODELS.map((m) => (
                  <option key={m} value={m} />
                ))}
              </datalist>
            </div>

            <div>
              <label className="mb-1 block font-mono text-[10.5px] uppercase text-[var(--ink-muted)]">
                Fallback Models (comma-separated)
              </label>
              <input
                type="text"
                value={fallbacksInput}
                onChange={(e) => setFallbacksInput(e.target.value)}
                className="w-full rounded-[var(--radius-xs)] border border-[var(--border-strong)] bg-[var(--bg-surface)] px-3 py-1.5 font-mono text-xs text-[var(--ink-primary)]"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block font-mono text-[10.5px] uppercase text-[var(--ink-muted)]">
                  Thinking Level
                </label>
                <select
                  value={thinkingInput}
                  onChange={(e) =>
                    setThinkingInput(e.target.value as GeminiThinkingLevel)
                  }
                  className="w-full rounded-[var(--radius-xs)] border border-[var(--border-strong)] bg-[var(--bg-surface)] px-2.5 py-1.5 font-mono text-xs text-[var(--ink-primary)]"
                >
                  <option value="LOW">LOW (Fastest)</option>
                  <option value="MEDIUM">MEDIUM</option>
                  <option value="HIGH">HIGH (Deepest)</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block font-mono text-[10.5px] uppercase text-[var(--ink-muted)]">
                  Max Output Tokens
                </label>
                <input
                  type="number"
                  min={512}
                  max={16384}
                  step={256}
                  value={maxTokensInput}
                  onChange={(e) => setMaxTokensInput(Number(e.target.value))}
                  className="w-full rounded-[var(--radius-xs)] border border-[var(--border-strong)] bg-[var(--bg-surface)] px-2.5 py-1.5 font-mono text-xs tabular-nums text-[var(--ink-primary)]"
                />
              </div>
            </div>

            <label className="flex cursor-pointer items-center justify-between rounded-[var(--radius-xs)] border border-[var(--border-hairline)] bg-[var(--bg-subtle)]/70 px-3 py-2.5">
              <div>
                <span className="block font-medium text-[var(--ink-primary)]">
                  Force Grounded Dossier Index
                </span>
                <span className="font-mono text-[10px] text-[var(--ink-muted)]">
                  Bypass Gemini API completely (zero upstream cost/quota)
                </span>
              </div>
              <input
                type="checkbox"
                checked={forceGroundedInput}
                onChange={(e) => setForceGroundedInput(e.target.checked)}
                className="h-4 w-4 accent-[var(--accent)]"
              />
            </label>

            <button
              type="button"
              disabled={savingOverride}
              onClick={applyOverride}
              className="btn-press w-full rounded-[var(--radius-sm)] bg-[var(--bg-inverse)] px-4 py-2 text-xs font-medium text-[var(--ink-inverse)] hover:bg-[var(--accent)] disabled:opacity-50"
            >
              {savingOverride
                ? "Applying Routing Policy..."
                : "Apply Live Routing Override"}
            </button>
          </div>
        </section>
      </div>

      {/* AI Conversation & Failover Trace Explorer */}
      <section className="surface-elevated rounded-[var(--radius-md)] border border-[var(--border-hairline)] p-5">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-[var(--ink-primary)]">
              AI Assistant Query &amp; Failover Trace Log
            </h3>
            <p className="font-mono text-[11px] text-[var(--ink-muted)]">
              Click any entry to inspect step-by-step model attempt trace and response preview
            </p>
          </div>
          <span className="font-mono text-[11px] tabular-nums text-[var(--ink-muted)]">
            {aiRouting.recentLogs.length} queries
          </span>
        </div>

        <div className="space-y-2">
          {aiRouting.recentLogs.length === 0 ? (
            <p className="py-8 text-center font-mono text-xs text-[var(--ink-muted)]">
              No AI assistant queries logged yet. Try asking a question in the portfolio&apos;s Ask AI drawer!
            </p>
          ) : (
            aiRouting.recentLogs.map((log) => {
              const expanded = expandedLogId === log.id;
              return (
                <div
                  key={log.id}
                  className="rounded-[var(--radius-sm)] border border-[var(--border-hairline)] bg-[var(--bg-surface)]"
                >
                  <button
                    type="button"
                    onClick={() =>
                      setExpandedLogId(expanded ? null : log.id)
                    }
                    className="flex w-full flex-wrap items-center justify-between gap-2 px-4 py-3 text-left text-xs hover:bg-[var(--bg-subtle)]/50"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`rounded border px-2 py-0.5 font-mono text-[10px] font-semibold ${
                            log.mode === "gemini"
                              ? log.wasFailover
                                ? "border-[var(--status-warning-border)] bg-[var(--status-warning-bg)] text-[var(--status-warning)]"
                                : "border-[var(--status-positive-border)] bg-[var(--status-positive-bg)] text-[var(--status-positive)]"
                              : "border-[var(--border-strong)] bg-[var(--bg-subtle)] text-[var(--ink-secondary)]"
                          }`}
                        >
                          {log.resolvedModel}
                          {log.wasFailover ? " (FAILOVER)" : ""}
                        </span>
                        <span className="truncate font-medium text-[var(--ink-primary)]">
                          {log.query}
                        </span>
                      </div>
                      <p className="mt-1 font-mono text-[10.5px] text-[var(--ink-muted)]">
                        {log.ip} ({countryFlag(log.geo.country)} {log.geo.city}) ·{" "}
                        {formatDateTime(log.timestamp)}
                      </p>
                    </div>

                    <div className="shrink-0 text-right font-mono text-[11px] tabular-nums text-[var(--ink-secondary)]">
                      <span>{log.latencyMs}ms</span>
                      {log.usage?.totalTokenCount ? (
                        <span className="ml-2 text-[var(--ink-muted)]">
                          {formatNumber(log.usage.totalTokenCount)} tok
                        </span>
                      ) : null}
                    </div>
                  </button>

                  {expanded && (
                    <div className="space-y-3 border-t border-[var(--border-hairline)] bg-[var(--bg-subtle)]/40 px-4 py-3 text-xs">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <button
                          type="button"
                          onClick={() => onSelectIp(log.ip)}
                          className="font-mono text-[11px] font-medium text-[var(--accent-deep)] hover:underline"
                        >
                          Open IP Dossier ({log.ip}) →
                        </button>
                        {log.finishReason && (
                          <span className="font-mono text-[10.5px] text-[var(--ink-muted)]">
                            finishReason: {log.finishReason}
                          </span>
                        )}
                      </div>

                      {log.attempts.length > 0 && (
                        <div>
                          <p className="mb-1.5 font-mono text-[10px] uppercase text-[var(--ink-muted)]">
                            Upstream Model Attempt Chain
                          </p>
                          <div className="flex flex-wrap items-center gap-2">
                            {log.attempts.map((att, idx) => (
                              <div
                                key={`${att.model}-${idx}`}
                                className="flex items-center gap-2"
                              >
                                <span
                                  className={`rounded border px-2 py-1 font-mono text-[10.5px] ${
                                    att.status === "success"
                                      ? "border-[var(--status-positive-border)] bg-[var(--status-positive-bg)] text-[var(--status-positive)]"
                                      : "border-[var(--status-danger-border)] bg-[var(--status-danger-bg)] text-[var(--status-danger)]"
                                  }`}
                                >
                                  {att.model} ·{" "}
                                  {att.status === "success"
                                    ? `✓ ${att.latencyMs}ms`
                                    : `✗ ${att.httpStatus ?? att.status} (${att.latencyMs}ms)`}
                                </span>
                                {idx < log.attempts.length - 1 && (
                                  <span className="font-mono text-[var(--ink-muted)]">
                                    →
                                  </span>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {log.errorSummary && (
                        <p className="font-mono text-[11px] text-[var(--status-warning)]">
                          Note: {log.errorSummary}
                        </p>
                      )}

                      <div>
                        <p className="font-mono text-[10px] uppercase text-[var(--ink-muted)]">
                          Answer Preview
                        </p>
                        <p className="mt-1 whitespace-pre-wrap text-[12px] leading-relaxed text-[var(--ink-secondary)]">
                          {log.answerPreview}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </section>
    </div>
  );
}
