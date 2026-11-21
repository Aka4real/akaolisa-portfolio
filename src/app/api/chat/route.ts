import { NextResponse } from "next/server";
import {
  answerFromGroundedIndex,
  buildGroundedSystemPrompt,
} from "@/lib/knowledge";

interface ChatRequestBody {
  query?: string;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as ChatRequestBody;
    const query = (body.query ?? "").trim();

    if (!query || query.length < 2) {
      return NextResponse.json(
        { error: "Please enter a question about Akaolisa's background, stack, or projects." },
        { status: 400 }
      );
    }

    // Compute deterministic grounded baseline (always yields verified links too)
    const groundedFallback = answerFromGroundedIndex(query);
    const geminiKey = process.env.GEMINI_API_KEY;

    if (geminiKey && geminiKey.trim().length > 0) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 9000);

        const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${encodeURIComponent(
          geminiKey.trim()
        )}`;

        const apiRes = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal: controller.signal,
          body: JSON.stringify({
            system_instruction: {
              parts: [{ text: buildGroundedSystemPrompt() }],
            },
            contents: [
              {
                role: "user",
                parts: [{ text: query.slice(0, 600) }],
              },
            ],
            generationConfig: {
              temperature: 0.2,
              maxOutputTokens: 280,
            },
          }),
        });

        clearTimeout(timeout);

        if (apiRes.ok) {
          const data = (await apiRes.json()) as {
            candidates?: Array<{
              content?: { parts?: Array<{ text?: string }> };
            }>;
          };
          const text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
          if (text) {
            return NextResponse.json({
              answer: text,
              mode: "gemini",
              links: groundedFallback.links,
            });
          }
        }
      } catch {
        // Fall through cleanly to grounded-index response
      }
    }

    return NextResponse.json(groundedFallback);
  } catch {
    return NextResponse.json(
      { error: "Invalid request payload." },
      { status: 400 }
    );
  }
}
