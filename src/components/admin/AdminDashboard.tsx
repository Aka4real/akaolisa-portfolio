"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowsClockwise,
  ArrowSquareOut,
  ChartBar,
  EnvelopeSimple,
  FilePdf,
  GlobeHemisphereWest,
  Heartbeat,
  Pulse,
  SignOut,
  Sparkle,
  TerminalWindow,
  WarningCircle,
} from "@phosphor-icons/react";
import { PROFILE } from "@/data/profile";
import type {
  AdminDashboardSnapshot,
  TimeRangeKey,
  TrafficFilterKey,
} from "@/lib/telemetry/types";
import {
  AdminLoginView,
  type AdminAuthStatusPayload,
} from "./AdminLoginView";
import { IpForensicDrawer } from "./IpForensicDrawer";
import { OverviewView } from "./views/OverviewView";
import { IpIntelligenceView } from "./views/IpIntelligenceView";
import { ResumeAnalyticsView } from "./views/ResumeAnalyticsView";
import { AiRoutingView } from "./views/AiRoutingView";
import { TrafficAndRumView } from "./views/TrafficAndRumView";
import { LogsAndErrorsView } from "./views/LogsAndErrorsView";
import { HealthAndInfraView } from "./views/HealthAndInfraView";
import { InquiriesAndOpsView } from "./views/InquiriesAndOpsView";
import { formatDateTime } from "./adminFormat";

type AdminTabId =
  | "overview"
  | "ips"
  | "resume"
  | "ai"
  | "traffic"
  | "logs"
  | "health"
  | "ops";

const TIME_RANGES: Array<{ key: TimeRangeKey; label: string }> = [
  { key: "15m", label: "15m" },
  { key: "24h", label: "24h" },
  { key: "7d", label: "7d" },
  { key: "30d", label: "30d" },
  { key: "all", label: "All" },
];

const POLL_OPTIONS = [
  { ms: 3000, label: "Live 3s" },
  { ms: 10000, label: "10s" },
  { ms: 30000, label: "30s" },
  { ms: 0, label: "Paused" },
];

export function AdminDashboard() {
  const [authStatus, setAuthStatus] = useState<AdminAuthStatusPayload | null>(
    null
  );
  const [authLoading, setAuthLoading] = useState(true);

  const [snapshot, setSnapshot] = useState<AdminDashboardSnapshot | null>(null);
  const [fetching, setFetching] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<AdminTabId>("overview");
  const [range, setRange] = useState<TimeRangeKey>("24h");
  const [traffic, setTraffic] = useState<TrafficFilterKey>("all");
  const [excludeOwner, setExcludeOwner] = useState(false);
  const [pollIntervalMs, setPollIntervalMs] = useState<number>(10000);

  const [selectedIp, setSelectedIp] = useState<string | null>(null);
  const [probingHealth, setProbingHealth] = useState(false);
  const [toast, setToast] = useState<{
    text: string;
    tone: "info" | "success" | "error";
  } | null>(null);

  const toastTimerRef = useRef<number | null>(null);

  const showToast = useCallback(
    (text: string, tone: "info" | "success" | "error" = "success") => {
      setToast({ text, tone });
      if (toastTimerRef.current !== null) {
        window.clearTimeout(toastTimerRef.current);
      }
      toastTimerRef.current = window.setTimeout(() => {
        setToast(null);
        toastTimerRef.current = null;
      }, 3600);
    },
    []
  );

  const loadAuthStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/auth", { cache: "no-store" });
      if (res.ok) {
        const data = (await res.json()) as AdminAuthStatusPayload;
        setAuthStatus(data);
      }
    } finally {
      setAuthLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAuthStatus();
  }, [loadAuthStatus]);

  const fetchSnapshot = useCallback(
    async (opts?: { fresh?: boolean; silent?: boolean }) => {
      if (!authStatus?.authenticated) return;
      if (!opts?.silent) setFetching(true);

      try {
        const params = new URLSearchParams({
          range,
          traffic,
          excludeOwner: excludeOwner ? "1" : "0",
        });
        if (opts?.fresh) params.set("fresh", "1");

        const res = await fetch(`/api/admin/overview?${params.toString()}`, {
          cache: "no-store",
        });

        if (res.status === 401 || res.status === 503) {
          await loadAuthStatus();
          return;
        }

        if (!res.ok) {
          throw new Error(`Telemetry API returned HTTP ${res.status}`);
        }

        const data = (await res.json()) as AdminDashboardSnapshot;
        setSnapshot(data);
        setFetchError(null);
      } catch (err) {
        setFetchError(
          err instanceof Error ? err.message : "Unable to sync telemetry"
        );
      } finally {
        if (!opts?.silent) setFetching(false);
      }
    },
    [authStatus?.authenticated, range, traffic, excludeOwner, loadAuthStatus]
  );

  // Initial & filter-driven load
  useEffect(() => {
    if (authStatus?.authenticated) {
      fetchSnapshot({ fresh: true });
    }
  }, [authStatus?.authenticated, fetchSnapshot]);

  // Live auto-refresh loop
  useEffect(() => {
    if (!authStatus?.authenticated || pollIntervalMs <= 0) return;
    const id = window.setInterval(() => {
      if (document.visibilityState === "visible") {
        fetchSnapshot({ silent: true });
      }
    }, pollIntervalMs);
    return () => window.clearInterval(id);
  }, [authStatus?.authenticated, pollIntervalMs, fetchSnapshot]);

  // Keyboard shortcuts (R = refresh, 1-8 = switch workspace)
  useEffect(() => {
    if (!authStatus?.authenticated) return;
    const tabOrder: AdminTabId[] = [
      "overview",
      "ips",
      "resume",
      "ai",
      "traffic",
      "logs",
      "health",
      "ops",
    ];
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.tagName === "SELECT" ||
          target.isContentEditable)
      ) {
        return;
      }
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      if (e.key.toLowerCase() === "r") {
        e.preventDefault();
        fetchSnapshot({ fresh: true });
        showToast("Telemetry synced", "info");
        return;
      }

      const num = Number.parseInt(e.key, 10);
      if (num >= 1 && num <= tabOrder.length) {
        e.preventDefault();
        setActiveTab(tabOrder[num - 1]);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [authStatus?.authenticated, fetchSnapshot, showToast]);

  const runHealthProbe = useCallback(
    async (probeGemini = false) => {
      setProbingHealth(true);
      try {
        const res = await fetch("/api/admin/health", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ probeGemini }),
        });
        if (!res.ok) throw new Error("Health probe failed");
        await fetchSnapshot({ fresh: true });
        showToast(
          probeGemini
            ? "Completed live route + Gemini model chain probe"
            : "Completed live route & asset health probe",
          "success"
        );
      } catch {
        showToast("Health probe encountered a network error", "error");
      } finally {
        setProbingHealth(false);
      }
    },
    [fetchSnapshot, showToast]
  );

  const runAdminAction = useCallback(
    async (payload: Record<string, unknown>, successMsg: string) => {
      try {
        const res = await fetch("/api/admin/actions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          const errBody = (await res.json().catch(() => ({}))) as {
            error?: string;
          };
          throw new Error(errBody.error || "Action failed");
        }
        await fetchSnapshot({ fresh: true });
        showToast(successMsg, "success");
      } catch (err) {
        showToast(
          err instanceof Error ? err.message : "Action failed",
          "error"
        );
      }
    },
    [fetchSnapshot, showToast]
  );

  async function handleSignOut() {
    await fetch("/api/admin/auth", { method: "DELETE" });
    setSnapshot(null);
    await loadAuthStatus();
  }

  if (authLoading || !authStatus) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--bg-canvas)] font-mono text-xs text-[var(--ink-muted)]">
        Initializing OXAKALABS Mission Control...
      </div>
    );
  }

  if (!authStatus.authenticated) {
    return (
      <AdminLoginView
        authStatus={authStatus}
        onAuthenticated={loadAuthStatus}
      />
    );
  }

  const navItems: Array<{
    id: AdminTabId;
    label: string;
    icon: typeof Pulse;
    badge?: string | number;
    badgeTone?: "positive" | "accent" | "warning" | "danger";
  }> = [
    {
      id: "overview",
      label: "Overview & Live",
      icon: Pulse,
      badge: snapshot?.kpis.activeNow ? `${snapshot.kpis.activeNow} live` : undefined,
      badgeTone: "positive",
    },
    {
      id: "ips",
      label: "IP Intelligence",
      icon: GlobeHemisphereWest,
      badge: snapshot?.kpis.uniqueIps ?? 0,
    },
    {
      id: "resume",
      label: "Resume Funnel",
      icon: FilePdf,
      badge: snapshot
        ? `${snapshot.kpis.resumeViews}/${snapshot.kpis.resumeDownloads}`
        : undefined,
      badgeTone: snapshot?.kpis.activeViewingResumeNow ? "positive" : "accent",
    },
    {
      id: "ai",
      label: "AI & Gemini Routing",
      icon: Sparkle,
      badge: snapshot?.aiRouting.isCurrentlyFailedOver
        ? "FAILOVER"
        : snapshot?.aiRouting.activeRoutedMode === "gemini"
          ? "LIVE"
          : "INDEX",
      badgeTone: snapshot?.aiRouting.isCurrentlyFailedOver
        ? "warning"
        : snapshot?.aiRouting.activeRoutedMode === "gemini"
          ? "positive"
          : undefined,
    },
    {
      id: "traffic",
      label: "Pages, Geo & RUM",
      icon: ChartBar,
    },
    {
      id: "logs",
      label: "Logs & Errors",
      icon: TerminalWindow,
      badge: snapshot?.kpis.errorCount ? snapshot.kpis.errorCount : undefined,
      badgeTone: "danger",
    },
    {
      id: "health",
      label: "Health & Infra",
      icon: Heartbeat,
      badge: snapshot ? `${snapshot.kpis.healthScore}%` : undefined,
      badgeTone:
        snapshot?.kpis.healthStatus === "operational"
          ? "positive"
          : snapshot?.kpis.healthStatus === "degraded"
            ? "warning"
            : "danger",
    },
    {
      id: "ops",
      label: "Inquiries & Ops",
      icon: EnvelopeSimple,
      badge: snapshot?.kpis.contactUnreadCount || undefined,
      badgeTone: "accent",
    },
  ];

  const badgeClass = (tone?: "positive" | "accent" | "warning" | "danger") => {
    if (tone === "positive") {
      return "border-[var(--status-positive-border)] bg-[var(--status-positive-bg)] text-[var(--status-positive)]";
    }
    if (tone === "accent") {
      return "border-[var(--accent-border)] bg-[var(--accent-soft)] text-[var(--accent-deep)]";
    }
    if (tone === "warning") {
      return "border-[var(--status-warning-border)] bg-[var(--status-warning-bg)] text-[var(--status-warning)]";
    }
    if (tone === "danger") {
      return "border-[var(--status-danger-border)] bg-[var(--status-danger-bg)] text-[var(--status-danger)]";
    }
    return "border-[var(--border-hairline)] bg-[var(--bg-subtle)] text-[var(--ink-secondary)]";
  };

  return (
    <div className="flex min-h-screen bg-[var(--bg-canvas)] text-[var(--ink-primary)]">
      {/* Desktop Left Telemetry Rail */}
      <aside className="hidden w-64 shrink-0 flex-col border-r border-[var(--border-hairline)] bg-[var(--bg-surface)] lg:flex">
        <div className="flex h-16 items-center justify-between border-b border-[var(--border-hairline)] px-4">
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[8px] bg-[var(--bg-inverse)] font-mono text-xs font-semibold text-[var(--ink-inverse)]">
              {PROFILE.monogram}
            </span>
            <div className="min-w-0">
              <p className="truncate text-xs font-semibold tracking-[0.05em] text-[var(--ink-primary)]">
                OXAKALABS ADMIN
              </p>
              <p className="truncate font-mono text-[10px] text-[var(--ink-muted)]">
                Telemetry Command
              </p>
            </div>
          </div>
        </div>

        <nav
          aria-label="Admin workspaces"
          className="flex-1 space-y-1 overflow-y-auto p-3"
        >
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveTab(item.id)}
                className={`btn-press flex w-full items-center justify-between gap-2 rounded-[var(--radius-sm)] px-3 py-2.5 text-left text-xs font-medium transition-colors ${
                  active
                    ? "bg-[var(--bg-inverse)] text-[var(--ink-inverse)]"
                    : "text-[var(--ink-secondary)] hover:bg-[var(--bg-subtle)] hover:text-[var(--ink-primary)]"
                }`}
              >
                <span className="flex items-center gap-2.5">
                  <Icon size={15} weight={active ? "fill" : "bold"} />
                  <span>{item.label}</span>
                </span>
                {item.badge !== undefined && (
                  <span
                    className={`rounded-full border px-1.5 py-0.5 font-mono text-[9.5px] font-semibold tabular-nums ${
                      active
                        ? "border-white/25 bg-white/15 text-white"
                        : badgeClass(item.badgeTone)
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Live Sidebar Status Footer */}
        <div className="space-y-2.5 border-t border-[var(--border-hairline)] bg-[var(--bg-subtle)]/50 p-3.5 text-xs">
          {snapshot && (
            <div className="rounded-[var(--radius-sm)] border border-[var(--border-hairline)] bg-[var(--bg-surface)] p-2.5">
              <span className="font-mono text-[9.5px] uppercase tracking-[0.06em] text-[var(--ink-muted)]">
                Active AI Route
              </span>
              <p className="mt-0.5 truncate font-mono text-[11px] font-semibold text-[var(--ink-primary)]">
                {snapshot.aiRouting.activeRoutedModel}
              </p>
              <p className="mt-1 truncate font-mono text-[10px] text-[var(--ink-muted)]">
                Store: {snapshot.storage.driver}
              </p>
            </div>
          )}

          <div className="flex items-center justify-between gap-2">
            <Link
              href="/"
              target="_blank"
              rel="noopener noreferrer"
              className="btn-press inline-flex flex-1 items-center justify-center gap-1.5 rounded-[var(--radius-xs)] border border-[var(--border-strong)] bg-[var(--bg-surface)] px-2.5 py-1.5 font-mono text-[11px] text-[var(--ink-primary)] hover:border-[var(--accent)]"
            >
              Portfolio
              <ArrowSquareOut size={12} weight="bold" />
            </Link>
            <button
              type="button"
              onClick={handleSignOut}
              title="Sign out of Admin"
              className="btn-press inline-flex items-center justify-center gap-1 rounded-[var(--radius-xs)] border border-[var(--border-hairline)] bg-[var(--bg-surface)] px-2.5 py-1.5 font-mono text-[11px] text-[var(--ink-secondary)] hover:border-[var(--status-danger-border)] hover:text-[var(--status-danger)]"
            >
              <SignOut size={13} weight="bold" />
              Exit
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Top Global Control Chrome */}
        <header className="chrome-glass sticky top-0 z-30 border-b border-[var(--border-hairline)]">
          <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-display text-base font-semibold tracking-[-0.02em] text-[var(--ink-primary)] sm:text-lg">
                  {navItems.find((n) => n.id === activeTab)?.label}
                </h1>
                {pollIntervalMs > 0 && (
                  <span className="inline-flex items-center gap-1 rounded-full border border-[var(--status-positive-border)] bg-[var(--status-positive-bg)] px-2 py-0.5 font-mono text-[10px] font-medium text-[var(--status-positive)]">
                    <span className="h-1.5 w-1.5 rounded-full bg-[var(--status-positive)]" />
                    LIVE
                  </span>
                )}
              </div>
              {snapshot && (
                <p className="font-mono text-[10.5px] tabular-nums text-[var(--ink-muted)]">
                  Synced {formatDateTime(snapshot.generatedAt)} · Signed in as{" "}
                  {authStatus.username} ({snapshot.viewerIp})
                </p>
              )}
            </div>

            {/* Filter & Sync Controls */}
            <div className="flex flex-wrap items-center gap-2">
              {/* Time Range */}
              <div className="inline-flex rounded-[var(--radius-sm)] border border-[var(--border-hairline)] bg-[var(--bg-surface)] p-0.5">
                {TIME_RANGES.map((r) => (
                  <button
                    key={r.key}
                    type="button"
                    onClick={() => setRange(r.key)}
                    className={`rounded-[7px] px-2.5 py-1 font-mono text-[11px] font-medium transition-colors ${
                      range === r.key
                        ? "bg-[var(--bg-inverse)] text-[var(--ink-inverse)]"
                        : "text-[var(--ink-secondary)] hover:text-[var(--ink-primary)]"
                    }`}
                  >
                    {r.label}
                  </button>
                ))}
              </div>

              {/* Traffic Class */}
              <select
                aria-label="Traffic class filter"
                value={traffic}
                onChange={(e) => setTraffic(e.target.value as TrafficFilterKey)}
                className="rounded-[var(--radius-sm)] border border-[var(--border-strong)] bg-[var(--bg-surface)] px-2.5 py-1.5 font-mono text-[11px] text-[var(--ink-primary)]"
              >
                <option value="all">Traffic: All</option>
                <option value="human">Humans Only</option>
                <option value="bot">Bots / Crawlers</option>
              </select>

              {/* Hide Owner Toggle */}
              <button
                type="button"
                onClick={() => setExcludeOwner((prev) => !prev)}
                className={`btn-press rounded-[var(--radius-sm)] border px-2.5 py-1.5 font-mono text-[11px] ${
                  excludeOwner
                    ? "border-[var(--accent)] bg-[var(--accent-soft)] font-medium text-[var(--accent-deep)]"
                    : "border-[var(--border-hairline)] bg-[var(--bg-surface)] text-[var(--ink-secondary)]"
                }`}
              >
                {excludeOwner ? "Owner Hidden" : "Hide Owner"}
              </button>

              {/* Poll Rate */}
              <select
                aria-label="Auto-refresh interval"
                value={pollIntervalMs}
                onChange={(e) => setPollIntervalMs(Number(e.target.value))}
                className="rounded-[var(--radius-sm)] border border-[var(--border-hairline)] bg-[var(--bg-surface)] px-2.5 py-1.5 font-mono text-[11px] text-[var(--ink-secondary)]"
              >
                {POLL_OPTIONS.map((p) => (
                  <option key={p.ms} value={p.ms}>
                    {p.label}
                  </option>
                ))}
              </select>

              {/* Manual Refresh */}
              <button
                type="button"
                onClick={() => fetchSnapshot({ fresh: true })}
                title="Refresh telemetry (R)"
                className="btn-press inline-flex items-center gap-1.5 rounded-[var(--radius-sm)] border border-[var(--border-strong)] bg-[var(--bg-surface)] px-2.5 py-1.5 font-mono text-[11px] font-medium text-[var(--ink-primary)] hover:border-[var(--accent)] hover:text-[var(--accent-deep)]"
              >
                <ArrowsClockwise
                  size={13}
                  weight="bold"
                  className={fetching ? "animate-spin" : ""}
                />
                Sync
              </button>

              {/* Mobile Sign-out */}
              <button
                type="button"
                onClick={handleSignOut}
                aria-label="Sign out"
                className="btn-press inline-flex h-8 w-8 items-center justify-center rounded-[var(--radius-sm)] border border-[var(--border-hairline)] bg-[var(--bg-surface)] text-[var(--ink-secondary)] lg:hidden"
              >
                <SignOut size={14} weight="bold" />
              </button>
            </div>
          </div>

          {/* Mobile Horizontal Workspace Tabs */}
          <div className="flex gap-1.5 overflow-x-auto border-t border-[var(--border-hairline)] px-4 py-2 lg:hidden">
            {navItems.map((item) => {
              const active = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveTab(item.id)}
                  className={`shrink-0 rounded-[var(--radius-xs)] px-2.5 py-1.5 font-mono text-[11px] font-medium ${
                    active
                      ? "bg-[var(--bg-inverse)] text-[var(--ink-inverse)]"
                      : "border border-[var(--border-hairline)] bg-[var(--bg-surface)] text-[var(--ink-secondary)]"
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </div>
        </header>

        {/* Main Workspace Canvas */}
        <main className="mx-auto w-full max-w-[1440px] flex-1 space-y-5 p-4 sm:p-6">
          {/* Security / Storage Advisories */}
          {authStatus.config.devFallbackActive && (
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-[var(--radius-sm)] border border-[var(--status-warning-border)] bg-[var(--status-warning-bg)] px-4 py-2.5 text-xs text-[var(--status-warning)]">
              <span className="flex items-center gap-2">
                <WarningCircle size={15} weight="bold" />
                Local dev auth fallback active. Set{" "}
                <code className="font-mono font-semibold">ADMIN_PASSWORD</code>{" "}
                &amp;{" "}
                <code className="font-mono font-semibold">
                  ADMIN_SESSION_SECRET
                </code>{" "}
                before production deployment.
              </span>
            </div>
          )}

          {fetchError && (
            <div className="rounded-[var(--radius-sm)] border border-[var(--status-danger-border)] bg-[var(--status-danger-bg)] px-4 py-3 text-xs text-[var(--status-danger)]">
              {fetchError}
            </div>
          )}

          {!snapshot ? (
            <div className="py-16 text-center font-mono text-xs text-[var(--ink-muted)]">
              Loading telemetry snapshot...
            </div>
          ) : (
            <>
              {activeTab === "overview" && (
                <OverviewView
                  data={snapshot}
                  onSelectIp={setSelectedIp}
                  onNavigateTab={(t) => setActiveTab(t as AdminTabId)}
                  onRunHealthProbe={runHealthProbe}
                  probingHealth={probingHealth}
                />
              )}
              {activeTab === "ips" && (
                <IpIntelligenceView
                  data={snapshot}
                  onSelectIp={setSelectedIp}
                  onQuickAction={runAdminAction}
                />
              )}
              {activeTab === "resume" && (
                <ResumeAnalyticsView
                  data={snapshot}
                  onSelectIp={setSelectedIp}
                />
              )}
              {activeTab === "ai" && (
                <AiRoutingView
                  data={snapshot}
                  onSelectIp={setSelectedIp}
                  onRunGeminiProbe={() => runHealthProbe(true)}
                  probingGemini={probingHealth}
                  onSaveOverride={runAdminAction}
                />
              )}
              {activeTab === "traffic" && <TrafficAndRumView data={snapshot} />}
              {activeTab === "logs" && (
                <LogsAndErrorsView
                  data={snapshot}
                  onSelectIp={setSelectedIp}
                />
              )}
              {activeTab === "health" && (
                <HealthAndInfraView
                  data={snapshot}
                  onRunHealthProbe={runHealthProbe}
                  probingHealth={probingHealth}
                />
              )}
              {activeTab === "ops" && (
                <InquiriesAndOpsView
                  data={snapshot}
                  onSelectIp={setSelectedIp}
                  onAction={runAdminAction}
                />
              )}
            </>
          )}
        </main>
      </div>

      {/* Per-IP Forensic Drill-Down Drawer */}
      <IpForensicDrawer
        ip={selectedIp}
        onClose={() => setSelectedIp(null)}
        onUpdated={() => {
          fetchSnapshot({ fresh: true });
          showToast("Updated IP classification & access control", "success");
        }}
      />

      {/* Toast Notification */}
      {toast && (
        <div
          role="status"
          aria-live="polite"
          className={`fixed right-5 bottom-5 z-50 rounded-[var(--radius-sm)] border px-4 py-2.5 font-mono text-xs shadow-[var(--shadow-float)] ${
            toast.tone === "error"
              ? "border-[var(--status-danger-border)] bg-[var(--status-danger-bg)] text-[var(--status-danger)]"
              : toast.tone === "info"
                ? "border-[var(--accent-border)] bg-[var(--bg-surface)] text-[var(--accent-deep)]"
                : "border-[var(--status-positive-border)] bg-[var(--status-positive-bg)] text-[var(--status-positive)]"
          }`}
        >
          {toast.text}
        </div>
      )}
    </div>
  );
}
