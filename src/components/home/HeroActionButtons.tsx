"use client";

import Link from "next/link";
import { ArrowRight, FilePdf, Sparkle } from "@phosphor-icons/react";
import { usePortfolioActions } from "@/components/layout/PortfolioShell";

export function HeroActionButtons() {
  const { openResume } = usePortfolioActions();

  return (
    <div className="mt-8 flex flex-wrap items-center gap-3">
      <Link
        href="/work"
        className="btn-press inline-flex items-center gap-2 rounded bg-[#111214] px-5 py-3 text-sm font-medium text-white hover:bg-[#26282C]"
      >
        Explore Selected Work
        <ArrowRight size={15} weight="bold" />
      </Link>

      <Link
        href="/contact"
        className="btn-press inline-flex items-center gap-2 rounded border border-[#1D4ED8] bg-[#EFF4FF] px-5 py-3 text-sm font-medium text-[#0F3D91] hover:bg-[#1D4ED8] hover:text-white"
      >
        Start a Project
      </Link>

      <button
        type="button"
        onClick={openResume}
        className="btn-press inline-flex items-center gap-2 rounded border border-[#E5E2DC] bg-white px-4 py-3 text-sm font-medium text-[#111214] hover:border-[#D1CDC4] hover:bg-[#F3F1EC]"
      >
        <FilePdf size={16} weight="bold" className="text-[#4B4E54]" />
        Resume PDF
      </button>
    </div>
  );
}

export function ClosingCtaButtons() {
  const { openAssistant } = usePortfolioActions();

  return (
    <div className="flex flex-wrap items-center gap-3">
      <Link
        href="/contact"
        className="btn-press inline-flex items-center gap-2 rounded bg-[#111214] px-5 py-3 text-sm font-medium text-white hover:bg-[#1D4ED8]"
      >
        Start a Project Inquiry
        <ArrowRight size={15} weight="bold" />
      </Link>
      <button
        type="button"
        onClick={openAssistant}
        className="btn-press inline-flex items-center gap-2 rounded border border-[#BFDBFE] bg-[#EFF4FF] px-4 py-3 text-sm font-medium text-[#0F3D91] hover:border-[#1D4ED8] hover:bg-[#1D4ED8] hover:text-white"
      >
        <Sparkle size={15} weight="bold" />
        Ask AI About My Stack
      </button>
    </div>
  );
}
