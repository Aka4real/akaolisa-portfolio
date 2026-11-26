import type { Metadata } from "next";
import { isAdminAuthenticated, isAdminPasscodeRequired } from "@/lib/admin-auth";
import { getStudioState } from "@/lib/admin-store";
import { getGeminiConfig, isGeminiConfigured } from "@/lib/gemini";
import { buildGroundedSystemPrompt } from "@/lib/knowledge";
import { SITE_URL } from "@/lib/site";
import {
  AdminConsole,
  type AdminDiagnostics,
} from "@/components/admin/AdminConsole";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "OXAKALABS Studio Console",
  description:
    "Operations console for managing portfolio dossiers, client inquiries, availability settings, and Gemini assistant diagnostics.",
  robots: {
    index: false,
    follow: false,
  },
};

export default async function AdminPage() {
  const passcodeRequired = isAdminPasscodeRequired();
  const authenticated = await isAdminAuthenticated();

  const gemini = getGeminiConfig();
  const promptText = buildGroundedSystemPrompt();

  const initialDiagnostics: AdminDiagnostics = {
    geminiEnabled: isGeminiConfigured(),
    primaryModel: gemini.primaryModel,
    fallbackModels: gemini.fallbackModels,
    thinkingLevel: gemini.thinkingLevel,
    maxOutputTokens: gemini.maxOutputTokens,
    resendConfigured: Boolean(
      process.env.RESEND_API_KEY && process.env.RESEND_API_KEY.trim().length > 0
    ),
    passcodeRequired,
    canonicalUrl: SITE_URL,
    systemPromptChars: promptText.length,
    systemPromptPreview: promptText,
  };

  return (
    <AdminConsole
      initialAuthenticated={authenticated}
      initialPasscodeRequired={passcodeRequired}
      initialState={authenticated ? getStudioState() : null}
      initialDiagnostics={authenticated ? initialDiagnostics : null}
    />
  );
}
