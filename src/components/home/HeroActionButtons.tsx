"use client";

import Link from "next/link";
import { ArrowRight, Sparkle } from "@phosphor-icons/react";
import { usePortfolioActions } from "@/components/layout/PortfolioShell";

export function HeroActionButtons() {
  return (
    <div className="mt-7 flex flex-wrap items-center gap-3">
      <Link
        href="/work"
        className="btn-press group inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-[var(--radius-sm)] bg-[var(--bg-inverse)] px-5 py-3 text-sm font-medium text-[var(--ink-inverse)] hover:bg-[var(--bg-inverse-hover)]"
      >
        View Selected Work
        <ArrowRight
          size={15}
          weight="bold"
          className="hover-nudge-x shrink-0"
          aria-hidden="true"
        />
      </Link>

      <Link
        href="/contact"
        className="btn-press inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-[var(--radius-sm)] border border-[var(--accent-border)] bg-[var(--bg-surface)] px-5 py-3 text-sm font-medium text-[var(--accent-deep)] hover:border-[var(--accent)] hover:bg-[var(--accent-soft)]"
      >
        Start a Project
      </Link>
    </div>
  );
}

export function ClosingCtaButtons() {
  const { openAssistant } = usePortfolioActions();

  return (
    <div className="flex flex-wrap items-center gap-3">
      <Link
        href="/contact"
        className="btn-press group inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-[var(--radius-sm)] bg-[var(--bg-inverse)] px-5 py-3 text-sm font-medium text-[var(--ink-inverse)] hover:bg-[var(--bg-inverse-hover)]"
      >
        Start a Project
        <ArrowRight
          size={15}
          weight="bold"
          className="hover-nudge-x shrink-0"
          aria-hidden="true"
        />
      </Link>

      <button
        type="button"
        onClick={openAssistant}
        className="btn-press inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-[var(--radius-sm)] border border-[var(--border-strong)] bg-[var(--bg-surface)] px-5 py-3 text-sm font-medium text-[var(--ink-primary)] hover:border-[var(--accent-border)] hover:text-[var(--accent-deep)]"
      >
        <Sparkle
          size={15}
          weight="bold"
          className="shrink-0 text-[var(--accent)]"
          aria-hidden="true"
        />
        Ask AI
      </button>
    </div>
  );
}
