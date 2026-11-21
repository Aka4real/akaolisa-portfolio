"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  ArrowUpRight,
  Check,
  CheckCircle,
  Copy,
  DownloadSimple,
  EnvelopeSimple,
  PaperPlaneTilt,
  WhatsappLogo,
} from "@phosphor-icons/react";
import { PROFILE, SERVICE_PILLARS } from "@/data/profile";
import { LiveClockBadge } from "@/components/ui/LiveClockBadge";

const SCOPE_OPTIONS = [
  "Full-Stack SaaS MVP / Build",
  "Multi-Agent AI / LLM Pipeline",
  "Quant Trading / FinTech Tooling",
  "HealthTech / Biomedical System",
  "Founding / Principal Role or Advisory",
];

interface ApiResponse {
  status?: "sent" | "fallback";
  mode?: string;
  message?: string;
  mailtoUrl?: string;
  plainBrief?: string;
  error?: string;
}

export function ContactForm() {
  const searchParams = useSearchParams();
  const initialTrackParam = searchParams.get("track");

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [track, setTrack] = useState("Full-Stack SaaS & Cloud Web Apps");
  const [scope, setScope] = useState(SCOPE_OPTIONS[0]);
  const [message, setMessage] = useState("");
  const [companyWebsite, setCompanyWebsite] = useState(""); // honeypot

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ApiResponse | null>(null);
  const [copiedEmail, setCopiedEmail] = useState(false);
  const [copiedBrief, setCopiedBrief] = useState(false);

  useEffect(() => {
    if (!initialTrackParam) return;
    const match = SERVICE_PILLARS.find((p) => p.id === initialTrackParam);
    if (match) {
      setTrack(match.label);
    }
  }, [initialTrackParam]);

  async function copyDirectEmail() {
    try {
      await navigator.clipboard.writeText(PROFILE.email);
      setCopiedEmail(true);
      window.setTimeout(() => setCopiedEmail(false), 2000);
    } catch {
      // Ignore if clipboard unavailable
    }
  }

  async function copyFormattedBrief(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedBrief(true);
      window.setTimeout(() => setCopiedBrief(false), 2000);
    } catch {
      // Ignore
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setResult(null);
    setSubmitting(true);

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
        setError(data.error || "Please double-check your form fields.");
        return;
      }

      setResult(data);
      if (data.status === "sent") {
        setName("");
        setEmail("");
        setMessage("");
      }
    } catch {
      setError(
        "Network error submitting inquiry. You can email akaolisaenwedo4real@gmail.com directly."
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="grid gap-8 lg:grid-cols-12">
      {/* Left Column: Direct Channels & Telemetry */}
      <aside className="space-y-6 lg:col-span-5">
        <div className="rounded-lg border border-[#E5E2DC] bg-white p-6">
          <LiveClockBadge />

          <h2 className="mt-5 text-lg font-semibold tracking-tight text-[#111214]">
            Direct Communication Channels
          </h2>
          <p className="mt-1.5 text-sm leading-relaxed text-[#4B4E54]">
            Operating remotely worldwide from {PROFILE.utcOffsetLabel}. Fastest
            response via structured email brief or direct WhatsApp.
          </p>

          <div className="mt-5 space-y-2.5">
            {/* Copyable Email */}
            <div className="flex items-center justify-between gap-2 rounded border border-[#E5E2DC] bg-[#FAF9F6] px-3.5 py-2.5">
              <div className="flex min-w-0 items-center gap-2.5">
                <EnvelopeSimple
                  size={16}
                  weight="bold"
                  className="shrink-0 text-[#1D4ED8]"
                />
                <div className="min-w-0">
                  <div className="font-mono text-[10px] uppercase tracking-wider text-[#6E727A]">
                    Email
                  </div>
                  <a
                    href={`mailto:${PROFILE.email}`}
                    className="block truncate font-mono text-xs font-medium text-[#111214] hover:text-[#1D4ED8]"
                  >
                    {PROFILE.email}
                  </a>
                </div>
              </div>
              <button
                type="button"
                onClick={copyDirectEmail}
                aria-label="Copy email address"
                className="btn-press inline-flex shrink-0 items-center gap-1 rounded border border-[#E5E2DC] bg-white px-2.5 py-1 font-mono text-[10.5px] text-[#4B4E54] hover:border-[#D1CDC4] hover:text-[#111214]"
              >
                {copiedEmail ? (
                  <>
                    <Check size={12} weight="bold" className="text-[#15803D]" />
                    Copied
                  </>
                ) : (
                  <>
                    <Copy size={12} weight="bold" />
                    Copy
                  </>
                )}
              </button>
            </div>

            {/* Primary WhatsApp ONLY */}
            <a
              href={PROFILE.whatsappHref}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-press flex items-center justify-between rounded border border-[#BBF7D0] bg-[#ECFDF5] px-3.5 py-3 transition-colors hover:border-[#15803D]"
            >
              <div className="flex items-center gap-2.5">
                <WhatsappLogo
                  size={18}
                  weight="bold"
                  className="text-[#15803D]"
                />
                <div>
                  <div className="font-mono text-[10px] uppercase tracking-wider text-[#15803D]">
                    Primary WhatsApp
                  </div>
                  <div className="font-mono text-xs font-semibold text-[#111214]">
                    {PROFILE.whatsappDisplay}
                  </div>
                </div>
              </div>
              <ArrowUpRight size={15} weight="bold" className="text-[#15803D]" />
            </a>
          </div>

          <div className="mt-6 grid grid-cols-2 gap-2 border-t border-[#E5E2DC] pt-5 font-mono text-xs">
            <a
              href={PROFILE.studio.primaryUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-press flex items-center justify-between rounded border border-[#E5E2DC] bg-[#FAF9F6] px-3 py-2 text-[#111214] hover:border-[#1D4ED8] hover:text-[#0F3D91]"
            >
              <span>oxakalabs.xyz</span>
              <ArrowUpRight size={13} weight="bold" />
            </a>
            <a
              href={PROFILE.githubUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-press flex items-center justify-between rounded border border-[#E5E2DC] bg-[#FAF9F6] px-3 py-2 text-[#111214] hover:border-[#1D4ED8] hover:text-[#0F3D91]"
            >
              <span>GitHub</span>
              <ArrowUpRight size={13} weight="bold" />
            </a>
          </div>

          <a
            href={PROFILE.resumePdfPath}
            download={PROFILE.resumeFileName}
            className="btn-press mt-3 flex w-full items-center justify-center gap-2 rounded border border-[#E5E2DC] bg-white px-4 py-2.5 font-mono text-xs font-medium text-[#111214] hover:border-[#D1CDC4] hover:bg-[#F3F1EC]"
          >
            <DownloadSimple size={14} weight="bold" />
            Download Resume PDF
          </a>
        </div>
      </aside>

      {/* Right Column: Structured Project Brief Form */}
      <div className="rounded-lg border border-[#E5E2DC] bg-white p-6 sm:p-8 lg:col-span-7">
        <div className="border-b border-[#E5E2DC] pb-4">
          <p className="font-mono text-[10.5px] font-semibold uppercase tracking-widest text-[#0F3D91]">
            Project Inquiry Specification
          </p>
          <h2 className="mt-1 text-xl font-semibold tracking-tight text-[#111214]">
            Outline your scope, timeline, or role
          </h2>
        </div>

        <form onSubmit={handleSubmit} className="mt-6 space-y-5">
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

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label
                htmlFor="contact-name"
                className="block font-mono text-[11px] font-semibold uppercase tracking-wider text-[#4B4E54]"
              >
                Your Name *
              </label>
              <input
                id="contact-name"
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Adaeze Okafor"
                className="mt-1.5 w-full rounded border border-[#E5E2DC] bg-[#FAF9F6] px-3.5 py-2.5 text-sm text-[#111214] placeholder:text-[#6E727A] focus:border-[#1D4ED8] focus:bg-white focus:outline-none"
              />
            </div>

            <div>
              <label
                htmlFor="contact-email"
                className="block font-mono text-[11px] font-semibold uppercase tracking-wider text-[#4B4E54]"
              >
                Work Email *
              </label>
              <input
                id="contact-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@company.com"
                className="mt-1.5 w-full rounded border border-[#E5E2DC] bg-[#FAF9F6] px-3.5 py-2.5 text-sm text-[#111214] placeholder:text-[#6E727A] focus:border-[#1D4ED8] focus:bg-white focus:outline-none"
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label
                htmlFor="contact-track"
                className="block font-mono text-[11px] font-semibold uppercase tracking-wider text-[#4B4E54]"
              >
                Technical Pillar
              </label>
              <select
                id="contact-track"
                value={track}
                onChange={(e) => setTrack(e.target.value)}
                className="mt-1.5 w-full rounded border border-[#E5E2DC] bg-[#FAF9F6] px-3.5 py-2.5 text-sm text-[#111214] focus:border-[#1D4ED8] focus:bg-white focus:outline-none"
              >
                {SERVICE_PILLARS.map((pillar) => (
                  <option key={pillar.id} value={pillar.label}>
                    {pillar.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="contact-scope"
                className="block font-mono text-[11px] font-semibold uppercase tracking-wider text-[#4B4E54]"
              >
                Engagement Type
              </label>
              <select
                id="contact-scope"
                value={scope}
                onChange={(e) => setScope(e.target.value)}
                className="mt-1.5 w-full rounded border border-[#E5E2DC] bg-[#FAF9F6] px-3.5 py-2.5 text-sm text-[#111214] focus:border-[#1D4ED8] focus:bg-white focus:outline-none"
              >
                {SCOPE_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label
              htmlFor="contact-message"
              className="block font-mono text-[11px] font-semibold uppercase tracking-wider text-[#4B4E54]"
            >
              Project Brief / Technical Requirements *
            </label>
            <textarea
              id="contact-message"
              required
              rows={5}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Share target architecture, deliverables, timeline, or collaboration context..."
              className="mt-1.5 w-full rounded border border-[#E5E2DC] bg-[#FAF9F6] px-3.5 py-2.5 text-sm leading-relaxed text-[#111214] placeholder:text-[#6E727A] focus:border-[#1D4ED8] focus:bg-white focus:outline-none"
            />
          </div>

          {error && (
            <div
              role="alert"
              className="rounded border border-[#FECACA] bg-[#FEF2F2] px-4 py-3 text-xs font-medium text-[#991B1B]"
            >
              {error}
            </div>
          )}

          {result && (
            <div
              role="status"
              className="rounded-lg border border-[#BBF7D0] bg-[#ECFDF5] p-4 text-sm text-[#111214]"
            >
              <div className="flex items-start gap-2.5">
                <CheckCircle
                  size={18}
                  weight="bold"
                  className="mt-0.5 shrink-0 text-[#15803D]"
                />
                <div className="flex-1">
                  <p className="font-semibold text-[#111214]">
                    {result.status === "sent"
                      ? "Inquiry Delivered"
                      : "Brief Validated & Formatted"}
                  </p>
                  <p className="mt-1 text-xs leading-relaxed text-[#4B4E54]">
                    {result.message}
                  </p>

                  {result.status === "fallback" && result.mailtoUrl && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      <a
                        href={result.mailtoUrl}
                        className="btn-press inline-flex items-center gap-1.5 rounded bg-[#111214] px-3.5 py-2 font-mono text-xs font-medium text-white hover:bg-[#1D4ED8]"
                      >
                        <EnvelopeSimple size={14} weight="bold" />
                        Open in Email Client
                      </a>
                      {result.plainBrief && (
                        <button
                          type="button"
                          onClick={() => copyFormattedBrief(result.plainBrief!)}
                          className="btn-press inline-flex items-center gap-1.5 rounded border border-[#D1CDC4] bg-white px-3.5 py-2 font-mono text-xs font-medium text-[#111214] hover:border-[#1D4ED8]"
                        >
                          {copiedBrief ? (
                            <>
                              <Check
                                size={13}
                                weight="bold"
                                className="text-[#15803D]"
                              />
                              Brief Copied
                            </>
                          ) : (
                            <>
                              <Copy size={13} weight="bold" />
                              Copy Formatted Brief
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
            <p className="font-mono text-[10.5px] text-[#6E727A]">
              Wired for Resend SMTP · Zero data stored externally
            </p>
            <button
              type="submit"
              disabled={submitting}
              className="btn-press inline-flex items-center gap-2 rounded bg-[#111214] px-5 py-2.5 text-sm font-medium text-white hover:bg-[#1D4ED8] disabled:cursor-not-allowed disabled:opacity-50"
            >
              <PaperPlaneTilt size={15} weight="bold" />
              {submitting ? "Sending Inquiry..." : "Submit Project Inquiry"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
