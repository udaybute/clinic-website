"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import styles from "./FAQSection.module.css"

const FAQS = [
  {
    id: "1",
    category: "Booking",
    q: "How do I book an appointment?",
    a: "Use our online booking system available 24/7 — select your service, choose a doctor, pick a date and time, and confirm. You'll receive an instant email confirmation. You can also ask our AI receptionist chatbot anytime.",
  },
  {
    id: "2",
    category: "Billing",
    q: "Do you accept dental insurance?",
    a: "Yes, we accept most major insurance providers including Star Health, HDFC Ergo, Bajaj Allianz and United India. Our team will verify your coverage before your appointment so there are no surprises.",
  },
  {
    id: "3",
    category: "Treatments",
    q: "Are dental implants painful?",
    a: "Modern implant surgery is performed under local anaesthesia and is generally very comfortable. Most patients report minimal discomfort — typically less than a standard tooth extraction. We also offer sedation options for anxious patients.",
  },
  {
    id: "4",
    category: "Treatments",
    q: "How long does teeth whitening last?",
    a: "Professional laser whitening results typically last 12–18 months depending on diet and oral hygiene habits. We provide a home maintenance kit and recommend occasional top-up sessions to maintain peak brightness.",
  },
  {
    id: "5",
    category: "Treatments",
    q: "What's the difference between braces and Invisalign?",
    a: "Traditional braces use metal brackets and wires while Invisalign uses a series of clear removable aligners. Invisalign is nearly invisible and can be removed for eating. Braces may be recommended for more complex cases. Our orthodontists will advise the best option during consultation.",
  },
  {
    id: "6",
    category: "General",
    q: "How often should I visit the dentist?",
    a: "We recommend a routine check-up and professional cleaning every 6 months. Patients with ongoing treatments or gum disease may require more frequent visits. Regular check-ups help catch issues early when they're easiest and most affordable to treat.",
  },
  {
    id: "7",
    category: "General",
    q: "Is children's dentistry available?",
    a: "Absolutely. We have specialists trained in paediatric dentistry who create a fun, friendly and anxiety-free environment for children of all ages. We recommend a child's first dental visit by age 1 or within 6 months of their first tooth.",
  },
  {
    id: "8",
    category: "Booking",
    q: "Can I cancel or reschedule my booking?",
    a: "Yes — you can cancel or reschedule up to 24 hours before your appointment at no charge through your patient portal or by contacting us. Same-day cancellations may incur a small fee.",
  },
]

const CATEGORIES = ["All", "Booking", "Treatments", "Billing", "General"]

const CATEGORY_ICONS: Record<string, string> = {
  All: "◈",
  Booking: "◷",
  Treatments: "✦",
  Billing: "◎",
  General: "◌",
}

// Structured data for SEO
function getFAQSchema(faqs: typeof FAQS) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  }
}

function FAQItem({
  faq,
  isOpen,
  onToggle,
  index,
}: {
  faq: (typeof FAQS)[0]
  isOpen: boolean
  onToggle: () => void
  index: number
}) {
  const bodyRef = useRef<HTMLDivElement>(null)
  const [height, setHeight] = useState(0)

  // Measure real height — no max-height guessing
  useEffect(() => {
    if (!bodyRef.current) return
    const inner = bodyRef.current.firstElementChild as HTMLElement
    if (!inner) return
    setHeight(isOpen ? inner.getBoundingClientRect().height : 0)
  }, [isOpen])

  return (
    <div
      className={`${styles.item} ${isOpen ? styles.itemOpen : ""}`}
      style={{ animationDelay: `${index * 55}ms` }}
    >
      {/* Number badge */}
      <span className={styles.badge}>{String(index + 1).padStart(2, "0")}</span>

      <button
        className={styles.trigger}
        onClick={onToggle}
        aria-expanded={isOpen}
        aria-controls={`faq-body-${faq.id}`}
      >
        <span className={styles.question}>{faq.q}</span>
        <span className={styles.iconWrap} aria-hidden="true">
          <svg
            className={styles.icon}
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
          >
            <line
              x1="8"
              y1="2"
              x2="8"
              y2="14"
              stroke="currentColor"
              strokeWidth="1.75"
              strokeLinecap="round"
              className={styles.iconV}
            />
            <line
              x1="2"
              y1="8"
              x2="14"
              y2="8"
              stroke="currentColor"
              strokeWidth="1.75"
              strokeLinecap="round"
            />
          </svg>
        </span>
      </button>

      {/* Real measured-height accordion — no max-height guessing */}
      <div
        id={`faq-body-${faq.id}`}
        ref={bodyRef}
        className={styles.body}
        style={{ height }}
        role="region"
        aria-hidden={!isOpen}
      >
        <div className={styles.inner}>
          <p className={styles.answer}>{faq.a}</p>
          <a href="/booking" className={styles.answerCta}>
            Book a consultation
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </a>
        </div>
      </div>
    </div>
  )
}

export default function FAQSection() {
  const [open, setOpen] = useState<string | null>("1")
  const [activeCategory, setActiveCategory] = useState("All")
  const sectionRef = useRef<HTMLElement>(null)
  const [visible, setVisible] = useState(false)

  const filtered =
    activeCategory === "All"
      ? FAQS
      : FAQS.filter((f) => f.category === activeCategory)

  const toggle = useCallback(
    (id: string) => setOpen((prev) => (prev === id ? null : id)),
    []
  )

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

  // Reset open item when category filter changes
  useEffect(() => {
    setOpen(filtered[0]?.id ?? null)
  }, [activeCategory])

  return (
    <>
      {/* Schema.org structured data for SEO */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(getFAQSchema(FAQS)),
        }}
      />

      <section
        ref={sectionRef}
        className={`${styles.root} ${visible ? styles.rootVisible : ""}`}
        aria-labelledby="faq-heading"
      >
        {/* Decorative grid lines */}
        <div className={styles.gridLines} aria-hidden="true">
          <span /><span /><span /><span />
        </div>

        <div className={styles.container}>
          {/* Header */}
          <header className={styles.header}>
            <div className={styles.eyebrow}>
              <span className={styles.eyebrowDot} />
              Patient Questions
            </div>
            <h2 id="faq-heading" className={styles.heading}>
              Everything you need to know
              <em className={styles.headingAccent}> before your visit</em>
            </h2>
            <p className={styles.sub}>
              Can't find your answer? Our AI receptionist is available 24/7.
            </p>
          </header>

          {/* Category filter tabs */}
          <div className={styles.tabs} role="tablist" aria-label="FAQ categories">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                role="tab"
                aria-selected={activeCategory === cat}
                className={`${styles.tab} ${activeCategory === cat ? styles.tabActive : ""}`}
                onClick={() => setActiveCategory(cat)}
              >
                <span className={styles.tabIcon}>{CATEGORY_ICONS[cat]}</span>
                {cat}
              </button>
            ))}
          </div>

          {/* Two-column layout */}
          <div className={styles.layout}>
            {/* FAQ list */}
            <div className={styles.list} role="list">
              {filtered.map((faq, i) => (
                <FAQItem
                  key={faq.id}
                  faq={faq}
                  isOpen={open === faq.id}
                  onToggle={() => toggle(faq.id)}
                  index={i}
                />
              ))}
            </div>

            {/* Sticky CTA sidebar */}
            <aside className={styles.sidebar}>
              <div className={styles.sideCard}>
                <div className={styles.sideCardIcon} aria-hidden="true">
                  <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
                    <circle cx="14" cy="14" r="13" stroke="currentColor" strokeWidth="1.5" />
                    <path d="M9 14.5C9 11.46 11.46 9 14.5 9S20 11.46 20 14.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                    <circle cx="14.5" cy="18.5" r="1.5" fill="currentColor" />
                  </svg>
                </div>
                <h3 className={styles.sideCardTitle}>Still have questions?</h3>
                <p className={styles.sideCardText}>
                  Our AI receptionist answers instantly — day or night. No hold music, no waiting.
                </p>
                <a href="#chatbot" className={styles.sideCardBtn}>
                  Chat with AI Receptionist
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                </a>
                <div className={styles.sideCardDivider} />
                <a href="/booking" className={styles.sideCardSecondary}>
                  Or book an appointment
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                </a>
              </div>

              {/* Trust signals */}
              <div className={styles.trustRow}>
                {[
                  { n: "4.9★", label: "Google Rating" },
                  { n: "2,400+", label: "Happy Patients" },
                  { n: "ISO", label: "Certified Clinic" },
                ].map((t) => (
                  <div key={t.label} className={styles.trustItem}>
                    <span className={styles.trustN}>{t.n}</span>
                    <span className={styles.trustLabel}>{t.label}</span>
                  </div>
                ))}
              </div>
            </aside>
          </div>
        </div>
      </section>
    </>
  )
}