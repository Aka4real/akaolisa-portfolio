import { NextResponse } from "next/server";
import {
  answerFromGroundedIndex,
  buildGroundedSystemPrompt,
  suggestLinksForConversation,
  type ChatHistoryTurn,
  type ChatResponsePayload,
} from "@/lib/knowledge";
import {
  generateGeminiAnswer,
  getGeminiConfig,
  isGeminiConfigured,
  MAX_HISTORY_TURNS,
  MAX_QUERY_CHARS,
} from "@/lib/gemini";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

interface ChatRequestBody {
  query?: string;
  history?: unknown;
}

function sanitizeHistory(raw: unknown): ChatHistoryTurn[] {
  if (!Array.isArray(raw)) return [];
  const turns: ChatHistoryTurn[] = [];
  for (const item of raw.slice(-MAX_HISTORY_TURNS)) {
    if (!item || typeof item !== "object") continue;
    const record = item as { role?: unknown; content?: unknown };
    if (record.role !== "user" && record.role !== "assistant") continue;
    if (typeof record.content !== "string") continue;
    const content = record.content.trim().slice(0, MAX_QUERY_CHARS);
    if (!content) continue;
    turns.push({ role: record.role, content });
  }
  return turns;
}

export async function GET() {
  const config = getGeminiConfig();
  return NextResponse.json({
    geminiEnabled: isGeminiConfigured(),
    primaryModel: config.primaryModel,
    maxOutputTokens: config.maxOutputTokens,
  });
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as ChatRequestBody;
    const query = (body.query ?? "").trim().slice(0, MAX_QUERY_CHARS);

    if (!query || query.length < 2) {
      return NextResponse.json(
        {
          error:
            "Please enter a question about Akaolisa's background, stack, or projects.",
        },
        { status: 400 }
      );
    }

    const history = sanitizeHistory(body.history);

    if (isGeminiConfigured()) {
      const geminiResult = await generateGeminiAnswer({
        systemPrompt: buildGroundedSystemPrompt(),
        query,
        history,
      });

      if (geminiResult) {
        const payload: ChatResponsePayload = {
          answer: geminiResult.text,
          mode: "gemini",
          model: geminiResult.model,
          links: suggestLinksForConversation(query, geminiResult.text),
        };
        return NextResponse.json(payload);
      }
    }

    const groundedFallback = answerFromGroundedIndex(query);
    return NextResponse.json(groundedFallback);
  } catch {
    return NextResponse.json(
      { error: "Invalid request payload." },
      { status: 400 }
    );
  }
}
