"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowUpRight,
  Check,
  Copy,
  FilePdf,
  Sparkle,
} from "@phosphor-icons/react";
import { PROFILE } from "@/data/profile";
import { LiveClockBadge } from "@/components/ui/LiveClockBadge";

interface SiteFooterProps {
  onOpenResume: () => void;
  onOpenAssistant: () => void;
}

export function SiteFooter({
  onOpenResume,
  onOpenAssistant,
}: SiteFooterProps) {
  const [copied, setCopied] = useState(false);

  async function copyEmail() {
    try {
      await navigator.clipboard.writeText(PROFILE.email);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard blocked in restricted context
    }
  }

  return (
    <footer className="border-t border-[#E5E2DC] bg-[#F3F1EC]/70">
      <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="grid gap-10 md:grid-cols-12">
          {/* Identity */}
          <div className="md:col-span-5">
            <div className="flex items-center gap-2.5">
              <span className="flex h-7 w-7 items-center justify-center rounded bg-[#111214] font-mono text-[11px] font-semibold text-white">
                {PROFILE.monogram}
              </span>
              <span className="text-sm font-semibold tracking-[0.05em] text-[#111214]">
                {PROFILE.displayName.toUpperCase()}
              </span>
            </div>
            <p className="mt-3 max-w-sm text-sm leading-relaxed text-[#4B4E54]">
              Principal Full-Stack, AI Agent & Quantitative Systems Engineer at{" "}
              <a
                href={PROFILE.studio.primaryUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-[#111214] underline decoration-[#D1CDC4] underline-offset-4 hover:decoration-[#1D4ED8]"
              >
                {PROFILE.studio.name}
              </a>
              . Licensed Biomedical Scientist (B.MLS) applying empirical rigor
              to production software.
            </p>
            <div className="mt-5">
              <LiveClockBadge compact />
            </div>
          </div>

          {/* Index */}
          <div className="md:col-span-2">
            <h3 className="font-mono text-[11px] font-semibold uppercase tracking-widest text-[#6E727A]">
              Directory
            </h3>
            <ul className="mt-3 space-y-2 text-sm">
              <li>
                <Link href="/" className="text-[#4B4E54] hover:text-[#111214]">
                  Home
                </Link>
              </li>
              <li>
                <Link
                  href="/work"
                  className="text-[#4B4E54] hover:text-[#111214]"
                >
                  Selected Work
                </Link>
              </li>
              <li>
                <Link
                  href="/experience"
                  className="text-[#4B4E54] hover:text-[#111214]"
                >
                  Experience &amp; Lab
                </Link>
              </li>
              <li>
                <Link
                  href="/contact"
                  className="text-[#4B4E54] hover:text-[#111214]"
                >
                  Contact
                </Link>
              </li>
            </ul>
          </div>

          {/* External / Live Builds */}
          <div className="md:col-span-2">
            <h3 className="font-mono text-[11px] font-semibold uppercase tracking-widest text-[#6E727A]">
              Ecosystem
            </h3>
            <ul className="mt-3 space-y-2 text-sm">
              <li>
                <a
                  href={PROFILE.studio.primaryUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-[#4B4E54] hover:text-[#1D4ED8]"
                >
                  oxakalabs.xyz
                  <ArrowUpRight size={13} weight="bold" />
                </a>
              </li>
              <li>
                <a
                  href={PROFILE.githubUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-[#4B4E54] hover:text-[#1D4ED8]"
                >
                  GitHub
                  <ArrowUpRight size={13} weight="bold" />
                </a>
              </li>
              <li>
                <a
                  href="https://blaireaesthetics.shop"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-[#4B4E54] hover:text-[#1D4ED8]"
                >
                  blaireaesthetics
                  <ArrowUpRight size={13} weight="bold" />
                </a>
              </li>
              <li>
                <a
                  href="https://aifycycle.vercel.app"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-[#4B4E54] hover:text-[#1D4ED8]"
                >
                  aifycycle
                  <ArrowUpRight size={13} weight="bold" />
                </a>
              </li>
            </ul>
          </div>

          {/* Direct Actions */}
          <div className="md:col-span-3">
            <h3 className="font-mono text-[11px] font-semibold uppercase tracking-widest text-[#6E727A]">
              Direct Access
            </h3>
            <div className="mt-3 space-y-2">
              <button
                type="button"
                onClick={copyEmail}
                className="btn-press flex w-full items-center justify-between rounded border border-[#E5E2DC] bg-white px-3 py-2 font-mono text-[11px] text-[#111214] hover:border-[#D1CDC4]"
              >
                <span className="truncate">{PROFILE.email}</span>
                {copied ? (
                  <Check size={14} weight="bold" className="shrink-0 text-[#15803D]" />
                ) : (
                  <Copy size={14} weight="bold" className="shrink-0 text-[#6E727A]" />
                )}
              </button>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={onOpenResume}
                  className="btn-press inline-flex items-center justify-center gap-1.5 rounded border border-[#E5E2DC] bg-white px-2.5 py-2 text-xs font-medium text-[#111214] hover:border-[#D1CDC4]"
                >
                  <FilePdf size={14} weight="bold" />
                  Resume
                </button>
                <button
                  type="button"
                  onClick={onOpenAssistant}
                  className="btn-press inline-flex items-center justify-center gap-1.5 rounded border border-[#BFDBFE] bg-[#EFF4FF] px-2.5 py-2 text-xs font-medium text-[#0F3D91] hover:border-[#1D4ED8]"
                >
                  <Sparkle size={14} weight="bold" />
                  Ask AI
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-12 flex flex-col items-start justify-between gap-3 border-t border-[#E5E2DC] pt-6 font-mono text-[11px] text-[#6E727A] sm:flex-row sm:items-center">
          <p>
            &copy; {new Date().getFullYear()} {PROFILE.legalName} ({PROFILE.studio.name}). Engineered with Next.js App Router.
          </p>
          <p>CLINICAL SWISS EDITION · {PROFILE.utcOffsetLabel}</p>
        </div>
      </div>
    </footer>
  );
}
