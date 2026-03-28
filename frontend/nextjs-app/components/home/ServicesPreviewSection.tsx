"use client"

// components/home/ServicesPreviewSection.tsx
// GET /api/services → Service[]
// Field contract preserved: id, name, desc, duration, price, popular

import Link from "next/link"
import { useEffect, useRef, useState } from "react"
import styles from "./ServicesPreviewSection.module.css"

// ── SVG Icons — no emoji per arch doc ────────────────────────────────────────
const IconCleaning = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 2C9 2 6.5 4 6.5 7.5c0 2.2 1 4 2.1 5.4L10 22h4l1.4-9.1c1.1-1.4 2.1-3.2 2.1-5.4C17.5 4 15 2 12 2z"/>
    <path d="M9 7.5C9 5.6 10.3 4 12 4"/>
  </svg>
)
const IconWhitening = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="4"/>
    <line x1="12" y1="2" x2="12" y2="4"/><line x1="12" y1="20" x2="12" y2="22"/>
    <line x1="4.93" y1="4.93" x2="6.34" y2="6.34"/><line x1="17.66" y1="17.66" x2="19.07" y2="19.07"/>
    <line x1="2" y1="12" x2="4" y2="12"/><line x1="20" y1="12" x2="22" y2="12"/>
    <line x1="4.93" y1="19.07" x2="6.34" y2="17.66"/><line x1="17.66" y1="6.34" x2="19.07" y2="4.93"/>
  </svg>
)
const IconImplant = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="2" x2="12" y2="22"/>
    <path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/>
  </svg>
)
const IconRootCanal = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
  </svg>
)
const IconOrtho = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/>
    <path d="M8 14s1.5 2 4 2 4-2 4-2"/>
    <line x1="9" y1="9" x2="9.01" y2="9" strokeWidth="2.5"/>
    <line x1="15" y1="9" x2="15.01" y2="9" strokeWidth="2.5"/>
  </svg>
)
const IconVeneers = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
  </svg>
)

// ── Service data — GET /api/services ─────────────────────────────────────────
// accentHex / rgba values precomputed — no color-mix() (arch doc rule)
const SERVICES = [
  {
    id: "1", Icon: IconCleaning,
    name: "Teeth Cleaning", shortName: "Cleaning",
    desc: "Professional scaling & polishing to remove plaque, tartar and staining. The foundation of every healthy smile.",
    duration: "45 min", price: "₹800", unit: "/ session", popular: false,
    accentHex: "#0d9488",
    glow:      "0 0 60px rgba(13,148,136,0.22)",
    iconBg:    "rgba(13,148,136,0.12)", iconBorder: "rgba(13,148,136,0.25)", iconColor: "#14b8a6",
    barGrad:   "linear-gradient(90deg,#0d9488,#14b8a6)",
    num: "01",
  },
  {
    id: "2", Icon: IconWhitening,
    name: "Teeth Whitening", shortName: "Whitening",
    desc: "Advanced laser whitening for a noticeably brighter smile. Up to 6 shades lighter in a single session — no sensitivity.",
    duration: "60 min", price: "₹3,500", unit: "/ session", popular: true,
    accentHex: "#7c3aed",
    glow:      "0 0 60px rgba(124,58,237,0.2)",
    iconBg:    "rgba(124,58,237,0.10)", iconBorder: "rgba(124,58,237,0.22)", iconColor: "#a78bfa",
    barGrad:   "linear-gradient(90deg,#7c3aed,#a78bfa)",
    num: "02",
  },
  {
    id: "3", Icon: IconImplant,
    name: "Dental Implants", shortName: "Implants",
    desc: "Permanent titanium implants that look, feel and function exactly like natural teeth. Built to last a lifetime.",
    duration: "90 min", price: "₹18,000", unit: "/ implant", popular: false,
    accentHex: "#2563eb",
    glow:      "0 0 60px rgba(37,99,235,0.2)",
    iconBg:    "rgba(37,99,235,0.10)", iconBorder: "rgba(37,99,235,0.22)", iconColor: "#60a5fa",
    barGrad:   "linear-gradient(90deg,#2563eb,#60a5fa)",
    num: "03",
  },
  {
    id: "4", Icon: IconRootCanal,
    name: "Root Canal", shortName: "Root Canal",
    desc: "Painless endodontic treatment using modern rotary tools. Save your tooth, eliminate the pain, same-day relief.",
    duration: "75 min", price: "₹6,000", unit: "/ tooth", popular: false,
    accentHex: "#dc2626",
    glow:      "0 0 60px rgba(220,38,38,0.18)",
    iconBg:    "rgba(220,38,38,0.09)", iconBorder: "rgba(220,38,38,0.20)", iconColor: "#f87171",
    barGrad:   "linear-gradient(90deg,#dc2626,#f87171)",
    num: "04",
  },
  {
    id: "5", Icon: IconOrtho,
    name: "Orthodontics", shortName: "Orthodontics",
    desc: "Invisible aligners and precision braces to create your perfect alignment. Comfortable, discreet, life-changing.",
    duration: "Ongoing", price: "₹25,000", unit: "onwards", popular: true,
    accentHex: "#d97706",
    glow:      "0 0 60px rgba(217,119,6,0.22)",
    iconBg:    "rgba(217,119,6,0.10)", iconBorder: "rgba(217,119,6,0.22)", iconColor: "#fbbf24",
    barGrad:   "linear-gradient(90deg,#d97706,#fbbf24)",
    num: "05",
  },
  {
    id: "6", Icon: IconVeneers,
    name: "Cosmetic Veneers", shortName: "Veneers",
    desc: "Ultra-thin porcelain shells bonded to your teeth for a flawless, celebrity-grade finish. Instant transformation.",
    duration: "2 visits", price: "₹8,500", unit: "/ tooth", popular: false,
    accentHex: "#059669",
    glow:      "0 0 60px rgba(5,150,105,0.2)",
    iconBg:    "rgba(5,150,105,0.10)", iconBorder: "rgba(5,150,105,0.22)", iconColor: "#34d399",
    barGrad:   "linear-gradient(90deg,#059669,#34d399)",
    num: "06",
  },
] as const

type Service = (typeof SERVICES)[number]

// ── ServiceCard ───────────────────────────────────────────────────────────────
function ServiceCard({
  service,
  featured = false,
}: {
  service: Service
  featured?: boolean
}) {
  const [hovered, setHovered] = useState(false)

  return (
    <article
      className={`${styles.card} ${featured ? styles.cardFeatured : ""}`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        "--accent":      service.accentHex,
        "--glow":        service.glow,
        "--bar-grad":    service.barGrad,
        "--icon-bg":     service.iconBg,
        "--icon-border": service.iconBorder,
        "--icon-color":  service.iconColor,
      } as React.CSSProperties}
    >
      {/* Shimmer sweep on hover */}
      <div className={`${styles.shimmer} ${hovered ? styles.shimmerActive : ""}`} aria-hidden="true" />

      {/* Colored top bar */}
      <div className={styles.cardTopBar} aria-hidden="true" />

      {/* Number + popular */}
      <div className={styles.cardHeader}>
        <span className={styles.cardNum}>{service.num}</span>
        {service.popular && (
          <span className={styles.popularBadge}>
            <svg width="8" height="8" viewBox="0 0 24 24" fill="#d4a843" aria-hidden="true">
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
            </svg>
            Popular
          </span>
        )}
      </div>

      {/* Icon */}
      <div className={styles.cardIconWrap} aria-hidden="true">
        <service.Icon />
      </div>

      {/* Text */}
      <h3 className={styles.cardName}>{service.name}</h3>
      <p className={styles.cardDesc}>{service.desc}</p>

      {/* Footer */}
      <div className={styles.cardFooter}>
        <div className={styles.cardMeta}>
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
            <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
          </svg>
          {service.duration}
        </div>

        <div className={styles.priceWrap}>
          <span className={styles.price}>{service.price}</span>
          <span className={styles.priceUnit}>{service.unit}</span>
        </div>
      </div>

      {/* Book CTA — slides up on hover */}
      <div className={`${styles.bookSlide} ${hovered ? styles.bookSlideVisible : ""}`}>
        <Link href={`/booking?service=${service.id}`} className={styles.bookLink}>
          Book {service.shortName}
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
            <polyline points="9 18 15 12 9 6"/>
          </svg>
        </Link>
      </div>
    </article>
  )
}

// ── Section ───────────────────────────────────────────────────────────────────
export default function ServicesPreviewSection() {
  const sectionRef = useRef<HTMLElement>(null)

  useEffect(() => {
    const section = sectionRef.current
    if (!section) return
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          section.querySelectorAll(`.${styles.animItem}`).forEach((el, i) => {
            setTimeout(() => el.classList.add(styles.animItemVisible), i * 70)
          })
          obs.disconnect()
        }
      },
      { threshold: 0.05 }
    )
    obs.observe(section)
    return () => obs.disconnect()
  }, [])

  return (
    <section
      ref={sectionRef}
      className={styles.root}
      aria-labelledby="services-heading"
    >
      {/* Background grid lines */}
      <div className={styles.bgLines} aria-hidden="true" />
      {/* Radial glow center */}
      <div className={styles.bgGlow} aria-hidden="true" />

      <div className={styles.inner}>

        {/* ── Header ── */}
        <header className={`${styles.header} ${styles.animItem}`}>
          <div className={styles.headerLeft}>
            <div className={styles.eyebrow}>
              <span className={styles.eyebrowDot} aria-hidden="true" />
              Our treatments
            </div>
            <h2 id="services-heading" className={styles.heading}>
              Treatments that
              <em className={styles.headingEm}><br/>transform smiles</em>
            </h2>
          </div>

          <div className={styles.headerRight}>
            {/* Large editorial number */}
            <div className={styles.bigCount} aria-hidden="true">06</div>
            <div className={styles.headerMeta}>
              <p className={styles.headerSub}>
                From routine care to complete smile makeovers — every
                treatment delivered with precision, compassion, and transparency.
              </p>
              <Link href="/services" className={styles.viewAll}>
                View all services
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
                  <polyline points="9 18 15 12 9 6"/>
                </svg>
              </Link>
            </div>
          </div>
        </header>

        {/* Divider line */}
        <div className={`${styles.dividerLine} ${styles.animItem}`} aria-hidden="true" />

        {/* ── Grid ── */}
        <div className={styles.grid}>
          {/* Featured first card — spans 2 cols on desktop */}
          <div className={`${styles.featuredWrap} ${styles.animItem}`}>
            <ServiceCard service={SERVICES[0]} featured />
          </div>

          {/* Remaining 5 cards */}
          {SERVICES.slice(1).map((s) => (
            <div key={s.id} className={`${styles.cardWrap} ${styles.animItem}`}>
              <ServiceCard service={s} />
            </div>
          ))}
        </div>

        {/* ── Bottom CTA ── */}
        <div className={`${styles.ctaStrip} ${styles.animItem}`}>
          <div className={styles.ctaLeft}>
            <p className={styles.ctaTitle}>
              Not sure which treatment is right for you?
            </p>
            <p className={styles.ctaSub}>
              A free 15-minute consultation with our specialists will guide you.
            </p>
          </div>
          <div className={styles.ctaActions}>
            <Link href="/booking" className={styles.ctaPrimary}>
              Book Free Consultation
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
                <polyline points="9 18 15 12 9 6"/>
              </svg>
            </Link>
            <Link href="/services" className={styles.ctaGhost}>
              Browse all treatments
            </Link>
          </div>
        </div>

      </div>
    </section>
  )
}