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
  X,
} from "@phosphor-icons/react";
import {
  formatGeminiModelLabel,
  type ChatHistoryTurn,
  type ChatResponsePayload,
  type SuggestedLink,
} from "@/lib/knowledge";
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
    "Ask about Akaolisa Enwedo's architecture experience, OXAKALABS case studies, AI and quantitative stack, B.MLS clinical background, or remote contract availability. Every answer stays grounded in his verified dossier.",
  links: [
    { label: "View selected work", href: "/work" },
    { label: "Experience and clinical lab", href: "/experience" },
  ],
};

const QUICK_PROMPTS = [
  "What is Akaolisa's AI and multi-agent stack?",
  "Walk me through Fortress Fleet AI and Koridor Engine OS",
  "How does his B.MLS clinical leadership strengthen software delivery?",
  "Is he available for remote freelance contracts?",
];

const useIsomorphicLayoutEffect =
  typeof window !== "undefined" ? useLayoutEffect : useEffect;

function getInitialDrawerWidth(): number {
  if (typeof window === "undefined") return 464;
  return Math.min(window.innerWidth, 464);
}

function computePointerVelocityX(samples: PointerSample[]): number {
  if (samples.length < 2) return 0;
  const now = performance.now();
  const last = samples[samples.length - 1];
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
    <div className="space-y-2.5">
      {blocks.map((block, idx) => {
        if (block.type === "heading") {
          return (
            <p
              key={idx}
              className="type-sm pt-1 font-semibold text-[var(--accent-deep)]"
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
                  className="type-sm list-disc text-[var(--ink-primary)] marker:text-[var(--accent)]"
                >
                  {renderInlineEmphasis(item)}
                </li>
              ))}
            </ul>
          );
        }
        return (
          <p key={idx} className="type-sm text-[var(--ink-primary)]">
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

  useEffect(() => {
    closeBtnRef.current?.focus({ preventScroll: true });
  }, []);

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

  useEffect(() => {
    if (prefersReduced) {
      x.set(0);
      if (!isPresent) {
        const timer = window.setTimeout(() => {
          safeToRemove();
        }, 140);
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
        ? animate(x, width, { duration: 0.24, ease: EASE_DRAWER })
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
          // Ignore synthetic capture rejection
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
            // Ignore synthetic capture rejection
          }
        } else {
          return;
        }
      } else {
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
            // Ignore synthetic capture rejection
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
        className={`relative z-10 flex h-full w-full max-w-[464px] flex-col border-l border-[var(--border-hairline)] bg-[var(--bg-canvas)] shadow-[var(--shadow-float)] ${
          isDragging ? "select-none" : ""
        }`}
      >
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 left-full w-72 bg-[var(--bg-canvas)]"
        />

        {/* Marine Ink Drawer Header */}
        <div
          data-drawer-drag-handle="true"
          style={{ touchAction: prefersReduced ? undefined : "none" }}
          className={`relative z-20 flex items-center justify-between border-b border-[var(--border-on-marine)] bg-[var(--bg-marine)] px-5 py-4 text-[var(--ink-on-marine)] ${
            prefersReduced ? "" : "cursor-grab active:cursor-grabbing"
          }`}
        >
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--radius-sm)] bg-[var(--bg-marine-elevated)] text-[var(--accent-bright)]">
              <Sparkle size={16} weight="bold" aria-hidden="true" />
            </span>
            <div>
              <h2
                id="ai-drawer-title"
                className="type-subhead text-[var(--ink-on-marine)]"
              >
                Ask about Akaolisa
              </h2>
              <p className="type-sm text-[var(--ink-on-marine-muted)]">
                {statusLabel}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {messages.length > 1 && (
              <button
                type="button"
                onClick={onReset}
                disabled={loading}
                aria-label="Reset conversation"
                title="Start a new thread"
                className="btn-press inline-flex h-9 w-9 items-center justify-center rounded-[var(--radius-sm)] border border-[var(--border-on-marine)] text-[var(--ink-on-marine-secondary)] hover:border-[var(--border-on-marine-strong)] hover:text-[var(--ink-on-marine)] disabled:cursor-not-allowed disabled:opacity-40"
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
              className="btn-press inline-flex h-9 w-9 items-center justify-center rounded-[var(--radius-sm)] border border-[var(--border-on-marine)] text-[var(--ink-on-marine-secondary)] hover:border-[var(--border-on-marine-strong)] hover:text-[var(--ink-on-marine)]"
            >
              <X size={16} weight="bold" aria-hidden="true" />
            </button>
          </div>
        </div>

        {/* Message Thread */}
        <div
          ref={scrollRef}
          className="flex-1 space-y-4 overflow-y-auto px-5 py-6"
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
                      : { opacity: 0, y: 8 }
                }
                animate={
                  prefersReduced ? { opacity: 1 } : { opacity: 1, y: 0 }
                }
                transition={
                  prefersReduced
                    ? { duration: 0.14, ease: "easeOut" }
                    : { duration: 0.2, ease: EASE_OUT_EXPO }
                }
                className={
                  msg.role === "user"
                    ? "type-sm ml-8 rounded-[var(--radius-md)] bg-[var(--bg-marine)] px-4 py-3 text-[var(--ink-on-marine)]"
                    : "mr-3 rounded-[var(--radius-md)] border border-[var(--border-hairline)] bg-[var(--bg-surface)] px-4 py-3.5 text-[var(--ink-primary)]"
                }
              >
                {msg.role === "assistant" ? (
                  <FormattedAssistantText content={msg.content} />
                ) : (
                  <p className="whitespace-pre-wrap">{msg.content}</p>
                )}

                {msg.links && msg.links.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 border-t border-[var(--border-hairline)] pt-2.5">
                    {msg.links.map((item) => (
                      <Link
                        key={item.href + item.label}
                        href={item.href}
                        onClick={() => animateToClose()}
                        className="type-sm group inline-flex items-center gap-1 font-medium text-[var(--accent-deep)] transition-colors duration-150 hover:text-[var(--accent)]"
                      >
                        <span>{item.label}</span>
                        <ArrowRight
                          size={13}
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
            <div
              role="status"
              aria-live="polite"
              className="type-sm mr-10 rounded-[var(--radius-md)] border border-[var(--border-hairline)] bg-[var(--bg-surface)] px-4 py-3 text-[var(--ink-muted)]"
            >
              {geminiEnabled
                ? `Synthesizing with ${displayModelLabel}...`
                : "Querying verified dossier..."}
            </div>
          )}

          {messages.length <= 2 && !loading && (
            <div className="pt-2">
              <p className="type-sm mb-2.5 font-medium text-[var(--ink-muted)]">
                Suggested questions
              </p>
              <div className="divide-y divide-[var(--border-hairline)] border-y border-[var(--border-hairline)]">
                {QUICK_PROMPTS.map((prompt) => (
                  <button
                    key={prompt}
                    type="button"
                    onClick={() => onSubmitQuestion(prompt)}
                    className="type-sm btn-press block w-full py-3 text-left font-medium text-[var(--ink-secondary)] transition-colors duration-150 hover:text-[var(--accent-deep)]"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Input Composer */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            onSubmitQuestion(input);
          }}
          className="border-t border-[var(--border-hairline)] bg-[var(--bg-surface)] p-4"
        >
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={input}
              maxLength={4000}
              onChange={(e) => onInputChange(e.target.value)}
              placeholder="Ask about projects, stack, B.MLS, or availability..."
              className="type-sm flex-1 rounded-[var(--radius-sm)] border border-[var(--border-strong)] bg-[var(--bg-canvas)] px-3.5 py-2.5 text-[var(--ink-primary)] placeholder:text-[var(--ink-muted)] transition-[border-color,box-shadow] duration-150 focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent-ring)] focus:outline-none"
            />
            <button
              type="submit"
              disabled={loading || input.trim().length < 2}
              aria-label="Send question"
              className="btn-press inline-flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-[var(--radius-sm)] bg-[var(--bg-marine)] text-[var(--ink-on-marine)] hover:bg-[var(--accent)] disabled:cursor-not-allowed disabled:opacity-40"
            >
              <PaperPlaneRight size={16} weight="bold" aria-hidden="true" />
            </button>
          </div>
          <p className="type-sm mt-2 text-[var(--ink-muted)]">
            {geminiEnabled
              ? `Grounded in verified dossier via ${displayModelLabel}`
              : "Grounded deterministic dossier index"}
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

  const statusCheckedRef = useRef(false);

  useEffect(() => {
    if (!open || statusCheckedRef.current) return;
    statusCheckedRef.current = true;

    fetch("/api/chat")
      .then((res) =>
        res.ok ? (res.json() as Promise<ChatStatusResponse>) : null
      )
      .then((status) => {
        if (!status) return;
        if (status.primaryModel) {
          setConfiguredModel(status.primaryModel);
        }
        if (status.geminiEnabled) {
          setGeminiEnabled(true);
          setActiveMode("gemini");
        }
      })
      .catch(() => {
        // Keep grounded-index label if check fails
      });
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
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: trimmed, history }),
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
          links: [{ label: "Go to contact", href: "/contact" }],
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
      ? `${displayModelLabel} grounded assistant`
      : "Grounded dossier index";

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
