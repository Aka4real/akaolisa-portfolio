export type TrackId =
  | "full-stack-saas"
  | "ai-agents"
  | "quant-fintech"
  | "healthtech-biomedical";

export interface ServicePillar {
  id: TrackId;
  code: string;
  label: string;
  shortLabel: string;
  tagline: string;
  description: string;
  deliverables: string[];
  stack: string[];
  featuredSlugs: string[];
}

export interface ProfileMetric {
  value: string;
  label: string;
  detail: string;
}

export interface ProfileConfig {
  displayName: string;
  legalName: string;
  monogram: string;
  headlineRole: string;
  subRole: string;
  locationLabel: string;
  timeZone: string;
  utcOffsetLabel: string;
  availabilityText: string;
  email: string;
  /** Primary WhatsApp number exposed publicly on /contact (secondary number stays strictly inside the PDF). */
  whatsappDisplay: string;
  whatsappHref: string;
  githubHandle: string;
  githubUrl: string;
  studio: {
    name: string;
    role: string;
    period: string;
    primaryUrl: string;
    primaryDisplay: string;
    mirrorUrl: string;
    mirrorDisplay: string;
    summary: string;
  };
  resumePdfPath: string;
  resumeFileName: string;
  /**
   * Optional portrait image path (e.g. "/images/akaolisa.jpg").
   * Leave empty to render the Clinical Swiss monogram dossier card.
   */
  portraitUrl?: string;
  /**
   * Optional external profiles: populate any URL here and it automatically appears across Header/Footer/Contact.
   */
  socials: {
    linkedin?: string;
    x?: string;
    devpost?: string;
    upwork?: string;
  };
  bioShort: string;
  empiricalEdge: string;
  metrics: ProfileMetric[];
}

export const PROFILE: ProfileConfig = {
  displayName: "Akaolisa Enwedo",
  legalName: "Enwedo Akaolisa Gift",
  monogram: "AE",
  headlineRole: "Full-Stack Next.js, AI Agent & Quantitative Systems Engineer",
  subRole: "Founder at OXAKALABS · Licensed Biomedical Scientist (B.MLS)",
  locationLabel: "Remote Worldwide",
  timeZone: "Africa/Lagos",
  utcOffsetLabel: "UTC+1",
  availabilityText: "Available for Remote Contracts & Advisory",
  email: "akaolisaenwedo4real@gmail.com",
  whatsappDisplay: "+234 811 995 3474",
  whatsappHref: "https://wa.me/2348119953474",
  githubHandle: "github.com/Aka4real",
  githubUrl: "https://github.com/Aka4real",
  studio: {
    name: "OXAKALABS",
    role: "Founder & Principal Engineer",
    period: "2022-Present",
    primaryUrl: "https://oxakalabs.xyz",
    primaryDisplay: "oxakalabs.xyz",
    mirrorUrl: "https://oxakalabs.vercel.app",
    mirrorDisplay: "oxakalabs.vercel.app",
    summary:
      "Independent product engineering studio shipping full-stack SaaS platforms, autonomous multi-agent systems, algorithmic trading infrastructure, and healthcare data solutions for international clients.",
  },
  resumePdfPath: "/resume/Akaolisa-Enwedo-Resume.pdf",
  resumeFileName: "Akaolisa-Enwedo-Resume.pdf",
  portraitUrl: undefined,
  socials: {
    linkedin: undefined,
    x: undefined,
    devpost: undefined,
    upwork: undefined,
  },
  bioShort:
    "Founder at OXAKALABS and licensed Biomedical Scientist (B.MLS) shipping Next.js SaaS platforms, multi-agent systems, and quantitative trading engines.",
  empiricalEdge:
    "Trained as a licensed Medical Laboratory Scientist (B.MLS, Clinical Chemistry) and Lead Intern Coordinator directing 250+ clinical trainees, bringing laboratory calibration discipline, strict data validation, and empirical rigor to every production software release.",
  metrics: [
    {
      value: "4+ Yrs",
      label: "OXAKALABS Delivery",
      detail: "End-to-end SaaS, AI & Quant systems since 2022",
    },
    {
      value: "06",
      label: "Shipped Systems",
      detail: "Freight OS, Agentic Governance, FinTech, Retail, HFT & Commerce",
    },
    {
      value: "250+",
      label: "Clinical Trainees",
      detail: "100+ MLS interns & 150+ university students coordinated",
    },
    {
      value: "04",
      label: "Core Verticals",
      detail: "Full-Stack SaaS · AI Agents · Quant/FinTech · Biomedical",
    },
  ],
};

export const SERVICE_PILLARS: ServicePillar[] = [
  {
    id: "full-stack-saas",
    code: "01",
    label: "Full-Stack SaaS & Cloud Web Apps",
    shortLabel: "Full-Stack SaaS",
    tagline: "Production web architecture from database schema to zero-downtime edge deployment.",
    description:
      "End-to-end architecture and shipping of multi-tenant web applications, real-time operational dashboards, and commercial brand ecosystems with strict Row-Level Security, resilient cloud databases, and automated email/DNS pipelines.",
    deliverables: [
      "Multi-tenant Next.js App Router SaaS platforms",
      "PostgreSQL schema design, Supabase RLS & Auth hardening",
      "Real-time WebSocket & REST telemetry interfaces",
      "Self-hosted Linux VPS (Docker, Coolify), Vercel & Cloudflare DNS",
    ],
    stack: [
      "Next.js (App Router)",
      "React",
      "TypeScript",
      "Node.js",
      "Tailwind CSS",
      "Framer Motion",
      "Supabase (PostgreSQL, RLS, Auth)",
      "REST & WebSockets",
      "Docker",
      "Coolify",
      "Linux VPS",
      "Vercel",
      "Cloudflare DNS",
      "Resend SMTP",
    ],
    featuredSlugs: [
      "koridor-engine-os",
      "stitch-retail-operations-os",
      "production-ecommerce-builds",
    ],
  },
  {
    id: "ai-agents",
    code: "02",
    label: "AI Agents & LLM Orchestration",
    shortLabel: "AI Agents & LLMs",
    tagline: "Autonomous multi-agent pipelines built with semantic memory, tool guardrails, and RLHF rigor.",
    description:
      "Design and deployment of production agentic workflows combining frontier cloud models, local open-weight runtimes, pgvector semantic retrieval, and Model Context Protocol (MCP) tool servers evaluated against strict quality rubrics.",
    deliverables: [
      "Institutional multi-agent orchestration & tool-use guardrails",
      "Hybrid RAG pipelines with Supabase pgvector semantic memory",
      "Model Context Protocol (MCP) integrations & structured outputs",
      "Local LLM deployment (Ollama, LM Studio), QLoRA/Unsloth fine-tuning & RLHF",
    ],
    stack: [
      "Multi-Agent Systems",
      "Google Gemini API (3.8 Flash / 4 Argon)",
      "Gemma 2/4",
      "Qwen",
      "RAG & pgvector",
      "Model Context Protocol (MCP)",
      "Ollama",
      "LM Studio",
      "QLoRA / Unsloth",
      "RLHF Evaluation",
    ],
    featuredSlugs: ["fortress-fleet-ai", "koridor-engine-os"],
  },
  {
    id: "quant-fintech",
    code: "03",
    label: "Quant Trading, Crypto & FinTech",
    shortLabel: "Quant & FinTech",
    tagline: "Low-latency execution tooling, stochastic risk engines, and institutional wealth platforms.",
    description:
      "Custom algorithmic execution scripts, quantitative strategy backtesting suites, Monte Carlo risk simulators, and real-time crypto/FinTech interfaces backed by automated PostgreSQL yield-accrual pipelines and WebSocket market feeds.",
    deliverables: [
      "Algorithmic trading bots & HFT execution utilities (Forex & Crypto)",
      "Python strategy backtesting & Monte Carlo risk simulators",
      "Prop-firm drawdown calculators & risk-compliance telemetry",
      "Live WebSocket orderbooks, SVG financial charts & yield ledgers",
    ],
    stack: [
      "Algorithmic Trading / HFT",
      "Python (pandas, numpy, matplotlib)",
      "R",
      "Backtesting Engines",
      "Monte Carlo Simulators",
      "WebSocket Orderbooks",
      "PostgreSQL Yield Engines",
      "Interactive SVG Charts",
    ],
    featuredSlugs: [
      "institutional-crypto-wealth",
      "quant-forex-crypto-hft",
    ],
  },
  {
    id: "healthtech-biomedical",
    code: "04",
    label: "HealthTech & Biomedical Science",
    shortLabel: "Biomedical & HealthTech",
    tagline: "Empirical clinical discipline applied to diagnostic software, biostatistics, and LIS workflows.",
    description:
      "Licensed Medical Laboratory Scientist (B.MLS, Clinical Chemistry) bridging wet-lab diagnostic reality with modern software: Laboratory Information Systems, IQC/EQA analyzer calibration logic, biostatistics, post-market surveillance, and scientific research.",
    deliverables: [
      "Laboratory Information Systems (LIS) & diagnostic workflow modeling",
      "Biomedical data analytics, clinical validation & biostatistics",
      "Analyzer calibration & Internal/External Quality Control (IQC/EQA)",
      "Post-market surveillance & scientific/clinical research writing",
    ],
    stack: [
      "Clinical Chemistry",
      "Laboratory Information Systems (LIS)",
      "Biostatistics (Python / R)",
      "IQC / EQA Calibration",
      "Diagnostic Validation",
      "Post-Market Surveillance",
      "Scientific Research Writing",
    ],
    featuredSlugs: ["fortress-fleet-ai", "koridor-engine-os"],
  },
];
