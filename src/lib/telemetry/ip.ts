import type {
  DeviceInfo,
  DeviceType,
  GeoInfo,
  TrafficClass,
} from "./types";

const COUNTRY_NAMES: Record<string, string> = {
  US: "United States",
  GB: "United Kingdom",
  CA: "Canada",
  NG: "Nigeria",
  DE: "Germany",
  FR: "France",
  NL: "Netherlands",
  IN: "India",
  SG: "Singapore",
  AU: "Australia",
  AE: "United Arab Emirates",
  IE: "Ireland",
  CH: "Switzerland",
  SE: "Sweden",
  NO: "Norway",
  DK: "Denmark",
  FI: "Finland",
  ES: "Spain",
  IT: "Italy",
  PT: "Portugal",
  PL: "Poland",
  BR: "Brazil",
  MX: "Mexico",
  ZA: "South Africa",
  KE: "Kenya",
  GH: "Ghana",
  EG: "Egypt",
  JP: "Japan",
  KR: "South Korea",
  CN: "China",
  HK: "Hong Kong",
  TW: "Taiwan",
  IL: "Israel",
  TR: "Turkey",
  SA: "Saudi Arabia",
  QA: "Qatar",
  NZ: "New Zealand",
  AR: "Argentina",
  CO: "Colombia",
  CL: "Chile",
  AT: "Austria",
  BE: "Belgium",
  CZ: "Czechia",
  RO: "Romania",
  UA: "Ukraine",
  PH: "Philippines",
  ID: "Indonesia",
  MY: "Malaysia",
  VN: "Vietnam",
  TH: "Thailand",
  PK: "Pakistan",
  LOCAL: "Local Network",
  XX: "Unknown",
};

export function getCountryName(code?: string | null): string {
  if (!code) return "Unknown";
  const upper = code.trim().toUpperCase();
  if (COUNTRY_NAMES[upper]) return COUNTRY_NAMES[upper];
  try {
    if (upper.length === 2 && typeof Intl !== "undefined" && Intl.DisplayNames) {
      const display = new Intl.DisplayNames(["en"], { type: "region" });
      return display.of(upper) || upper;
    }
  } catch {
    // Ignore Intl display fallback issues
  }
  return upper;
}

export function normalizeIp(raw?: string | null): string {
  if (!raw) return "127.0.0.1";
  let ip = raw.trim();
  if (!ip) return "127.0.0.1";

  // Remove quotes or IPv6 brackets with optional port
  ip = ip.replace(/^"+|"+$/g, "");
  if (ip.startsWith("[")) {
    const endBracket = ip.indexOf("]");
    if (endBracket !== -1) {
      ip = ip.slice(1, endBracket);
    }
  } else if (/^\d{1,3}(\.\d{1,3}){3}:\d+$/.test(ip)) {
    ip = ip.split(":")[0];
  }

  // Strip IPv4-mapped IPv6 prefix ::ffff:
  if (ip.toLowerCase().startsWith("::ffff:")) {
    ip = ip.slice(7);
  }

  // Strip zone index (e.g. fe80::1%eth0)
  const zoneIdx = ip.indexOf("%");
  if (zoneIdx !== -1) {
    ip = ip.slice(0, zoneIdx);
  }

  if (ip === "::1" || ip === "0:0:0:0:0:0:0:1") {
    return "127.0.0.1";
  }

  return ip.slice(0, 64) || "127.0.0.1";
}

export function isPrivateIp(ip: string): boolean {
  const normalized = normalizeIp(ip).toLowerCase();
  if (
    normalized === "127.0.0.1" ||
    normalized === "::1" ||
    normalized === "localhost" ||
    normalized === "0.0.0.0" ||
    normalized === "unknown"
  ) {
    return true;
  }
  if (normalized.startsWith("10.")) return true;
  if (normalized.startsWith("192.168.")) return true;
  if (normalized.startsWith("169.254.")) return true;
  if (/^172\.(1[6-9]|2\d|3[0-1])\./.test(normalized)) return true;
  if (/^100\.(6[4-9]|[7-9]\d|1[0-1]\d|12[0-7])\./.test(normalized)) return true;
  if (normalized.startsWith("fc") || normalized.startsWith("fd") || normalized.startsWith("fe80:")) {
    return true;
  }
  return false;
}

/**
 * Extracts the real visitor IP across Cloudflare, Vercel Edge, Nginx/Coolify reverse proxies,
 * Docker bridges, and local development servers.
 */
export function extractClientIp(headers: Headers): string {
  const directCandidates = [
    headers.get("cf-connecting-ip"),
    headers.get("true-client-ip"),
    headers.get("x-real-ip"),
    headers.get("x-vercel-forwarded-for"),
    headers.get("fastly-client-ip"),
    headers.get("fly-client-ip"),
  ];

  for (const candidate of directCandidates) {
    if (!candidate) continue;
    const first = normalizeIp(candidate.split(",")[0]);
    if (first && first !== "unknown") {
      return first;
    }
  }

  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) {
    const chain = forwarded
      .split(",")
      .map((part) => normalizeIp(part))
      .filter((part) => part.length > 0 && part !== "unknown");

    // Prefer the first public IP in the proxy chain
    const firstPublic = chain.find((addr) => !isPrivateIp(addr));
    if (firstPublic) return firstPublic;
    if (chain[0]) return chain[0];
  }

  return "127.0.0.1";
}

function safeDecodeHeader(val?: string | null): string {
  if (!val) return "";
  try {
    return decodeURIComponent(val).trim();
  } catch {
    return val.trim();
  }
}

export function extractEdgeGeoFromHeaders(
  ip: string,
  headers: Headers
): GeoInfo | null {
  // Vercel Edge geo headers
  const vercelCountry = headers.get("x-vercel-ip-country");
  if (vercelCountry && vercelCountry !== "XX") {
    const country = vercelCountry.trim().toUpperCase();
    const city = safeDecodeHeader(headers.get("x-vercel-ip-city")) || "Unknown City";
    const region =
      safeDecodeHeader(headers.get("x-vercel-ip-country-region")) || "";
    const lat = Number.parseFloat(headers.get("x-vercel-ip-latitude") ?? "");
    const lon = Number.parseFloat(headers.get("x-vercel-ip-longitude") ?? "");
    return {
      country,
      countryName: getCountryName(country),
      region,
      city,
      latitude: Number.isFinite(lat) ? lat : undefined,
      longitude: Number.isFinite(lon) ? lon : undefined,
      timezone: headers.get("x-vercel-ip-timezone") || undefined,
      asn: headers.get("x-vercel-ip-as-number") || undefined,
      isPrivate: false,
      source: "vercel-edge",
    };
  }

  // Cloudflare Edge geo headers
  const cfCountry = headers.get("cf-ipcountry");
  if (cfCountry && cfCountry !== "XX" && cfCountry !== "T1") {
    const country = cfCountry.trim().toUpperCase();
    const city = safeDecodeHeader(headers.get("cf-ipcity")) || "Unknown City";
    const region = safeDecodeHeader(headers.get("cf-region")) || "";
    const lat = Number.parseFloat(headers.get("cf-iplatitude") ?? "");
    const lon = Number.parseFloat(headers.get("cf-iplongitude") ?? "");
    return {
      country,
      countryName: getCountryName(country),
      region,
      city,
      latitude: Number.isFinite(lat) ? lat : undefined,
      longitude: Number.isFinite(lon) ? lon : undefined,
      timezone: headers.get("cf-timezone") || undefined,
      isPrivate: false,
      source: "cloudflare-edge",
    };
  }

  if (isPrivateIp(ip)) {
    return {
      country: "LOCAL",
      countryName: "Local / Private Network",
      region: "LAN",
      city: ip === "127.0.0.1" ? "Localhost" : "Private Subnet",
      isPrivate: true,
      source: "private",
    };
  }

  return null;
}

export function buildUnknownGeo(ip: string): GeoInfo {
  if (isPrivateIp(ip)) {
    return {
      country: "LOCAL",
      countryName: "Local / Private Network",
      region: "LAN",
      city: ip === "127.0.0.1" ? "Localhost" : "Private Subnet",
      isPrivate: true,
      source: "private",
    };
  }
  return {
    country: "XX",
    countryName: "Unknown",
    region: "",
    city: "Unknown",
    isPrivate: false,
    source: "unknown",
  };
}

interface IpWhoisResponse {
  success?: boolean;
  country_code?: string;
  country?: string;
  region?: string;
  city?: string;
  latitude?: number;
  longitude?: number;
  timezone?: { id?: string };
  connection?: { asn?: number; org?: string; isp?: string };
}

/**
 * Fallback geo-enrichment for self-hosted VPS/Coolify/Docker environments without edge geo headers.
 * Strict 1.4s timeout so telemetry ingestion never stalls.
 */
export async function lookupPublicIpGeo(ip: string): Promise<GeoInfo | null> {
  if (isPrivateIp(ip)) return buildUnknownGeo(ip);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 1400);

  try {
    const res = await fetch(`https://ipwho.is/${encodeURIComponent(ip)}`, {
      signal: controller.signal,
      headers: { Accept: "application/json" },
      cache: "no-store",
    });
    clearTimeout(timeout);
    if (!res.ok) return null;

    const data = (await res.json()) as IpWhoisResponse;
    if (!data.success || !data.country_code) return null;

    const country = data.country_code.toUpperCase();
    return {
      country,
      countryName: data.country || getCountryName(country),
      region: data.region || "",
      city: data.city || "Unknown City",
      latitude: typeof data.latitude === "number" ? data.latitude : undefined,
      longitude: typeof data.longitude === "number" ? data.longitude : undefined,
      timezone: data.timezone?.id || undefined,
      asn: data.connection?.asn ? `AS${data.connection.asn}` : undefined,
      org: data.connection?.org || data.connection?.isp || undefined,
      isPrivate: false,
      source: "geo-api",
    };
  } catch {
    clearTimeout(timeout);
    return null;
  }
}

/* -------------------------------------------------------------------------- */
/*  User-Agent, Device, and Bot / Crawler / Previewer Classification          */
/* -------------------------------------------------------------------------- */

interface BotRule {
  pattern: RegExp;
  name: string;
  trafficClass: TrafficClass;
}

const BOT_RULES: BotRule[] = [
  { pattern: /googlebot|google-inspectiontool|adsbot-google/i, name: "Googlebot", trafficClass: "crawler" },
  { pattern: /bingbot|msnbot|adidxbot/i, name: "Bingbot", trafficClass: "crawler" },
  { pattern: /gptbot|chatgpt-user|oai-searchbot/i, name: "OpenAI / GPTBot", trafficClass: "crawler" },
  { pattern: /claudebot|anthropic-ai|claude-web/i, name: "Anthropic ClaudeBot", trafficClass: "crawler" },
  { pattern: /perplexitybot/i, name: "PerplexityBot", trafficClass: "crawler" },
  { pattern: /applebot/i, name: "Applebot", trafficClass: "crawler" },
  { pattern: /duckduckbot/i, name: "DuckDuckBot", trafficClass: "crawler" },
  { pattern: /yandexbot/i, name: "YandexBot", trafficClass: "crawler" },
  { pattern: /baiduspider/i, name: "Baiduspider", trafficClass: "crawler" },
  { pattern: /semrushbot|ahrefsbot|mj12bot|dotbot|petalbot/i, name: "SEO Crawler", trafficClass: "crawler" },
  { pattern: /whatsapp/i, name: "WhatsApp Preview", trafficClass: "preview_scraper" },
  { pattern: /linkedinbot/i, name: "LinkedIn Preview", trafficClass: "preview_scraper" },
  { pattern: /twitterbot/i, name: "X / Twitter Preview", trafficClass: "preview_scraper" },
  { pattern: /facebookexternalhit|facebot/i, name: "Meta Link Preview", trafficClass: "preview_scraper" },
  { pattern: /slackbot/i, name: "Slack Preview", trafficClass: "preview_scraper" },
  { pattern: /telegrambot/i, name: "Telegram Preview", trafficClass: "preview_scraper" },
  { pattern: /discordbot/i, name: "Discord Preview", trafficClass: "preview_scraper" },
  { pattern: /headlesschrome|playwright|puppeteer|selenium|phantomjs/i, name: "Headless Automation", trafficClass: "automation" },
  { pattern: /curl\/|wget\/|httpie|python-requests|python-urllib|axios\/|go-http-client|node-fetch|undici/i, name: "HTTP Client / Script", trafficClass: "automation" },
  { pattern: /uptimerobot|betterstack|pingdom|statuscake|datadog|newrelic|vercel-screenshot/i, name: "Uptime Monitor", trafficClass: "bot" },
  { pattern: /bot|spider|crawl|slurp|scraper/i, name: "Automated Bot", trafficClass: "bot" },
];

export function parseUserAgent(rawUa?: string | null): DeviceInfo {
  const userAgent = (rawUa ?? "").trim().slice(0, 500);
  if (!userAgent) {
    return {
      browser: "Unknown",
      browserVersion: "",
      os: "Unknown",
      osVersion: "",
      deviceType: "unknown",
      trafficClass: "automation",
      botName: "Missing User-Agent",
      userAgent: "",
    };
  }

  for (const rule of BOT_RULES) {
    if (rule.pattern.test(userAgent)) {
      return {
        browser: rule.name,
        browserVersion: "",
        os: "Automated",
        osVersion: "",
        deviceType: "bot",
        trafficClass: rule.trafficClass,
        botName: rule.name,
        userAgent,
      };
    }
  }

  // Browser detection
  let browser = "Unknown";
  let browserVersion = "";

  const edgeMatch = userAgent.match(/Edg(?:A|iOS)?\/([\d.]+)/);
  const operaMatch = userAgent.match(/(?:OPR|Opera)\/([\d.]+)/);
  const samsungMatch = userAgent.match(/SamsungBrowser\/([\d.]+)/);
  const firefoxMatch = userAgent.match(/(?:Firefox|FxiOS)\/([\d.]+)/);
  const chromeMatch = userAgent.match(/(?:Chrome|CriOS)\/([\d.]+)/);
  const safariMatch = userAgent.match(/Version\/([\d.]+).*Safari/);

  if (edgeMatch) {
    browser = "Edge";
    browserVersion = edgeMatch[1];
  } else if (operaMatch) {
    browser = "Opera";
    browserVersion = operaMatch[1];
  } else if (samsungMatch) {
    browser = "Samsung Internet";
    browserVersion = samsungMatch[1];
  } else if (firefoxMatch) {
    browser = "Firefox";
    browserVersion = firefoxMatch[1];
  } else if (chromeMatch) {
    browser = /Brave/i.test(userAgent) ? "Brave" : "Chrome";
    browserVersion = chromeMatch[1];
  } else if (safariMatch || /Safari/i.test(userAgent)) {
    browser = "Safari";
    browserVersion = safariMatch?.[1] ?? "";
  }

  // OS detection
  let os = "Unknown";
  let osVersion = "";

  if (/iPhone|iPad|iPod/i.test(userAgent)) {
    os = /iPad/i.test(userAgent) ? "iPadOS" : "iOS";
    const m = userAgent.match(/OS (\d+[_\d]*)/);
    osVersion = m ? m[1].replace(/_/g, ".") : "";
  } else if (/Android/i.test(userAgent)) {
    os = "Android";
    const m = userAgent.match(/Android ([\d.]+)/);
    osVersion = m ? m[1] : "";
  } else if (/Windows NT/i.test(userAgent)) {
    os = "Windows";
    const m = userAgent.match(/Windows NT ([\d.]+)/);
    osVersion = m?.[1] === "10.0" ? "10/11" : m?.[1] ?? "";
  } else if (/Mac OS X/i.test(userAgent)) {
    os = "macOS";
    const m = userAgent.match(/Mac OS X (\d+[_\d]*)/);
    osVersion = m ? m[1].replace(/_/g, ".") : "";
  } else if (/CrOS/i.test(userAgent)) {
    os = "ChromeOS";
  } else if (/Linux/i.test(userAgent)) {
    os = "Linux";
  }

  // Device class
  let deviceType: DeviceType = "desktop";
  if (/iPad|Tablet|PlayBook|Silk/i.test(userAgent) || (/Android/i.test(userAgent) && !/Mobile/i.test(userAgent))) {
    deviceType = "tablet";
  } else if (/Mobi|iPhone|iPod|Android.*Mobile|Windows Phone/i.test(userAgent)) {
    deviceType = "mobile";
  }

  return {
    browser,
    browserVersion: browserVersion.split(".").slice(0, 2).join("."),
    os,
    osVersion: osVersion.split(".").slice(0, 2).join("."),
    deviceType,
    trafficClass: "human",
    userAgent,
  };
}

export function normalizeReferrerDomain(
  rawReferrer?: string | null,
  siteHost?: string | null
): string {
  if (!rawReferrer || !rawReferrer.trim()) return "Direct";
  try {
    const parsed = new URL(rawReferrer.trim());
    const host = parsed.hostname.toLowerCase().replace(/^www\./, "");
    const ownHost = (siteHost ?? "").toLowerCase().replace(/^www\./, "");

    if (
      host === "oxakalabs.xyz" ||
      host === "localhost" ||
      host === "127.0.0.1" ||
      (ownHost && host === ownHost)
    ) {
      return "Direct / Internal";
    }
    if (host.includes("github.com")) return "GitHub";
    if (host.includes("linkedin.com") || host === "lnkd.in") return "LinkedIn";
    if (host === "t.co" || host.includes("twitter.com") || host === "x.com") return "X / Twitter";
    if (host.includes("google.")) return "Google Search";
    if (host.includes("bing.com")) return "Bing Search";
    if (host.includes("duckduckgo.com")) return "DuckDuckGo";
    if (host.includes("whatsapp.com") || host === "wa.me") return "WhatsApp";
    if (host.includes("vercel.app") || host.includes("vercel.com")) return "Vercel";
    if (host.includes("ggravitator.xyz")) return "G-Gravitator";
    if (host.includes("reddit.com")) return "Reddit";
    if (host.includes("news.ycombinator.com")) return "Hacker News";
    return host;
  } catch {
    return "Direct";
  }
}

export function isSuspiciousProbePath(path: string): boolean {
  const lower = path.toLowerCase();
  return (
    lower.includes(".env") ||
    lower.includes(".git") ||
    lower.includes("wp-admin") ||
    lower.includes("wp-login") ||
    lower.includes("xmlrpc.php") ||
    lower.includes("phpmyadmin") ||
    lower.includes(".php") ||
    lower.includes("/etc/passwd") ||
    lower.includes("actuator") ||
    lower.includes("shell") ||
    lower.includes("eval(")
  );
}
