"use client"

// app/(public)/doctors/DoctorsClient.tsx
// Client component: handles specialty filter, card animations, sticky mobile CTA.
// Design system: DM Sans + Cormorant Garamond, teal #0d9488, navy #0a1628

import Link from "next/link"
import { useState, useEffect, useRef } from "react"

// ── Types ─────────────────────────────────────────────────────────────────────
interface Doctor {
  id:              string
  name:            string
  specialty:       string
  experience:      number
  qualifications:  string
  consultationFee: number
  avatar:          string
  rating:          number
  reviewCount:     number
  tags:            string[]
  bio:             string
  availability:    string[]
}

// ── Specialty → accent color map ──────────────────────────────────────────────
const SPEC_COLOR: Record<string, string> = {
  "Orthodontist":      "#7c3aed",
  "Implant Specialist":"#2563eb",
  "Cosmetic Dentist":  "#0d9488",
  "Endodontist":       "#dc2626",
  "Periodontist":      "#16a34a",
  "Prosthodontist":    "#d97706",
  "Pediatric Dentist": "#ec4899",
  "General Dentist":   "#0891b2",
}
const getColor = (s: string) => SPEC_COLOR[s] ?? "#0d9488"

// ── Star row ──────────────────────────────────────────────────────────────────
function Stars({ n }: { n: number }) {
  return (
    <span aria-label={`${n} out of 5`} style={{ display:"inline-flex", gap:2 }}>
      {[1,2,3,4,5].map(i => (
        <svg key={i} width="11" height="11" viewBox="0 0 24 24"
          fill={i <= Math.round(n) ? "#f59e0b" : "#e2e8f0"}>
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
        </svg>
      ))}
    </span>
  )
}

// ── Skeleton card ─────────────────────────────────────────────────────────────
function SkeletonCard() {
  return (
    <div style={{ background:"#fff", borderRadius:22, overflow:"hidden", border:"1px solid rgba(10,22,40,.07)" }}>
      <div style={{ height:220, background:"linear-gradient(90deg,#f1f5f9 25%,#e2e8f0 50%,#f1f5f9 75%)", backgroundSize:"200% 100%", animation:"skShimmer 1.4s infinite" }} />
      <div style={{ padding:"20px 20px 22px", display:"flex", flexDirection:"column", gap:10 }}>
        {[["55%","18px"],["70%","13px"],["90%","13px"],["80%","13px"]].map(([w,h],i) => (
          <div key={i} style={{ width:w, height:h, borderRadius:6, background:"linear-gradient(90deg,#f1f5f9 25%,#e2e8f0 50%,#f1f5f9 75%)", backgroundSize:"200% 100%", animation:"skShimmer 1.4s infinite" }} />
        ))}
      </div>
    </div>
  )
}

// ── Doctor card ───────────────────────────────────────────────────────────────
function DoctorCard({ doc, index }: { doc: Doctor; index: number }) {
  const color = getColor(doc.specialty)
  const ref   = useRef<HTMLDivElement>(null)
  const [vis, setVis] = useState(false)

  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) { setVis(true); obs.disconnect() }
    }, { threshold: 0.08 })
    if (ref.current) obs.observe(ref.current)
    return () => obs.disconnect()
  }, [])

  // Parse which days are available from availability strings like "Mon 09:00-18:00"
  const days = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"]
  const workDays = doc.availability.map(a => a.split(" ")[0]).filter(d => days.includes(d))

  return (
    <article
      ref={ref}
      className="dc-card"
      style={{
        "--c": color,
        opacity:    vis ? 1 : 0,
        transform:  vis ? "translateY(0)" : "translateY(30px)",
        transition: `opacity .55s ease ${index*80}ms, transform .55s ease ${index*80}ms`,
      } as React.CSSProperties}
    >
      {/* Top accent line */}
      <div style={{ height:3, background:`linear-gradient(90deg,${color},transparent)`, flexShrink:0 }} />

      {/* Photo */}
      <div className="dc-img-wrap">
        <img src={doc.avatar} alt={`Photo of ${doc.name}`} className="dc-img" loading="lazy" />
        <div className="dc-img-grad" />

        {/* Rating */}
        <div className="dc-rating">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="#f59e0b">
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
          </svg>
          {doc.rating}
          <span style={{ color:"rgba(255,255,255,.45)", fontWeight:300 }}>({doc.reviewCount})</span>
        </div>

        {/* Specialty */}
        <div className="dc-spec-pill">{doc.specialty}</div>
      </div>

      {/* Body */}
      <div className="dc-body">
        {/* Name + quals */}
        <h2 className="dc-name">{doc.name}</h2>
        <p className="dc-quals">{doc.qualifications}</p>

        {/* Stars */}
        <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:10 }}>
          <Stars n={doc.rating} />
          <span style={{ fontSize:".72rem", color:"#94a3b8" }}>{doc.reviewCount} reviews</span>
        </div>

        {/* Bio */}
        <p className="dc-bio">{doc.bio}</p>

        {/* Tags */}
        <div className="dc-tags">
          {doc.tags.slice(0,3).map(t => (
            <span key={t} className="dc-tag">{t}</span>
          ))}
        </div>

        {/* Meta row */}
        <div className="dc-meta">
          <div className="dc-meta-item">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
            {doc.experience}+ yrs
          </div>
          <div className="dc-meta-item">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>
            {doc.reviewCount}+ patients
          </div>
          <div className="dc-meta-item">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg>
            ₹{doc.consultationFee}
          </div>
        </div>

        {/* Availability */}
        {workDays.length > 0 && (
          <div className="dc-avail">
            <span className="dc-avail-lbl">Available</span>
            {workDays.map(d => <span key={d} className="dc-avail-day">{d}</span>)}
          </div>
        )}

        {/* CTAs */}
        <div className="dc-actions">
          <Link
            href={`/booking?doctorId=${doc.id}`}
            className="dc-btn-book"
            style={{ background:`linear-gradient(135deg,${color},#0a1628)` }}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <rect x="3" y="4" width="18" height="18" rx="2"/>
              <line x1="16" y1="2" x2="16" y2="6"/>
              <line x1="8" y1="2" x2="8" y2="6"/>
              <line x1="3" y1="10" x2="21" y2="10"/>
            </svg>
            Book Appointment
          </Link>
          <a
            href={`https://wa.me/919876543210?text=Hi%2C+I'd+like+to+consult+${encodeURIComponent(doc.name)}`}
            target="_blank" rel="noopener noreferrer"
            className="dc-btn-wa"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="#25d366">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
            </svg>
            WhatsApp
          </a>
        </div>

        {/* Free consultation note */}
        <p className="dc-free">🎉 Free consultation for new patients</p>
      </div>
    </article>
  )
}

// ── Main export ───────────────────────────────────────────────────────────────
export default function DoctorsClient({ doctors, specialties }: { doctors: Doctor[]; specialties: string[] }) {
  const [filter,  setFilter]  = useState("All")
  const [loading, setLoading] = useState(true)

  useEffect(() => { const t = setTimeout(() => setLoading(false), 400); return () => clearTimeout(t) }, [])

  const filtered = filter === "All" ? doctors : doctors.filter(d => d.specialty === filter)

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,700;1,600&family=DM+Sans:wght@300;400;500;600&display=swap');
        @keyframes skShimmer { to { background-position:-200% 0 } }
        @keyframes fadeIn    { from{opacity:0;transform:translateY(14px)} to{opacity:1;transform:translateY(0)} }

        *,*::before,*::after { box-sizing:border-box; }
        .dr-page { font-family:'DM Sans',sans-serif; background:#f9f7f4; min-height:100vh; }

        /* ── Hero ── */
        .dr-hero {
          background:linear-gradient(145deg,#071020 0%,#0a1628 45%,#0c1f3a 100%);
          padding:clamp(80px,11vw,120px) 2rem clamp(60px,8vw,96px);
          text-align:center; position:relative; overflow:hidden;
        }
        .dr-hero::before {
          content:''; position:absolute; top:-20%; left:-15%; width:65vw; height:65vw; border-radius:50%;
          background:radial-gradient(circle,rgba(13,148,136,.12),transparent 65%); pointer-events:none;
        }
        .dr-hero::after {
          content:''; position:absolute; bottom:-20%; right:-15%; width:55vw; height:55vw; border-radius:50%;
          background:radial-gradient(circle,rgba(212,168,67,.07),transparent 65%); pointer-events:none;
        }
        .dr-hero-inner { max-width:700px; margin:0 auto; position:relative; z-index:1; animation:fadeIn .7s ease both; }

        .dr-eyebrow {
          display:inline-flex; align-items:center; gap:8px;
          font-size:.67rem; font-weight:600; letter-spacing:.22em; text-transform:uppercase;
          color:#14b8a6; background:rgba(20,184,166,.1); border:1px solid rgba(20,184,166,.25);
          padding:6px 16px; border-radius:50px; margin-bottom:22px;
        }
        .dr-eyebrow-dot { width:6px; height:6px; border-radius:50%; background:#14b8a6; animation:pulse 2s infinite; }
        @keyframes pulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.4;transform:scale(.75)} }

        .dr-h1 {
          font-family:'Cormorant Garamond',serif;
          font-size:clamp(2.4rem,5.5vw,4.2rem); font-weight:700; color:#fff; line-height:1.08; margin-bottom:18px;
        }
        .dr-h1 em { font-style:italic; color:#14b8a6; }

        .dr-sub { font-size:.95rem; color:rgba(255,255,255,.55); line-height:1.8; font-weight:300; max-width:520px; margin:0 auto 36px; }

        /* Stats strip inside hero */
        .dr-hero-stats {
          display:inline-flex; background:rgba(255,255,255,.05); border:1px solid rgba(255,255,255,.1); border-radius:18px; overflow:hidden;
        }
        .dr-hero-stat { padding:14px 24px; text-align:center; position:relative; }
        .dr-hero-stat + .dr-hero-stat::before {
          content:''; position:absolute; left:0; top:20%; bottom:20%; width:1px; background:rgba(255,255,255,.1);
        }
        .dr-hero-stat-n { font-family:'Cormorant Garamond',serif; font-size:1.6rem; font-weight:700; color:#fff; line-height:1; display:block; }
        .dr-hero-stat-l { font-size:.6rem; color:rgba(255,255,255,.38); letter-spacing:.12em; text-transform:uppercase; margin-top:3px; display:block; }

        /* ── Filter bar ── */
        .dr-filter-wrap {
          max-width:1200px; margin:0 auto; padding:28px 2rem 0;
          display:flex; align-items:center; gap:8px; flex-wrap:wrap;
        }
        .dr-filter-lbl { font-size:.68rem; font-weight:600; letter-spacing:.12em; text-transform:uppercase; color:#94a3b8; flex-shrink:0; }
        .dr-filter-btn {
          padding:7px 16px; border-radius:50px; border:1.5px solid rgba(10,22,40,.1); background:#fff;
          font-family:'DM Sans',sans-serif; font-size:.78rem; font-weight:500; color:#64748b;
          cursor:pointer; transition:all .18s; white-space:nowrap;
        }
        .dr-filter-btn:hover { border-color:#0d9488; color:#0d9488; background:rgba(13,148,136,.04); }
        .dr-filter-btn.on { background:#0a1628; color:#fff; border-color:#0a1628; }

        /* ── Grid ── */
        .dr-grid-wrap { max-width:1200px; margin:0 auto; padding:28px 2rem 100px; }
        .dr-count { font-size:.8rem; color:#94a3b8; margin-bottom:22px; }
        .dr-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(300px,1fr)); gap:24px; }

        /* ── Card ── */
        .dc-card {
          background:#fff; border-radius:22px; overflow:hidden; display:flex; flex-direction:column;
          border:1px solid rgba(10,22,40,.07); box-shadow:0 4px 20px rgba(10,22,40,.06);
          transition:transform .32s cubic-bezier(.34,1.56,.64,1), box-shadow .32s;
        }
        .dc-card:hover { transform:translateY(-8px); box-shadow:0 18px 50px rgba(10,22,40,.12); }

        .dc-img-wrap { position:relative; height:220px; overflow:hidden; flex-shrink:0; }
        .dc-img { width:100%; height:100%; object-fit:cover; object-position:top center; transition:transform .4s ease; }
        .dc-card:hover .dc-img { transform:scale(1.05); }
        .dc-img-grad { position:absolute; inset:0; background:linear-gradient(180deg,transparent 40%,rgba(10,22,40,.7) 100%); }

        .dc-rating {
          position:absolute; top:12px; right:12px;
          background:rgba(10,22,40,.82); backdrop-filter:blur(8px);
          border:1px solid rgba(255,255,255,.1); border-radius:50px;
          padding:4px 10px; font-size:.74rem; font-weight:600; color:#f59e0b;
          display:flex; align-items:center; gap:4px;
        }
        .dc-spec-pill {
          position:absolute; bottom:14px; left:14px;
          background:var(--c); color:#fff;
          font-size:.6rem; font-weight:700; letter-spacing:.1em; text-transform:uppercase;
          padding:4px 11px; border-radius:50px;
        }

        .dc-body { padding:18px 20px 20px; display:flex; flex-direction:column; gap:0; flex:1; }
        .dc-name { font-family:'Cormorant Garamond',serif; font-size:1.2rem; font-weight:700; color:#0a1628; margin-bottom:2px; }
        .dc-quals { font-size:.7rem; color:#94a3b8; margin-bottom:8px; }
        .dc-bio { font-size:.81rem; color:#64748b; line-height:1.6; font-weight:300; margin-bottom:12px; }

        .dc-tags { display:flex; flex-wrap:wrap; gap:5px; margin-bottom:12px; }
        .dc-tag {
          font-size:.65rem; font-weight:500; padding:3px 9px; border-radius:50px;
          background:color-mix(in srgb,var(--c) 10%,transparent); color:var(--c);
        }
        .dc-meta { display:flex; gap:12px; margin-bottom:12px; flex-wrap:wrap; }
        .dc-meta-item { display:flex; align-items:center; gap:4px; font-size:.73rem; color:#64748b; }

        .dc-avail { display:flex; align-items:center; gap:6px; margin-bottom:14px; flex-wrap:wrap; }
        .dc-avail-lbl { font-size:.62rem; font-weight:600; letter-spacing:.1em; text-transform:uppercase; color:#94a3b8; }
        .dc-avail-day { font-size:.65rem; font-weight:500; padding:2px 7px; border-radius:5px; background:rgba(13,148,136,.08); color:#0d9488; }

        .dc-actions { display:flex; gap:8px; margin-bottom:10px; margin-top:auto; }
        .dc-btn-book {
          flex:1; text-align:center; text-decoration:none; color:#fff;
          font-family:'DM Sans',sans-serif; font-size:.78rem; font-weight:600;
          padding:10px 12px; border-radius:10px; display:flex; align-items:center; justify-content:center; gap:6px;
          box-shadow:0 3px 12px rgba(0,0,0,.18); transition:opacity .18s,transform .18s;
        }
        .dc-btn-book:hover { opacity:.88; transform:translateY(-1px); }
        .dc-btn-wa {
          display:flex; align-items:center; gap:6px; padding:10px 13px; border-radius:10px;
          border:1.5px solid rgba(37,211,102,.3); background:rgba(37,211,102,.06);
          color:#15803d; font-family:'DM Sans',sans-serif; font-size:.78rem; font-weight:600;
          text-decoration:none; white-space:nowrap; transition:all .18s;
        }
        .dc-btn-wa:hover { background:rgba(37,211,102,.14); border-color:rgba(37,211,102,.5); }
        .dc-free { font-size:.68rem; color:#0d9488; text-align:center; background:rgba(13,148,136,.06); border-radius:7px; padding:5px 8px; }

        /* ── Empty state ── */
        .dr-empty { text-align:center; padding:64px 20px; color:#94a3b8; }

        /* ── Trust strip ── */
        .dr-trust { background:linear-gradient(135deg,#0a1628,#0f2240); padding:48px 2rem; }
        .dr-trust-inner {
          max-width:1100px; margin:0 auto;
          display:grid; grid-template-columns:repeat(auto-fit,minmax(190px,1fr)); gap:24px;
        }
        .dr-trust-item { display:flex; align-items:center; gap:12px; }
        .dr-trust-icon { width:42px; height:42px; border-radius:11px; background:rgba(13,148,136,.14); display:flex; align-items:center; justify-content:center; font-size:1.1rem; flex-shrink:0; }
        .dr-trust-t { font-size:.82rem; font-weight:500; color:rgba(255,255,255,.82); }
        .dr-trust-s { font-size:.68rem; color:rgba(255,255,255,.35); margin-top:2px; }

        /* ── Mobile sticky bar ── */
        .dr-sticky {
          display:none; position:fixed; bottom:0; left:0; right:0; z-index:200;
          background:#fff; border-top:1px solid rgba(10,22,40,.1);
          padding:10px 16px; gap:10px; box-shadow:0 -4px 20px rgba(10,22,40,.1);
        }
        @media(max-width:768px) { .dr-sticky { display:flex; } }
        .dr-sticky-book {
          flex:1; text-align:center; padding:13px;
          background:linear-gradient(135deg,#0d9488,#0a1628); color:#fff;
          border-radius:12px; text-decoration:none;
          font-family:'DM Sans',sans-serif; font-size:.86rem; font-weight:600;
        }
        .dr-sticky-wa {
          padding:13px 16px; border-radius:12px;
          background:rgba(37,211,102,.1); border:1.5px solid rgba(37,211,102,.3);
          display:flex; align-items:center; gap:6px; text-decoration:none;
          font-family:'DM Sans',sans-serif; font-size:.86rem; font-weight:600; color:#15803d; white-space:nowrap;
        }

        @media(max-width:640px) {
          .dr-hero-stats { flex-direction:column; width:min(280px,90vw); }
          .dr-hero-stat + .dr-hero-stat::before { top:0; left:15%; right:15%; width:auto; height:1px; }
          .dr-grid { grid-template-columns:1fr; }
        }
      `}</style>

      <div className="dr-page">

        {/* ── Hero ── */}
        <section className="dr-hero" aria-label="Doctors page header">
          <div className="dr-hero-inner">
            <div className="dr-eyebrow">
              <span className="dr-eyebrow-dot" aria-hidden="true" />
              🩺 Board-Certified Specialists
            </div>
            <h1 className="dr-h1">Meet Our <em>Expert</em><br/>Dental Team</h1>
            <p className="dr-sub">Trusted by 20,000+ patients. Our specialists combine cutting-edge techniques with genuine compassionate care.</p>
            <div className="dr-hero-stats" role="list">
              {[
                { n:`${doctors.length}+`, l:"Specialists"    },
                { n:"20k+",              l:"Patients"        },
                { n:"4.9★",             l:"Avg. Rating"     },
                { n:"12+",              l:"Yrs Avg. Exp."   },
              ].map(s => (
                <div key={s.l} className="dr-hero-stat" role="listitem">
                  <span className="dr-hero-stat-n">{s.n}</span>
                  <span className="dr-hero-stat-l">{s.l}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Specialty filter ── */}
        <div className="dr-filter-wrap" role="group" aria-label="Filter by specialty">
          <span className="dr-filter-lbl">Filter</span>
          {specialties.map(s => (
            <button key={s} className={`dr-filter-btn${filter===s?" on":""}`} onClick={() => setFilter(s)}>
              {s}
            </button>
          ))}
        </div>

        {/* ── Grid ── */}
        <div className="dr-grid-wrap">
          <p className="dr-count">{filtered.length} specialist{filtered.length!==1?"s":""} found</p>

          {loading ? (
            <div className="dr-grid">
              {[1,2,3].map(n => <SkeletonCard key={n} />)}
            </div>
          ) : filtered.length === 0 ? (
            <div className="dr-empty">
              <div style={{ fontSize:"2.5rem", marginBottom:12 }}>🔍</div>
              <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:"1.1rem", fontWeight:700, color:"#0a1628", marginBottom:6 }}>
                No specialists found
              </div>
              <p>Try selecting "All" or a different specialty.</p>
            </div>
          ) : (
            <div className="dr-grid">
              {filtered.map((doc, i) => (
                <DoctorCard key={doc.id} doc={doc} index={i} />
              ))}
            </div>
          )}
        </div>

        {/* ── Trust strip ── */}
        <div className="dr-trust" aria-label="Clinic credentials">
          <div className="dr-trust-inner">
            {[
              { icon:"🏆", t:"Award-Winning Clinic",   s:"Best Dental Clinic Pune 2024"   },
              { icon:"🎓", t:"Board Certified",         s:"All doctors MDS qualified"       },
              { icon:"💬", t:"Free Consultation",       s:"For all new patients"            },
              { icon:"⏰", t:"Same-Day Slots",          s:"Emergency appointments available" },
              { icon:"🔒", t:"Patient Privacy",         s:"HIPAA-aligned records"           },
            ].map(t => (
              <div key={t.t} className="dr-trust-item">
                <div className="dr-trust-icon" aria-hidden="true">{t.icon}</div>
                <div><div className="dr-trust-t">{t.t}</div><div className="dr-trust-s">{t.s}</div></div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Mobile sticky CTA ── */}
        <div className="dr-sticky" aria-label="Book appointment">
          <Link href="/booking" className="dr-sticky-book">Book Free Consultation</Link>
          <a href="https://wa.me/919876543210" target="_blank" rel="noopener noreferrer" className="dr-sticky-wa">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="#25d366">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
            </svg>
            WhatsApp
          </a>
        </div>

      </div>
    </>
  )
}
