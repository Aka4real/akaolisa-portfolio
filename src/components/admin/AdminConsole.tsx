"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowSquareOut,
  Check,
  Copy,
  EnvelopeSimple,
  Key,
  LockSimple,
  PaperPlaneRight,
  Plus,
  SignOut,
  Sparkle,
  Trash,
} from "@phosphor-icons/react";
import type { ProjectDossier, SchematicType } from "@/data/projects";
import type { TrackId } from "@/data/profile";
import type {
  InquiryStatus,
  StudioAdminState,
  StudioInquiry,
  StudioProfileSettings,
} from "@/lib/admin-store";
import { formatGeminiModelLabel, type ChatResponsePayload } from "@/lib/knowledge";

export interface AdminDiagnostics {
  geminiEnabled: boolean;
  primaryModel: string;
  fallbackModels: string[];
  thinkingLevel: string;
  maxOutputTokens: number;
  resendConfigured: boolean;
  passcodeRequired: boolean;
  canonicalUrl: string;
  systemPromptChars: number;
  systemPromptPreview: string;
}

interface AdminConsoleProps {
  initialAuthenticated: boolean;
  initialPasscodeRequired: boolean;
  initialState: StudioAdminState | null;
  initialDiagnostics: AdminDiagnostics | null;
}

type AdminSection =
  | "overview"
  | "dossiers"
  | "inquiries"
  | "profile"
  | "assistant";

const SECTION_ITEMS: ReadonlyArray<{ id: AdminSection; label: string }> = [
  { id: "overview", label: "Overview" },
  { id: "dossiers", label: "Dossiers" },
  { id: "inquiries", label: "Inquiries" },
  { id: "profile", label: "Profile and availability" },
  { id: "assistant", label: "AI diagnostics" },
];

const TRACK_LABELS: Record<TrackId, string> = {
  "full-stack-saas": "Full-Stack SaaS",
  "ai-agents": "AI Agents & LLMs",
  "quant-fintech": "Quant & FinTech",
  "healthtech-biomedical": "Biomedical & HealthTech",
};

const SCHEMATIC_OPTIONS: ReadonlyArray<{ value: SchematicType; label: string }> =
  [
    { value: "koridor", label: "Koridor geospatial topology" },
    { value: "fortress", label: "Fortress governance pipeline" },
    { value: "crypto-wealth", label: "Crypto wealth SVG ledger" },
    { value: "stitch-retail", label: "Stitch hub-and-spoke sync" },
    { value: "quant-hft", label: "Monte Carlo risk simulator" },
    { value: "ecommerce", label: "Edge commerce pipeline" },
  ];

const INQUIRY_STATUS_STYLES: Record<InquiryStatus, string> = {
  new: "border-[var(--accent-border)] bg-[var(--accent-soft)] text-[var(--accent-deep)]",
  reviewing:
    "border-[var(--status-warning-border)] bg-[var(--status-warning-bg)] text-[var(--status-warning)]",
  replied:
    "border-[var(--status-positive-border)] bg-[var(--status-positive-bg)] text-[var(--status-positive)]",
  archived:
    "border-[var(--border-hairline)] bg-[var(--bg-subtle)] text-[var(--ink-muted)]",
};

const INQUIRY_STATUS_LABELS: Record<InquiryStatus, string> = {
  new: "New",
  reviewing: "In review",
  replied: "Replied",
  archived: "Archived",
};

function formatDate(iso: string): string {
  try {
    return new Intl.DateTimeFormat("en-GB", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

export function AdminConsole({
  initialAuthenticated,
  initialPasscodeRequired,
  initialState,
  initialDiagnostics,
}: AdminConsoleProps) {
  const [authenticated, setAuthenticated] = useState(initialAuthenticated);
  const [passcodeRequired] = useState(initialPasscodeRequired);
  const [previewLockScreen, setPreviewLockScreen] = useState(false);
  const [passcodeInput, setPasscodeInput] = useState("");
  const [authError, setAuthError] = useState<string | null>(null);
  const [authSubmitting, setAuthSubmitting] = useState(false);

  const [state, setState] = useState<StudioAdminState | null>(initialState);
  const [diagnostics, setDiagnostics] = useState<AdminDiagnostics | null>(
    initialDiagnostics
  );
  const [section, setSection] = useState<AdminSection>("overview");
  const [toast, setToast] = useState<string | null>(null);

  // Dossiers tab state
  const [dossierTrackFilter, setDossierTrackFilter] = useState<
    "all" | TrackId
  >("all");
  const [editingSlug, setEditingSlug] = useState<string | null>(
    initialState?.projects[0]?.slug ?? null
  );
  const [isCreatingDossier, setIsCreatingDossier] = useState(false);
  const [draftDossier, setDraftDossier] = useState<ProjectDossier | null>(
    initialState?.projects[0] ?? null
  );
  const [stackText, setStackText] = useState<string>(
    initialState?.projects[0]?.stack.join(", ") ?? ""
  );
  const [savingDossier, setSavingDossier] = useState(false);
  const [copiedJson, setCopiedJson] = useState(false);

  // Inquiries tab state
  const [inquiryFilter, setInquiryFilter] = useState<"all" | InquiryStatus>(
    "all"
  );
  const [selectedInquiryId, setSelectedInquiryId] = useState<string | null>(
    initialState?.inquiries[0]?.id ?? null
  );
  const [notesDraft, setNotesDraft] = useState<string>(
    initialState?.inquiries[0]?.notes ?? ""
  );
  const [inquiryBusy, setInquiryBusy] = useState(false);

  // Profile tab state
  const [profileDraft, setProfileDraft] = useState<StudioProfileSettings | null>(
    initialState?.profile ?? null
  );
  const [savingProfile, setSavingProfile] = useState(false);

  // AI Diagnostics sandbox state
  const [sandboxQuery, setSandboxQuery] = useState(
    "Summarize Akaolisa's multi-agent AI architecture and clinical leadership."
  );
  const [sandboxLoading, setSandboxLoading] = useState(false);
  const [sandboxResult, setSandboxResult] = useState<{
    payload: ChatResponsePayload;
    latencyMs: number;
  } | null>(null);
  const [showSystemPrompt, setShowSystemPrompt] = useState(false);

  function notify(msg: string) {
    setToast(msg);
    window.setTimeout(() => {
      setToast((prev) => (prev === msg ? null : prev));
    }, 3200);
  }

  async function refreshStudioData() {
    const res = await fetch("/api/admin/state", { cache: "no-store" });
    if (!res.ok) return;
    const data = (await res.json()) as {
      state: StudioAdminState;
      diagnostics: AdminDiagnostics;
    };
    setState(data.state);
    setDiagnostics(data.diagnostics);
    setProfileDraft(data.state.profile);
    if (!editingSlug && data.state.projects[0]) {
      setEditingSlug(data.state.projects[0].slug);
      setDraftDossier(data.state.projects[0]);
      setStackText(data.state.projects[0].stack.join(", "));
    }
  }

  async function handleUnlock(e: React.FormEvent) {
    e.preventDefault();
    setAuthError(null);

    if (!passcodeRequired && previewLockScreen) {
      setPreviewLockScreen(false);
      setPasscodeInput("");
      return;
    }

    setAuthSubmitting(true);
    try {
      const res = await fetch("/api/admin/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ passcode: passcodeInput }),
      });
      const data = (await res.json()) as {
        authenticated?: boolean;
        error?: string;
      };
      if (!res.ok || !data.authenticated) {
        setAuthError(data.error ?? "Authentication failed.");
        return;
      }
      setAuthenticated(true);
      setPasscodeInput("");
      await refreshStudioData();
    } catch {
      setAuthError("Unable to reach authentication endpoint.");
    } finally {
      setAuthSubmitting(false);
    }
  }

  async function handleSignOut() {
    if (!passcodeRequired) {
      setPreviewLockScreen(true);
      return;
    }
    await fetch("/api/admin/auth", { method: "DELETE" });
    setAuthenticated(false);
    setState(null);
  }

  function selectDossierForEdit(project: ProjectDossier) {
    setIsCreatingDossier(false);
    setEditingSlug(project.slug);
    setDraftDossier({ ...project });
    setStackText(project.stack.join(", "));
  }

  function startNewDossier() {
    const nextCode = `SYS-${String((state?.projects.length ?? 6) + 1).padStart(2, "0")}`;
    const blank: ProjectDossier = {
      slug: `new-system-${Date.now().toString(36).slice(-4)}`,
      indexCode: nextCode,
      title: "",
      subtitle: "",
      clientDomain: "OXAKALABS Client",
      statusBadge: "Draft",
      isNda: false,
      year: String(new Date().getFullYear()),
      tracks: ["full-stack-saas"],
      primaryTrack: "full-stack-saas",
      featured: false,
      summary: "",
      challenge: "",
      architectureDecisions: [],
      executionHighlights: [],
      businessImpact: [],
      stack: ["Next.js", "TypeScript", "PostgreSQL"],
      schematicType: "koridor",
      links: [],
    };
    setIsCreatingDossier(true);
    setEditingSlug(blank.slug);
    setDraftDossier(blank);
    setStackText(blank.stack.join(", "));
  }

  async function saveDossier(e: React.FormEvent) {
    e.preventDefault();
    if (!draftDossier || !draftDossier.title.trim() || !draftDossier.slug.trim()) {
      notify("Provide both a system title and slug before saving.");
      return;
    }

    setSavingDossier(true);
    try {
      const parsedStack = stackText
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);

      const payload: ProjectDossier = {
        ...draftDossier,
        stack: parsedStack,
        tracks: draftDossier.tracks.includes(draftDossier.primaryTrack)
          ? draftDossier.tracks
          : [draftDossier.primaryTrack, ...draftDossier.tracks],
      };

      const res = await fetch("/api/admin/state", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "upsert-project", project: payload }),
      });

      if (!res.ok) {
        notify("Unable to save dossier.");
        return;
      }

      const data = (await res.json()) as {
        state: StudioAdminState;
        diagnostics: AdminDiagnostics;
      };
      setState(data.state);
      setDiagnostics(data.diagnostics);
      setIsCreatingDossier(false);
      const saved = data.state.projects.find((p) => p.slug === payload.slug);
      if (saved) {
        setEditingSlug(saved.slug);
        setDraftDossier(saved);
        setStackText(saved.stack.join(", "));
      }
      notify(`Saved dossier "${payload.title}".`);
    } finally {
      setSavingDossier(false);
    }
  }

  async function toggleFeatured(project: ProjectDossier) {
    const res = await fetch("/api/admin/state", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "upsert-project",
        project: { slug: project.slug, featured: !project.featured },
      }),
    });
    if (!res.ok) return;
    const data = (await res.json()) as { state: StudioAdminState };
    setState(data.state);
    if (draftDossier?.slug === project.slug) {
      setDraftDossier({ ...draftDossier, featured: !project.featured });
    }
    notify(
      !project.featured
        ? `"${project.title}" pinned to featured work.`
        : `"${project.title}" removed from featured work.`
    );
  }

  async function removeDossier(slug: string) {
    const res = await fetch("/api/admin/state", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "delete-project", slug }),
    });
    if (!res.ok) return;
    const data = (await res.json()) as { state: StudioAdminState };
    setState(data.state);
    const next = data.state.projects[0] ?? null;
    setEditingSlug(next?.slug ?? null);
    setDraftDossier(next);
    setStackText(next?.stack.join(", ") ?? "");
    notify("Dossier removed from studio draft.");
  }

  async function copyDossiersExport() {
    if (!state) return;
    try {
      await navigator.clipboard.writeText(
        JSON.stringify(state.projects, null, 2)
      );
      setCopiedJson(true);
      notify("Copied dossiers JSON snapshot to clipboard.");
      window.setTimeout(() => setCopiedJson(false), 2000);
    } catch {
      notify("Clipboard access blocked.");
    }
  }

  async function seedSampleInquiry() {
    setInquiryBusy(true);
    try {
      const res = await fetch("/api/admin/inquiries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "seed-sample" }),
      });
      if (!res.ok) return;
      const data = (await res.json()) as { state: StudioAdminState };
      setState(data.state);
      const newest = data.state.inquiries[0];
      if (newest) {
        setSelectedInquiryId(newest.id);
        setNotesDraft(newest.notes);
      }
      notify("Sample HealthTech inquiry logged for triage preview.");
    } finally {
      setInquiryBusy(false);
    }
  }

  async function updateInquiry(
    id: string,
    patch: Partial<Pick<StudioInquiry, "status" | "notes">>
  ) {
    setInquiryBusy(true);
    try {
      const res = await fetch("/api/admin/inquiries", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, ...patch }),
      });
      if (!res.ok) return;
      const data = (await res.json()) as { state: StudioAdminState };
      setState(data.state);
      notify("Inquiry record updated.");
    } finally {
      setInquiryBusy(false);
    }
  }

  async function removeInquiry(id: string) {
    setInquiryBusy(true);
    try {
      const res = await fetch(
        `/api/admin/inquiries?id=${encodeURIComponent(id)}`,
        { method: "DELETE" }
      );
      if (!res.ok) return;
      const data = (await res.json()) as { state: StudioAdminState };
      setState(data.state);
      const next = data.state.inquiries[0] ?? null;
      setSelectedInquiryId(next?.id ?? null);
      setNotesDraft(next?.notes ?? "");
      notify("Inquiry deleted.");
    } finally {
      setInquiryBusy(false);
    }
  }

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    if (!profileDraft) return;
    setSavingProfile(true);
    try {
      const res = await fetch("/api/admin/state", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "update-profile",
          profile: profileDraft,
        }),
      });
      if (!res.ok) {
        notify("Unable to save profile settings.");
        return;
      }
      const data = (await res.json()) as { state: StudioAdminState };
      setState(data.state);
      setProfileDraft(data.state.profile);
      notify("Studio profile and availability saved.");
    } finally {
      setSavingProfile(false);
    }
  }

  async function resetAllToDefaults() {
    const res = await fetch("/api/admin/state", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "reset" }),
    });
    if (!res.ok) return;
    const data = (await res.json()) as {
      state: StudioAdminState;
      diagnostics: AdminDiagnostics;
    };
    setState(data.state);
    setDiagnostics(data.diagnostics);
    setProfileDraft(data.state.profile);
    const first = data.state.projects[0] ?? null;
    setEditingSlug(first?.slug ?? null);
    setDraftDossier(first);
    setStackText(first?.stack.join(", ") ?? "");
    notify("Reset studio state to repository defaults.");
  }

  async function runSandboxTest(e: React.FormEvent) {
    e.preventDefault();
    const q = sandboxQuery.trim();
    if (q.length < 2 || sandboxLoading) return;
    setSandboxLoading(true);
    const t0 = performance.now();
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: q, history: [] }),
      });
      const elapsed = Math.round(performance.now() - t0);
      if (!res.ok) {
        notify("Assistant endpoint returned an error.");
        return;
      }
      const payload = (await res.json()) as ChatResponsePayload;
      setSandboxResult({ payload, latencyMs: elapsed });
    } finally {
      setSandboxLoading(false);
    }
  }

  const filteredProjects = useMemo(() => {
    if (!state) return [];
    if (dossierTrackFilter === "all") return state.projects;
    return state.projects.filter((p) => p.tracks.includes(dossierTrackFilter));
  }, [state, dossierTrackFilter]);

  const filteredInquiries = useMemo(() => {
    if (!state) return [];
    if (inquiryFilter === "all") return state.inquiries;
    return state.inquiries.filter((i) => i.status === inquiryFilter);
  }, [state, inquiryFilter]);

  const selectedInquiry = useMemo(() => {
    if (!state) return null;
    return (
      state.inquiries.find((i) => i.id === selectedInquiryId) ??
      filteredInquiries[0] ??
      null
    );
  }, [state, selectedInquiryId, filteredInquiries]);

  // Passcode Lock Screen (real gate when ADMIN_PASSCODE set, or previewable in local mode)
  if (!authenticated || previewLockScreen) {
    return (
      <div className="flex min-h-screen flex-col bg-[var(--bg-marine)] text-[var(--ink-on-marine)]">
        <header className="flex h-16 items-center justify-between border-b border-[var(--border-on-marine)] px-6 sm:px-10">
          <span className="type-wordmark text-[var(--ink-on-marine)]">
            OXAKALABS Studio
          </span>
          <Link
            href="/"
            className="type-sm inline-flex items-center gap-1.5 text-[var(--ink-on-marine-secondary)] transition-colors duration-150 hover:text-[var(--ink-on-marine)]"
          >
            <ArrowLeft size={14} weight="bold" aria-hidden="true" />
            <span>Back to portfolio</span>
          </Link>
        </header>

        <div className="flex flex-1 items-center justify-center px-5 py-16">
          <div className="w-full max-w-md rounded-[var(--radius-md)] border border-[var(--border-on-marine)] bg-[var(--bg-marine-elevated)] p-7 sm:p-9">
            <div className="flex h-10 w-10 items-center justify-center rounded-[var(--radius-sm)] bg-[var(--bg-marine-subtle)] text-[var(--accent-bright)]">
              <LockSimple size={18} weight="bold" aria-hidden="true" />
            </div>

            <h1 className="type-heading mt-5 text-[var(--ink-on-marine)]">
              Unlock Studio Console
            </h1>
            <p className="type-sm mt-2.5 text-[var(--ink-on-marine-secondary)]">
              {passcodeRequired
                ? "Enter the configured ADMIN_PASSCODE to manage portfolio dossiers, client inquiries, and Gemini assistant diagnostics."
                : "Passcode gate preview mode. No ADMIN_PASSCODE is currently set in your environment, so clicking continue returns immediately to the console."}
            </p>

            <form onSubmit={handleUnlock} className="mt-6 space-y-4">
              {passcodeRequired && (
                <div className="flex flex-col gap-2">
                  <label
                    htmlFor="admin-passcode"
                    className="type-sm font-medium text-[var(--ink-on-marine)]"
                  >
                    Studio passcode
                  </label>
                  <input
                    id="admin-passcode"
                    type="password"
                    autoComplete="current-password"
                    required
                    value={passcodeInput}
                    onChange={(e) => setPasscodeInput(e.target.value)}
                    placeholder="Enter ADMIN_PASSCODE"
                    className="type-sm w-full rounded-[var(--radius-sm)] border border-[var(--border-on-marine-strong)] bg-[var(--bg-marine)] px-3.5 py-2.5 text-[var(--ink-on-marine)] placeholder:text-[var(--ink-on-marine-muted)] focus:border-[var(--accent-bright)] focus:outline-none"
                  />
                </div>
              )}

              {authError && (
                <p
                  role="alert"
                  className="type-sm font-medium text-[#FCA5A5]"
                >
                  {authError}
                </p>
              )}

              <button
                type="submit"
                disabled={authSubmitting}
                className="btn-press type-sm flex w-full items-center justify-center gap-2 rounded-[var(--radius-sm)] bg-[var(--accent)] px-5 py-3 font-medium text-[var(--ink-on-marine)] hover:bg-[#1D64EB] disabled:opacity-60"
              >
                <Key size={15} weight="bold" aria-hidden="true" />
                <span>
                  {authSubmitting
                    ? "Verifying..."
                    : passcodeRequired
                      ? "Unlock console"
                      : "Return to Local Studio Mode"}
                </span>
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  const featuredCount = state?.projects.filter((p) => p.featured).length ?? 0;
  const openInquiriesCount =
    state?.inquiries.filter(
      (i) => i.status === "new" || i.status === "reviewing"
    ).length ?? 0;

  return (
    <div className="min-h-screen bg-[var(--bg-canvas)] text-[var(--ink-primary)]">
      {/* Compact Marine Ink Studio Masthead Bar */}
      <header className="sticky top-0 z-30 border-b border-[var(--border-on-marine)] bg-[var(--bg-marine)] text-[var(--ink-on-marine)]">
        <div className="mx-auto flex h-16 max-w-[1440px] items-center justify-between gap-4 px-5 sm:px-8">
          <div className="flex items-center gap-4">
            <span className="type-wordmark whitespace-nowrap text-[var(--ink-on-marine)]">
              OXAKALABS Studio
            </span>
            <span className="type-sm hidden text-[var(--ink-on-marine-muted)] sm:inline">
              {passcodeRequired
                ? "Passcode session active"
                : "Local studio mode"}
            </span>
          </div>

          <div className="flex shrink-0 items-center gap-3 sm:gap-5">
            <Link
              href="/"
              className="type-sm inline-flex items-center gap-1.5 whitespace-nowrap text-[var(--ink-on-marine-secondary)] transition-colors duration-150 hover:text-[var(--ink-on-marine)]"
            >
              <span className="sm:hidden">Portfolio</span>
              <span className="hidden sm:inline">View live portfolio</span>
              <ArrowSquareOut size={14} weight="bold" aria-hidden="true" />
            </Link>

            <button
              type="button"
              onClick={handleSignOut}
              className="type-sm btn-press inline-flex items-center gap-1.5 whitespace-nowrap rounded-[var(--radius-sm)] border border-[var(--border-on-marine-strong)] px-3 py-1.5 font-medium text-[var(--ink-on-marine)] hover:border-[var(--accent-bright)]"
            >
              {passcodeRequired ? (
                <>
                  <SignOut size={14} weight="bold" aria-hidden="true" />
                  <span>Sign out</span>
                </>
              ) : (
                <>
                  <LockSimple size={14} weight="bold" aria-hidden="true" />
                  <span className="sm:hidden">Lock</span>
                  <span className="hidden sm:inline">Preview lock</span>
                </>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Live Workspace Shell (Opens Immediately Into Operations) */}
      <div className="mx-auto max-w-[1440px] px-5 py-8 sm:px-8 lg:grid lg:grid-cols-12 lg:gap-10 lg:py-10">
        {/* Left Navigation Rail */}
        <aside className="mb-8 lg:col-span-3 lg:mb-0 xl:col-span-2">
          <nav
            aria-label="Studio console sections"
            className="no-scrollbar flex gap-1.5 overflow-x-auto border-b border-[var(--border-hairline)] pb-3 lg:flex-col lg:border-b-0 lg:border-r lg:pr-5 lg:pb-0"
          >
            {SECTION_ITEMS.map((item) => {
              const active = section === item.id;
              const badge =
                item.id === "dossiers"
                  ? state?.projects.length
                  : item.id === "inquiries"
                    ? state?.inquiries.length
                    : undefined;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setSection(item.id)}
                  aria-current={active ? "page" : undefined}
                  className={`type-sm btn-press flex shrink-0 items-center justify-between gap-3 rounded-[var(--radius-sm)] px-3.5 py-2.5 text-left font-medium transition-colors duration-150 ${
                    active
                      ? "bg-[var(--bg-marine)] text-[var(--ink-on-marine)]"
                      : "text-[var(--ink-secondary)] hover:bg-[var(--bg-subtle)] hover:text-[var(--ink-primary)]"
                  }`}
                >
                  <span>{item.label}</span>
                  {badge !== undefined && (
                    <span
                      className={`tabular-nums ${
                        active
                          ? "text-[var(--ink-on-marine-secondary)]"
                          : "text-[var(--ink-muted)]"
                      }`}
                    >
                      {badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          {!passcodeRequired && (
            <div className="mt-6 hidden border-t border-[var(--border-hairline)] pt-5 lg:block">
              <p className="type-table text-[var(--ink-muted)]">
                Set <code className="font-semibold text-[var(--ink-primary)]">ADMIN_PASSCODE</code>{" "}
                in your environment to require sign-in before deployment.
              </p>
            </div>
          )}
        </aside>

        {/* Main Operations Surface */}
        <section className="min-w-0 lg:col-span-9 xl:col-span-10">
          {/* Status Toast */}
          {toast && (
            <div
              role="status"
              aria-live="polite"
              className="type-sm mb-6 flex items-center justify-between gap-3 rounded-[var(--radius-sm)] border border-[var(--status-positive-border)] bg-[var(--status-positive-bg)] px-4 py-3 font-medium text-[var(--status-positive)]"
            >
              <span>{toast}</span>
            </div>
          )}

          {/* ===================== OVERVIEW ===================== */}
          {section === "overview" && state && diagnostics && (
            <div className="space-y-10">
              <div className="flex flex-wrap items-end justify-between gap-4 border-b border-[var(--border-hairline)] pb-6">
                <div>
                  <h1 className="type-heading text-[var(--ink-primary)]">
                    Studio operations overview
                  </h1>
                  <p className="type-sm mt-1.5 text-[var(--ink-secondary)]">
                    Live portfolio inventory, client inquiry triage, and Gemini
                    assistant status for {state.profile.displayName}.
                  </p>
                </div>
                <p className="type-meta text-[var(--ink-muted)]">
                  Storage: {state.storageMode} · Updated{" "}
                  {formatDate(state.updatedAt)}
                </p>
              </div>

              {/* Operational Telemetry Ledger */}
              <dl className="grid grid-cols-2 divide-y divide-[var(--border-hairline)] border-y border-[var(--border-hairline)] bg-[var(--bg-surface)] sm:grid-cols-4 sm:divide-x sm:divide-y-0">
                <div className="p-5">
                  <dt className="type-kicker text-[var(--ink-muted)]">
                    Shipped dossiers
                  </dt>
                  <dd className="type-heading mt-1.5 tabular-nums text-[var(--ink-primary)]">
                    {state.projects.length}
                  </dd>
                </div>
                <div className="p-5">
                  <dt className="type-kicker text-[var(--ink-muted)]">
                    Featured on home
                  </dt>
                  <dd className="type-heading mt-1.5 tabular-nums text-[var(--ink-primary)]">
                    {featuredCount}
                  </dd>
                </div>
                <div className="p-5">
                  <dt className="type-kicker text-[var(--ink-muted)]">
                    Open inquiries
                  </dt>
                  <dd className="type-heading mt-1.5 tabular-nums text-[var(--accent-deep)]">
                    {openInquiriesCount}
                  </dd>
                </div>
                <div className="p-5">
                  <dt className="type-kicker text-[var(--ink-muted)]">
                    AI assistant mode
                  </dt>
                  <dd className="type-subhead mt-2 text-[var(--ink-primary)]">
                    {diagnostics.geminiEnabled
                      ? formatGeminiModelLabel(diagnostics.primaryModel)
                      : "Grounded index"}
                  </dd>
                </div>
              </dl>

              {/* Environment Readiness Table */}
              <div>
                <h2 className="type-subhead text-[var(--ink-primary)]">
                  Runtime readiness
                </h2>
                <div className="mt-4 overflow-x-auto rounded-[var(--radius-sm)] border border-[var(--border-hairline)] bg-[var(--bg-surface)]">
                  <table className="w-full border-collapse text-left">
                    <thead>
                      <tr className="type-kicker border-b border-[var(--border-hairline)] bg-[var(--bg-canvas)] text-[var(--ink-muted)]">
                        <th className="px-4 py-3 font-medium">Subsystem</th>
                        <th className="px-4 py-3 font-medium">Status</th>
                        <th className="px-4 py-3 font-medium">Configuration</th>
                      </tr>
                    </thead>
                    <tbody className="type-table divide-y divide-[var(--border-hairline)]">
                      <tr>
                        <td className="px-4 py-3 font-medium text-[var(--ink-primary)]">
                          Gemini AI drawer (/api/chat)
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex whitespace-nowrap rounded-[var(--radius-xs)] border px-2 py-0.5 font-medium ${
                              diagnostics.geminiEnabled
                                ? "border-[var(--status-positive-border)] bg-[var(--status-positive-bg)] text-[var(--status-positive)]"
                                : "border-[var(--status-warning-border)] bg-[var(--status-warning-bg)] text-[var(--status-warning)]"
                            }`}
                          >
                            {diagnostics.geminiEnabled
                              ? "Live API key"
                              : "Grounded fallback"}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-mono text-[0.78125rem] tabular-nums text-[var(--ink-secondary)]">
                          {diagnostics.primaryModel} · Thinking{" "}
                          {diagnostics.thinkingLevel} ·{" "}
                          {diagnostics.maxOutputTokens} max tokens
                        </td>
                      </tr>
                      <tr>
                        <td className="px-4 py-3 font-medium text-[var(--ink-primary)]">
                          Contact SMTP relay (/api/contact)
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex whitespace-nowrap rounded-[var(--radius-xs)] border px-2 py-0.5 font-medium ${
                              diagnostics.resendConfigured
                                ? "border-[var(--status-positive-border)] bg-[var(--status-positive-bg)] text-[var(--status-positive)]"
                                : "border-[var(--status-warning-border)] bg-[var(--status-warning-bg)] text-[var(--status-warning)]"
                            }`}
                          >
                            {diagnostics.resendConfigured
                              ? "Resend active"
                              : "Mailto and console log"}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-mono text-[0.78125rem] text-[var(--ink-secondary)]">
                          Destination {state.profile.email}
                        </td>
                      </tr>
                      <tr>
                        <td className="px-4 py-3 font-medium text-[var(--ink-primary)]">
                          Admin authentication gate
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex whitespace-nowrap rounded-[var(--radius-xs)] border px-2 py-0.5 font-medium ${
                              diagnostics.passcodeRequired
                                ? "border-[var(--status-positive-border)] bg-[var(--status-positive-bg)] text-[var(--status-positive)]"
                                : "border-[var(--border-hairline)] bg-[var(--bg-subtle)] text-[var(--ink-secondary)]"
                            }`}
                          >
                            {diagnostics.passcodeRequired
                              ? "Passcode enforced"
                              : "Open local mode"}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-mono text-[0.78125rem] text-[var(--ink-secondary)]">
                          Canonical host {diagnostics.canonicalUrl}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Quick Jump Workspace Links */}
              <div className="grid gap-6 border-t border-[var(--border-hairline)] pt-8 md:grid-cols-3">
                <div>
                  <h3 className="type-subhead text-[var(--ink-primary)]">
                    Manage technical dossiers
                  </h3>
                  <p className="type-sm mt-1.5 text-[var(--ink-secondary)]">
                    Update project summaries, toggle featured placement, or
                    draft new case studies.
                  </p>
                  <button
                    type="button"
                    onClick={() => setSection("dossiers")}
                    className="type-sm mt-3 font-medium text-[var(--accent-deep)] hover:text-[var(--accent)]"
                  >
                    Open dossier manager
                  </button>
                </div>

                <div>
                  <h3 className="type-subhead text-[var(--ink-primary)]">
                    Triage client inquiries
                  </h3>
                  <p className="type-sm mt-1.5 text-[var(--ink-secondary)]">
                    Review incoming briefs from /contact, track status, and
                    record scoping notes.
                  </p>
                  <button
                    type="button"
                    onClick={() => setSection("inquiries")}
                    className="type-sm mt-3 font-medium text-[var(--accent-deep)] hover:text-[var(--accent)]"
                  >
                    Open inquiry inbox
                  </button>
                </div>

                <div>
                  <h3 className="type-subhead text-[var(--ink-primary)]">
                    Verify AI grounding
                  </h3>
                  <p className="type-sm mt-1.5 text-[var(--ink-secondary)]">
                    Inspect the system prompt and test live queries against the
                    chat endpoint.
                  </p>
                  <button
                    type="button"
                    onClick={() => setSection("assistant")}
                    className="type-sm mt-3 font-medium text-[var(--accent-deep)] hover:text-[var(--accent)]"
                  >
                    Open prompt sandbox
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ===================== DOSSIERS ===================== */}
          {section === "dossiers" && state && (
            <div className="space-y-8">
              <div className="flex flex-wrap items-end justify-between gap-4 border-b border-[var(--border-hairline)] pb-6">
                <div>
                  <h1 className="type-heading text-[var(--ink-primary)]">
                    Portfolio dossiers
                  </h1>
                  <p className="type-sm mt-1.5 text-[var(--ink-secondary)]">
                    Edit case study copy, toggle homepage featuring, or export a
                    clean JSON snapshot.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <select
                    aria-label="Filter dossiers by discipline"
                    value={dossierTrackFilter}
                    onChange={(e) =>
                      setDossierTrackFilter(e.target.value as "all" | TrackId)
                    }
                    className="type-sm rounded-[var(--radius-sm)] border border-[var(--border-strong)] bg-[var(--bg-surface)] px-3 py-2 text-[var(--ink-primary)]"
                  >
                    <option value="all">All disciplines</option>
                    {Object.entries(TRACK_LABELS).map(([id, label]) => (
                      <option key={id} value={id}>
                        {label}
                      </option>
                    ))}
                  </select>

                  <button
                    type="button"
                    onClick={copyDossiersExport}
                    className="type-sm btn-press inline-flex items-center gap-1.5 rounded-[var(--radius-sm)] border border-[var(--border-strong)] bg-[var(--bg-surface)] px-3.5 py-2 font-medium text-[var(--ink-primary)] hover:border-[var(--accent)]"
                  >
                    {copiedJson ? (
                      <Check size={14} weight="bold" aria-hidden="true" />
                    ) : (
                      <Copy size={14} weight="bold" aria-hidden="true" />
                    )}
                    <span>{copiedJson ? "Copied JSON" : "Export JSON"}</span>
                  </button>

                  <button
                    type="button"
                    onClick={startNewDossier}
                    className="type-sm btn-press inline-flex items-center gap-1.5 rounded-[var(--radius-sm)] bg-[var(--bg-marine)] px-4 py-2 font-medium text-[var(--ink-on-marine)] hover:bg-[var(--accent)]"
                  >
                    <Plus size={14} weight="bold" aria-hidden="true" />
                    <span>New dossier</span>
                  </button>
                </div>
              </div>

              <div className="grid gap-8 xl:grid-cols-12">
                {/* Inventory Table */}
                <div className="overflow-x-auto rounded-[var(--radius-sm)] border border-[var(--border-hairline)] bg-[var(--bg-surface)] xl:col-span-7">
                  <table className="w-full border-collapse text-left">
                    <thead>
                      <tr className="type-kicker border-b border-[var(--border-hairline)] bg-[var(--bg-canvas)] text-[var(--ink-muted)]">
                        <th className="px-4 py-3 font-medium">System</th>
                        <th className="px-4 py-3 font-medium">Year</th>
                        <th className="px-4 py-3 font-medium">Status</th>
                        <th className="px-4 py-3 font-medium">Featured</th>
                      </tr>
                    </thead>
                    <tbody className="type-table divide-y divide-[var(--border-hairline)]">
                      {filteredProjects.map((project) => {
                        const selected =
                          !isCreatingDossier && editingSlug === project.slug;
                        return (
                          <tr
                            key={project.slug}
                            onClick={() => selectDossierForEdit(project)}
                            className={`cursor-pointer transition-colors duration-150 ${
                              selected
                                ? "bg-[var(--accent-soft)]/70"
                                : "hover:bg-[var(--bg-subtle)]/60"
                            }`}
                          >
                            <td className="px-4 py-3.5">
                              <div className="font-semibold text-[var(--ink-primary)]">
                                {project.title}
                              </div>
                              <div className="text-[var(--ink-muted)]">
                                {project.clientDomain}
                              </div>
                            </td>
                            <td className="px-4 py-3.5 tabular-nums text-[var(--ink-secondary)]">
                              {project.year}
                            </td>
                            <td className="px-4 py-3.5">
                              <span
                                className={`inline-flex whitespace-nowrap rounded-[var(--radius-xs)] border px-2 py-0.5 font-medium ${
                                  project.isNda
                                    ? "border-[var(--border-hairline)] bg-[var(--bg-subtle)] text-[var(--ink-secondary)]"
                                    : "border-[var(--accent-border)] bg-[var(--accent-soft)] text-[var(--accent-deep)]"
                                }`}
                              >
                                {project.statusBadge}
                              </span>
                            </td>
                            <td
                              className="px-4 py-3.5"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <button
                                type="button"
                                role="switch"
                                aria-checked={project.featured}
                                aria-label={`Toggle featured state for ${project.title}`}
                                onClick={() => toggleFeatured(project)}
                                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-150 ${
                                  project.featured
                                    ? "bg-[var(--accent)]"
                                    : "bg-[var(--bg-recessed)]"
                                }`}
                              >
                                <span
                                  className={`inline-block h-4 w-4 rounded-full bg-white transition-transform duration-150 ${
                                    project.featured
                                      ? "translate-x-6"
                                      : "translate-x-1"
                                  }`}
                                />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Dossier Side Editor */}
                <div className="rounded-[var(--radius-sm)] border border-[var(--border-hairline)] bg-[var(--bg-surface)] p-6 xl:col-span-5">
                  {draftDossier ? (
                    <form onSubmit={saveDossier} className="space-y-4">
                      <div className="flex items-center justify-between gap-2 border-b border-[var(--border-hairline)] pb-4">
                        <h2 className="type-subhead text-[var(--ink-primary)]">
                          {isCreatingDossier
                            ? "New system dossier"
                            : `Edit ${draftDossier.title}`}
                        </h2>
                        {!isCreatingDossier && (
                          <Link
                            href={`/work/${draftDossier.slug}`}
                            className="type-table inline-flex items-center gap-1 font-medium text-[var(--accent-deep)] hover:text-[var(--accent)]"
                          >
                            <span>View page</span>
                            <ArrowSquareOut
                              size={13}
                              weight="bold"
                              aria-hidden="true"
                            />
                          </Link>
                        )}
                      </div>

                      <div className="grid gap-4 sm:grid-cols-2">
                        <div className="flex flex-col gap-1.5">
                          <label
                            htmlFor="dossier-title"
                            className="type-table font-medium text-[var(--ink-primary)]"
                          >
                            Title
                          </label>
                          <input
                            id="dossier-title"
                            type="text"
                            required
                            value={draftDossier.title}
                            onChange={(e) =>
                              setDraftDossier({
                                ...draftDossier,
                                title: e.target.value,
                              })
                            }
                            className="type-sm rounded-[var(--radius-sm)] border border-[var(--border-strong)] bg-[var(--bg-canvas)] px-3 py-2 text-[var(--ink-primary)] focus:border-[var(--accent)] focus:outline-none"
                          />
                        </div>

                        <div className="flex flex-col gap-1.5">
                          <label
                            htmlFor="dossier-slug"
                            className="type-table font-medium text-[var(--ink-primary)]"
                          >
                            URL slug
                          </label>
                          <input
                            id="dossier-slug"
                            type="text"
                            required
                            disabled={!isCreatingDossier}
                            value={draftDossier.slug}
                            onChange={(e) =>
                              setDraftDossier({
                                ...draftDossier,
                                slug: e.target.value,
                              })
                            }
                            className="type-sm rounded-[var(--radius-sm)] border border-[var(--border-strong)] bg-[var(--bg-canvas)] px-3 py-2 text-[var(--ink-primary)] disabled:opacity-60 focus:border-[var(--accent)] focus:outline-none"
                          />
                        </div>
                      </div>

                      <div className="flex flex-col gap-1.5">
                        <label
                          htmlFor="dossier-subtitle"
                          className="type-table font-medium text-[var(--ink-primary)]"
                        >
                          Subtitle
                        </label>
                        <input
                          id="dossier-subtitle"
                          type="text"
                          value={draftDossier.subtitle}
                          onChange={(e) =>
                            setDraftDossier({
                              ...draftDossier,
                              subtitle: e.target.value,
                            })
                          }
                          className="type-sm rounded-[var(--radius-sm)] border border-[var(--border-strong)] bg-[var(--bg-canvas)] px-3 py-2 text-[var(--ink-primary)] focus:border-[var(--accent)] focus:outline-none"
                        />
                      </div>

                      <div className="grid gap-4 sm:grid-cols-2">
                        <div className="flex flex-col gap-1.5">
                          <label
                            htmlFor="dossier-domain"
                            className="type-table font-medium text-[var(--ink-primary)]"
                          >
                            Client domain
                          </label>
                          <input
                            id="dossier-domain"
                            type="text"
                            value={draftDossier.clientDomain}
                            onChange={(e) =>
                              setDraftDossier({
                                ...draftDossier,
                                clientDomain: e.target.value,
                              })
                            }
                            className="type-sm rounded-[var(--radius-sm)] border border-[var(--border-strong)] bg-[var(--bg-canvas)] px-3 py-2 text-[var(--ink-primary)] focus:border-[var(--accent)] focus:outline-none"
                          />
                        </div>

                        <div className="flex flex-col gap-1.5">
                          <label
                            htmlFor="dossier-year"
                            className="type-table font-medium text-[var(--ink-primary)]"
                          >
                            Period
                          </label>
                          <input
                            id="dossier-year"
                            type="text"
                            value={draftDossier.year}
                            onChange={(e) =>
                              setDraftDossier({
                                ...draftDossier,
                                year: e.target.value,
                              })
                            }
                            className="type-sm rounded-[var(--radius-sm)] border border-[var(--border-strong)] bg-[var(--bg-canvas)] px-3 py-2 tabular-nums text-[var(--ink-primary)] focus:border-[var(--accent)] focus:outline-none"
                          />
                        </div>
                      </div>

                      <div className="flex flex-col gap-1.5">
                        <label
                          htmlFor="dossier-status"
                          className="type-table font-medium text-[var(--ink-primary)]"
                        >
                          Status label
                        </label>
                        <input
                          id="dossier-status"
                          type="text"
                          value={draftDossier.statusBadge}
                          onChange={(e) =>
                            setDraftDossier({
                              ...draftDossier,
                              statusBadge: e.target.value,
                            })
                          }
                          className="type-sm rounded-[var(--radius-sm)] border border-[var(--border-strong)] bg-[var(--bg-canvas)] px-3 py-2 text-[var(--ink-primary)] focus:border-[var(--accent)] focus:outline-none"
                        />
                      </div>

                      <div className="grid gap-4 sm:grid-cols-2">
                        <div className="flex flex-col gap-1.5">
                          <label
                            htmlFor="dossier-track"
                            className="type-table font-medium text-[var(--ink-primary)]"
                          >
                            Primary discipline
                          </label>
                          <select
                            id="dossier-track"
                            value={draftDossier.primaryTrack}
                            onChange={(e) =>
                              setDraftDossier({
                                ...draftDossier,
                                primaryTrack: e.target.value as TrackId,
                              })
                            }
                            className="type-sm rounded-[var(--radius-sm)] border border-[var(--border-strong)] bg-[var(--bg-canvas)] px-3 py-2 text-[var(--ink-primary)] focus:border-[var(--accent)] focus:outline-none"
                          >
                            {Object.entries(TRACK_LABELS).map(([id, label]) => (
                              <option key={id} value={id}>
                                {label}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="flex flex-col gap-1.5">
                          <label
                            htmlFor="dossier-schematic"
                            className="type-table font-medium text-[var(--ink-primary)]"
                          >
                            Architecture schematic
                          </label>
                          <select
                            id="dossier-schematic"
                            value={draftDossier.schematicType}
                            onChange={(e) =>
                              setDraftDossier({
                                ...draftDossier,
                                schematicType: e.target.value as SchematicType,
                              })
                            }
                            className="type-sm rounded-[var(--radius-sm)] border border-[var(--border-strong)] bg-[var(--bg-canvas)] px-3 py-2 text-[var(--ink-primary)] focus:border-[var(--accent)] focus:outline-none"
                          >
                            {SCHEMATIC_OPTIONS.map((opt) => (
                              <option key={opt.value} value={opt.value}>
                                {opt.label}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      <div className="flex flex-col gap-1.5">
                        <label
                          htmlFor="dossier-summary"
                          className="type-table font-medium text-[var(--ink-primary)]"
                        >
                          Summary
                        </label>
                        <textarea
                          id="dossier-summary"
                          rows={3}
                          value={draftDossier.summary}
                          onChange={(e) =>
                            setDraftDossier({
                              ...draftDossier,
                              summary: e.target.value,
                            })
                          }
                          className="type-sm rounded-[var(--radius-sm)] border border-[var(--border-strong)] bg-[var(--bg-canvas)] px-3 py-2 text-[var(--ink-primary)] focus:border-[var(--accent)] focus:outline-none"
                        />
                      </div>

                      <div className="flex flex-col gap-1.5">
                        <label
                          htmlFor="dossier-stack"
                          className="type-table font-medium text-[var(--ink-primary)]"
                        >
                          Production stack (comma-separated)
                        </label>
                        <input
                          id="dossier-stack"
                          type="text"
                          value={stackText}
                          onChange={(e) => setStackText(e.target.value)}
                          className="type-sm rounded-[var(--radius-sm)] border border-[var(--border-strong)] bg-[var(--bg-canvas)] px-3 py-2 text-[var(--ink-primary)] focus:border-[var(--accent)] focus:outline-none"
                        />
                      </div>

                      <div className="flex items-center gap-6 pt-1">
                        <label className="type-sm inline-flex items-center gap-2 text-[var(--ink-primary)]">
                          <input
                            type="checkbox"
                            checked={Boolean(draftDossier.featured)}
                            onChange={(e) =>
                              setDraftDossier({
                                ...draftDossier,
                                featured: e.target.checked,
                              })
                            }
                            className="h-4 w-4 accent-[var(--accent)]"
                          />
                          <span>Featured</span>
                        </label>

                        <label className="type-sm inline-flex items-center gap-2 text-[var(--ink-primary)]">
                          <input
                            type="checkbox"
                            checked={Boolean(draftDossier.isNda)}
                            onChange={(e) =>
                              setDraftDossier({
                                ...draftDossier,
                                isNda: e.target.checked,
                              })
                            }
                            className="h-4 w-4 accent-[var(--accent)]"
                          />
                          <span>NDA confidentiality</span>
                        </label>
                      </div>

                      <div className="flex items-center justify-between gap-3 border-t border-[var(--border-hairline)] pt-4">
                        {!isCreatingDossier ? (
                          <button
                            type="button"
                            onClick={() => removeDossier(draftDossier.slug)}
                            className="type-table inline-flex items-center gap-1 font-medium text-[var(--status-danger)] hover:underline"
                          >
                            <Trash size={14} weight="bold" aria-hidden="true" />
                            <span>Remove</span>
                          </button>
                        ) : (
                          <span />
                        )}

                        <button
                          type="submit"
                          disabled={savingDossier}
                          className="btn-press type-sm rounded-[var(--radius-sm)] bg-[var(--bg-marine)] px-5 py-2.5 font-medium text-[var(--ink-on-marine)] hover:bg-[var(--accent)] disabled:opacity-60"
                        >
                          {savingDossier ? "Saving..." : "Save changes"}
                        </button>
                      </div>
                    </form>
                  ) : (
                    <p className="type-sm text-[var(--ink-muted)]">
                      Select a dossier from the table or create a new draft.
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ===================== INQUIRIES ===================== */}
          {section === "inquiries" && state && (
            <div className="space-y-8">
              <div className="flex flex-wrap items-end justify-between gap-4 border-b border-[var(--border-hairline)] pb-6">
                <div>
                  <h1 className="type-heading text-[var(--ink-primary)]">
                    Client inquiry inbox
                  </h1>
                  <p className="type-sm mt-1.5 text-[var(--ink-secondary)]">
                    Incoming briefs submitted through /contact appear here for
                    status triage and response tracking.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <select
                    aria-label="Filter inquiries by status"
                    value={inquiryFilter}
                    onChange={(e) =>
                      setInquiryFilter(e.target.value as "all" | InquiryStatus)
                    }
                    className="type-sm rounded-[var(--radius-sm)] border border-[var(--border-strong)] bg-[var(--bg-surface)] px-3 py-2 text-[var(--ink-primary)]"
                  >
                    <option value="all">All statuses</option>
                    <option value="new">New</option>
                    <option value="reviewing">In review</option>
                    <option value="replied">Replied</option>
                    <option value="archived">Archived</option>
                  </select>

                  <button
                    type="button"
                    disabled={inquiryBusy}
                    onClick={seedSampleInquiry}
                    className="type-sm btn-press inline-flex items-center gap-1.5 rounded-[var(--radius-sm)] bg-[var(--bg-marine)] px-4 py-2 font-medium text-[var(--ink-on-marine)] hover:bg-[var(--accent)] disabled:opacity-60"
                  >
                    <Plus size={14} weight="bold" aria-hidden="true" />
                    <span>Log sample inquiry</span>
                  </button>
                </div>
              </div>

              {filteredInquiries.length === 0 ? (
                <div className="rounded-[var(--radius-sm)] border border-[var(--border-hairline)] bg-[var(--bg-surface)] px-6 py-14 text-center">
                  <p className="type-subhead text-[var(--ink-primary)]">
                    No inquiries recorded yet
                  </p>
                  <p className="type-sm mx-auto mt-2 max-w-md text-[var(--ink-secondary)]">
                    Submit a project brief through the public contact page or
                    log a sample inquiry above to test the full triage workflow.
                  </p>
                </div>
              ) : (
                <div className="grid gap-8 xl:grid-cols-12">
                  <div className="overflow-x-auto rounded-[var(--radius-sm)] border border-[var(--border-hairline)] bg-[var(--bg-surface)] xl:col-span-7">
                    <table className="w-full border-collapse text-left">
                      <thead>
                        <tr className="type-kicker border-b border-[var(--border-hairline)] bg-[var(--bg-canvas)] text-[var(--ink-muted)]">
                          <th className="px-4 py-3 font-medium">Sender</th>
                          <th className="px-4 py-3 font-medium">Discipline</th>
                          <th className="px-4 py-3 font-medium">Status</th>
                          <th className="px-4 py-3 font-medium">Received</th>
                        </tr>
                      </thead>
                      <tbody className="type-table divide-y divide-[var(--border-hairline)]">
                        {filteredInquiries.map((inq) => {
                          const isSelected = selectedInquiry?.id === inq.id;
                          return (
                            <tr
                              key={inq.id}
                              onClick={() => {
                                setSelectedInquiryId(inq.id);
                                setNotesDraft(inq.notes);
                              }}
                              className={`cursor-pointer transition-colors duration-150 ${
                                isSelected
                                  ? "bg-[var(--accent-soft)]/70"
                                  : "hover:bg-[var(--bg-subtle)]/60"
                              }`}
                            >
                              <td className="px-4 py-3.5">
                                <div className="font-semibold text-[var(--ink-primary)]">
                                  {inq.name}
                                </div>
                                <div className="text-[var(--ink-muted)]">
                                  {inq.email}
                                </div>
                              </td>
                              <td className="px-4 py-3.5 text-[var(--ink-secondary)]">
                                {inq.track}
                              </td>
                              <td className="px-4 py-3.5">
                                <span
                                  className={`inline-flex rounded-[var(--radius-xs)] border px-2 py-0.5 font-medium ${INQUIRY_STATUS_STYLES[inq.status]}`}
                                >
                                  {INQUIRY_STATUS_LABELS[inq.status]}
                                </span>
                              </td>
                              <td className="px-4 py-3.5 tabular-nums text-[var(--ink-muted)]">
                                {formatDate(inq.createdAt)}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Inquiry Inspector */}
                  <div className="rounded-[var(--radius-sm)] border border-[var(--border-hairline)] bg-[var(--bg-surface)] p-6 xl:col-span-5">
                    {selectedInquiry && (
                      <div className="space-y-5">
                        <div className="border-b border-[var(--border-hairline)] pb-4">
                          <h2 className="type-subhead text-[var(--ink-primary)]">
                            {selectedInquiry.name}
                          </h2>
                          <p className="type-table mt-1 text-[var(--ink-muted)]">
                            {selectedInquiry.email} · {selectedInquiry.scope}
                          </p>
                        </div>

                        <div>
                          <p className="type-table font-medium text-[var(--ink-muted)]">
                            Project brief
                          </p>
                          <p className="type-sm mt-2 whitespace-pre-wrap text-[var(--ink-primary)]">
                            {selectedInquiry.message}
                          </p>
                        </div>

                        <div className="grid gap-4 border-t border-[var(--border-hairline)] pt-4 sm:grid-cols-2">
                          <div className="flex flex-col gap-1.5">
                            <label
                              htmlFor="inquiry-status-select"
                              className="type-table font-medium text-[var(--ink-primary)]"
                            >
                              Triage status
                            </label>
                            <select
                              id="inquiry-status-select"
                              value={selectedInquiry.status}
                              onChange={(e) =>
                                updateInquiry(selectedInquiry.id, {
                                  status: e.target.value as InquiryStatus,
                                })
                              }
                              className="type-sm rounded-[var(--radius-sm)] border border-[var(--border-strong)] bg-[var(--bg-canvas)] px-3 py-2 text-[var(--ink-primary)]"
                            >
                              <option value="new">New</option>
                              <option value="reviewing">In review</option>
                              <option value="replied">Replied</option>
                              <option value="archived">Archived</option>
                            </select>
                          </div>

                          <div className="flex flex-col justify-end">
                            <a
                              href={`mailto:${selectedInquiry.email}?subject=${encodeURIComponent(
                                `Re: ${selectedInquiry.scope} with OXAKALABS`
                              )}`}
                              className="type-sm btn-press inline-flex items-center justify-center gap-1.5 rounded-[var(--radius-sm)] border border-[var(--border-strong)] bg-[var(--bg-canvas)] px-3.5 py-2 font-medium text-[var(--ink-primary)] hover:border-[var(--accent)]"
                            >
                              <EnvelopeSimple
                                size={15}
                                weight="bold"
                                aria-hidden="true"
                              />
                              <span>Reply via email</span>
                            </a>
                          </div>
                        </div>

                        <div className="flex flex-col gap-2">
                          <label
                            htmlFor="inquiry-notes"
                            className="type-table font-medium text-[var(--ink-primary)]"
                          >
                            Internal scoping notes
                          </label>
                          <textarea
                            id="inquiry-notes"
                            rows={3}
                            value={notesDraft}
                            onChange={(e) => setNotesDraft(e.target.value)}
                            placeholder="Add timeline, rate estimate, or call summary..."
                            className="type-sm rounded-[var(--radius-sm)] border border-[var(--border-strong)] bg-[var(--bg-canvas)] px-3 py-2 text-[var(--ink-primary)] focus:border-[var(--accent)] focus:outline-none"
                          />
                          <div className="flex items-center justify-between pt-1">
                            <button
                              type="button"
                              onClick={() => removeInquiry(selectedInquiry.id)}
                              className="type-table inline-flex items-center gap-1 font-medium text-[var(--status-danger)] hover:underline"
                            >
                              <Trash
                                size={14}
                                weight="bold"
                                aria-hidden="true"
                              />
                              <span>Delete</span>
                            </button>

                            <button
                              type="button"
                              disabled={inquiryBusy}
                              onClick={() =>
                                updateInquiry(selectedInquiry.id, {
                                  notes: notesDraft,
                                })
                              }
                              className="type-sm btn-press rounded-[var(--radius-sm)] bg-[var(--bg-marine)] px-4 py-2 font-medium text-[var(--ink-on-marine)] hover:bg-[var(--accent)]"
                            >
                              Save note
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ===================== PROFILE & AVAILABILITY ===================== */}
          {section === "profile" && profileDraft && (
            <div className="space-y-8">
              <div className="flex flex-wrap items-end justify-between gap-4 border-b border-[var(--border-hairline)] pb-6">
                <div>
                  <h1 className="type-heading text-[var(--ink-primary)]">
                    Profile and availability
                  </h1>
                  <p className="type-sm mt-1.5 text-[var(--ink-secondary)]">
                    Maintain headline positioning, remote availability copy, and
                    direct contact channels.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={resetAllToDefaults}
                  className="type-sm font-medium text-[var(--status-danger)] hover:underline"
                >
                  Reset studio defaults
                </button>
              </div>

              <form
                onSubmit={saveProfile}
                className="max-w-3xl space-y-6 rounded-[var(--radius-sm)] border border-[var(--border-hairline)] bg-[var(--bg-surface)] p-6 sm:p-8"
              >
                <div className="grid gap-5 sm:grid-cols-2">
                  <div className="flex flex-col gap-1.5">
                    <label
                      htmlFor="prof-name"
                      className="type-sm font-medium text-[var(--ink-primary)]"
                    >
                      Display name
                    </label>
                    <input
                      id="prof-name"
                      type="text"
                      value={profileDraft.displayName}
                      onChange={(e) =>
                        setProfileDraft({
                          ...profileDraft,
                          displayName: e.target.value,
                        })
                      }
                      className="type-sm rounded-[var(--radius-sm)] border border-[var(--border-strong)] bg-[var(--bg-canvas)] px-3.5 py-2.5 text-[var(--ink-primary)] focus:border-[var(--accent)] focus:outline-none"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label
                      htmlFor="prof-availability"
                      className="type-sm font-medium text-[var(--ink-primary)]"
                    >
                      Availability statement
                    </label>
                    <input
                      id="prof-availability"
                      type="text"
                      value={profileDraft.availabilityText}
                      onChange={(e) =>
                        setProfileDraft({
                          ...profileDraft,
                          availabilityText: e.target.value,
                        })
                      }
                      className="type-sm rounded-[var(--radius-sm)] border border-[var(--border-strong)] bg-[var(--bg-canvas)] px-3.5 py-2.5 text-[var(--ink-primary)] focus:border-[var(--accent)] focus:outline-none"
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label
                    htmlFor="prof-role"
                    className="type-sm font-medium text-[var(--ink-primary)]"
                  >
                    Headline role
                  </label>
                  <input
                    id="prof-role"
                    type="text"
                    value={profileDraft.headlineRole}
                    onChange={(e) =>
                      setProfileDraft({
                        ...profileDraft,
                        headlineRole: e.target.value,
                      })
                    }
                    className="type-sm rounded-[var(--radius-sm)] border border-[var(--border-strong)] bg-[var(--bg-canvas)] px-3.5 py-2.5 text-[var(--ink-primary)] focus:border-[var(--accent)] focus:outline-none"
                  />
                </div>

                <div className="grid gap-5 sm:grid-cols-3">
                  <div className="flex flex-col gap-1.5">
                    <label
                      htmlFor="prof-email"
                      className="type-sm font-medium text-[var(--ink-primary)]"
                    >
                      Public email
                    </label>
                    <input
                      id="prof-email"
                      type="email"
                      value={profileDraft.email}
                      onChange={(e) =>
                        setProfileDraft({
                          ...profileDraft,
                          email: e.target.value,
                        })
                      }
                      className="type-sm rounded-[var(--radius-sm)] border border-[var(--border-strong)] bg-[var(--bg-canvas)] px-3.5 py-2.5 text-[var(--ink-primary)] focus:border-[var(--accent)] focus:outline-none"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label
                      htmlFor="prof-wa"
                      className="type-sm font-medium text-[var(--ink-primary)]"
                    >
                      Primary WhatsApp
                    </label>
                    <input
                      id="prof-wa"
                      type="text"
                      value={profileDraft.whatsappDisplay}
                      onChange={(e) =>
                        setProfileDraft({
                          ...profileDraft,
                          whatsappDisplay: e.target.value,
                        })
                      }
                      className="type-sm rounded-[var(--radius-sm)] border border-[var(--border-strong)] bg-[var(--bg-canvas)] px-3.5 py-2.5 tabular-nums text-[var(--ink-primary)] focus:border-[var(--accent)] focus:outline-none"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label
                      htmlFor="prof-utc"
                      className="type-sm font-medium text-[var(--ink-primary)]"
                    >
                      Timezone label
                    </label>
                    <input
                      id="prof-utc"
                      type="text"
                      value={profileDraft.utcOffsetLabel}
                      onChange={(e) =>
                        setProfileDraft({
                          ...profileDraft,
                          utcOffsetLabel: e.target.value,
                        })
                      }
                      className="type-sm rounded-[var(--radius-sm)] border border-[var(--border-strong)] bg-[var(--bg-canvas)] px-3.5 py-2.5 tabular-nums text-[var(--ink-primary)] focus:border-[var(--accent)] focus:outline-none"
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label
                    htmlFor="prof-bio"
                    className="type-sm font-medium text-[var(--ink-primary)]"
                  >
                    Executive bio
                  </label>
                  <textarea
                    id="prof-bio"
                    rows={3}
                    value={profileDraft.bioShort}
                    onChange={(e) =>
                      setProfileDraft({
                        ...profileDraft,
                        bioShort: e.target.value,
                      })
                    }
                    className="type-sm rounded-[var(--radius-sm)] border border-[var(--border-strong)] bg-[var(--bg-canvas)] px-3.5 py-2.5 text-[var(--ink-primary)] focus:border-[var(--accent)] focus:outline-none"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label
                    htmlFor="prof-edge"
                    className="type-sm font-medium text-[var(--ink-primary)]"
                  >
                    Clinical and empirical edge narrative
                  </label>
                  <textarea
                    id="prof-edge"
                    rows={3}
                    value={profileDraft.empiricalEdge}
                    onChange={(e) =>
                      setProfileDraft({
                        ...profileDraft,
                        empiricalEdge: e.target.value,
                      })
                    }
                    className="type-sm rounded-[var(--radius-sm)] border border-[var(--border-strong)] bg-[var(--bg-canvas)] px-3.5 py-2.5 text-[var(--ink-primary)] focus:border-[var(--accent)] focus:outline-none"
                  />
                </div>

                <div className="flex justify-end border-t border-[var(--border-hairline)] pt-5">
                  <button
                    type="submit"
                    disabled={savingProfile}
                    className="btn-press type-sm rounded-[var(--radius-sm)] bg-[var(--bg-marine)] px-6 py-2.5 font-medium text-[var(--ink-on-marine)] hover:bg-[var(--accent)] disabled:opacity-60"
                  >
                    {savingProfile ? "Saving..." : "Save profile settings"}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* ===================== AI ASSISTANT DIAGNOSTICS ===================== */}
          {section === "assistant" && diagnostics && (
            <div className="space-y-8">
              <div className="border-b border-[var(--border-hairline)] pb-6">
                <h1 className="type-heading text-[var(--ink-primary)]">
                  AI assistant diagnostics
                </h1>
                <p className="type-sm mt-1.5 text-[var(--ink-secondary)]">
                  Verify Gemini model failover configuration, inspect the
                  grounded dossier system prompt, and benchmark live /api/chat
                  responses.
                </p>
              </div>

              <dl className="grid grid-cols-2 divide-y divide-[var(--border-hairline)] border-y border-[var(--border-hairline)] bg-[var(--bg-surface)] sm:grid-cols-4 sm:divide-x sm:divide-y-0">
                <div className="p-4">
                  <dt className="type-kicker text-[var(--ink-muted)]">
                    Primary model
                  </dt>
                  <dd className="type-meta mt-1.5 font-medium text-[var(--ink-primary)]">
                    {diagnostics.primaryModel}
                  </dd>
                </div>
                <div className="p-4">
                  <dt className="type-kicker text-[var(--ink-muted)]">
                    Failover chain
                  </dt>
                  <dd className="type-meta mt-1.5 text-[var(--ink-secondary)]">
                    {diagnostics.fallbackModels.join(", ")}
                  </dd>
                </div>
                <div className="p-4">
                  <dt className="type-kicker text-[var(--ink-muted)]">
                    Thinking / token cap
                  </dt>
                  <dd className="type-meta mt-1.5 font-medium text-[var(--ink-primary)]">
                    {diagnostics.thinkingLevel} · {diagnostics.maxOutputTokens}
                  </dd>
                </div>
                <div className="p-4">
                  <dt className="type-kicker text-[var(--ink-muted)]">
                    Grounded context
                  </dt>
                  <dd className="type-meta mt-1.5 font-medium text-[var(--ink-primary)]">
                    {diagnostics.systemPromptChars.toLocaleString()} chars
                  </dd>
                </div>
              </dl>

              {/* Live Prompt Sandbox */}
              <div className="rounded-[var(--radius-sm)] border border-[var(--border-hairline)] bg-[var(--bg-surface)] p-6">
                <div className="flex items-center gap-2">
                  <Sparkle
                    size={16}
                    weight="bold"
                    className="text-[var(--accent)]"
                    aria-hidden="true"
                  />
                  <h2 className="type-subhead text-[var(--ink-primary)]">
                    Live endpoint test bench
                  </h2>
                </div>

                <form
                  onSubmit={runSandboxTest}
                  className="mt-4 flex flex-col gap-3 sm:flex-row"
                >
                  <input
                    type="text"
                    value={sandboxQuery}
                    onChange={(e) => setSandboxQuery(e.target.value)}
                    placeholder="Enter a technical question to evaluate /api/chat..."
                    className="type-sm flex-1 rounded-[var(--radius-sm)] border border-[var(--border-strong)] bg-[var(--bg-canvas)] px-3.5 py-2.5 text-[var(--ink-primary)] focus:border-[var(--accent)] focus:outline-none"
                  />
                  <button
                    type="submit"
                    disabled={sandboxLoading}
                    className="btn-press type-sm inline-flex items-center justify-center gap-2 rounded-[var(--radius-sm)] bg-[var(--bg-marine)] px-5 py-2.5 font-medium text-[var(--ink-on-marine)] hover:bg-[var(--accent)] disabled:opacity-60"
                  >
                    <PaperPlaneRight
                      size={15}
                      weight="bold"
                      aria-hidden="true"
                    />
                    <span>{sandboxLoading ? "Running..." : "Run test query"}</span>
                  </button>
                </form>

                {sandboxResult && (
                  <div className="mt-6 border-t border-[var(--border-hairline)] pt-5">
                    <div className="type-meta flex flex-wrap items-center gap-x-5 gap-y-1 text-[var(--ink-muted)]">
                      <span>
                        Mode:{" "}
                        <strong className="text-[var(--ink-primary)]">
                          {sandboxResult.payload.mode}
                        </strong>
                      </span>
                      {sandboxResult.payload.model && (
                        <span>
                          Model:{" "}
                          <strong className="text-[var(--ink-primary)]">
                            {sandboxResult.payload.model}
                          </strong>
                        </span>
                      )}
                      <span>
                        Latency:{" "}
                        <strong className="text-[var(--status-positive)]">
                          {sandboxResult.latencyMs} ms
                        </strong>
                      </span>
                    </div>

                    <p className="type-body mt-4 whitespace-pre-wrap text-[var(--ink-primary)]">
                      {sandboxResult.payload.answer}
                    </p>

                    {sandboxResult.payload.links.length > 0 && (
                      <div className="type-table mt-4 flex flex-wrap gap-4 border-t border-[var(--border-hairline)] pt-3 text-[var(--accent-deep)]">
                        {sandboxResult.payload.links.map((l) => (
                          <Link
                            key={l.href}
                            href={l.href}
                            className="font-medium hover:underline"
                          >
                            {l.label} ({l.href})
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Grounded System Prompt Inspector */}
              <div className="border-t border-[var(--border-hairline)] pt-6">
                <button
                  type="button"
                  onClick={() => setShowSystemPrompt((v) => !v)}
                  className="type-sm font-medium text-[var(--accent-deep)] hover:text-[var(--accent)]"
                >
                  {showSystemPrompt
                    ? "Hide grounded system prompt"
                    : "Inspect full grounded system prompt"}
                </button>

                {showSystemPrompt && (
                  <pre className="type-meta mt-4 max-h-96 overflow-auto rounded-[var(--radius-sm)] border border-[var(--border-hairline)] bg-[var(--bg-surface)] p-5 whitespace-pre-wrap text-[var(--ink-secondary)]">
                    {diagnostics.systemPromptPreview}
                  </pre>
                )}
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
