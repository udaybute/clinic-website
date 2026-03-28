"use client"

// app/(dashboard)/dashboard/clinic-settings/page.tsx
// ADMIN ONLY — full clinic configuration
//
// API:
//   GET /api/settings/clinic
//   GET /api/settings/clinic/stats
//   PUT /api/settings/clinic

import { useState, useEffect, useCallback } from "react"
import { useAuthStore } from "@/store/authStore"
import API from "@/lib/api"

// ── Types ─────────────────────────────────────────────────────────────────────
interface WorkingDay {
  day:   string
  open:  boolean
  start: string
  end:   string
}

interface ClinicSettings {
  id:           string
  name:         string
  email:        string
  phone:        string
  address:      string
  website?:     string
  logoUrl?:     string
  plan:         string
  openingHours: string
  workingHours: WorkingDay[]
  createdAt:    string
  updatedAt:    string
}

interface ClinicStats {
  patients:     number
  appointments: number
  staff:        number
  services:     number
}

// ── Helpers ───────────────────────────────────────────────────────────────────
const PLAN_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  starter:      { label: "Starter",      color: "#64748b", bg: "rgba(100,116,139,.1)" },
  professional: { label: "Professional", color: "#7c3aed", bg: "rgba(124,58,237,.1)"  },
  enterprise:   { label: "Enterprise",   color: "#d97706", bg: "rgba(245,158,11,.1)"  },
}

function Skel({ w = "100%", h = "14px", r = "6px" }: { w?: string; h?: string; r?: string }) {
  return <div style={{ width: w, height: h, borderRadius: r, background: "linear-gradient(90deg,#f1f5f9 25%,#e2e8f0 50%,#f1f5f9 75%)", backgroundSize: "200% 100%", animation: "shimmer 1.4s infinite" }} />
}

function AccessDenied() {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: 400, gap: 16, textAlign: "center" }}>
      <div style={{ fontSize: "3rem" }}>🔒</div>
      <h2 style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: "1.5rem", fontWeight: 700, color: "#0a1628" }}>Admin Access Required</h2>
      <p style={{ fontSize: ".9rem", color: "#64748b", maxWidth: 360 }}>Clinic settings are restricted to administrators only.</p>
    </div>
  )
}

// ── Working Hours Editor ──────────────────────────────────────────────────────
function WorkingHoursEditor({ hours, onChange }: { hours: WorkingDay[]; onChange: (h: WorkingDay[]) => void }) {
  const toggle  = (i: number) => onChange(hours.map((d, idx) => idx === i ? { ...d, open: !d.open } : d))
  const setTime = (i: number, k: "start" | "end", v: string) =>
    onChange(hours.map((d, idx) => idx === i ? { ...d, [k]: v } : d))

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {hours.map((day, i) => (
        <div key={day.day} style={{ display: "flex", alignItems: "center", gap: 14, padding: "12px 16px", background: day.open ? "rgba(13,148,136,.04)" : "rgba(10,22,40,.02)", borderRadius: 12, border: `1px solid ${day.open ? "rgba(13,148,136,.15)" : "rgba(10,22,40,.07)"}`, transition: "all .2s" }}>
          {/* Toggle */}
          <button type="button" onClick={() => toggle(i)}
            style={{ position: "relative", width: 40, height: 22, borderRadius: 50, border: "none", background: day.open ? "#0d9488" : "#cbd5e1", cursor: "pointer", transition: "background .2s", flexShrink: 0 }}>
            <span style={{ position: "absolute", top: 3, left: day.open ? 21 : 3, width: 16, height: 16, borderRadius: "50%", background: "#fff", transition: "left .2s" }} />
          </button>

          {/* Day name */}
          <span style={{ width: 90, fontSize: ".84rem", fontWeight: 600, color: day.open ? "#0a1628" : "#94a3b8", flexShrink: 0 }}>{day.day}</span>

          {/* Time pickers */}
          {day.open ? (
            <div style={{ display: "flex", alignItems: "center", gap: 10, flex: 1 }}>
              <input type="time" value={day.start} onChange={e => setTime(i, "start", e.target.value)}
                style={{ padding: "6px 10px", borderRadius: 8, border: "1.5px solid rgba(10,22,40,.12)", fontFamily: "'DM Sans',sans-serif", fontSize: ".83rem", color: "#0a1628", outline: "none" }} />
              <span style={{ fontSize: ".8rem", color: "#94a3b8" }}>to</span>
              <input type="time" value={day.end} onChange={e => setTime(i, "end", e.target.value)}
                style={{ padding: "6px 10px", borderRadius: 8, border: "1.5px solid rgba(10,22,40,.12)", fontFamily: "'DM Sans',sans-serif", fontSize: ".83rem", color: "#0a1628", outline: "none" }} />
              <span style={{ fontSize: ".76rem", color: "#0d9488", fontWeight: 500, marginLeft: 4 }}>
                {(() => {
                  const [sh, sm] = day.start.split(":").map(Number)
                  const [eh, em] = day.end.split(":").map(Number)
                  const hrs = (eh * 60 + em - (sh * 60 + sm)) / 60
                  return hrs > 0 ? `${hrs}h` : ""
                })()}
              </span>
            </div>
          ) : (
            <span style={{ fontSize: ".82rem", color: "#94a3b8", fontStyle: "italic" }}>Closed</span>
          )}
        </div>
      ))}
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function ClinicSettingsPage() {
  const { role } = useAuthStore()
  if (role() !== "admin") return <AccessDenied />

  const [settings, setSettings] = useState<ClinicSettings | null>(null)
  const [stats,    setStats]    = useState<ClinicStats | null>(null)
  const [loading,  setLoading]  = useState(true)
  const [tab,      setTab]      = useState<"general" | "hours" | "plan">("general")

  const [form, setForm] = useState({ name: "", email: "", phone: "", address: "", website: "", logoUrl: "" })
  const [hours,  setHours]   = useState<WorkingDay[]>([])
  const [saving, setSaving]  = useState(false)
  const [saveMsg, setSaveMsg] = useState("")
  const [saveErr, setSaveErr] = useState("")

  const fetchSettings = useCallback(async () => {
    setLoading(true)
    try {
      const [sRes, stRes] = await Promise.all([
        API.get("/settings/clinic"),
        API.get("/settings/clinic/stats"),
      ])
      const s = sRes.data as unknown as ClinicSettings
      setSettings(s)
      setForm({ name: s.name, email: s.email, phone: s.phone, address: s.address, website: s.website ?? "", logoUrl: s.logoUrl ?? "" })
      setHours(s.workingHours ?? [])
      setStats(stRes.data as unknown as ClinicStats)
    } catch (err: any) {
      setSaveErr("Failed to load clinic settings")
    } finally { setLoading(false) }
  }, [])

  useEffect(() => { fetchSettings() }, [])

  const showMsg = (msg: string, isErr = false) => {
    if (isErr) { setSaveErr(msg); setTimeout(() => setSaveErr(""), 4000) }
    else       { setSaveMsg(msg); setTimeout(() => setSaveMsg(""), 4000) }
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name.trim())  return showMsg("Clinic name is required", true)
    if (!form.email.trim()) return showMsg("Email is required", true)
    if (!form.phone.trim()) return showMsg("Phone is required", true)
    setSaving(true)
    try {
      const payload: any = {
        name:    form.name.trim(),
        email:   form.email.trim(),
        phone:   form.phone.trim(),
        address: form.address.trim(),
        website: form.website.trim() || undefined,
        logoUrl: form.logoUrl.trim() || undefined,
      }
      if (tab === "hours") payload.workingHours = hours
      await API.put("/settings/clinic", payload)
      showMsg("Clinic settings saved successfully!")
      fetchSettings()
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? "Save failed"
      showMsg(Array.isArray(msg) ? msg[0] : msg, true)
    } finally { setSaving(false) }
  }

  const handleSaveHours = async () => {
    setSaving(true)
    try {
      await API.put("/settings/clinic", { workingHours: hours })
      showMsg("Working hours saved!")
    } catch (err: any) {
      showMsg(err?.response?.data?.message ?? "Save failed", true)
    } finally { setSaving(false) }
  }

  const inp: React.CSSProperties = { width: "100%", padding: "10px 13px", borderRadius: 10, border: "1.5px solid rgba(10,22,40,.1)", fontFamily: "'DM Sans',sans-serif", fontSize: ".87rem", color: "#0a1628", outline: "none", transition: "border-color .2s, box-shadow .2s" }
  const lbl: React.CSSProperties = { fontSize: ".68rem", fontWeight: 600, letterSpacing: ".1em", textTransform: "uppercase", color: "#94a3b8", display: "block", marginBottom: 5 }

  const plan = PLAN_CONFIG[settings?.plan ?? "starter"] ?? PLAN_CONFIG.starter

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@700&family=DM+Sans:wght@300;400;500;600&display=swap');
        @keyframes shimmer { to{background-position:-200% 0} }
        @keyframes spin    { to{transform:rotate(360deg)} }
        @keyframes fadeIn  { from{opacity:0;transform:translateY(6px)} to{opacity:1;transform:translateY(0)} }

        .cs-root  { font-family:'DM Sans',sans-serif; display:flex; flex-direction:column; gap:24px; max-width:820px; }
        .cs-hero  { background:#fff; border-radius:20px; border:1px solid rgba(10,22,40,.07); box-shadow:0 2px 14px rgba(10,22,40,.05); padding:24px 28px; display:flex; align-items:center; gap:20px; flex-wrap:wrap; }
        .cs-logo  { width:64px; height:64px; border-radius:16px; background:linear-gradient(135deg,#0d9488,#0a1628); display:flex; align-items:center; justify-content:center; font-family:'Cormorant Garamond',serif; font-size:1.4rem; font-weight:700; color:#fff; flex-shrink:0; }
        .cs-name  { font-family:'Cormorant Garamond',serif; font-size:1.3rem; font-weight:700; color:#0a1628; }
        .cs-email { font-size:.8rem; color:#64748b; margin-top:2px; }

        .cs-stats { display:grid; grid-template-columns:repeat(4,1fr); gap:12px; margin-left:auto; }
        @media(max-width:700px) { .cs-stats{grid-template-columns:repeat(2,1fr); margin-left:0; width:100%;} }
        .cs-stat  { text-align:center; padding:10px 14px; background:rgba(10,22,40,.03); border-radius:10px; }
        .cs-stat-num { font-family:'Cormorant Garamond',serif; font-size:1.4rem; font-weight:700; color:#0d9488; line-height:1; }
        .cs-stat-lbl { font-size:.66rem; color:#94a3b8; margin-top:2px; }

        .cs-tabs  { display:flex; gap:4px; background:rgba(10,22,40,.04); border-radius:12px; padding:4px; }
        .cs-tab   { flex:1; padding:9px 16px; border-radius:9px; border:none; cursor:pointer; font-family:'DM Sans',sans-serif; font-size:.82rem; font-weight:500; color:#64748b; background:none; transition:all .18s; }
        .cs-tab.active { background:#fff; color:#0a1628; box-shadow:0 1px 6px rgba(10,22,40,.1); }

        .cs-card  { background:#fff; border-radius:18px; border:1px solid rgba(10,22,40,.07); box-shadow:0 2px 14px rgba(10,22,40,.05); padding:24px 28px; }
        .cs-card-title { font-family:'Cormorant Garamond',serif; font-size:1.1rem; font-weight:700; color:#0a1628; margin-bottom:4px; }
        .cs-card-sub   { font-size:.8rem; color:#64748b; margin-bottom:20px; }
        .cs-grid2 { display:grid; grid-template-columns:1fr 1fr; gap:16px; }
        @media(max-width:600px) { .cs-grid2{grid-template-columns:1fr;} }
        .cs-field { display:flex; flex-direction:column; gap:5px; }

        .cs-save-btn { padding:10px 24px; border-radius:50px; border:none; cursor:pointer; background:linear-gradient(135deg,#0d9488,#0a1628); color:#fff; font-family:'DM Sans',sans-serif; font-size:.87rem; font-weight:500; box-shadow:0 3px 14px rgba(13,148,136,.28); transition:transform .18s; display:flex; align-items:center; gap:7px; }
        .cs-save-btn:hover:not(:disabled) { transform:translateY(-1px); }
        .cs-save-btn:disabled { opacity:.6; cursor:not-allowed; }
        .cs-spin { width:15px; height:15px; border:2px solid rgba(255,255,255,.3); border-top-color:#fff; border-radius:50%; animation:spin .7s linear infinite; display:inline-block; }

        .cs-success { background:rgba(22,163,74,.08); border:1px solid rgba(22,163,74,.2); border-radius:10px; padding:10px 14px; font-size:.82rem; color:#16a34a; animation:fadeIn .3s ease; }
        .cs-error   { background:rgba(220,38,38,.06); border:1px solid rgba(220,38,38,.2); border-radius:10px; padding:10px 14px; font-size:.82rem; color:#dc2626; }
        .cs-divider { height:1px; background:rgba(10,22,40,.07); margin:18px 0; }

        input:focus { border-color:#0d9488 !important; box-shadow:0 0 0 3px rgba(13,148,136,.1) !important; }
        textarea:focus { border-color:#0d9488 !important; box-shadow:0 0 0 3px rgba(13,148,136,.1) !important; }
      `}</style>

      <div className="cs-root">

        {/* Clinic hero */}
        <div className="cs-hero">
          {loading ? (
            <>
              <Skel w="64px" h="64px" r="16px" />
              <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 7 }}><Skel h="20px" w="40%" /><Skel h="13px" w="55%" /></div>
            </>
          ) : settings && (
            <>
              <div className="cs-logo">
                {settings.logoUrl ? (
                  <img src={settings.logoUrl} alt="Logo" style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: 16 }} />
                ) : (
                  settings.name.slice(0, 2).toUpperCase()
                )}
              </div>
              <div>
                <div className="cs-name">{settings.name}</div>
                <div className="cs-email">{settings.email} · {settings.phone}</div>
                <div style={{ marginTop: 6 }}>
                  <span style={{ fontSize: ".68rem", fontWeight: 700, padding: "2px 9px", borderRadius: 50, background: plan.bg, color: plan.color, letterSpacing: ".06em", textTransform: "uppercase" }}>
                    {plan.label} Plan
                  </span>
                </div>
              </div>
              {stats && (
                <div className="cs-stats">
                  {[
                    { num: stats.patients,     lbl: "Patients"     },
                    { num: stats.appointments, lbl: "Appointments" },
                    { num: stats.staff,        lbl: "Staff"        },
                    { num: stats.services,     lbl: "Services"     },
                  ].map(s => (
                    <div key={s.lbl} className="cs-stat">
                      <div className="cs-stat-num">{s.num}</div>
                      <div className="cs-stat-lbl">{s.lbl}</div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        {/* Tabs */}
        <div className="cs-tabs">
          {[
            { key: "general", label: "🏥 General"       },
            { key: "hours",   label: "🕐 Working Hours" },
            { key: "plan",    label: "💎 Plan & Billing" },
          ].map(t => (
            <button key={t.key} className={`cs-tab${tab === t.key ? " active" : ""}`} onClick={() => setTab(t.key as any)}>
              {t.label}
            </button>
          ))}
        </div>

        {saveMsg && <div className="cs-success">✓ {saveMsg}</div>}
        {saveErr && <div className="cs-error">⚠️ {saveErr}</div>}

        {/* General tab */}
        {tab === "general" && (
          <div className="cs-card">
            <div className="cs-card-title">General Information</div>
            <div className="cs-card-sub">Basic clinic details, contact info, and branding.</div>

            {loading ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                {[1,2,3,4].map(n => <Skel key={n} h="40px" r="10px" />)}
              </div>
            ) : (
              <form onSubmit={handleSave} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <div className="cs-field">
                  <label style={lbl}>Clinic Name *</label>
                  <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} style={inp} placeholder="DentalCare Smile Studio" />
                </div>

                <div className="cs-grid2">
                  <div className="cs-field">
                    <label style={lbl}>Contact Email *</label>
                    <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} style={inp} placeholder="clinic@example.com" />
                  </div>
                  <div className="cs-field">
                    <label style={lbl}>Phone Number *</label>
                    <input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} style={inp} placeholder="+91 98765 00000" />
                  </div>
                </div>

                <div className="cs-field">
                  <label style={lbl}>Address</label>
                  <textarea value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} rows={2}
                    style={{ ...inp, resize: "vertical" } as any} placeholder="Full clinic address" />
                </div>

                <div className="cs-grid2">
                  <div className="cs-field">
                    <label style={lbl}>Website</label>
                    <input value={form.website} onChange={e => setForm(f => ({ ...f, website: e.target.value }))} style={inp} placeholder="https://yourClinic.com" />
                  </div>
                  <div className="cs-field">
                    <label style={lbl}>Logo URL</label>
                    <input value={form.logoUrl} onChange={e => setForm(f => ({ ...f, logoUrl: e.target.value }))} style={inp} placeholder="https://cdn.yourClinic.com/logo.png" />
                  </div>
                </div>

                {/* Logo preview */}
                {form.logoUrl && (
                  <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", background: "rgba(10,22,40,.03)", borderRadius: 10 }}>
                    <img src={form.logoUrl} alt="Logo preview" style={{ width: 48, height: 48, objectFit: "cover", borderRadius: 10, border: "1px solid rgba(10,22,40,.1)" }} onError={e => (e.currentTarget.style.display = "none")} />
                    <span style={{ fontSize: ".8rem", color: "#64748b" }}>Logo preview</span>
                  </div>
                )}

                <div style={{ display: "flex", justifyContent: "flex-end", paddingTop: 4 }}>
                  <button type="submit" className="cs-save-btn" disabled={saving}>
                    {saving && <span className="cs-spin" />}
                    {saving ? "Saving…" : "Save General Settings"}
                  </button>
                </div>
              </form>
            )}
          </div>
        )}

        {/* Working hours tab */}
        {tab === "hours" && (
          <div className="cs-card">
            <div className="cs-card-title">Working Hours</div>
            <div className="cs-card-sub">Configure your clinic's opening and closing times for each day.</div>

            {loading ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {[1,2,3,4,5,6,7].map(n => <Skel key={n} h="50px" r="12px" />)}
              </div>
            ) : (
              <>
                <WorkingHoursEditor hours={hours} onChange={setHours} />

                <div className="cs-divider" />

                {/* Quick apply presets */}
                <div style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: ".72rem", fontWeight: 600, letterSpacing: ".1em", textTransform: "uppercase", color: "#94a3b8", marginBottom: 8 }}>Quick Presets</div>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    {[
                      { label: "Mon–Fri",  days: ["Monday","Tuesday","Wednesday","Thursday","Friday"],                              start: "09:00", end: "18:00" },
                      { label: "Mon–Sat",  days: ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"],                   start: "09:00", end: "18:00" },
                      { label: "All Week", days: ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"],          start: "09:00", end: "17:00" },
                    ].map(preset => (
                      <button key={preset.label} type="button"
                        onClick={() => setHours(h => h.map(d => ({ ...d, open: preset.days.includes(d.day), start: preset.days.includes(d.day) ? preset.start : d.start, end: preset.days.includes(d.day) ? preset.end : d.end })))}
                        style={{ padding: "6px 14px", borderRadius: 8, border: "1px solid rgba(10,22,40,.12)", background: "#fff", cursor: "pointer", fontFamily: "'DM Sans',sans-serif", fontSize: ".78rem", color: "#64748b", transition: "all .15s" }}
                        onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(13,148,136,.06)"; (e.currentTarget as HTMLButtonElement).style.color = "#0d9488" }}
                        onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = "#fff"; (e.currentTarget as HTMLButtonElement).style.color = "#64748b" }}>
                        {preset.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div style={{ display: "flex", justifyContent: "flex-end" }}>
                  <button type="button" className="cs-save-btn" disabled={saving} onClick={handleSaveHours}>
                    {saving && <span className="cs-spin" />}
                    {saving ? "Saving…" : "Save Working Hours"}
                  </button>
                </div>
              </>
            )}
          </div>
        )}

        {/* Plan tab */}
        {tab === "plan" && (
          <div className="cs-card">
            <div className="cs-card-title">Plan & Billing</div>
            <div className="cs-card-sub">Your current subscription and usage information.</div>

            {/* Current plan */}
            <div style={{ padding: "20px 24px", background: "linear-gradient(135deg,#0d9488,#0a1628)", borderRadius: 16, color: "#fff", marginBottom: 20 }}>
              <div style={{ fontSize: ".72rem", color: "rgba(255,255,255,.6)", marginBottom: 4 }}>Current Plan</div>
              <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: "1.5rem", fontWeight: 700, marginBottom: 8 }}>{plan.label}</div>
              <div style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
                {stats && [
                  { l: "Patients",     v: stats.patients     },
                  { l: "Appointments", v: stats.appointments },
                  { l: "Staff",        v: stats.staff        },
                  { l: "Services",     v: stats.services     },
                ].map(s => (
                  <div key={s.l}>
                    <div style={{ fontSize: "1.2rem", fontWeight: 700 }}>{s.v}</div>
                    <div style={{ fontSize: ".72rem", color: "rgba(255,255,255,.6)" }}>{s.l}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Plan comparison */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 14 }}>
              {[
                { key: "starter",      name: "Starter",      price: "Free",     features: ["Up to 2 staff","50 patients/mo","Basic reports","Email support"] },
                { key: "professional", name: "Professional", price: "₹2,999/mo",features: ["Up to 10 staff","Unlimited patients","Advanced analytics","Priority support","Custom branding"] },
                { key: "enterprise",   name: "Enterprise",   price: "₹7,999/mo",features: ["Unlimited staff","Unlimited patients","Full analytics suite","24/7 support","API access","White-label"] },
              ].map(p => {
                const isCurrent = settings?.plan === p.key
                return (
                  <div key={p.key} style={{ padding: "18px 16px", borderRadius: 14, border: `1.5px solid ${isCurrent ? "#0d9488" : "rgba(10,22,40,.1)"}`, background: isCurrent ? "rgba(13,148,136,.04)" : "#fff", position: "relative" }}>
                    {isCurrent && (
                      <div style={{ position: "absolute", top: -10, left: "50%", transform: "translateX(-50%)", fontSize: ".65rem", fontWeight: 700, padding: "2px 10px", borderRadius: 50, background: "#0d9488", color: "#fff", letterSpacing: ".06em", textTransform: "uppercase", whiteSpace: "nowrap" }}>
                        Current Plan
                      </div>
                    )}
                    <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: "1.05rem", fontWeight: 700, color: "#0a1628", marginBottom: 4 }}>{p.name}</div>
                    <div style={{ fontSize: "1rem", fontWeight: 700, color: "#0d9488", marginBottom: 12 }}>{p.price}</div>
                    <ul style={{ margin: 0, paddingLeft: 16, fontSize: ".76rem", color: "#475569", lineHeight: 1.8 }}>
                      {p.features.map(f => <li key={f}>{f}</li>)}
                    </ul>
                    {!isCurrent && (
                      <button style={{ marginTop: 14, width: "100%", padding: "8px 0", borderRadius: 9, border: "1.5px solid rgba(10,22,40,.15)", background: "none", cursor: "pointer", fontFamily: "'DM Sans',sans-serif", fontSize: ".78rem", fontWeight: 500, color: "#0a1628", transition: "all .15s" }}>
                        Upgrade
                      </button>
                    )}
                  </div>
                )
              })}
            </div>

            <div style={{ marginTop: 16, padding: "12px 16px", background: "rgba(37,99,235,.05)", border: "1px solid rgba(37,99,235,.15)", borderRadius: 10, fontSize: ".8rem", color: "#2563eb" }}>
              💡 To upgrade your plan, contact support at <strong>support@dentalcare.in</strong> or call <strong>+91 98765 00000</strong>.
            </div>
          </div>
        )}
      </div>
    </>
  )
}