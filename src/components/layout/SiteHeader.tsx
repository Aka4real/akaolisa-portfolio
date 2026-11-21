"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  AnimatePresence,
  LayoutGroup,
  animate,
  motion,
  useMotionValue,
  usePresence,
  useReducedMotion,
  useScroll,
  useTransform,
} from "framer-motion";
import { ArrowRight, FilePdf, Sparkle, X } from "@phosphor-icons/react";
import { PROFILE } from "@/data/profile";
import {
  SPRING_CRISP,
  SPRING_FLICK,
  SPRING_TAB,
  projectVelocity,
  rubberband,
} from "@/components/ui/MotionPrimitives";

interface SiteHeaderProps {
  onOpenResume: () => void;
  onOpenAssistant: () => void;
  mobileOpen?: boolean;
  onMobileOpenChange?: (open: boolean) => void;
}

const NAV_ITEMS = [
  { label: "Home", href: "/" },
  { label: "Work", href: "/work" },
  { label: "Experience", href: "/experience" },
  { label: "Contact", href: "/contact" },
] as const;

interface PointerSample {
  x: number;
  t: number;
}

interface MobileDrawerSheetProps {
  pathname: string;
  isActive: (href: string) => boolean;
  onClose: () => void;
  onOpenResume: () => void;
  onOpenAssistant: () => void;
}

function MobileDrawerSheet({
  isActive,
  onClose,
  onOpenResume,
  onOpenAssistant,
}: MobileDrawerSheetProps) {
  const prefersReduced = useReducedMotion();
  const [isPresent, safeToRemove] = usePresence();

  const [drawerWidth, setDrawerWidth] = useState(320);
  const asideRef = useRef<HTMLElement>(null);
  const closeBtnRef = useRef<HTMLButtonElement>(null);

  const x = useMotionValue(prefersReduced ? 0 : 340);
  const controlsRef = useRef<ReturnType<typeof animate> | null>(null);
  const releaseVelocityRef = useRef(0);

  const activePointerIdRef = useRef<number | null>(null);
  const dragLockedRef = useRef(false);
  const startXRef = useRef(0);
  const startYRef = useRef(0);
  const grabOffsetXRef = useRef(0);
  const samplesRef = useRef<PointerSample[]>([]);

  const scrimOpacity = useTransform(x, [0, drawerWidth], [1, 0]);

  useEffect(() => {
    const measured = asideRef.current?.offsetWidth;
    if (measured && measured > 0) {
      setDrawerWidth(measured);
    }
  }, []);

  // Enter & interruptible exit orchestration
  useEffect(() => {
    if (prefersReduced) {
      if (!isPresent) {
        const timer = window.setTimeout(() => safeToRemove(), 160);
        return () => window.clearTimeout(timer);
      }
      x.set(0);
      return;
    }

    const width = asideRef.current?.offsetWidth || drawerWidth;

    if (isPresent) {
      controlsRef.current?.stop();
      if (x.get() > width) {
        x.set(width);
      }
      controlsRef.current = animate(x, 0, SPRING_CRISP);
    } else {
      controlsRef.current?.stop();
      const vx = releaseVelocityRef.current;
      releaseVelocityRef.current = 0;
      const spring =
        vx > 0 ? { ...SPRING_FLICK, velocity: vx } : SPRING_CRISP;
      const controls = animate(x, width, spring);
      controlsRef.current = controls;
      controls.then(() => {
        safeToRemove();
      });
    }

    return () => {
      controlsRef.current?.stop();
    };
  }, [isPresent, prefersReduced, drawerWidth, safeToRemove, x]);

  // Focus initial close button on mount for keyboard accessibility
  useEffect(() => {
    closeBtnRef.current?.focus({ preventScroll: true });
  }, []);

  // Interruptible Escape key dismissal
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

  const handlePointerDown = (e: ReactPointerEvent<HTMLElement>) => {
    if (prefersReduced) return;
    if (e.pointerType === "mouse" && e.button !== 0) return;
    if (activePointerIdRef.current !== null) return;

    activePointerIdRef.current = e.pointerId;
    dragLockedRef.current = false;
    startXRef.current = e.clientX;
    startYRef.current = e.clientY;
    samplesRef.current = [{ x: e.clientX, t: performance.now() }];

    // Mid-flight catch if drawer is currently moving
    if (x.get() > 2) {
      controlsRef.current?.stop();
      grabOffsetXRef.current = e.clientX - x.get();
    }
  };

  const handlePointerMove = (e: ReactPointerEvent<HTMLElement>) => {
    if (prefersReduced) return;
    if (activePointerIdRef.current !== e.pointerId) return;

    const dx = e.clientX - startXRef.current;
    const dy = e.clientY - startYRef.current;

    if (!dragLockedRef.current) {
      if (Math.abs(dy) > 10 && Math.abs(dy) > Math.abs(dx)) {
        activePointerIdRef.current = null;
        return;
      }
      if (Math.abs(dx) > 10 && Math.abs(dx) > Math.abs(dy)) {
        dragLockedRef.current = true;
        controlsRef.current?.stop();
        grabOffsetXRef.current = e.clientX - x.get();
        try {
          e.currentTarget.setPointerCapture(e.pointerId);
        } catch {
          // Ignore synthetic pointer capture rejection
        }
      } else {
        return;
      }
    }

    const width = asideRef.current?.offsetWidth || drawerWidth;
    const rawX = e.clientX - grabOffsetXRef.current;

    if (rawX < 0) {
      x.set(rubberband(rawX, width, 0.55));
    } else {
      x.set(Math.min(rawX, width));
    }

    const now = performance.now();
    const samples = samplesRef.current;
    samples.push({ x: e.clientX, t: now });
    while (samples.length > 1 && now - samples[0].t > 80) {
      samples.shift();
    }
  };

  const finishDrag = (e: ReactPointerEvent<HTMLElement>, cancelled: boolean) => {
    if (activePointerIdRef.current !== e.pointerId) return;
    activePointerIdRef.current = null;

    if (!dragLockedRef.current) return;
    dragLockedRef.current = false;

    try {
      if (e.currentTarget.hasPointerCapture(e.pointerId)) {
        e.currentTarget.releasePointerCapture(e.pointerId);
      }
    } catch {
      // Ignore release errors
    }

    const samples = samplesRef.current;
    let vx = 0;
    if (samples.length >= 2) {
      const first = samples[0];
      const last = samples[samples.length - 1];
      const dt = last.t - first.t;
      if (dt >= 8) {
        vx = ((last.x - first.x) / dt) * 1000;
      }
    }

    const width = asideRef.current?.offsetWidth || drawerWidth;
    const currentX = x.get();
    const projected = currentX + projectVelocity(vx, 0.998);

    // Sign-first reversal: leftward flick cancels dismissal immediately
    const shouldDismiss =
      !cancelled &&
      vx >= -150 &&
      (projected > width * 0.38 || (vx > 110 && currentX > 16));

    if (shouldDismiss) {
      releaseVelocityRef.current = Math.max(vx, 0);
      onClose();
    } else {
      controlsRef.current?.stop();
      controlsRef.current = animate(x, 0, {
        ...SPRING_CRISP,
        velocity: vx,
      });
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end md:hidden"
      role="dialog"
      aria-modal="true"
      aria-label="Mobile navigation"
    >
      {/* Drag-coupled backdrop scrim */}
      <motion.div
        style={prefersReduced ? undefined : { opacity: scrimOpacity }}
        initial={prefersReduced ? { opacity: 0 } : undefined}
        animate={prefersReduced ? { opacity: isPresent ? 1 : 0 } : undefined}
        transition={prefersReduced ? { duration: 0.16, ease: "easeOut" } : undefined}
        onClick={onClose}
        className="fixed inset-0 bg-[var(--scrim-drawer)] backdrop-blur-[var(--blur-scrim)]"
        aria-hidden="true"
      />

      {/* Right-edge spring drawer */}
      <motion.aside
        ref={asideRef}
        style={prefersReduced ? undefined : { x, touchAction: "pan-y" }}
        initial={prefersReduced ? { opacity: 0 } : undefined}
        animate={prefersReduced ? { opacity: isPresent ? 1 : 0 } : undefined}
        transition={prefersReduced ? { duration: 0.16, ease: "easeOut" } : undefined}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={(e) => finishDrag(e, false)}
        onPointerCancel={(e) => finishDrag(e, true)}
        className="relative z-10 flex h-full w-[min(86vw,340px)] flex-col border-l border-[var(--border-hairline)] bg-[var(--bg-canvas)] shadow-[var(--shadow-float)]"
      >
        {/* Drawer Header */}
        <div className="chrome-surface flex h-16 items-center justify-between border-b border-[var(--border-hairline)] px-5">
          <div className="flex items-center gap-2.5">
            <span className="flex h-7 w-7 items-center justify-center rounded-[8px] bg-[var(--bg-inverse)] font-mono text-[11px] font-semibold text-[var(--ink-inverse)]">
              {PROFILE.monogram}
            </span>
            <span className="text-xs font-semibold tracking-[0.06em] text-[var(--ink-primary)]">
              OXAKALABS
            </span>
          </div>
          <button
            ref={closeBtnRef}
            type="button"
            onClick={onClose}
            aria-label="Close menu"
            className="btn-press inline-flex h-9 w-9 items-center justify-center rounded-[var(--radius-sm)] border border-[var(--border-hairline)] bg-[var(--bg-surface)] text-[var(--ink-secondary)] hover:border-[var(--border-strong)] hover:text-[var(--ink-primary)]"
          >
            <X size={16} weight="bold" aria-hidden="true" />
          </button>
        </div>

        {/* Navigation Links */}
        <nav
          aria-label="Mobile navigation links"
          className="flex-1 overflow-y-auto px-4 py-5"
        >
          <div className="flex flex-col gap-1">
            {NAV_ITEMS.map((item) => {
              const active = isActive(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onClose}
                  aria-current={active ? "page" : undefined}
                  className={`btn-press flex items-center justify-between rounded-[var(--radius-sm)] px-3.5 py-3 text-sm font-medium ${
                    active
                      ? "bg-[var(--accent-soft)] text-[var(--accent-deep)]"
                      : "text-[var(--ink-secondary)] hover:bg-[var(--bg-subtle)] hover:text-[var(--ink-primary)]"
                  }`}
                >
                  <span>{item.label}</span>
                  {active && (
                    <span
                      className="h-1.5 w-1.5 rounded-full bg-[var(--accent)]"
                      aria-hidden="true"
                    />
                  )}
                </Link>
              );
            })}
          </div>
        </nav>

        {/* Drawer Utility Footer */}
        <div className="space-y-2.5 border-t border-[var(--border-hairline)] bg-[var(--bg-surface)] p-4">
          <Link
            href="/contact"
            onClick={onClose}
            className="btn-press group flex w-full items-center justify-center gap-2 rounded-[var(--radius-sm)] bg-[var(--bg-inverse)] px-4 py-2.5 text-xs font-medium text-[var(--ink-inverse)] hover:bg-[var(--bg-inverse-hover)]"
          >
            Start a Project
            <ArrowRight
              size={14}
              weight="bold"
              className="hover-nudge-x"
              aria-hidden="true"
            />
          </Link>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenResume();
              }}
              className="btn-press inline-flex items-center justify-center gap-1.5 rounded-[var(--radius-sm)] border border-[var(--border-strong)] bg-[var(--bg-surface)] px-3 py-2 text-xs font-medium text-[var(--ink-primary)] hover:border-[var(--accent-border)]"
            >
              <FilePdf size={14} weight="bold" aria-hidden="true" />
              Resume PDF
            </button>
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenAssistant();
              }}
              className="btn-press inline-flex items-center justify-center gap-1.5 rounded-[var(--radius-sm)] border border-[var(--accent-border)] bg-[var(--accent-soft)] px-3 py-2 text-xs font-medium text-[var(--accent-deep)] hover:border-[var(--accent)]"
            >
              <Sparkle size={14} weight="bold" aria-hidden="true" />
              Ask AI
            </button>
          </div>
        </div>
      </motion.aside>
    </div>
  );
}

export function SiteHeader({
  onOpenResume,
  onOpenAssistant,
  mobileOpen: controlledOpen,
  onMobileOpenChange,
}: SiteHeaderProps) {
  const pathname = usePathname();
  const prefersReduced = useReducedMotion();
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const [portalMounted, setPortalMounted] = useState(false);

  const mobileOpen =
    controlledOpen !== undefined ? controlledOpen : uncontrolledOpen;

  const setMobileOpen = useCallback(
    (next: boolean) => {
      if (onMobileOpenChange) {
        onMobileOpenChange(next);
      } else {
        setUncontrolledOpen(next);
      }
    },
    [onMobileOpenChange]
  );

  // Scroll-linked translucent chrome edge depth (zero React state on scroll)
  const { scrollY } = useScroll();
  const edgeProgress = useTransform(scrollY, [0, 32], [0, 1]);

  useEffect(() => {
    setPortalMounted(true);
  }, []);

  // Auto-close mobile drawer on route navigation
  const prevPathnameRef = useRef(pathname);
  useEffect(() => {
    if (prevPathnameRef.current !== pathname) {
      prevPathnameRef.current = pathname;
      if (mobileOpen) {
        setMobileOpen(false);
      }
    }
  }, [pathname, mobileOpen, setMobileOpen]);

  const isActive = useCallback(
    (href: string) => {
      if (href === "/") return pathname === "/";
      return pathname === href || pathname.startsWith(`${href}/`);
    },
    [pathname]
  );

  return (
    <>
      <header className="chrome-glass sticky top-0 z-40">
        {/* Scroll-linked ambient shadow layer (pure opacity, never animates box-shadow) */}
        <motion.div
          style={{ opacity: edgeProgress }}
          className="pointer-events-none absolute inset-0 shadow-[0_1px_2px_rgba(15,20,30,0.04),0_6px_18px_-6px_rgba(15,20,30,0.07)]"
          aria-hidden="true"
        />

        {/* Scroll-linked hairline separator */}
        <motion.div
          style={{ opacity: edgeProgress }}
          className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-[var(--border-hairline)]"
          aria-hidden="true"
        />

        {/* Subtle downward edge fade skirt so content softens beneath translucent chrome */}
        <motion.div
          style={{ opacity: edgeProgress }}
          className="pointer-events-none absolute inset-x-0 -bottom-3 h-3 bg-gradient-to-b from-[rgba(248,249,251,0.58)] to-transparent"
          aria-hidden="true"
        />

        <div className="relative mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6 lg:px-8">
          {/* Brand Lockup (restored :focus-visible + tactile press) */}
          <Link
            href="/"
            className="btn-press group flex items-center gap-3 rounded-[var(--radius-sm)] py-1 pr-1.5"
          >
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[8px] bg-[var(--bg-inverse)] font-mono text-xs font-semibold tracking-tight text-[var(--ink-inverse)] transition-colors duration-[180ms] group-hover:bg-[var(--accent)]">
              {PROFILE.monogram}
            </span>
            <div className="flex flex-col">
              <span className="text-[13px] font-semibold leading-tight tracking-[0.05em] text-[var(--ink-primary)]">
                AKAOLISA ENWEDO
              </span>
              <span className="font-mono text-[11px] leading-tight tracking-[0.04em] text-[var(--ink-muted)]">
                OXAKALABS · B.MLS
              </span>
            </div>
          </Link>

          {/* Desktop Navigation with LayoutGroup spring active indicator */}
          <LayoutGroup id="primary-nav">
            <nav
              aria-label="Primary navigation"
              className="hidden items-center gap-1 md:flex"
            >
              {NAV_ITEMS.map((item) => {
                const active = isActive(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    className={`btn-press relative rounded-[var(--radius-sm)] px-3.5 py-2 text-[13px] font-medium whitespace-nowrap ${
                      active
                        ? "text-[var(--ink-primary)]"
                        : "text-[var(--ink-secondary)] hover:text-[var(--ink-primary)]"
                    }`}
                  >
                    {active && (
                      <motion.span
                        layoutId="nav-active-pill"
                        transition={prefersReduced ? { duration: 0 } : SPRING_TAB}
                        className="pointer-events-none absolute inset-x-0.5 inset-y-1 -z-10 rounded-[8px] bg-[rgba(15,20,30,0.048)]"
                        aria-hidden="true"
                      />
                    )}
                    <span className="relative z-10">{item.label}</span>
                    {active && (
                      <motion.span
                        layoutId="nav-active-bar"
                        transition={prefersReduced ? { duration: 0 } : SPRING_TAB}
                        className="pointer-events-none absolute right-3.5 bottom-0 left-3.5 h-[2px] rounded-full bg-[var(--accent)]"
                        aria-hidden="true"
                      />
                    )}
                  </Link>
                );
              })}
            </nav>
          </LayoutGroup>

          {/* Desktop Utility Actions */}
          <div className="hidden items-center gap-2 md:flex">
            <button
              type="button"
              onClick={onOpenResume}
              className="btn-press inline-flex items-center gap-1.5 whitespace-nowrap rounded-[var(--radius-sm)] border border-[var(--border-strong)] bg-[var(--bg-surface)] px-3 py-1.5 text-xs font-medium text-[var(--ink-primary)] hover:border-[var(--accent-border)] hover:text-[var(--accent-deep)]"
            >
              <FilePdf
                size={14}
                weight="bold"
                className="text-[var(--ink-secondary)]"
                aria-hidden="true"
              />
              Resume PDF
            </button>
            <button
              type="button"
              onClick={onOpenAssistant}
              className="btn-press inline-flex items-center gap-1.5 whitespace-nowrap rounded-[var(--radius-sm)] border border-[var(--accent-border)] bg-[var(--accent-soft)] px-3 py-1.5 text-xs font-medium text-[var(--accent-deep)] hover:border-[var(--accent)] hover:bg-[var(--accent)] hover:text-white"
            >
              <Sparkle size={14} weight="bold" aria-hidden="true" />
              Ask AI
            </button>
          </div>

          {/* Mobile Utility & 2-Bar Morphing Menu Toggle */}
          <div className="flex items-center gap-2 md:hidden">
            <button
              type="button"
              onClick={onOpenAssistant}
              aria-label="Ask AI about Akaolisa"
              className="btn-press inline-flex h-9 items-center gap-1.5 whitespace-nowrap rounded-[var(--radius-sm)] border border-[var(--accent-border)] bg-[var(--accent-soft)] px-2.5 text-xs font-medium text-[var(--accent-deep)]"
            >
              <Sparkle size={14} weight="bold" aria-hidden="true" />
              Ask AI
            </button>
            <button
              type="button"
              onClick={() => setMobileOpen(!mobileOpen)}
              aria-label={mobileOpen ? "Close menu" : "Open menu"}
              aria-expanded={mobileOpen}
              className="btn-press inline-flex h-9 w-9 items-center justify-center rounded-[var(--radius-sm)] border border-[var(--border-strong)] bg-[var(--bg-surface)] text-[var(--ink-primary)]"
            >
              <span
                className="relative flex h-4 w-4 items-center justify-center"
                aria-hidden="true"
              >
                <span
                  className="absolute h-[1.5px] w-4 rounded-full bg-current transition-transform duration-[180ms] ease-[var(--ease-out-expo)] motion-reduce:transition-none"
                  style={{
                    transform: mobileOpen
                      ? "translateY(0px) rotate(45deg)"
                      : "translateY(-3.5px) rotate(0deg)",
                  }}
                />
                <span
                  className="absolute h-[1.5px] w-4 rounded-full bg-current transition-transform duration-[180ms] ease-[var(--ease-out-expo)] motion-reduce:transition-none"
                  style={{
                    transform: mobileOpen
                      ? "translateY(0px) rotate(-45deg)"
                      : "translateY(3.5px) rotate(0deg)",
                  }}
                />
              </span>
            </button>
          </div>
        </div>
      </header>

      {/* Portaled Interruptible Right-Edge Spring Mobile Drawer */}
      {portalMounted &&
        createPortal(
          <AnimatePresence>
            {mobileOpen && (
              <MobileDrawerSheet
                key="mobile-nav-drawer"
                pathname={pathname}
                isActive={isActive}
                onClose={() => setMobileOpen(false)}
                onOpenResume={onOpenResume}
                onOpenAssistant={onOpenAssistant}
              />
            )}
          </AnimatePresence>,
          document.body
        )}
    </>
  );
}
