// app/robots.ts
// Next.js App Router robots configuration.
// Allows all crawlers on public pages.
// Blocks /dashboard (internal tool — should never be indexed).
//
// Verify at: https://yoursite.com/robots.txt

import type { MetadataRoute } from "next"

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://dentalcare.in"

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        // All crawlers — allow public site
        userAgent:   "*",
        allow:       ["/", "/services", "/services/", "/doctors", "/booking"],
        disallow:    [
          "/dashboard",      // internal SaaS dashboard
          "/dashboard/",     // all dashboard sub-routes
          "/api/",           // backend API routes
          "/login",          // auth pages — no SEO value
        ],
      },
      {
        // GPTBot (OpenAI) — block to protect clinic patient data
        userAgent: "GPTBot",
        disallow:  ["/"],
      },
      {
        // CCBot (Common Crawl) — block AI training scrapers
        userAgent: "CCBot",
        disallow:  ["/"],
      },
    ],
    sitemap: `${BASE_URL}/sitemap.xml`,
    host:    BASE_URL,
  }
}
