"use client"

// components/dashboard/Breadcrumb.tsx
// Auto-generates breadcrumbs from the current pathname.
// Renders nothing on /dashboard (root) — only shows on nested pages.

import Link from "next/link"
import { usePathname } from "next/navigation"

const LABELS: Record<string, string> = {
  dashboard:         "Dashboard",
  checkin:           "Check-In",
  waitlist:          "Waiting Room",
  appointments:      "Appointments",
  calendar:          "Calendar",
  patients:          "Patients",
  consultations:     "Consultations",
  prescriptions:     "Prescriptions",
  lab:               "Lab & Reports",
  billing:           "Billing",
  messages:          "Messages",
  analytics:         "Analytics",
  staff:             "Staff",
  doctors:           "Doctors",
  services:          "Services",
  "clinic-settings": "Clinic Settings",
  audit:             "Audit Logs",
  settings:          "Settings",
}

export default function Breadcrumb() {
  const pathname = usePathname()
  const segments = pathname.split("/").filter(Boolean)

  // No breadcrumb on dashboard root
  if (segments.length <= 1) return null

  const crumbs = segments.map((seg, i) => ({
    label:  LABELS[seg] ?? seg.replace(/-/g, " "),
    href:   "/" + segments.slice(0, i + 1).join("/"),
    isLast: i === segments.length - 1,
  }))

  return (
    <nav
      aria-label="Breadcrumb"
      style={{
        display:    "flex",
        alignItems: "center",
        gap:        4,
        fontSize:   ".72rem",
        color:      "#94a3b8",
        marginBottom: 16,
        flexWrap:   "wrap",
        fontFamily: "'DM Sans',sans-serif",
      }}
    >
      {crumbs.map((c, i) => (
        <span key={c.href} style={{ display: "flex", alignItems: "center", gap: 4 }}>
          {i > 0 && (
            <span style={{ color: "#cbd5e1", fontSize: ".75rem", lineHeight: 1 }}>›</span>
          )}
          {c.isLast ? (
            <span style={{ color: "#0a1628", fontWeight: 500 }}>{c.label}</span>
          ) : (
            <Link
              href={c.href}
              style={{ color: "#94a3b8", textDecoration: "none" }}
              onMouseEnter={e => (e.currentTarget.style.color = "#0d9488")}
              onMouseLeave={e => (e.currentTarget.style.color = "#94a3b8")}
            >
              {c.label}
            </Link>
          )}
        </span>
      ))}
    </nav>
  )
}
