import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

// Private areas that should never be crawled. "/admin" was already blocked; the customer portal and API are added.
const PRIVATE = ["/admin", "/api/", "/dashboard", "/account", "/statement", "/billing_accounts", "/edit_profile", "/rentals"];

// AI search and assistant crawlers. They are welcome (the site wants to be cited in AI answers); naming them
// explicitly makes that clear. Each group repeats the private list because a named group replaces the "*" group.
const AI_BOTS = [
  "GPTBot",
  "OAI-SearchBot",
  "ChatGPT-User",
  "ClaudeBot",
  "Claude-SearchBot",
  "Claude-User",
  "PerplexityBot",
  "Perplexity-User",
  "Google-Extended",
  "Applebot-Extended",
];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: "*", allow: "/", disallow: PRIVATE },
      ...AI_BOTS.map((userAgent) => ({ userAgent, allow: "/", disallow: PRIVATE })),
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
