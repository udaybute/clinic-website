"use client"

// app/(public)/services/page.tsx
// FIX: "Details →" was linking to /services/1, /services/2 etc (numeric IDs)
//      but the detail page uses slug IDs (teeth-whitening, dental-implants, etc.)
//      causing 404. Now imports from lib/services.data.ts — single source of truth.
//      All IDs guaranteed to match generateStaticParams in the detail page.

import Link              from "next/link"
import { useState, useEffect, useRef } from "react"
import { SERVICES }      from "@/lib/services.data"

// Map the shared Service type to what the card needs — add display-only fields
// that are not part of the core Service data model.
const CARD_META: Record<string, { icon: string; color: string; benefits: string[] }> = {
  "teeth-cleaning":   { icon:"🦷", color:"#0d9488", benefits:["Plaque & tartar removal","Gum disease prevention","Brighter enamel"] },
  "teeth-whitening":  { icon:"✨", color:"#7c3aed", benefits:["Up to 8 shades brighter","Single session","No sensitivity formula"] },
  "dental-implants":  { icon:"🔩", color:"#2563eb", benefits:["Lifetime durability","Bone-preserving","Natural appearance"] },
  "root-canal":       { icon:"💉", color:"#dc2626", benefits:["Pain-free procedure","Saves natural tooth","Single-visit option"] },
  "orthodontics":     { icon:"😁", color:"#d97706", benefits:["Nearly invisible","Removable for eating","3D preview before start"] },
  "cosmetic-veneers": { icon:"💎", color:"#059669", benefits:["Custom-designed","Stain-resistant","10–20 yr lifespan"] },
  "dental-checkup":   { icon:"🩺", color:"#0891b2", benefits:["Early problem detection","Oral cancer screening","Digital X-rays"] },
  "gum-contouring":   { icon:"🔬", color:"#ec4899", benefits:["Laser precision","Minimal downtime","Immediate results"] },
}

// Merge shared data with display-only meta — IDs always come from services.data.ts
const ALL_SERVICES = SERVICES.map(s => ({
  ...s,
  icon:     CARD_META[s.id]?.icon     ?? "🦷",
  color:    CARD_META[s.id]?.color    ?? "#0d9488",
  // Use benefits from services.data.ts if available, else card meta fallback
  cardBenefits: s.benefits ?? CARD_META[s.id]?.benefits ?? [],
  // Format price for display
  priceDisplay: `₹${s.price.toLocaleString("en-IN")}`,
}))

const CATEGORIES = ["All", ...Array.from(new Set(ALL_SERVICES.map(s => s.category)))]

// ── Service card ──────────────────────────────────────────────────────────────
function ServiceCard({ s, index }: { s: typeof ALL_SERVICES[0]; index: number }) {
  const ref = useRef<HTMLDivElement>(null)
  const [vis, setVis] = useState(false)

  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) { setVis(true); obs.disconnect() }
    }, { threshold: 0.08 })
    if (ref.current) obs.observe(ref.current)
    return () => obs.disconnect()
  }, [])

  return (
    <article
      ref={ref as any}
      className="sc-card"
      style={{
        "--c":       s.color,
        opacity:     vis ? 1 : 0,
        transform:   vis ? "translateY(0)" : "translateY(28px)",
        transition:  `opacity .5s ease ${index * 60}ms, transform .5s ease ${index * 60}ms`,
      } as React.CSSProperties}
    >
      {/* Image */}
      <div className="sc-img-wrap">
        <img
          src={s.image ?? "https://images.unsplash.com/photo-1588776814546-1ffcf47267a5?w=600&h=360&fit=crop&auto=format&q=80"}
          alt={s.name}
          className="sc-img"
          loading="lazy"
        />
        <div className="sc-img-grad" />
        {s.popular && <div className="sc-popular">⭐ Popular</div>}
        <div className="sc-duration">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
          </svg>
          {s.duration} min
        </div>
        <div className="sc-price">{s.priceDisplay}</div>
      </div>

      {/* Body */}
      <div className="sc-body">
        <div className="sc-icon-wrap">{s.icon}</div>
        <div className="sc-cat">{s.category}</div>
        <h2 className="sc-name">{s.name}</h2>
        <p className="sc-desc">{s.description}</p>

        <ul className="sc-benefits">
          {s.cardBenefits.slice(0, 3).map(b => (
            <li key={b} className="sc-benefit">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none"
                stroke={s.color} strokeWidth="2.5" strokeLinecap="round">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
              {b}
            </li>
          ))}
        </ul>

        <div className="sc-actions">
          <Link
            href="/booking"
            className="sc-btn-book"
            style={{ background: `linear-gradient(135deg,${s.color},#0a1628)` }}
          >
            Book Now
          </Link>
          {/* FIX: uses s.id from services.data.ts (slug) not a hardcoded number */}
          <Link href={`/services/${s.id}`} className="sc-btn-detail">
            Details →
          </Link>
        </div>
      </div>
    </article>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function ServicesPage() {
  const [active, setActive] = useState("All")
  const [search, setSearch] = useState("")

  const filtered = ALL_SERVICES.filter(s => {
    const matchCat    = active === "All" || s.category === active
    const matchSearch = s.name.toLowerCase().includes(search.toLowerCase()) ||
                        s.category.toLowerCase().includes(search.toLowerCase())
    return matchCat && matchSearch
  })

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,700;1,600&family=DM+Sans:wght@300;400;500;600&display=swap');
        @keyframes fadeIn { from{opacity:0;transform:translateY(14px)} to{opacity:1;transform:translateY(0)} }
        *,*::before,*::after { box-sizing:border-box; }

        .svc-page { font-family:'DM Sans',sans-serif; background:#f9f7f4; min-height:100vh; }

        /* ── Hero ── */
        .svc-hero {
          background:linear-gradient(145deg,#071020 0%,#0a1628 45%,#0c1f3a 100%);
          padding:clamp(80px,11vw,120px) 2rem clamp(56px,8vw,88px);
          text-align:center; position:relative; overflow:hidden;
        }
        .svc-hero::before {
          content:''; position:absolute; top:-20%; right:-10%; width:60vw; height:60vw; border-radius:50%;
          background:radial-gradient(circle,rgba(13,148,136,.1),transparent 65%); pointer-events:none;
        }
        .svc-hero::after {
          content:''; position:absolute; bottom:-20%; left:-10%; width:50vw; height:50vw; border-radius:50%;
          background:radial-gradient(circle,rgba(212,168,67,.07),transparent 65%); pointer-events:none;
        }
        .svc-hero-inner { max-width:680px; margin:0 auto; position:relative; z-index:1; animation:fadeIn .7s ease both; }
        .svc-eyebrow {
          display:inline-flex; align-items:center; gap:8px;
          font-size:.67rem; font-weight:600; letter-spacing:.22em; text-transform:uppercase;
          color:#14b8a6; background:rgba(20,184,166,.1); border:1px solid rgba(20,184,166,.25);
          padding:6px 16px; border-radius:50px; margin-bottom:22px;
        }
        .svc-h1 {
          font-family:'Cormorant Garamond',serif;
          font-size:clamp(2.4rem,5.5vw,4rem); font-weight:700; color:#fff; line-height:1.08; margin-bottom:18px;
        }
        .svc-h1 em { font-style:italic; color:#14b8a6; }
        .svc-hero-sub { font-size:.95rem; color:rgba(255,255,255,.55); line-height:1.8; font-weight:300; margin-bottom:32px; }

        .svc-search-wrap { position:relative; max-width:420px; margin:0 auto; }
        .svc-search-icon {
          position:absolute; left:16px; top:50%; transform:translateY(-50%);
          color:rgba(255,255,255,.4); pointer-events:none;
        }
        .svc-search {
          width:100%; padding:14px 16px 14px 44px;
          background:rgba(255,255,255,.1); backdrop-filter:blur(12px);
          border:1px solid rgba(255,255,255,.18); border-radius:50px;
          color:#fff; font-family:'DM Sans',sans-serif; font-size:.88rem; outline:none;
          transition:border-color .2s, background .2s;
        }
        .svc-search::placeholder { color:rgba(255,255,255,.38); }
        .svc-search:focus { border-color:rgba(13,148,136,.7); background:rgba(255,255,255,.15); }

        .svc-toolbar {
          max-width:1200px; margin:0 auto; padding:28px 2rem 0;
          display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:12px;
        }
        .svc-filters { display:flex; gap:7px; flex-wrap:wrap; }
        .svc-filter {
          padding:7px 16px; border-radius:50px; border:1.5px solid rgba(10,22,40,.1); background:#fff;
          font-family:'DM Sans',sans-serif; font-size:.77rem; font-weight:500; color:#64748b;
          cursor:pointer; transition:all .18s; white-space:nowrap;
        }
        .svc-filter:hover { border-color:#0d9488; color:#0d9488; }
        .svc-filter.on { background:#0a1628; color:#fff; border-color:#0a1628; }
        .svc-count { font-size:.78rem; color:#94a3b8; white-space:nowrap; }

        .svc-grid-wrap { max-width:1200px; margin:0 auto; padding:22px 2rem 96px; }
        .svc-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(310px,1fr)); gap:24px; }

        /* ── Card ── */
        .sc-card {
          background:#fff; border-radius:22px; overflow:hidden;
          border:1.5px solid rgba(10,22,40,.07);
          box-shadow:0 4px 20px rgba(10,22,40,.06);
          transition:transform .32s cubic-bezier(.34,1.56,.64,1), box-shadow .32s, border-color .2s;
          display:flex; flex-direction:column;
        }
        .sc-card:hover { transform:translateY(-8px); box-shadow:0 18px 50px rgba(10,22,40,.12); border-color:var(--c); }

        .sc-img-wrap { position:relative; height:190px; overflow:hidden; flex-shrink:0; }
        .sc-img { width:100%; height:100%; object-fit:cover; transition:transform .4s ease; }
        .sc-card:hover .sc-img { transform:scale(1.05); }
        .sc-img-grad { position:absolute; inset:0; background:linear-gradient(180deg,transparent 30%,rgba(10,22,40,.65) 100%); }

        .sc-popular {
          position:absolute; top:12px; left:12px;
          background:linear-gradient(135deg,#d4a843,#b8892c); color:#fff;
          font-size:.6rem; font-weight:700; letter-spacing:.08em; text-transform:uppercase;
          padding:4px 10px; border-radius:50px;
        }
        .sc-duration {
          position:absolute; top:12px; right:12px;
          background:rgba(10,22,40,.75); backdrop-filter:blur(6px);
          border:1px solid rgba(255,255,255,.1); border-radius:50px;
          padding:4px 9px; font-size:.68rem; font-weight:500; color:rgba(255,255,255,.85);
          display:flex; align-items:center; gap:4px;
        }
        .sc-price {
          position:absolute; bottom:14px; right:14px;
          font-family:'Cormorant Garamond',serif; font-size:1.4rem; font-weight:700; color:#fff;
        }

        .sc-body { padding:18px 20px 20px; display:flex; flex-direction:column; flex:1; }
        .sc-icon-wrap { font-size:1.4rem; margin-bottom:4px; }
        .sc-cat { font-size:.62rem; font-weight:700; letter-spacing:.12em; text-transform:uppercase; color:var(--c); margin-bottom:5px; }
        .sc-name { font-family:'Cormorant Garamond',serif; font-size:1.15rem; font-weight:700; color:#0a1628; margin-bottom:8px; }
        .sc-desc { font-size:.81rem; color:#64748b; line-height:1.6; font-weight:300; margin-bottom:14px; }

        .sc-benefits { list-style:none; margin:0 0 16px; padding:0; display:flex; flex-direction:column; gap:6px; }
        .sc-benefit { display:flex; align-items:center; gap:7px; font-size:.75rem; color:#475569; font-weight:400; }

        .sc-actions { display:flex; gap:9px; margin-top:auto; }
        .sc-btn-book {
          flex:1; text-align:center; text-decoration:none; color:#fff;
          font-family:'DM Sans',sans-serif; font-size:.8rem; font-weight:600;
          padding:11px 14px; border-radius:10px;
          box-shadow:0 3px 12px rgba(0,0,0,.2); transition:opacity .18s, transform .18s;
        }
        .sc-btn-book:hover { opacity:.88; transform:translateY(-1px); }
        .sc-btn-detail {
          padding:11px 14px; border-radius:10px;
          border:1.5px solid rgba(10,22,40,.12); background:none;
          color:#64748b; font-family:'DM Sans',sans-serif; font-size:.8rem; font-weight:500;
          text-decoration:none; white-space:nowrap; transition:all .18s;
        }
        .sc-btn-detail:hover { border-color:var(--c); color:var(--c); }

        .svc-empty { text-align:center; padding:64px 20px; color:#94a3b8; }

        /* ── Bottom CTA ── */
        .svc-cta-section { background:linear-gradient(135deg,#0a1628,#0f2240); padding:64px 2rem; text-align:center; }
        .svc-cta-inner { max-width:560px; margin:0 auto; }
        .svc-cta-h { font-family:'Cormorant Garamond',serif; font-size:clamp(1.8rem,3.5vw,2.8rem); font-weight:700; color:#fff; margin-bottom:14px; line-height:1.15; }
        .svc-cta-h em { font-style:italic; color:#14b8a6; }
        .svc-cta-sub { font-size:.9rem; color:rgba(255,255,255,.5); font-weight:300; margin-bottom:28px; line-height:1.7; }
        .svc-cta-btns { display:flex; gap:12px; justify-content:center; flex-wrap:wrap; }
        .svc-cta-book {
          display:inline-flex; align-items:center; gap:8px; text-decoration:none;
          background:linear-gradient(135deg,#0d9488,#065f4a); color:#fff;
          font-family:'DM Sans',sans-serif; font-size:.9rem; font-weight:600;
          padding:14px 28px; border-radius:50px;
          box-shadow:0 5px 22px rgba(13,148,136,.35); transition:transform .2s, box-shadow .2s;
        }
        .svc-cta-book:hover { transform:translateY(-2px); box-shadow:0 8px 30px rgba(13,148,136,.48); }
        .svc-cta-wa {
          display:inline-flex; align-items:center; gap:8px; text-decoration:none;
          border:1.5px solid rgba(37,211,102,.4); background:rgba(37,211,102,.1);
          color:#4ade80; font-family:'DM Sans',sans-serif; font-size:.9rem; font-weight:600;
          padding:14px 28px; border-radius:50px; transition:all .2s;
        }
        .svc-cta-wa:hover { background:rgba(37,211,102,.18); border-color:rgba(37,211,102,.65); }

        /* ── Mobile sticky ── */
        .svc-sticky {
          display:none; position:fixed; bottom:0; left:0; right:0; z-index:200;
          background:#fff; border-top:1px solid rgba(10,22,40,.1);
          padding:10px 16px; gap:10px; box-shadow:0 -4px 20px rgba(10,22,40,.1);
        }
        @media(max-width:768px) { .svc-sticky { display:flex; } }
        .svc-sticky-book {
          flex:1; text-align:center; padding:13px;
          background:linear-gradient(135deg,#0d9488,#0a1628); color:#fff;
          border-radius:12px; text-decoration:none;
          font-family:'DM Sans',sans-serif; font-size:.86rem; font-weight:600;
        }
        .svc-sticky-wa {
          padding:13px 14px; border-radius:12px;
          background:rgba(37,211,102,.1); border:1.5px solid rgba(37,211,102,.3);
          display:flex; align-items:center; gap:5px; text-decoration:none;
          font-family:'DM Sans',sans-serif; font-size:.86rem; font-weight:600; color:#15803d;
        }

        @media(max-width:640px) {
          .svc-grid { grid-template-columns:1fr; }
          .svc-toolbar { flex-direction:column; align-items:flex-start; }
        }
      `}</style>

      <div className="svc-page">

        {/* Hero */}
        <section className="svc-hero" aria-label="Services page header">
          <div className="svc-hero-inner">
            <div className="svc-eyebrow">🦷 Premium Dental Treatments</div>
            <h1 className="svc-h1">Treatments That<br/><em>Transform Smiles</em></h1>
            <p className="svc-hero-sub">World-class dental care with cutting-edge technology, compassionate specialists, and results that last a lifetime.</p>
            <div className="svc-search-wrap">
              <svg className="svc-search-icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
              <input
                className="svc-search"
                placeholder="Search treatments…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                aria-label="Search services"
              />
            </div>
          </div>
        </section>

        {/* Filters */}
        <div className="svc-toolbar">
          <div className="svc-filters" role="group" aria-label="Filter by category">
            {CATEGORIES.map(c => (
              <button key={c} className={`svc-filter${active === c ? " on" : ""}`} onClick={() => setActive(c)}>
                {c}
              </button>
            ))}
          </div>
          <span className="svc-count">{filtered.length} treatment{filtered.length !== 1 ? "s" : ""}</span>
        </div>

        {/* Grid */}
        <div className="svc-grid-wrap">
          {filtered.length === 0 ? (
            <div className="svc-empty">
              <div style={{ fontSize:"2.5rem", marginBottom:12 }}>🔍</div>
              <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:"1.1rem", fontWeight:700, color:"#0a1628", marginBottom:8 }}>
                No treatments found
              </div>
              <p>Try a different search term or select &ldquo;All&rdquo;.</p>
            </div>
          ) : (
            <div className="svc-grid">
              {filtered.map((s, i) => <ServiceCard key={s.id} s={s} index={i} />)}
            </div>
          )}
        </div>

        {/* Bottom CTA */}
        <div className="svc-cta-section">
          <div className="svc-cta-inner">
            <h2 className="svc-cta-h">Not Sure Which<br/><em>Treatment is Right?</em></h2>
            <p className="svc-cta-sub">Book a free consultation and our specialist will create a personalised treatment plan just for you.</p>
            <div className="svc-cta-btns">
              <Link href="/booking" className="svc-cta-book">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <rect x="3" y="4" width="18" height="18" rx="2"/>
                  <line x1="16" y1="2" x2="16" y2="6"/>
                  <line x1="8"  y1="2" x2="8"  y2="6"/>
                  <line x1="3"  y1="10" x2="21" y2="10"/>
                </svg>
                Book Free Consultation
              </Link>
              <a href="https://wa.me/919876543210" target="_blank" rel="noopener noreferrer" className="svc-cta-wa">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="#4ade80">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                </svg>
                Ask on WhatsApp
              </a>
            </div>
          </div>
        </div>

        {/* Mobile sticky */}
        <div className="svc-sticky">
          <Link href="/booking" className="svc-sticky-book">Book Free Consultation</Link>
          <a href="https://wa.me/919876543210" target="_blank" rel="noopener noreferrer" className="svc-sticky-wa">
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