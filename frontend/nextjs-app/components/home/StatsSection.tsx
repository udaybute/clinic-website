"use client"

// components/home/StatsSection.tsx
// GET /api/stats → { patients, doctors, yearsExperience, successRate }

import { useEffect, useRef, useState, memo } from "react"
import styles from "./StatsSection.module.css"

// Inline SVG icons — no emoji per arch doc
const IconPatients = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/>
    <circle cx="9" cy="7" r="4"/>
    <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/>
  </svg>
)
const IconDoctor = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
  </svg>
)
const IconAward = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="8" r="6"/>
    <path d="M15.477 12.89L17 22l-5-3-5 3 1.523-9.11"/>
  </svg>
)
const IconCheck = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 11.08V12a10 10 0 11-5.93-9.14"/>
    <polyline points="22 4 12 14.01 9 11.01"/>
  </svg>
)
const IconStar = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" stroke="none">
    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
  </svg>
)
const IconTooth = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 2C9 2 6.5 4 6.5 7.5c0 2.2 1 4 2.1 5.4L10 22h4l1.4-9.1c1.1-1.4 2.1-3.2 2.1-5.4C17.5 4 15 2 12 2z"/>
  </svg>
)

// Single source of truth for patient numbers — 2,400+ consistent across all sections
const STATS = [
  { value: 2400,  suffix: "+",  label: "Happy Patients",     Icon: IconPatients, desc: "In Pune since 2010"         },
  { value: 15,    suffix: "+",  label: "Specialist Doctors",  Icon: IconDoctor,   desc: "Board-certified experts"   },
  { value: 10,    suffix: "+",  label: "Years of Care",       Icon: IconAward,    desc: "Trusted in Koregaon Park"  },
  { value: 99,    suffix: "%",  label: "Pain-Free Rate",      Icon: IconCheck,    desc: "Proven patient outcomes"   },
  { value: 4.9,   suffix: "★",  label: "Google Rating",       Icon: IconStar,     desc: "Across 1,200+ reviews"     },
  { value: 8500,  suffix: "+",  label: "Procedures Done",     Icon: IconTooth,    desc: "And growing every day"     },
] as const

// Count-up hook — RAF-based with float support
function useCountUp(target: number, duration = 1800, started: boolean) {
  const [count, setCount] = useState(0)

  useEffect(() => {
    if (!started) return
    const isFloat = target < 10 && !Number.isInteger(target)
    let current = 0
    const step = target / (duration / 16)
    const t = setInterval(() => {
      current += step
      if (current >= target) {
        setCount(target)
        clearInterval(t)
      } else {
        setCount(isFloat ? parseFloat(current.toFixed(1)) : Math.floor(current))
      }
    }, 16)
    return () => clearInterval(t)
  }, [target, started, duration])

  return count
}

// Memoised to prevent unnecessary re-renders during countup
const StatItem = memo(function StatItem({
  stat,
  delay,
  started,
}: {
  stat: (typeof STATS)[number]
  delay: number
  started: boolean
}) {
  const count = useCountUp(stat.value, 1800, started)
  const display =
    stat.value < 10 && !Number.isInteger(stat.value)
      ? count.toFixed(1)
      : count.toLocaleString()

  return (
    <div
      className={styles.statItem}
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className={styles.statIcon} aria-hidden="true">
        <stat.Icon />
      </div>
      <div
        className={styles.statNum}
        aria-label={`${display}${stat.suffix} ${stat.label}`}
      >
        {display}
        <span className={styles.statSuffix}>{stat.suffix}</span>
      </div>
      <div className={styles.statLabel}>{stat.label}</div>
      <div className={styles.statDesc}>{stat.desc}</div>
    </div>
  )
})

export default function StatsSection() {
  const ref = useRef<HTMLElement>(null)
  const [started, setStarted] = useState(false)

  // Observer disconnects after first trigger — arch doc rule
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const obs = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setStarted(true)
          obs.disconnect()
        }
      },
      { threshold: 0.2 }
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [])

  return (
    <section ref={ref} className={styles.root} aria-label="Clinic statistics">
      {/* Decorative glow */}
      <div className={styles.glow} aria-hidden="true" />

      <div className={styles.inner}>
        <div className={styles.headerRow}>
          <div className={styles.eyebrow}>
            <span className={styles.eyebrowDot} aria-hidden="true" />
            By the numbers
          </div>
          <h2 className={styles.heading}>
            <em className={styles.headingEm}>Trusted</em> by Pune families
          </h2>
        </div>

        <div className={styles.grid}>
          {STATS.map((s, i) => (
            <StatItem key={s.label} stat={s} delay={i * 80} started={started} />
          ))}
        </div>
      </div>
    </section>
  )
}