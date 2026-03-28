"use client"

// components/home/TestimonialsSection.tsx
// ─────────────────────────────────────────────────────────────────────────────
// GET /api/testimonials → Testimonial[]
// Field contract preserved: id, name, avatar, rating, treatment, text, date
// ─────────────────────────────────────────────────────────────────────────────

import Link from "next/link"
import {
  useState, useEffect, useRef, useCallback, memo,
  type CSSProperties,
} from "react"

// ── Data — matches backend field contract ─────────────────────────────────────
const TESTIMONIALS = [
  {
    id:"1", name:"Priya Sharma", avatar:"https://i.pravatar.cc/80?img=47",
    rating:5, treatment:"Dental Implants",
    text:"I had severe anxiety about implants but Dr. Michael made the whole process so smooth and painless. The results are absolutely stunning — feels completely natural!",
    date:"March 2025",
  },
  {
    id:"2", name:"Rahul Mehta", avatar:"https://i.pravatar.cc/80?img=12",
    rating:5, treatment:"Invisalign",
    text:"Dr. Sarah transformed my smile in just 8 months with Invisalign. The online booking system was super convenient and the staff is incredibly professional throughout.",
    date:"February 2025",
  },
  {
    id:"3", name:"Sneha Patel", avatar:"https://i.pravatar.cc/80?img=32",
    rating:5, treatment:"Teeth Whitening",
    text:"Walked out 6 shades whiter in just 60 minutes! The clinic is immaculate, modern and the AI receptionist booked my follow-up automatically. Truly 5-star experience.",
    date:"January 2025",
  },
  {
    id:"4", name:"Arjun Nair", avatar:"https://i.pravatar.cc/80?img=53",
    rating:5, treatment:"Root Canal",
    text:"Root canals used to terrify me — this was genuinely pain-free. The rotary technology they use is next level. I was eating normally the same evening.",
    date:"March 2025",
  },
  {
    id:"5", name:"Meera Iyer", avatar:"https://i.pravatar.cc/80?img=23",
    rating:5, treatment:"Veneers",
    text:"Dr. Emma is an absolute artist. My porcelain veneers look so natural people don't even realise they're veneers. I've never been more confident smiling.",
    date:"February 2025",
  },
  {
    id:"6", name:"Karan Singh", avatar:"https://i.pravatar.cc/80?img=15",
    rating:4, treatment:"Orthodontics",
    text:"Great experience overall. The team is thorough, explains everything clearly, and the dashboard to track my treatment progress is a really clever touch.",
    date:"January 2025",
  },
] as const

type Testimonial = typeof TESTIMONIALS[number]

const ALL_TREATMENTS = [
  "All",
  ...Array.from(new Set(TESTIMONIALS.map(t => t.treatment))),
]

// ── Memoised star rating ──────────────────────────────────────────────────────
const Stars = memo(function Stars({ n }: { n: number }) {
  return (
    <span className="tm2-stars" aria-label={`${n} out of 5 stars`}>
      {[1,2,3,4,5].map(i => (
        <svg
          key={i} width="12" height="12" viewBox="0 0 24 24"
          fill={i <= n ? "#f59e0b" : "rgba(255,255,255,.15)"}
          aria-hidden="true"
        >
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
        </svg>
      ))}
    </span>
  )
})

// ── Testimonial card ──────────────────────────────────────────────────────────
const TestimonialCard = memo(function TestimonialCard({
  t, visible, delay,
}: {
  t: Testimonial; visible: boolean; delay: number
}) {
  return (
    <article
      className="tm2-card"
      style={{
        opacity:    visible ? 1 : 0,
        transform:  visible ? "translateY(0)" : "translateY(28px)",
        transition: `opacity .55s ease ${delay}ms, transform .55s ease ${delay}ms`,
      } as CSSProperties}
      aria-label={`Review by ${t.name}`}
    >
      <div className="tm2-bigquote" aria-hidden="true">"</div>
      <div className="tm2-badge">{t.treatment}</div>
      <blockquote className="tm2-text"><p>{t.text}</p></blockquote>
      <footer className="tm2-footer">
        <img
          src={t.avatar} alt={t.name} className="tm2-avatar"
          loading="lazy" width={42} height={42}
        />
        <div className="tm2-author">
          <div className="tm2-name">{t.name}</div>
          <div className="tm2-date">{t.date}</div>
        </div>
        <div className="tm2-stars-wrap"><Stars n={t.rating} /></div>
      </footer>
    </article>
  )
})

// ── Main component ────────────────────────────────────────────────────────────
export default function TestimonialsSection() {
  const rootRef  = useRef<HTMLElement>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined)

  const [visible, setVisible] = useState(false)
  const [filter,  setFilter]  = useState("All")
  const [page,    setPage]    = useState(0)
  const [paused,  setPaused]  = useState(false)

  const PER_PAGE = 3
  const filtered    = filter === "All" ? [...TESTIMONIALS] : TESTIMONIALS.filter(t => t.treatment === filter)
  const totalPages  = Math.max(1, Math.ceil(filtered.length / PER_PAGE))
  const currentPage = Math.min(page, totalPages - 1)
  const currentCards = filtered.slice(currentPage * PER_PAGE, (currentPage + 1) * PER_PAGE)

  // Reset page when filter changes
  useEffect(() => { setPage(0) }, [filter])

  // Auto-advance
  useEffect(() => {
    if (paused || totalPages <= 1) return
    timerRef.current = setInterval(() => setPage(p => (p + 1) % totalPages), 5000)
    return () => clearInterval(timerRef.current)
  }, [paused, totalPages, filter])

  const prev  = useCallback(() => setPage(p => (p - 1 + totalPages) % totalPages), [totalPages])
  const next  = useCallback(() => setPage(p => (p + 1) % totalPages), [totalPages])
  const goTo  = useCallback((i: number) => setPage(i), [])

  // Intersection
  useEffect(() => {
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setVisible(true); obs.disconnect() } },
      { threshold: 0.1 }
    )
    if (rootRef.current) obs.observe(rootRef.current)
    return () => obs.disconnect()
  }, [])

  const vis = (delay = 0): CSSProperties => ({
    opacity:    visible ? 1 : 0,
    transform:  visible ? "translateY(0)" : "translateY(20px)",
    transition: `opacity .6s ease ${delay}ms, transform .6s ease ${delay}ms`,
  })

  return (
    <>
      <style>{`
        .tm2-root {
          padding: var(--section-py,100px) var(--container-px,2rem);
          background: linear-gradient(155deg,var(--navy,#0a1628) 0%,var(--navy-mid,#0f2240) 65%,#0c2232 100%);
          position: relative; overflow: hidden;
        }
        .tm2-root::before {
          content:''; position:absolute; top:-80px; left:-80px;
          width:420px; height:420px; border-radius:50%;
          background:radial-gradient(circle,rgba(13,148,136,.09),transparent 65%);
          pointer-events:none;
        }
        .tm2-root::after {
          content:''; position:absolute; bottom:-80px; right:-80px;
          width:380px; height:380px; border-radius:50%;
          background:radial-gradient(circle,rgba(212,168,67,.06),transparent 65%);
          pointer-events:none;
        }
        .tm2-inner { max-width:var(--container,1200px); margin:0 auto; position:relative; z-index:1; }

        /* ── Header ── */
        .tm2-head { text-align:center; margin-bottom:clamp(32px,4vw,48px); }
        .tm2-h2 {
          font-family:var(--font-serif,'Cormorant Garamond',serif);
          font-size:clamp(2rem,4vw,3.2rem); font-weight:700; color:#fff;
          line-height:1.1; margin-bottom:10px;
        }
        .tm2-h2 em { font-style:italic; color:var(--teal-light,#14b8a6); }
        .tm2-sub {
          font-size:.9rem; color:rgba(255,255,255,.45);
          max-width:420px; margin:0 auto; font-weight:300; line-height:1.6;
        }

        /* Rating strip */
        .tm2-rating-strip {
          display:inline-flex; align-items:center; gap:14px; margin-top:20px;
          background:rgba(255,255,255,.05); border:1px solid rgba(255,255,255,.08);
          border-radius:9999px; padding:10px 24px;
        }
        .tm2-rating-num {
          font-family:var(--font-serif,'Cormorant Garamond',serif);
          font-size:2rem; font-weight:700; color:#fff; line-height:1;
        }
        .tm2-stars { display:inline-flex; gap:2px; }
        .tm2-rating-text { font-size:.7rem; color:rgba(255,255,255,.38); margin-top:2px; white-space:nowrap; }

        /* Platform badges */
        .tm2-platforms { display:flex; justify-content:center; gap:10px; margin-top:12px; flex-wrap:wrap; }
        .tm2-platform {
          display:inline-flex; align-items:center; gap:6px;
          font-size:.67rem; font-weight:600; color:rgba(255,255,255,.32);
          background:rgba(255,255,255,.04); border:1px solid rgba(255,255,255,.07);
          padding:4px 12px; border-radius:9999px;
        }
        .tm2-platform-dot { width:6px; height:6px; border-radius:50%; }

        /* ── Filter tabs ── */
        .tm2-filters {
          display:flex; justify-content:center; gap:7px; flex-wrap:wrap;
          margin-bottom:clamp(24px,3.5vw,36px);
        }
        .tm2-filter {
          font-family:var(--font-sans,'DM Sans',sans-serif);
          font-size:.78rem; font-weight:500;
          padding:7px 16px; border-radius:9999px; cursor:pointer;
          border:1.5px solid rgba(255,255,255,.1);
          background:transparent; color:rgba(255,255,255,.46);
          transition:all .2s ease;
        }
        .tm2-filter:hover { background:rgba(255,255,255,.07); color:rgba(255,255,255,.82); border-color:rgba(255,255,255,.2); }
        .tm2-filter-on { background:var(--teal,#0d9488) !important; border-color:var(--teal,#0d9488) !important; color:#fff !important; box-shadow:0 3px 16px rgba(13,148,136,.28); }
        .tm2-filter:focus-visible { outline:2px solid var(--teal,#0d9488); outline-offset:3px; }

        /* ── Grid ── */
        .tm2-grid {
          display:grid; grid-template-columns:repeat(3,1fr); gap:18px; min-height:280px;
        }
        @media(max-width:900px){ .tm2-grid{ grid-template-columns:repeat(2,1fr); } }
        @media(max-width:560px){ .tm2-grid{ grid-template-columns:1fr; } }

        /* ── Card ── */
        .tm2-card {
          background:rgba(255,255,255,.04); border:1px solid rgba(255,255,255,.08);
          border-radius:var(--r-lg,20px); padding:clamp(20px,2.5vw,28px);
          display:flex; flex-direction:column; will-change:transform,opacity;
          transition:background .22s ease, border-color .22s ease, transform .28s ease, box-shadow .28s ease;
        }
        .tm2-card:hover {
          background:rgba(255,255,255,.07); border-color:rgba(13,148,136,.22);
          transform:translateY(-5px); box-shadow:0 14px 44px rgba(0,0,0,.25);
        }
        .tm2-bigquote {
          font-family:var(--font-serif,'Cormorant Garamond',serif);
          font-size:4.5rem; font-weight:700; line-height:.85;
          color:rgba(20,184,166,.17); margin-bottom:6px;
          display:block; height:2.8rem; overflow:hidden; user-select:none;
        }
        .tm2-badge {
          display:inline-flex; align-items:center;
          font-size:.62rem; font-weight:700; letter-spacing:.12em; text-transform:uppercase;
          color:var(--teal-light,#14b8a6); background:rgba(13,148,136,.12);
          border:1px solid rgba(13,148,136,.22); padding:3px 11px; border-radius:9999px;
          margin-bottom:13px; width:fit-content;
        }
        .tm2-text { font-size:.86rem; color:rgba(255,255,255,.72); line-height:1.72; font-weight:300; font-style:italic; flex:1; margin-bottom:18px; }
        .tm2-text p { margin:0; }
        .tm2-footer { display:flex; align-items:center; gap:12px; padding-top:14px; border-top:1px solid rgba(255,255,255,.07); }
        .tm2-avatar {
          width:42px; height:42px; border-radius:50%; object-fit:cover; flex-shrink:0;
          border:2px solid var(--teal,#0d9488);
          box-shadow:0 0 0 2px rgba(13,148,136,.18);
        }
        .tm2-author { flex:1; min-width:0; }
        .tm2-name { font-size:.87rem; font-weight:500; color:#fff; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
        .tm2-date { font-size:.68rem; color:rgba(255,255,255,.3); margin-top:1px; }
        .tm2-stars-wrap { flex-shrink:0; }

        /* ── Empty state ── */
        .tm2-empty {
          grid-column:1/-1; text-align:center; padding:48px 24px;
          color:rgba(255,255,255,.3); font-size:.9rem; font-weight:300;
        }

        /* ── Progress bar ── */
        .tm2-progress-wrap { height:2px; background:rgba(255,255,255,.07); border-radius:2px; margin-top:18px; overflow:hidden; }
        .tm2-progress-bar {
          height:100%; border-radius:2px; background:var(--teal,#0d9488);
          animation:tm2Prog 5s linear infinite;
        }
        .tm2-progress-bar.paused { animation-play-state:paused; }
        @keyframes tm2Prog { from{width:0%} to{width:100%} }

        /* ── Controls ── */
        .tm2-controls { display:flex; align-items:center; justify-content:center; gap:14px; margin-top:clamp(22px,3vw,32px); }
        .tm2-arrow {
          width:40px; height:40px; border-radius:50%;
          border:1.5px solid rgba(255,255,255,.14); background:rgba(255,255,255,.05);
          color:rgba(255,255,255,.58); cursor:pointer;
          display:flex; align-items:center; justify-content:center;
          font-family:var(--font-sans,sans-serif);
          transition:background .18s,border-color .18s,color .18s;
        }
        .tm2-arrow:hover { background:rgba(13,148,136,.2); border-color:rgba(13,148,136,.5); color:#fff; }
        .tm2-arrow:focus-visible { outline:2px solid var(--teal,#0d9488); outline-offset:3px; }
        .tm2-dots { display:flex; gap:7px; align-items:center; }
        .tm2-dot {
          width:7px; height:7px; border-radius:9999px; background:rgba(255,255,255,.18);
          border:none; cursor:pointer; font-family:var(--font-sans,sans-serif);
          transition:all .22s ease;
        }
        .tm2-dot-on { width:22px !important; background:var(--teal-light,#14b8a6) !important; }
        .tm2-dot:focus-visible { outline:2px solid var(--teal,#0d9488); outline-offset:2px; }
        .tm2-counter { font-size:.72rem; color:rgba(255,255,255,.3); font-family:var(--font-mono,'DM Mono',monospace); min-width:44px; text-align:center; }

        /* ── CTA strip ── */
        .tm2-cta {
          display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:16px;
          margin-top:clamp(36px,5vw,54px); padding:22px 28px;
          background:rgba(255,255,255,.04); border:1px solid rgba(255,255,255,.07);
          border-radius:var(--r-xl,24px);
        }
        .tm2-cta-left { display:flex; flex-direction:column; gap:4px; }
        .tm2-cta-eyebrow { font-size:.67rem; font-weight:600; letter-spacing:.14em; text-transform:uppercase; color:var(--teal-light,#14b8a6); }
        .tm2-cta-title {
          font-family:var(--font-serif,'Cormorant Garamond',serif);
          font-size:clamp(1.05rem,1.8vw,1.35rem); font-weight:700; color:#fff; line-height:1.2;
        }
        .tm2-cta-actions { display:flex; gap:10px; flex-wrap:wrap; }
        @media(max-width:480px){ .tm2-cta{ flex-direction:column; align-items:flex-start; } }
      `}</style>

      <section
        className="tm2-root"
        ref={rootRef}
        aria-labelledby="tm2-heading"
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
      >
        <div className="tm2-inner">

          {/* ── Header ── */}
          <div className="tm2-head" style={vis(0)}>
            <div className="section-eyebrow section-eyebrow--light" style={{ marginBottom:"16px" }}>
              💬 Patient Stories
            </div>
            <h2 className="tm2-h2" id="tm2-heading">
              <em>Real Results,</em> Real Smiles
            </h2>
            <p className="tm2-sub">
              Hear from the thousands of patients who trust us with their dental health.
            </p>

            {/* Rating strip */}
            <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:"10px", marginTop:"20px" }}>
              <div className="tm2-rating-strip">
                <div className="tm2-rating-num" aria-label="4.9 average rating">4.9</div>
                <div>
                  <Stars n={5} />
                  <div className="tm2-rating-text">1,200+ verified reviews</div>
                </div>
              </div>

              {/* Platform trust badges */}
              <div className="tm2-platforms">
                {[
                  { name:"Google Reviews",  color:"#4285f4" },
                  { name:"Practo Verified", color:"#5dbea3" },
                  { name:"JustDial 4.9★",  color:"#e74c3c" },
                ].map(p => (
                  <div key={p.name} className="tm2-platform">
                    <div className="tm2-platform-dot" style={{ background:p.color }} aria-hidden="true"/>
                    {p.name}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ── Filter tabs ── */}
          <div
            className="tm2-filters"
            style={vis(80)}
            role="tablist"
            aria-label="Filter reviews by treatment"
          >
            {ALL_TREATMENTS.map(treatment => (
              <button
                key={treatment}
                className={`tm2-filter${filter === treatment ? " tm2-filter-on" : ""}`}
                onClick={() => setFilter(treatment)}
                role="tab"
                aria-selected={filter === treatment}
              >
                {treatment}
              </button>
            ))}
          </div>

          {/* ── Cards grid ── */}
          <div
            className="tm2-grid"
            style={vis(140)}
            role="region"
            aria-label="Patient testimonials"
            aria-live="polite"
          >
            {currentCards.length === 0 ? (
              <div className="tm2-empty">No reviews for this treatment yet.</div>
            ) : (
              currentCards.map((t, i) => (
                <TestimonialCard
                  key={`${t.id}-${filter}-${currentPage}`}
                  t={t}
                  visible={visible}
                  delay={i * 85}
                />
              ))
            )}
          </div>

          {/* Progress bar */}
          {totalPages > 1 && (
            <div className="tm2-progress-wrap" aria-hidden="true">
              <div
                key={`${currentPage}-${filter}`}
                className={`tm2-progress-bar${paused ? " paused" : ""}`}
              />
            </div>
          )}

          {/* Carousel controls */}
          {totalPages > 1 && (
            <div className="tm2-controls" style={vis(200)}>
              <button className="tm2-arrow" onClick={prev} aria-label="Previous reviews">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
                  stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
                  <polyline points="15 18 9 12 15 6"/>
                </svg>
              </button>

              <div className="tm2-dots" role="list">
                {Array.from({ length: totalPages }).map((_, i) => (
                  <button
                    key={i}
                    className={`tm2-dot${currentPage === i ? " tm2-dot-on" : ""}`}
                    onClick={() => goTo(i)}
                    aria-label={`Go to page ${i + 1}`}
                    role="listitem"
                  />
                ))}
              </div>

              <span className="tm2-counter" aria-live="polite">
                {currentPage + 1} / {totalPages}
              </span>

              <button className="tm2-arrow" onClick={next} aria-label="Next reviews">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
                  stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
                  <polyline points="9 18 15 12 9 6"/>
                </svg>
              </button>
            </div>
          )}

          {/* ── CTA strip ── */}
          <div className="tm2-cta" style={vis(240)}>
            <div className="tm2-cta-left">
              <div className="tm2-cta-eyebrow">Join thousands of happy patients</div>
              <div className="tm2-cta-title">Your smile transformation starts today</div>
            </div>
            <div className="tm2-cta-actions">
              <Link href="/booking" className="btn-primary">
                Book Free Consultation
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
                  stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                  <polyline points="9 18 15 12 9 6"/>
                </svg>
              </Link>
              <Link href="/doctors" className="btn-ghost btn-ghost--light">
                Meet Our Doctors
              </Link>
            </div>
          </div>

        </div>
      </section>
    </>
  )
}