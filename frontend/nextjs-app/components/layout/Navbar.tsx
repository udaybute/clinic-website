"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useState, useEffect, CSSProperties } from "react"
import styles from "./Navbar.module.css"

const NAV_LINKS = [
  { href: "/",          label: "Home"       },
  { href: "/services",  label: "Services"   },
  { href: "/doctors",   label: "Doctors"    },
  { href: "/booking",   label: "Booking"    },
  { href: "/dashboard", label: "Dashboard"  },
]

// Pages with a full-screen dark hero at the top
const HERO_PAGES = ["/"]

type State = "solid" | "hero" | "hero-scroll"

// ── Per-state design tokens ────────────────────────────────────────────────────
// All color logic lives here — NOT in CSS Module selectors.
// This guarantees correct rendering regardless of Turbopack/bundler behaviour.
const TOKENS: Record<State, {
  headerBg:      string
  headerBorder:  string
  headerShadow:  string
  logoColor:     string
  linkColor:     string
  linkHoverBg:   string
  linkHoverColor:string
  linkActiveBg:  string
  linkActiveColor:string
  hamColor:      string
  hamHoverBg:    string
}> = {
  // ── SOLID — white bg, dark text (non-hero pages + hero scrolled >80px)
  solid: {
    headerBg:       "rgba(255,255,255,0.97)",
    headerBorder:   "1px solid rgba(10,22,40,0.09)",
    headerShadow:   "0 2px 32px rgba(10,22,40,0.08)",
    logoColor:      "#0a1628",
    linkColor:      "#1e293b",         // ← strong dark slate — clearly readable
    linkHoverBg:    "rgba(10,22,40,0.06)",
    linkHoverColor: "#0a1628",
    linkActiveBg:   "rgba(13,148,136,0.10)",
    linkActiveColor:"#0d9488",
    hamColor:       "#0a1628",
    hamHoverBg:     "rgba(10,22,40,0.07)",
  },
  // ── HERO — transparent, white text over dark hero image
  hero: {
    headerBg:       "transparent",
    headerBorder:   "1px solid transparent",
    headerShadow:   "none",
    logoColor:      "#ffffff",
    linkColor:      "rgba(255,255,255,0.85)",
    linkHoverBg:    "rgba(255,255,255,0.1)",
    linkHoverColor: "#ffffff",
    linkActiveBg:   "rgba(13,148,136,0.18)",
    linkActiveColor:"#14b8a6",
    hamColor:       "#ffffff",
    hamHoverBg:     "rgba(255,255,255,0.12)",
  },
  // ── HERO-SCROLL — dark glass, white text (hero page 1–80px scrolled)
  "hero-scroll": {
    headerBg:       "rgba(10,22,40,0.85)",
    headerBorder:   "1px solid rgba(255,255,255,0.08)",
    headerShadow:   "0 4px 24px rgba(0,0,0,0.25)",
    logoColor:      "#ffffff",
    linkColor:      "rgba(255,255,255,0.85)",
    linkHoverBg:    "rgba(255,255,255,0.1)",
    linkHoverColor: "#ffffff",
    linkActiveBg:   "rgba(13,148,136,0.18)",
    linkActiveColor:"#14b8a6",
    hamColor:       "#ffffff",
    hamHoverBg:     "rgba(255,255,255,0.12)",
  },
}

// ── NavLink with JS hover state ────────────────────────────────────────────────
function NavLink({
  href, label, isActive, t,
}: {
  href: string; label: string; isActive: boolean
  t: typeof TOKENS[State]
}) {
  const [hovered, setHovered] = useState(false)
  const style: CSSProperties = {
    color:      isActive ? t.linkActiveColor : hovered ? t.linkHoverColor : t.linkColor,
    background: isActive ? t.linkActiveBg   : hovered ? t.linkHoverBg    : "transparent",
  }
  return (
    <Link
      href={href}
      className={`${styles.link}${isActive ? ` ${styles.linkActive}` : ""}`}
      style={style}
      aria-current={isActive ? "page" : undefined}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {label}
    </Link>
  )
}

// ─────────────────────────────────────────────────────────────────────────────

export default function Navbar() {
  const pathname = usePathname()
  const [open,    setOpen]    = useState(false)
  const [scrollY, setScrollY] = useState(0)

  useEffect(() => {
    // Set initial scroll position (handles page refresh mid-scroll)
    setScrollY(window.scrollY)
    const onScroll = () => setScrollY(window.scrollY)
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  useEffect(() => { setOpen(false) }, [pathname])

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : ""
    return () => { document.body.style.overflow = "" }
  }, [open])

  const isHeroPage = HERO_PAGES.includes(pathname)

  // State determination — three clear cases
  const state: State =
    !isHeroPage   ? "solid"       :
    scrollY === 0 ? "hero"        :
    scrollY < 80  ? "hero-scroll" :
                    "solid"

  const t = TOKENS[state]

  // Header inline styles — applied directly, no CSS Module dependency
  const headerStyle: CSSProperties = {
    background:  t.headerBg,
    boxShadow:   t.headerShadow,
    borderBottom:t.headerBorder,
    backdropFilter: state !== "solid" ? "blur(24px)" : "blur(24px)",
    WebkitBackdropFilter: "blur(24px)",
  }

  return (
    <>
      <header className={styles.root} style={headerStyle}>
        <div className={styles.container}>

          {/* ── Logo ── */}
          <Link href="/" className={styles.logo}>
            <div className={styles.logoIcon}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M12 2C9 2 7 4 7 7c0 2 1 3.5 2 5l1 9h4l1-9c1-1.5 2-3 2-5 0-3-2-5-5-5z"
                  fill="white" fillOpacity="0.95"/>
                <path d="M9 7c0-1.7 1.3-3 3-3"
                  stroke="white" strokeWidth="1.4" strokeLinecap="round" strokeOpacity="0.55"/>
              </svg>
            </div>
            <div className={styles.logoText}>
              {/* Logo name color applied inline — guaranteed visible */}
              <span className={styles.logoName} style={{ color: t.logoColor }}>
                DentalCare
              </span>
              <span className={styles.logoSub}>Smile Studio</span>
            </div>
          </Link>

          {/* ── Desktop nav ── */}
          <nav aria-label="Main navigation" className={styles.nav}>
            <ul className={styles.links}>
              {NAV_LINKS.map(({ href, label }) => (
                <li key={href}>
                  <NavLink
                    href={href}
                    label={label}
                    isActive={pathname === href}
                    t={t}
                  />
                </li>
              ))}
            </ul>
          </nav>

          {/* ── Right cluster ── */}
          <div className={styles.right}>
            <Link href="/booking" className={styles.cta}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
                <rect x="3" y="4" width="18" height="18" rx="2"/>
                <line x1="16" y1="2" x2="16" y2="6"/>
                <line x1="8"  y1="2" x2="8"  y2="6"/>
                <line x1="3"  y1="10" x2="21" y2="10"/>
              </svg>
              Book Appointment
            </Link>

            <button
              className={styles.ham}
              style={{ color: t.hamColor }}
              aria-label="Open navigation menu"
              aria-expanded={open}
              aria-controls="nb-mobile-drawer"
              onClick={() => setOpen(true)}
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                <line x1="3"  y1="6"  x2="21" y2="6"  />
                <line x1="3"  y1="12" x2="21" y2="12" />
                <line x1="3"  y1="18" x2="15" y2="18" />
              </svg>
            </button>
          </div>
        </div>
      </header>

      {/* ── Mobile drawer ── */}
      {open && (
        <>
          <div
            className={styles.overlay}
            onClick={() => setOpen(false)}
            aria-hidden="true"
          />
          <nav id="nb-mobile-drawer" className={styles.drawer} aria-label="Mobile navigation">
            <div className={styles.drawerHeader}>
              <Link href="/" className={styles.logo} onClick={() => setOpen(false)}>
                <div className={styles.logoIcon}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <path d="M12 2C9 2 7 4 7 7c0 2 1 3.5 2 5l1 9h4l1-9c1-1.5 2-3 2-5 0-3-2-5-5-5z"
                      fill="white" fillOpacity="0.95"/>
                  </svg>
                </div>
                <div className={styles.logoText}>
                  {/* Drawer always has white bg → always dark logo text */}
                  <span className={styles.logoName} style={{ color: "#0a1628" }}>DentalCare</span>
                  <span className={styles.logoSub}>Smile Studio</span>
                </div>
              </Link>
              <button className={styles.drawerClose} onClick={() => setOpen(false)} aria-label="Close menu">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                  stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
                  <line x1="18" y1="6"  x2="6"  y2="18"/>
                  <line x1="6"  y1="6"  x2="18" y2="18"/>
                </svg>
              </button>
            </div>

            <div className={styles.drawerLinks}>
              {NAV_LINKS.map(({ href, label }) => (
                <Link
                  key={href}
                  href={href}
                  className={`${styles.mLink}${pathname === href ? ` ${styles.mLinkActive}` : ""}`}
                  aria-current={pathname === href ? "page" : undefined}
                >
                  {label}
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                    stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                    <polyline points="9 18 15 12 9 6"/>
                  </svg>
                </Link>
              ))}
            </div>

            <div className={styles.mSep} />

            <div className={styles.drawerFooter}>
              <Link href="/booking" className={styles.mCta}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                  stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
                  <rect x="3" y="4" width="18" height="18" rx="2"/>
                  <line x1="16" y1="2" x2="16" y2="6"/>
                  <line x1="8"  y1="2" x2="8"  y2="6"/>
                  <line x1="3"  y1="10" x2="21" y2="10"/>
                </svg>
                Book Appointment
              </Link>
            </div>
          </nav>
        </>
      )}
    </>
  )
}