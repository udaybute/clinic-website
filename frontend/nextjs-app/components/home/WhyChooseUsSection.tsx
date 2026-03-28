"use client"

// components/home/WhyChooseUsSection.tsx
// Backend note: No API needed — static marketing content
// PURPOSE: This section answers the patient question "Why should I come to THIS clinic?"
// It is NOT a software feature list. Every card must speak to a patient's concern.

import { useEffect, useRef } from "react"
import styles from "./WhyChooseUsSection.module.css"

// ── Inline SVG icons — no icon library per architecture rules ────────────────
const IconHeart = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/>
  </svg>
)
const IconClock = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/>
    <polyline points="12 6 12 12 16 14"/>
  </svg>
)
const IconAward = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="8" r="6"/>
    <path d="M15.477 12.89L17 22l-5-3-5 3 1.523-9.11"/>
  </svg>
)
const IconSmile = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/>
    <path d="M8 14s1.5 2 4 2 4-2 4-2"/>
    <line x1="9" y1="9" x2="9.01" y2="9" strokeWidth="2.5"/>
    <line x1="15" y1="9" x2="15.01" y2="9" strokeWidth="2.5"/>
  </svg>
)
const IconChild = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="5" r="3"/>
    <path d="M6 21v-2a6 6 0 0112 0v2"/>
    <path d="M9 12l1.5 2 3-3"/>
  </svg>
)
const IconShield = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
    <polyline points="9 12 11 14 15 10"/>
  </svg>
)

// ── Why choose us — patient-facing reasons ────────────────────────────────────
// Every item answers a real patient hesitation or concern.
// DO NOT add software/analytics/SaaS metrics here.
const REASONS = [
  {
    variant: "hero" as const,
    Icon: IconHeart,
    tag: "Our promise",
    title: "Gentle, Pain-Free Treatment",
    desc: "We understand dental anxiety. Every procedure is performed with maximum care, using the latest anaesthesia techniques and patient-first protocols. Most patients are surprised by how comfortable their visit feels.",
    stat: "98%",
    statLabel: "Patients report a pain-free experience",
  },
  {
    variant: "gold" as const,
    Icon: IconClock,
    tag: "Convenience",
    title: "Same-Day & Weekend Appointments",
    desc: "Book online in under 60 seconds. We offer morning, evening, and Saturday slots so you never have to take time off work.",
    badge: "Open Saturdays",
  },
  {
    variant: "default" as const,
    Icon: IconAward,
    tag: "Expertise",
    title: "10+ Years of Specialist Care",
    desc: "Our board-certified specialists average over a decade of experience in implants, orthodontics, cosmetics, and root canal treatments.",
    badge: "ISO Certified",
  },
  {
    variant: "default" as const,
    Icon: IconSmile,
    tag: "Transparency",
    title: "No Hidden Costs",
    desc: "We provide a full written treatment plan and cost breakdown before starting any procedure. No surprises on your final bill.",
    badge: "Free initial assessment",
  },
  {
    variant: "default" as const,
    Icon: IconChild,
    tag: "Family",
    title: "Child-Friendly Clinic",
    desc: "A calming, colourful environment designed for children. Our paediatric specialists make first visits fun — not frightening.",
    badge: "Ages 1 and up",
  },
  {
    variant: "default" as const,
    Icon: IconShield,
    tag: "Safety",
    title: "Sterile, Safe & Hygienic",
    desc: "Hospital-grade sterilisation at every station. All instruments are autoclaved and single-use where required. Your safety is non-negotiable.",
    badge: "NABH standards",
  },
] as const

// ── Card components ───────────────────────────────────────────────────────────
function ReasonCard({
  reason,
  index,
}: {
  reason: (typeof REASONS)[number]
  index: number
}) {
  const { variant, Icon, tag, title, desc } = reason
  const badge = "badge" in reason ? reason.badge : undefined
  const stat      = "stat"      in reason ? reason.stat      : undefined
  const statLabel = "statLabel" in reason ? reason.statLabel : undefined

  if (variant === "hero") {
    return (
      <div
        className={`${styles.heroCard} ${styles.fadeUp}`}
        style={{ "--delay": "0ms" } as React.CSSProperties}
      >
        <div className={styles.heroLeft}>
          <div className={styles.heroTag}>{tag}</div>
          <div className={styles.heroIconWrap}>
            <Icon />
          </div>
          <h3 className={styles.heroTitle}>{title}</h3>
          <p className={styles.heroDesc}>{desc}</p>
          <a href="/booking" className={styles.heroBookBtn}>
            Book a Pain-Free Visit
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
              <polyline points="9 18 15 12 9 6"/>
            </svg>
          </a>
        </div>

        {/* Stat panel */}
        <div className={styles.heroRight} aria-hidden="true">
          <div className={styles.heroStat}>
            <span className={styles.heroStatN}>{stat}</span>
            <span className={styles.heroStatLabel}>{statLabel}</span>
          </div>
          <div className={styles.heroRing} />
          <div className={styles.heroRing2} />
        </div>

        <div className={styles.heroCorner} aria-hidden="true" />
      </div>
    )
  }

  return (
    <div
      className={`${styles.card} ${variant === "gold" ? styles.cardGold : styles.cardDefault} ${styles.fadeUp}`}
      style={{ "--delay": `${index * 70}ms` } as React.CSSProperties}
    >
      <div className={styles.cardTop}>
        <span className={styles.cardTag}>{tag}</span>
        <div className={`${styles.cardIconWrap} ${variant === "gold" ? styles.cardIconGold : ""}`}>
          <Icon />
        </div>
      </div>

      <h3 className={`${styles.cardTitle} ${variant === "gold" ? styles.cardTitleGold : ""}`}>
        {title}
      </h3>
      <p className={`${styles.cardDesc} ${variant === "gold" ? styles.cardDescGold : ""}`}>
        {desc}
      </p>

      {badge && (
        <div className={`${styles.cardBadge} ${variant === "gold" ? styles.cardBadgeGold : ""}`}>
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
            <polyline points="20 6 9 17 4 12"/>
          </svg>
          {badge}
        </div>
      )}
    </div>
  )
}

// ── Section ───────────────────────────────────────────────────────────────────
export default function WhyChooseUsSection() {
  const sectionRef = useRef<HTMLElement>(null)

  // Single observer on section, disconnects after first trigger (arch doc rule)
  useEffect(() => {
    const section = sectionRef.current
    if (!section) return
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          section.querySelectorAll(`.${styles.fadeUp}`).forEach((el) => {
            el.classList.add(styles.fadeUpVisible)
          })
          obs.disconnect()
        }
      },
      { threshold: 0.06 }
    )
    obs.observe(section)
    return () => obs.disconnect()
  }, [])

  return (
    <section
      ref={sectionRef}
      className={styles.root}
      aria-labelledby="why-us-heading"
    >
      <div className={styles.bgGrid} aria-hidden="true" />

      <div className={styles.inner}>
        {/* Header */}
        <header
          className={`${styles.header} ${styles.fadeUp}`}
          style={{ "--delay": "0ms" } as React.CSSProperties}
        >
          <div className={styles.eyebrow}>
            <span className={styles.eyebrowDot} aria-hidden="true" />
            Why patients choose us
          </div>
          <h2 id="why-us-heading" className={styles.heading}>
            Dental care that puts
            <em className={styles.headingEm}> you first</em>
          </h2>
          <p className={styles.sub}>
            We know choosing a dentist is a trust decision. Here's why
            over 2,400 patients in Pune call DentalCare their permanent home.
          </p>
        </header>

        {/* Hero card — full width */}
        <div className={styles.heroRow}>
          <ReasonCard reason={REASONS[0]} index={0} />
        </div>

        {/* Supporting grid */}
        <div className={styles.grid}>
          {REASONS.slice(1).map((r, i) => (
            <ReasonCard key={r.title} reason={r} index={i + 1} />
          ))}
        </div>

        {/* Social proof strip */}
        <div
          className={`${styles.proofStrip} ${styles.fadeUp}`}
          style={{ "--delay": "440ms" } as React.CSSProperties}
        >
          {[
            { n: "2,400+", label: "Patients treated" },
            { n: "10+",    label: "Years in Pune" },
            { n: "4.9 ★",  label: "Google rating" },
            { n: "15+",    label: "Specialist doctors" },
          ].map((s) => (
            <div key={s.label} className={styles.proofItem}>
              <span className={styles.proofN}>{s.n}</span>
              <span className={styles.proofLabel}>{s.label}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
