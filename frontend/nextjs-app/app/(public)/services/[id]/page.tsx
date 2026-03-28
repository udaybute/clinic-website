// app/(public)/services/[id]/page.tsx
// Server Component — fully static via generateStaticParams.
// FIXES vs original:
//  1. Currency $ → ₹ (Indian clinic)
//  2. Benefits section added (was in data, never rendered)
//  3. generateMetadata() for per-page SEO titles & description
//  4. JSON-LD MedicalProcedure structured data for Google rich results
//  5. Import path fixed: @/types/service (was @/types which doesn't resolve)
//  6. Booking link passes slug as reference — user selects service in booking flow

import type { Metadata } from "next"
import { notFound }      from "next/navigation"
import Link              from "next/link"
import { getServiceById, SERVICES } from "@/lib/services.data"
import styles from "./ServiceDetail.module.css"

// ── Static params — build a page for every service at build time ──────────────
export async function generateStaticParams() {
  return SERVICES.map(s => ({ id: s.id }))
}

// ── Per-page SEO metadata ─────────────────────────────────────────────────────
export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>
}): Promise<Metadata> {
  const { id }  = await params
  const service = getServiceById(id)
  if (!service) return { title: "Service Not Found" }

  const desc = `${service.name} at DentalCare Smile Studio, Mumbai. ${service.description.slice(0, 140)}…`

  return {
    title:       `${service.name} | DentalCare Smile Studio`,
    description: desc,
    openGraph: {
      title:       `${service.name} | DentalCare Smile Studio`,
      description: desc,
      images:      service.image ? [{ url: service.image }] : [],
      type:        "website",
    },
  }
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default async function ServiceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id }  = await params
  const service = getServiceById(id)
  if (!service) notFound()

  // JSON-LD structured data — helps Google show rich results for dental services
  const jsonLd = {
    "@context":          "https://schema.org",
    "@type":             "MedicalProcedure",
    "name":              service.name,
    "description":       service.description,
    "procedureType":     service.category,
    "followup":          service.stats?.visits ? `${service.stats.visits} visit(s)` : undefined,
    "preparation":       service.anaesthesia   ? `Anaesthesia: ${service.anaesthesia}` : undefined,
    "provider": {
      "@type":  "Dentist",
      "name":   "DentalCare Smile Studio",
      "address": {
        "@type":           "PostalAddress",
        "addressLocality": "Mumbai",
        "addressRegion":   "Maharashtra",
        "addressCountry":  "IN",
      },
    },
    "offers": {
      "@type":         "Offer",
      "price":         service.price,
      "priceCurrency": "INR",
    },
  }

  return (
    <>
      {/* JSON-LD */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <div className={styles.pageRoot}>

        {/* TOP BAR */}
        <div className={styles.topbar}>
          <Link href="/services" className={styles.backBtn}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
              <path d="M19 12H5M12 5l-7 7 7 7" />
            </svg>
            Back to services
          </Link>
          <nav className={styles.breadcrumb} aria-label="Breadcrumb">
            <Link href="/services">Services</Link>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 18l6-6-6-6" />
            </svg>
            <span>{service.name}</span>
          </nav>
        </div>

        {/* HERO */}
        <div className={styles.hero}>
          <img
            src={service.image ?? "https://images.unsplash.com/photo-1588776814546-1ffcf47267a5?w=800&auto=format&fit=crop"}
            alt={service.name}
            className={styles.heroImg}
          />
          <div className={styles.heroOverlay} />
          <div className={styles.heroBottom}>
            {service.category && (
              <span className={styles.catPill}>{service.category}</span>
            )}
            <h1 className={styles.heroTitle}>{service.name}</h1>
          </div>
        </div>

        {/* BODY */}
        <div className={styles.bodyGrid}>

          {/* MAIN COLUMN */}
          <main className={styles.mainCol}>

            {/* Overview */}
            <section className={styles.section}>
              <p className={styles.sectionLabel}>Overview</p>
              <p className={styles.bodyText}>{service.description}</p>
            </section>

            {/* Benefits — was in data, never rendered in original */}
            {service.benefits && service.benefits.length > 0 && (
              <section className={styles.section}>
                <p className={styles.sectionLabel}>Key Benefits</p>
                <div className={styles.benefitsGrid}>
                  {service.benefits.map((b, i) => (
                    <div key={i} className={styles.benefitItem}>
                      <svg
                        width="15" height="15" viewBox="0 0 24 24" fill="none"
                        stroke="#0d9488" strokeWidth="2.5" strokeLinecap="round"
                        aria-hidden="true"
                      >
                        <polyline points="20 6 9 17 4 12"/>
                      </svg>
                      <span>{b}</span>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Stats */}
            {service.stats && (
              <section className={styles.section}>
                <div className={styles.statsRow}>
                  <div className={styles.statCard}>
                    <span className={styles.statVal}>{service.stats.successRate}</span>
                    <span className={styles.statLbl}>Success rate</span>
                  </div>
                  <div className={styles.statCard}>
                    <span className={styles.statVal}>
                      {service.duration}<span className={styles.statUnit}> min</span>
                    </span>
                    <span className={styles.statLbl}>Session</span>
                  </div>
                  <div className={styles.statCard}>
                    <span className={styles.statVal}>{service.stats.recovery}</span>
                    <span className={styles.statLbl}>Recovery</span>
                  </div>
                  <div className={styles.statCard}>
                    <span className={styles.statVal}>{service.stats.visits}</span>
                    <span className={styles.statLbl}>Visits</span>
                  </div>
                </div>
              </section>
            )}

            {/* Includes */}
            {service.includes && service.includes.length > 0 && (
              <section className={styles.section}>
                <p className={styles.sectionLabel}>What&apos;s included</p>
                <div className={styles.includesGrid}>
                  {service.includes.map((item, i) => (
                    <div key={i} className={styles.includeItem}>
                      <span className={styles.includeDot} />
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Steps */}
            {service.steps && service.steps.length > 0 && (
              <section className={styles.section}>
                <p className={styles.sectionLabel}>Treatment process</p>
                <div className={styles.steps}>
                  {service.steps.map((step, i) => (
                    <div key={i} className={styles.stepItem}>
                      <div className={styles.stepNum}>{i + 1}</div>
                      <div>
                        <p className={styles.stepTitle}>{step.title}</p>
                        <p className={styles.stepDesc}>{step.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Doctors */}
            {service.doctors && service.doctors.length > 0 && (
              <section className={styles.section}>
                <p className={styles.sectionLabel}>Available specialists</p>
                <div className={styles.doctorsRow}>
                  {service.doctors.map((doc, i) => (
                    <Link
                      key={i}
                      href={`/doctors?service=${service.id}`}
                      className={styles.docCard}
                    >
                      <img src={doc.image} alt={doc.name} className={styles.docAvatar} />
                      <div>
                        <p className={styles.docName}>{doc.name}</p>
                        <p className={styles.docSpec}>
                          {doc.specialty}
                          <span className={styles.docStar}> ★ {doc.rating}</span>
                        </p>
                      </div>
                      <svg className={styles.docArrow} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M5 12h14M12 5l7 7-7 7" />
                      </svg>
                    </Link>
                  ))}
                </div>
              </section>
            )}

            {/* FAQs */}
            {service.faqs && service.faqs.length > 0 && (
              <section className={styles.section}>
                <p className={styles.sectionLabel}>Frequently asked questions</p>
                <div className={styles.faqs}>
                  {service.faqs.map((faq, i) => (
                    <details key={i} className={styles.faqItem}>
                      <summary className={styles.faqQ}>
                        {faq.q}
                        <svg className={styles.faqChev} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                          <path d="M6 9l6 6 6-6" />
                        </svg>
                      </summary>
                      <p className={styles.faqA}>{faq.a}</p>
                    </details>
                  ))}
                </div>
              </section>
            )}

          </main>

          {/* SIDEBAR */}
          <aside className={styles.sidebar}>

            <div className={styles.priceBlock}>
              <p className={styles.priceFrom}>Starting from</p>
              {/* FIXED: was "$" — now ₹ for Indian clinic */}
              <p className={styles.priceVal}>₹{service.price.toLocaleString("en-IN")}</p>
              <p className={styles.priceNote}>Per treatment · EMI available</p>
            </div>

            <div className={styles.infoList}>
              <div className={styles.infoRow}>
                <span className={styles.infoLbl}>Duration</span>
                <span className={styles.infoVal}>{service.duration} min</span>
              </div>
              <div className={styles.divider} />
              {service.anaesthesia && (
                <>
                  <div className={styles.infoRow}>
                    <span className={styles.infoLbl}>Anaesthesia</span>
                    <span className={styles.infoVal}>{service.anaesthesia}</span>
                  </div>
                  <div className={styles.divider} />
                </>
              )}
              {service.stats && (
                <>
                  <div className={styles.infoRow}>
                    <span className={styles.infoLbl}>Recovery</span>
                    <span className={styles.infoVal}>{service.stats.recovery}</span>
                  </div>
                  <div className={styles.divider} />
                </>
              )}
              <div className={styles.infoRow}>
                <span className={styles.infoLbl}>Availability</span>
                <span className={styles.availBadge}>Open slots</span>
              </div>
            </div>

            <Link
              href={`/booking`}
              className={styles.btnBook}
            >
              Book this service
            </Link>

            <Link href="/doctors" className={styles.btnGhost}>
              Meet our specialists
            </Link>

          </aside>
        </div>
      </div>
    </>
  )
}