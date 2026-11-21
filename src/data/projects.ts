import type { TrackId } from "./profile";

export type SchematicType =
  | "koridor"
  | "fortress"
  | "crypto-wealth"
  | "stitch-retail"
  | "quant-hft"
  | "ecommerce";

export interface ProjectLink {
  label: string;
  href: string;
}

export interface ProjectDossier {
  slug: string;
  indexCode: string;
  title: string;
  subtitle: string;
  clientDomain: string;
  statusBadge: string;
  isNda?: boolean;
  year: string;
  tracks: TrackId[];
  primaryTrack: TrackId;
  featured: boolean;
  summary: string;
  challenge: string;
  architectureDecisions: string[];
  executionHighlights: string[];
  businessImpact: string[];
  stack: string[];
  schematicType: SchematicType;
  /** Optional public URLs: populate anytime in this single data file. */
  links: ProjectLink[];
}

export const PROJECTS: ProjectDossier[] = [
  {
    slug: "koridor-engine-os",
    indexCode: "SYS-01",
    title: "Koridor Engine OS",
    subtitle: "Industrial Digital Freight Network & Haulage Operating System",
    clientDomain: "Logistics & Haulage SaaS",
    statusBadge: "Production SaaS",
    year: "2025-2026",
    tracks: ["full-stack-saas", "ai-agents"],
    primaryTrack: "full-stack-saas",
    featured: true,
    summary:
      "Architected an industrial digital freight network and haulage OS using Next.js App Router, TypeScript, Tailwind CSS, Framer Motion, Mapbox GL JS, Supabase, and Gemini AI for real-time fleet telemetry, automated load matching, and route dispatch.",
    challenge:
      "Fragmented haulage operators relied on manual WhatsApp coordination and disconnected spreadsheets to match cargo loads with available fleet capacity, creating blind spots across live route transit and dispatch turnaround.",
    architectureDecisions: [
      "Unified Next.js App Router application layer with strict TypeScript contracts between dispatch consoles, carrier states, and route geometry.",
      "Mapbox GL JS geospatial rendering paired with live fleet telemetry coordinates stored and gated via Supabase PostgreSQL and Row-Level Security.",
      "Integrated Google Gemini AI decision pipeline to score carrier availability, route efficiency, and automated cargo load matching.",
      "High-contrast operational motion states in Framer Motion calibrated for rapid dispatcher scanning under live routing updates.",
    ],
    executionHighlights: [
      "Real-time fleet telemetry ingestion and geospatial route state visualization on Mapbox GL JS.",
      "Automated load-to-vehicle matching powered by structured Gemini AI prompts and relational availability filters.",
      "Role-segmented Supabase RLS policies separating dispatch administrators, fleet operators, and shippers.",
      "Responsive dispatch workflows engineered for both control-room monitors and field tablets.",
    ],
    businessImpact: [
      "Replaced manual phone/spreadsheet dispatch coordination with a single auditable haulage operating system.",
      "Compressed load-matching turnaround via AI-assisted routing recommendations and live telemetry visibility.",
      "Established a repeatable SaaS architecture capable of onboarding multi-operator freight corridors.",
    ],
    stack: [
      "Next.js App Router",
      "TypeScript",
      "Tailwind CSS",
      "Framer Motion",
      "Mapbox GL JS",
      "Supabase",
      "PostgreSQL RLS",
      "Google Gemini AI",
    ],
    schematicType: "koridor",
    links: [
      { label: "OXAKALABS Studio", href: "https://oxakalabs.xyz" },
    ],
  },
  {
    slug: "fortress-fleet-ai",
    indexCode: "SYS-02",
    title: "Fortress Fleet AI",
    subtitle: "Institutional Multi-Agent Governance & Guardrail Platform",
    clientDomain: "Multi-Agent AI · Google Cloud",
    statusBadge: "Live Deployment",
    year: "2026",
    tracks: ["ai-agents", "full-stack-saas"],
    primaryTrack: "ai-agents",
    featured: true,
    summary:
      "Built an institutional multi-agent governance platform for the Google Cloud & Devpost All Things Agentic Hackathon using Google Cloud Run, Gemini, Gemma 2, and Supabase pgvector with semantic memory and autonomous tool-use guardrails.",
    challenge:
      "Autonomous LLM agents operating over enterprise tools frequently drift outside policy constraints, lose long-horizon context, or trigger unverified external side effects without deterministic oversight.",
    architectureDecisions: [
      "Deployed containerized multi-agent orchestration services on Google Cloud Run for isolated execution and elastic horizontal scaling.",
      "Paired Google Gemini for high-reasoning orchestration with Gemma 2 models for fast policy screening and guardrail verification.",
      "Implemented persistent semantic memory using Supabase PostgreSQL with pgvector similarity search so agents recall historical decisions and institutional constraints.",
      "Designed explicit autonomous tool-use guardrails that intercept, validate, and audit every tool invocation before execution.",
    ],
    executionHighlights: [
      "Multi-model routing architecture balancing frontier reasoning (Gemini) with lightweight validation passes (Gemma 2).",
      "Vector-indexed institutional memory layer (Supabase pgvector) scoped per governance workspace.",
      "Deterministic pre-execution tool guardrail layer logging rationale, risk posture, and execution outcome.",
      "Built and shipped under hackathon timelines for the Google Cloud & Devpost All Things Agentic Hackathon.",
    ],
    businessImpact: [
      "Demonstrated verifiable institutional governance over autonomous multi-agent tool pipelines.",
      "Reduced hallucinated or policy-violating tool invocations via layered model verification and semantic memory recall.",
      "Delivered a production Cloud Run blueprint transferable to regulated enterprise and FinTech workflows.",
    ],
    stack: [
      "Google Cloud Run",
      "Google Gemini",
      "Gemma 2",
      "Supabase pgvector",
      "Multi-Agent Orchestration",
      "Tool-Use Guardrails",
      "TypeScript",
      "Next.js",
    ],
    schematicType: "fortress",
    links: [
      { label: "GitHub Profile", href: "https://github.com/Aka4real" },
    ],
  },
  {
    slug: "institutional-crypto-wealth",
    indexCode: "SYS-03",
    title: "Institutional Crypto & Wealth Platform",
    subtitle: "Full-Stack Digital Asset Banking, Live Market Feeds & Yield Engine",
    clientDomain: "NDA FinTech Client",
    statusBadge: "NDA Client",
    isNda: true,
    year: "2024-2025",
    tracks: ["quant-fintech", "full-stack-saas"],
    primaryTrack: "quant-fintech",
    featured: true,
    summary:
      "Engineered a full-stack cryptocurrency banking and portfolio platform featuring real-time WebSocket market ticker tapes, interactive SVG financial charts, native PostgreSQL automated yield-accrual engines, admin governance, and Resend SMTP relays.",
    challenge:
      "An institutional FinTech client required a high-trust wealth and crypto banking interface combining live streaming market feeds, auditable automated yield calculations, and granular administrative governance without fragile third-party chart bloat.",
    architectureDecisions: [
      "Streamed live market ticker feeds over WebSockets with resilient client reconnection and throttled UI hydration.",
      "Authored custom interactive SVG financial charts to eliminate heavy chart-library overhead and guarantee razor-sharp tabular alignment.",
      "Implemented yield-accrual accounting directly inside native PostgreSQL ledger logic for transactional integrity and zero floating-point drift.",
      "Integrated role-based administrative governance controls and transactional Resend SMTP relays for operational alerts and client statements.",
    ],
    executionHighlights: [
      "Real-time WebSocket market ticker tape synchronized across portfolio valuation panels.",
      "Custom interactive SVG financial charting with hover crosshair telemetry and period switches.",
      "Automated PostgreSQL yield-accrual engine with full audit trail and administrative override governance.",
      "Transactional notification pipeline powered by Resend SMTP with strict domain authentication.",
    ],
    businessImpact: [
      "Delivered institutional-grade portfolio visibility and deterministic yield accounting under strict client NDA.",
      "Eliminated manual yield reconciliation spreadsheets through native database-level accrual automation.",
      "Maintained sub-second dashboard responsiveness even during rapid live WebSocket price updates.",
    ],
    stack: [
      "Next.js",
      "TypeScript",
      "WebSockets",
      "Custom Interactive SVG",
      "PostgreSQL",
      "Automated Yield Engines",
      "Admin Governance",
      "Resend SMTP",
    ],
    schematicType: "crypto-wealth",
    links: [],
  },
  {
    slug: "stitch-retail-operations-os",
    indexCode: "SYS-04",
    title: "Stitch Retail Operations OS",
    subtitle: "Multi-Store Inventory, POS Reconciliation & Supplier Operations System",
    clientDomain: "Google Stitch Loop Cohort",
    statusBadge: "Google Cohort",
    year: "2026",
    tracks: ["full-stack-saas"],
    primaryTrack: "full-stack-saas",
    featured: false,
    summary:
      "Developed an end-to-end retail operations management system handling multi-store inventory, POS reconciliation, supplier workflows, and sales analytics; selected into Google's Stitch Loop Early Access program.",
    challenge:
      "Multi-branch retail teams struggle with stock drift between point-of-sale registers, warehouse replenishment orders, and supplier invoices, causing stockouts on fast-moving SKUs and delayed margin visibility.",
    architectureDecisions: [
      "Designed a unified multi-store inventory ledger tying every SKU adjustment to an explicit POS sale, supplier shipment, or branch transfer event.",
      "Built automated end-of-day POS reconciliation views highlighting register variances and stock discrepancies immediately.",
      "Structured supplier procurement workflows alongside branch-level sales analytics for fast restock decisions.",
      "Crafted interface flows accepted into Google's Stitch Loop Early Access cohort.",
    ],
    executionHighlights: [
      "Multi-store stock tracking with real-time branch transfer and low-threshold alerts.",
      "POS reconciliation engine matching daily register totals against SKU depletion records.",
      "Supplier order workflow connecting purchase requests, receipt confirmation, and ledger updates.",
      "Executive sales analytics dashboard surfacing SKU velocity and branch performance.",
    ],
    businessImpact: [
      "Selected into Google's Stitch Loop Early Access program (2026).",
      "Consolidated inventory, POS reconciliation, and supplier procurement into a single retail operating layer.",
      "Reduced branch stock discrepancies and manual end-of-day closing overhead.",
    ],
    stack: [
      "Next.js App Router",
      "TypeScript",
      "Tailwind CSS",
      "PostgreSQL",
      "Multi-Store Inventory",
      "POS Reconciliation",
      "Sales Analytics",
      "Google Stitch Loop",
    ],
    schematicType: "stitch-retail",
    links: [
      { label: "OXAKALABS Studio", href: "https://oxakalabs.xyz" },
    ],
  },
  {
    slug: "quant-forex-crypto-hft",
    indexCode: "SYS-05",
    title: "Quant Forex, Crypto & HFT Suites",
    subtitle: "Algorithmic Execution, Strategy Backtesting & Monte Carlo Risk Engines",
    clientDomain: "Trading Clients & Independent Funds",
    statusBadge: "Client Suites",
    isNda: true,
    year: "2023-Present",
    tracks: ["quant-fintech"],
    primaryTrack: "quant-fintech",
    featured: true,
    summary:
      "Delivered custom algorithmic execution scripts, high-frequency trading (HFT) utilities, prop-firm drawdown calculators, and Python strategy backtesting and Monte Carlo simulation engines for independent traders and funds.",
    challenge:
      "Discretionary and systematic traders deploying capital across Forex, crypto venues, and strict prop-firm evaluations needed deterministic execution scripts and statistically valid stress tests before risking live drawdown limits.",
    architectureDecisions: [
      "Engineered modular Python backtesting pipelines (pandas, numpy, matplotlib) separating signal generation, slippage/spread modeling, and equity-curve telemetry.",
      "Built Monte Carlo path simulators shuffling trade return distributions across thousands of trials to quantify tail risk and probability of hitting prop-firm max drawdown rules.",
      "Developed custom algorithmic execution scripts and HFT utilities focused on deterministic order sizing and latency-sensitive risk cutoffs.",
      "Created interactive prop-firm drawdown calculators enabling rapid pre-trade position sizing under daily and trailing drawdown constraints.",
    ],
    executionHighlights: [
      "Python strategy backtesting engines with realistic spread, commission, and drawdown telemetry.",
      "Monte Carlo simulation suites modeling confidence intervals across 1,000+ resampled trade sequences.",
      "Prop-firm drawdown calculators enforcing daily loss and trailing equity rules.",
      "Custom Forex & Crypto algorithmic execution scripts and HFT monitoring utilities.",
    ],
    businessImpact: [
      "Equipped independent traders and funds with empirical pre-deployment risk validation before live capital allocation.",
      "Eliminated emotional position-sizing errors via deterministic execution and prop-firm rule calculators.",
      "Accelerated strategy research cycles from manual spreadsheet testing to reproducible Python/R pipelines.",
    ],
    stack: [
      "Python",
      "pandas",
      "numpy",
      "matplotlib",
      "R",
      "HFT Execution Utilities",
      "Backtesting Engines",
      "Monte Carlo Simulation",
      "Risk Management",
    ],
    schematicType: "quant-hft",
    links: [],
  },
  {
    slug: "production-ecommerce-builds",
    indexCode: "SYS-06",
    title: "Production E-Commerce Builds",
    subtitle: "Mobile-First Brand Ecosystems, Edge DNS & Automated Checkout Flows",
    clientDomain: "blaireaesthetics.shop · aifycycle.vercel.app",
    statusBadge: "Live Deployments",
    year: "2023-Present",
    tracks: ["full-stack-saas"],
    primaryTrack: "full-stack-saas",
    featured: false,
    summary:
      "Shipped fast, mobile-first commercial web applications and brand ecosystems with custom domain and Cloudflare DNS routing, automated checkout flows, and scalable cloud database backends.",
    challenge:
      "Consumer brands migrating off slow template storefronts needed distinctive mobile-first shopping experiences with reliable checkout automation, fast global asset delivery, and full ownership of their customer database.",
    architectureDecisions: [
      "Built mobile-first Next.js storefronts tuned for low-latency page transitions and high mobile conversion readability.",
      "Configured custom domain routing, SSL hardening, and edge caching through Cloudflare DNS and Vercel deployments.",
      "Implemented automated checkout pipelines paired with scalable cloud database backends for order state and catalog management.",
      "Delivered complete brand ecosystems, including blaireaesthetics.shop and aifycycle.vercel.app, under rapid studio timelines.",
    ],
    executionHighlights: [
      "Live commercial deployments at blaireaesthetics.shop and aifycycle.vercel.app.",
      "Custom domain routing and edge security configured via Cloudflare DNS.",
      "Automated checkout flows backed by resilient cloud databases and transactional notifications.",
      "Responsive mobile-first UI architecture designed for frictionless browsing and purchasing.",
    ],
    businessImpact: [
      "Shipped production brand storefronts ready for immediate customer acquisition and scale.",
      "Eliminated bloated storefront scripts in favor of fast, maintainable React/Next.js codebases.",
      "Established repeatable commercial delivery playbooks within OXAKALABS.",
    ],
    stack: [
      "Next.js",
      "React",
      "TypeScript",
      "Tailwind CSS",
      "Cloudflare DNS",
      "Vercel",
      "Automated Checkout",
      "Cloud Databases",
    ],
    schematicType: "ecommerce",
    links: [
      { label: "blaireaesthetics.shop", href: "https://blaireaesthetics.shop" },
      { label: "aifycycle.vercel.app", href: "https://aifycycle.vercel.app" },
    ],
  },
];

export function getProjectBySlug(slug: string): ProjectDossier | undefined {
  return PROJECTS.find((p) => p.slug === slug);
}
