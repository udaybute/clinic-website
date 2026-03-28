"use client"

// components/home/FeaturesSection.tsx
// Backend note: No API needed — static marketing content

import { useEffect, useRef } from "react"
import styles from "./FeaturesSection.module.css"

// ── Inline SVG icons — no icon library per architecture rules ────────────────
const IconBot = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="11" width="18" height="10" rx="2"/>
    <path d="M12 11V7"/><circle cx="12" cy="5" r="2"/>
    <line x1="8" y1="15" x2="8" y2="15" strokeWidth="2.5"/>
    <line x1="12" y1="15" x2="12" y2="15" strokeWidth="2.5"/>
    <line x1="16" y1="15" x2="16" y2="15" strokeWidth="2.5"/>
  </svg>
)
const IconCalendar = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="4" width="18" height="18" rx="2"/>
    <line x1="16" y1="2" x2="16" y2="6"/>
    <line x1="8" y1="2" x2="8" y2="6"/>
    <line x1="3" y1="10" x2="21" y2="10"/>
    <rect x="7" y="14" width="3" height="3" rx="0.5"/>
  </svg>
)
const IconTooth = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 2C9 2 6.5 4 6.5 7.5c0 2.2 1 4 2.1 5.4L10 22h4l1.4-9.1c1.1-1.4 2.1-3.2 2.1-5.4C17.5 4 15 2 12 2z"/>
    <path d="M9 7.5C9 5.6 10.3 4 12 4"/>
  </svg>
)
const IconBarChart = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="20" x2="18" y2="10"/>
    <line x1="12" y1="20" x2="12" y2="4"/>
    <line x1="6" y1="20" x2="6" y2="14"/>
    <line x1="2" y1="20" x2="22" y2="20"/>
  </svg>
)
const IconCreditCard = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="5" width="20" height="14" rx="2"/>
    <line x1="2" y1="10" x2="22" y2="10"/>
    <line x1="6" y1="15" x2="10" y2="15"/>
  </svg>
)
const IconShield = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
    <polyline points="9 12 11 14 15 10"/>
  </svg>
)
const IconArrow = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <line x1="5" y1="12" x2="19" y2="12"/>
    <polyline points="12 5 19 12 12 19"/>
  </svg>
)

// ── Feature data ──────────────────────────────────────────────────────────────
// Variant controls card visual treatment:
//   "hero"    → full-width dark navy feature at top
//   "gold"    → gold-accented supporting card
//   "default" → standard light card
const FEATURES = [
  {
    variant: "hero" as const,
    Icon: IconBot,
    tag: "Most popular",
    title: "AI Receptionist",
    desc: "A 24/7 intelligent conversational agent that handles patient bookings, answers clinical queries, sends automated reminders, and escalates to staff only when needed. Zero wait time, zero missed calls.",
    highlight: "Save 40+ hrs/month",
    stat: "94%",
    statLabel: "Query resolution rate",
  },
  {
    variant: "gold" as const,
    Icon: IconCalendar,
    tag: "Scheduling",
    title: "Smart Scheduling",
    desc: "Real-time slot engine syncs with doctor calendars. Patients book in under 60 seconds with zero double-bookings.",
    highlight: "Zero double bookings",
  },
  {
    variant: "default" as const,
    Icon: IconTooth,
    tag: "Clinical",
    title: "Expert Specialists",
    desc: "Board-certified doctors averaging 10+ years of experience. Cosmetics, implants, ortho — fully covered.",
    highlight: "15+ Specialists",
  },
  {
    variant: "default" as const,
    Icon: IconBarChart,
    tag: "Analytics",
    title: "Analytics Dashboard",
    desc: "Track revenue, patient retention, appointment trends, and staff performance from one powerful command centre.",
    highlight: "Real-time insights",
  },
  {
    variant: "default" as const,
    Icon: IconCreditCard,
    tag: "Billing",
    title: "Seamless Payments",
    desc: "Stripe-powered billing with subscription plans, invoice generation, and automated payment reminders.",
    highlight: "Stripe integrated",
  },
  {
    variant: "default" as const,
    Icon: IconShield,
    tag: "Compliance",
    title: "Secure & Compliant",
    desc: "HIPAA-aligned records, AES-256 encryption, role-based access controls, and full audit logging.",
    highlight: "Enterprise security",
  },
] as const

// ── FeatureCard ───────────────────────────────────────────────────────────────
function FeatureCard({
  feature,
  index,
}: {
  feature: (typeof FEATURES)[number]
  index: number
}) {
  const { variant, Icon, tag, title, desc, highlight } = feature
  const stat      = "stat"      in feature ? feature.stat      : undefined
  const statLabel = "statLabel" in feature ? feature.statLabel : undefined

  if (variant === "hero") {
    return (
      <div
        className={`${styles.heroCard} ${styles.fadeUp}`}
        style={{ "--delay": "0ms" } as React.CSSProperties}
      >
        {/* Left content */}
        <div className={styles.heroLeft}>
          <div className={styles.heroTag}>{tag}</div>
          <div className={styles.heroIconWrap}>
            <Icon />
          </div>
          <h3 className={styles.heroTitle}>{title}</h3>
          <p className={styles.heroDesc}>{desc}</p>
          <div className={styles.heroHighlight}>
            <span className={styles.heroDot} aria-hidden="true" />
            {highlight}
          </div>
        </div>

        {/* Right stat */}
        <div className={styles.heroRight} aria-hidden="true">
          <div className={styles.heroStat}>
            <span className={styles.heroStatN}>{stat}</span>
            <span className={styles.heroStatLabel}>{statLabel}</span>
          </div>
          {/* Decorative ring */}
          <div className={styles.heroRing} />
          <div className={styles.heroRing2} />
        </div>

        {/* Corner accent */}
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
        <div className={styles.cardTag}>{tag}</div>
        <div className={`${styles.cardIconWrap} ${variant === "gold" ? styles.cardIconGold : ""}`}>
          <Icon />
        </div>
      </div>

      <h3 className={`${styles.cardTitle} ${variant === "gold" ? styles.cardTitleGold : ""}`}>
        {title}
      </h3>
      <p className={styles.cardDesc}>{desc}</p>

      <div className={`${styles.cardFooter} ${variant === "gold" ? styles.cardFooterGold : ""}`}>
        <span className={styles.cardHighlight}>{highlight}</span>
        <span className={styles.cardArrow}>
          <IconArrow />
        </span>
      </div>
    </div>
  )
}

// ── Section ───────────────────────────────────────────────────────────────────
export default function FeaturesSection() {
  const sectionRef = useRef<HTMLElement>(null)

  // Single IntersectionObserver on the section — triggers all cards at once
  // with staggered CSS delays. Observer disconnects after first trigger (arch rule).
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
      aria-labelledby="features-heading"
    >
      {/* Subtle background grid */}
      <div className={styles.bgGrid} aria-hidden="true" />

      <div className={styles.inner}>
        {/* Header */}
        <header className={`${styles.header} ${styles.fadeUp}`} style={{ "--delay": "0ms" } as React.CSSProperties}>
          <div className={styles.eyebrow}>
            <span className={styles.eyebrowDot} aria-hidden="true" />
            Platform Features
          </div>
          <h2 id="features-heading" className={styles.heading}>
            Everything your clinic
            <em className={styles.headingEm}> needs to thrive</em>
          </h2>
          <p className={styles.sub}>
            A complete growth platform built for modern dental practices —
            from solo clinics to multi-branch chains.
          </p>
        </header>

        {/* Hero card — full width */}
        <div className={styles.heroRow}>
          <FeatureCard feature={FEATURES[0]} index={0} />
        </div>

        {/* Supporting grid — remaining 5 cards */}
        <div className={styles.grid}>
          {FEATURES.slice(1).map((f, i) => (
            <FeatureCard key={f.title} feature={f} index={i + 1} />
          ))}
        </div>

        {/* Bottom CTA strip */}
        <div className={`${styles.ctaStrip} ${styles.fadeUp}`} style={{ "--delay": "480ms" } as React.CSSProperties}>
          <p className={styles.ctaText}>
            Ready to transform your clinic operations?
          </p>
          <a href="/booking" className={styles.ctaPrimary}>
            Start Free Trial
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
              <polyline points="9 18 15 12 9 6"/>
            </svg>
          </a>
          <a href="/services" className={styles.ctaSecondary}>
            View all features
          </a>
        </div>
      </div>
    </section>
  )
}