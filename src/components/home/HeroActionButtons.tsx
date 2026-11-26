"use client";

import Link from "next/link";
import { ArrowRight } from "@phosphor-icons/react";

export function HeroActionButtons() {
  return (
    <div className="mt-8">
      <Link
        href="/work"
        className="btn-press group type-body inline-flex items-center justify-center gap-2.5 whitespace-nowrap rounded-[var(--radius-sm)] bg-[var(--accent)] px-6 py-3.5 font-medium text-[var(--ink-on-marine)] hover:bg-[#1D64EB]"
      >
        <span>Explore shipped systems</span>
        <ArrowRight
          size={16}
          weight="bold"
          className="hover-nudge-x shrink-0"
          aria-hidden="true"
        />
      </Link>
    </div>
  );
}

export function ClosingCtaButtons() {
  return (
    <div>
      <Link
        href="/contact"
        className="btn-press group type-body inline-flex items-center justify-center gap-2.5 whitespace-nowrap rounded-[var(--radius-sm)] bg-[var(--accent)] px-6 py-3.5 font-medium text-[var(--ink-on-marine)] hover:bg-[#1D64EB]"
      >
        <span>Start a project</span>
        <ArrowRight
          size={16}
          weight="bold"
          className="hover-nudge-x shrink-0"
          aria-hidden="true"
        />
      </Link>
    </div>
  );
}
