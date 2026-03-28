// lib/metadata.ts
// Global metadata defaults — imported by app/layout.tsx.
// Every page that doesn't define its own generateMetadata() falls back to these.
// Pages that DO define generateMetadata() (services/[id], doctors) override them.

import type { Metadata } from "next"

const SITE_URL  = process.env.NEXT_PUBLIC_SITE_URL ?? "https://dentalcare.in"
const SITE_NAME = "DentalCare Smile Studio"
const TAGLINE   = "Mumbai's #1 Dental Clinic — Book Online"
const DESC      = "World-class dental care in Mumbai. Teeth whitening, implants, Invisalign, root canals and more. Board-certified specialists, AI-powered booking, same-day appointments. Book your free consultation today."

export const defaultMetadata: Metadata = {
  // ── Core ──────────────────────────────────────────────────────────────────
  metadataBase: new URL(SITE_URL),
  title: {
    default:  `${SITE_NAME} | ${TAGLINE}`,
    template: `%s | ${SITE_NAME}`,
  },
  description: DESC,
  keywords: [
    "dental clinic Mumbai",
    "dentist near me",
    "teeth whitening Mumbai",
    "dental implants Mumbai",
    "Invisalign Mumbai",
    "root canal treatment",
    "cosmetic dentistry",
    "best dentist Mumbai",
    "affordable dental care",
    "emergency dentist Mumbai",
  ],

  // ── Open Graph ────────────────────────────────────────────────────────────
  openGraph: {
    type:        "website",
    siteName:    SITE_NAME,
    locale:      "en_IN",
    url:         SITE_URL,
    title:       `${SITE_NAME} | ${TAGLINE}`,
    description: DESC,
    images: [
      {
        url:    `${SITE_URL}/og-image.jpg`,   // place a 1200×630 image here
        width:  1200,
        height: 630,
        alt:    `${SITE_NAME} — Premium Dental Care in Mumbai`,
      },
    ],
  },

  // ── Twitter / X ───────────────────────────────────────────────────────────
  twitter: {
    card:        "summary_large_image",
    site:        "@dentalcarein",
    creator:     "@dentalcarein",
    title:       `${SITE_NAME} | ${TAGLINE}`,
    description: DESC,
    images:      [`${SITE_URL}/og-image.jpg`],
  },

  // ── Icons ─────────────────────────────────────────────────────────────────
  icons: {
    icon:        "/favicon.ico",
    shortcut:    "/favicon-16x16.png",
    apple:       "/apple-touch-icon.png",
  },

  // ── Manifest ──────────────────────────────────────────────────────────────
  manifest: "/site.webmanifest",

  // ── Verification ─────────────────────────────────────────────────────────
  // Add your actual codes after Google Search Console & Bing verification
  verification: {
    google: "REPLACE_WITH_GOOGLE_VERIFICATION_CODE",
    // bing:   "REPLACE_WITH_BING_VERIFICATION_CODE",
  },

  // ── Robots ────────────────────────────────────────────────────────────────
  robots: {
    index:          true,
    follow:         true,
    googleBot: {
      index:              true,
      follow:             true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet":       -1,
    },
  },

  // ── Canonical + alternate ─────────────────────────────────────────────────
  alternates: {
    canonical: SITE_URL,
    languages: {
      "en-IN": SITE_URL,
    },
  },
}
