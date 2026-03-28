"use client"

import { useState, useEffect, useRef } from "react"
import styles from "./LocationSection.module.css"

// GET /api/clinic/:id → Clinic (id, address, phone, email, hours, mapUrl)
const CLINIC = {
  name: "DentalCare Smile Studio",
  address:
    "14, Koregaon Park Annexe, Near Ruby Hall Clinic, Pune, Maharashtra 411001",
  phone: "+91 98765 43210",
  email: "hello@dentalcare.in",
  mapSrc:
    "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3782.265588!2d73.8945!3d18.5314!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2zMTjCsDMxJzUzLjAiTiA3M8KwNTMnNDAuMiJF!5e0!3m2!1sen!2sin!4v1710000000000!5m2!1sen!2sin",
  hours: [
    { day: "Monday – Friday",  time: "9:00 AM – 8:00 PM",  open: true,  dayIndices: [1, 2, 3, 4, 5] },
    { day: "Saturday",          time: "9:00 AM – 6:00 PM",  open: true,  dayIndices: [6] },
    { day: "Sunday",            time: "10:00 AM – 2:00 PM", open: true,  dayIndices: [0] },
    { day: "Public Holidays",   time: "Closed",              open: false, dayIndices: [] },
  ],
  nearbyLandmarks: [
    "2 min from Ruby Hall Clinic",
    "Easy parking available",
    "Near Koregaon Park Metro",
  ],
}

// SVG icons — inline per architecture rules (no icon library)
const IconPin = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" />
    <circle cx="12" cy="10" r="3" />
  </svg>
)
const IconPhone = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.81 19.79 19.79 0 01.01 1.19 2 2 0 012 .01h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.09 7.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 14.92v2z" />
  </svg>
)
const IconMail = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
    <polyline points="22,6 12,13 2,6" />
  </svg>
)
const IconClock = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <circle cx="12" cy="12" r="10" />
    <polyline points="12 6 12 12 16 14" />
  </svg>
)
const IconArrow = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <polyline points="9 18 15 12 9 6" />
  </svg>
)
const IconDirections = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="3 11 22 2 13 21 11 13 3 11" />
  </svg>
)
const IconCheck = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
    <polyline points="20 6 9 17 4 12" />
  </svg>
)

function useClinicStatus() {
  const [status, setStatus] = useState<{
    isOpen: boolean
    label: string
    todayRow: string
  } | null>(null)

  useEffect(() => {
    function compute() {
      const now = new Date()
      const dayOfWeek = now.getDay() // 0 = Sun
      const hour = now.getHours()
      const minute = now.getMinutes()
      const timeDecimal = hour + minute / 60

      // Find which row covers today
      const todayRow = CLINIC.hours.find((h) =>
        h.dayIndices.includes(dayOfWeek)
      )

      if (!todayRow || !todayRow.open) {
        return { isOpen: false, label: "Closed today", todayRow: todayRow?.day ?? "" }
      }

      // Parse time range e.g. "9:00 AM – 8:00 PM"
      const parts = todayRow.time.split("–").map((s) => s.trim())
      function parseTime(t: string) {
        const [time, period] = t.split(" ")
        const [h, m] = time.split(":").map(Number)
        const hr = period === "PM" && h !== 12 ? h + 12 : period === "AM" && h === 12 ? 0 : h
        return hr + m / 60
      }

      const opens = parseTime(parts[0])
      const closes = parseTime(parts[1])
      const isOpen = timeDecimal >= opens && timeDecimal < closes

      // Closing soon = within 60 min of closing
      const closingSoon = isOpen && closes - timeDecimal <= 1

      const closesAt = parts[1]
      const label = closingSoon
        ? `Closes at ${closesAt}`
        : isOpen
        ? `Open until ${closesAt}`
        : `Opens at ${parts[0]}`

      return { isOpen, label, todayRow: todayRow.day }
    }

    setStatus(compute())
    // Refresh every minute
    const id = setInterval(() => setStatus(compute()), 60_000)
    return () => clearInterval(id)
  }, [])

  return status
}

export default function LocationSection() {
  const sectionRef = useRef<HTMLElement>(null)
  const [visible, setVisible] = useState(false)
  const clinicStatus = useClinicStatus()

  // Today's day index for row highlight
  const todayDayIndex = new Date().getDay()

  // IntersectionObserver — disconnect after first trigger (arch doc rule)
  useEffect(() => {
    const el = sectionRef.current
    if (!el) return
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true)
          obs.disconnect()
        }
      },
      { threshold: 0.08 }
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [])

  return (
    <section
      ref={sectionRef}
      className={`${styles.root} ${visible ? styles.rootVisible : ""}`}
      aria-labelledby="location-heading"
    >
      {/* Subtle background texture */}
      <div className={styles.bgAccent} aria-hidden="true" />

      <div className={styles.container}>
        {/* ── Left column ── */}
        <div className={styles.info}>
          {/* Header */}
          <div className={`${styles.headerBlock} ${styles.fadeUp}`} style={{ transitionDelay: "0ms" }}>
            <div className={styles.eyebrow}>
              <span className={styles.eyebrowDot} />
              Find Us
            </div>
            <h2 id="location-heading" className={styles.heading}>
              Visit Our <em className={styles.headingEm}>Clinic</em>
            </h2>
            <p className={styles.sub}>
              Conveniently located in Koregaon Park, Pune — with easy parking
              and public transport access.
            </p>
          </div>

          {/* Live open/closed status pill */}
          {clinicStatus && (
            <div
              className={`${styles.statusPill} ${styles.fadeUp} ${clinicStatus.isOpen ? styles.statusOpen : styles.statusClosed}`}
              style={{ transitionDelay: "80ms" }}
              aria-live="polite"
            >
              <span className={styles.statusDot} />
              <IconClock />
              <span className={styles.statusLabel}>{clinicStatus.label}</span>
            </div>
          )}

          {/* Contact info cards */}
          <div
            className={`${styles.contactCards} ${styles.fadeUp}`}
            style={{ transitionDelay: "140ms" }}
          >
            {/* Phone — most prominent */}
            <a href={`tel:${CLINIC.phone}`} className={`${styles.contactCard} ${styles.contactCardPhone}`}>
              <span className={styles.contactIcon}>
                <IconPhone />
              </span>
              <div className={styles.contactText}>
                <span className={styles.contactLabel}>Call us now</span>
                <span className={styles.contactValue}>{CLINIC.phone}</span>
              </div>
              <span className={styles.contactArrow}><IconArrow /></span>
            </a>

            {/* Address */}
            <div className={styles.contactCard}>
              <span className={styles.contactIcon}>
                <IconPin />
              </span>
              <div className={styles.contactText}>
                <span className={styles.contactLabel}>Address</span>
                <span className={styles.contactValue}>{CLINIC.address}</span>
              </div>
            </div>

            {/* Email */}
            <a href={`mailto:${CLINIC.email}`} className={styles.contactCard}>
              <span className={styles.contactIcon}>
                <IconMail />
              </span>
              <div className={styles.contactText}>
                <span className={styles.contactLabel}>Email</span>
                <span className={styles.contactValue}>{CLINIC.email}</span>
              </div>
              <span className={styles.contactArrow}><IconArrow /></span>
            </a>
          </div>

          {/* Opening hours with today highlighted */}
          <div
            className={`${styles.hoursCard} ${styles.fadeUp}`}
            style={{ transitionDelay: "220ms" }}
          >
            <div className={styles.hoursHeader}>
              <IconClock />
              Opening Hours
            </div>
            <div className={styles.hoursList}>
              {CLINIC.hours.map((h) => {
                const isToday = h.dayIndices.includes(todayDayIndex)
                return (
                  <div
                    key={h.day}
                    className={`${styles.hoursRow} ${isToday ? styles.hoursRowToday : ""}`}
                  >
                    <div className={styles.hoursDay}>
                      {isToday && (
                        <span className={styles.todayBadge}>Today</span>
                      )}
                      {h.day}
                    </div>
                    <span
                      className={`${styles.hoursTime} ${h.open ? styles.hoursTimeOpen : styles.hoursTimeClosed}`}
                    >
                      {h.time}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Nearby landmarks */}
          <div
            className={`${styles.landmarks} ${styles.fadeUp}`}
            style={{ transitionDelay: "290ms" }}
          >
            {CLINIC.nearbyLandmarks.map((l) => (
              <div key={l} className={styles.landmark}>
                <span className={styles.landmarkIcon}><IconCheck /></span>
                {l}
              </div>
            ))}
          </div>

          {/* CTAs */}
          <div
            className={`${styles.ctaRow} ${styles.fadeUp}`}
            style={{ transitionDelay: "350ms" }}
          >
            <a href="/booking" className={styles.ctaPrimary}>
              Book an Appointment
              <IconArrow />
            </a>
            <a
              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(CLINIC.address)}`}
              target="_blank"
              rel="noopener noreferrer"
              className={styles.ctaSecondary}
            >
              <IconDirections />
              Get Directions
            </a>
          </div>
        </div>

        {/* ── Right column: Map ── */}
        <div
          className={`${styles.mapWrap} ${styles.fadeUp}`}
          style={{ transitionDelay: "120ms" }}
        >
          {/* Map frame with overlay badge */}
          <div className={styles.mapFrame}>
            <iframe
              src={CLINIC.mapSrc}
              allowFullScreen
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              title={`Map showing location of ${CLINIC.name}`}
              className={styles.mapIframe}
            />
            {/* Floating clinic name badge over map */}
            <div className={styles.mapBadge}>
              <span className={styles.mapBadgePin}><IconPin /></span>
              <span>{CLINIC.name}</span>
            </div>
          </div>

          {/* Quick stat strip under map */}
          <div className={styles.mapStats}>
            {[
              { n: "5 min",  label: "from city centre" },
              { n: "Free",   label: "parking on-site" },
              { n: "24/7",   label: "AI receptionist" },
            ].map((s) => (
              <div key={s.label} className={styles.mapStat}>
                <span className={styles.mapStatN}>{s.n}</span>
                <span className={styles.mapStatLabel}>{s.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}