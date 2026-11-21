"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { FilePdf, List, Sparkle, X } from "@phosphor-icons/react";
import { PROFILE } from "@/data/profile";

interface SiteHeaderProps {
  onOpenResume: () => void;
  onOpenAssistant: () => void;
}

const NAV_ITEMS = [
  { label: "Home", href: "/" },
  { label: "Work", href: "/work" },
  { label: "Experience", href: "/experience" },
  { label: "Contact", href: "/contact" },
];

export function SiteHeader({
  onOpenResume,
  onOpenAssistant,
}: SiteHeaderProps) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  return (
    <header className="sticky top-0 z-40 border-b border-[#E5E2DC] bg-[#FAF9F6]/92 backdrop-blur-sm">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Brand Lockup */}
        <Link
          href="/"
          className="group flex items-center gap-3 focus-visible:outline-none"
        >
          <span className="flex h-8 w-8 items-center justify-center rounded border border-[#111214] bg-[#111214] font-mono text-xs font-semibold tracking-tight text-white transition-colors group-hover:border-[#1D4ED8] group-hover:bg-[#1D4ED8]">
            {PROFILE.monogram}
          </span>
          <div className="flex flex-col">
            <span className="text-[13px] font-semibold tracking-[0.06em] text-[#111214]">
              AKAOLISA ENWEDO
            </span>
            <span className="font-mono text-[10px] tracking-wider text-[#6E727A]">
              OXAKALABS · B.MLS
            </span>
          </div>
        </Link>

        {/* Desktop Nav */}
        <nav aria-label="Primary navigation" className="hidden items-center gap-1 md:flex">
          {NAV_ITEMS.map((item) => {
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`relative px-3.5 py-2 text-[13px] font-medium transition-colors ${
                  active
                    ? "text-[#111214]"
                    : "text-[#4B4E54] hover:text-[#111214]"
                }`}
              >
                {item.label}
                {active && (
                  <span
                    className="absolute right-3.5 bottom-0 left-3.5 h-[2px] bg-[#1D4ED8]"
                    aria-hidden="true"
                  />
                )}
              </Link>
            );
          })}
        </nav>

        {/* Desktop Utility Actions */}
        <div className="hidden items-center gap-2 md:flex">
          <button
            type="button"
            onClick={onOpenResume}
            className="btn-press inline-flex items-center gap-1.5 rounded border border-[#E5E2DC] bg-white px-3 py-1.5 text-xs font-medium text-[#111214] hover:border-[#D1CDC4] hover:bg-[#F3F1EC]"
          >
            <FilePdf size={14} weight="bold" className="text-[#4B4E54]" />
            Resume PDF
          </button>
          <button
            type="button"
            onClick={onOpenAssistant}
            className="btn-press inline-flex items-center gap-1.5 rounded border border-[#BFDBFE] bg-[#EFF4FF] px-3 py-1.5 text-xs font-medium text-[#0F3D91] hover:border-[#1D4ED8] hover:bg-[#1D4ED8] hover:text-white"
          >
            <Sparkle size={14} weight="bold" />
            Ask AI
          </button>
        </div>

        {/* Mobile Actions */}
        <div className="flex items-center gap-2 md:hidden">
          <button
            type="button"
            onClick={onOpenAssistant}
            aria-label="Ask AI about Akaolisa"
            className="btn-press inline-flex h-9 items-center gap-1.5 rounded border border-[#BFDBFE] bg-[#EFF4FF] px-2.5 text-xs font-medium text-[#0F3D91]"
          >
            <Sparkle size={14} weight="bold" />
            Ask AI
          </button>
          <button
            type="button"
            onClick={() => setMobileOpen((prev) => !prev)}
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
            aria-expanded={mobileOpen}
            className="btn-press inline-flex h-9 w-9 items-center justify-center rounded border border-[#E5E2DC] bg-white text-[#111214]"
          >
            {mobileOpen ? (
              <X size={18} weight="bold" />
            ) : (
              <List size={18} weight="bold" />
            )}
          </button>
        </div>
      </div>

      {/* Mobile Dropdown */}
      {mobileOpen && (
        <div className="border-t border-[#E5E2DC] bg-[#FAF9F6] px-4 py-4 md:hidden">
          <nav aria-label="Mobile navigation" className="flex flex-col gap-1">
            {NAV_ITEMS.map((item) => {
              const active = isActive(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className={`flex items-center justify-between rounded px-3 py-2.5 text-sm font-medium ${
                    active
                      ? "border border-[#BFDBFE] bg-[#EFF4FF] text-[#0F3D91]"
                      : "text-[#4B4E54] hover:bg-[#F3F1EC] hover:text-[#111214]"
                  }`}
                >
                  {item.label}
                  {active && (
                    <span className="font-mono text-[10px] uppercase tracking-wider">
                      Active
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>

          <div className="mt-3 border-t border-[#E5E2DC] pt-3">
            <button
              type="button"
              onClick={() => {
                setMobileOpen(false);
                onOpenResume();
              }}
              className="btn-press flex w-full items-center justify-center gap-2 rounded bg-[#111214] px-4 py-2.5 text-xs font-medium text-white"
            >
              <FilePdf size={15} weight="bold" />
              View / Download Resume PDF
            </button>
          </div>
        </div>
      )}
    </header>
  );
}
