"use client";

import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  ArrowUpRight,
  CaretDown,
  Check,
  CheckCircle,
  Copy,
  DownloadSimple,
  EnvelopeSimple,
  PaperPlaneTilt,
  WarningCircle,
  WhatsappLogo,
} from "@phosphor-icons/react";
import { PROFILE, SERVICE_PILLARS } from "@/data/profile";
import {
  BlurCrossfade,
  EASE_OUT_EXPO,
} from "@/components/ui/MotionPrimitives";

const SCOPE_OPTIONS = [
  "Full-Stack SaaS Build",
  "AI Agent / LLM Pipeline",
  "Quant / FinTech Tooling",
  "HealthTech / LIS System",
  "Principal Role or Advisory",
] as const;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_MESSAGE_LENGTH = 15;

interface ApiResponse {
  status?: "sent" | "fallback";
  mode?: string;
  message?: string;
  mailtoUrl?: string;
  plainBrief?: string;
  error?: string;
}

type FieldName = "name" | "email" | "message";
type SubmitVisualState = "idle" | "submitting" | "sent";

function resolveTrackLabel(param: string | null): string {
  if (!param) return SERVICE_PILLARS[0].shortLabel;
  const match = SERVICE_PILLARS.find((p) => p.id === param);
  return match ? match.shortLabel : SERVICE_PILLARS[0].shortLabel;
}

function validateField(field: FieldName, value: string): string | null {
  const trimmed = value.trim();
  if (field === "name") {
    return trimmed.length < 2
      ? "Enter your name (at least 2 characters)."
      : null;
  }
  if (field === "email") {
    return !EMAIL_PATTERN.test(trimmed)
      ? "Enter a valid email address so I can reply."
      : null;
  }
  return trimmed.length < MIN_MESSAGE_LENGTH
    ? `Share a short project outline (at least ${MIN_MESSAGE_LENGTH} characters).`
    : null;
}

export function ContactForm() {
  const prefersReduced = useReducedMotion();
  const searchParams = useSearchParams();
  const initialTrackParam = searchParams.get("track");

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [trackOverride, setTrackOverride] = useState<string | null>(null);
  const [scope, setScope] = useState<string>(SCOPE_OPTIONS[0]);
  const [message, setMessage] = useState("");
  const [companyWebsite, setCompanyWebsite] = useState("");

  const [touched, setTouched] = useState<Record<FieldName, boolean>>({
    name: false,
    email: false,
    message: false,
  });

  const [submitting, setSubmitting] = useState(false);
  const [submitVisualState, setSubmitVisualState] =
    useState<SubmitVisualState>("idle");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ApiResponse | null>(null);

  const [copiedEmail, setCopiedEmail] = useState(false);
  const [copiedWhatsapp, setCopiedWhatsapp] = useState(false);
  const [copiedBrief, setCopiedBrief] = useState(false);

  const emailTimerRef = useRef<number | null>(null);
  const whatsappTimerRef = useRef<number | null>(null);
  const briefTimerRef = useRef<number | null>(null);
  const submitResetTimerRef = useRef<number | null>(null);

  const nameInputRef = useRef<HTMLInputElement>(null);
  const emailInputRef = useRef<HTMLInputElement>(null);
  const messageInputRef = useRef<HTMLTextAreaElement>(null);

  const track = trackOverride ?? resolveTrackLabel(initialTrackParam);

  useEffect(() => {
    return () => {
      if (emailTimerRef.current !== null) {
        window.clearTimeout(emailTimerRef.current);
      }
      if (whatsappTimerRef.current !== null) {
        window.clearTimeout(whatsappTimerRef.current);
      }
      if (briefTimerRef.current !== null) {
        window.clearTimeout(briefTimerRef.current);
      }
      if (submitResetTimerRef.current !== null) {
        window.clearTimeout(submitResetTimerRef.current);
      }
    };
  }, []);

  const nameError = touched.name ? validateField("name", name) : null;
  const emailError = touched.email ? validateField("email", email) : null;
  const messageError = touched.message
    ? validateField("message", message)
    : null;

  const trimmedMessageLength = message.trim().length;
  const messageReady = trimmedMessageLength >= MIN_MESSAGE_LENGTH;

  function markTouched(field: FieldName) {
    setTouched((prev) => (prev[field] ? prev : { ...prev, [field]: true }));
  }

  function resetSentStateIfNeeded() {
    if (submitVisualState === "sent") {
      if (submitResetTimerRef.current !== null) {
        window.clearTimeout(submitResetTimerRef.current);
        submitResetTimerRef.current = null;
      }
      setSubmitVisualState("idle");
    }
  }

  async function copyDirectEmail() {
    try {
      await navigator.clipboard.writeText(PROFILE.email);
      setCopiedEmail(true);
      if (emailTimerRef.current !== null) {
        window.clearTimeout(emailTimerRef.current);
      }
      emailTimerRef.current = window.setTimeout(() => {
        setCopiedEmail(false);
        emailTimerRef.current = null;
      }, 2200);
    } catch {
      // Clipboard blocked in restricted context
    }
  }

  async function copyDirectWhatsapp() {
    try {
      await navigator.clipboard.writeText(PROFILE.whatsappDisplay);
      setCopiedWhatsapp(true);
      if (whatsappTimerRef.current !== null) {
        window.clearTimeout(whatsappTimerRef.current);
      }
      whatsappTimerRef.current = window.setTimeout(() => {
        setCopiedWhatsapp(false);
        whatsappTimerRef.current = null;
      }, 2200);
    } catch {
      // Clipboard blocked in restricted context
    }
  }

  async function copyFormattedBrief(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedBrief(true);
      if (briefTimerRef.current !== null) {
        window.clearTimeout(briefTimerRef.current);
      }
      briefTimerRef.current = window.setTimeout(() => {
        setCopiedBrief(false);
        briefTimerRef.current = null;
      }, 2200);
    } catch {
      // Clipboard blocked in restricted context
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setResult(null);

    const nextNameErr = validateField("name", name);
    const nextEmailErr = validateField("email", email);
    const nextMessageErr = validateField("message", message);

    if (nextNameErr || nextEmailErr || nextMessageErr) {
      setTouched({ name: true, email: true, message: true });
      if (nextNameErr) {
        nameInputRef.current?.focus();
      } else if (nextEmailErr) {
        emailInputRef.current?.focus();
      } else {
        messageInputRef.current?.focus();
      }
      return;
    }

    setSubmitting(true);
    setSubmitVisualState("submitting");

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email,
          track,
          scope,
          message,
          companyWebsite,
        }),
      });

      const data = (await res.json()) as ApiResponse;
      if (!res.ok) {
        setError(data.error || "Please review the highlighted fields and try again.");
        setSubmitVisualState("idle");
        return;
      }

      setResult(data);
      setSubmitVisualState("sent");

      if (data.status === "sent") {
        setName("");
        setEmail("");
        setMessage("");
        setTouched({ name: false, email: false, message: false });
      }

      if (submitResetTimerRef.current !== null) {
        window.clearTimeout(submitResetTimerRef.current);
      }
      submitResetTimerRef.current = window.setTimeout(() => {
        setSubmitVisualState("idle");
        submitResetTimerRef.current = null;
      }, 3200);
    } catch {
      setError(
        `Network error submitting inquiry. You can email ${PROFILE.email} directly.`
      );
      setSubmitVisualState("idle");
    } finally {
      setSubmitting(false);
    }
  }

  const fieldErrorMotion = prefersReduced
    ? {
        initial: { opacity: 0 },
        animate: { opacity: 1 },
        exit: { opacity: 0 },
        transition: { duration: 0.14, ease: "easeOut" as const },
      }
    : {
        initial: { opacity: 0, transform: "translateY(-3px)" },
        animate: { opacity: 1, transform: "translateY(0px)" },
        exit: { opacity: 0, transform: "translateY(-3px)" },
        transition: { duration: 0.16, ease: EASE_OUT_EXPO },
      };

  const bannerMotion = prefersReduced
    ? {
        initial: { opacity: 0 },
        animate: { opacity: 1 },
        exit: { opacity: 0 },
        transition: { duration: 0.16, ease: "easeOut" as const },
      }
    : {
        initial: { opacity: 0, transform: "scale(0.98) translateY(6px)" },
        animate: { opacity: 1, transform: "scale(1) translateY(0px)" },
        exit: { opacity: 0, transform: "scale(0.98) translateY(-4px)" },
        transition: { duration: 0.2, ease: EASE_OUT_EXPO },
      };

  const baseInputClass =
    "w-full min-w-0 rounded-[var(--radius-sm)] border bg-[var(--bg-surface)] px-3.5 py-2.5 text-sm text-[var(--ink-primary)] placeholder:text-[var(--ink-muted)] transition-[border-color,box-shadow] duration-150 focus:outline-none";

  const validInputBorderClass =
    "border-[var(--border-strong)] focus:border-[var(--accent)] focus:ring-3 focus:ring-[var(--accent-ring)]";

  const invalidInputBorderClass =
    "border-[var(--status-danger)] focus:border-[var(--status-danger)] focus:ring-3 focus:ring-[var(--status-danger-border)]";

  return (
    <div className="grid gap-10 lg:grid-cols-12">
      {/* Left Column: Direct Channels & Availability */}
      <aside className="min-w-0 space-y-6 lg:col-span-5">
        <div>
          <h2 className="text-xl font-semibold tracking-[-0.02em] text-[var(--ink-primary)]">
            Direct Communication Channels
          </h2>
          <p className="mt-2 max-w-[44ch] text-sm leading-relaxed text-[var(--ink-secondary)]">
            Operating remotely worldwide from {PROFILE.utcOffsetLabel}. Fastest
            response via structured inquiry brief, direct email, or WhatsApp.
          </p>
        </div>

        <div className="space-y-3">
          {/* Email Direct Channel */}
          <div className="surface-elevated flex min-w-0 items-center justify-between gap-3 rounded-[var(--radius-md)] px-4 py-3.5">
            <div className="flex min-w-0 flex-1 items-center gap-3">
              <span
                aria-hidden="true"
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--radius-sm)] bg-[var(--accent-soft)] text-[var(--accent-deep)]"
              >
                <EnvelopeSimple size={17} weight="bold" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="font-mono text-[11px] text-[var(--ink-muted)]">
                  Email
                </div>
                <a
                  href={`mailto:${PROFILE.email}`}
                  className="mt-0.5 block truncate font-mono text-xs font-medium text-[var(--ink-primary)] transition-colors duration-150 hover:text-[var(--accent-deep)]"
                >
                  {PROFILE.email}
                </a>
              </div>
            </div>

            <button
              type="button"
              onClick={copyDirectEmail}
              aria-label={
                copiedEmail ? "Email copied" : `Copy ${PROFILE.email}`
              }
              className="btn-press inline-flex h-8 w-[80px] shrink-0 items-center justify-center rounded-[var(--radius-xs)] border border-[var(--border-strong)] bg-[var(--bg-surface)] font-mono text-[11px] font-medium text-[var(--ink-secondary)] hover:border-[var(--accent-border)] hover:text-[var(--ink-primary)]"
            >
              <BlurCrossfade
                contentKey={copiedEmail ? "copied" : "copy"}
                inline
                className="inline-flex items-center gap-1"
              >
                {copiedEmail ? (
                  <>
                    <Check
                      size={12}
                      weight="bold"
                      className="text-[var(--status-positive)]"
                      aria-hidden="true"
                    />
                    <span className="text-[var(--status-positive)]">
                      Copied
                    </span>
                  </>
                ) : (
                  <>
                    <Copy size={12} weight="bold" aria-hidden="true" />
                    <span>Copy</span>
                  </>
                )}
              </BlurCrossfade>
            </button>
          </div>
          <span className="sr-only" aria-live="polite">
            {copiedEmail ? "Email address copied to clipboard." : ""}
          </span>

          {/* Primary WhatsApp Direct Channel (harmonious elevated row + --status-positive icon badge) */}
          <div className="surface-elevated flex min-w-0 items-center justify-between gap-3 rounded-[var(--radius-md)] px-4 py-3.5">
            <a
              href={PROFILE.whatsappHref}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex min-w-0 flex-1 items-center gap-3 rounded-[var(--radius-xs)]"
            >
              <span
                aria-hidden="true"
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--radius-sm)] bg-[var(--status-positive-bg)] text-[var(--status-positive)]"
              >
                <WhatsappLogo size={18} weight="bold" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="inline-flex items-center gap-1 font-mono text-[11px] text-[var(--ink-muted)]">
                  <span>Primary WhatsApp</span>
                  <ArrowUpRight
                    size={12}
                    weight="bold"
                    className="hover-nudge-ne shrink-0 text-[var(--status-positive)]"
                    aria-hidden="true"
                  />
                </div>
                <div className="mt-0.5 truncate font-mono text-xs font-semibold tabular-nums text-[var(--ink-primary)] transition-colors duration-150 group-hover:text-[var(--status-positive)]">
                  {PROFILE.whatsappDisplay}
                </div>
              </div>
            </a>

            <button
              type="button"
              onClick={copyDirectWhatsapp}
              aria-label={
                copiedWhatsapp
                  ? "WhatsApp number copied"
                  : `Copy ${PROFILE.whatsappDisplay}`
              }
              className="btn-press inline-flex h-8 w-[80px] shrink-0 items-center justify-center rounded-[var(--radius-xs)] border border-[var(--border-strong)] bg-[var(--bg-surface)] font-mono text-[11px] font-medium text-[var(--ink-secondary)] hover:border-[var(--accent-border)] hover:text-[var(--ink-primary)]"
            >
              <BlurCrossfade
                contentKey={copiedWhatsapp ? "copied" : "copy"}
                inline
                className="inline-flex items-center gap-1"
              >
                {copiedWhatsapp ? (
                  <>
                    <Check
                      size={12}
                      weight="bold"
                      className="text-[var(--status-positive)]"
                      aria-hidden="true"
                    />
                    <span className="text-[var(--status-positive)]">
                      Copied
                    </span>
                  </>
                ) : (
                  <>
                    <Copy size={12} weight="bold" aria-hidden="true" />
                    <span>Copy</span>
                  </>
                )}
              </BlurCrossfade>
            </button>
          </div>
          <span className="sr-only" aria-live="polite">
            {copiedWhatsapp ? "WhatsApp number copied to clipboard." : ""}
          </span>
        </div>

        {/* Studio, GitHub & Resume Links */}
        <div className="border-t border-[var(--border-hairline)] pt-6">
          <div className="grid grid-cols-2 gap-2.5">
            <a
              href={PROFILE.studio.primaryUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-press group flex min-w-0 items-center justify-between gap-2 rounded-[var(--radius-sm)] border border-[var(--border-strong)] bg-[var(--bg-surface)] px-3.5 py-2.5 font-mono text-xs text-[var(--ink-primary)] hover:border-[var(--accent-border)] hover:text-[var(--accent-deep)]"
            >
              <span className="truncate">oxakalabs.xyz</span>
              <ArrowUpRight
                size={13}
                weight="bold"
                className="hover-nudge-ne shrink-0"
                aria-hidden="true"
              />
            </a>

            <a
              href={PROFILE.githubUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-press group flex min-w-0 items-center justify-between gap-2 rounded-[var(--radius-sm)] border border-[var(--border-strong)] bg-[var(--bg-surface)] px-3.5 py-2.5 font-mono text-xs text-[var(--ink-primary)] hover:border-[var(--accent-border)] hover:text-[var(--accent-deep)]"
            >
              <span className="truncate">GitHub</span>
              <ArrowUpRight
                size={13}
                weight="bold"
                className="hover-nudge-ne shrink-0"
                aria-hidden="true"
              />
            </a>
          </div>

          <a
            href={PROFILE.resumePdfPath}
            download={PROFILE.resumeFileName}
            className="btn-press mt-2.5 flex w-full items-center justify-center gap-2 rounded-[var(--radius-sm)] border border-[var(--border-strong)] bg-[var(--bg-surface)] px-4 py-2.5 text-xs font-medium text-[var(--ink-primary)] hover:border-[var(--accent-border)] hover:text-[var(--accent-deep)]"
          >
            <DownloadSimple size={14} weight="bold" aria-hidden="true" />
            <span>Download Resume</span>
          </a>
        </div>
      </aside>

      {/* Right Column: Structured Project Brief Workbench */}
      <div className="surface-elevated min-w-0 rounded-[var(--radius-lg)] p-6 sm:p-8 lg:col-span-7">
        <div className="border-b border-[var(--border-hairline)] pb-5">
          <h2 className="text-xl font-semibold tracking-[-0.02em] text-[var(--ink-primary)]">
            Outline your scope, timeline, or role
          </h2>
          <p className="mt-1.5 text-sm text-[var(--ink-secondary)]">
            Share key technical goals and target dates. Responses ship directly
            from {PROFILE.utcOffsetLabel}.
          </p>
        </div>

        <form onSubmit={handleSubmit} noValidate className="mt-6 space-y-5">
          {/* Honeypot field */}
          <div className="hidden" aria-hidden="true">
            <label htmlFor="companyWebsite">Company Website</label>
            <input
              id="companyWebsite"
              name="companyWebsite"
              tabIndex={-1}
              autoComplete="off"
              value={companyWebsite}
              onChange={(e) => setCompanyWebsite(e.target.value)}
            />
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            {/* Name Field */}
            <div className="flex min-w-0 flex-col gap-2">
              <label
                htmlFor="contact-name"
                className="text-xs font-semibold text-[var(--ink-primary)]"
              >
                Your Name <span className="text-[var(--accent)]">*</span>
              </label>
              <input
                ref={nameInputRef}
                id="contact-name"
                type="text"
                autoComplete="name"
                required
                aria-invalid={Boolean(nameError)}
                aria-describedby={nameError ? "contact-name-error" : undefined}
                value={name}
                onBlur={() => markTouched("name")}
                onChange={(e) => {
                  setName(e.target.value);
                  resetSentStateIfNeeded();
                }}
                placeholder="Adaeze Okafor"
                className={`${baseInputClass} ${
                  nameError ? invalidInputBorderClass : validInputBorderClass
                }`}
              />
              <AnimatePresence initial={false}>
                {nameError && (
                  <motion.p
                    key="name-error"
                    id="contact-name-error"
                    role="alert"
                    {...fieldErrorMotion}
                    className="text-xs font-medium text-[var(--status-danger)]"
                  >
                    {nameError}
                  </motion.p>
                )}
              </AnimatePresence>
            </div>

            {/* Email Field */}
            <div className="flex min-w-0 flex-col gap-2">
              <label
                htmlFor="contact-email"
                className="text-xs font-semibold text-[var(--ink-primary)]"
              >
                Work Email <span className="text-[var(--accent)]">*</span>
              </label>
              <input
                ref={emailInputRef}
                id="contact-email"
                type="email"
                autoComplete="email"
                required
                aria-invalid={Boolean(emailError)}
                aria-describedby={
                  emailError ? "contact-email-error" : undefined
                }
                value={email}
                onBlur={() => markTouched("email")}
                onChange={(e) => {
                  setEmail(e.target.value);
                  resetSentStateIfNeeded();
                }}
                placeholder="name@company.com"
                className={`${baseInputClass} ${
                  emailError ? invalidInputBorderClass : validInputBorderClass
                }`}
              />
              <AnimatePresence initial={false}>
                {emailError && (
                  <motion.p
                    key="email-error"
                    id="contact-email-error"
                    role="alert"
                    {...fieldErrorMotion}
                    className="text-xs font-medium text-[var(--status-danger)]"
                  >
                    {emailError}
                  </motion.p>
                )}
              </AnimatePresence>
            </div>
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            {/* Technical Pillar Select */}
            <div className="flex min-w-0 flex-col gap-2">
              <label
                htmlFor="contact-track"
                className="text-xs font-semibold text-[var(--ink-primary)]"
              >
                Technical Pillar
              </label>
              <div className="relative min-w-0">
                <select
                  id="contact-track"
                  value={track}
                  onChange={(e) => {
                    setTrackOverride(e.target.value);
                    resetSentStateIfNeeded();
                  }}
                  className={`${baseInputClass} ${validInputBorderClass} appearance-none pr-10`}
                >
                  {SERVICE_PILLARS.map((pillar) => (
                    <option key={pillar.id} value={pillar.shortLabel}>
                      {pillar.shortLabel}
                    </option>
                  ))}
                </select>
                <CaretDown
                  size={14}
                  weight="bold"
                  aria-hidden="true"
                  className="pointer-events-none absolute top-1/2 right-3.5 -translate-y-1/2 text-[var(--ink-muted)]"
                />
              </div>
            </div>

            {/* Engagement Type Select */}
            <div className="flex min-w-0 flex-col gap-2">
              <label
                htmlFor="contact-scope"
                className="text-xs font-semibold text-[var(--ink-primary)]"
              >
                Engagement Type
              </label>
              <div className="relative min-w-0">
                <select
                  id="contact-scope"
                  value={scope}
                  onChange={(e) => {
                    setScope(e.target.value);
                    resetSentStateIfNeeded();
                  }}
                  className={`${baseInputClass} ${validInputBorderClass} appearance-none pr-10`}
                >
                  {SCOPE_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
                <CaretDown
                  size={14}
                  weight="bold"
                  aria-hidden="true"
                  className="pointer-events-none absolute top-1/2 right-3.5 -translate-y-1/2 text-[var(--ink-muted)]"
                />
              </div>
            </div>
          </div>

          {/* Message Field + Tabular Counter */}
          <div className="flex min-w-0 flex-col gap-2">
            <div className="flex items-baseline justify-between gap-2">
              <label
                htmlFor="contact-message"
                className="text-xs font-semibold text-[var(--ink-primary)]"
              >
                Project Brief &amp; Requirements{" "}
                <span className="text-[var(--accent)]">*</span>
              </label>
              <span
                id="contact-message-hint"
                className={`font-mono text-[11px] tabular-nums transition-colors duration-150 ${
                  messageReady
                    ? "text-[var(--status-positive)]"
                    : messageError
                      ? "text-[var(--status-danger)]"
                      : "text-[var(--ink-muted)]"
                }`}
              >
                {messageReady
                  ? `${trimmedMessageLength} chars`
                  : `${trimmedMessageLength}/${MIN_MESSAGE_LENGTH} min`}
              </span>
            </div>

            <textarea
              ref={messageInputRef}
              id="contact-message"
              required
              rows={5}
              aria-invalid={Boolean(messageError)}
              aria-describedby={
                messageError
                  ? "contact-message-error contact-message-hint"
                  : "contact-message-hint"
              }
              value={message}
              onBlur={() => markTouched("message")}
              onChange={(e) => {
                setMessage(e.target.value);
                resetSentStateIfNeeded();
              }}
              placeholder="Share target architecture, deliverables, timeline, or collaboration context..."
              className={`${baseInputClass} ${
                messageError ? invalidInputBorderClass : validInputBorderClass
              } leading-relaxed`}
            />

            <AnimatePresence initial={false}>
              {messageError && (
                <motion.p
                  key="message-error"
                  id="contact-message-error"
                  role="alert"
                  {...fieldErrorMotion}
                  className="text-xs font-medium text-[var(--status-danger)]"
                >
                  {messageError}
                </motion.p>
              )}
            </AnimatePresence>
          </div>

          {/* Animated API Error & Success Banners */}
          <AnimatePresence mode="wait">
            {error && (
              <motion.div
                key="api-error"
                role="alert"
                {...bannerMotion}
                className="flex items-start gap-2.5 rounded-[var(--radius-sm)] border border-[var(--status-danger-border)] bg-[var(--status-danger-bg)] px-4 py-3.5 text-xs font-medium text-[var(--status-danger)]"
              >
                <WarningCircle
                  size={16}
                  weight="bold"
                  className="mt-0.5 shrink-0"
                  aria-hidden="true"
                />
                <span className="leading-relaxed">{error}</span>
              </motion.div>
            )}

            {result && !error && (
              <motion.div
                key={`api-result-${result.status ?? "ok"}`}
                role="status"
                {...bannerMotion}
                className="rounded-[var(--radius-md)] border border-[var(--status-positive-border)] bg-[var(--status-positive-bg)] p-4 text-sm text-[var(--ink-primary)]"
              >
                <div className="flex items-start gap-3">
                  <CheckCircle
                    size={18}
                    weight="bold"
                    className="mt-0.5 shrink-0 text-[var(--status-positive)]"
                    aria-hidden="true"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-[var(--ink-primary)]">
                      {result.status === "sent"
                        ? "Inquiry Delivered"
                        : "Brief Validated & Formatted"}
                    </p>
                    <p className="mt-1 text-xs leading-relaxed text-[var(--ink-secondary)]">
                      {result.message}
                    </p>

                    {result.status === "fallback" && result.mailtoUrl && (
                      <div className="mt-3.5 flex flex-wrap gap-2.5">
                        <a
                          href={result.mailtoUrl}
                          className="btn-press inline-flex items-center gap-1.5 rounded-[var(--radius-sm)] bg-[var(--bg-inverse)] px-3.5 py-2 text-xs font-medium text-[var(--ink-inverse)] hover:bg-[var(--bg-inverse-hover)]"
                        >
                          <EnvelopeSimple
                            size={14}
                            weight="bold"
                            aria-hidden="true"
                          />
                          <span>Open in Email Client</span>
                        </a>

                        {result.plainBrief && (
                          <>
                            <button
                              type="button"
                              onClick={() =>
                                copyFormattedBrief(result.plainBrief!)
                              }
                              className="btn-press inline-flex min-w-[164px] items-center justify-center rounded-[var(--radius-sm)] border border-[var(--border-strong)] bg-[var(--bg-surface)] px-3.5 py-2 text-xs font-medium text-[var(--ink-primary)] hover:border-[var(--accent-border)]"
                            >
                              <BlurCrossfade
                                contentKey={copiedBrief ? "copied" : "copy"}
                                inline
                                className="inline-flex items-center gap-1.5"
                              >
                                {copiedBrief ? (
                                  <>
                                    <Check
                                      size={13}
                                      weight="bold"
                                      className="text-[var(--status-positive)]"
                                      aria-hidden="true"
                                    />
                                    <span className="text-[var(--status-positive)]">
                                      Brief Copied
                                    </span>
                                  </>
                                ) : (
                                  <>
                                    <Copy
                                      size={13}
                                      weight="bold"
                                      aria-hidden="true"
                                    />
                                    <span>Copy Formatted Brief</span>
                                  </>
                                )}
                              </BlurCrossfade>
                            </button>
                            <span className="sr-only" aria-live="polite">
                              {copiedBrief
                                ? "Formatted project brief copied to clipboard."
                                : ""}
                            </span>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Form Footer & Tactile Submit Button */}
          <div className="flex flex-wrap items-center justify-between gap-4 border-t border-[var(--border-hairline)] pt-5">
            <p className="font-mono text-[11px] text-[var(--ink-muted)]">
              Wired for Resend SMTP · Zero data stored externally
            </p>

            <button
              type="submit"
              disabled={submitting}
              className="btn-press inline-flex min-w-[184px] items-center justify-center rounded-[var(--radius-sm)] bg-[var(--bg-inverse)] px-5 py-2.5 text-sm font-medium text-[var(--ink-inverse)] hover:bg-[var(--bg-inverse-hover)] disabled:cursor-not-allowed disabled:opacity-65"
            >
              <BlurCrossfade
                contentKey={submitVisualState}
                inline
                className="inline-flex items-center gap-2"
              >
                {submitVisualState === "submitting" ? (
                  <>
                    <svg
                      className="h-3.5 w-3.5 animate-[spin_600ms_linear_infinite] motion-reduce:animate-none"
                      viewBox="0 0 16 16"
                      fill="none"
                      aria-hidden="true"
                    >
                      <circle
                        cx="8"
                        cy="8"
                        r="6"
                        stroke="currentColor"
                        strokeOpacity="0.28"
                        strokeWidth="2"
                      />
                      <path
                        d="M14 8a6 6 0 0 0-6-6"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                      />
                    </svg>
                    <span>Sending Inquiry</span>
                  </>
                ) : submitVisualState === "sent" ? (
                  <>
                    <Check size={15} weight="bold" aria-hidden="true" />
                    <span>
                      {result?.status === "sent"
                        ? "Inquiry Sent"
                        : "Brief Ready"}
                    </span>
                  </>
                ) : (
                  <>
                    <PaperPlaneTilt
                      size={15}
                      weight="bold"
                      aria-hidden="true"
                    />
                    <span>Start a Project</span>
                  </>
                )}
              </BlurCrossfade>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
