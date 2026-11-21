import type { ChatHistoryTurn } from "./knowledge";

export type GeminiThinkingLevel = "LOW" | "MEDIUM" | "HIGH";

export interface GeminiConfig {
  apiKey: string;
  primaryModel: string;
  fallbackModels: string[];
  thinkingLevel: GeminiThinkingLevel;
  maxOutputTokens: number;
}

export interface GeminiGenerationResult {
  text: string;
  model: string;
  finishReason?: string;
  usage?: {
    promptTokenCount?: number;
    candidatesTokenCount?: number;
    thoughtsTokenCount?: number;
    totalTokenCount?: number;
  };
}

interface GeminiContentPart {
  text?: string;
  thought?: boolean;
}

interface GeminiContentMessage {
  role: "user" | "model";
  parts: Array<{ text: string }>;
}

interface GeminiApiResponse {
  candidates?: Array<{
    content?: {
      parts?: GeminiContentPart[];
    };
    finishReason?: string;
  }>;
  modelVersion?: string;
  usageMetadata?: {
    promptTokenCount?: number;
    candidatesTokenCount?: number;
    thoughtsTokenCount?: number;
    totalTokenCount?: number;
  };
  error?: {
    code?: number;
    message?: string;
    status?: string;
  };
}

const GEMINI_API_BASE =
  "https://generativelanguage.googleapis.com/v1beta/models";

export const DEFAULT_GEMINI_MODEL = "gemini-3.8-flash";
export const DEFAULT_GEMINI_FALLBACK_MODELS = [
  "gemini-3-flash-preview",
  "gemini-3.5-flash-lite",
] as const;
export const DEFAULT_GEMINI_THINKING_LEVEL: GeminiThinkingLevel = "LOW";
export const DEFAULT_GEMINI_MAX_OUTPUT_TOKENS = 4096;

export const MAX_QUERY_CHARS = 4000;
export const MAX_HISTORY_TURNS = 20;
export const MAX_HISTORY_CHARS = 24000;

const TOTAL_UPSTREAM_BUDGET_MS = 26000;
const PRIMARY_ATTEMPT_TIMEOUT_MS = 10000;
const FALLBACK_ATTEMPT_TIMEOUT_MS = 9000;
const FINAL_FALLBACK_RESERVE_MS = 5000;
const MIN_ATTEMPT_TIMEOUT_MS = 3000;

const VALID_THINKING_LEVELS = new Set<GeminiThinkingLevel>([
  "LOW",
  "MEDIUM",
  "HIGH",
]);

function normalizeModelId(raw: string): string {
  return raw.trim().replace(/^models\//i, "");
}

function parseThinkingLevel(raw: string | undefined): GeminiThinkingLevel {
  const upper = (raw ?? "").trim().toUpperCase() as GeminiThinkingLevel;
  return VALID_THINKING_LEVELS.has(upper)
    ? upper
    : DEFAULT_GEMINI_THINKING_LEVEL;
}

function parseMaxOutputTokens(raw: string | undefined): number {
  const parsed = Number.parseInt((raw ?? "").trim(), 10);
  if (!Number.isFinite(parsed)) return DEFAULT_GEMINI_MAX_OUTPUT_TOKENS;
  return Math.min(16384, Math.max(512, parsed));
}

function parseFallbackModels(
  raw: string | undefined,
  primaryModel: string
): string[] {
  const list =
    raw !== undefined
      ? raw
          .split(",")
          .map(normalizeModelId)
          .filter((m) => m.length > 0)
      : [...DEFAULT_GEMINI_FALLBACK_MODELS];

  const deduped: string[] = [];
  const seen = new Set<string>([primaryModel]);
  for (const m of list) {
    if (!seen.has(m)) {
      seen.add(m);
      deduped.push(m);
    }
  }
  return deduped;
}

export function getGeminiConfig(): GeminiConfig {
  const apiKey = (process.env.GEMINI_API_KEY ?? "").trim();
  const primaryModel =
    normalizeModelId(process.env.GEMINI_MODEL ?? "") || DEFAULT_GEMINI_MODEL;
  const fallbackModels = parseFallbackModels(
    process.env.GEMINI_FALLBACK_MODELS,
    primaryModel
  );
  const thinkingLevel = parseThinkingLevel(process.env.GEMINI_THINKING_LEVEL);
  const maxOutputTokens = parseMaxOutputTokens(
    process.env.GEMINI_MAX_OUTPUT_TOKENS
  );

  return {
    apiKey,
    primaryModel,
    fallbackModels,
    thinkingLevel,
    maxOutputTokens,
  };
}

export function isGeminiConfigured(): boolean {
  return getGeminiConfig().apiKey.length > 0;
}

/**
 * Gemini 3.x non-lite Flash models (including gemini-3.8-flash) support string
 * thinkingLevel ("LOW" | "MEDIUM" | "HIGH") and ignore custom temperature/topP.
 * Lite variants default to fast non-thinking generation for minimal latency.
 */
function supportsThinkingLevelConfig(model: string): boolean {
  const id = model.toLowerCase();
  if (id.includes("lite") || id.includes("tts") || id.includes("image")) {
    return false;
  }
  return id.startsWith("gemini-3") || id.startsWith("gemini-4");
}

function buildConversationContents(
  history: ChatHistoryTurn[] | undefined,
  currentQuery: string
): GeminiContentMessage[] {
  const sanitizedHistory: GeminiContentMessage[] = [];
  let charBudgetRemaining = MAX_HISTORY_CHARS;

  const recentTurns = (history ?? []).slice(-MAX_HISTORY_TURNS);
  for (let i = recentTurns.length - 1; i >= 0; i--) {
    const turn = recentTurns[i];
    if (!turn || (turn.role !== "user" && turn.role !== "assistant")) continue;
    const text = (turn.content ?? "").trim().slice(0, MAX_QUERY_CHARS);
    if (!text) continue;
    if (text.length > charBudgetRemaining && sanitizedHistory.length > 0) break;

    charBudgetRemaining -= text.length;
    sanitizedHistory.unshift({
      role: turn.role === "assistant" ? "model" : "user",
      parts: [{ text }],
    });
  }

  // Gemini multi-turn contents must begin with a user turn.
  while (
    sanitizedHistory.length > 0 &&
    sanitizedHistory[0]?.role !== "user"
  ) {
    sanitizedHistory.shift();
  }

  // Merge consecutive identical roles so history stays strictly alternating.
  const normalized: GeminiContentMessage[] = [];
  for (const msg of sanitizedHistory) {
    const prev = normalized[normalized.length - 1];
    if (prev && prev.role === msg.role) {
      prev.parts[0].text = `${prev.parts[0].text}\n\n${msg.parts[0].text}`;
    } else {
      normalized.push(msg);
    }
  }

  const trimmedQuery = currentQuery.trim().slice(0, MAX_QUERY_CHARS);
  const last = normalized[normalized.length - 1];
  if (last && last.role === "user") {
    if (last.parts[0].text !== trimmedQuery) {
      last.parts[0].text = `${last.parts[0].text}\n\n${trimmedQuery}`;
    }
  } else {
    normalized.push({
      role: "user",
      parts: [{ text: trimmedQuery }],
    });
  }

  return normalized;
}

function extractVisibleText(data: GeminiApiResponse): string {
  const parts = data.candidates?.[0]?.content?.parts;
  if (!Array.isArray(parts)) return "";
  return parts
    .filter((part) => !part.thought && typeof part.text === "string")
    .map((part) => part.text ?? "")
    .join("")
    .trim();
}

export async function generateGeminiAnswer(params: {
  systemPrompt: string;
  query: string;
  history?: ChatHistoryTurn[];
}): Promise<GeminiGenerationResult | null> {
  const config = getGeminiConfig();
  if (!config.apiKey) return null;

  const modelChain = [config.primaryModel, ...config.fallbackModels];
  const contents = buildConversationContents(params.history, params.query);
  const startedAt = Date.now();

  for (let i = 0; i < modelChain.length; i++) {
    const model = modelChain[i];
    const elapsed = Date.now() - startedAt;
    const remainingBudget = TOTAL_UPSTREAM_BUDGET_MS - elapsed;
    if (remainingBudget < MIN_ATTEMPT_TIMEOUT_MS) {
      break;
    }

    const isLastModel = i === modelChain.length - 1;
    const reserveForLater = isLastModel ? 0 : FINAL_FALLBACK_RESERVE_MS;
    const maxAllowedThisAttempt = Math.max(
      MIN_ATTEMPT_TIMEOUT_MS,
      remainingBudget - reserveForLater
    );
    const attemptTimeoutMs = Math.min(
      i === 0 ? PRIMARY_ATTEMPT_TIMEOUT_MS : FALLBACK_ATTEMPT_TIMEOUT_MS,
      maxAllowedThisAttempt
    );

    const generationConfig: Record<string, unknown> = {
      maxOutputTokens: config.maxOutputTokens,
    };

    if (supportsThinkingLevelConfig(model)) {
      generationConfig.thinkingConfig = {
        thinkingLevel: config.thinkingLevel,
      };
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), attemptTimeoutMs);

    try {
      const endpoint = `${GEMINI_API_BASE}/${encodeURIComponent(
        model
      )}:generateContent`;

      const res = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": config.apiKey,
        },
        signal: controller.signal,
        body: JSON.stringify({
          system_instruction: {
            parts: [{ text: params.systemPrompt }],
          },
          contents,
          generationConfig,
        }),
      });

      clearTimeout(timeout);

      if (!res.ok) {
        let errorStatus = "";
        let errorMessage = "";
        try {
          const errJson = (await res.json()) as GeminiApiResponse;
          errorStatus = errJson.error?.status ?? "";
          errorMessage = errJson.error?.message ?? "";
        } catch {
          // Ignore unreadable error bodies
        }

        console.warn(
          `[gemini] ${model} failed (${res.status} ${errorStatus}): ${errorMessage.slice(
            0,
            140
          )}`
        );

        // Auth/permission failures apply to every model under the same key.
        if (res.status === 401 || res.status === 403) {
          return null;
        }
        continue;
      }

      const data = (await res.json()) as GeminiApiResponse;
      const text = extractVisibleText(data);
      if (text.length > 0) {
        return {
          text,
          model: normalizeModelId(data.modelVersion || model),
          finishReason: data.candidates?.[0]?.finishReason,
          usage: data.usageMetadata,
        };
      }

      console.warn(
        `[gemini] ${model} returned empty visible text (finishReason=${
          data.candidates?.[0]?.finishReason ?? "unknown"
        })`
      );
    } catch (err) {
      clearTimeout(timeout);
      const reason =
        err instanceof Error ? err.message : "unknown network error";
      console.warn(`[gemini] ${model} request error: ${reason}`);
    }
  }

  return null;
}
