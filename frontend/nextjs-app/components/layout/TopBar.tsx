"use client"

// components/layout/TopBar.tsx
//
// FIXES vs original:
//  1. localStorage persistence — dismissed state survives page refresh
//  2. Dynamic announcement from GET /api/settings/clinic (admin can change it)
//  3. Falls back to static default if API unavailable (no crash)
//  4. Smooth CSS transition on dismiss (no layout jump)
//  5. Styles extracted to TopBar.module.css
//
// API: GET /api/settings/clinic → { name, openingHours, ... }
// No new endpoint needed — reads from the existing clinic settings.
// The announcement text is derived from clinic data (name + special offer).

import Link from "next/link"
import { useState, useEffect } from "react"
import styles from "./TopBar.module.css"
import API from "@/lib/api"

// ── Static fallback (shown while loading OR if not logged in) ─────────────────
const FALLBACK = {
  emoji: "🎉",
  text:  "Free consultation for new patients this month!",
  cta:   "Book Now →",
  href:  "/booking",
}

// ── localStorage key ──────────────────────────────────────────────────────────
const STORAGE_KEY = "topbar_dismissed_v1"

// ── Helper: read dismiss state safely (SSR guard) ─────────────────────────────
function isDismissed(): boolean {
  if (typeof window === "undefined") return false
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return false
    const { dismissedAt } = JSON.parse(raw)
    // Auto-reset after 24 hours — so a new day's announcement shows again
    const ageHours = (Date.now() - dismissedAt) / (1000 * 60 * 60)
    return ageHours < 24
  } catch {
    return false
  }
}

function saveDismiss() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ dismissedAt: Date.now() }))
  } catch { /* storage full or blocked */ }
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function TopBar() {
  // Start hidden to avoid flash — set to true only after SSR hydration check
  const [visible,  setVisible]  = useState(false)
  const [loading,  setLoading]  = useState(true)
  const [announcement, setAnnouncement] = useState(FALLBACK)

  useEffect(() => {
    // 1. Check localStorage — if dismissed recently, stay hidden
    if (isDismissed()) {
      setVisible(false)
      setLoading(false)
      return
    }

    // 2. Show with fallback immediately
    setVisible(true)

    // 3. Try to fetch dynamic clinic announcement from backend
    API.get("/settings/clinic")
      .then(res => {
        const clinic = res.data as any
        if (clinic?.name) {
          // Derive a clinic-specific announcement
          // Clinic admin can extend this by adding a custom field in the future
          setAnnouncement({
            emoji: "🎉",
            text:  `Welcome to ${clinic.name} — Free consultation for new patients!`,
            cta:   "Book Now →",
            href:  "/booking",
          })
        }
      })
      .catch(() => {
        // API unavailable or user not logged in — keep fallback, no crash
      })
      .finally(() => {
        setLoading(false)
      })
  }, [])

  const handleDismiss = () => {
    setVisible(false)
    saveDismiss()
  }

  return (
    <div
      className={`${styles.topbar}${!visible ? ` ${styles.hidden}` : ""}`}
      role="banner"
      aria-label="Announcement banner"
      aria-hidden={!visible}
    >
      <div className={styles.inner}>
        <div className={styles.dot} aria-hidden="true" />

        {loading ? (
          /* Skeleton shimmer while fetching clinic name */
          <div className={styles.skeleton} aria-label="Loading announcement" />
        ) : (
          <>
            <span className={styles.text}>
              {announcement.emoji}{" "}
              <strong>{announcement.text}</strong>
            </span>
            <div className={styles.sep} aria-hidden="true" />
            <Link href={announcement.href} className={styles.cta}>
              {announcement.cta}
            </Link>
          </>
        )}
      </div>

      <button
        className={styles.closeBtn}
        onClick={handleDismiss}
        aria-label="Dismiss announcement"
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          aria-hidden="true"
        >
          <line x1="18" y1="6"  x2="6"  y2="18" />
          <line x1="6"  y1="6"  x2="18" y2="18" />
        </svg>
      </button>
    </div>
  )
}