import type { Metadata } from "next";

const DEFAULT_SITE_URL = "https://www.oxakalabs.xyz";

export function resolveSiteUrl(rawUrl?: string): string {
  const candidate = (rawUrl || DEFAULT_SITE_URL).trim().replace(/\/+$/, "");

  try {
    const parsed = new URL(candidate);
    // Normalize bare apex domain oxakalabs.xyz to canonical www.oxakalabs.xyz
    // so social scrapers never hit a cross-host redirect chain.
    if (parsed.hostname === "oxakalabs.xyz") {
      parsed.hostname = "www.oxakalabs.xyz";
      parsed.protocol = "https:";
    }
    return parsed.origin;
  } catch {
    return DEFAULT_SITE_URL;
  }
}

export const SITE_URL = resolveSiteUrl(process.env.NEXT_PUBLIC_SITE_URL);
export const SITE_ROOT_URL = `${SITE_URL}/`;
export const OG_IMAGE_URL = `${SITE_URL}/og-image.png`;
export const OG_IMAGE_ALT =
  "Akaolisa Enwedo — Full-Stack Next.js, AI Agent & Quantitative Systems Engineer (OXAKALABS)";

/**
 * Preserves the trailing slash on the root canonical URL (`https://www.oxakalabs.xyz/`)
 * when Next.js resolves `openGraph.url` and `alternates.canonical` against `metadataBase`.
 */
export function getRootUrlWithTrailingSlash(): URL {
  const u = new URL(SITE_ROOT_URL);
  Object.defineProperty(u, "pathname", {
    get: () => "",
  });
  return u;
}

export function buildPageMetadata({
  title,
  description,
  path = "/",
}: {
  title: string;
  description: string;
  path?: string;
}): Metadata {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const fullUrl =
    normalizedPath === "/"
      ? getRootUrlWithTrailingSlash()
      : `${SITE_URL}${normalizedPath}`;

  return {
    title,
    description,
    alternates: {
      canonical: fullUrl,
    },
    openGraph: {
      type: "website",
      locale: "en_US",
      url: fullUrl,
      siteName: "Akaolisa Enwedo · OXAKALABS",
      title: `${title} | Akaolisa Enwedo`,
      description,
      images: [
        {
          url: OG_IMAGE_URL,
          secureUrl: OG_IMAGE_URL,
          type: "image/png",
          width: 1200,
          height: 630,
          alt: OG_IMAGE_ALT,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: `${title} | Akaolisa Enwedo`,
      description,
      images: [OG_IMAGE_URL],
    },
  };
}
