"use client"

// app/not-found.tsx  (Next.js 13+ App Router 404 page)

import Link from "next/link"

export default function NotFound() {
  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,700;1,600&family=DM+Sans:wght@300;400;500&display=swap');
        .nf-root {
          min-height:100vh;display:flex;align-items:center;justify-content:center;
          background:linear-gradient(135deg,#0a1628,#0f2240);
          font-family:'DM Sans',sans-serif;text-align:center;padding:2rem;
          position:relative;overflow:hidden;
        }
        .nf-root::before {
          content:'';position:absolute;top:-100px;left:-100px;
          width:400px;height:400px;border-radius:50%;
          background:radial-gradient(circle,rgba(13,148,136,.12),transparent 65%);
          pointer-events:none;
        }
        .nf-content { position:relative;z-index:1; }
        .nf-code {
          font-family:'Cormorant Garamond',serif;
          font-size:clamp(6rem,15vw,10rem);font-weight:700;
          color:rgba(255,255,255,.06);line-height:1;
          position:absolute;top:50%;left:50%;transform:translate(-50%,-60%);
          white-space:nowrap;user-select:none;pointer-events:none;
        }
        .nf-icon { font-size:4rem;margin-bottom:16px;display:block;animation:nfFloat 3s ease-in-out infinite; }
        @keyframes nfFloat { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-12px)} }
        .nf-title { font-family:'Cormorant Garamond',serif;font-size:clamp(1.8rem,4vw,2.8rem);font-weight:700;color:#fff;margin-bottom:12px; }
        .nf-title em { font-style:italic;color:#14b8a6; }
        .nf-sub { font-size:.95rem;color:rgba(255,255,255,.5);font-weight:300;max-width:380px;margin:0 auto 32px;line-height:1.7; }
        .nf-btns { display:flex;gap:12px;justify-content:center;flex-wrap:wrap; }
        .nf-btn-primary {
          text-decoration:none;color:#fff;font-size:.88rem;font-weight:500;
          padding:12px 26px;border-radius:50px;letter-spacing:.03em;
          background:linear-gradient(135deg,#0d9488,#0a1628);
          box-shadow:0 4px 20px rgba(13,148,136,.3);
          transition:transform .2s,box-shadow .2s;
        }
        .nf-btn-primary:hover { transform:translateY(-1px);box-shadow:0 7px 28px rgba(13,148,136,.4); }
        .nf-btn-ghost {
          text-decoration:none;color:rgba(255,255,255,.7);font-size:.88rem;
          padding:12px 24px;border-radius:50px;
          border:1px solid rgba(255,255,255,.15);
          transition:border-color .2s,color .2s;
        }
        .nf-btn-ghost:hover { border-color:rgba(255,255,255,.35);color:#fff; }
      `}</style>
      <div className="nf-root">
        <div className="nf-code">404</div>
        <div className="nf-content">
          <span className="nf-icon">🦷</span>
          <h1 className="nf-title">Page <em>Not Found</em></h1>
          <p className="nf-sub">
            The page you're looking for seems to have drifted away.
            Let's get you back to a healthy smile.
          </p>
          <div className="nf-btns">
            <Link href="/"        className="nf-btn-primary">← Back to Home</Link>
            <Link href="/booking" className="nf-btn-ghost">Book Appointment</Link>
          </div>
        </div>
      </div>
    </>
  )
}