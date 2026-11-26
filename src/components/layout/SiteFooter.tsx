"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, Check, Copy } from "@phosphor-icons/react";
import { PROFILE } from "@/data/profile";
import { LiveClockBadge } from "@/components/ui/LiveClockBadge";
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
    <footer className="border-t border-[var(--border-on-marine)] bg-[var(--bg-marine)] text-[var(--ink-on-marine)]">
      <div className="mx-auto max-w-7xl px-5 py-16 sm:px-8 lg:px-10">
        <div className="grid gap-12 md:grid-cols-12">
          {/* Brand Statement */}
          <div className="md:col-span-5">
            <Link
              href="/"
              className="type-wordmark inline-block text-[var(--ink-on-marine)] transition-colors duration-150 hover:text-[var(--accent-bright)]"
            >
              {PROFILE.displayName}
            </Link>
            <p className="type-sm mt-4 max-w-[44ch] text-[var(--ink-on-marine-secondary)]">
              Founder at{" "}
              <a
                href={PROFILE.studio.primaryUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-[var(--ink-on-marine)] underline decoration-[var(--border-on-marine-strong)] transition-colors duration-150 hover:text-[var(--accent-bright)] hover:decoration-[var(--accent-bright)]"
              >
                {PROFILE.studio.name}
              </a>{" "}
              and licensed Biomedical Scientist (B.MLS). Shipping Next.js SaaS,
              multi-agent systems, and quantitative infrastructure worldwide.
            </p>
            <div className="mt-5">
              <LiveClockBadge compact tone="marine" />
            </div>
          </div>

          {/* Navigation */}
          <div className="md:col-span-2">
            <h3 className="type-sm font-semibold text-[var(--ink-on-marine)]">
              Navigation
            </h3>
            <ul className="type-sm mt-4 space-y-2.5 text-[var(--ink-on-marine-secondary)]">
              <li>
                <Link
                  href="/"
                  className="transition-colors duration-150 hover:text-[var(--ink-on-marine)]"
                >
                  Overview
                </Link>
              </li>
              <li>
                <Link
                  href="/work"
                  className="transition-colors duration-150 hover:text-[var(--ink-on-marine)]"
                >
                  Selected work
                </Link>
              </li>
              <li>
                <Link
                  href="/experience"
                  className="transition-colors duration-150 hover:text-[var(--ink-on-marine)]"
                >
                  Experience and lab
                </Link>
              </li>
              <li>
                <Link
                  href="/contact"
                  className="transition-colors duration-150 hover:text-[var(--ink-on-marine)]"
                >
                  Contact
                </Link>
              </li>
              <li>
                <Link
                  href="/admin"
                  className="transition-colors duration-150 hover:text-[var(--ink-on-marine)]"
                >
                  Studio console
                </Link>
              </li>
            </ul>
          </div>

          {/* Ecosystem */}
          <div className="md:col-span-2">
            <h3 className="type-sm font-semibold text-[var(--ink-on-marine)]">
              Ecosystem
            </h3>
            <ul className="type-sm mt-4 space-y-2.5 text-[var(--ink-on-marine-secondary)]">
              <li>
                <a
                  href={PROFILE.studio.primaryUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group inline-flex items-center gap-1 transition-colors duration-150 hover:text-[var(--ink-on-marine)]"
                >
                  <span>oxakalabs.xyz</span>
                  <ArrowUpRight
                    size={14}
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
                  className="group inline-flex items-center gap-1 transition-colors duration-150 hover:text-[var(--ink-on-marine)]"
                >
                  <span>GitHub</span>
                  <ArrowUpRight
                    size={14}
                    weight="bold"
                    className="hover-nudge-ne shrink-0"
                    aria-hidden="true"
                  />
                </a>
              </li>
              <li>
                <a
                  href="https://blaireaesthetics.shop"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group inline-flex items-center gap-1 transition-colors duration-150 hover:text-[var(--ink-on-marine)]"
                >
                  <span>blaireaesthetics</span>
                  <ArrowUpRight
                    size={14}
                    weight="bold"
                    className="hover-nudge-ne shrink-0"
                    aria-hidden="true"
                  />
                </a>
              </li>
              <li>
                <a
                  href="https://aifycycle.vercel.app"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group inline-flex items-center gap-1 transition-colors duration-150 hover:text-[var(--ink-on-marine)]"
                >
                  <span>aifycycle</span>
                  <ArrowUpRight
                    size={14}
                    weight="bold"
                    className="hover-nudge-ne shrink-0"
                    aria-hidden="true"
                  />
                </a>
              </li>
            </ul>
          </div>

          {/* Direct Channels */}
          <div className="md:col-span-3">
            <h3 className="type-sm font-semibold text-[var(--ink-on-marine)]">
              Direct contact
            </h3>
            <div className="mt-4 space-y-3">
              <button
                type="button"
                onClick={copyEmail}
                aria-label={copied ? "Email copied" : `Copy ${PROFILE.email}`}
                className="btn-press type-sm flex w-full items-center justify-between gap-2 rounded-[var(--radius-sm)] border border-[var(--border-on-marine)] bg-[var(--bg-marine-elevated)] px-3.5 py-2.5 text-left text-[var(--ink-on-marine)] hover:border-[var(--border-on-marine-strong)]"
              >
                <span className="min-w-0 truncate text-[var(--ink-on-marine-secondary)]">
                  {PROFILE.email}
                </span>
                <span className="inline-flex shrink-0 items-center justify-end font-medium">
                  <BlurCrossfade
                    contentKey={copied ? "copied" : "copy"}
                    inline
                    className="inline-flex items-center gap-1"
                  >
                    {copied ? (
                      <>
                        <Check
                          size={14}
                          weight="bold"
                          className="text-[var(--status-positive-bright)]"
                          aria-hidden="true"
                        />
                        <span className="text-[var(--status-positive-bright)]">
                          Copied
                        </span>
                      </>
                    ) : (
                      <>
                        <Copy
                          size={14}
                          weight="bold"
                          className="text-[var(--ink-on-marine-muted)]"
                          aria-hidden="true"
                        />
                        <span className="text-[var(--ink-on-marine-muted)]">
                          Copy
                        </span>
                      </>
                    )}
                  </BlurCrossfade>
                </span>
              </button>
              <span className="sr-only" aria-live="polite">
                {copied ? "Email address copied to clipboard." : ""}
              </span>

              <div className="type-sm flex items-center gap-5 pt-1 text-[var(--ink-on-marine-secondary)]">
                <button
                  type="button"
                  onClick={onOpenResume}
                  className="font-medium underline decoration-[var(--border-on-marine-strong)] transition-colors duration-150 hover:text-[var(--ink-on-marine)] hover:decoration-[var(--ink-on-marine)]"
                >
                  Preview resume PDF
                </button>
                <button
                  type="button"
                  onClick={onOpenAssistant}
                  className="font-medium text-[var(--accent-bright)] transition-colors duration-150 hover:text-[var(--ink-on-marine)]"
                >
                  Ask AI
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="type-sm mt-12 flex flex-col items-start justify-between gap-2 border-t border-[var(--border-on-marine)] pt-6 text-[var(--ink-on-marine-muted)] sm:flex-row sm:items-center">
          <p>
            &copy; {new Date().getFullYear()} {PROFILE.legalName} ·{" "}
            {PROFILE.studio.name}
          </p>
          <p className="tabular-nums">
            {PROFILE.locationLabel} ({PROFILE.utcOffsetLabel})
          </p>
        </div>
      </div>
    </footer>
  );
}
