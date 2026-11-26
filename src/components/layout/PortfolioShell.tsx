"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { usePathname } from "next/navigation";
import { MotionConfig, motion, useReducedMotion } from "framer-motion";
import { SiteHeader } from "./SiteHeader";
import { SiteFooter } from "./SiteFooter";
import { ResumeModal } from "@/components/modals/ResumeModal";
import { AiAssistantDrawer } from "@/components/assistant/AiAssistantDrawer";
import { SPRING_CRISP } from "@/components/ui/MotionPrimitives";

interface PortfolioActionsContextValue {
  openResume: () => void;
  openAssistant: () => void;
}

const PortfolioActionsContext = createContext<PortfolioActionsContextValue>({
  openResume: () => {},
  openAssistant: () => {},
});

export function usePortfolioActions() {
  return useContext(PortfolioActionsContext);
}

function PortfolioShellInner({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const isAdminRoute = pathname === "/admin" || pathname.startsWith("/admin/");
  const prefersReduced = useReducedMotion();
  const [resumeOpen, setResumeOpen] = useState(false);
  const [assistantOpen, setAssistantOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const anyOverlayOpen = resumeOpen || assistantOpen || mobileMenuOpen;
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const wasOverlayOpenRef = useRef(false);

  const captureFocusIfIdle = useCallback(() => {
    if (!wasOverlayOpenRef.current && typeof document !== "undefined") {
      const active = document.activeElement;
      if (active instanceof HTMLElement) {
        previousFocusRef.current = active;
      }
    }
  }, []);

  const openResume = useCallback(() => {
    captureFocusIfIdle();
    setAssistantOpen(false);
    setMobileMenuOpen(false);
    setResumeOpen(true);
  }, [captureFocusIfIdle]);

  const openAssistant = useCallback(() => {
    captureFocusIfIdle();
    setResumeOpen(false);
    setMobileMenuOpen(false);
    setAssistantOpen(true);
  }, [captureFocusIfIdle]);

  const handleMobileMenuChange = useCallback(
    (next: boolean) => {
      if (next) {
        captureFocusIfIdle();
        setResumeOpen(false);
        setAssistantOpen(false);
      }
      setMobileMenuOpen(next);
    },
    [captureFocusIfIdle]
  );

  const closeResume = useCallback(() => setResumeOpen(false), []);
  const closeAssistant = useCallback(() => setAssistantOpen(false), []);

  useEffect(() => {
    if (anyOverlayOpen) {
      wasOverlayOpenRef.current = true;
      const prevOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = prevOverflow;
      };
    }

    if (wasOverlayOpenRef.current) {
      wasOverlayOpenRef.current = false;
      const toRestore = previousFocusRef.current;
      previousFocusRef.current = null;
      if (toRestore && toRestore.isConnected) {
        window.requestAnimationFrame(() => {
          toRestore.focus({ preventScroll: true });
        });
      }
    }
  }, [anyOverlayOpen]);

  const shouldPushDepth = anyOverlayOpen && !prefersReduced && !isAdminRoute;

  return (
    <PortfolioActionsContext.Provider value={{ openResume, openAssistant }}>
      <div className="min-h-screen bg-[var(--bg-recessed)]">
        <motion.div
          inert={anyOverlayOpen}
          animate={
            shouldPushDepth
              ? { scale: 0.99, borderRadius: 12 }
              : { scale: 1, borderRadius: 0 }
          }
          transition={SPRING_CRISP}
          style={{ transformOrigin: "50% 0%" }}
          className="flex min-h-screen flex-col overflow-x-clip bg-[var(--bg-canvas)] text-[var(--ink-primary)]"
        >
          {!isAdminRoute && (
            <SiteHeader
              onOpenResume={openResume}
              onOpenAssistant={openAssistant}
              mobileOpen={mobileMenuOpen}
              onMobileOpenChange={handleMobileMenuChange}
            />
          )}
          <main className="flex-1">{children}</main>
          {!isAdminRoute && (
            <SiteFooter
              onOpenResume={openResume}
              onOpenAssistant={openAssistant}
            />
          )}
        </motion.div>
      </div>

      <ResumeModal open={resumeOpen} onClose={closeResume} />
      <AiAssistantDrawer open={assistantOpen} onClose={closeAssistant} />
    </PortfolioActionsContext.Provider>
  );
}

export function PortfolioShell({ children }: { children: ReactNode }) {
  return (
    <MotionConfig reducedMotion="user">
      <PortfolioShellInner>{children}</PortfolioShellInner>
    </MotionConfig>
  );
}
