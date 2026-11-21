import type { MetadataRoute } from "next";
import { PROJECTS } from "@/data/projects";
import { SITE_URL } from "@/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${SITE_URL}/`, lastModified: new Date(), priority: 1.0 },
    { url: `${SITE_URL}/work`, lastModified: new Date(), priority: 0.9 },
    { url: `${SITE_URL}/experience`, lastModified: new Date(), priority: 0.85 },
    { url: `${SITE_URL}/contact`, lastModified: new Date(), priority: 0.85 },
  ];

  const caseStudyRoutes: MetadataRoute.Sitemap = PROJECTS.map((project) => ({
    url: `${SITE_URL}/work/${project.slug}`,
    lastModified: new Date(),
    priority: 0.8,
  }));

  return [...staticRoutes, ...caseStudyRoutes];
}
