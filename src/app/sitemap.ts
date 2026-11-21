import type { MetadataRoute } from "next";
import { PROJECTS } from "@/data/projects";

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl =
    process.env.NEXT_PUBLIC_SITE_URL || "https://akaolisaenwedo.com";

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${baseUrl}/`, lastModified: new Date(), priority: 1.0 },
    { url: `${baseUrl}/work`, lastModified: new Date(), priority: 0.9 },
    { url: `${baseUrl}/experience`, lastModified: new Date(), priority: 0.85 },
    { url: `${baseUrl}/contact`, lastModified: new Date(), priority: 0.85 },
  ];

  const caseStudyRoutes: MetadataRoute.Sitemap = PROJECTS.map((project) => ({
    url: `${baseUrl}/work/${project.slug}`,
    lastModified: new Date(),
    priority: 0.8,
  }));

  return [...staticRoutes, ...caseStudyRoutes];
}
