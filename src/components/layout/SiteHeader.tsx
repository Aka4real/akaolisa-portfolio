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
  useTransform,
} from "framer-motion";
import { ArrowRight, Sparkle, X } from "@phosphor-icons/react";
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
  { label: "Work", href: "/work" },
  { label: "Experience", href: "/experience" },
  { label: "Contact", href: "/contact" },
  { label: "Admin", href: "/admin" },
] as const;

interface PointerSample {
  x: number;
  t: number;
}

interface MobileDrawerSheetProps {
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

  useEffect(() => {
    if (prefersReduced) {
      if (!isPresent) {
        const timer = window.setTimeout(() => safeToRemove(), 140);
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

  useEffect(() => {
    closeBtnRef.current?.focus({ preventScroll: true });
  }, []);

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
          // Ignore synthetic capture rejection
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

  const finishDrag = (
    e: ReactPointerEvent<HTMLElement>,
    cancelled: boolean
  ) => {
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
      <motion.div
        style={prefersReduced ? undefined : { opacity: scrimOpacity }}
        initial={prefersReduced ? { opacity: 0 } : undefined}
        animate={prefersReduced ? { opacity: isPresent ? 1 : 0 } : undefined}
        transition={
          prefersReduced ? { duration: 0.16, ease: "easeOut" } : undefined
        }
        onClick={onClose}
        className="fixed inset-0 bg-[var(--scrim-drawer)] backdrop-blur-[var(--blur-scrim)]"
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
        className="relative z-10 flex h-full w-[min(86vw,340px)] flex-col border-l border-[var(--border-on-marine)] bg-[var(--bg-marine)] text-[var(--ink-on-marine)] shadow-[var(--shadow-float)]"
      >
        <div className="flex h-16 items-center justify-between border-b border-[var(--border-on-marine)] px-5">
          <Link
            href="/"
            onClick={onClose}
            className="type-wordmark text-[var(--ink-on-marine)]"
          >
            {PROFILE.displayName}
          </Link>
          <button
            ref={closeBtnRef}
            type="button"
            onClick={onClose}
            aria-label="Close menu"
            className="btn-press inline-flex h-9 w-9 items-center justify-center rounded-[var(--radius-sm)] border border-[var(--border-on-marine)] text-[var(--ink-on-marine-secondary)] hover:border-[var(--border-on-marine-strong)] hover:text-[var(--ink-on-marine)]"
          >
            <X size={16} weight="bold" aria-hidden="true" />
          </button>
        </div>

        <nav
          aria-label="Mobile navigation links"
          className="flex-1 overflow-y-auto px-4 py-6"
        >
          <div className="flex flex-col divide-y divide-[var(--border-on-marine)]">
            <Link
              href="/"
              onClick={onClose}
              aria-current={isActive("/") ? "page" : undefined}
              className={`type-body py-3.5 font-medium transition-colors duration-150 ${
                isActive("/")
                  ? "text-[var(--accent-bright)]"
                  : "text-[var(--ink-on-marine)] hover:text-[var(--accent-bright)]"
              }`}
            >
              Overview
            </Link>
            {NAV_ITEMS.map((item) => {
              const active = isActive(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onClose}
                  aria-current={active ? "page" : undefined}
                  className={`type-body py-3.5 font-medium transition-colors duration-150 ${
                    active
                      ? "text-[var(--accent-bright)]"
                      : "text-[var(--ink-on-marine)] hover:text-[var(--accent-bright)]"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenResume();
              }}
              className="type-body py-3.5 text-left font-medium text-[var(--ink-on-marine-secondary)] transition-colors duration-150 hover:text-[var(--ink-on-marine)]"
            >
              Resume PDF
            </button>
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenAssistant();
              }}
              className="type-body flex items-center gap-2 py-3.5 text-left font-medium text-[var(--accent-bright)] transition-colors duration-150 hover:text-[var(--ink-on-marine)]"
            >
              <Sparkle size={16} weight="bold" aria-hidden="true" />
              <span>Ask AI assistant</span>
            </button>
          </div>
        </nav>

        <div className="border-t border-[var(--border-on-marine)] p-5">
          <Link
            href="/contact"
            onClick={onClose}
            className="btn-press group type-sm flex w-full items-center justify-center gap-2 rounded-[var(--radius-sm)] bg-[var(--accent)] px-4 py-3 font-medium text-[var(--ink-on-marine)] hover:bg-[var(--accent-deep)]"
          >
            <span>Start a project</span>
            <ArrowRight
              size={15}
              weight="bold"
              className="hover-nudge-x"
              aria-hidden="true"
            />
          </Link>
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
  const isHome = pathname === "/";
  const prefersReduced = useReducedMotion();
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const [portalMounted, setPortalMounted] = useState(false);
  const [scrolled, setScrolled] = useState(false);

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

  useEffect(() => {
    setPortalMounted(true);
  }, []);

  useEffect(() => {
    const onScroll = () => {
      const next = window.scrollY > 44;
      setScrolled((prev) => (prev === next ? prev : next));
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [pathname]);

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

  const overDarkHero = isHome && !scrolled;

  return (
    <>
      <header
        className={`${
          isHome ? "fixed inset-x-0 top-0" : "sticky top-0"
        } z-40 transition-[background-color,border-color,color] duration-200 ease-out ${
          overDarkHero
            ? "border-b border-transparent bg-transparent text-[var(--ink-on-marine)]"
            : "chrome-light border-b border-[var(--border-hairline)] text-[var(--ink-primary)]"
        }`}
      >
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-6 px-5 sm:px-8 lg:px-10">
          {/* Strong Editorial Brand Wordmark */}
          <Link
            href="/"
            className={`btn-press type-wordmark shrink-0 whitespace-nowrap transition-colors duration-150 ${
              overDarkHero
                ? "text-[var(--ink-on-marine)] hover:text-[var(--accent-bright)]"
                : "text-[var(--ink-primary)] hover:text-[var(--accent-deep)]"
            }`}
          >
            {PROFILE.displayName}
          </Link>

          {/* Compact Single-Line Desktop Navigation */}
          <LayoutGroup id="primary-nav">
            <nav
              aria-label="Primary navigation"
              className="hidden items-center gap-7 md:flex"
            >
              {NAV_ITEMS.map((item) => {
                const active = isActive(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    className={`type-sm relative py-1 font-medium whitespace-nowrap transition-colors duration-150 ${
                      overDarkHero
                        ? active
                          ? "text-[var(--ink-on-marine)]"
                          : "text-[var(--ink-on-marine-secondary)] hover:text-[var(--ink-on-marine)]"
                        : active
                          ? "text-[var(--ink-primary)]"
                          : "text-[var(--ink-secondary)] hover:text-[var(--ink-primary)]"
                    }`}
                  >
                    <span>{item.label}</span>
                    {active && (
                      <motion.span
                        layoutId="nav-active-underline"
                        transition={prefersReduced ? { duration: 0 } : SPRING_TAB}
                        className={`pointer-events-none absolute right-0 -bottom-0.5 left-0 h-[2px] rounded-full ${
                          overDarkHero
                            ? "bg-[var(--accent-bright)]"
                            : "bg-[var(--accent)]"
                        }`}
                        aria-hidden="true"
                      />
                    )}
                  </Link>
                );
              })}
            </nav>
          </LayoutGroup>

          {/* Restrained Desktop Utilities */}
          <div className="hidden items-center gap-5 md:flex">
            <button
              type="button"
              onClick={onOpenResume}
              className={`type-sm btn-press font-medium whitespace-nowrap transition-colors duration-150 ${
                overDarkHero
                  ? "text-[var(--ink-on-marine-secondary)] hover:text-[var(--ink-on-marine)]"
                  : "text-[var(--ink-secondary)] hover:text-[var(--ink-primary)]"
              }`}
            >
              Resume
            </button>
            <button
              type="button"
              onClick={onOpenAssistant}
              className={`type-sm btn-press inline-flex items-center gap-1.5 rounded-[var(--radius-sm)] border px-3.5 py-1.5 font-medium whitespace-nowrap ${
                overDarkHero
                  ? "border-[var(--border-on-marine-strong)] bg-[rgba(244,247,250,0.06)] text-[var(--ink-on-marine)] hover:border-[var(--accent-bright)] hover:bg-[rgba(102,163,255,0.14)]"
                  : "border-[var(--border-strong)] bg-[var(--bg-surface)] text-[var(--ink-primary)] hover:border-[var(--accent)] hover:text-[var(--accent-deep)]"
              }`}
            >
              <Sparkle
                size={14}
                weight="bold"
                className={
                  overDarkHero
                    ? "text-[var(--accent-bright)]"
                    : "text-[var(--accent)]"
                }
                aria-hidden="true"
              />
              <span>Ask AI</span>
            </button>
          </div>

          {/* Mobile Controls */}
          <div className="flex items-center gap-2.5 md:hidden">
            <button
              type="button"
              onClick={onOpenAssistant}
              aria-label="Ask AI about Akaolisa"
              className={`type-sm btn-press inline-flex h-9 items-center gap-1.5 rounded-[var(--radius-sm)] border px-3 font-medium whitespace-nowrap ${
                overDarkHero
                  ? "border-[var(--border-on-marine-strong)] bg-[rgba(244,247,250,0.08)] text-[var(--ink-on-marine)]"
                  : "border-[var(--border-strong)] bg-[var(--bg-surface)] text-[var(--ink-primary)]"
              }`}
            >
              <Sparkle
                size={14}
                weight="bold"
                className={
                  overDarkHero
                    ? "text-[var(--accent-bright)]"
                    : "text-[var(--accent)]"
                }
                aria-hidden="true"
              />
              <span>Ask AI</span>
            </button>
            <button
              type="button"
              onClick={() => setMobileOpen(!mobileOpen)}
              aria-label={mobileOpen ? "Close menu" : "Open menu"}
              aria-expanded={mobileOpen}
              className={`btn-press inline-flex h-9 w-9 items-center justify-center rounded-[var(--radius-sm)] border ${
                overDarkHero
                  ? "border-[var(--border-on-marine-strong)] bg-[rgba(244,247,250,0.06)] text-[var(--ink-on-marine)]"
                  : "border-[var(--border-strong)] bg-[var(--bg-surface)] text-[var(--ink-primary)]"
              }`}
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

      {portalMounted &&
        createPortal(
          <AnimatePresence>
            {mobileOpen && (
              <MobileDrawerSheet
                key="mobile-nav-drawer"
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
