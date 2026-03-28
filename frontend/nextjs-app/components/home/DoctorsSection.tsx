"use client"

// components/home/DoctorsSection.tsx
// GET /api/doctors → Doctor[]
// Field contract preserved: id, name, specialty, experience, rating, reviewCount, image, tags, bio

import Link from "next/link"
import { useEffect, useRef, useState } from "react"
import styles from "./DoctorsSection.module.css"

// ── Inline SVG icons — no emoji per arch doc ──────────────────────────────────
const IconStethoscope = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4.8 2.3A.3.3 0 104.5 2h-1a5 5 0 00-5 5v1a5 5 0 005 5 5 5 0 005-5v-1a5 5 0 00-4.3-4.94"/>
    <path d="M8 13v4a5 5 0 0010 0v-4"/>
    <circle cx="18" cy="12" r="3"/>
  </svg>
)
const IconClock = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <circle cx="12" cy="12" r="10"/>
    <polyline points="12 6 12 12 16 14"/>
  </svg>
)
const IconStar = ({ filled }: { filled: boolean }) => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill={filled ? "#d4a843" : "none"} stroke="#d4a843" strokeWidth="1.5" aria-hidden="true">
    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
  </svg>
)
const IconPatients = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/>
    <circle cx="9" cy="7" r="4"/>
    <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/>
  </svg>
)
const IconVerified = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 11.08V12a10 10 0 11-5.93-9.14"/>
    <polyline points="22 4 12 14.01 9 11.01"/>
  </svg>
)
const IconArrow = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
    <line x1="5" y1="12" x2="19" y2="12"/>
    <polyline points="12 5 19 12 12 19"/>
  </svg>
)
const IconCalendar = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
    <rect x="3" y="4" width="18" height="18" rx="2"/>
    <line x1="16" y1="2" x2="16" y2="6"/>
    <line x1="8" y1="2" x2="8" y2="6"/>
    <line x1="3" y1="10" x2="21" y2="10"/>
  </svg>
)

// ── Doctor data — GET /api/doctors ────────────────────────────────────────────
// Added: patientCount, education, available fields for premium display
// Removed per-card rainbow colors — all use brand teal system
const DOCTORS = [
  {
    id: "1",
    name: "Dr. Sarah Johnson",
    specialty: "Orthodontist",
    experience: "10+ yrs",
    rating: 4.9,
    reviewCount: 318,
    patientCount: "1,200+",
    image: "https://images.unsplash.com/photo-1537368910025-700350fe46c7?w=600&h=700&fit=crop&crop=face",
    tags: ["Braces", "Invisalign", "Retainers"],
    bio: "Specialist in invisible alignment and smile correction for teens and adults. Internationally trained with a focus on minimal-intervention orthodontics.",
    education: "MDS Orthodontics · AIIMS Delhi",
    available: true,
  },
  {
    id: "2",
    name: "Dr. Michael Lee",
    specialty: "Implant Specialist",
    experience: "8+ yrs",
    rating: 4.8,
    reviewCount: 204,
    patientCount: "900+",
    image: "https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=600&h=700&fit=crop&crop=face",
    tags: ["Implants", "Bone Graft", "Restorations"],
    bio: "Pioneer in full-arch dental implants and complex bone reconstruction surgery. Certified in guided implantology and computer-assisted planning.",
    education: "MDS Prosthodontics · KEM Mumbai",
    available: true,
  },
  {
    id: "3",
    name: "Dr. Emma Watson",
    specialty: "Cosmetic Dentist",
    experience: "12+ yrs",
    rating: 4.9,
    reviewCount: 427,
    patientCount: "2,100+",
    image: "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=600&h=700&fit=crop&crop=face",
    tags: ["Veneers", "Whitening", "Bonding"],
    bio: "Award-winning cosmetic specialist transforming smiles with artistry and precision. Speaker at international dental conferences and published author.",
    education: "BDS · MDS Prosthodontics · MIDA",
    available: false,
  },
] as const

type Doctor = (typeof DOCTORS)[number]

// ── DoctorCard ────────────────────────────────────────────────────────────────
function DoctorCard({ doctor, index }: { doctor: Doctor; index: number }) {
  const [imgLoaded, setImgLoaded] = useState(false)
  const filledStars = Math.round(doctor.rating)

  return (
    <article
      className={styles.card}
      style={{ "--delay": `${index * 110}ms` } as React.CSSProperties}
    >
      {/* ── Image column ── */}
      <div className={styles.imgCol}>
        {/* Skeleton shimmer */}
        {!imgLoaded && <div className={styles.imgSkeleton} aria-hidden="true" />}

        <img
          src={doctor.image}
          alt={`${doctor.name}, ${doctor.specialty}`}
          className={`${styles.img} ${imgLoaded ? styles.imgVisible : ""}`}
          onLoad={() => setImgLoaded(true)}
          loading="lazy"
        />

        {/* Availability dot */}
        <div
          className={`${styles.availBadge} ${doctor.available ? styles.availOpen : styles.availBusy}`}
          aria-label={doctor.available ? "Available for booking" : "Fully booked this week"}
        >
          <span className={styles.availDot} />
          {doctor.available ? "Available" : "Fully booked"}
        </div>

        {/* Rating overlay bottom-right of image */}
        <div className={styles.ratingBadge} aria-label={`${doctor.rating} stars from ${doctor.reviewCount} reviews`}>
          <span className={styles.ratingNum}>{doctor.rating}</span>
          <div className={styles.stars}>
            {[1, 2, 3, 4, 5].map(i => (
              <IconStar key={i} filled={i <= filledStars} />
            ))}
          </div>
          <span className={styles.reviewCount}>({doctor.reviewCount})</span>
        </div>
      </div>

      {/* ── Content column ── */}
      <div className={styles.contentCol}>

        {/* Specialty tag */}
        <div className={styles.specialtyTag}>
          <IconStethoscope />
          {doctor.specialty}
        </div>

        {/* Name */}
        <h3 className={styles.name}>{doctor.name}</h3>

        {/* Education */}
        <div className={styles.education}>
          <IconVerified />
          {doctor.education}
        </div>

        {/* Bio */}
        <p className={styles.bio}>{doctor.bio}</p>

        {/* Credential stats row */}
        <div className={styles.stats}>
          <div className={styles.stat}>
            <div className={styles.statNum}>{doctor.experience}</div>
            <div className={styles.statLabel}>Experience</div>
          </div>
          <div className={styles.statDivider} aria-hidden="true" />
          <div className={styles.stat}>
            <div className={styles.statNum}>{doctor.patientCount}</div>
            <div className={styles.statLabel}>Patients</div>
          </div>
          <div className={styles.statDivider} aria-hidden="true" />
          <div className={styles.stat}>
            <div className={styles.statNum}>{doctor.reviewCount}</div>
            <div className={styles.statLabel}>Reviews</div>
          </div>
        </div>

        {/* Specialisation tags */}
        <div className={styles.tags} aria-label="Specialisations">
          {doctor.tags.map(t => (
            <span key={t} className={styles.tag}>{t}</span>
          ))}
        </div>

        {/* CTA row */}
        <div className={styles.ctaRow}>
          <Link
            href={`/booking?doctor=${doctor.id}`}
            className={`${styles.bookBtn} ${!doctor.available ? styles.bookBtnDisabled : ""}`}
            aria-disabled={!doctor.available}
            tabIndex={doctor.available ? 0 : -1}
          >
            <IconCalendar />
            {doctor.available ? "Book Appointment" : "Join Waitlist"}
          </Link>
          <Link href={`/doctors/${doctor.id}`} className={styles.profileLink}>
            View profile
            <IconArrow />
          </Link>
        </div>
      </div>
    </article>
  )
}

// ── Section ───────────────────────────────────────────────────────────────────
export default function DoctorsSection() {
  const sectionRef = useRef<HTMLElement>(null)

  // Single observer on section — disconnects after trigger (arch doc rule)
  useEffect(() => {
    const section = sectionRef.current
    if (!section) return
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          section.querySelectorAll(`.${styles.card}`).forEach((el, i) => {
            setTimeout(() => el.classList.add(styles.cardVisible), i * 110)
          })
          section.querySelectorAll(`.${styles.fadeUp}`).forEach((el, i) => {
            setTimeout(() => el.classList.add(styles.fadeUpVisible), i * 80)
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
      aria-labelledby="doctors-heading"
    >
      {/* Section top teal accent */}
      <div className={styles.topAccent} aria-hidden="true" />

      <div className={styles.inner}>

        {/* ── Header ── */}
        <header className={styles.header}>
          <div className={`${styles.headerLeft} ${styles.fadeUp}`}>
            <div className={styles.eyebrow}>
              <span className={styles.eyebrowLine} aria-hidden="true" />
              Our specialists
            </div>
            <h2 id="doctors-heading" className={styles.heading}>
              Meet the doctors who
              <em className={styles.headingEm}><br />care for your smile</em>
            </h2>
          </div>

          <div className={`${styles.headerRight} ${styles.fadeUp}`} style={{ "--delay": "80ms" } as React.CSSProperties}>
            <p className={styles.headerSub}>
              Every doctor at DentalCare is board-certified, internationally
              trained, and chosen for both their clinical excellence and
              their bedside manner. Your comfort is their first priority.
            </p>
            <div className={styles.headerTrust}>
              {[
                { Icon: IconVerified, text: "Board-certified" },
                { Icon: IconPatients, text: "2,400+ patients" },
                { Icon: () => <IconStar filled />, text: "4.9 avg rating" },
              ].map(({ Icon, text }) => (
                <div key={text} className={styles.trustItem}>
                  <Icon />
                  {text}
                </div>
              ))}
            </div>
          </div>
        </header>

        {/* ── Doctors list ── */}
        <div className={styles.list}>
          {DOCTORS.map((doc, i) => (
            <DoctorCard key={doc.id} doctor={doc} index={i} />
          ))}
        </div>

        {/* ── Bottom CTA ── */}
        <div className={`${styles.bottomCta} ${styles.fadeUp}`}>
          <div className={styles.bottomCtaLeft}>
            <p className={styles.bottomCtaTitle}>Looking for a specific specialist?</p>
            <p className={styles.bottomCtaSub}>Browse our full team of 15+ board-certified doctors.</p>
          </div>
          <Link href="/doctors" className={styles.viewAllBtn}>
            View All Specialists
            <IconArrow />
          </Link>
        </div>

      </div>
    </section>
  )
}