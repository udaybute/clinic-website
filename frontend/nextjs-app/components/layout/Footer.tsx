"use client"

// components/layout/Footer.tsx
// "use client" required: uses useState (newsletter), new Date() for year

import { useState } from "react"
import Link from "next/link"
import styles from "./Footer.module.css"

const FOOTER_LINKS = {
  Services: [
    { label: "Teeth Cleaning",   href: "/services#cleaning"  },
    { label: "Teeth Whitening",  href: "/services#whitening" },
    { label: "Dental Implants",  href: "/services#implants"  },
    { label: "Orthodontics",     href: "/services#ortho"     },
    { label: "Root Canal",       href: "/services#rootcanal" },
    { label: "Cosmetic Veneers", href: "/services#veneers"   },
  ],
  Company: [
    { label: "About Us",    href: "/about"   },
    { label: "Our Doctors", href: "/doctors" },
    { label: "Careers",     href: "/careers" },
    { label: "Blog",        href: "/blog"    },
    { label: "Press Kit",   href: "/press"   },
  ],
  Support: [
    { label: "Book Appointment", href: "/booking"   },
    { label: "Patient Portal",   href: "/dashboard" },
    { label: "FAQ",              href: "/#faq"      },
    { label: "Contact Us",       href: "/contact"   },
    { label: "Privacy Policy",   href: "/privacy"   },
    { label: "Terms of Service", href: "/terms"     },
  ],
}

// Inline SVG social icons — no icon library per arch doc
const SOCIALS = [
  {
    name: "Instagram",
    href: "https://instagram.com",
    icon: (
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
        <path d="M16 11.37A4 4 0 1112.63 8 4 4 0 0116 11.37z" />
        <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
      </svg>
    ),
  },
  {
    name: "Facebook",
    href: "https://facebook.com",
    icon: (
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
        <path d="M18 2h-3a5 5 0 00-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 011-1h3z" />
      </svg>
    ),
  },
  {
    name: "Twitter / X",
    href: "https://twitter.com",
    icon: (
      <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor">
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
      </svg>
    ),
  },
  {
    name: "YouTube",
    href: "https://youtube.com",
    icon: (
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22.54 6.42a2.78 2.78 0 00-1.95-1.96C18.88 4 12 4 12 4s-6.88 0-8.59.46A2.78 2.78 0 001.46 6.42 29 29 0 001 12a29 29 0 00.46 5.58 2.78 2.78 0 001.95 1.96C5.12 20 12 20 12 20s6.88 0 8.59-.46a2.78 2.78 0 001.95-1.96A29 29 0 0023 12a29 29 0 00-.46-5.58z" />
        <polygon points="9.75 15.02 15.5 12 9.75 8.98 9.75 15.02" />
      </svg>
    ),
  },
  {
    name: "WhatsApp",
    href: "https://wa.me/919876543210",
    icon: (
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
        <path d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z" />
      </svg>
    ),
  },
]

// SVG trust badge icons — replaces emoji (arch doc: inline SVG only)
const IconShield = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
  </svg>
)
const IconHospital = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
    <polyline points="9 22 9 12 15 12 15 22" />
  </svg>
)
const IconZap = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
  </svg>
)

const TRUST_BADGES = [
  { label: "ISO Certified",        Icon: IconShield   },
  { label: "10+ Years of Care",    Icon: IconHospital },
  { label: "2,400+ Happy Patients",Icon: IconZap      },
]

// Newsletter — frontend only (no backend endpoint yet per arch doc pending items)
// When backend /newsletter is ready: replace handleSubscribe with API.post('/newsletter', { email })
type NLState = "idle" | "loading" | "success" | "error"

function Newsletter() {
  const [email, setEmail]   = useState("")
  const [state, setState]   = useState<NLState>("idle")
  const [touched, setTouched] = useState(false)

  const isValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)

  async function handleSubscribe() {
    setTouched(true)
    if (!isValidEmail) return
    setState("loading")
    // TODO: replace with API.post('/newsletter', { email }) when endpoint is ready
    await new Promise((r) => setTimeout(r, 900))
    setState("success")
  }

  if (state === "success") {
    return (
      <div className={styles.nlSuccess}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#0d9488" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
          <polyline points="20 6 9 17 4 12" />
        </svg>
        <span>You're subscribed — check your inbox!</span>
      </div>
    )
  }

  return (
    <div className={styles.nlWrap}>
      <div className={styles.nlLabel}>Get dental tips &amp; offers</div>
      <div className={styles.nlForm}>
        <input
          className={`${styles.nlInput} ${touched && !isValidEmail ? styles.nlInputError : ""}`}
          type="email"
          placeholder="your@email.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onBlur={() => setTouched(true)}
          onKeyDown={(e) => e.key === "Enter" && handleSubscribe()}
          aria-label="Email address for newsletter"
          aria-invalid={touched && !isValidEmail}
          disabled={state === "loading"}
        />
        <button
          className={styles.nlBtn}
          onClick={handleSubscribe}
          disabled={state === "loading"}
          aria-label="Subscribe to newsletter"
        >
          {state === "loading" ? (
            <span className={styles.nlSpinner} aria-hidden="true" />
          ) : (
            "Subscribe"
          )}
        </button>
      </div>
      {touched && !isValidEmail && (
        <p className={styles.nlError} role="alert">Please enter a valid email address.</p>
      )}
    </div>
  )
}

export default function Footer() {
  // new Date() is client-safe here since this component is "use client"
  const year = new Date().getFullYear()

  return (
    <footer className={styles.root}>
      {/* Wave top divider — matches last section background */}
      <div className={styles.wave} aria-hidden="true">
        <svg
          viewBox="0 0 1200 48"
          preserveAspectRatio="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M0,48 L0,24 Q300,0 600,24 Q900,48 1200,24 L1200,48 Z"
            fill="#0a1628"
          />
        </svg>
      </div>

      {/* Main content */}
      <div className={styles.inner}>
        <div className={styles.grid}>

          {/* ── Brand column ── */}
          <div className={styles.brandCol}>
            <Link href="/" className={styles.brandLogo} aria-label="DentalCare Smile Studio — home">
              <div className={styles.brandIcon} aria-hidden="true">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M12 2C9 2 7 4 7 7c0 2 1 3.5 2 5l1 9h4l1-9c1-1.5 2-3 2-5 0-3-2-5-5-5z"
                    fill="white"
                    fillOpacity="0.92"
                  />
                  <path
                    d="M9 7c0-1.7 1.3-3 3-3"
                    stroke="white"
                    strokeWidth="1.3"
                    strokeLinecap="round"
                    strokeOpacity="0.45"
                  />
                </svg>
              </div>
              <div>
                <span className={styles.brandName}>DentalCare</span>
                <span className={styles.brandSub}>Smile Studio</span>
              </div>
            </Link>

            <p className={styles.brandDesc}>
              Expert dental care in the heart of Pune — gentle, transparent,
              and trusted by over 2,400 patients since 2010.
            </p>

            <Newsletter />

            {/* Social links */}
            <div className={styles.socials} aria-label="Social media links">
              {SOCIALS.map((s) => (
                <a
                  key={s.name}
                  href={s.href}
                  className={styles.socialBtn}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={s.name}
                >
                  {s.icon}
                </a>
              ))}
            </div>
          </div>

          {/* ── Link columns ── */}
          {Object.entries(FOOTER_LINKS).map(([col, links]) => (
            <div key={col} className={styles.linkCol}>
              <div className={styles.colTitle}>{col}</div>
              <ul className={styles.colLinks} role="list">
                {links.map((l) => (
                  <li key={l.href}>
                    <Link href={l.href} className={styles.colLink}>
                      <span className={styles.colLinkArrow} aria-hidden="true">
                        <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                          <polyline points="9 18 15 12 9 6" />
                        </svg>
                      </span>
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      {/* ── Bottom bar ── */}
      <div className={styles.bottom}>
        <div className={styles.bottomInner}>
          <p className={styles.copy}>
            © {year} DentalCare Smile Studio. All rights reserved.
          </p>
          <div className={styles.badges} aria-label="Security and compliance badges">
            {TRUST_BADGES.map(({ label, Icon }) => (
              <div key={label} className={styles.badge}>
                <Icon />
                {label}
              </div>
            ))}
          </div>
        </div>
      </div>
    </footer>
  )
}