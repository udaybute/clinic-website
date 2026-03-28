"use client"

// components/home/SmileGallerySection.tsx
// ─────────────────────────────────────────────────────────────────────────────
// GET /api/gallery → GalleryItem[]
// Field contract preserved: id, treatment, before, after, desc, duration
// ─────────────────────────────────────────────────────────────────────────────

import Link from "next/link"
import {
  useState, useRef, useCallback,
  useEffect, type CSSProperties,
} from "react"

// ── Gallery data — matches GET /api/gallery field contract ────────────────────
const GALLERY = [
  {
    id:        "1",
    treatment: "Dental Implants",
    before:    "https://images.unsplash.com/photo-1606811841689-23dfddce3e95?w=600&h=420&fit=crop&auto=format&q=82",
    after:     "https://images.unsplash.com/photo-1588776814546-1ffdd50d7b60?w=600&h=420&fit=crop&auto=format&q=82",
    desc:      "Full arch restoration with 6 titanium implants. Permanent, natural-looking results that last a lifetime.",
    duration:  "3 months",
    result:    "6 implants",
    icon:      "🔩",
  },
  {
    id:        "2",
    treatment: "Teeth Whitening",
    before:    "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=600&h=420&fit=crop&crop=face&auto=format&q=82",
    after:     "https://images.unsplash.com/photo-1537368910025-700350fe46c7?w=600&h=420&fit=crop&crop=face&auto=format&q=82",
    desc:      "6-shade improvement with professional laser whitening in a single 60-minute session. No sensitivity.",
    duration:  "1 session",
    result:    "6 shades",
    icon:      "✨",
  },
  {
    id:        "3",
    treatment: "Orthodontics",
    before:    "https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=600&h=420&fit=crop&crop=face&auto=format&q=82",
    after:     "https://images.unsplash.com/photo-1607746882042-944635dfe10e?w=600&h=420&fit=crop&crop=face&auto=format&q=82",
    desc:      "Complete alignment correction using Invisalign clear aligners. Comfortable, removable, nearly invisible.",
    duration:  "8 months",
    result:    "Perfect alignment",
    icon:      "😁",
  },
] as const

type GalleryItem = typeof GALLERY[number]

// ── Draggable before/after slider component ───────────────────────────────────
function BeforeAfterSlider({
  item,
}: {
  item: GalleryItem
}) {
  const wrapRef  = useRef<HTMLDivElement>(null)
  const dragging = useRef(false)
  const [pct,   setPct]   = useState(50)
  const [ready, setReady] = useState(false)

  const clamp  = (v: number) => Math.max(3, Math.min(97, v))

  const updateFromX = useCallback((clientX: number) => {
    const wrap = wrapRef.current
    if (!wrap) return
    const { left, width } = wrap.getBoundingClientRect()
    setPct(clamp(((clientX - left) / width) * 100))
  }, [])

  const onMouseDown  = (e: React.MouseEvent) => { dragging.current = true; updateFromX(e.clientX) }
  const onTouchStart = (e: React.TouchEvent) => { dragging.current = true; updateFromX(e.touches[0].clientX) }

  useEffect(() => {
    const move  = (e: MouseEvent) => { if (dragging.current) updateFromX(e.clientX) }
    const tMove = (e: TouchEvent) => { if (dragging.current) updateFromX(e.touches[0].clientX) }
    const up    = () => { dragging.current = false }
    window.addEventListener("mousemove",  move)
    window.addEventListener("touchmove",  tMove, { passive: true })
    window.addEventListener("mouseup",    up)
    window.addEventListener("touchend",   up)
    return () => {
      window.removeEventListener("mousemove",  move)
      window.removeEventListener("touchmove",  tMove)
      window.removeEventListener("mouseup",    up)
      window.removeEventListener("touchend",   up)
    }
  }, [updateFromX])

  // Keyboard: arrow keys move slider
  const onKeyDown = (e: React.KeyboardEvent) => {
    const step = e.shiftKey ? 10 : 5
    if (e.key === "ArrowLeft")  setPct(p => clamp(p - step))
    if (e.key === "ArrowRight") setPct(p => clamp(p + step))
  }

  return (
    <div
      ref={wrapRef}
      className="ba-root"
      onMouseDown={onMouseDown}
      onTouchStart={onTouchStart}
      aria-label={`Before and after comparison for ${item.treatment}. Use arrow keys to reveal.`}
      role="img"
    >
      {/* BEFORE — base layer */}
      <div className="ba-layer">
        <img
          src={item.before}
          alt={`${item.treatment} — before`}
          className="ba-img"
          draggable={false}
          onLoad={() => setReady(true)}
          loading="lazy"
        />
        <span className="ba-chip ba-chip-before" aria-hidden="true">Before</span>
      </div>

      {/* AFTER — clipped layer */}
      <div
        className="ba-layer"
        style={{ clipPath: `inset(0 ${100 - pct}% 0 0)` } as CSSProperties}
        aria-hidden="true"
      >
        <img
          src={item.after}
          alt={`${item.treatment} — after`}
          className="ba-img"
          draggable={false}
          loading="lazy"
        />
        <span className="ba-chip ba-chip-after">After</span>
      </div>

      {/* Divider handle */}
      <div
        className="ba-handle"
        style={{ left: `${pct}%` } as CSSProperties}
        tabIndex={0}
        role="slider"
        aria-valuenow={Math.round(pct)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Drag to reveal transformation"
        onKeyDown={onKeyDown}
      >
        <div className="ba-line" />
        <div className="ba-knob">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M9 18l-6-6 6-6M15 6l6 6-6 6"
              stroke="currentColor" strokeWidth="2.5"
              strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
        <div className="ba-line" />
      </div>

      {/* Shimmer placeholder while images load */}
      {!ready && (
        <div className="ba-shimmer" aria-hidden="true" />
      )}

      {/* Hint label — auto-fades after 2.5s */}
      <div className="ba-hint" aria-hidden="true">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M9 18l-6-6 6-6M15 6l6 6-6 6"/>
        </svg>
        Drag to reveal
      </div>
    </div>
  )
}

// ── Main section ──────────────────────────────────────────────────────────────
export default function SmileGallerySection() {
  const rootRef  = useRef<HTMLElement>(null)
  const [visible, setVisible] = useState(false)
  const [active,  setActive]  = useState(0)

  useEffect(() => {
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setVisible(true); obs.disconnect() } },
      { threshold: 0.06 }
    )
    if (rootRef.current) obs.observe(rootRef.current)
    return () => obs.disconnect()
  }, [])

  const current = GALLERY[active]
  const total   = GALLERY.length

  const prev = () => setActive(i => (i - 1 + total) % total)
  const next = () => setActive(i => (i + 1) % total)

  const vis = (delay = 0): CSSProperties => ({
    opacity:         visible ? 1 : 0,
    transform:       visible ? "translateY(0)" : "translateY(22px)",
    transition:      `opacity .6s ease ${delay}ms, transform .6s ease ${delay}ms`,
  })

  return (
    <>
      <style>{`
        /* ── Root ─────────────────────────────────────────────────────────── */
        .sg-root2 {
          padding:    var(--section-py, 100px) var(--container-px, 2rem);
          background: var(--navy, #0a1628);
          position:   relative;
          overflow:   hidden;
        }
        .sg-root2::before {
          content: ''; position: absolute; bottom: -80px; left: -80px;
          width: 440px; height: 440px; border-radius: 50%;
          background: radial-gradient(circle, rgba(13,148,136,.08), transparent 65%);
          pointer-events: none;
        }
        .sg-root2::after {
          content: ''; position: absolute; top: -60px; right: -60px;
          width: 360px; height: 360px; border-radius: 50%;
          background: radial-gradient(circle, rgba(212,168,67,.05), transparent 65%);
          pointer-events: none;
        }

        .sg-wrap2 {
          max-width: var(--container, 1200px);
          margin: 0 auto; position: relative; z-index: 1;
        }

        /* ── Header ───────────────────────────────────────────────────────── */
        .sg-head {
          text-align: center;
          margin-bottom: clamp(36px,5vw,52px);
        }
        .sg-h2 {
          font-family: var(--font-serif, 'Cormorant Garamond', serif);
          font-size: clamp(2rem, 4vw, 3.2rem);
          font-weight: 700; color: #fff; line-height: 1.1;
          margin-bottom: 10px;
        }
        .sg-h2 em { font-style: italic; color: var(--teal-light, #14b8a6); }
        .sg-sub2 {
          font-size: .9rem; color: rgba(255,255,255,.45);
          max-width: 420px; margin: 0 auto; font-weight: 300; line-height: 1.6;
        }

        /* ── Tabs ─────────────────────────────────────────────────────────── */
        .sg-tabs2 {
          display: flex; justify-content: center;
          gap: 8px; flex-wrap: wrap;
          margin-bottom: clamp(28px,4vw,40px);
        }
        .sg-tab2 {
          display: inline-flex; align-items: center; gap: 7px;
          font-family: var(--font-sans, 'DM Sans', sans-serif);
          font-size: .8rem; font-weight: 500;
          padding: 8px 18px; border-radius: 9999px;
          border: 1.5px solid rgba(255,255,255,.1);
          background: transparent; color: rgba(255,255,255,.5);
          cursor: pointer;
          transition: all .2s ease;
        }
        .sg-tab2:hover {
          background: rgba(255,255,255,.07);
          color: rgba(255,255,255,.85);
          border-color: rgba(255,255,255,.2);
        }
        .sg-tab2.sg-tab2-on {
          background: var(--teal, #0d9488);
          border-color: var(--teal, #0d9488);
          color: #fff;
          box-shadow: 0 4px 18px rgba(13,148,136,.3);
        }
        .sg-tab2:focus-visible {
          outline: 2px solid var(--teal, #0d9488);
          outline-offset: 3px;
        }

        /* ── Panel grid ───────────────────────────────────────────────────── */
        .sg-panel {
          display: grid;
          grid-template-columns: 1.15fr 0.85fr;
          gap: 28px;
          align-items: center;
        }
        @media (max-width: 860px) {
          .sg-panel { grid-template-columns: 1fr; }
        }

        /* ── Before/After slider ──────────────────────────────────────────── */
        .ba-root {
          position: relative;
          border-radius: var(--r-lg, 20px);
          overflow: hidden;
          height: clamp(260px, 38vw, 440px);
          cursor: ew-resize;
          user-select: none;
          -webkit-user-select: none;
          border: 1px solid rgba(255,255,255,.1);
          box-shadow: 0 24px 64px rgba(0,0,0,.45);
          background: rgba(255,255,255,.04);
        }
        .ba-layer {
          position: absolute; inset: 0; pointer-events: none;
        }
        .ba-img {
          width: 100%; height: 100%;
          object-fit: cover; object-position: top center;
          display: block; pointer-events: none;
        }

        /* Label chips */
        .ba-chip {
          position: absolute; top: 14px;
          font-size: .6rem; font-weight: 800;
          letter-spacing: .12em; text-transform: uppercase;
          color: #fff; padding: 4px 12px; border-radius: 9999px;
        }
        .ba-chip-before { left:  14px; background: rgba(220,38,38,.85); }
        .ba-chip-after  { right: 14px; background: rgba(13,148,136,.9); }

        /* Handle */
        .ba-handle {
          position: absolute; top: 0; bottom: 0;
          transform: translateX(-50%);
          display: flex; flex-direction: column; align-items: center;
          z-index: 10; pointer-events: none;
        }
        .ba-handle:focus        { outline: none; }
        .ba-handle:focus .ba-knob {
          box-shadow: 0 0 0 4px rgba(13,148,136,.5), 0 4px 20px rgba(0,0,0,.4);
        }
        .ba-line {
          flex: 1; width: 2.5px;
          background: rgba(255,255,255,.85);
          pointer-events: none;
        }
        .ba-knob {
          width: 44px; height: 44px; border-radius: 50%;
          background: #fff; flex-shrink: 0;
          display: flex; align-items: center; justify-content: center;
          color: var(--navy, #0a1628);
          box-shadow: 0 4px 22px rgba(0,0,0,.45);
          pointer-events: all; cursor: ew-resize;
          transition: transform .15s ease, box-shadow .15s ease;
        }
        .ba-root:active .ba-knob { transform: scale(.93); }

        /* Shimmer */
        .ba-shimmer {
          position: absolute; inset: 0;
          background: linear-gradient(
            90deg,
            rgba(255,255,255,.04) 0%,
            rgba(255,255,255,.1)  50%,
            rgba(255,255,255,.04) 100%
          );
          background-size: 200% 100%;
          animation: sgShimmer 1.6s ease-in-out infinite;
        }
        @keyframes sgShimmer {
          0%   { background-position: -200% 0; }
          100% { background-position:  200% 0; }
        }

        /* Drag hint */
        .ba-hint {
          position: absolute; bottom: 14px; left: 50%; transform: translateX(-50%);
          background: rgba(0,0,0,.58);
          color: rgba(255,255,255,.82); border-radius: 9999px;
          padding: 5px 14px; font-size: .68rem; font-weight: 500;
          display: flex; align-items: center; gap: 6px; white-space: nowrap;
          pointer-events: none;
          animation: sgHintFade 3.5s ease 1s forwards;
        }
        @keyframes sgHintFade {
          0%, 60% { opacity: 1; }
          100%    { opacity: 0; }
        }

        /* ── Info panel ───────────────────────────────────────────────────── */
        .sg-info2 {
          display: flex; flex-direction: column; gap: 18px;
        }
        .sg-info2-tag {
          display: inline-flex; align-items: center; gap: 7px;
          font-size: .65rem; font-weight: 700; letter-spacing: .14em;
          text-transform: uppercase;
          color: var(--teal-light, #14b8a6);
          background: rgba(13,148,136,.12);
          border: 1px solid rgba(13,148,136,.25);
          padding: 4px 13px; border-radius: 9999px;
          width: fit-content;
        }
        .sg-info2-title {
          font-family: var(--font-serif, 'Cormorant Garamond', serif);
          font-size: clamp(1.55rem, 2.5vw, 2.1rem);
          font-weight: 700; color: #fff; line-height: 1.15;
        }
        .sg-info2-title em { font-style: italic; color: var(--teal-light, #14b8a6); }
        .sg-info2-desc {
          font-size: .88rem; color: rgba(255,255,255,.6);
          line-height: 1.75; font-weight: 300;
        }

        /* Stat cards */
        .sg-stats2 { display: flex; gap: 12px; flex-wrap: wrap; }
        .sg-stat2 {
          background: rgba(255,255,255,.05);
          border: 1px solid rgba(255,255,255,.07);
          border-radius: var(--r-md, 14px);
          padding: 13px 16px; flex: 1; min-width: 95px;
          transition: background .2s ease, border-color .2s ease;
        }
        .sg-stat2:hover {
          background: rgba(255,255,255,.08);
          border-color: rgba(13,148,136,.2);
        }
        .sg-stat2-val {
          font-family: var(--font-serif, 'Cormorant Garamond', serif);
          font-size: 1.45rem; font-weight: 700;
          color: #fff; line-height: 1; margin-bottom: 4px;
        }
        .sg-stat2-lbl {
          font-size: .65rem; font-weight: 500; letter-spacing: .07em;
          text-transform: uppercase; color: rgba(255,255,255,.35);
        }

        /* Nav controls */
        .sg-controls {
          display: flex; align-items: center; gap: 12px; flex-wrap: wrap;
        }
        .sg-arrows { display: flex; gap: 8px; }
        .sg-arr {
          width: 38px; height: 38px; border-radius: 50%;
          border: 1.5px solid rgba(255,255,255,.14);
          background: rgba(255,255,255,.05);
          color: rgba(255,255,255,.6); cursor: pointer;
          display: flex; align-items: center; justify-content: center;
          font-family: var(--font-sans, sans-serif);
          transition: background .18s ease, border-color .18s ease, color .18s ease;
        }
        .sg-arr:hover {
          background: rgba(13,148,136,.2);
          border-color: rgba(13,148,136,.5);
          color: #fff;
        }
        .sg-arr:focus-visible { outline: 2px solid var(--teal, #0d9488); outline-offset: 3px; }

        .sg-dots2 { display: flex; gap: 7px; align-items: center; }
        .sg-dot2 {
          width: 7px; height: 7px; border-radius: 9999px;
          background: rgba(255,255,255,.2);
          border: none; cursor: pointer;
          font-family: var(--font-sans, sans-serif);
          transition: all .22s ease;
        }
        .sg-dot2.sg-dot2-on { width: 22px; background: var(--teal-light, #14b8a6); }
        .sg-dot2:focus-visible { outline: 2px solid var(--teal, #0d9488); outline-offset: 2px; }

        /* ── Bottom CTA strip ─────────────────────────────────────────────── */
        .sg-cta-strip {
          display: flex; align-items: center; justify-content: space-between;
          flex-wrap: wrap; gap: 16px;
          margin-top: clamp(36px,5vw,56px);
          padding: 22px 28px;
          background: rgba(255,255,255,.04);
          border: 1px solid rgba(255,255,255,.07);
          border-radius: var(--r-xl, 24px);
        }
        .sg-cta-text { display: flex; flex-direction: column; gap: 4px; }
        .sg-cta-eyebrow {
          font-size: .67rem; font-weight: 600; letter-spacing: .14em;
          text-transform: uppercase; color: var(--teal-light, #14b8a6);
        }
        .sg-cta-title {
          font-family: var(--font-serif, 'Cormorant Garamond', serif);
          font-size: clamp(1.05rem,1.8vw,1.35rem);
          font-weight: 700; color: #fff; line-height: 1.2;
        }
        .sg-cta-actions { display: flex; gap: 10px; flex-wrap: wrap; }

        /* ── Disclaimer ───────────────────────────────────────────────────── */
        .sg-disc2 {
          text-align: center; margin-top: 24px;
          font-size: .72rem; color: rgba(255,255,255,.2); font-weight: 300;
        }
      `}</style>

      <section className="sg-root2" ref={rootRef} aria-labelledby="sg-heading">
        <div className="sg-wrap2">

          {/* ── Header ── */}
          <div className="sg-head" style={vis(0)}>
            <div className="section-eyebrow section-eyebrow--gold" style={{ marginBottom:"16px" }}>
              📸 Smile Gallery
            </div>
            <h2 className="sg-h2" id="sg-heading">
              <em>Before &amp; After</em>
            </h2>
            <p className="sg-sub2">
              Real patient results. Drag the slider to reveal each transformation.
            </p>
          </div>

          {/* ── Treatment tabs ── */}
          <div
            className="sg-tabs2"
            style={vis(80)}
            role="tablist"
            aria-label="Select treatment to view"
          >
            {GALLERY.map((g, i) => (
              <button
                key={g.id}
                className={`sg-tab2${active === i ? " sg-tab2-on" : ""}`}
                onClick={() => setActive(i)}
                role="tab"
                aria-selected={active === i}
                aria-controls={`sg-panel-${g.id}`}
                id={`sg-tab-${g.id}`}
              >
                <span aria-hidden="true">{g.icon}</span>
                {g.treatment}
              </button>
            ))}
          </div>

          {/* ── Active panel ── */}
          <div
            className="sg-panel"
            style={vis(150)}
            id={`sg-panel-${current.id}`}
            role="tabpanel"
            aria-labelledby={`sg-tab-${current.id}`}
          >
            {/* Slider */}
            <BeforeAfterSlider
              key={current.id}   
              item={current}
            />

            {/* Info */}
            <div className="sg-info2">
              <div className="sg-info2-tag">
                <span aria-hidden="true">{current.icon}</span>
                {current.treatment}
              </div>

              <h3 className="sg-info2-title">
                <em>{current.result}</em><br />
                in {current.duration}
              </h3>

              <p className="sg-info2-desc">{current.desc}</p>

              {/* Stats */}
              <div className="sg-stats2">
                <div className="sg-stat2">
                  <div className="sg-stat2-val">{current.duration}</div>
                  <div className="sg-stat2-lbl">Treatment time</div>
                </div>
                <div className="sg-stat2">
                  <div className="sg-stat2-val">{current.result.split(" ")[0]}</div>
                  <div className="sg-stat2-lbl">Key result</div>
                </div>
                <div className="sg-stat2">
                  <div className="sg-stat2-val">99%</div>
                  <div className="sg-stat2-lbl">Success rate</div>
                </div>
              </div>

              {/* Nav arrows + dots */}
              <div className="sg-controls">
                <div className="sg-arrows">
                  <button
                    className="sg-arr"
                    onClick={prev}
                    aria-label="Previous treatment"
                  >
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
                      stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"
                      aria-hidden="true">
                      <polyline points="15 18 9 12 15 6"/>
                    </svg>
                  </button>
                  <button
                    className="sg-arr"
                    onClick={next}
                    aria-label="Next treatment"
                  >
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
                      stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"
                      aria-hidden="true">
                      <polyline points="9 18 15 12 9 6"/>
                    </svg>
                  </button>
                </div>

                <div className="sg-dots2" role="list">
                  {GALLERY.map((g, i) => (
                    <button
                      key={g.id}
                      className={`sg-dot2${active === i ? " sg-dot2-on" : ""}`}
                      onClick={() => setActive(i)}
                      aria-label={`View ${g.treatment}`}
                      role="listitem"
                    />
                  ))}
                </div>
              </div>

              {/* Book inline CTA */}
              <Link
                href="/booking"
                className="btn-primary"
                style={{ width: "fit-content" }}
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
                  stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"
                  aria-hidden="true">
                  <rect x="3" y="4" width="18" height="18" rx="2"/>
                  <line x1="16" y1="2" x2="16" y2="6"/>
                  <line x1="8"  y1="2" x2="8"  y2="6"/>
                  <line x1="3"  y1="10" x2="21" y2="10"/>
                </svg>
                Book This Treatment
              </Link>
            </div>
          </div>

          {/* ── Bottom CTA strip ── */}
          <div className="sg-cta-strip" style={vis(230)}>
            <div className="sg-cta-text">
              <div className="sg-cta-eyebrow">Ready to transform your smile?</div>
              <div className="sg-cta-title">Join 20,000+ patients who already did</div>
            </div>
            <div className="sg-cta-actions">
              <Link href="/booking" className="btn-primary">
                Book Free Consultation
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
                  stroke="currentColor" strokeWidth="2" strokeLinecap="round"
                  aria-hidden="true">
                  <polyline points="9 18 15 12 9 6"/>
                </svg>
              </Link>
              <Link href="/services" className="btn-ghost btn-ghost--light">
                View All Treatments
              </Link>
            </div>
          </div>

          <p className="sg-disc2">
            * Images are for illustrative purposes. Individual results may vary based on patient condition and treatment plan.
          </p>
        </div>
      </section>
    </>
  )
}