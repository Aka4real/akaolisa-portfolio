"use client";

import { useEffect, useState } from "react";
import {
  Check,
  Copy,
  FilePdf,
  GlobeHemisphereWest,
  Prohibit,
  Robot,
  ShieldCheck,
  Sparkle,
  X,
} from "@phosphor-icons/react";
import type { IpForensicDossier, IpTag } from "@/lib/telemetry/types";
import {
  countryFlag,
  formatDateTime,
  formatDurationMs,
  formatEventTypeLabel,
  formatRelativeTime,
  getSeverityStyle,
  getTagStyle,
} from "./adminFormat";

interface IpForensicDrawerProps {
  ip: string | null;
  onClose: () => void;
  onUpdated: () => void;
}

const TAG_OPTIONS: IpTag[] = [
  "none",
  "owner",
  "recruiter",
  "lead",
  "vip",
  "watched",
  "blocked",
  "bot",
];

export function IpForensicDrawer({
  ip,
  onClose,
  onUpdated,
}: IpForensicDrawerProps) {
  const [dossier, setDossier] = useState<IpForensicDossier | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tag, setTag] = useState<IpTag>("none");
  const [note, setNote] = useState("");
  const [blocked, setBlocked] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedNotice, setSavedNotice] = useState(false);
  const [copiedIp, setCopiedIp] = useState(false);
  const [activeTab, setActiveTab] = useState<"timeline" | "sessions" | "ai">(
    "timeline"
  );

  useEffect(() => {
    if (!ip) {
      setDossier(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);
    setActiveTab("timeline");

    fetch(`/api/admin/overview?ip=${encodeURIComponent(ip)}`, {
      cache: "no-store",
    })
      .then(async (res) => {
        if (!res.ok) throw new Error("Unable to load IP forensic dossier.");
        return (await res.json()) as IpForensicDossier;
      })
      .then((data) => {
        if (cancelled) return;
        setDossier(data);
        setTag(data.profile.annotation.tag);
        setNote(data.profile.annotation.note);
        setBlocked(data.profile.annotation.blocked);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Failed to load dossier");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [ip]);

  useEffect(() => {
    if (!ip) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [ip, onClose]);

  if (!ip) return null;

  async function handleSaveAnnotation(overrideBlocked?: boolean) {
    if (!ip) return;
    setSaving(true);
    setSavedNotice(false);
    const nextBlocked =
      typeof overrideBlocked === "boolean" ? overrideBlocked : blocked;
    const nextTag: IpTag =
      nextBlocked && tag === "none"
        ? "blocked"
        : !nextBlocked && tag === "blocked"
          ? "none"
          : tag;

    try {
      const res = await fetch("/api/admin/actions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "annotate_ip",
          ip,
          tag: nextTag,
          note,
          blocked: nextBlocked,
        }),
      });
      if (res.ok) {
        setBlocked(nextBlocked);
        setTag(nextTag);
        setSavedNotice(true);
        onUpdated();
        window.setTimeout(() => setSavedNotice(false), 2000);
      }
    } finally {
      setSaving(false);
    }
  }

  async function copyIp() {
    if (!ip) return;
    try {
      await navigator.clipboard.writeText(ip);
      setCopiedIp(true);
      window.setTimeout(() => setCopiedIp(false), 1600);
    } catch {
      // ignore
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end"
      role="dialog"
      aria-modal="true"
      aria-label={`Forensic dossier for IP ${ip}`}
    >
      <div
        onClick={onClose}
        className="fixed inset-0 bg-[var(--scrim-drawer)] backdrop-blur-[var(--blur-scrim)]"
        aria-hidden="true"
      />

      <aside className="relative z-10 flex h-full w-full max-w-2xl flex-col border-l border-[var(--border-hairline)] bg-[var(--bg-canvas)] shadow-[var(--shadow-float)]">
        {/* Header */}
        <div className="chrome-surface flex items-start justify-between gap-3 border-b border-[var(--border-hairline)] px-5 py-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-base font-semibold tabular-nums text-[var(--ink-primary)]">
                {ip}
              </span>
              <button
                type="button"
                onClick={copyIp}
                aria-label="Copy IP address"
                className="btn-press inline-flex items-center gap-1 rounded-[var(--radius-xs)] border border-[var(--border-hairline)] bg-[var(--bg-surface)] px-2 py-0.5 font-mono text-[10.5px] text-[var(--ink-secondary)] hover:border-[var(--border-strong)]"
              >
                {copiedIp ? <Check size={11} /> : <Copy size={11} />}
                {copiedIp ? "Copied" : "Copy"}
              </button>
              {dossier?.profile.isOnlineNow && (
                <span className="inline-flex items-center gap-1 rounded-full border border-[var(--status-positive-border)] bg-[var(--status-positive-bg)] px-2 py-0.5 font-mono text-[10px] font-semibold text-[var(--status-positive)]">
                  <span className="h-1.5 w-1.5 rounded-full bg-[var(--status-positive)]" />
                  LIVE NOW
                </span>
              )}
              {dossier?.profile.isViewingResumeNow && (
                <span className="inline-flex items-center gap-1 rounded-full border border-[var(--accent-border)] bg-[var(--accent-soft)] px-2 py-0.5 font-mono text-[10px] font-semibold text-[var(--accent-deep)]">
                  <FilePdf size={11} weight="bold" />
                  VIEWING CV
                </span>
              )}
              {dossier && (
                <span
                  className={`inline-flex items-center rounded-full border px-2 py-0.5 font-mono text-[10px] font-medium ${getTagStyle(dossier.profile.annotation.tag).className}`}
                >
                  {getTagStyle(dossier.profile.annotation.tag).label}
                </span>
              )}
            </div>

            {dossier && (
              <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 font-mono text-[11px] text-[var(--ink-muted)]">
                <span>
                  {countryFlag(dossier.profile.geo.country)}{" "}
                  {dossier.profile.geo.city}, {dossier.profile.geo.countryName}
                </span>
                {dossier.profile.geo.org && (
                  <span>· {dossier.profile.geo.org}</span>
                )}
                <span>
                  · {dossier.profile.device.browser} on{" "}
                  {dossier.profile.device.os} ({dossier.profile.device.deviceType})
                </span>
              </p>
            )}
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close IP dossier"
            className="btn-press inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-[var(--radius-sm)] border border-[var(--border-hairline)] bg-[var(--bg-surface)] text-[var(--ink-secondary)] hover:border-[var(--border-strong)] hover:text-[var(--ink-primary)]"
          >
            <X size={16} weight="bold" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 space-y-5 overflow-y-auto p-5">
          {loading && (
            <div className="py-12 text-center font-mono text-xs text-[var(--ink-muted)]">
              Loading forensic telemetry for {ip}...
            </div>
          )}

          {error && (
            <div className="rounded-[var(--radius-sm)] border border-[var(--status-danger-border)] bg-[var(--status-danger-bg)] p-4 text-xs text-[var(--status-danger)]">
              {error}
            </div>
          )}

          {dossier && !loading && (
            <>
              {/* Metrics Grid */}
              <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
                <div className="rounded-[var(--radius-sm)] border border-[var(--border-hairline)] bg-[var(--bg-surface)] p-3">
                  <span className="font-mono text-[10px] uppercase text-[var(--ink-muted)]">
                    Visits / Views
                  </span>
                  <p className="mt-1 font-display text-lg font-semibold tabular-nums text-[var(--ink-primary)]">
                    {dossier.profile.visitCount}{" "}
                    <span className="font-mono text-xs font-normal text-[var(--ink-muted)]">
                      / {dossier.profile.pageViews} pv
                    </span>
                  </p>
                </div>

                <div className="rounded-[var(--radius-sm)] border border-[var(--border-hairline)] bg-[var(--bg-surface)] p-3">
                  <span className="font-mono text-[10px] uppercase text-[var(--ink-muted)]">
                    Resume Activity
                  </span>
                  <p className="mt-1 font-display text-lg font-semibold tabular-nums text-[var(--status-positive)]">
                    {dossier.profile.resumeViews}v ·{" "}
                    {dossier.profile.resumeDownloads}dl
                  </p>
                  {dossier.profile.resumeViewDurationMs > 0 && (
                    <span className="font-mono text-[10px] text-[var(--ink-muted)]">
                      Read {formatDurationMs(dossier.profile.resumeViewDurationMs)}
                    </span>
                  )}
                </div>

                <div className="rounded-[var(--radius-sm)] border border-[var(--border-hairline)] bg-[var(--bg-surface)] p-3">
                  <span className="font-mono text-[10px] uppercase text-[var(--ink-muted)]">
                    AI &amp; Contact
                  </span>
                  <p className="mt-1 font-display text-lg font-semibold tabular-nums text-[var(--accent)]">
                    {dossier.profile.aiQueries} AI ·{" "}
                    {dossier.profile.contactInquiries} msg
                  </p>
                </div>

                <div className="rounded-[var(--radius-sm)] border border-[var(--border-hairline)] bg-[var(--bg-surface)] p-3">
                  <span className="font-mono text-[10px] uppercase text-[var(--ink-muted)]">
                    Active Dwell
                  </span>
                  <p className="mt-1 font-display text-lg font-semibold tabular-nums text-[var(--ink-primary)]">
                    {formatDurationMs(dossier.profile.totalActiveMs)}
                  </p>
                  <span className="font-mono text-[10px] text-[var(--ink-muted)]">
                    Avg scroll {dossier.profile.avgScrollDepth}%
                  </span>
                </div>
              </div>

              {/* Footprint Metadata */}
              <div className="rounded-[var(--radius-md)] border border-[var(--border-hairline)] bg-[var(--bg-surface)] p-4">
                <div className="grid gap-2 text-xs sm:grid-cols-2">
                  <div className="flex items-center gap-2 text-[var(--ink-secondary)]">
                    <GlobeHemisphereWest size={14} className="shrink-0 text-[var(--ink-muted)]" />
                    <span>
                      First seen:{" "}
                      <strong className="font-mono text-[11px] text-[var(--ink-primary)]">
                        {formatDateTime(dossier.profile.firstSeenAt)}
                      </strong>
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-[var(--ink-secondary)]">
                    <GlobeHemisphereWest size={14} className="shrink-0 text-[var(--ink-muted)]" />
                    <span>
                      Last seen:{" "}
                      <strong className="font-mono text-[11px] text-[var(--ink-primary)]">
                        {formatRelativeTime(dossier.profile.lastSeenAt)}
                      </strong>
                    </span>
                  </div>
                  <div className="text-[var(--ink-secondary)]">
                    Landing:{" "}
                    <code className="rounded bg-[var(--bg-subtle)] px-1.5 py-0.5 font-mono text-[11px] text-[var(--ink-primary)]">
                      {dossier.profile.landingPage}
                    </code>
                  </div>
                  <div className="text-[var(--ink-secondary)]">
                    Referrer:{" "}
                    <strong className="font-medium text-[var(--ink-primary)]">
                      {dossier.profile.topReferrer}
                    </strong>
                  </div>
                </div>
                {dossier.profile.device.userAgent && (
                  <p className="mt-2.5 border-t border-[var(--border-hairline)] pt-2 font-mono text-[10.5px] leading-relaxed break-all text-[var(--ink-muted)]">
                    UA: {dossier.profile.device.userAgent}
                  </p>
                )}
              </div>

              {/* Annotation & Access Control */}
              <div className="rounded-[var(--radius-md)] border border-[var(--border-hairline)] bg-[var(--bg-surface)] p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="font-mono text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--ink-secondary)]">
                    IP Classification &amp; Access Control
                  </h3>
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => handleSaveAnnotation(!blocked)}
                    className={`btn-press inline-flex items-center gap-1.5 rounded-[var(--radius-xs)] border px-2.5 py-1 font-mono text-[11px] font-medium ${
                      blocked
                        ? "border-[var(--status-positive-border)] bg-[var(--status-positive-bg)] text-[var(--status-positive)]"
                        : "border-[var(--status-danger-border)] bg-[var(--status-danger-bg)] text-[var(--status-danger)]"
                    }`}
                  >
                    {blocked ? (
                      <>
                        <ShieldCheck size={13} weight="bold" />
                        Unblock IP
                      </>
                    ) : (
                      <>
                        <Prohibit size={13} weight="bold" />
                        Block API &amp; Resume Access
                      </>
                    )}
                  </button>
                </div>

                <div className="mt-3 grid gap-3 sm:grid-cols-3">
                  <div>
                    <label className="mb-1 block font-mono text-[10px] uppercase text-[var(--ink-muted)]">
                      Tag
                    </label>
                    <select
                      value={tag}
                      onChange={(e) => setTag(e.target.value as IpTag)}
                      className="w-full rounded-[var(--radius-xs)] border border-[var(--border-strong)] bg-[var(--bg-surface)] px-2.5 py-1.5 text-xs text-[var(--ink-primary)]"
                    >
                      {TAG_OPTIONS.map((opt) => (
                        <option key={opt} value={opt}>
                          {getTagStyle(opt).label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="sm:col-span-2">
                    <label className="mb-1 block font-mono text-[10px] uppercase text-[var(--ink-muted)]">
                      Admin Note
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                        placeholder="e.g., Recruiter from Stripe London, Home office IP..."
                        className="flex-1 rounded-[var(--radius-xs)] border border-[var(--border-strong)] bg-[var(--bg-surface)] px-2.5 py-1.5 text-xs text-[var(--ink-primary)]"
                      />
                      <button
                        type="button"
                        disabled={saving}
                        onClick={() => handleSaveAnnotation()}
                        className="btn-press rounded-[var(--radius-xs)] bg-[var(--bg-inverse)] px-3 py-1.5 text-xs font-medium text-[var(--ink-inverse)] hover:bg-[var(--accent)] disabled:opacity-50"
                      >
                        {savedNotice ? "Saved" : "Save"}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Pages Visited Chips */}
              {dossier.profile.pagesVisited.length > 0 && (
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="mr-1 font-mono text-[10.5px] uppercase text-[var(--ink-muted)]">
                    Pages:
                  </span>
                  {dossier.profile.pagesVisited.map((pg) => (
                    <span
                      key={pg.path}
                      className="inline-flex items-center gap-1.5 rounded-[var(--radius-xs)] border border-[var(--border-hairline)] bg-[var(--bg-surface)] px-2 py-0.5 font-mono text-[11px] text-[var(--ink-primary)]"
                    >
                      {pg.path}
                      <span className="text-[var(--accent)]">{pg.count}×</span>
                    </span>
                  ))}
                </div>
              )}

              {/* Sub-Tabs */}
              <div className="flex items-center gap-1 border-b border-[var(--border-hairline)] pb-2">
                {(
                  [
                    {
                      id: "timeline",
                      label: `Event Timeline (${dossier.events.length})`,
                    },
                    {
                      id: "sessions",
                      label: `Visits / Sessions (${dossier.sessions.length})`,
                    },
                    {
                      id: "ai",
                      label: `AI Queries (${dossier.aiLogs.length})`,
                    },
                  ] as const
                ).map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setActiveTab(t.id)}
                    className={`rounded-[var(--radius-xs)] px-3 py-1.5 font-mono text-[11px] font-medium transition-colors ${
                      activeTab === t.id
                        ? "bg-[var(--bg-inverse)] text-[var(--ink-inverse)]"
                        : "text-[var(--ink-secondary)] hover:bg-[var(--bg-subtle)]"
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>

              {/* Tab Content */}
              {activeTab === "timeline" && (
                <div className="space-y-2">
                  {dossier.events.map((ev) => (
                    <div
                      key={ev.id}
                      className="rounded-[var(--radius-sm)] border border-[var(--border-hairline)] bg-[var(--bg-surface)] px-3.5 py-2.5 text-xs"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span
                            className={`rounded border px-1.5 py-0.5 font-mono text-[10px] font-medium ${getSeverityStyle(ev.severity)}`}
                          >
                            {formatEventTypeLabel(ev.type)}
                          </span>
                          <code className="font-mono text-[11px] text-[var(--ink-primary)]">
                            {ev.path}
                          </code>
                        </div>
                        <span className="font-mono text-[10.5px] tabular-nums text-[var(--ink-muted)]">
                          {formatDateTime(ev.timestamp)}
                        </span>
                      </div>
                      {ev.label && (
                        <p className="mt-1 text-[12px] text-[var(--ink-secondary)]">
                          {ev.label}
                        </p>
                      )}
                      <div className="mt-1 flex flex-wrap gap-3 font-mono text-[10px] text-[var(--ink-muted)]">
                        {ev.durationMs ? (
                          <span>Duration: {formatDurationMs(ev.durationMs)}</span>
                        ) : null}
                        {typeof ev.scrollDepth === "number" ? (
                          <span>Scroll: {ev.scrollDepth}%</span>
                        ) : null}
                        {ev.source ? <span>Source: {ev.source}</span> : null}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {activeTab === "sessions" && (
                <div className="space-y-2">
                  {dossier.sessions.map((s) => (
                    <div
                      key={s.sessionId}
                      className="rounded-[var(--radius-sm)] border border-[var(--border-hairline)] bg-[var(--bg-surface)] p-3.5 text-xs"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="font-mono text-[11px] font-semibold text-[var(--ink-primary)]">
                          {formatDateTime(s.startedAt)}
                        </span>
                        <span className="font-mono text-[11px] tabular-nums text-[var(--ink-muted)]">
                          {formatDurationMs(s.durationMs)} · {s.eventCount} events
                        </span>
                      </div>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {s.viewedResume && (
                          <span className="rounded border border-[var(--accent-border)] bg-[var(--accent-soft)] px-2 py-0.5 font-mono text-[10px] text-[var(--accent-deep)]">
                            Viewed CV
                          </span>
                        )}
                        {s.downloadedResume && (
                          <span className="rounded border border-[var(--status-positive-border)] bg-[var(--status-positive-bg)] px-2 py-0.5 font-mono text-[10px] text-[var(--status-positive)]">
                            Downloaded CV
                          </span>
                        )}
                        {s.usedAi && (
                          <span className="rounded border border-[var(--status-warning-border)] bg-[var(--status-warning-bg)] px-2 py-0.5 font-mono text-[10px] text-[var(--status-warning)]">
                            Asked AI
                          </span>
                        )}
                        {s.submittedContact && (
                          <span className="rounded border border-[var(--status-positive-border)] bg-[var(--status-positive-bg)] px-2 py-0.5 font-mono text-[10px] text-[var(--status-positive)]">
                            Sent Inquiry
                          </span>
                        )}
                      </div>
                      {s.pages.length > 0 && (
                        <p className="mt-2 font-mono text-[10.5px] text-[var(--ink-muted)]">
                          Path flow: {s.pages.join(" → ")}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {activeTab === "ai" && (
                <div className="space-y-2.5">
                  {dossier.aiLogs.length === 0 ? (
                    <p className="py-6 text-center font-mono text-xs text-[var(--ink-muted)]">
                      This IP has not queried the AI assistant yet.
                    </p>
                  ) : (
                    dossier.aiLogs.map((ai) => (
                      <div
                        key={ai.id}
                        className="rounded-[var(--radius-sm)] border border-[var(--border-hairline)] bg-[var(--bg-surface)] p-3.5 text-xs"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span className="inline-flex items-center gap-1.5 font-mono text-[11px] font-semibold text-[var(--accent-deep)]">
                            {ai.mode === "gemini" ? (
                              <Sparkle size={12} weight="bold" />
                            ) : (
                              <Robot size={12} weight="bold" />
                            )}
                            {ai.resolvedModel}
                            {ai.wasFailover ? " (failover)" : ""}
                          </span>
                          <span className="font-mono text-[10.5px] tabular-nums text-[var(--ink-muted)]">
                            {ai.latencyMs}ms · {formatDateTime(ai.timestamp)}
                          </span>
                        </div>
                        <p className="mt-2 font-medium text-[var(--ink-primary)]">
                          Q: {ai.query}
                        </p>
                        <p className="mt-1 line-clamp-3 text-[var(--ink-secondary)]">
                          A: {ai.answerPreview}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </aside>
    </div>
  );
}
