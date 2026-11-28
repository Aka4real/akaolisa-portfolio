"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import {
  AnimatePresence,
  animate,
  motion,
  useMotionValue,
  usePresence,
  useReducedMotion,
  useTransform,
} from "framer-motion";
import {
  ArrowSquareOut,
  DownloadSimple,
  FilePdf,
  X,
} from "@phosphor-icons/react";
import { PROFILE } from "@/data/profile";
import { buildTrackedResumeUrl } from "@/lib/telemetry/client";
import {
  EASE_OUT_EXPO,
  SPRING_CRISP,
  SPRING_FLICK,
  projectVelocity,
  rubberband,
} from "@/components/ui/MotionPrimitives";

interface ResumeModalProps {
  open: boolean;
  onClose: () => void;
}

interface PointerSampleY {
  y: number;
  t: number;
}

const useIsomorphicLayoutEffect =
  typeof window !== "undefined" ? useLayoutEffect : useEffect;

function getInitialModalHeight(): number {
  if (typeof window === "undefined") return 720;
  return Math.round(window.innerHeight * 0.86);
}

function computePointerVelocityY(samples: PointerSampleY[]): number {
  if (samples.length < 2) return 0;
  const now = performance.now();
  const last = samples[samples.length - 1];

  // If the pointer rested > 80ms before release, release velocity is zero
  if (now - last.t > 80) return 0;

  let first = samples[0];
  for (let i = 0; i < samples.length - 1; i++) {
    if (now - samples[i].t <= 80) {
      first = samples[i];
      break;
    }
  }

  const dt = last.t - first.t;
  if (dt < 4) return 0;

  const rawVelocity = ((last.y - first.y) / dt) * 1000;
  return Math.max(-4000, Math.min(4000, rawVelocity));
}

function ResumeModalSheet({ onClose }: { onClose: () => void }) {
  const prefersReduced = useReducedMotion();
  const [isPresent, safeToRemove] = usePresence();

  const initialHeight = getInitialModalHeight();
  const [modalHeight, setModalHeight] = useState<number>(initialHeight);
  const modalHeightRef = useRef<number>(initialHeight);

  const [isDragging, setIsDragging] = useState(false);
  const [isClosingVisual, setIsClosingVisual] = useState(false);
  const [pdfLoaded, setPdfLoaded] = useState(false);

  const modalRef = useRef<HTMLDivElement>(null);
  const closeBtnRef = useRef<HTMLButtonElement>(null);

  // Drag vertical translation + drag-coupled scrim opacity
  const y = useMotionValue(0);
  const scrimBaseOpacity = useMotionValue(0);
  const dragScrimFactor = useTransform(
    y,
    [0, Math.max(modalHeight * 0.65, 240)],
    [1, 0]
  );
  const scrimOpacity = useTransform(
    [scrimBaseOpacity, dragScrimFactor],
    (values: number[]) => (values[0] ?? 0) * (values[1] ?? 1)
  );

  const yControlsRef = useRef<ReturnType<typeof animate> | null>(null);
  const scrimControlsRef = useRef<ReturnType<typeof animate> | null>(null);
  const dragAnimTokenRef = useRef(0);
  const isDragClosingRef = useRef(false);
  const dismissedByDragRef = useRef(false);
  const isMountedRef = useRef(true);

  const activePointerIdRef = useRef<number | null>(null);
  const grabOffsetYRef = useRef(0);
  const samplesRef = useRef<PointerSampleY[]>([]);

  const getModalHeight = useCallback(() => {
    const measured = modalRef.current?.offsetHeight;
    if (measured && measured > 0) {
      modalHeightRef.current = measured;
      return measured;
    }
    return modalHeightRef.current || getInitialModalHeight();
  }, []);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      yControlsRef.current?.stop();
      scrimControlsRef.current?.stop();
    };
  }, []);

  // Measure modal height for accurate rubber-band and velocity projection thresholds
  useIsomorphicLayoutEffect(() => {
    const el = modalRef.current;
    if (!el) return;

    const updateHeight = () => {
      const measured = el.offsetHeight;
      if (measured > 0) {
        modalHeightRef.current = measured;
        setModalHeight(measured);
      }
    };

    updateHeight();

    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(updateHeight);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Focus close button on mount for accessible keyboard navigation
  useEffect(() => {
    closeBtnRef.current?.focus({ preventScroll: true });
  }, []);

  // Safety fallback so PDF viewer extensions that suppress iframe onLoad never trap the placeholder
  useEffect(() => {
    if (pdfLoaded) return;
    const fallback = window.setTimeout(() => {
      setPdfLoaded(true);
    }, 4500);
    return () => window.clearTimeout(fallback);
  }, [pdfLoaded]);

  // Scrim enter and presence-coordinated exit
  useEffect(() => {
    if (isPresent) {
      dismissedByDragRef.current = false;
      isDragClosingRef.current = false;
      setIsClosingVisual(false);
      scrimControlsRef.current?.stop();
      scrimControlsRef.current = animate(
        scrimBaseOpacity,
        1,
        prefersReduced
          ? { duration: 0.16, ease: "easeOut" }
          : { duration: 0.24, ease: EASE_OUT_EXPO }
      );
      return;
    }

    // Already smoothly dismissed via downward drag spring
    if (dismissedByDragRef.current) {
      safeToRemove();
      return;
    }

    // Fast asymmetric exit on Esc, scrim click, or Close button
    yControlsRef.current?.stop();
    scrimControlsRef.current?.stop();
    setIsClosingVisual(true);

    const exitMs = prefersReduced ? 150 : 180;
    scrimControlsRef.current = animate(
      scrimBaseOpacity,
      0,
      prefersReduced
        ? { duration: 0.14, ease: "easeOut" }
        : { duration: 0.18, ease: EASE_OUT_EXPO }
    );

    const timer = window.setTimeout(() => {
      safeToRemove();
    }, exitMs + 10);

    return () => {
      window.clearTimeout(timer);
    };
  }, [isPresent, prefersReduced, safeToRemove, scrimBaseOpacity]);

  // Escape key dismissal
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  const handleHeaderPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (prefersReduced) return;
    if (e.pointerType === "mouse" && e.button !== 0) return;
    if (activePointerIdRef.current !== null) return;

    const target = e.target as HTMLElement | null;
    if (target?.closest("button, a")) return;

    activePointerIdRef.current = e.pointerId;
    ++dragAnimTokenRef.current;
    isDragClosingRef.current = false;
    setIsClosingVisual(false);
    yControlsRef.current?.stop();

    // Critical iframe guard: disable PDF iframe pointer events immediately on grab
    setIsDragging(true);
    grabOffsetYRef.current = e.clientY - y.get();
    samplesRef.current = [{ y: e.clientY, t: performance.now() }];

    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // Ignore synthetic pointer capture rejection
    }
  };

  const handleHeaderPointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (prefersReduced) return;
    if (activePointerIdRef.current !== e.pointerId) return;

    const height = getModalHeight();
    const rawY = e.clientY - grabOffsetYRef.current;

    if (rawY < 0) {
      y.set(rubberband(rawY, height, 0.55));
    } else {
      y.set(rawY);
    }

    const now = performance.now();
    const samples = samplesRef.current;
    samples.push({ y: e.clientY, t: now });
    while (samples.length > 2 && now - samples[0].t > 80) {
      samples.shift();
    }
  };

  const finishHeaderDrag = (
    e: ReactPointerEvent<HTMLDivElement>,
    cancelled: boolean
  ) => {
    if (activePointerIdRef.current !== e.pointerId) return;
    activePointerIdRef.current = null;
    setIsDragging(false);

    try {
      if (e.currentTarget.hasPointerCapture(e.pointerId)) {
        e.currentTarget.releasePointerCapture(e.pointerId);
      }
    } catch {
      // Ignore release errors
    }

    const vy = computePointerVelocityY(samplesRef.current);
    const height = getModalHeight();
    const currentY = y.get();
    const projectedY = currentY + projectVelocity(vy, 0.998);

    // Sign-first reversal: upward flick (vy < -180) cancels dismissal immediately
    const shouldDismiss =
      !cancelled &&
      vy >= -180 &&
      ((vy >= 0 && projectedY > height * 0.28) ||
        (vy > 240 && currentY > 24) ||
        (vy < 0 && projectedY > height * 0.28));

    const springConfig = Math.abs(vy) > 240 ? SPRING_FLICK : SPRING_CRISP;

    if (shouldDismiss) {
      const viewportH =
        typeof window !== "undefined" ? window.innerHeight : height + 160;
      const exitY = Math.max(viewportH, height + 120);
      const token = ++dragAnimTokenRef.current;
      isDragClosingRef.current = true;
      setIsClosingVisual(true);
      yControlsRef.current?.stop();

      let settled = false;
      const finalize = () => {
        if (
          settled ||
          !isMountedRef.current ||
          dragAnimTokenRef.current !== token
        ) {
          return;
        }
        settled = true;
        dismissedByDragRef.current = true;
        onClose();
      };

      const controls = animate(y, exitY, {
        ...springConfig,
        velocity: vy,
        restDelta: 0.5,
        restSpeed: 5,
        onUpdate: (latest) => {
          if (latest >= exitY - 2 && dragAnimTokenRef.current === token) {
            controls.stop();
            finalize();
          }
        },
      });

      yControlsRef.current = controls;
      controls.then(() => {
        finalize();
      });
    } else {
      yControlsRef.current?.stop();
      yControlsRef.current = animate(y, 0, {
        ...springConfig,
        velocity: vy,
      });
    }
  };

  const cardInitial = prefersReduced
    ? { opacity: 0 }
    : {
        opacity: 0,
        transform: "scale(0.96) translateY(8px)",
        filter: "blur(4px)",
      };

  const cardAnimate = isPresent
    ? prefersReduced
      ? { opacity: 1 }
      : {
          opacity: 1,
          transform: "scale(1) translateY(0px)",
          filter: "blur(0px)",
        }
    : prefersReduced
      ? { opacity: 0 }
      : {
          opacity: 0,
          transform: "scale(0.97) translateY(4px)",
          filter: "blur(2px)",
        };

  const cardTransition = isPresent
    ? prefersReduced
      ? { duration: 0.16, ease: "easeOut" as const }
      : { ...SPRING_CRISP, duration: 0.32 }
    : prefersReduced
      ? { duration: 0.14, ease: "easeOut" as const }
      : { duration: 0.18, ease: EASE_OUT_EXPO };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center overflow-hidden sm:items-center sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="resume-modal-title"
      data-dragging={isDragging ? "true" : "false"}
    >
      {/* Drag-coupled backdrop scrim */}
      <motion.div
        style={{ opacity: scrimOpacity }}
        onClick={onClose}
        className={`fixed inset-0 bg-[var(--scrim-modal)] backdrop-blur-[var(--blur-scrim)] ${
          isClosingVisual ? "pointer-events-none" : ""
        }`}
        aria-hidden="true"
      />

      {/* Outer vertical drag-translation layer (decoupled from inner scale/blur transform) */}
      <motion.div
        ref={modalRef}
        style={prefersReduced ? undefined : { y }}
        className="relative z-10 flex h-[92dvh] w-full max-w-4xl flex-col sm:h-[86vh]"
      >
        {/* Inner materializing modal card (origin-center on desktop) */}
        <motion.div
          initial={cardInitial}
          animate={cardAnimate}
          transition={cardTransition}
          className={`relative flex h-full w-full origin-center flex-col overflow-hidden rounded-t-[var(--radius-lg)] border border-[var(--border-hairline)] bg-[var(--bg-surface)] shadow-[var(--shadow-float)] sm:rounded-[var(--radius-lg)] ${
            isDragging ? "select-none" : ""
          }`}
        >
          {/* Translucent frosted header bar + mobile grab indicator pill */}
          <div
            onPointerDown={handleHeaderPointerDown}
            onPointerMove={handleHeaderPointerMove}
            onPointerUp={(e) => finishHeaderDrag(e, false)}
            onPointerCancel={(e) => finishHeaderDrag(e, true)}
            onLostPointerCapture={(e) => finishHeaderDrag(e, true)}
            style={{ touchAction: prefersReduced ? undefined : "none" }}
            className={`chrome-surface relative z-20 border-b border-[var(--border-hairline)] px-4 pt-2.5 pb-3.5 sm:px-5 sm:py-3.5 ${
              prefersReduced ? "" : "cursor-grab active:cursor-grabbing"
            }`}
          >
            {/* Mobile drag-handle pill affordance */}
            {!prefersReduced && (
              <div
                aria-hidden="true"
                className="mb-2.5 flex justify-center sm:hidden"
              >
                <span className="h-1 w-9 rounded-full bg-[var(--border-strong)]" />
              </div>
            )}

            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[var(--radius-sm)] border border-[var(--accent-border)] bg-[var(--accent-soft)] text-[var(--accent)]">
                  <FilePdf size={17} weight="bold" aria-hidden="true" />
                </span>
                <div>
                  <h2
                    id="resume-modal-title"
                    className="text-sm font-semibold tracking-[-0.015em] text-[var(--ink-primary)]"
                  >
                    {PROFILE.legalName} · Curriculum Vitae
                  </h2>
                  <p className="font-mono text-[11px] tabular-nums text-[var(--ink-muted)]">
                    {PROFILE.resumeFileName} · 3 Pages · PDF
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <a
                  href="/api/resume?mode=newtab&source=modal"
                  onClick={(e) => {
                    e.currentTarget.href = buildTrackedResumeUrl(
                      "newtab",
                      "modal"
                    );
                  }}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-press group inline-flex items-center gap-1.5 whitespace-nowrap rounded-[var(--radius-sm)] border border-[var(--border-strong)] bg-[var(--bg-surface)] px-3 py-1.5 text-xs font-medium text-[var(--ink-primary)] hover:border-[var(--accent-border)] hover:text-[var(--accent-deep)]"
                >
                  <ArrowSquareOut
                    size={14}
                    weight="bold"
                    className="hover-nudge-ne"
                    aria-hidden="true"
                  />
                  Open in New Tab
                </a>
                <a
                  href="/api/resume?mode=download&source=modal"
                  onClick={(e) => {
                    e.currentTarget.href = buildTrackedResumeUrl(
                      "download",
                      "modal"
                    );
                  }}
                  download={PROFILE.resumeFileName}
                  className="btn-press inline-flex items-center gap-1.5 whitespace-nowrap rounded-[var(--radius-sm)] bg-[var(--bg-inverse)] px-3 py-1.5 text-xs font-medium text-[var(--ink-inverse)] hover:bg-[var(--accent)]"
                >
                  <DownloadSimple
                    size={14}
                    weight="bold"
                    aria-hidden="true"
                  />
                  Download PDF
                </a>
                <button
                  ref={closeBtnRef}
                  type="button"
                  onClick={onClose}
                  aria-label="Close resume viewer"
                  className="btn-press ml-0.5 inline-flex h-8 w-8 items-center justify-center rounded-[var(--radius-sm)] border border-[var(--border-hairline)] bg-[var(--bg-surface)] text-[var(--ink-secondary)] hover:border-[var(--border-strong)] hover:text-[var(--ink-primary)]"
                >
                  <X size={16} weight="bold" aria-hidden="true" />
                </button>
              </div>
            </div>
          </div>

          {/* PDF Viewport with Cool Alabaster load crossfade + drag iframe guard */}
          <div className="relative flex-1 bg-[var(--bg-subtle)]">
            <iframe
              src="/api/resume?mode=view&source=modal-iframe#view=FitH"
              title={`${PROFILE.displayName} Resume PDF`}
              onLoad={() => setPdfLoaded(true)}
              className={`h-full w-full border-0 transition-opacity duration-200 ease-out ${
                pdfLoaded ? "opacity-100" : "opacity-0"
              } ${isDragging || isClosingVisual ? "pointer-events-none" : ""}`}
            />

            {/* Cool Alabaster loading placeholder that smoothly fades out on load */}
            <div
              aria-hidden={pdfLoaded}
              className={`pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-3 bg-[var(--bg-subtle)] transition-opacity duration-200 ease-out ${
                pdfLoaded ? "opacity-0" : "opacity-100"
              }`}
            >
              <span className="flex h-11 w-11 items-center justify-center rounded-[var(--radius-sm)] border border-[var(--border-hairline)] bg-[var(--bg-surface)] text-[var(--accent)] shadow-[var(--shadow-surface)]">
                <FilePdf size={20} weight="bold" aria-hidden="true" />
              </span>
              <div className="text-center">
                <p className="text-xs font-medium text-[var(--ink-primary)]">
                  Loading curriculum vitae
                </p>
                <p className="mt-0.5 font-mono text-[11px] text-[var(--ink-muted)]">
                  {PROFILE.resumeFileName}
                </p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Mobile bottom-sheet backing skirt (> max upward rubberband) */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-full h-[55vh] bg-[var(--bg-subtle)] sm:hidden"
        />
      </motion.div>
    </div>
  );
}

export function ResumeModal({ open, onClose }: ResumeModalProps) {
  return (
    <AnimatePresence>
      {open && <ResumeModalSheet key="resume-modal-sheet" onClose={onClose} />}
    </AnimatePresence>
  );
}
