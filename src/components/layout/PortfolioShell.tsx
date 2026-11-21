"use client";

import {
  createContext,
  useCallback,
  useContext,
  useState,
  type ReactNode,
} from "react";
import { SiteHeader } from "./SiteHeader";
import { SiteFooter } from "./SiteFooter";
import { ResumeModal } from "@/components/modals/ResumeModal";
import { AiAssistantDrawer } from "@/components/assistant/AiAssistantDrawer";

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

export function PortfolioShell({ children }: { children: ReactNode }) {
  const [resumeOpen, setResumeOpen] = useState(false);
  const [assistantOpen, setAssistantOpen] = useState(false);

  const openResume = useCallback(() => setResumeOpen(true), []);
  const openAssistant = useCallback(() => setAssistantOpen(true), []);

  return (
    <PortfolioActionsContext.Provider value={{ openResume, openAssistant }}>
      <div className="flex min-h-screen flex-col bg-[#FAF9F6] text-[#111214]">
        <SiteHeader onOpenResume={openResume} onOpenAssistant={openAssistant} />
        <main className="flex-1">{children}</main>
        <SiteFooter onOpenResume={openResume} onOpenAssistant={openAssistant} />
      </div>

      <ResumeModal open={resumeOpen} onClose={() => setResumeOpen(false)} />
      <AiAssistantDrawer
        open={assistantOpen}
        onClose={() => setAssistantOpen(false)}
      />
    </PortfolioActionsContext.Provider>
  );
}
