export type ExperienceCategory = "software-ai" | "clinical-biomedical";

export interface ExperienceItem {
  id: string;
  organization: string;
  role: string;
  location: string;
  period: string;
  category: ExperienceCategory;
  highlightBadge?: string;
  bullets: string[];
  links?: { label: string; href: string }[];
}

export interface EducationRecord {
  degree: string;
  specialization: string;
  institution: string;
  thesisTitle: string;
  thesisYear: string;
  seminarTitle: string;
  seminarYear: string;
}

export interface HackathonProgram {
  name: string;
  organizer: string;
  year: string;
  focus: string;
}

export interface LanguageRecord {
  name: string;
  proficiency: string;
  notes?: string;
}

export const EXPERIENCE_ITEMS: ExperienceItem[] = [
  {
    id: "oxakalabs",
    organization: "OXAKALABS",
    role: "Founder, Principal Full-Stack, DevOps, AI & Quantitative Engineer",
    location: "Remote",
    period: "2022-Present",
    category: "software-ai",
    highlightBadge: "Studio & DevOps",
    bullets: [
      "Lead end-to-end product architecture, UI/UX engineering, database modeling, and cloud deployment for international SaaS, FinTech, retail, and AI automation clients.",
      "Engineer resilient DevOps and cloud infrastructure: Docker containerization, self-hosted Linux VPS and Coolify clusters, Google Cloud Run services, GitHub Actions CI/CD release gates, Cloudflare DNS/TLS hardening, and zero-downtime production rollouts.",
      "Architect and ship multi-tenant Next.js App Router platforms, multi-agent LLM governance systems, algorithmic trading tooling, and commercial e-commerce builds.",
    ],
    links: [
      { label: "oxakalabs.xyz", href: "https://oxakalabs.xyz" },
      { label: "ggravitator.xyz", href: "https://ggravitator.xyz" },
      { label: "oxakalabs.vercel.app", href: "https://oxakalabs.vercel.app" },
    ],
  },
  {
    id: "outlier-oneforma",
    organization: "Outlier.ai & OneForma",
    role: "Freelance AI Trainer & RLHF Code/Reasoning Specialist",
    location: "Remote",
    period: "2026-Present",
    category: "software-ai",
    highlightBadge: "Frontier LLM Evaluation",
    bullets: [
      "Evaluate, debug, and benchmark frontier LLM outputs across TypeScript/Python software engineering, quantitative mathematics, and clinical reasoning using strict RLHF quality rubrics.",
    ],
  },
  {
    id: "fmc-umuahia",
    organization: "Federal Medical Centre (FMC) Umuahia",
    role: "Medical Lab Scientist Intern & Lead Intern Coordinator",
    location: "Umuahia, Nigeria",
    period: "Feb 2026-Present",
    category: "clinical-biomedical",
    highlightBadge: "250+ Trainees Directed",
    bullets: [
      "Leadership & Coordination: Direct bench schedules, clinical onboarding, and workflow coordination for 100+ Medical Laboratory Science interns and supervise 150+ university students during clinical laboratory postings.",
      "Diagnostics & Research: Execute diagnostic assays and IQC/EQA calibration across Clinical Chemistry, Hematology, Microbiology, Parasitology, and Blood Banking; deliver hospital-wide seminars on PSA Screening and Clinical Toxicology (2026).",
    ],
  },
  {
    id: "nauth-nnewi",
    organization: "Nnamdi Azikiwe University Teaching Hospital (NAUTH)",
    role: "Clinical Laboratory Trainee (SIWES & Postings)",
    location: "Nnewi, Nigeria",
    period: "2023-2024",
    category: "clinical-biomedical",
    bullets: [
      "Conducted biochemical, hematological, and microbiological assays alongside strict clinical data validation protocols.",
    ],
  },
  {
    id: "may-and-baker",
    organization: "May & Baker Nigeria Plc",
    role: "Sales & Medical Representative",
    location: "Lagos, Nigeria",
    period: "2021-2022",
    category: "clinical-biomedical",
    bullets: [
      "Drove territory B2B pharmaceutical sales, technical medical product detailing, and hospital/pharmacy client acquisition.",
    ],
  },
  {
    id: "fhi-360",
    organization: "FHI 360 (Family Health International)",
    role: "Public Health Field Volunteer",
    location: "Uyo, Akwa Ibom, Nigeria",
    period: "2020",
    category: "clinical-biomedical",
    bullets: [
      "Supported community diagnostic screening, epidemiological field data collection, and public health outreach campaigns.",
    ],
  },
];

export const EDUCATION: EducationRecord = {
  degree: "Bachelor of Medical Laboratory Science (B.MLS)",
  specialization: "Clinical Chemistry Specialization",
  institution: "Nnamdi Azikiwe University, Awka",
  thesisTitle: "Evaluation of ATP & AMP Levels in Plasma and Serum Blood Samples",
  thesisYear: "2024",
  seminarTitle: "Gaucher's Disease",
  seminarYear: "2024",
};

export const HACKATHONS_AND_PROGRAMS: HackathonProgram[] = [
  {
    name: "All Things Agentic Hackathon",
    organizer: "Google Cloud & Devpost",
    year: "2026",
    focus: "Shipped Fortress Fleet AI (Cloud Run, Gemini, Gemma 2, Supabase pgvector)",
  },
  {
    name: "Google Stitch Loop Early Access",
    organizer: "Google",
    year: "2026",
    focus: "Selected cohort member: built Stitch Retail Operations OS",
  },
  {
    name: "Meta VR Start Developer Competition",
    organizer: "Meta",
    year: "2026",
    focus: "Spatial & interactive developer competition cohort",
  },
  {
    name: "Build With AI & Agentic Cinema",
    organizer: "Devpost",
    year: "2026",
    focus: "Multimodal & autonomous agentic media applications",
  },
  {
    name: "Cerebral Valley & DoraHacks",
    organizer: "Cerebral Valley · DoraHacks",
    year: "2026",
    focus: "Frontier AI & Web3 builder hackathons",
  },
];

export const LANGUAGES: LanguageRecord[] = [
  {
    name: "English",
    proficiency: "Native / Bilingual",
  },
  {
    name: "Igbo",
    proficiency: "Native",
  },
  {
    name: "Sign Language",
    proficiency: "Conversational",
    notes: "American Sign Language (ASL) & Nigerian Sign Language (NSL)",
  },
];
