import fs from "node:fs";
import path from "node:path";
import { PROFILE, type TrackId } from "@/data/profile";
import { PROJECTS, type ProjectDossier } from "@/data/projects";

export type InquiryStatus = "new" | "reviewing" | "replied" | "archived";

export interface StudioInquiry {
  id: string;
  name: string;
  email: string;
  track: string;
  scope: string;
  message: string;
  status: InquiryStatus;
  deliveryMode: "resend" | "fallback" | "sample";
  notes: string;
  createdAt: string;
}

export interface StudioProfileSettings {
  displayName: string;
  headlineRole: string;
  subRole: string;
  availabilityText: string;
  locationLabel: string;
  utcOffsetLabel: string;
  email: string;
  whatsappDisplay: string;
  studioPrimaryUrl: string;
  bioShort: string;
  empiricalEdge: string;
}

export interface StudioAdminState {
  profile: StudioProfileSettings;
  projects: ProjectDossier[];
  inquiries: StudioInquiry[];
  updatedAt: string;
  storageMode: "filesystem" | "memory";
}

const STATE_FILE = path.join(process.cwd(), ".studio-admin-state.json");

function defaultProfileSettings(): StudioProfileSettings {
  return {
    displayName: PROFILE.displayName,
    headlineRole: PROFILE.headlineRole,
    subRole: PROFILE.subRole,
    availabilityText: PROFILE.availabilityText,
    locationLabel: PROFILE.locationLabel,
    utcOffsetLabel: PROFILE.utcOffsetLabel,
    email: PROFILE.email,
    whatsappDisplay: PROFILE.whatsappDisplay,
    studioPrimaryUrl: PROFILE.studio.primaryUrl,
    bioShort: PROFILE.bioShort,
    empiricalEdge: PROFILE.empiricalEdge,
  };
}

function defaultState(): StudioAdminState {
  return {
    profile: defaultProfileSettings(),
    projects: PROJECTS.map((p) => ({
      ...p,
      tracks: [...p.tracks],
      architectureDecisions: [...p.architectureDecisions],
      executionHighlights: [...p.executionHighlights],
      businessImpact: [...p.businessImpact],
      stack: [...p.stack],
      links: p.links.map((l) => ({ ...l })),
    })),
    inquiries: [],
    updatedAt: new Date().toISOString(),
    storageMode: "memory",
  };
}

declare global {
  var __OXAKA_STUDIO_STATE__: StudioAdminState | undefined;
}

function loadInitialState(): StudioAdminState {
  try {
    if (fs.existsSync(STATE_FILE)) {
      const raw = fs.readFileSync(STATE_FILE, "utf8");
      const parsed = JSON.parse(raw) as Partial<StudioAdminState>;
      const base = defaultState();
      return {
        profile: { ...base.profile, ...(parsed.profile ?? {}) },
        projects:
          Array.isArray(parsed.projects) && parsed.projects.length > 0
            ? parsed.projects
            : base.projects,
        inquiries: Array.isArray(parsed.inquiries) ? parsed.inquiries : [],
        updatedAt: parsed.updatedAt ?? base.updatedAt,
        storageMode: "filesystem",
      };
    }
  } catch {
    // Fall back to default state on read failure
  }

  return defaultState();
}

function persistState(state: StudioAdminState): StudioAdminState {
  const next: StudioAdminState = {
    ...state,
    updatedAt: new Date().toISOString(),
  };

  try {
    fs.writeFileSync(
      STATE_FILE,
      JSON.stringify({ ...next, storageMode: "filesystem" }, null, 2),
      "utf8"
    );
    next.storageMode = "filesystem";
  } catch {
    next.storageMode = "memory";
  }

  globalThis.__OXAKA_STUDIO_STATE__ = next;
  return next;
}

export function getStudioState(): StudioAdminState {
  if (!globalThis.__OXAKA_STUDIO_STATE__) {
    globalThis.__OXAKA_STUDIO_STATE__ = loadInitialState();
  }
  return globalThis.__OXAKA_STUDIO_STATE__;
}

export function updateStudioProfile(
  patch: Partial<StudioProfileSettings>
): StudioAdminState {
  const current = getStudioState();
  return persistState({
    ...current,
    profile: {
      ...current.profile,
      ...patch,
    },
  });
}

export function upsertStudioProject(
  project: Partial<ProjectDossier> & { slug: string }
): StudioAdminState {
  const current = getStudioState();
  const idx = current.projects.findIndex((p) => p.slug === project.slug);
  const nextProjects = [...current.projects];

  if (idx >= 0) {
    nextProjects[idx] = {
      ...nextProjects[idx],
      ...project,
    };
  } else {
    const newIndexCode = `SYS-${String(nextProjects.length + 1).padStart(2, "0")}`;
    const primaryTrack: TrackId = project.primaryTrack ?? "full-stack-saas";
    nextProjects.push({
      slug: project.slug,
      indexCode: project.indexCode ?? newIndexCode,
      title: project.title ?? "Untitled system",
      subtitle: project.subtitle ?? "Production engineering dossier",
      clientDomain: project.clientDomain ?? "OXAKALABS Client",
      statusBadge: project.statusBadge ?? "Draft",
      isNda: Boolean(project.isNda),
      year: project.year ?? String(new Date().getFullYear()),
      tracks: project.tracks?.length ? project.tracks : [primaryTrack],
      primaryTrack,
      featured: Boolean(project.featured),
      summary: project.summary ?? "",
      challenge: project.challenge ?? "",
      architectureDecisions: project.architectureDecisions ?? [],
      executionHighlights: project.executionHighlights ?? [],
      businessImpact: project.businessImpact ?? [],
      stack: project.stack ?? [],
      schematicType: project.schematicType ?? "koridor",
      links: project.links ?? [],
    });
  }

  return persistState({
    ...current,
    projects: nextProjects,
  });
}

export function deleteStudioProject(slug: string): StudioAdminState {
  const current = getStudioState();
  return persistState({
    ...current,
    projects: current.projects.filter((p) => p.slug !== slug),
  });
}

export function addStudioInquiry(input: {
  name: string;
  email: string;
  track: string;
  scope: string;
  message: string;
  deliveryMode: "resend" | "fallback" | "sample";
}): StudioInquiry {
  const current = getStudioState();
  const entry: StudioInquiry = {
    id: `inq-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    name: input.name,
    email: input.email,
    track: input.track,
    scope: input.scope,
    message: input.message,
    status: "new",
    deliveryMode: input.deliveryMode,
    notes: "",
    createdAt: new Date().toISOString(),
  };

  persistState({
    ...current,
    inquiries: [entry, ...current.inquiries].slice(0, 100),
  });

  return entry;
}

export function updateStudioInquiry(
  id: string,
  patch: Partial<Pick<StudioInquiry, "status" | "notes">>
): StudioAdminState {
  const current = getStudioState();
  return persistState({
    ...current,
    inquiries: current.inquiries.map((inq) =>
      inq.id === id ? { ...inq, ...patch } : inq
    ),
  });
}

export function deleteStudioInquiry(id: string): StudioAdminState {
  const current = getStudioState();
  return persistState({
    ...current,
    inquiries: current.inquiries.filter((inq) => inq.id !== id),
  });
}

export function resetStudioStateToDefaults(): StudioAdminState {
  const fresh = defaultState();
  return persistState(fresh);
}
