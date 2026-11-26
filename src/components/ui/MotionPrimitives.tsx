"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import {
  AnimatePresence,
  motion,
  useReducedMotion,
  useScroll,
  useSpring,
} from "framer-motion";

/* -------------------------------------------------------------------------- */
/*  Shared Physics, Easings & Gesture Math                                    */
/* -------------------------------------------------------------------------- */

export const EASE_OUT_EXPO: [number, number, number, number] = [
  0.23, 1, 0.32, 1,
];
export const EASE_IN_OUT: [number, number, number, number] = [
  0.77, 0, 0.175, 1,
];
export const EASE_DRAWER: [number, number, number, number] = [0.32, 0.72, 0, 1];

/** Apple critically damped spring (damping ratio 1.0, zero overshoot). */
export const SPRING_CRISP = {
  type: "spring" as const,
  bounce: 0,
  duration: 0.34,
};

/** Snappy critically damped spring for shared-layout tab & nav indicators. */
export const SPRING_TAB = {
  type: "spring" as const,
  bounce: 0,
  duration: 0.28,
};

/** Momentum-only spring for high-velocity gesture flicks. */
export const SPRING_FLICK = {
  type: "spring" as const,
  bounce: 0.14,
  duration: 0.34,
};

/**
 * Projects final resting displacement (px) from pointer release velocity (px/s),
 * matching UIScrollView deceleration rate (default 0.998).
 */
export function projectVelocity(vPxPerSec: number, decel = 0.998): number {
  if (decel <= 0 || decel >= 1) return 0;
  return ((vPxPerSec / 1000) * decel) / (1 - decel);
}

/**
 * Asymptotic rubber-band resistance for overscroll / boundary overshoot.
 */
export function rubberband(
  overshoot: number,
  dimension: number,
  c = 0.55
): number {
  if (dimension <= 0) return 0;
  return (overshoot * dimension * c) / (dimension + c * Math.abs(overshoot));
}

/* -------------------------------------------------------------------------- */
/*  Reveal                                                                    */
/* -------------------------------------------------------------------------- */

export interface RevealProps {
  children: ReactNode;
  delay?: number;
  className?: string;
  y?: number;
  immediate?: boolean;
}

export function Reveal({
  children,
  delay = 0,
  className,
  y = 12,
  immediate = false,
}: RevealProps) {
  const prefersReduced = useReducedMotion();

  if (prefersReduced) {
    if (immediate) {
      return (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.18, delay: Math.min(delay, 0.08), ease: "easeOut" }}
          className={className}
        >
          {children}
        </motion.div>
      );
    }

    return (
      <motion.div
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true, amount: "some" }}
        transition={{ duration: 0.18, delay: Math.min(delay, 0.08), ease: "easeOut" }}
        className={className}
      >
        {children}
      </motion.div>
    );
  }

  if (immediate) {
    return (
      <motion.div
        initial={{ opacity: 0, transform: `translateY(${y}px)` }}
        animate={{ opacity: 1, transform: "translateY(0px)" }}
        transition={{ duration: 0.28, delay, ease: EASE_OUT_EXPO }}
        className={className}
      >
        {children}
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, transform: `translateY(${y}px)` }}
      whileInView={{ opacity: 1, transform: "translateY(0px)" }}
      viewport={{ once: true, amount: "some", margin: "0px" }}
      transition={{ duration: 0.28, delay, ease: EASE_OUT_EXPO }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/* -------------------------------------------------------------------------- */
/*  StaggerGroup & StaggerItem                                                */
/* -------------------------------------------------------------------------- */

interface StaggerContextValue {
  staggerStep: number;
  maxDelay: number;
  trigger: "inView" | "mount" | "instant";
  y: number;
}

const StaggerContext = createContext<StaggerContextValue>({
  staggerStep: 0.04,
  maxDelay: 0.16,
  trigger: "inView",
  y: 10,
});

export interface StaggerGroupProps {
  children: ReactNode;
  className?: string;
  staggerStep?: number;
  maxDelay?: number;
  trigger?: "inView" | "mount" | "instant";
  y?: number;
}

export function StaggerGroup({
  children,
  className,
  staggerStep = 0.04,
  maxDelay = 0.16,
  trigger = "inView",
  y = 10,
}: StaggerGroupProps) {
  const prefersReduced = useReducedMotion();

  if (trigger === "instant") {
    return (
      <StaggerContext.Provider
        value={{ staggerStep, maxDelay, trigger: "instant", y }}
      >
        <div className={className}>{children}</div>
      </StaggerContext.Provider>
    );
  }

  const containerVariants = {
    hidden: {},
    visible: {
      transition: {
        staggerChildren: prefersReduced ? 0 : staggerStep,
      },
    },
  };

  if (trigger === "mount") {
    return (
      <StaggerContext.Provider
        value={{ staggerStep, maxDelay, trigger, y }}
      >
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className={className}
        >
          {children}
        </motion.div>
      </StaggerContext.Provider>
    );
  }

  return (
    <StaggerContext.Provider value={{ staggerStep, maxDelay, trigger, y }}>
      <motion.div
        variants={containerVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: "some", margin: "0px" }}
        className={className}
      >
        {children}
      </motion.div>
    </StaggerContext.Provider>
  );
}

export interface StaggerItemProps {
  children: ReactNode;
  index?: number;
  className?: string;
}

export function StaggerItem({ children, index, className }: StaggerItemProps) {
  const prefersReduced = useReducedMotion();
  const { staggerStep, maxDelay, trigger, y } = useContext(StaggerContext);

  if (trigger === "instant") {
    return <div className={className}>{children}</div>;
  }

  const computedDelay =
    index !== undefined ? Math.min(index * staggerStep, maxDelay) : undefined;

  if (prefersReduced) {
    if (computedDelay !== undefined) {
      return (
        <motion.div
          initial={{ opacity: 0 }}
          animate={trigger === "mount" ? { opacity: 1 } : undefined}
          whileInView={trigger === "inView" ? { opacity: 1 } : undefined}
          viewport={
            trigger === "inView" ? { once: true, amount: "some" } : undefined
          }
          transition={{ duration: 0.16, ease: "easeOut" }}
          className={className}
        >
          {children}
        </motion.div>
      );
    }

    return (
      <motion.div
        variants={{
          hidden: { opacity: 0 },
          visible: {
            opacity: 1,
            transition: { duration: 0.16, ease: "easeOut" },
          },
        }}
        className={className}
      >
        {children}
      </motion.div>
    );
  }

  if (computedDelay !== undefined) {
    return (
      <motion.div
        initial={{ opacity: 0, transform: `translateY(${y}px)` }}
        animate={
          trigger === "mount"
            ? { opacity: 1, transform: "translateY(0px)" }
            : undefined
        }
        whileInView={
          trigger === "inView"
            ? { opacity: 1, transform: "translateY(0px)" }
            : undefined
        }
        viewport={
          trigger === "inView"
            ? { once: true, amount: "some", margin: "0px" }
            : undefined
        }
        transition={{
          duration: 0.24,
          delay: computedDelay,
          ease: EASE_OUT_EXPO,
        }}
        className={className}
      >
        {children}
      </motion.div>
    );
  }

  return (
    <motion.div
      variants={{
        hidden: { opacity: 0, transform: `translateY(${y}px)` },
        visible: {
          opacity: 1,
          transform: "translateY(0px)",
          transition: { duration: 0.24, ease: EASE_OUT_EXPO },
        },
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/* -------------------------------------------------------------------------- */
/*  ScrollProgressRail                                                        */
/* -------------------------------------------------------------------------- */

export interface ScrollProgressRailProps {
  className?: string;
}

export function ScrollProgressRail({ className }: ScrollProgressRailProps) {
  const prefersReduced = useReducedMotion();
  const { scrollYProgress } = useScroll();
  const smoothScaleX = useSpring(scrollYProgress, {
    stiffness: 320,
    damping: 36,
    restDelta: 0.001,
  });

  return (
    <motion.div
      aria-hidden="true"
      style={{
        scaleX: prefersReduced ? scrollYProgress : smoothScaleX,
        transformOrigin: "0% 50%",
      }}
      className={
        className ??
        "pointer-events-none fixed inset-x-0 top-16 z-40 h-[2px] bg-[var(--accent)]"
      }
    />
  );
}

/* -------------------------------------------------------------------------- */
/*  BlurCrossfade                                                             */
/* -------------------------------------------------------------------------- */

export interface BlurCrossfadeProps {
  contentKey: string | number;
  children: ReactNode;
  className?: string;
  inline?: boolean;
  y?: number;
}

export function BlurCrossfade({
  contentKey,
  children,
  className,
  inline = false,
  y = 3,
}: BlurCrossfadeProps) {
  const prefersReduced = useReducedMotion();

  const initialState = prefersReduced
    ? { opacity: 0 }
    : inline
      ? { opacity: 0, filter: "blur(2px)", transform: "scale(0.92)" }
      : { opacity: 0, filter: "blur(2px)", transform: `translateY(${y}px)` };

  const animateState = prefersReduced
    ? {
        opacity: 1,
        transition: { duration: 0.14, ease: "easeOut" as const },
      }
    : inline
      ? {
          opacity: 1,
          filter: "blur(0px)",
          transform: "scale(1)",
          transition: { duration: 0.16, ease: EASE_OUT_EXPO },
        }
      : {
          opacity: 1,
          filter: "blur(0px)",
          transform: "translateY(0px)",
          transition: { duration: 0.18, ease: EASE_OUT_EXPO },
        };

  const exitState = prefersReduced
    ? {
        opacity: 0,
        transition: { duration: 0.12, ease: "easeOut" as const },
      }
    : inline
      ? {
          opacity: 0,
          filter: "blur(2px)",
          transform: "scale(0.92)",
          transition: { duration: 0.14, ease: EASE_OUT_EXPO },
        }
      : {
          opacity: 0,
          filter: "blur(2px)",
          transform: "translateY(-2px)",
          transition: { duration: 0.16, ease: EASE_OUT_EXPO },
        };

  if (inline) {
    return (
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={contentKey}
          initial={initialState}
          animate={animateState}
          exit={exitState}
          className={className ?? "inline-flex items-center"}
        >
          {children}
        </motion.span>
      </AnimatePresence>
    );
  }

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={contentKey}
        initial={initialState}
        animate={animateState}
        exit={exitState}
        className={className}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}

/* -------------------------------------------------------------------------- */
/*  ClipSegmentedTabs (GPU clip-path: inset() dual-layer segmented control)   */
/* -------------------------------------------------------------------------- */

export interface SegmentedTabOption<T extends string> {
  value: T;
  label: string;
  badge?: string | number;
}

export interface ClipSegmentedTabsProps<T extends string> {
  options: ReadonlyArray<SegmentedTabOption<T>>;
  value: T;
  onChange: (value: T) => void;
  ariaLabel: string;
  size?: "sm" | "md";
  variant?: "inverse" | "surface";
  fullWidth?: boolean;
  className?: string;
}

const useIsomorphicLayoutEffect =
  typeof window !== "undefined" ? useLayoutEffect : useEffect;

export function ClipSegmentedTabs<T extends string>({
  options,
  value,
  onChange,
  ariaLabel,
  size = "md",
  variant = "inverse",
  fullWidth = false,
  className = "",
}: ClipSegmentedTabsProps<T>) {
  const prefersReduced = useReducedMotion();
  const railRef = useRef<HTMLDivElement>(null);
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const [clipInset, setClipInset] = useState<string | null>(null);

  const activeIndex = Math.max(
    0,
    options.findIndex((opt) => opt.value === value)
  );

  const measureClip = useCallback(() => {
    const rail = railRef.current;
    const activeBtn = tabRefs.current[activeIndex];
    if (!rail || !activeBtn) return;

    const railWidth = rail.offsetWidth;
    if (railWidth <= 0) return;

    const leftPct = (activeBtn.offsetLeft / railWidth) * 100;
    const rightPct =
      ((railWidth - (activeBtn.offsetLeft + activeBtn.offsetWidth)) /
        railWidth) *
      100;

    setClipInset(
      `inset(0% ${Math.max(0, rightPct).toFixed(3)}% 0% ${Math.max(0, leftPct).toFixed(3)}% round 7px)`
    );
  }, [activeIndex]);

  useIsomorphicLayoutEffect(() => {
    measureClip();
  }, [measureClip, options]);

  useEffect(() => {
    const rail = railRef.current;
    if (!rail || typeof ResizeObserver === "undefined") return;

    const observer = new ResizeObserver(() => {
      measureClip();
    });
    observer.observe(rail);
    return () => observer.disconnect();
  }, [measureClip]);

  const handleKeyDown = (e: KeyboardEvent<HTMLButtonElement>, idx: number) => {
    let nextIdx: number | null = null;

    if (e.key === "ArrowRight") {
      nextIdx = (idx + 1) % options.length;
    } else if (e.key === "ArrowLeft") {
      nextIdx = (idx - 1 + options.length) % options.length;
    } else if (e.key === "Home") {
      nextIdx = 0;
    } else if (e.key === "End") {
      nextIdx = options.length - 1;
    }

    if (nextIdx !== null) {
      e.preventDefault();
      const target = options[nextIdx];
      if (target) {
        onChange(target.value);
        tabRefs.current[nextIdx]?.focus();
      }
    }
  };

  const sizeClass =
    size === "sm"
      ? "px-2.5 py-1.5 text-[11px] font-medium"
      : "px-3.5 py-2 text-xs font-medium";

  const activeSurfaceClass =
    variant === "surface"
      ? "bg-[var(--bg-surface)] text-[var(--ink-primary)] ring-1 ring-inset ring-[rgba(15,20,30,0.08)]"
      : "bg-[var(--bg-inverse)] text-[var(--ink-inverse)]";

  const activeBadgeClass =
    variant === "surface"
      ? "text-[var(--ink-muted)]"
      : "text-[rgba(248,249,251,0.74)]";

  return (
    <div
      className={`rounded-[var(--radius-sm)] bg-[var(--bg-subtle)] p-1 ${
        fullWidth ? "flex w-full" : "inline-flex max-w-full overflow-x-auto"
      } ${className}`}
    >
      <div
        ref={railRef}
        role="tablist"
        aria-label={ariaLabel}
        className={`relative flex items-center ${fullWidth ? "w-full" : "min-w-max"}`}
      >
        {/* Interactive base layer */}
        {options.map((opt, idx) => {
          const isActive = opt.value === value;
          return (
            <button
              key={opt.value}
              ref={(el) => {
                tabRefs.current[idx] = el;
              }}
              type="button"
              role="tab"
              aria-selected={isActive}
              tabIndex={isActive ? 0 : -1}
              onClick={() => onChange(opt.value)}
              onKeyDown={(e) => handleKeyDown(e, idx)}
              className={`btn-press relative z-10 inline-flex items-center justify-center gap-1.5 rounded-[7px] whitespace-nowrap select-none ${
                fullWidth ? "flex-1" : ""
              } ${sizeClass} ${
                isActive && !clipInset
                  ? activeSurfaceClass
                  : "text-[var(--ink-secondary)] hover:text-[var(--ink-primary)]"
              }`}
            >
              <span>{opt.label}</span>
              {opt.badge !== undefined && (
                <span
                  className={`font-mono text-[11px] tabular-nums ${
                    isActive && !clipInset
                      ? activeBadgeClass
                      : "text-[var(--ink-muted)]"
                  }`}
                >
                  {opt.badge}
                </span>
              )}
            </button>
          );
        })}

        {/* GPU clip-path active overlay layer */}
        {clipInset && (
          <div
            aria-hidden="true"
            style={{
              clipPath: clipInset,
              transition: prefersReduced
                ? "none"
                : "clip-path 240ms var(--ease-out-expo)",
            }}
            className={`pointer-events-none absolute inset-0 z-20 flex items-center rounded-[7px] ${activeSurfaceClass}`}
          >
            {options.map((opt) => (
              <span
                key={opt.value}
                className={`inline-flex items-center justify-center gap-1.5 whitespace-nowrap select-none ${
                  fullWidth ? "flex-1" : ""
                } ${sizeClass}`}
              >
                <span>{opt.label}</span>
                {opt.badge !== undefined && (
                  <span
                    className={`font-mono text-[11px] tabular-nums ${activeBadgeClass}`}
                  >
                    {opt.badge}
                  </span>
                )}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
