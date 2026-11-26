"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  Check,
  Copy,
  FilePdf,
  Sparkle,
} from "@phosphor-icons/react";
import { PROFILE } from "@/data/profile";
import { BlurCrossfade } from "@/components/ui/MotionPrimitives";

interface SiteFooterProps {
  onOpenResume: () => void;
  onOpenAssistant: () => void;
}

export function SiteFooter({
  onOpenResume,
  onOpenAssistant,
}: SiteFooterProps) {
  const [copied, setCopied] = useState(false);
  const copyTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (copyTimeoutRef.current !== null) {
        window.clearTimeout(copyTimeoutRef.current);
      }
    };
  }, []);

  async function copyEmail() {
    try {
      await navigator.clipboard.writeText(PROFILE.email);
      setCopied(true);
      if (copyTimeoutRef.current !== null) {
        window.clearTimeout(copyTimeoutRef.current);
      }
      copyTimeoutRef.current = window.setTimeout(() => {
        setCopied(false);
        copyTimeoutRef.current = null;
      }, 2200);
    } catch {
      // Clipboard blocked in restricted context
    }
  }

  return (
    <footer className="border-t border-[var(--border-hairline)] bg-[var(--bg-subtle)]">
      <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="grid gap-10 md:grid-cols-12">
          {/* Identity */}
          <div className="md:col-span-5">
            <div className="flex items-center gap-2.5">
              <span className="flex h-7 w-7 items-center justify-center rounded-[8px] bg-[var(--bg-inverse)] font-mono text-[11px] font-semibold text-[var(--ink-inverse)]">
                {PROFILE.monogram}
              </span>
              <span className="text-sm font-semibold tracking-[0.05em] text-[var(--ink-primary)]">
                {PROFILE.displayName.toUpperCase()}
              </span>
            </div>
            <p className="mt-3.5 max-w-sm text-sm leading-relaxed text-[var(--ink-secondary)]">
              Principal Full-Stack, DevOps &amp; Cloud Infrastructure, AI Agent
              &amp; Quantitative Systems Engineer at{" "}
              <a
                href={PROFILE.studio.primaryUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-[var(--ink-primary)] underline decoration-[var(--border-strong)] transition-colors duration-150 hover:text-[var(--accent-deep)] hover:decoration-[var(--accent)]"
              >
                {PROFILE.studio.name}
              </a>
              . Licensed Biomedical Scientist (B.MLS) applying empirical rigor
              to production software and cloud operations.
            </p>
          </div>

          {/* Directory */}
          <div className="md:col-span-2">
            <h3 className="font-mono text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--ink-muted)]">
              Directory
            </h3>
            <ul className="mt-3.5 space-y-2.5 text-sm">
              <li>
                <Link
                  href="/"
                  className="text-[var(--ink-secondary)] transition-colors duration-150 hover:text-[var(--ink-primary)]"
                >
                  Home
                </Link>
              </li>
              <li>
                <Link
                  href="/work"
                  className="text-[var(--ink-secondary)] transition-colors duration-150 hover:text-[var(--ink-primary)]"
                >
                  Selected Work
                </Link>
              </li>
              <li>
                <Link
                  href="/experience"
                  className="text-[var(--ink-secondary)] transition-colors duration-150 hover:text-[var(--ink-primary)]"
                >
                  Experience &amp; Lab
                </Link>
              </li>
              <li>
                <Link
                  href="/contact"
                  className="text-[var(--ink-secondary)] transition-colors duration-150 hover:text-[var(--ink-primary)]"
                >
                  Contact
                </Link>
              </li>
            </ul>
          </div>

          {/* Ecosystem */}
          <div className="md:col-span-2">
            <h3 className="font-mono text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--ink-muted)]">
              Ecosystem
            </h3>
            <ul className="mt-3.5 space-y-2.5 text-sm">
              <li>
                <a
                  href={PROFILE.studio.primaryUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group inline-flex items-center gap-1 text-[var(--ink-secondary)] transition-colors duration-150 hover:text-[var(--accent-deep)]"
                >
                  oxakalabs.xyz
                  <ArrowUpRight
                    size={13}
                    weight="bold"
                    className="hover-nudge-ne shrink-0"
                    aria-hidden="true"
                  />
                </a>
              </li>
              <li>
                <a
                  href="https://ggravitator.xyz"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group inline-flex items-center gap-1 text-[var(--ink-secondary)] transition-colors duration-150 hover:text-[var(--accent-deep)]"
                >
                  ggravitator.xyz
                  <ArrowUpRight
                    size={13}
                    weight="bold"
                    className="hover-nudge-ne shrink-0"
                    aria-hidden="true"
                  />
                </a>
              </li>
              <li>
                <a
                  href={PROFILE.githubUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group inline-flex items-center gap-1 text-[var(--ink-secondary)] transition-colors duration-150 hover:text-[var(--accent-deep)]"
                >
                  GitHub
                  <ArrowUpRight
                    size={13}
                    weight="bold"
                    className="hover-nudge-ne shrink-0"
                    aria-hidden="true"
                  />
                </a>
              </li>
              {/* Temporarily removed per user request: blaireaesthetics.shop */}
              <li>
                <a
                  href="https://aifycycle.vercel.app"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group inline-flex items-center gap-1 text-[var(--ink-secondary)] transition-colors duration-150 hover:text-[var(--accent-deep)]"
                >
                  aifycycle
                  <ArrowUpRight
                    size={13}
                    weight="bold"
                    className="hover-nudge-ne shrink-0"
                    aria-hidden="true"
                  />
                </a>
              </li>
            </ul>
          </div>

          {/* Direct Access */}
          <div className="md:col-span-3">
            <h3 className="font-mono text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--ink-muted)]">
              Direct Access
            </h3>
            <div className="mt-3.5 space-y-2">
              <Link
                href="/contact"
                className="btn-press group flex w-full items-center justify-center gap-2 rounded-[var(--radius-sm)] bg-[var(--bg-inverse)] px-3.5 py-2.5 text-xs font-medium text-[var(--ink-inverse)] hover:bg-[var(--bg-inverse-hover)]"
              >
                Start a Project
                <ArrowRight
                  size={13}
                  weight="bold"
                  className="hover-nudge-x shrink-0"
                  aria-hidden="true"
                />
              </Link>

              <button
                type="button"
                onClick={copyEmail}
                aria-label={copied ? "Email copied" : `Copy ${PROFILE.email}`}
                className="btn-press flex w-full items-center justify-between gap-2 rounded-[var(--radius-sm)] border border-[var(--border-hairline)] bg-[var(--bg-surface)] px-3 py-2 text-left text-[11px] text-[var(--ink-primary)] hover:border-[var(--border-strong)]"
              >
                <span className="min-w-0 truncate font-mono text-[11px] text-[var(--ink-secondary)]">
                  {PROFILE.email}
                </span>
                <span className="inline-flex min-w-[60px] shrink-0 items-center justify-end font-mono text-[11px] font-medium">
                  <BlurCrossfade
                    contentKey={copied ? "copied" : "copy"}
                    inline
                    className="inline-flex items-center gap-1"
                  >
                    {copied ? (
                      <>
                        <Check
                          size={13}
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
                        <Copy
                          size={13}
                          weight="bold"
                          className="text-[var(--ink-muted)]"
                          aria-hidden="true"
                        />
                        <span className="text-[var(--ink-muted)]">Copy</span>
                      </>
                    )}
                  </BlurCrossfade>
                </span>
              </button>
              <span className="sr-only" aria-live="polite">
                {copied ? "Email address copied to clipboard." : ""}
              </span>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={onOpenResume}
                  className="btn-press inline-flex items-center justify-center gap-1.5 rounded-[var(--radius-sm)] border border-[var(--border-hairline)] bg-[var(--bg-surface)] px-2.5 py-2 text-xs font-medium text-[var(--ink-primary)] hover:border-[var(--border-strong)]"
                >
                  <FilePdf
                    size={14}
                    weight="bold"
                    className="text-[var(--ink-secondary)]"
                    aria-hidden="true"
                  />
                  Resume PDF
                </button>
                <button
                  type="button"
                  onClick={onOpenAssistant}
                  className="btn-press inline-flex items-center justify-center gap-1.5 rounded-[var(--radius-sm)] border border-[var(--accent-border)] bg-[var(--accent-soft)] px-2.5 py-2 text-xs font-medium text-[var(--accent-deep)] hover:border-[var(--accent)] hover:bg-[var(--accent)] hover:text-white"
                >
                  <Sparkle size={14} weight="bold" aria-hidden="true" />
                  Ask AI
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-12 flex flex-col items-start justify-between gap-2 border-t border-[var(--border-hairline)] pt-6 text-xs text-[var(--ink-muted)] sm:flex-row sm:items-center">
          <p>
            &copy; {new Date().getFullYear()} {PROFILE.legalName} ·{" "}
            {PROFILE.studio.name}
          </p>
          <p className="font-mono text-[11px] tabular-nums text-[var(--ink-muted)]">
            {PROFILE.locationLabel} ({PROFILE.utcOffsetLabel})
          </p>
        </div>
      </div>
    </footer>
  );
}
