// app/layout.tsx
// Root shell — metadata only. No Navbar or Footer here.
// Public pages get Navbar/Footer via app/(public)/layout.tsx.
// Dashboard gets its own shell via app/(dashboard)/layout.tsx.

import type { Metadata } from "next"
import { defaultMetadata } from "@/lib/metadata"

// ── Export metadata for every page that doesn't define its own ───────────────
export const metadata: Metadata = defaultMetadata

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}