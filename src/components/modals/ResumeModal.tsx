"use client";

import { useEffect } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  ArrowSquareOut,
  DownloadSimple,
  FilePdf,
  X,
} from "@phosphor-icons/react";
import { PROFILE } from "@/data/profile";

interface ResumeModalProps {
  open: boolean;
  onClose: () => void;
}

const EASE_OUT: [number, number, number, number] = [0.23, 1, 0.32, 1];

export function ResumeModal({ open, onClose }: ResumeModalProps) {
  const prefersReduced = useReducedMotion();

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
          role="dialog"
          aria-modal="true"
          aria-labelledby="resume-modal-title"
        >
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            onClick={onClose}
            className="fixed inset-0 bg-[#111214]/45 backdrop-blur-[2px]"
          />

          <motion.div
            initial={
              prefersReduced
                ? { opacity: 0 }
                : { opacity: 0, transform: "scale(0.96) translateY(8px)" }
            }
            animate={
              prefersReduced
                ? { opacity: 1 }
                : { opacity: 1, transform: "scale(1) translateY(0px)" }
            }
            exit={
              prefersReduced
                ? { opacity: 0 }
                : { opacity: 0, transform: "scale(0.97) translateY(6px)" }
            }
            transition={{ duration: 0.22, ease: EASE_OUT }}
            className="relative z-10 flex h-[86vh] w-full max-w-4xl flex-col overflow-hidden rounded-lg border border-[#D1CDC4] bg-[#FAF9F6]"
          >
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#E5E2DC] bg-white px-5 py-3.5">
              <div className="flex items-center gap-2.5">
                <FilePdf size={18} weight="bold" className="text-[#1D4ED8]" />
                <div>
                  <h2
                    id="resume-modal-title"
                    className="text-sm font-semibold tracking-tight text-[#111214]"
                  >
                    {PROFILE.legalName} — Curriculum Vitae
                  </h2>
                  <p className="font-mono text-[11px] text-[#6E727A]">
                    {PROFILE.resumeFileName} · 3 Pages · PDF
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <a
                  href={PROFILE.resumePdfPath}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-press inline-flex items-center gap-1.5 rounded border border-[#E5E2DC] bg-white px-3 py-1.5 text-xs font-medium text-[#111214] hover:border-[#D1CDC4] hover:bg-[#F3F1EC]"
                >
                  <ArrowSquareOut size={14} weight="bold" />
                  Open Tab
                </a>
                <a
                  href={PROFILE.resumePdfPath}
                  download={PROFILE.resumeFileName}
                  className="btn-press inline-flex items-center gap-1.5 rounded bg-[#111214] px-3 py-1.5 text-xs font-medium text-white hover:bg-[#2A2C30]"
                >
                  <DownloadSimple size={14} weight="bold" />
                  Download PDF
                </a>
                <button
                  type="button"
                  onClick={onClose}
                  aria-label="Close resume viewer"
                  className="btn-press ml-1 inline-flex h-8 w-8 items-center justify-center rounded border border-[#E5E2DC] bg-white text-[#4B4E54] hover:border-[#D1CDC4] hover:text-[#111214]"
                >
                  <X size={16} weight="bold" />
                </button>
              </div>
            </div>

            <div className="relative flex-1 bg-[#F3F1EC]">
              <iframe
                src={`${PROFILE.resumePdfPath}#view=FitH`}
                title={`${PROFILE.displayName} Resume PDF`}
                className="h-full w-full border-0"
              />
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
