"use client"

// app/(public)/login/page.tsx
// Real API login. mockLogin() fully removed.
//
// After lib/api.ts interceptor unwraps { success, message, data }:
//   res.data = { access_token: "...", user: {...} }

import { useState, useEffect } from "react"
import { useRouter }           from "next/navigation"
import { useAuthStore }        from "@/store/authStore"
import API                     from "@/lib/api"

const ROLE_INFO = {
  admin:        { label: "Super Admin",  color: "#d4a843", icon: "👑" },
  doctor:       { label: "Doctor",       color: "#0d9488", icon: "🩺" },
  receptionist: { label: "Receptionist", color: "#2563eb", icon: "💁" },
} as const

const SHOW_DEMO = process.env.NEXT_PUBLIC_SHOW_DEMO_CREDS === 'true'

export default function LoginPage() {
  const router             = useRouter()
  const { setAuth, isLoggedIn } = useAuthStore()

  const [email,    setEmail]    = useState("admin@dentalcare.in")
  const [password, setPassword] = useState("")
  const [showPass, setShowPass] = useState(false)
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState("")

  useEffect(() => {
    if (isLoggedIn) router.replace("/dashboard")
  }, [isLoggedIn, router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    const trimmedEmail = email.trim().toLowerCase()
    const trimmedPass  = password.trim()

    if (!trimmedEmail) return setError("Please enter your email.")
    if (!trimmedPass)  return setError("Please enter your password.")

    setLoading(true)
    try {
      // POST /api/auth/login
      // Body: { email: string, password: string }
      const res = await API.post("/auth/login", {
        email:    trimmedEmail,
        password: trimmedPass,
      })

      // After interceptor unwrap, res.data = { access_token, user }
      // Defensive: also handle un-unwrapped shape just in case
      const payload = res.data?.data ?? res.data

      const access_token: string = payload?.access_token
      const user: any            = payload?.user

      if (!access_token || !user) {
        throw new Error("Server returned an unexpected response. Please try again.")
      }

      // Persist to Zustand + localStorage + cookie
      setAuth(user, access_token)
      router.push("/dashboard")

    } catch (err: any) {
      const serverMsg =
        err?.response?.data?.message ??
        err?.response?.data?.error   ??
        err?.message

      const friendlyMsg = (() => {
        if (!serverMsg) return "Login failed. Check your credentials and try again."
        if (Array.isArray(serverMsg)) return serverMsg[0]
        if (typeof serverMsg === "string") {
          if (serverMsg.toLowerCase().includes("invalid credentials"))
            return "Incorrect email or password."
          if (serverMsg.toLowerCase().includes("network") ||
              serverMsg.toLowerCase().includes("econnrefused"))
            return "Cannot reach the server. Is the backend running on port 4000?"
          return serverMsg
        }
        return "Login failed. Please try again."
      })()

      setError(friendlyMsg)
    } finally {
      setLoading(false)
    }
  }

  const fillCreds = (role: keyof typeof ROLE_INFO) => {
    const map = {
      admin:        { e: "admin@dentalcare.in",     p: "Admin@123"     },
      doctor:       { e: "doctor@dentalcare.in",    p: "Doctor@123"    },
      receptionist: { e: "reception@dentalcare.in", p: "Reception@123" },
    }
    setEmail(map[role].e)
    if (SHOW_DEMO) setPassword(map[role].p)
    setError("")
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@600;700&family=DM+Sans:wght@300;400;500;600&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        .lg-root  { min-height:100vh; display:flex; font-family:'DM Sans',sans-serif; background:#f9f7f4; }

        /* Left panel */
        .lg-left  { flex:1; background:linear-gradient(135deg,#0a1628,#0f2240 55%,#065f4a); display:flex; flex-direction:column; justify-content:center; align-items:center; padding:60px 48px; position:relative; overflow:hidden; }
        .lg-left::before { content:''; position:absolute; top:-100px; right:-100px; width:400px; height:400px; border-radius:50%; background:radial-gradient(circle,rgba(13,148,136,.15),transparent 65%); pointer-events:none; }
        .lg-brand { text-align:center; position:relative; z-index:1; }
        .lg-icon  { width:72px; height:72px; border-radius:20px; margin:0 auto 18px; background:linear-gradient(135deg,#0d9488,#0a1628); display:flex; align-items:center; justify-content:center; font-size:2rem; box-shadow:0 8px 32px rgba(13,148,136,.35); animation:lgFloat 4s ease-in-out infinite; }
        @keyframes lgFloat { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-8px)} }
        .lg-brand-name { font-family:'Cormorant Garamond',serif; font-size:2.4rem; font-weight:700; color:#fff; line-height:1; margin-bottom:6px; }
        .lg-brand-sub  { font-size:.7rem; font-weight:500; letter-spacing:.22em; text-transform:uppercase; color:#0d9488; margin-bottom:36px; }
        .lg-feats { display:flex; flex-direction:column; gap:10px; max-width:300px; }
        .lg-feat  { display:flex; align-items:center; gap:12px; padding:12px 16px; border-radius:12px; background:rgba(255,255,255,.04); border:1px solid rgba(255,255,255,.07); }
        .lg-feat-icon  { font-size:1.1rem; flex-shrink:0; }
        .lg-feat-title { font-size:.8rem; font-weight:500; color:#fff; display:block; }
        .lg-feat-desc  { font-size:.73rem; color:rgba(255,255,255,.5); }

        /* Right form */
        .lg-right { width:500px; flex-shrink:0; display:flex; flex-direction:column; justify-content:center; padding:60px 48px; overflow-y:auto; }
        @media(max-width:800px) { .lg-left{display:none} .lg-right{width:100%; padding:40px 24px} }

        .lg-title { font-family:'Cormorant Garamond',serif; font-size:2rem; font-weight:700; color:#0a1628; margin-bottom:4px; }
        .lg-sub   { font-size:.85rem; color:#64748b; font-weight:300; margin-bottom:16px; }

        /* Backend status */
        .lg-status { margin-bottom:18px; padding:9px 14px; border-radius:10px; background:rgba(13,148,136,.06); border:1px solid rgba(13,148,136,.2); font-size:.76rem; color:#0d9488; display:flex; align-items:center; gap:6px; flex-wrap:wrap; }
        .lg-status code { background:rgba(13,148,136,.12); padding:1px 6px; border-radius:4px; font-size:.73rem; }

        /* Role pills */
        .lg-roles    { display:flex; gap:8px; margin-bottom:22px; flex-wrap:wrap; }
        .lg-role-btn { flex:1; min-width:100px; padding:10px 8px; border-radius:12px; border:1.5px solid rgba(10,22,40,.12); background:#fff; cursor:pointer; font-family:'DM Sans',sans-serif; font-size:.76rem; font-weight:500; color:#64748b; transition:all .2s; text-align:center; }
        .lg-role-btn:hover { transform:translateY(-2px); box-shadow:0 4px 14px rgba(10,22,40,.1); }
        .lg-rb-icon  { font-size:1.2rem; display:block; margin-bottom:4px; }
        .lg-rb-label { font-size:.72rem; font-weight:600; display:block; }
        .lg-rb-desc  { font-size:.65rem; color:#94a3b8; display:block; margin-top:1px; }

        /* Fields */
        .lg-field { display:flex; flex-direction:column; gap:6px; margin-bottom:15px; }
        .lg-label { font-size:.7rem; font-weight:600; letter-spacing:.12em; text-transform:uppercase; color:#94a3b8; }
        .lg-iw    { position:relative; }
        .lg-input { width:100%; padding:12px 16px; border-radius:11px; border:1.5px solid rgba(10,22,40,.12); background:#fff; font-family:'DM Sans',sans-serif; font-size:.9rem; color:#0a1628; outline:none; transition:border-color .2s,box-shadow .2s; }
        .lg-input:focus { border-color:#0d9488; box-shadow:0 0 0 3px rgba(13,148,136,.1); }
        .lg-input.pr { padding-right:46px; }
        .lg-eye  { position:absolute; right:13px; top:50%; transform:translateY(-50%); background:none; border:none; cursor:pointer; color:#94a3b8; padding:4px; display:flex; align-items:center; transition:color .18s; }
        .lg-eye:hover { color:#0a1628; }

        /* Error */
        .lg-error { background:rgba(220,38,38,.06); border:1px solid rgba(220,38,38,.2); border-radius:10px; padding:10px 14px; font-size:.82rem; color:#dc2626; margin-bottom:14px; display:flex; align-items:flex-start; gap:7px; }

        /* Button */
        .lg-btn { width:100%; padding:13px; border-radius:50px; border:none; cursor:pointer; background:linear-gradient(135deg,#0d9488,#0a1628); color:#fff; font-family:'DM Sans',sans-serif; font-size:.94rem; font-weight:500; letter-spacing:.03em; box-shadow:0 4px 20px rgba(13,148,136,.3); transition:transform .18s,box-shadow .18s,opacity .18s; display:flex; align-items:center; justify-content:center; gap:8px; }
        .lg-btn:hover:not(:disabled) { transform:translateY(-1px); box-shadow:0 7px 28px rgba(13,148,136,.4); }
        .lg-btn:disabled { opacity:.65; cursor:not-allowed; }
        .lg-spin { width:17px; height:17px; border:2.5px solid rgba(255,255,255,.3); border-top-color:#fff; border-radius:50%; animation:spin .7s linear infinite; }
        @keyframes spin { to{transform:rotate(360deg)} }

        /* Demo accounts */
        .lg-sep       { display:flex; align-items:center; gap:10px; margin:18px 0; }
        .lg-sep-line  { flex:1; height:1px; background:rgba(10,22,40,.1); }
        .lg-sep-text  { font-size:.7rem; color:#94a3b8; white-space:nowrap; }
        .lg-creds-grid { display:grid; grid-template-columns:1fr 1fr 1fr; gap:8px; }
        @media(max-width:440px) { .lg-creds-grid { grid-template-columns:1fr; } }
        .lg-cred      { border-radius:12px; padding:11px 13px; cursor:pointer; transition:all .18s; border:1px solid transparent; }
        .lg-cred:hover { transform:translateY(-1px); box-shadow:0 4px 14px rgba(10,22,40,.08); }
        .lg-cred-head { font-size:.65rem; font-weight:700; letter-spacing:.12em; text-transform:uppercase; margin-bottom:7px; display:flex; align-items:center; gap:5px; }
        .lg-cred-row  { display:flex; align-items:center; justify-content:space-between; margin-bottom:3px; }
        .lg-cred-row:last-child { margin-bottom:0; }
        .lg-cred-key  { font-size:.68rem; color:#64748b; }
        .lg-cred-val  { font-size:.68rem; font-family:monospace; background:rgba(10,22,40,.07); padding:1px 6px; border-radius:4px; color:#0a1628; }
        .lg-footer    { margin-top:18px; text-align:center; font-size:.78rem; color:#94a3b8; }
        .lg-footer a  { color:#0d9488; text-decoration:none; font-weight:500; }
      `}</style>

      <div className="lg-root">

        {/* Left branding */}
        <div className="lg-left">
          <div className="lg-brand">
            <div className="lg-icon">🦷</div>
            <div className="lg-brand-name">DentalCare</div>
            <div className="lg-brand-sub">Clinic OS</div>
            <div className="lg-feats">
              {[
                { icon:"📅", title:"Smart Scheduling",  desc:"AI-powered appointment calendar" },
                { icon:"📊", title:"Revenue Analytics", desc:"Real-time performance insights"  },
                { icon:"🔐", title:"Role-Based Access", desc:"Admin · Doctor · Receptionist"   },
                { icon:"🤖", title:"AI Receptionist",   desc:"24/7 automated patient booking"  },
              ].map(f => (
                <div key={f.title} className="lg-feat">
                  <span className="lg-feat-icon">{f.icon}</span>
                  <div>
                    <span className="lg-feat-title">{f.title}</span>
                    <span className="lg-feat-desc">{f.desc}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right form */}
        <div className="lg-right">
          <h1 className="lg-title">Welcome back</h1>
          <p className="lg-sub">Select your role or enter credentials to sign in</p>

          <div className="lg-status">
            🔌 Backend: <strong>localhost:4000</strong> — run
            <code>npm run start:dev</code> in the backend folder
          </div>

          {/* Role quick-fill */}
          <div className="lg-roles">
            {(Object.keys(ROLE_INFO) as (keyof typeof ROLE_INFO)[]).map(r => {
              const info = ROLE_INFO[r]
              return (
                <button key={r} type="button" className="lg-role-btn"
                  style={{ borderColor: `${info.color}30` }}
                  onClick={() => fillCreds(r)}>
                  <span className="lg-rb-icon">{info.icon}</span>
                  <span className="lg-rb-label" style={{ color: info.color }}>{info.label}</span>
                  <span className="lg-rb-desc">Quick fill</span>
                </button>
              )
            })}
          </div>

          <form onSubmit={handleSubmit} noValidate>

            <div className="lg-field">
              <label className="lg-label" htmlFor="email">Email Address</label>
              <input id="email" className="lg-input" type="email"
                placeholder="your@email.com"
                value={email}
                onChange={e => { setEmail(e.target.value); setError("") }}
                autoComplete="email" />
            </div>

            <div className="lg-field">
              <label className="lg-label" htmlFor="password">Password</label>
              <div className="lg-iw">
                <input id="password" className="lg-input pr"
                  type={showPass ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={e => { setPassword(e.target.value); setError("") }}
                  autoComplete="current-password" />
                <button type="button" className="lg-eye"
                  onClick={() => setShowPass(v => !v)}
                  aria-label={showPass ? "Hide password" : "Show password"}>
                  {showPass
                    ? <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                    : <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                  }
                </button>
              </div>
            </div>

            {error && (
              <div className="lg-error" role="alert">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" style={{ flexShrink:0, marginTop:1 }}>
                  <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                </svg>
                {error}
              </div>
            )}

            <button type="submit" className="lg-btn" disabled={loading}>
              {loading ? <><span className="lg-spin" /> Signing in…</> : "Sign In →"}
            </button>

          </form>

          {/* Demo credentials — only rendered when NEXT_PUBLIC_SHOW_DEMO_CREDS=true */}
          {SHOW_DEMO && (
            <>
              <div className="lg-sep">
                <div className="lg-sep-line" />
                <span className="lg-sep-text">Demo Accounts</span>
                <div className="lg-sep-line" />
              </div>

              <div className="lg-creds-grid">
                {[
                  { role:"admin",        email:"admin@dentalcare.in",     pass:"Admin@123"     },
                  { role:"doctor",       email:"doctor@dentalcare.in",    pass:"Doctor@123"    },
                  { role:"receptionist", email:"reception@dentalcare.in", pass:"Reception@123" },
                ].map(c => {
                  const info = ROLE_INFO[c.role as keyof typeof ROLE_INFO]
                  return (
                    <div key={c.role} className="lg-cred"
                      style={{ background:`${info.color}08`, borderColor:`${info.color}25` }}
                      onClick={() => fillCreds(c.role as keyof typeof ROLE_INFO)}
                      role="button" tabIndex={0}
                      onKeyDown={e => e.key==="Enter" && fillCreds(c.role as keyof typeof ROLE_INFO)}>
                      <div className="lg-cred-head" style={{ color:info.color }}>
                        {info.icon} {info.label}
                      </div>
                      <div className="lg-cred-row">
                        <span className="lg-cred-key">Email</span>
                        <span className="lg-cred-val">{c.email.split("@")[0]}</span>
                      </div>
                      <div className="lg-cred-row">
                        <span className="lg-cred-key">Pass</span>
                        <span className="lg-cred-val">{c.pass}</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </>
          )}

          <div className="lg-footer"><a href="/">← Back to public site</a></div>
        </div>
      </div>
    </>
  )
}