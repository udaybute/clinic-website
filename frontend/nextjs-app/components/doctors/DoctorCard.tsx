"use client"

// components/shared/DoctorCard.tsx
// Used on /doctors listing page and homepage DoctorsSection
// Field contract: Doctor type from @/types — no fields changed

import Link from "next/link"
import { useEffect, useRef, useState } from "react"
import { Doctor } from "@/types"
import styles from "./DoctorCard.module.css"

// ── Inline SVG icons — no emoji per arch doc ──────────────────────────────────
const IconStar = ({ filled }: { filled: boolean }) => (
  <svg
    width="11" height="11" viewBox="0 0 24 24"
    fill={filled ? "#d4a843" : "none"}
    stroke="#d4a843" strokeWidth="1.5"
    aria-hidden="true"
  >
    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
  </svg>
)

const IconClock = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
    <circle cx="12" cy="12" r="10"/>
    <polyline points="12 6 12 12 16 14"/>
  </svg>
)

const IconVerified = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M22 11.08V12a10 10 0 11-5.93-9.14"/>
    <polyline points="22 4 12 14.01 9 11.01"/>
  </svg>
)

const IconCalendar = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
    <rect x="3" y="4" width="18" height="18" rx="2"/>
    <line x1="16" y1="2" x2="16" y2="6"/>
    <line x1="8"  y1="2" x2="8"  y2="6"/>
    <line x1="3"  y1="10" x2="21" y2="10"/>
  </svg>
)

const IconArrow = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
    <polyline points="9 18 15 12 9 6"/>
  </svg>
)

const IconPatients = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/>
    <circle cx="9" cy="7" r="4"/>
    <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/>
  </svg>
)

// ── StarRating — memoised, aria-labelled ──────────────────────────────────────
function StarRating({ rating }: { rating: number | string }) {
  const num    = typeof rating === "string" ? parseFloat(rating) : rating
  const filled = Math.round(num)
  return (
    <span
      className={styles.stars}
      aria-label={`${num} out of 5 stars`}
    >
      {[1,2,3,4,5].map(i => (
        <IconStar key={i} filled={i <= filled} />
      ))}
    </span>
  )
}

// ── Specialty → brand accent mapping ─────────────────────────────────────────
// All use brand teal system — no rainbow per-card colors (brand cohesion rule)
// accentBg / accentBorder computed as rgba — no color-mix() (arch doc rule)
const SPECIALTY_META: Record<string, {
  label: string
  tagBg: string
  tagBorder: string
  tagColor: string
}> = {
  "Orthodontist":         { label: "Orthodontics",  tagBg: "rgba(13,148,136,0.08)",  tagBorder: "rgba(13,148,136,0.2)",  tagColor: "#0a6e65" },
  "Implant Specialist":   { label: "Implantology",  tagBg: "rgba(13,148,136,0.08)",  tagBorder: "rgba(13,148,136,0.2)",  tagColor: "#0a6e65" },
  "Cosmetic Dentist":     { label: "Cosmetic",      tagBg: "rgba(13,148,136,0.08)",  tagBorder: "rgba(13,148,136,0.2)",  tagColor: "#0a6e65" },
  "General Dentist":      { label: "General",       tagBg: "rgba(13,148,136,0.08)",  tagBorder: "rgba(13,148,136,0.2)",  tagColor: "#0a6e65" },
  "Endodontist":          { label: "Endodontics",   tagBg: "rgba(13,148,136,0.08)",  tagBorder: "rgba(13,148,136,0.2)",  tagColor: "#0a6e65" },
  "Periodontist":         { label: "Periodontics",  tagBg: "rgba(13,148,136,0.08)",  tagBorder: "rgba(13,148,136,0.2)",  tagColor: "#0a6e65" },
}
const DEFAULT_META = {
  label: "Specialist",
  tagBg: "rgba(13,148,136,0.08)",
  tagBorder: "rgba(13,148,136,0.2)",
  tagColor: "#0a6e65",
}

// ── DoctorCard ────────────────────────────────────────────────────────────────
export default function DoctorCard({ doctor }: { doctor: Doctor }) {
  const meta       = SPECIALTY_META[doctor.specialty] ?? DEFAULT_META
  const cardRef    = useRef<HTMLElement>(null)
  const [visible, setVisible]   = useState(false)
  const [imgLoaded, setImgLoaded] = useState(false)
  const [hovered, setHovered]   = useState(false)

  // Single observer — disconnects after first trigger (arch doc rule)
  useEffect(() => {
    const card = cardRef.current
    if (!card) return
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true)
          obs.disconnect()
        }
      },
      { threshold: 0.1 }
    )
    obs.observe(card)
    return () => obs.disconnect()
  }, [])

  const patientCount = doctor.patientCount
  const education    = doctor.education
  const isAvailable  = doctor.available !== false // default true if not provided

  return (
    <article
      ref={cardRef}
      className={`${styles.card} ${visible ? styles.cardVisible : ""}`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      aria-label={`Dr. ${doctor.name}, ${doctor.specialty}`}
    >
      {/* ── Image area ── */}
      <div className={styles.imgWrap}>
        {/* Skeleton shimmer while loading */}
        {!imgLoaded && (
          <div className={styles.imgSkeleton} aria-hidden="true" />
        )}

        <img
          src={doctor.image}
          alt={`${doctor.name}, ${doctor.specialty} at DentalCare Smile Studio`}
          className={`${styles.img} ${imgLoaded ? styles.imgLoaded : ""} ${hovered ? styles.imgHovered : ""}`}
          onLoad={() => setImgLoaded(true)}
          loading="lazy"
          draggable={false}
        />

        {/* Gradient overlay — fades image bottom to white */}
        <div className={styles.imgOverlay} aria-hidden="true" />

        {/* Availability badge — solid bg, NO backdrop-filter (arch doc: iOS blur bug) */}
        <div
          className={`${styles.availBadge} ${isAvailable ? styles.availOpen : styles.availBusy}`}
          aria-label={isAvailable ? "Available for booking" : "Fully booked this week"}
        >
          <span className={styles.availDot} aria-hidden="true" />
          {isAvailable ? "Available" : "Fully booked"}
        </div>

        {/* Rating pill — solid bg, NO backdrop-filter */}
        <div
          className={styles.ratingPill}
          aria-label={`Rated ${doctor.rating} out of 5 from ${doctor.reviewCount} reviews`}
        >
          <span className={styles.ratingNum}>{doctor.rating}</span>
          <StarRating rating={doctor.rating} />
        </div>
      </div>

      {/* ── Card body ── */}
      <div className={styles.body}>

        {/* Specialty tag */}
        <div
          className={styles.specialtyTag}
          style={{ background: meta.tagBg, borderColor: meta.tagBorder, color: meta.tagColor }}
        >
          <IconVerified />
          {doctor.specialty}
        </div>

        {/* Doctor name */}
        <h2 className={styles.name}>{doctor.name}</h2>

        {/* Education line — shows if available */}
        {education ? (
          <p className={styles.education}>{education}</p>
        ) : (
          <p className={styles.experience}>
            <IconClock />
            {doctor.experience} experience
          </p>
        )}

        {/* Stats strip */}
        <div className={styles.statsStrip}>
          <div className={styles.statBlock}>
            <span className={styles.statVal}>{doctor.experience}</span>
            <span className={styles.statKey}>Experience</span>
          </div>
          <div className={styles.statSep} aria-hidden="true" />
          <div className={styles.statBlock}>
            <span className={styles.statVal}>{doctor.rating}★</span>
            <span className={styles.statKey}>Rating</span>
          </div>
          {patientCount && (
            <>
              <div className={styles.statSep} aria-hidden="true" />
              <div className={styles.statBlock}>
                <span className={styles.statVal}>{patientCount}</span>
                <span className={styles.statKey}>Patients</span>
              </div>
            </>
          )}
          {!patientCount && (
            <>
              <div className={styles.statSep} aria-hidden="true" />
              <div className={styles.statBlock}>
                <span className={styles.statVal}>{doctor.reviewCount}</span>
                <span className={styles.statKey}>Reviews</span>
              </div>
            </>
          )}
        </div>

        {/* Specialisation tags */}
        {doctor.tags && doctor.tags.length > 0 && (
          <div className={styles.tags} aria-label="Areas of expertise">
            {doctor.tags.map(t => (
              <span key={t} className={styles.tag}>{t}</span>
            ))}
          </div>
        )}

        {/* CTA row */}
        <div className={styles.ctaRow}>
          <Link
            href={`/booking?doctor=${doctor.id}`}
            className={`${styles.bookBtn} ${!isAvailable ? styles.bookBtnWaitlist : ""}`}
          >
            <IconCalendar />
            {isAvailable ? "Book Appointment" : "Join Waitlist"}
          </Link>

          <Link
            href={`/doctors/${doctor.id}`}
            className={styles.profileBtn}
            aria-label={`View ${doctor.name}'s full profile`}
          >
            Profile
            <IconArrow />
          </Link>
        </div>
      </div>
    </article>
  )
}