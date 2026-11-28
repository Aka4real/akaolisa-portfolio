"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import Link from "next/link";
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
  ArrowCounterClockwise,
  ArrowRight,
  PaperPlaneRight,
  Sparkle,
  TerminalWindow,
  X,
} from "@phosphor-icons/react";
import {
  formatGeminiModelLabel,
  type ChatHistoryTurn,
  type ChatResponsePayload,
  type SuggestedLink,
} from "@/lib/knowledge";
import { getClientTelemetryIds } from "@/lib/telemetry/client";
import {
  EASE_DRAWER,
  EASE_OUT_EXPO,
  SPRING_CRISP,
  SPRING_FLICK,
  projectVelocity,
  rubberband,
} from "@/components/ui/MotionPrimitives";

interface AiAssistantDrawerProps {
  open: boolean;
  onClose: () => void;
}

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  links?: SuggestedLink[];
  mode?: "gemini" | "grounded-index";
  model?: string;
  isSystemError?: boolean;
}

interface ChatStatusResponse {
  geminiEnabled?: boolean;
  primaryModel?: string;
}

interface PointerSample {
  x: number;
  t: number;
}

const WELCOME_MESSAGE: ChatMessage = {
  id: "welcome",
  role: "assistant",
  content:
    "Ask anything about Akaolisa Enwedo's full-stack architecture, DevOps & cloud infrastructure experience, OXAKALABS & G-Gravitator case studies, AI/Quant stack, B.MLS clinical background, or remote contract availability. All answers are strictly grounded in his verified dossier.",
  links: [
    { label: "View Selected Work", href: "/work" },
    { label: "Experience & Clinical Lab", href: "/experience" },
  ],
};

const QUICK_PROMPTS = [
  "What is Akaolisa's DevOps & cloud infrastructure stack?",
  "What is Akaolisa's AI & multi-agent stack?",
  "Walk me through G-Gravitator, Fortress Fleet AI, and Koridor Engine OS",
  "Is he available for remote freelance contracts?",
];

const useIsomorphicLayoutEffect =
  typeof window !== "undefined" ? useLayoutEffect : useEffect;

function getInitialDrawerWidth(): number {
  if (typeof window === "undefined") return 448;
  return Math.min(window.innerWidth, 448);
}

function computePointerVelocityX(samples: PointerSample[]): number {
  if (samples.length < 2) return 0;
  const now = performance.now();
  const last = samples[samples.length - 1];

  // If the pointer rested > 80ms before lift, release velocity is zero
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

  const rawVelocity = ((last.x - first.x) / dt) * 1000;
  return Math.max(-4000, Math.min(4000, rawVelocity));
}

function renderInlineEmphasis(text: string) {
  const segments = text.split(/(\*\*[^*]+\*\*)/g);
  return segments.map((seg, idx) => {
    if (seg.startsWith("**") && seg.endsWith("**") && seg.length > 4) {
      return (
        <strong key={idx} className="font-semibold text-[var(--ink-primary)]">
          {seg.slice(2, -2)}
        </strong>
      );
    }
    return <span key={idx}>{seg}</span>;
  });
}

function FormattedAssistantText({ content }: { content: string }) {
  const lines = content.split(/\r?\n/);
  const blocks: Array<
    | { type: "heading"; text: string }
    | { type: "paragraph"; text: string }
    | { type: "list"; items: string[] }
  > = [];

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;

    const headingMatch = line.match(/^#{1,4}\s+(.+)$/);
    if (headingMatch) {
      blocks.push({
        type: "heading",
        text: headingMatch[1].replace(/\*\*/g, ""),
      });
      continue;
    }

    const bulletMatch = line.match(/^[-*•]\s+(.+)$/);
    if (bulletMatch) {
      const prev = blocks[blocks.length - 1];
      if (prev && prev.type === "list") {
        prev.items.push(bulletMatch[1]);
      } else {
        blocks.push({ type: "list", items: [bulletMatch[1]] });
      }
      continue;
    }

    blocks.push({ type: "paragraph", text: line });
  }

  return (
    <div className="space-y-2">
      {blocks.map((block, idx) => {
        if (block.type === "heading") {
          return (
            <p
              key={idx}
              className="pt-1 font-mono text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--accent-deep)]"
            >
              {block.text}
            </p>
          );
        }
        if (block.type === "list") {
          return (
            <ul key={idx} className="space-y-1.5 pl-4">
              {block.items.map((item, itemIdx) => (
                <li
                  key={itemIdx}
                  className="list-disc text-[13px] leading-relaxed text-[var(--ink-primary)] marker:text-[var(--accent)]"
                >
                  {renderInlineEmphasis(item)}
                </li>
              ))}
            </ul>
          );
        }
        return (
          <p
            key={idx}
            className="text-[13px] leading-relaxed text-[var(--ink-primary)]"
          >
            {renderInlineEmphasis(block.text)}
          </p>
        );
      })}
    </div>
  );
}

interface AiAssistantDrawerSheetProps {
  onClose: () => void;
  messages: ChatMessage[];
  input: string;
  onInputChange: (val: string) => void;
  loading: boolean;
  geminiEnabled: boolean;
  displayModelLabel: string;
  statusLabel: string;
  onReset: () => void;
  onSubmitQuestion: (question: string) => void;
}

function AiAssistantDrawerSheet({
  onClose,
  messages,
  input,
  onInputChange,
  loading,
  geminiEnabled,
  displayModelLabel,
  statusLabel,
  onReset,
  onSubmitQuestion,
}: AiAssistantDrawerSheetProps) {
  const prefersReduced = useReducedMotion();
  const [isPresent, safeToRemove] = usePresence();

  const initialWidth = getInitialDrawerWidth();
  const [drawerWidth, setDrawerWidth] = useState<number>(initialWidth);
  const drawerWidthRef = useRef<number>(initialWidth);
  const [isDragging, setIsDragging] = useState(false);
  const [isClosingVisual, setIsClosingVisual] = useState(false);

  const asideRef = useRef<HTMLElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const closeBtnRef = useRef<HTMLButtonElement>(null);

  const x = useMotionValue(prefersReduced ? 0 : initialWidth);
  const scrimOpacity = useTransform(x, [0, drawerWidth], [1, 0]);

  const controlsRef = useRef<ReturnType<typeof animate> | null>(null);
  const animTokenRef = useRef(0);
  const isClosingRef = useRef(false);
  const hasFinishedCloseAnimRef = useRef(false);
  const isMountedRef = useRef(true);

  const activePointerIdRef = useRef<number | null>(null);
  const dragLockedRef = useRef(false);
  const isImmediateZoneRef = useRef(false);
  const startXRef = useRef(0);
  const startYRef = useRef(0);
  const grabOffsetXRef = useRef(0);
  const samplesRef = useRef<PointerSample[]>([]);

  const getDrawerWidth = useCallback(() => {
    const measured = asideRef.current?.offsetWidth;
    if (measured && measured > 0) {
      drawerWidthRef.current = measured;
      return measured;
    }
    return drawerWidthRef.current || getInitialDrawerWidth();
  }, []);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      controlsRef.current?.stop();
    };
  }, []);

  // Measure actual sheet width & track resizes cleanly
  useIsomorphicLayoutEffect(() => {
    const aside = asideRef.current;
    if (!aside) return;

    const updateWidth = () => {
      const measured = aside.offsetWidth;
      if (measured > 0) {
        drawerWidthRef.current = measured;
        setDrawerWidth(measured);
      }
    };

    updateWidth();

    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(updateWidth);
    observer.observe(aside);
    return () => observer.disconnect();
  }, []);

  // Focus close button on mount for accessible keyboard entry without mobile keyboard jump
  useEffect(() => {
    closeBtnRef.current?.focus({ preventScroll: true });
  }, []);

  // Animate smoothly from live x.get() toward width, then notify parent onClose
  const animateToClose = useCallback(
    (explicitVelocity?: number) => {
      if (prefersReduced) {
        onClose();
        return;
      }

      if (isClosingRef.current && explicitVelocity === undefined) {
        return;
      }

      const liveVelocity =
        explicitVelocity !== undefined ? explicitVelocity : x.getVelocity();
      controlsRef.current?.stop();

      const width = getDrawerWidth();
      const token = ++animTokenRef.current;
      isClosingRef.current = true;
      setIsClosingVisual(true);

      let settled = false;
      const finalize = () => {
        if (settled || !isMountedRef.current || animTokenRef.current !== token) {
          return;
        }
        settled = true;
        hasFinishedCloseAnimRef.current = true;
        onClose();
      };

      const isProgrammaticRestClose =
        explicitVelocity === undefined && Math.abs(liveVelocity) <= 50;

      const controls = isProgrammaticRestClose
        ? animate(x, width, {
            duration: 0.24,
            ease: EASE_DRAWER,
          })
        : animate(x, width, {
            ...(Math.abs(liveVelocity) > 220
              ? SPRING_FLICK
              : {
                  ...SPRING_CRISP,
                  duration:
                    explicitVelocity === undefined
                      ? 0.24
                      : SPRING_CRISP.duration,
                }),
            velocity: liveVelocity,
            restDelta: 2,
            restSpeed: 20,
            onUpdate: (latest) => {
              if (latest >= width - 2 && animTokenRef.current === token) {
                controls.stop();
                finalize();
              }
            },
          });

      controlsRef.current = controls;
      controls.then(() => {
        finalize();
      });
    },
    [getDrawerWidth, onClose, prefersReduced, x]
  );

  // Orchestrate mount enter & external unmount exit (interruptible from live presentation value)
  useEffect(() => {
    if (prefersReduced) {
      x.set(0);
      if (!isPresent) {
        const timer = window.setTimeout(() => {
          safeToRemove();
        }, 160);
        return () => window.clearTimeout(timer);
      }
      return;
    }

    const width = getDrawerWidth();

    if (isPresent) {
      hasFinishedCloseAnimRef.current = false;
      isClosingRef.current = false;
      setIsClosingVisual(false);
      controlsRef.current?.stop();
      if (x.get() > width) {
        x.set(width);
      }
      ++animTokenRef.current;
      const controls = animate(x, 0, SPRING_CRISP);
      controlsRef.current = controls;
      return () => {
        controls.stop();
      };
    }

    // External close (e.g., parent switched directly to ResumeModal)
    if (hasFinishedCloseAnimRef.current) {
      safeToRemove();
      return;
    }

    const liveVelocity = x.getVelocity();
    controlsRef.current?.stop();
    const token = ++animTokenRef.current;
    let removed = false;
    const finishExit = () => {
      if (removed || !isMountedRef.current || animTokenRef.current !== token) {
        return;
      }
      removed = true;
      safeToRemove();
    };

    const controls =
      Math.abs(liveVelocity) <= 50
        ? animate(x, width, {
            duration: 0.24,
            ease: EASE_DRAWER,
          })
        : animate(x, width, {
            ...SPRING_CRISP,
            duration: 0.24,
            velocity: liveVelocity,
            restDelta: 2,
            restSpeed: 20,
            onUpdate: (latest) => {
              if (latest >= width - 2 && animTokenRef.current === token) {
                controls.stop();
                finishExit();
              }
            },
          });
    controlsRef.current = controls;
    controls.then(() => {
      finishExit();
    });

    return () => {
      controls.stop();
    };
  }, [getDrawerWidth, isPresent, prefersReduced, safeToRemove, x]);

  // Interruptible Escape key dismissal
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        animateToClose();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [animateToClose]);

  // Smooth auto-scroll respecting prefers-reduced-motion
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTo({
      top: el.scrollHeight,
      behavior: prefersReduced ? "auto" : "smooth",
    });
  }, [messages, loading, prefersReduced]);

  const handlePointerDown = (e: ReactPointerEvent<HTMLElement>) => {
    if (prefersReduced) return;
    if (e.pointerType === "mouse" && e.button !== 0) return;
    if (activePointerIdRef.current !== null) return;

    const target = e.target as HTMLElement | null;
    if (target?.closest("input, textarea, select")) return;

    const isInteractiveTarget = Boolean(target?.closest("button, a"));
    const isHeaderHandle =
      Boolean(target?.closest("[data-drawer-drag-handle]")) &&
      !isInteractiveTarget;
    const rect = asideRef.current?.getBoundingClientRect();
    const isLeftBezel =
      !isInteractiveTarget &&
      rect !== undefined &&
      e.clientX - rect.left <= 24;
    const isMidFlight =
      !isInteractiveTarget && (x.get() > 2 || isClosingRef.current);

    activePointerIdRef.current = e.pointerId;
    dragLockedRef.current = false;
    isImmediateZoneRef.current = isHeaderHandle || isLeftBezel;
    startXRef.current = e.clientX;
    startYRef.current = e.clientY;
    samplesRef.current = [{ x: e.clientX, t: performance.now() }];

    // Immediate grab on mid-flight catch or non-button header drag handle
    if (isMidFlight || isHeaderHandle) {
      ++animTokenRef.current;
      isClosingRef.current = false;
      setIsClosingVisual(false);
      controlsRef.current?.stop();
      grabOffsetXRef.current = e.clientX - x.get();

      if (isMidFlight) {
        dragLockedRef.current = true;
        setIsDragging(true);
        try {
          e.currentTarget.setPointerCapture(e.pointerId);
        } catch {
          // Ignore synthetic pointer capture rejection
        }
      }
    }
  };

  const handlePointerMove = (e: ReactPointerEvent<HTMLElement>) => {
    if (prefersReduced) return;
    if (activePointerIdRef.current !== e.pointerId) return;

    const dx = e.clientX - startXRef.current;
    const dy = e.clientY - startYRef.current;

    if (!dragLockedRef.current) {
      if (isImmediateZoneRef.current) {
        if (Math.abs(dy) > 10 && Math.abs(dy) > Math.abs(dx) * 1.4) {
          activePointerIdRef.current = null;
          isImmediateZoneRef.current = false;
          return;
        }
        if (Math.abs(dx) > 3 && Math.abs(dx) >= Math.abs(dy)) {
          dragLockedRef.current = true;
          ++animTokenRef.current;
          isClosingRef.current = false;
          setIsClosingVisual(false);
          controlsRef.current?.stop();
          grabOffsetXRef.current = e.clientX - x.get();
          setIsDragging(true);
          try {
            e.currentTarget.setPointerCapture(e.pointerId);
          } catch {
            // Ignore synthetic pointer capture rejection
          }
        } else {
          return;
        }
      } else {
        // Strict 10px horizontal hysteresis in scrollable message body so vertical scroll is never blocked
        if (Math.abs(dy) > 10 && Math.abs(dy) >= Math.abs(dx)) {
          activePointerIdRef.current = null;
          return;
        }
        if (dx > 10 && Math.abs(dx) > Math.abs(dy) * 1.2) {
          dragLockedRef.current = true;
          ++animTokenRef.current;
          isClosingRef.current = false;
          setIsClosingVisual(false);
          controlsRef.current?.stop();
          grabOffsetXRef.current = e.clientX - x.get();
          setIsDragging(true);
          try {
            e.currentTarget.setPointerCapture(e.pointerId);
          } catch {
            // Ignore synthetic pointer capture rejection
          }
        } else {
          return;
        }
      }
    }

    const width = getDrawerWidth();
    const rawX = e.clientX - grabOffsetXRef.current;

    if (rawX < 0) {
      x.set(rubberband(rawX, width, 0.55));
    } else {
      x.set(Math.min(rawX, width));
    }

    const now = performance.now();
    const samples = samplesRef.current;
    samples.push({ x: e.clientX, t: now });
    while (samples.length > 2 && now - samples[0].t > 80) {
      samples.shift();
    }
  };

  const finishDrag = (
    e: ReactPointerEvent<HTMLElement>,
    cancelled: boolean
  ) => {
    if (activePointerIdRef.current !== e.pointerId) return;
    activePointerIdRef.current = null;
    isImmediateZoneRef.current = false;

    const wasLocked = dragLockedRef.current;
    dragLockedRef.current = false;
    setIsDragging(false);

    if (!wasLocked) {
      // If user caught mid-flight without dragging far enough, settle cleanly to open
      if (x.get() > 0 && !isClosingRef.current) {
        controlsRef.current?.stop();
        controlsRef.current = animate(x, 0, SPRING_CRISP);
      }
      return;
    }

    try {
      if (e.currentTarget.hasPointerCapture(e.pointerId)) {
        e.currentTarget.releasePointerCapture(e.pointerId);
      }
    } catch {
      // Ignore release errors
    }

    const vx = computePointerVelocityX(samplesRef.current);
    const width = getDrawerWidth();
    const currentX = x.get();
    const projected = currentX + projectVelocity(vx, 0.998);

    // Sign-first reversal: leftward flick (vx < -180) cancels dismissal immediately
    const shouldDismiss =
      !cancelled &&
      vx >= -180 &&
      ((vx >= 0 && projected > width * 0.36) ||
        (vx > 220 && currentX > 24) ||
        (vx < 0 && projected > width * 0.36));

    if (shouldDismiss) {
      animateToClose(vx);
    } else {
      controlsRef.current?.stop();
      const springConfig = Math.abs(vx) > 220 ? SPRING_FLICK : SPRING_CRISP;
      controlsRef.current = animate(x, 0, {
        ...springConfig,
        velocity: vx,
      });
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end overflow-hidden"
      role="dialog"
      aria-modal="true"
      aria-labelledby="ai-drawer-title"
    >
      {/* Drag-coupled backdrop scrim */}
      <motion.div
        style={prefersReduced ? undefined : { opacity: scrimOpacity }}
        initial={prefersReduced ? { opacity: 0 } : undefined}
        animate={prefersReduced ? { opacity: isPresent ? 1 : 0 } : undefined}
        transition={
          prefersReduced ? { duration: 0.16, ease: "easeOut" } : undefined
        }
        onClick={() => animateToClose()}
        className={`fixed inset-0 bg-[var(--scrim-drawer)] backdrop-blur-[var(--blur-scrim)] ${
          isClosingVisual ? "pointer-events-none" : ""
        }`}
        aria-hidden="true"
      />

      {/* Right-edge interruptible fluid sheet */}
      <motion.aside
        ref={asideRef}
        style={prefersReduced ? undefined : { x, touchAction: "pan-y" }}
        initial={prefersReduced ? { opacity: 0 } : undefined}
        animate={prefersReduced ? { opacity: isPresent ? 1 : 0 } : undefined}
        transition={
          prefersReduced ? { duration: 0.16, ease: "easeOut" } : undefined
        }
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={(e) => finishDrag(e, false)}
        onPointerCancel={(e) => finishDrag(e, true)}
        onLostPointerCapture={(e) => finishDrag(e, true)}
        className={`relative z-10 flex h-full w-full max-w-md flex-col border-l border-[var(--border-hairline)] bg-[var(--bg-canvas)] shadow-[var(--shadow-float)] ${
          isDragging ? "select-none" : ""
        }`}
      >
        {/* Seamless right-edge backing skirt (> max theoretical rubberband 0.55 * 448px) */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 left-full w-72 bg-[var(--bg-canvas)]"
        />

        {/* Subtle left-bezel tactile grab-pill affordance */}
        {!prefersReduced && (
          <div
            aria-hidden="true"
            className="pointer-events-none absolute top-1/2 left-1.5 z-30 -translate-y-1/2"
          >
            <span className="block h-10 w-1 rounded-full bg-[var(--border-strong)] opacity-60" />
          </div>
        )}

        {/* Translucent floating chrome header (messages pass smoothly underneath) */}
        <div
          data-drawer-drag-handle="true"
          style={{ touchAction: prefersReduced ? undefined : "none" }}
          className={`chrome-surface absolute inset-x-0 top-0 z-20 flex items-center justify-between border-b border-[var(--border-hairline)] px-5 py-4 ${
            prefersReduced ? "" : "cursor-grab active:cursor-grabbing"
          }`}
        >
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[var(--radius-sm)] border border-[var(--accent-border)] bg-[var(--accent-soft)] text-[var(--accent)]">
              <Sparkle size={15} weight="bold" aria-hidden="true" />
            </span>
            <div>
              <h2
                id="ai-drawer-title"
                className="text-sm font-semibold tracking-[-0.015em] text-[var(--ink-primary)]"
              >
                Ask About Akaolisa
              </h2>
              <p className="flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-[0.04em] text-[var(--ink-muted)]">
                <TerminalWindow size={12} weight="bold" aria-hidden="true" />
                {statusLabel}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {messages.length > 1 && (
              <button
                type="button"
                onClick={onReset}
                disabled={loading}
                aria-label="Reset conversation"
                title="Start a new thread"
                className="btn-press inline-flex h-8 w-8 items-center justify-center rounded-[var(--radius-sm)] border border-[var(--border-hairline)] bg-[var(--bg-surface)] text-[var(--ink-secondary)] hover:border-[var(--border-strong)] hover:text-[var(--ink-primary)] disabled:cursor-not-allowed disabled:opacity-40"
              >
                <ArrowCounterClockwise
                  size={15}
                  weight="bold"
                  aria-hidden="true"
                />
              </button>
            )}

            <button
              ref={closeBtnRef}
              type="button"
              onClick={() => animateToClose()}
              aria-label="Close dossier assistant"
              className="btn-press inline-flex h-8 w-8 items-center justify-center rounded-[var(--radius-sm)] border border-[var(--border-hairline)] bg-[var(--bg-surface)] text-[var(--ink-secondary)] hover:border-[var(--border-strong)] hover:text-[var(--ink-primary)]"
            >
              <X size={16} weight="bold" aria-hidden="true" />
            </button>
          </div>

          {/* Subtle scroll-edge fade beneath floating header chrome */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 -bottom-3 h-3 bg-gradient-to-b from-[rgba(248,249,251,0.65)] to-transparent"
          />
        </div>

        {/* Full-height message scroll viewport flowing behind translucent header & footer */}
        <div
          ref={scrollRef}
          className="h-full space-y-4 overflow-y-auto px-5 pt-[88px] pb-[132px]"
        >
          {messages.map((msg) => {
            const isWelcome = msg.id === WELCOME_MESSAGE.id;
            return (
              <motion.div
                key={msg.id}
                initial={
                  isWelcome
                    ? false
                    : prefersReduced
                      ? { opacity: 0 }
                      : {
                          opacity: 0,
                          transform: "translateY(8px) scale(0.98)",
                        }
                }
                animate={
                  prefersReduced
                    ? { opacity: 1 }
                    : { opacity: 1, transform: "translateY(0px) scale(1)" }
                }
                transition={
                  prefersReduced
                    ? { duration: 0.16, ease: "easeOut" }
                    : { duration: 0.18, ease: EASE_OUT_EXPO }
                }
                style={{
                  transformOrigin:
                    msg.role === "user" ? "100% 100%" : "0% 100%",
                }}
                className={
                  msg.role === "user"
                    ? "ml-8 rounded-[var(--radius-md)] bg-[var(--bg-inverse)] px-3.5 py-2.5 text-[13px] leading-relaxed text-[var(--ink-inverse)] shadow-[var(--shadow-surface)]"
                    : "surface-elevated mr-4 rounded-[var(--radius-md)] px-4 py-3 text-[13px] leading-relaxed text-[var(--ink-primary)]"
                }
              >
                {msg.role === "assistant" ? (
                  <FormattedAssistantText content={msg.content} />
                ) : (
                  <p className="whitespace-pre-wrap">{msg.content}</p>
                )}
                {msg.links && msg.links.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1.5 border-t border-[var(--border-hairline)] pt-2.5">
                    {msg.links.map((item) => (
                      <Link
                        key={item.href + item.label}
                        href={item.href}
                        onClick={() => animateToClose()}
                        className="btn-press group inline-flex items-center gap-1 rounded-[var(--radius-xs)] border border-[var(--accent-border)] bg-[var(--accent-soft)] px-2.5 py-1 font-mono text-[11px] font-medium text-[var(--accent-deep)] hover:border-[var(--accent)] hover:bg-[var(--accent)] hover:text-white"
                      >
                        {item.label}
                        <ArrowRight
                          size={11}
                          weight="bold"
                          className="hover-nudge-x"
                          aria-hidden="true"
                        />
                      </Link>
                    ))}
                  </div>
                )}
              </motion.div>
            );
          })}

          {loading && (
            <motion.div
              role="status"
              aria-live="polite"
              initial={
                prefersReduced
                  ? { opacity: 0 }
                  : { opacity: 0, transform: "translateY(8px) scale(0.98)" }
              }
              animate={
                prefersReduced
                  ? { opacity: 1 }
                  : { opacity: 1, transform: "translateY(0px) scale(1)" }
              }
              transition={
                prefersReduced
                  ? { duration: 0.16, ease: "easeOut" }
                  : { duration: 0.18, ease: EASE_OUT_EXPO }
              }
              style={{ transformOrigin: "0% 100%" }}
              className="surface-elevated mr-12 flex items-center gap-2.5 rounded-[var(--radius-md)] px-4 py-3 font-mono text-[11px] text-[var(--ink-muted)]"
            >
              <span
                className="inline-flex items-center gap-1"
                aria-hidden="true"
              >
                {[0, 1, 2].map((dot) =>
                  prefersReduced ? (
                    <span
                      key={dot}
                      className="h-1.5 w-1.5 rounded-full bg-[var(--accent)] opacity-70"
                    />
                  ) : (
                    <motion.span
                      key={dot}
                      className="h-1.5 w-1.5 rounded-full bg-[var(--accent)]"
                      initial={{ opacity: 0.25 }}
                      animate={{ opacity: [0.25, 1, 0.25] }}
                      transition={{
                        duration: 0.9,
                        repeat: Infinity,
                        ease: "easeInOut",
                        delay: dot * 0.12,
                      }}
                    />
                  )
                )}
              </span>
              <span>
                {geminiEnabled
                  ? `Synthesizing with ${displayModelLabel}...`
                  : "Querying verified dossier..."}
              </span>
            </motion.div>
          )}

          {/* Quick prompts when conversation is fresh */}
          {messages.length <= 2 && !loading && (
            <div className="pt-2">
              <p className="mb-2 font-mono text-[11px] uppercase tracking-[0.06em] text-[var(--ink-muted)]">
                Suggested Queries
              </p>
              <div className="space-y-1.5">
                {QUICK_PROMPTS.map((prompt) => (
                  <button
                    key={prompt}
                    type="button"
                    onClick={() => onSubmitQuestion(prompt)}
                    className="btn-press block w-full rounded-[var(--radius-sm)] border border-[var(--border-hairline)] bg-[var(--bg-surface)] px-3.5 py-2.5 text-left text-xs font-medium text-[var(--ink-secondary)] hover:border-[var(--accent-border)] hover:bg-[var(--accent-soft)]/50 hover:text-[var(--ink-primary)]"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Translucent floating chrome input footer */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            onSubmitQuestion(input);
          }}
          className="chrome-surface absolute inset-x-0 bottom-0 z-20 border-t border-[var(--border-hairline)] p-4 shadow-[var(--shadow-inset-highlight)]"
        >
          {/* Subtle upward edge fade above floating footer chrome */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 -top-3 h-3 bg-gradient-to-t from-[rgba(248,249,251,0.65)] to-transparent"
          />

          <div className="flex items-center gap-2">
            <input
              type="text"
              value={input}
              maxLength={4000}
              onChange={(e) => onInputChange(e.target.value)}
              placeholder="Ask about stack, projects, B.MLS, availability..."
              className="flex-1 rounded-[var(--radius-sm)] border border-[var(--border-strong)] bg-[var(--bg-surface)] px-3 py-2 text-sm text-[var(--ink-primary)] placeholder:text-[var(--ink-muted)] transition-[border-color,box-shadow] duration-150 focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent-ring)] focus:outline-none"
            />
            <button
              type="submit"
              disabled={loading || input.trim().length < 2}
              aria-label="Send question"
              className="btn-press inline-flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-[var(--radius-sm)] bg-[var(--bg-inverse)] text-[var(--ink-inverse)] hover:bg-[var(--accent)] disabled:cursor-not-allowed disabled:opacity-40"
            >
              <PaperPlaneRight size={16} weight="bold" aria-hidden="true" />
            </button>
          </div>
          <p className="mt-2 font-mono text-[11px] text-[var(--ink-muted)]">
            {geminiEnabled
              ? `Grounded in verified dossier · Multi-turn ${displayModelLabel}`
              : "Zero fabricated claims · Deterministic Grounded Dossier Index"}
          </p>
        </form>
      </motion.aside>
    </div>
  );
}

export function AiAssistantDrawer({ open, onClose }: AiAssistantDrawerProps) {
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [geminiEnabled, setGeminiEnabled] = useState(false);
  const [configuredModel, setConfiguredModel] =
    useState<string>("gemini-3.8-flash");
  const [activeMode, setActiveMode] = useState<"gemini" | "grounded-index">(
    "grounded-index"
  );
  const [activeModel, setActiveModel] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([WELCOME_MESSAGE]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;

    fetch("/api/chat", { cache: "no-store" })
      .then((res) =>
        res.ok ? (res.json() as Promise<ChatStatusResponse>) : null
      )
      .then((status) => {
        if (!status || cancelled) return;
        if (status.primaryModel) {
          setConfiguredModel(status.primaryModel);
        }
        if (status.geminiEnabled) {
          setGeminiEnabled(true);
          setActiveMode("gemini");
          setActiveModel((prev) =>
            prev && status.primaryModel && prev !== status.primaryModel
              ? null
              : prev
          );
        } else {
          setGeminiEnabled(false);
          setActiveMode("grounded-index");
          setActiveModel(null);
        }
      })
      .catch(() => {
        // Silently keep current status label if status check fails
      });

    return () => {
      cancelled = true;
    };
  }, [open]);

  function resetConversation() {
    if (loading) return;
    setMessages([WELCOME_MESSAGE]);
    setActiveModel(null);
    if (geminiEnabled) {
      setActiveMode("gemini");
    }
  }

  async function submitQuestion(rawQuestion: string) {
    const trimmed = rawQuestion.trim();
    if (!trimmed || loading) return;

    const history: ChatHistoryTurn[] = messages
      .filter((msg) => msg.id !== WELCOME_MESSAGE.id && !msg.isSystemError)
      .slice(-20)
      .map((msg) => ({
        role: msg.role,
        content: msg.content,
      }));

    const userMsg: ChatMessage = {
      id: `u-${Date.now()}`,
      role: "user",
      content: trimmed,
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const { visitorId, sessionId } = getClientTelemetryIds();
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: trimmed, history, visitorId, sessionId }),
      });

      if (!res.ok) {
        throw new Error("Request failed");
      }

      const data = (await res.json()) as ChatResponsePayload;
      setActiveMode(data.mode);
      if (data.mode === "gemini") {
        setGeminiEnabled(true);
        setActiveModel(data.model ?? configuredModel);
      } else {
        setActiveModel(null);
      }

      setMessages((prev) => [
        ...prev,
        {
          id: `a-${Date.now()}`,
          role: "assistant",
          content: data.answer,
          links: data.links,
          mode: data.mode,
          model: data.model,
        },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          role: "assistant",
          content:
            "Unable to query the dossier endpoint right now. You can inspect all case studies on /work or reach Akaolisa directly at akaolisaenwedo4real@gmail.com.",
          links: [{ label: "Go to Contact", href: "/contact" }],
          isSystemError: true,
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  const displayModelLabel = formatGeminiModelLabel(
    activeModel ?? configuredModel
  );

  const statusLabel =
    activeMode === "gemini"
      ? activeModel
        ? `${displayModelLabel} · Live`
        : `${displayModelLabel} · Ready`
      : "Grounded Dossier Index";

  return (
    <AnimatePresence>
      {open && (
        <AiAssistantDrawerSheet
          key="ai-assistant-drawer-sheet"
          onClose={onClose}
          messages={messages}
          input={input}
          onInputChange={setInput}
          loading={loading}
          geminiEnabled={geminiEnabled}
          displayModelLabel={displayModelLabel}
          statusLabel={statusLabel}
          onReset={resetConversation}
          onSubmitQuestion={submitQuestion}
        />
      )}
    </AnimatePresence>
  );
}
