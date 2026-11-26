import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/admin", "/api/admin"],
      },
      {
        userAgent: [
          "WhatsApp",
          "facebookexternalhit",
          "Facebot",
          "Twitterbot",
          "LinkedInBot",
          "Slackbot-LinkExpanding",
          "TelegramBot",
          "Discordbot",
          "Applebot",
        ],
        allow: "/",
        disallow: ["/admin", "/api/admin"],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
