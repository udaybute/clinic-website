"use client"

// components/home/HeroSection.tsx
// Styles: HeroSection.module.css (same folder)

import Link   from "next/link"
import styles from "./HeroSection.module.css"
import { useEffect, useRef, useState } from "react"

// ── Count-up hook ─────────────────────────────────────────────────────────────
function useCountUp(target: number, duration = 1600, started: boolean) {
  const [val, setVal] = useState(0)
  useEffect(() => {
    if (!started) return
    let frame: number
    const start = performance.now()
    const tick  = (now: number) => {
      const t    = Math.min((now - start) / duration, 1)
      const ease = 1 - Math.pow(1 - t, 3)
      setVal(Math.round(target * ease))
      if (t < 1) frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [target, started, duration])
  return val
}

// ── Stat item with count-up ───────────────────────────────────────────────────
function TrustStat({ num, suffix, label, icon, started, delay }: {
  num: number; suffix: string; label: string
  icon: string; started: boolean; delay: number
}) {
  const count = useCountUp(num, 1600, started)
  return (
    <div
      className={styles.trustItem}
      role="listitem"
      style={{
        opacity:    started ? 1 : 0,
        transform:  started ? "translateY(0)" : "translateY(12px)",
        transition: `opacity .6s ease ${delay}ms, transform .6s ease ${delay}ms`,
      }}
    >
      <div className={styles.trustIcon} aria-hidden="true">{icon}</div>
      <div>
        <div className={styles.trustNum}>{count.toLocaleString()}{suffix}</div>
        <div className={styles.trustText}>{label}</div>
      </div>
    </div>
  )
}

// ── Marquee items ─────────────────────────────────────────────────────────────
const TICKER = [
  "🏆 India's #1 Dental Platform",
  "⭐ 4.9 Star Average Rating",
  "🦷 20,000+ Happy Patients",
  "🩺 15+ Specialist Doctors",
  "✅ 99% Pain-Free Treatments",
  "🔒 HIPAA-Aligned Records",
  "⚡ AI-Powered Scheduling",
  "💎 ISO Certified Clinic 2024",
  "📱 24/7 WhatsApp Booking",
  "🌟 Award-Winning Care",
]

// ── Doctor avatars ────────────────────────────────────────────────────────────
const DOCTORS = [
  { name:"Dr. Sarah Johnson", src:"https://images.unsplash.com/photo-1537368910025-700350fe46c7?w=160&h=160&fit=crop&crop=face", spec:"Orthodontist"       },
  { name:"Dr. Emma Watson",   src:"https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=160&h=160&fit=crop&crop=face", spec:"Cosmetic Dentist"   },
  { name:"Dr. Michael Lee",   src:"https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=160&h=160&fit=crop&crop=face", spec:"Implant Specialist" },
]

// ── Component ─────────────────────────────────────────────────────────────────
export default function HeroSection() {
  const canvasRef  = useRef<HTMLCanvasElement>(null)
  const sectionRef = useRef<HTMLElement>(null)
  const [started,   setStarted]   = useState(false)
  const [imgLoaded, setImgLoaded] = useState(false)

  // Particle canvas
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")!
    let raf: number
    const resize = () => { canvas.width = canvas.offsetWidth; canvas.height = canvas.offsetHeight }
    resize()
    window.addEventListener("resize", resize)
    const particles = Array.from({ length: 60 }, () => ({
      x: Math.random() * canvas.width,  y: Math.random() * canvas.height,
      r: Math.random() * 1.6 + 0.2,
      vx: (Math.random() - 0.5) * 0.22, vy: (Math.random() - 0.5) * 0.22,
      o: Math.random() * 0.35 + 0.06,
    }))
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      particles.forEach(p => {
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(20,184,166,${p.o})`; ctx.fill()
        p.x += p.vx; p.y += p.vy
        if (p.x < 0 || p.x > canvas.width)  p.vx *= -1
        if (p.y < 0 || p.y > canvas.height) p.vy *= -1
      })
      raf = requestAnimationFrame(draw)
    }
    draw()
    return () => { cancelAnimationFrame(raf); window.removeEventListener("resize", resize) }
  }, [])

  // Trigger count-up on viewport entry
  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) { setStarted(true); obs.disconnect() }
    }, { threshold: 0.15 })
    if (sectionRef.current) obs.observe(sectionRef.current)
    return () => obs.disconnect()
  }, [])

  return (
    <>
      <section className={styles.root} ref={sectionRef}>
        <canvas ref={canvasRef} className={styles.canvas} aria-hidden="true" />
        <div className={styles.orb}    aria-hidden="true" />
        <div className={styles.glowBr} aria-hidden="true" />
        <div className={styles.grid}   aria-hidden="true" />

        <div className={styles.inner}>

          {/* ── Left ── */}
          <div className={styles.left}>
            <div className={styles.eyebrow}>
              <div className={styles.eyebrowDot} aria-hidden="true" />
              🏆 India's #1 Rated Dental Platform
            </div>

            <h1 className={styles.h1}>
              Your <em>Perfect Smile</em><br/>
              Starts <span className={styles.gold}>Here.</span>
            </h1>

            <p className={styles.sub}>
              World-class dental care powered by AI scheduling,
              board-certified specialists, and cutting-edge technology —
              all under one roof.
            </p>

            <div className={styles.ctas}>
              <Link href="/booking" className={styles.btnPrimary}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
                  <rect x="3" y="4" width="18" height="18" rx="2"/>
                  <line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/>
                  <line x1="3" y1="10" x2="21" y2="10"/>
                </svg>
                Book Free Consultation
              </Link>
              <Link href="/doctors" className={styles.btnGhostLight}>
                Meet Our Doctors
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                  <polyline points="9 18 15 12 9 6"/>
                </svg>
              </Link>
            </div>

            <div className={styles.trust} role="list">
              <TrustStat num={20000} suffix="+"  label="Happy Patients"  icon="😊" started={started} delay={0}   />
              <TrustStat num={49}    suffix=" ★" label="Average Rating"  icon="⭐" started={started} delay={80}  />
              <TrustStat num={15}    suffix="+"  label="Specialist Docs" icon="🩺" started={started} delay={160} />
              <TrustStat num={99}    suffix="%"  label="Success Rate"    icon="✅" started={started} delay={240} />
            </div>
          </div>

          {/* ── Right ── */}
          <div className={styles.right} aria-hidden="true">
            <div className={styles.imgWrap}>
              <img
                src="https://images.pexels.com/photos/3845806/pexels-photo-3845806.jpeg?w=600&h=750&fit=crop&auto=compress"
                alt="Dentist with patient in a modern clinic"
                loading="eager"
                onLoad={() => setImgLoaded(true)}
                style={{ opacity: imgLoaded ? 1 : 0, transition: "opacity .5s ease" }}
              />
              <div className={styles.imgGrad} />
              <div className={styles.imgShine} />
              <div className={`${styles.imgCorner} ${styles.imgCornerTl}`} />
              <div className={`${styles.imgCorner} ${styles.imgCornerBr}`} />
            </div>

            <div className={styles.stat}>
              <span className={styles.statNum}>98%</span>
              <span className={styles.statLbl}>Pain-free<br/>treatments</span>
            </div>

            <div className={styles.badge}>
              <div className={styles.badgeIco}>🏅</div>
              <div className={styles.badgeTxt}>ISO Certified<span>Clinic 2024</span></div>
            </div>

            <div className={styles.doctors}>
              <div className={styles.doctorsLabel}>Our Specialists</div>
              <div style={{ display:"flex", alignItems:"center" }}>
                <div className={styles.doctorRow}>
                  {DOCTORS.map(d => (
                    <div key={d.name} className={styles.doctorAv} title={`${d.name} — ${d.spec}`}>
                      <img src={d.src} alt={d.name} />
                    </div>
                  ))}
                </div>
                <div className={styles.doctorsCount}>+12 more</div>
              </div>
            </div>
          </div>
        </div>

        {/* Scroll indicator */}
        <div className={styles.scroll} aria-label="Scroll down">
          <div className={styles.scrollTrack}><div className={styles.scrollDot} /></div>
          <span className={styles.scrollLabel}>Scroll</span>
        </div>

        {/* Marquee ticker */}
        <div className={styles.ticker} aria-hidden="true">
          <div className={styles.tickerInner}>
            {[...TICKER, ...TICKER].map((item, i) => (
              <span key={i} className={styles.tickerItem}>{item}</span>
            ))}
          </div>
        </div>
      </section>

      {/* Mobile sticky CTA — outside <section> so overflow:hidden doesn't clip it */}
      <div className={styles.mobileCta} aria-label="Quick booking options">
        <Link href="/booking" className={styles.mobileBook}>
          📅 Book Free Consultation
        </Link>
        <a
          href="https://wa.me/919876543210?text=Hi%2C+I'd+like+to+book+a+consultation"
          target="_blank" rel="noopener noreferrer"
          className={styles.mobileWa}
        >
          <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
          </svg>
          WhatsApp
        </a>
      </div>
    </>
  )
}