"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
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

const WELCOME_MESSAGE: ChatMessage = {
  id: "welcome",
  role: "assistant",
  content:
    "Ask anything about Akaolisa Enwedo's architecture experience, OXAKALABS case studies, AI/Quant stack, B.MLS clinical background, or remote contract availability. All answers are strictly grounded in his verified dossier.",
  links: [
    { label: "Explore Selected Work", href: "/work" },
    { label: "Experience & Clinical Lab", href: "/experience" },
  ],
};

const QUICK_PROMPTS = [
  "What is Akaolisa's AI & multi-agent stack?",
  "Walk me through Fortress Fleet AI and Koridor Engine OS",
  "How does his B.MLS clinical leadership strengthen software delivery?",
  "Is he available for remote freelance contracts?",
];

const EASE_DRAWER: [number, number, number, number] = [0.32, 0.72, 0, 1];

function renderInlineEmphasis(text: string) {
  const segments = text.split(/(\*\*[^*]+\*\*)/g);
  return segments.map((seg, idx) => {
    if (seg.startsWith("**") && seg.endsWith("**") && seg.length > 4) {
      return (
        <strong key={idx} className="font-semibold text-[#111214]">
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
      blocks.push({ type: "heading", text: headingMatch[1].replace(/\*\*/g, "") });
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
              className="pt-1 font-mono text-[11px] font-semibold uppercase tracking-wider text-[#0F3D91]"
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
                  className="list-disc text-[13px] leading-relaxed text-[#111214] marker:text-[#1D4ED8]"
                >
                  {renderInlineEmphasis(item)}
                </li>
              ))}
            </ul>
          );
        }
        return (
          <p key={idx} className="text-[13px] leading-relaxed text-[#111214]">
            {renderInlineEmphasis(block.text)}
          </p>
        );
      })}
    </div>
  );
}

export function AiAssistantDrawer({ open, onClose }: AiAssistantDrawerProps) {
  const prefersReduced = useReducedMotion();
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [geminiEnabled, setGeminiEnabled] = useState(false);
  const [configuredModel, setConfiguredModel] = useState<string>(
    "gemini-3.8-flash"
  );
  const [activeMode, setActiveMode] = useState<"gemini" | "grounded-index">(
    "grounded-index"
  );
  const [activeModel, setActiveModel] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([WELCOME_MESSAGE]);

  const scrollRef = useRef<HTMLDivElement>(null);
  const statusCheckedRef = useRef(false);

  useEffect(() => {
    if (!open || statusCheckedRef.current) return;
    statusCheckedRef.current = true;

    fetch("/api/chat")
      .then((res) => (res.ok ? (res.json() as Promise<ChatStatusResponse>) : null))
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
        // Silently keep grounded-index label if status check fails
      });
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading]);

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
        <div
          className="fixed inset-0 z-50 flex justify-end"
          role="dialog"
          aria-modal="true"
          aria-labelledby="ai-drawer-title"
        >
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            onClick={onClose}
            className="fixed inset-0 bg-[#111214]/35 backdrop-blur-[2px]"
          />

          <motion.aside
            initial={
              prefersReduced
                ? { opacity: 0 }
                : { opacity: 0.85, transform: "translateX(100%)" }
            }
            animate={
              prefersReduced
                ? { opacity: 1 }
                : { opacity: 1, transform: "translateX(0%)" }
            }
            exit={
              prefersReduced
                ? { opacity: 0 }
                : { opacity: 0.85, transform: "translateX(100%)" }
            }
            transition={{ duration: 0.28, ease: EASE_DRAWER }}
            className="relative z-10 flex h-full w-full max-w-md flex-col border-l border-[#D1CDC4] bg-[#FAF9F6]"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-[#E5E2DC] bg-white px-5 py-4">
              <div className="flex items-center gap-2.5">
                <span className="flex h-7 w-7 items-center justify-center rounded border border-[#BFDBFE] bg-[#EFF4FF] text-[#1D4ED8]">
                  <Sparkle size={15} weight="bold" />
                </span>
                <div>
                  <h2
                    id="ai-drawer-title"
                    className="text-sm font-semibold tracking-tight text-[#111214]"
                  >
                    Ask About Akaolisa
                  </h2>
                  <p className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider text-[#6E727A]">
                    <TerminalWindow size={11} weight="bold" />
                    {statusLabel}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                {messages.length > 1 && (
                  <button
                    type="button"
                    onClick={resetConversation}
                    disabled={loading}
                    aria-label="Reset conversation"
                    title="Start a new thread"
                    className="btn-press inline-flex h-8 w-8 items-center justify-center rounded border border-[#E5E2DC] bg-white text-[#4B4E54] hover:border-[#D1CDC4] hover:text-[#111214] disabled:opacity-40"
                  >
                    <ArrowCounterClockwise size={15} weight="bold" />
                  </button>
                )}

                <button
                  type="button"
                  onClick={onClose}
                  aria-label="Close dossier assistant"
                  className="btn-press inline-flex h-8 w-8 items-center justify-center rounded border border-[#E5E2DC] bg-white text-[#4B4E54] hover:border-[#D1CDC4] hover:text-[#111214]"
                >
                  <X size={16} weight="bold" />
                </button>
              </div>
            </div>

            {/* Messages */}
            <div
              ref={scrollRef}
              className="flex-1 space-y-4 overflow-y-auto px-5 py-5"
            >
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={
                    msg.role === "user"
                      ? "ml-8 rounded-lg border border-[#111214] bg-[#111214] px-3.5 py-2.5 text-[13px] leading-relaxed text-white"
                      : "mr-4 rounded-lg border border-[#E5E2DC] bg-white px-4 py-3 text-[13px] leading-relaxed text-[#111214]"
                  }
                >
                  {msg.role === "assistant" ? (
                    <FormattedAssistantText content={msg.content} />
                  ) : (
                    <p className="whitespace-pre-wrap">{msg.content}</p>
                  )}
                  {msg.links && msg.links.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1.5 border-t border-[#F3F1EC] pt-2.5">
                      {msg.links.map((item) => (
                        <Link
                          key={item.href + item.label}
                          href={item.href}
                          onClick={onClose}
                          className="inline-flex items-center gap-1 rounded border border-[#BFDBFE] bg-[#EFF4FF] px-2.5 py-1 font-mono text-[11px] font-medium text-[#0F3D91] transition-colors hover:border-[#1D4ED8] hover:bg-[#1D4ED8] hover:text-white"
                        >
                          {item.label}
                          <ArrowRight size={11} weight="bold" />
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              ))}

              {loading && (
                <div className="mr-12 rounded-lg border border-[#E5E2DC] bg-white px-4 py-3 font-mono text-xs text-[#6E727A]">
                  {geminiEnabled
                    ? `Synthesizing with ${displayModelLabel}...`
                    : "Querying verified dossier..."}
                </div>
              )}

              {/* Quick prompts when conversation is fresh */}
              {messages.length <= 2 && !loading && (
                <div className="pt-2">
                  <p className="mb-2 font-mono text-[10px] uppercase tracking-widest text-[#6E727A]">
                    Suggested Queries
                  </p>
                  <div className="space-y-1.5">
                    {QUICK_PROMPTS.map((prompt) => (
                      <button
                        key={prompt}
                        type="button"
                        onClick={() => submitQuestion(prompt)}
                        className="btn-press block w-full rounded border border-[#E5E2DC] bg-white px-3 py-2 text-left text-xs text-[#4B4E54] hover:border-[#1D4ED8] hover:text-[#111214]"
                      >
                        {prompt}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Input Footer */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                submitQuestion(input);
              }}
              className="border-t border-[#E5E2DC] bg-white p-4"
            >
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={input}
                  maxLength={4000}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Ask about stack, projects, B.MLS, availability..."
                  className="flex-1 rounded border border-[#E5E2DC] bg-[#FAF9F6] px-3 py-2 text-sm text-[#111214] placeholder:text-[#6E727A] focus:border-[#1D4ED8] focus:bg-white focus:outline-none"
                />
                <button
                  type="submit"
                  disabled={loading || input.trim().length < 2}
                  aria-label="Send question"
                  className="btn-press inline-flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded bg-[#111214] text-white hover:bg-[#1D4ED8] disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <PaperPlaneRight size={16} weight="bold" />
                </button>
              </div>
              <p className="mt-2 font-mono text-[10px] text-[#6E727A]">
                {geminiEnabled
                  ? `Grounded in verified dossier · Multi-turn ${displayModelLabel}`
                  : "Zero fabricated claims · Auto-upgrades with GEMINI_API_KEY"}
              </p>
            </form>
          </motion.aside>
        </div>
      )}
    </AnimatePresence>
  );
}
