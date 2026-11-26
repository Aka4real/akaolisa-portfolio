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
} from "@phosphor-icons/react";
import { PROFILE, SERVICE_PILLARS } from "@/data/profile";
import { LiveClockBadge } from "@/components/ui/LiveClockBadge";
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
      if (emailTimerRef.current !== null)
        window.clearTimeout(emailTimerRef.current);
      if (whatsappTimerRef.current !== null)
        window.clearTimeout(whatsappTimerRef.current);
      if (briefTimerRef.current !== null)
        window.clearTimeout(briefTimerRef.current);
      if (submitResetTimerRef.current !== null)
        window.clearTimeout(submitResetTimerRef.current);
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
      if (emailTimerRef.current !== null)
        window.clearTimeout(emailTimerRef.current);
      emailTimerRef.current = window.setTimeout(() => {
        setCopiedEmail(false);
        emailTimerRef.current = null;
      }, 2200);
    } catch {
      // Clipboard blocked
    }
  }

  async function copyDirectWhatsapp() {
    try {
      await navigator.clipboard.writeText(PROFILE.whatsappDisplay);
      setCopiedWhatsapp(true);
      if (whatsappTimerRef.current !== null)
        window.clearTimeout(whatsappTimerRef.current);
      whatsappTimerRef.current = window.setTimeout(() => {
        setCopiedWhatsapp(false);
        whatsappTimerRef.current = null;
      }, 2200);
    } catch {
      // Clipboard blocked
    }
  }

  async function copyFormattedBrief(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedBrief(true);
      if (briefTimerRef.current !== null)
        window.clearTimeout(briefTimerRef.current);
      briefTimerRef.current = window.setTimeout(() => {
        setCopiedBrief(false);
        briefTimerRef.current = null;
      }, 2200);
    } catch {
      // Clipboard blocked
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
        setError(
          data.error || "Please review the highlighted fields and try again."
        );
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
        initial: { opacity: 0, y: -3 },
        animate: { opacity: 1, y: 0 },
        exit: { opacity: 0, y: -3 },
        transition: { duration: 0.16, ease: EASE_OUT_EXPO },
      };

  const baseInputClass =
    "type-sm w-full min-w-0 rounded-[var(--radius-sm)] border bg-[var(--bg-surface)] px-3.5 py-2.5 text-[var(--ink-primary)] placeholder:text-[var(--ink-muted)] transition-[border-color,box-shadow] duration-150 focus:outline-none";

  const validInputBorderClass =
    "border-[var(--border-strong)] focus:border-[var(--accent)] focus:ring-3 focus:ring-[var(--accent-ring)]";

  const invalidInputBorderClass =
    "border-[var(--status-danger)] focus:border-[var(--status-danger)] focus:ring-3 focus:ring-[var(--status-danger-border)]";

  return (
    <div className="grid gap-12 lg:grid-cols-12 lg:gap-16">
      {/* Left 5 Cols: Open Direct Channels Ledger */}
      <aside className="min-w-0 space-y-8 lg:col-span-5">
        <div>
          <h2 className="type-heading text-[var(--ink-primary)]">
            Direct channels
          </h2>
          <p className="type-body mt-3 max-w-[44ch] text-[var(--ink-secondary)]">
            Operating remotely worldwide from {PROFILE.utcOffsetLabel}. Fastest
            response via structured brief, email, or WhatsApp.
          </p>
          <div className="mt-4">
            <LiveClockBadge compact />
          </div>
        </div>

        <div className="divide-y divide-[var(--border-hairline)] border-y border-[var(--border-hairline)]">
          {/* Email Row */}
          <div className="flex items-center justify-between gap-4 py-5">
            <div className="min-w-0">
              <p className="type-sm text-[var(--ink-muted)]">Email</p>
              <a
                href={`mailto:${PROFILE.email}`}
                className="type-body mt-0.5 block truncate font-medium text-[var(--ink-primary)] transition-colors duration-150 hover:text-[var(--accent-deep)]"
              >
                {PROFILE.email}
              </a>
            </div>
            <button
              type="button"
              onClick={copyDirectEmail}
              aria-label={
                copiedEmail ? "Email copied" : `Copy ${PROFILE.email}`
              }
              className="type-sm btn-press inline-flex h-9 shrink-0 items-center justify-center rounded-[var(--radius-sm)] border border-[var(--border-strong)] bg-[var(--bg-surface)] px-3.5 font-medium text-[var(--ink-secondary)] hover:border-[var(--accent)] hover:text-[var(--ink-primary)]"
            >
              <BlurCrossfade
                contentKey={copiedEmail ? "copied" : "copy"}
                inline
                className="inline-flex items-center gap-1.5"
              >
                {copiedEmail ? (
                  <>
                    <Check
                      size={14}
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
                    <Copy size={14} weight="bold" aria-hidden="true" />
                    <span>Copy</span>
                  </>
                )}
              </BlurCrossfade>
            </button>
          </div>
          <span className="sr-only" aria-live="polite">
            {copiedEmail ? "Email address copied to clipboard." : ""}
          </span>

          {/* Primary WhatsApp Row */}
          <div className="flex items-center justify-between gap-4 py-5">
            <div className="min-w-0">
              <p className="type-sm text-[var(--ink-muted)]">
                Primary WhatsApp
              </p>
              <a
                href={PROFILE.whatsappHref}
                target="_blank"
                rel="noopener noreferrer"
                className="type-body group mt-0.5 inline-flex items-center gap-1.5 font-medium tabular-nums text-[var(--ink-primary)] transition-colors duration-150 hover:text-[var(--status-positive)]"
              >
                <span>{PROFILE.whatsappDisplay}</span>
                <ArrowUpRight
                  size={15}
                  weight="bold"
                  className="hover-nudge-ne shrink-0 text-[var(--status-positive)]"
                  aria-hidden="true"
                />
              </a>
            </div>
            <button
              type="button"
              onClick={copyDirectWhatsapp}
              aria-label={
                copiedWhatsapp
                  ? "WhatsApp number copied"
                  : `Copy ${PROFILE.whatsappDisplay}`
              }
              className="type-sm btn-press inline-flex h-9 shrink-0 items-center justify-center rounded-[var(--radius-sm)] border border-[var(--border-strong)] bg-[var(--bg-surface)] px-3.5 font-medium text-[var(--ink-secondary)] hover:border-[var(--accent)] hover:text-[var(--ink-primary)]"
            >
              <BlurCrossfade
                contentKey={copiedWhatsapp ? "copied" : "copy"}
                inline
                className="inline-flex items-center gap-1.5"
              >
                {copiedWhatsapp ? (
                  <>
                    <Check
                      size={14}
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
                    <Copy size={14} weight="bold" aria-hidden="true" />
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

        {/* Studio, GitHub & Resume Text Links */}
        <div className="type-sm flex flex-wrap items-center gap-x-6 gap-y-3">
          <a
            href={PROFILE.studio.primaryUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="group inline-flex items-center gap-1 font-medium text-[var(--ink-primary)] transition-colors duration-150 hover:text-[var(--accent-deep)]"
          >
            <span>oxakalabs.xyz</span>
            <ArrowUpRight
              size={14}
              weight="bold"
              className="hover-nudge-ne"
              aria-hidden="true"
            />
          </a>
          <a
            href={PROFILE.githubUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="group inline-flex items-center gap-1 font-medium text-[var(--ink-primary)] transition-colors duration-150 hover:text-[var(--accent-deep)]"
          >
            <span>GitHub</span>
            <ArrowUpRight
              size={14}
              weight="bold"
              className="hover-nudge-ne"
              aria-hidden="true"
            />
          </a>
          <a
            href={PROFILE.resumePdfPath}
            download={PROFILE.resumeFileName}
            className="inline-flex items-center gap-1.5 font-medium text-[var(--accent-deep)] transition-colors duration-150 hover:text-[var(--accent)]"
          >
            <DownloadSimple size={15} weight="bold" aria-hidden="true" />
            <span>Download resume PDF</span>
          </a>
        </div>
      </aside>

      {/* Right 7 Cols: Structured Inquiry Workbench */}
      <div className="min-w-0 rounded-[var(--radius-md)] border border-[var(--border-hairline)] bg-[var(--bg-surface)] p-6 sm:p-8 lg:col-span-7">
        <div className="border-b border-[var(--border-hairline)] pb-6">
          <h2 className="type-heading text-[var(--ink-primary)]">
            Outline your scope, timeline, or role
          </h2>
          <p className="type-body mt-2 text-[var(--ink-secondary)]">
            Share key technical goals and target dates. Responses ship directly
            from {PROFILE.utcOffsetLabel}.
          </p>
        </div>

        <form onSubmit={handleSubmit} noValidate className="mt-7 space-y-6">
          <div className="hidden" aria-hidden="true">
            <label htmlFor="companyWebsite">Company website</label>
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
            <div className="flex min-w-0 flex-col gap-2">
              <label
                htmlFor="contact-name"
                className="type-sm font-medium text-[var(--ink-primary)]"
              >
                Your name <span className="text-[var(--accent)]">*</span>
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
                    className="type-sm font-medium text-[var(--status-danger)]"
                  >
                    {nameError}
                  </motion.p>
                )}
              </AnimatePresence>
            </div>

            <div className="flex min-w-0 flex-col gap-2">
              <label
                htmlFor="contact-email"
                className="type-sm font-medium text-[var(--ink-primary)]"
              >
                Work email <span className="text-[var(--accent)]">*</span>
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
                    className="type-sm font-medium text-[var(--status-danger)]"
                  >
                    {emailError}
                  </motion.p>
                )}
              </AnimatePresence>
            </div>
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <div className="flex min-w-0 flex-col gap-2">
              <label
                htmlFor="contact-track"
                className="type-sm font-medium text-[var(--ink-primary)]"
              >
                Technical discipline
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
                  size={15}
                  weight="bold"
                  aria-hidden="true"
                  className="pointer-events-none absolute top-1/2 right-3.5 -translate-y-1/2 text-[var(--ink-muted)]"
                />
              </div>
            </div>

            <div className="flex min-w-0 flex-col gap-2">
              <label
                htmlFor="contact-scope"
                className="type-sm font-medium text-[var(--ink-primary)]"
              >
                Engagement type
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
                  size={15}
                  weight="bold"
                  aria-hidden="true"
                  className="pointer-events-none absolute top-1/2 right-3.5 -translate-y-1/2 text-[var(--ink-muted)]"
                />
              </div>
            </div>
          </div>

          <div className="flex min-w-0 flex-col gap-2">
            <div className="flex items-baseline justify-between gap-2">
              <label
                htmlFor="contact-message"
                className="type-sm font-medium text-[var(--ink-primary)]"
              >
                Project brief and requirements{" "}
                <span className="text-[var(--accent)]">*</span>
              </label>
              <span
                id="contact-message-hint"
                className={`type-sm tabular-nums transition-colors duration-150 ${
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
                  className="type-sm font-medium text-[var(--status-danger)]"
                >
                  {messageError}
                </motion.p>
              )}
            </AnimatePresence>
          </div>

          <AnimatePresence mode="wait">
            {error && (
              <div
                role="alert"
                className="type-sm flex items-start gap-2.5 rounded-[var(--radius-sm)] border border-[var(--status-danger-border)] bg-[var(--status-danger-bg)] px-4 py-3.5 font-medium text-[var(--status-danger)]"
              >
                <WarningCircle
                  size={17}
                  weight="bold"
                  className="mt-0.5 shrink-0"
                  aria-hidden="true"
                />
                <span>{error}</span>
              </div>
            )}

            {result && !error && (
              <div
                role="status"
                className="rounded-[var(--radius-sm)] border border-[var(--status-positive-border)] bg-[var(--status-positive-bg)] p-4 text-[var(--ink-primary)]"
              >
                <div className="flex items-start gap-3">
                  <CheckCircle
                    size={18}
                    weight="bold"
                    className="mt-0.5 shrink-0 text-[var(--status-positive)]"
                    aria-hidden="true"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="type-subhead text-[var(--ink-primary)]">
                      {result.status === "sent"
                        ? "Inquiry delivered"
                        : "Brief validated and recorded"}
                    </p>
                    <p className="type-sm mt-1 text-[var(--ink-secondary)]">
                      {result.message}
                    </p>

                    {result.status === "fallback" && result.mailtoUrl && (
                      <div className="mt-4 flex flex-wrap items-center gap-4">
                        <a
                          href={result.mailtoUrl}
                          className="type-sm btn-press inline-flex items-center gap-1.5 rounded-[var(--radius-sm)] bg-[var(--bg-marine)] px-4 py-2 font-medium text-[var(--ink-on-marine)] hover:bg-[var(--accent)]"
                        >
                          <EnvelopeSimple
                            size={15}
                            weight="bold"
                            aria-hidden="true"
                          />
                          <span>Open in email client</span>
                        </a>

                        {result.plainBrief && (
                          <button
                            type="button"
                            onClick={() =>
                              copyFormattedBrief(result.plainBrief!)
                            }
                            className="type-sm font-medium text-[var(--accent-deep)] underline decoration-[var(--accent-border)] transition-colors duration-150 hover:text-[var(--accent)]"
                          >
                            {copiedBrief
                              ? "Brief copied to clipboard"
                              : "Copy formatted brief"}
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </AnimatePresence>

          <div className="flex flex-wrap items-center justify-between gap-4 border-t border-[var(--border-hairline)] pt-6">
            <p className="type-sm text-[var(--ink-muted)]">
              Wired for Resend SMTP and Studio Console triage
            </p>

            <button
              type="submit"
              disabled={submitting}
              className="btn-press type-sm inline-flex min-w-[184px] items-center justify-center gap-2 rounded-[var(--radius-sm)] bg-[var(--bg-marine)] px-6 py-3 font-medium text-[var(--ink-on-marine)] hover:bg-[var(--accent)] disabled:cursor-not-allowed disabled:opacity-65"
            >
              {submitVisualState === "submitting" ? (
                <span>Sending inquiry...</span>
              ) : submitVisualState === "sent" ? (
                <>
                  <Check size={15} weight="bold" aria-hidden="true" />
                  <span>
                    {result?.status === "sent" ? "Inquiry sent" : "Brief ready"}
                  </span>
                </>
              ) : (
                <>
                  <PaperPlaneTilt size={15} weight="bold" aria-hidden="true" />
                  <span>Send project brief</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
