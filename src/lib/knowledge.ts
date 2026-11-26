import { PROFILE, SERVICE_PILLARS } from "@/data/profile";
import { PROJECTS } from "@/data/projects";
import {
  EDUCATION,
  EXPERIENCE_ITEMS,
  HACKATHONS_AND_PROGRAMS,
  LANGUAGES,
} from "@/data/experience";

export interface SuggestedLink {
  label: string;
  href: string;
}

export interface ChatHistoryTurn {
  role: "user" | "assistant";
  content: string;
}

export interface ChatResponsePayload {
  answer: string;
  mode: "gemini" | "grounded-index";
  model?: string;
  links: SuggestedLink[];
}

export function formatGeminiModelLabel(modelId?: string | null): string {
  if (!modelId) return "Gemini 3.8 Flash";
  const cleaned = modelId.trim().replace(/^models\//i, "").toLowerCase();
  if (cleaned === "gemini-3.8-flash") return "Gemini 3.8 Flash";
  if (cleaned === "gemini-3.7-flash") return "Gemini 3.7 Flash";
  if (cleaned === "gemini-3.6-flash") return "Gemini 3.6 Flash";
  if (cleaned === "gemini-3.5-flash") return "Gemini 3.5 Flash";
  if (cleaned === "gemini-3.5-flash-lite") return "Gemini 3.5 Flash Lite";
  if (cleaned === "gemini-3-flash-preview") return "Gemini 3 Flash";

  return cleaned
    .replace(/-preview$/i, "")
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function buildGroundedSystemPrompt(): string {
  const metricsText = PROFILE.metrics
    .map((m) => `- ${m.value} ${m.label}: ${m.detail}`)
    .join("\n");

  const pillarsText = SERVICE_PILLARS.map((p) =>
    [
      `### ${p.code}. ${p.label} (Contact Track: /contact?track=${p.id})`,
      `Tagline: ${p.tagline}`,
      `Overview: ${p.description}`,
      `Deliverables: ${p.deliverables.join("; ")}.`,
      `Stack: ${p.stack.join(", ")}.`,
      `Featured Case Studies: ${p.featuredSlugs.map((slug) => `/work/${slug}`).join(", ")}.`,
    ].join("\n")
  ).join("\n\n");

  const projectsText = PROJECTS.map((p) =>
    [
      `### ${p.indexCode}: ${p.title} (${p.subtitle})`,
      `Route: /work/${p.slug} | Domain: ${p.clientDomain} | Status: ${p.statusBadge} | Period: ${p.year}${p.isNda ? " | NDA Confidentiality Preserved" : ""}`,
      `Summary: ${p.summary}`,
      `Problem / Challenge: ${p.challenge}`,
      `Architecture Decisions:`,
      ...p.architectureDecisions.map((d) => `  - ${d}`),
      `Execution Highlights:`,
      ...p.executionHighlights.map((h) => `  - ${h}`),
      `Operational & Business Impact:`,
      ...p.businessImpact.map((b) => `  - ${b}`),
      `Stack: ${p.stack.join(", ")}.`,
      p.links.length > 0
        ? `Public Links: ${p.links.map((l) => `${l.label} (${l.href})`).join(", ")}.`
        : `Public Links: Confidential / NDA build (interactive architecture schematic available at /work/${p.slug}).`,
    ].join("\n")
  ).join("\n\n");

  const expText = EXPERIENCE_ITEMS.map((e) =>
    [
      `- ${e.organization}: ${e.role} [${e.category}] (${e.location}, ${e.period})${e.highlightBadge ? ` · ${e.highlightBadge}` : ""}`,
      ...e.bullets.map((b) => `  * ${b}`),
      ...(e.links && e.links.length > 0
        ? [`  * Links: ${e.links.map((l) => `${l.label} (${l.href})`).join(", ")}`]
        : []),
    ].join("\n")
  ).join("\n");

  const hackathonsText = HACKATHONS_AND_PROGRAMS.map(
    (h) => `- ${h.name} (${h.organizer}, ${h.year}): ${h.focus}`
  ).join("\n");

  const languagesText = LANGUAGES.map(
    (l) => `${l.name} (${l.proficiency}${l.notes ? `: ${l.notes}` : ""})`
  ).join("; ");

  return [
    `You are the technical portfolio assistant for ${PROFILE.displayName} (${PROFILE.legalName}), built directly into his portfolio at ${PROFILE.studio.primaryUrl}.`,
    ``,
    `OPERATING RULES:`,
    `1. Ground every answer strictly in the verified dossier below. Never fabricate metrics, client names behind NDAs, pricing/hourly rates, unlisted employers, or unverified credentials.`,
    `2. Treat all dates (including 2026 roles, programs, and hackathons) and technology names in the dossier (including Google Gemini 3.8 Flash, Gemini 4 Argon, Gemma 2/4, and Google Stitch Loop) as verified ground truth. Never dispute or "correct" dossier entries based on training cutoffs.`,
    `3. Never disclose any phone number other than the public primary WhatsApp listed below.`,
    `4. Match answer depth to the visitor's question: stay crisp and direct (2-4 sentences) for quick lookups, and provide clear structured technical detail when asked for architecture deep-dives, comparisons, or hiring/fit evaluations.`,
    `5. Use prior conversation turns to answer follow-up questions cohesively without repeating earlier introductions verbatim.`,
    `6. Write in clean, composed engineering prose (short paragraphs or compact "- " dash bullets when listing points). Do not use markdown headings (###), raw markdown tables, fenced code blocks, em-dashes, or emojis; rely on the drawer's attached route pills instead of printing raw full URLs.`,
    `7. If a visitor asks something outside the dossier (e.g., exact contract rates, private NDA client identities, or personal details not listed), state clearly that it is not listed in the public dossier and direct them to /contact or ${PROFILE.email}.`,
    ``,
    `IDENTITY, STUDIO & CONTACT:`,
    `- Display Name: ${PROFILE.displayName} (Legal Name: ${PROFILE.legalName})`,
    `- Headline Role: ${PROFILE.headlineRole}`,
    `- Sub-Role: ${PROFILE.subRole}`,
    `- Executive Bio: ${PROFILE.bioShort}`,
    `- Empirical & Clinical Edge: ${PROFILE.empiricalEdge}`,
    `- Studio: ${PROFILE.studio.name} (${PROFILE.studio.primaryDisplay} · mirror: ${PROFILE.studio.mirrorDisplay}), ${PROFILE.studio.role} (${PROFILE.studio.period}). ${PROFILE.studio.summary}`,
    `- Availability & Timezone: ${PROFILE.locationLabel} (${PROFILE.timeZone}, ${PROFILE.utcOffsetLabel}). ${PROFILE.availabilityText}`,
    `- Public Email: ${PROFILE.email}`,
    `- Public Primary WhatsApp: ${PROFILE.whatsappDisplay} (${PROFILE.whatsappHref})`,
    `- GitHub: ${PROFILE.githubUrl}`,
    `- Resume PDF: Available to preview/download directly on the site (${PROFILE.resumePdfPath})`,
    `- Portfolio Routes: Home (/), Selected Work (/work), Case Studies (/work/[slug]), Experience & Clinical Credentials (/experience), Contact & Inquiry (/contact). Note: /work/quant-forex-crypto-hft includes an interactive Monte Carlo drawdown risk simulator, and every case study page includes an interactive architecture schematic.`,
    ``,
    `VERIFIED METRICS:`,
    metricsText,
    ``,
    `FIVE CORE SERVICE PILLARS:`,
    pillarsText,
    ``,
    `SHIPPED CASE STUDIES (COMPLETE DOSSIERS):`,
    projectsText,
    ``,
    `CAREER & CLINICAL EXPERIENCE:`,
    expText,
    ``,
    `EDUCATION & CLINICAL RESEARCH:`,
    `- ${EDUCATION.degree} (${EDUCATION.specialization}), ${EDUCATION.institution}.`,
    `- Research Thesis (${EDUCATION.thesisYear}): "${EDUCATION.thesisTitle}".`,
    `- Clinical Seminar (${EDUCATION.seminarYear}): "${EDUCATION.seminarTitle}".`,
    ``,
    `2026 HACKATHONS & SELECTED BUILDER PROGRAMS:`,
    hackathonsText,
    ``,
    `LANGUAGES: ${languagesText}.`,
  ].join("\n");
}

/**
 * Derives relevant, verified portfolio navigation links from a query and optional
 * Gemini answer so follow-up questions still surface the right case studies or routes.
 */
export function suggestLinksForConversation(
  rawQuery: string,
  answer?: string
): SuggestedLink[] {
  const fromQuery = answerFromGroundedIndex(rawQuery).links;
  if (!answer || answer.trim().length === 0) {
    return fromQuery;
  }

  const combined = `${rawQuery}\n${answer}`.toLowerCase();
  const discovered: SuggestedLink[] = [];
  const seen = new Set<string>();

  const pushLink = (label: string, href: string) => {
    if (!seen.has(href) && discovered.length < 3) {
      seen.add(href);
      discovered.push({ label, href });
    }
  };

  if (
    combined.includes("gravitator") ||
    combined.includes("orbital wire") ||
    combined.includes("gravity deck") ||
    combined.includes("opspilot") ||
    combined.includes("orbitbench") ||
    combined.includes("skunkworks")
  ) {
    pushLink("Inspect G-Gravitator Dossier", "/work/g-gravitator");
  }
  if (combined.includes("fortress")) {
    pushLink("Inspect Fortress Fleet AI", "/work/fortress-fleet-ai");
  }
  if (combined.includes("koridor") || combined.includes("haulage") || combined.includes("freight")) {
    pushLink("Inspect Koridor Engine OS", "/work/koridor-engine-os");
  }
  if (combined.includes("stitch retail") || combined.includes("stitch loop") || combined.includes("pos reconciliation")) {
    pushLink("Inspect Stitch Retail OS", "/work/stitch-retail-operations-os");
  }
  if (combined.includes("crypto") && (combined.includes("wealth") || combined.includes("yield"))) {
    pushLink("Inspect Crypto & Wealth Dossier", "/work/institutional-crypto-wealth");
  }
  if (combined.includes("monte carlo") || combined.includes("quant") || combined.includes("hft") || combined.includes("drawdown")) {
    pushLink("Open Quant & HFT Simulator", "/work/quant-forex-crypto-hft");
  }
  if (combined.includes("blaire") || combined.includes("aifycycle") || combined.includes("e-commerce")) {
    pushLink("Inspect E-Commerce Builds", "/work/production-ecommerce-builds");
  }
  if (
    combined.includes("devops") ||
    combined.includes("docker") ||
    combined.includes("coolify") ||
    combined.includes("ci/cd") ||
    combined.includes("linux vps") ||
    combined.includes("cloudflare") ||
    combined.includes("cloud run") ||
    combined.includes("infrastructure")
  ) {
    pushLink("Start a DevOps Project", "/contact?track=devops-cloud");
  }
  if (
    combined.includes("b.mls") ||
    combined.includes("fmc") ||
    combined.includes("clinical") ||
    combined.includes("outlier") ||
    combined.includes("hackathon")
  ) {
    pushLink("Experience & Clinical Credentials", "/experience");
  }
  if (
    combined.includes("/contact") ||
    combined.includes("availab") ||
    combined.includes("hire") ||
    combined.includes("inquiry") ||
    combined.includes("contract")
  ) {
    pushLink("Open Contact & Inquiry Form", "/contact");
  }

  for (const item of fromQuery) {
    pushLink(item.label, item.href);
  }

  return discovered.length > 0 ? discovered : fromQuery;
}

/**
 * Deterministic grounded knowledge synthesizer used when GEMINI_API_KEY is not configured
 * or as an instant fallback if the upstream Gemini API is unreachable.
 */
export function answerFromGroundedIndex(rawQuery: string): ChatResponsePayload {
  const q = rawQuery.toLowerCase().trim();

  // 1. Specific project lookups
  if (
    q.includes("gravitator") ||
    q.includes("orbital wire") ||
    q.includes("gravity deck") ||
    q.includes("opspilot") ||
    q.includes("orbitbench") ||
    q.includes("skunkworks")
  ) {
    const p = PROJECTS.find((item) => item.slug === "g-gravitator")!;
    return {
      mode: "grounded-index",
      answer: `${p.title} (ggravitator.xyz) is Akaolisa's flagship software and AI creativity lab operating OXAKALABS as a four-unit flywheel: Systems (B2B Gravity Audits, Velocity MVPs, and retainers), OXAKALABS Skunkworks (48-hour sprints and a Live Hackathon Radar tracking 13+ global events), Labs (commercial drops G-01 through G-04 graduated via a 25-point scorecard), and Orbit (6-week technical builders residency), paired with The Orbital Wire real-time Gemini 2.5 Flash intelligence pipeline.`,
      links: [
        { label: "Inspect G-Gravitator Dossier", href: `/work/${p.slug}` },
        { label: "Browse All Work", href: "/work" },
      ],
    };
  }

  if (q.includes("fortress") && q.includes("koridor")) {
    return {
      mode: "grounded-index",
      answer:
        "Fortress Fleet AI is an institutional multi-agent governance platform built for the Google Cloud & Devpost All Things Agentic Hackathon using Google Cloud Run, Gemini, Gemma 2, and Supabase pgvector for semantic memory and autonomous tool-use guardrails. Koridor Engine OS is an industrial digital freight network and haulage OS built with Next.js App Router, TypeScript, Mapbox GL JS, Supabase RLS, and Gemini AI for real-time fleet telemetry, automated load matching, and route dispatch.",
      links: [
        { label: "Inspect Fortress Fleet AI", href: "/work/fortress-fleet-ai" },
        { label: "Inspect Koridor Engine OS", href: "/work/koridor-engine-os" },
      ],
    };
  }

  if (q.includes("koridor") || q.includes("freight") || q.includes("haulage") || q.includes("logistics") || q.includes("mapbox")) {
    const p = PROJECTS.find((item) => item.slug === "koridor-engine-os")!;
    return {
      mode: "grounded-index",
      answer: `${p.title} (${p.clientDomain}) is an industrial digital freight network and haulage OS built with ${p.stack.join(", ")}. It handles real-time fleet telemetry, automated load matching via Gemini AI, and Mapbox GL JS route dispatch.`,
      links: [
        { label: "Inspect Koridor Engine OS", href: `/work/${p.slug}` },
        { label: "View All Work", href: "/work" },
      ],
    };
  }

  if (q.includes("fortress") || q.includes("guardrail") || q.includes("pgvector")) {
    const p = PROJECTS.find((item) => item.slug === "fortress-fleet-ai")!;
    return {
      mode: "grounded-index",
      answer: `${p.title} is an institutional multi-agent governance platform built for the Google Cloud & Devpost All Things Agentic Hackathon. It runs on Google Cloud Run with Gemini, Gemma 2, and Supabase pgvector for semantic memory and autonomous tool-use guardrails.`,
      links: [
        { label: "Inspect Fortress Fleet AI", href: `/work/${p.slug}` },
        { label: "Start an AI Project", href: "/contact?track=ai-agents" },
      ],
    };
  }

  if (q.includes("stitch") || q.includes("retail") || q.includes("pos") || q.includes("inventory")) {
    const p = PROJECTS.find((item) => item.slug === "stitch-retail-operations-os")!;
    return {
      mode: "grounded-index",
      answer: `${p.title} is an end-to-end retail operations management system covering multi-store inventory, POS reconciliation, supplier workflows, and sales analytics. It was selected into Google's Stitch Loop Early Access program (2026).`,
      links: [{ label: "Inspect Stitch Retail OS", href: `/work/${p.slug}` }],
    };
  }

  if (q.includes("crypto") || q.includes("wealth") || q.includes("yield") || q.includes("orderbook") || q.includes("ticker")) {
    const p = PROJECTS.find((item) => item.slug === "institutional-crypto-wealth")!;
    return {
      mode: "grounded-index",
      answer: `For an NDA FinTech client, Akaolisa engineered an Institutional Crypto & Wealth Platform featuring real-time WebSocket market ticker tapes, custom interactive SVG financial charts, native PostgreSQL automated yield-accrual engines, admin governance, and Resend SMTP relays.`,
      links: [
        { label: "Inspect Crypto & Wealth Dossier", href: `/work/${p.slug}` },
        { label: "Quant & FinTech Track", href: "/contact?track=quant-fintech" },
      ],
    };
  }

  if (q.includes("quant") || q.includes("hft") || q.includes("forex") || q.includes("trading") || q.includes("monte carlo") || q.includes("backtest") || q.includes("drawdown")) {
    const p = PROJECTS.find((item) => item.slug === "quant-forex-crypto-hft")!;
    return {
      mode: "grounded-index",
      answer: `Akaolisa builds algorithmic Forex, Crypto, and HFT execution scripts, prop-firm drawdown calculators, and Python (pandas, numpy, matplotlib) / R backtesting and Monte Carlo risk simulators for independent traders and funds. You can try the interactive Monte Carlo drawdown visualizer inside the Quant case study.`,
      links: [
        { label: "Open Quant & HFT Simulator", href: `/work/${p.slug}` },
        { label: "Inquire on Quant Tooling", href: "/contact?track=quant-fintech" },
      ],
    };
  }

  if (q.includes("blaire") || q.includes("aify") || q.includes("ecommerce") || q.includes("e-commerce") || q.includes("store")) {
    const p = PROJECTS.find((item) => item.slug === "production-ecommerce-builds")!;
    return {
      mode: "grounded-index",
      answer: `Akaolisa ships fast, mobile-first e-commerce storefronts and brand ecosystems, including live builds at blaireaesthetics.shop and aifycycle.vercel.app, wired with Cloudflare DNS routing, automated checkout flows, and scalable cloud database backends.`,
      links: [
        { label: "Inspect E-Commerce Builds", href: `/work/${p.slug}` },
      ],
    };
  }

  // 2. DevOps & Cloud Infrastructure
  if (
    q.includes("devops") ||
    q.includes("docker") ||
    q.includes("coolify") ||
    q.includes("vps") ||
    q.includes("linux") ||
    q.includes("ci/cd") ||
    q.includes("cicd") ||
    q.includes("github actions") ||
    q.includes("cloudflare") ||
    q.includes("cloud run") ||
    q.includes("infrastructure") ||
    q.includes("sre") ||
    q.includes("deploy") ||
    q.includes("nginx")
  ) {
    return {
      mode: "grounded-index",
      answer: `Akaolisa is a hands-on DevOps and cloud infrastructure engineer shipping containerized Docker services, self-hosted Ubuntu Linux VPS and Coolify clusters, Google Cloud Run deployments, automated GitHub Actions CI/CD release gates, Cloudflare DNS/WAF and SSL/TLS edge hardening, and PostgreSQL/Resend SMTP (SPF/DKIM) operational reliability across G-Gravitator, Fortress Fleet AI, Koridor Engine OS, and client SaaS platforms.`,
      links: [
        { label: "Start a DevOps Project", href: "/contact?track=devops-cloud" },
        { label: "Inspect Fortress Fleet AI", href: "/work/fortress-fleet-ai" },
        { label: "Browse Shipped Systems", href: "/work" },
      ],
    };
  }

  // 3. AI & LLM Stack
  if (q.includes("ai") || q.includes("llm") || q.includes("agent") || q.includes("gemini") || q.includes("mcp") || q.includes("rag") || q.includes("rlhf") || q.includes("outlier")) {
    return {
      mode: "grounded-index",
      answer: `Akaolisa's AI stack covers multi-agent orchestration, Google Gemini API (3.8 Flash / 4 Argon), Gemma 2/4, Qwen, RAG with Supabase pgvector, Model Context Protocol (MCP), local LLM runtimes (Ollama, LM Studio), and QLoRA/Unsloth fine-tuning. Beyond shipping G-Gravitator, Fortress Fleet AI, and Koridor Engine OS, he benchmarks frontier LLM code, quantitative math, and clinical reasoning for Outlier.ai and OneForma (2026-Present).`,
      links: [
        { label: "Inspect G-Gravitator", href: "/work/g-gravitator" },
        { label: "Inspect Fortress Fleet AI", href: "/work/fortress-fleet-ai" },
        { label: "Experience & RLHF Track", href: "/experience" },
      ],
    };
  }

  // 4. Biomedical / Clinical / Education
  if (
    q.includes("bio") ||
    q.includes("medic") ||
    q.includes("lab") ||
    q.includes("clinical") ||
    q.includes("health") ||
    q.includes("fmc") ||
    q.includes("degree") ||
    q.includes("education") ||
    q.includes("thesis") ||
    q.includes("b.mls") ||
    q.includes("trainee")
  ) {
    return {
      mode: "grounded-index",
      answer: `Akaolisa holds a B.MLS (Clinical Chemistry Specialization) from Nnamdi Azikiwe University, Awka (2024 thesis on Plasma/Serum ATP & AMP levels; Gaucher's Disease seminar). At Federal Medical Centre (FMC) Umuahia (Feb 2026-Present), he serves as Medical Lab Scientist Intern & Lead Intern Coordinator, directing bench schedules and onboarding for 100+ MLS interns and supervising 150+ university students (250+ trainees total) alongside IQC/EQA calibration and seminars on PSA Screening & Clinical Toxicology. For software teams, this translates into rigorous validation, calm operational leadership, and deep HealthTech/LIS domain fluency.`,
      links: [
        { label: "Explore Clinical & Lab Experience", href: "/experience" },
        { label: "HealthTech Inquiry", href: "/contact?track=healthtech-biomedical" },
      ],
    };
  }

  // 5. Studio / OXAKALABS
  if (q.includes("oxaka") || q.includes("studio") || q.includes("agency") || q.includes("founder")) {
    return {
      mode: "grounded-index",
      answer: `OXAKALABS (${PROFILE.studio.primaryDisplay} · ${PROFILE.studio.mirrorDisplay}) is Akaolisa's independent product engineering studio (2022-Present), now also operating within the G-Gravitator software and AI creativity lab (ggravitator.xyz). He leads end-to-end architecture, DevOps & cloud deployment, UI/UX engineering, and PostgreSQL modeling across SaaS, AI automation, FinTech, and retail clients.`,
      links: [
        { label: "Inspect G-Gravitator", href: "/work/g-gravitator" },
        { label: "Browse Shipped Systems", href: "/work" },
        { label: "Start a Project", href: "/contact" },
      ],
    };
  }

  // 6. Hackathons / Languages
  if (q.includes("hackathon") || q.includes("meta") || q.includes("devpost") || q.includes("dora") || q.includes("cerebral")) {
    return {
      mode: "grounded-index",
      answer: `In 2026, Akaolisa participated in the Google Cloud & Devpost All Things Agentic Hackathon (shipping Fortress Fleet AI), Google Stitch Loop Early Access (Stitch Retail Operations OS), Meta VR Start Developer Competition, Devpost Build With AI & Agentic Cinema, and Cerebral Valley & DoraHacks.`,
      links: [
        { label: "View Hackathons & Credentials", href: "/experience" },
        { label: "Inspect Fortress Fleet AI", href: "/work/fortress-fleet-ai" },
      ],
    };
  }

  if (q.includes("language") || q.includes("sign") || q.includes("asl") || q.includes("igbo")) {
    return {
      mode: "grounded-index",
      answer: `Akaolisa speaks English (Native/Bilingual), Igbo (Native), and conversational Sign Language: American Sign Language (ASL) and Nigerian Sign Language (NSL).`,
      links: [{ label: "View Full Background", href: "/experience" }],
    };
  }

  // 7. Availability, Contact, Hiring, Rates, Stack
  if (
    q.includes("avail") ||
    q.includes("hire") ||
    q.includes("contact") ||
    q.includes("email") ||
    q.includes("whatsapp") ||
    q.includes("remote") ||
    q.includes("timezone") ||
    q.includes("utc") ||
    q.includes("freelance") ||
    q.includes("resume") ||
    q.includes("cv")
  ) {
    return {
      mode: "grounded-index",
      answer: `Akaolisa is available for remote freelance contracts, founding/principal engineering collaborations, DevOps cloud architecture, and technical advisory worldwide from UTC+1 (West Africa Time). Reach him via the Contact form, email (${PROFILE.email}), or primary WhatsApp (${PROFILE.whatsappDisplay}), or download his full resume PDF directly from the header.`,
      links: [
        { label: "Open Contact & Inquiry Form", href: "/contact" },
        { label: "View Experience & Resume", href: "/experience" },
      ],
    };
  }

  if (q.includes("stack") || q.includes("next") || q.includes("supabase") || q.includes("tech")) {
    return {
      mode: "grounded-index",
      answer: `Core full-stack & DevOps tooling: Next.js (App Router), React, TypeScript, Node.js, Tailwind CSS, Framer Motion, Supabase (PostgreSQL, RLS, Auth), REST & WebSockets, Docker, Coolify, Ubuntu Linux VPS, Google Cloud Run, GitHub Actions CI/CD, Vercel, Cloudflare DNS, and Resend SMTP. This is complemented by Gemini/Gemma/MCP AI pipelines and Python/R quantitative engines.`,
      links: [
        { label: `Inspect All ${PROJECTS.length} Shipped Systems`, href: "/work" },
        { label: "Start a DevOps Project", href: "/contact?track=devops-cloud" },
      ],
    };
  }

  // Default executive overview
  return {
    mode: "grounded-index",
    answer: `${PROFILE.displayName} is the Founder & Principal Engineer at OXAKALABS and G-Gravitator (ggravitator.xyz), shipping Full-Stack Next.js SaaS systems, hardened DevOps & cloud infrastructure (Docker, Coolify, Linux VPS, Cloud Run, CI/CD), autonomous multi-agent AI platforms, and Quantitative Forex/Crypto/HFT suites. He combines software and infrastructure reliability with empirical discipline as a licensed Medical Laboratory Scientist (B.MLS) directing 250+ clinical trainees.`,
    links: [
      { label: "Explore Selected Work", href: "/work" },
      { label: "Experience & Clinical Lab", href: "/experience" },
      { label: "Start a Project Inquiry", href: "/contact" },
    ],
  };
}
