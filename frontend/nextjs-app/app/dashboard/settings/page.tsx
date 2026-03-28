"use client"

// app/(dashboard)/dashboard/settings/page.tsx
// ALL ROLES — personal profile settings
// Each user manages their own: name, phone, specialty (doctor), password
//
// API:
//   GET /api/settings/profile
//   PUT /api/settings/profile

import { useState, useEffect } from "react"
import { useAuthStore } from "@/store/authStore"
import API from "@/lib/api"

// ── Types ─────────────────────────────────────────────────────────────────────
interface UserProfile {
  id:              string
  name:            string
  email:           string
  phone?:          string
  role:            string
  specialty?:      string
  avatar?:         string
  qualifications?: string
  consultationFee?: number
  availability?:   string[]
  createdAt:       string
}

// ── Helpers ───────────────────────────────────────────────────────────────────
const ROLE_LABEL: Record<string, string> = {
  admin:        "Super Admin",
  doctor:       "Doctor",
  receptionist: "Receptionist",
}
const ROLE_COLOR: Record<string, { color: string; bg: string }> = {
  admin:        { color: "#d97706", bg: "rgba(245,158,11,.1)"  },
  doctor:       { color: "#0d9488", bg: "rgba(13,148,136,.1)"  },
  receptionist: { color: "#2563eb", bg: "rgba(37,99,235,.1)"   },
}

function getInitials(name: string) {
  return name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()
}
function formatDate(d: string) {
  return new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })
}
function Skel({ w = "100%", h = "14px", r = "6px" }: { w?: string; h?: string; r?: string }) {
  return <div style={{ width: w, height: h, borderRadius: r, background: "linear-gradient(90deg,#f1f5f9 25%,#e2e8f0 50%,#f1f5f9 75%)", backgroundSize: "200% 100%", animation: "shimmer 1.4s infinite" }} />
}

export default function SettingsPage() {
  const { role } = useAuthStore()
  const isDoctor = role() === "doctor"

  const [profile,  setProfile]  = useState<UserProfile | null>(null)
  const [loading,  setLoading]  = useState(true)
  const [tab,      setTab]      = useState<"profile" | "security" | "doctor">("profile")

  // Profile form
  const [form, setForm] = useState({ name: "", phone: "", specialty: "", qualifications: "", consultationFee: "" })
  const [saving,  setSaving]  = useState(false)
  const [saveMsg, setSaveMsg] = useState("")
  const [saveErr, setSaveErr] = useState("")

  // Password form
  const [pwForm, setPwForm] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" })
  const [pwSaving, setPwSaving] = useState(false)
  const [pwMsg,    setPwMsg]    = useState("")
  const [pwErr,    setPwErr]    = useState("")

  // Load profile
  useEffect(() => {
    API.get("/settings/profile").then(res => {
      const p = res.data as unknown as UserProfile
      setProfile(p)
      setForm({
        name:            p.name            ?? "",
        phone:           p.phone           ?? "",
        specialty:       p.specialty       ?? "",
        qualifications:  p.qualifications  ?? "",
        consultationFee: p.consultationFee ? String(p.consultationFee) : "",
      })
    }).catch(() => {}).finally(() => setLoading(false))
  }, [])

  const showMsg = (set: (v: string) => void, msg: string) => { set(msg); setTimeout(() => set(""), 4000) }

  // Save profile
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name.trim()) return setSaveErr("Name is required")
    setSaveErr(""); setSaving(true)
    try {
      const payload: any = { name: form.name.trim(), phone: form.phone.trim() || undefined }
      if (isDoctor) {
        payload.specialty       = form.specialty       || undefined
        payload.qualifications  = form.qualifications  || undefined
        payload.consultationFee = form.consultationFee ? parseFloat(form.consultationFee) : undefined
      }
      const res = await API.put("/settings/profile", payload)
      setProfile(res.data as unknown as UserProfile)
      showMsg(setSaveMsg, "Profile updated successfully!")
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? "Update failed"
      setSaveErr(Array.isArray(msg) ? msg[0] : msg)
    } finally { setSaving(false) }
  }

  // Change password
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!pwForm.currentPassword) return setPwErr("Current password is required")
    if (!pwForm.newPassword)     return setPwErr("New password is required")
    if (pwForm.newPassword.length < 8) return setPwErr("Password must be at least 8 characters")
    if (pwForm.newPassword !== pwForm.confirmPassword) return setPwErr("Passwords don't match")
    setPwErr(""); setPwSaving(true)
    try {
      await API.put("/settings/profile", { currentPassword: pwForm.currentPassword, newPassword: pwForm.newPassword })
      setPwForm({ currentPassword: "", newPassword: "", confirmPassword: "" })
      showMsg(setPwMsg, "Password changed successfully!")
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? "Password change failed"
      setPwErr(Array.isArray(msg) ? msg[0] : msg)
    } finally { setPwSaving(false) }
  }

  const inp: React.CSSProperties = { width: "100%", padding: "10px 13px", borderRadius: 10, border: "1.5px solid rgba(10,22,40,.1)", fontFamily: "'DM Sans',sans-serif", fontSize: ".87rem", color: "#0a1628", outline: "none", transition: "border-color .2s, box-shadow .2s" }
  const lbl: React.CSSProperties = { fontSize: ".68rem", fontWeight: 600, letterSpacing: ".1em", textTransform: "uppercase", color: "#94a3b8", display: "block", marginBottom: 5 }

  const tabs = [
    { key: "profile",  label: "👤 Profile"   },
    { key: "security", label: "🔒 Security"  },
    ...(isDoctor ? [{ key: "doctor", label: "🩺 Professional" }] : []),
  ]

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@700&family=DM+Sans:wght@300;400;500;600&display=swap');
        @keyframes shimmer { to{background-position:-200% 0} }
        @keyframes spin    { to{transform:rotate(360deg)} }
        @keyframes fadeIn  { from{opacity:0;transform:translateY(6px)} to{opacity:1;transform:translateY(0)} }

        .st-root  { font-family:'DM Sans',sans-serif; display:flex; flex-direction:column; gap:24px; max-width:760px; }
        .st-hero  { background:linear-gradient(135deg,#0a1628 0%,#1e3a5f 100%); border-radius:20px; padding:28px 32px; display:flex; align-items:center; gap:20px; }
        .st-av    { width:72px; height:72px; border-radius:50%; background:linear-gradient(135deg,#0d9488,#fff); display:flex; align-items:center; justify-content:center; fontFamily:"'Cormorant Garamond',serif"; fontSize:1.4rem; fontWeight:700; color:#0a1628; flex-shrink:0; box-shadow:0 0 0 4px rgba(255,255,255,.15); }
        .st-name  { font-family:'Cormorant Garamond',serif; font-size:1.4rem; font-weight:700; color:#fff; margin-bottom:4px; }
        .st-email { font-size:.82rem; color:rgba(255,255,255,.6); margin-bottom:8px; }
        .st-role  { display:inline-block; font-size:.68rem; font-weight:700; letter-spacing:.1em; text-transform:uppercase; padding:3px 10px; border-radius:50px; }

        .st-tabs  { display:flex; gap:4px; background:rgba(10,22,40,.04); border-radius:12px; padding:4px; }
        .st-tab   { flex:1; padding:9px 16px; border-radius:9px; border:none; cursor:pointer; font-family:'DM Sans',sans-serif; font-size:.82rem; font-weight:500; color:#64748b; background:none; transition:all .18s; }
        .st-tab.active { background:#fff; color:#0a1628; box-shadow:0 1px 6px rgba(10,22,40,.1); }

        .st-card  { background:#fff; border-radius:18px; border:1px solid rgba(10,22,40,.07); box-shadow:0 2px 14px rgba(10,22,40,.05); padding:24px 28px; }
        .st-card-title { font-family:'Cormorant Garamond',serif; font-size:1.1rem; font-weight:700; color:#0a1628; margin-bottom:4px; }
        .st-card-sub   { font-size:.8rem; color:#64748b; margin-bottom:20px; }
        .st-grid2 { display:grid; grid-template-columns:1fr 1fr; gap:16px; }
        @media(max-width:600px) { .st-grid2{grid-template-columns:1fr;} }
        .st-field { display:flex; flex-direction:column; gap:5px; }

        .st-save-btn { padding:10px 24px; border-radius:50px; border:none; cursor:pointer; background:linear-gradient(135deg,#0d9488,#0a1628); color:#fff; font-family:'DM Sans',sans-serif; font-size:.87rem; font-weight:500; box-shadow:0 3px 14px rgba(13,148,136,.28); transition:transform .18s; display:flex; align-items:center; gap:7px; }
        .st-save-btn:hover:not(:disabled) { transform:translateY(-1px); }
        .st-save-btn:disabled { opacity:.6; cursor:not-allowed; }
        .st-spin { width:15px; height:15px; border:2px solid rgba(255,255,255,.3); border-top-color:#fff; border-radius:50%; animation:spin .7s linear infinite; display:inline-block; }

        .st-success { background:rgba(22,163,74,.08); border:1px solid rgba(22,163,74,.2); border-radius:10px; padding:10px 14px; font-size:.82rem; color:#16a34a; animation:fadeIn .3s ease; }
        .st-error   { background:rgba(220,38,38,.06); border:1px solid rgba(220,38,38,.2); border-radius:10px; padding:10px 14px; font-size:.82rem; color:#dc2626; }
        .st-divider { height:1px; background:rgba(10,22,40,.07); margin:20px 0; }

        input:focus { border-color:#0d9488 !important; box-shadow:0 0 0 3px rgba(13,148,136,.1) !important; }
      `}</style>

      <div className="st-root">

        {/* Hero profile card */}
        {loading ? (
          <div style={{ background: "rgba(10,22,40,.06)", borderRadius: 20, padding: "28px 32px", display: "flex", alignItems: "center", gap: 20 }}>
            <Skel w="72px" h="72px" r="50%" />
            <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8 }}><Skel h="22px" w="40%" /><Skel h="14px" w="55%" /><Skel h="22px" w="80px" r="50px" /></div>
          </div>
        ) : profile && (
          <div className="st-hero">
            <div className="st-av" style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: "1.4rem", fontWeight: 700 }}>
              {getInitials(profile.name)}
            </div>
            <div>
              <div className="st-name">{profile.name}</div>
              <div className="st-email">{profile.email}</div>
              <span className="st-role" style={{ background: ROLE_COLOR[profile.role]?.bg ?? "rgba(10,22,40,.1)", color: ROLE_COLOR[profile.role]?.color ?? "#0a1628" }}>
                {ROLE_LABEL[profile.role] ?? profile.role}
              </span>
            </div>
            <div style={{ marginLeft: "auto", textAlign: "right" }}>
              <div style={{ fontSize: ".72rem", color: "rgba(255,255,255,.5)" }}>Member since</div>
              <div style={{ fontSize: ".82rem", color: "rgba(255,255,255,.8)", marginTop: 2 }}>{formatDate(profile.createdAt)}</div>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="st-tabs">
          {tabs.map(t => (
            <button key={t.key} className={`st-tab${tab === t.key ? " active" : ""}`} onClick={() => setTab(t.key as any)}>
              {t.label}
            </button>
          ))}
        </div>

        {/* Profile tab */}
        {tab === "profile" && (
          <div className="st-card">
            <div className="st-card-title">Personal Information</div>
            <div className="st-card-sub">Update your name, phone number, and contact details.</div>

            {loading ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                {[1,2,3].map(n => <Skel key={n} h="40px" r="10px" />)}
              </div>
            ) : (
              <form onSubmit={handleSaveProfile} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <div className="st-grid2">
                  <div className="st-field">
                    <label style={lbl}>Full Name *</label>
                    <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} style={inp} placeholder="Your full name" />
                  </div>
                  <div className="st-field">
                    <label style={lbl}>Phone Number</label>
                    <input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} style={inp} placeholder="+91 98765 00000" />
                  </div>
                </div>

                <div className="st-field">
                  <label style={lbl}>Email Address</label>
                  <input value={profile?.email ?? ""} disabled style={{ ...inp, background: "rgba(10,22,40,.03)", color: "#94a3b8", cursor: "not-allowed" }} />
                  <span style={{ fontSize: ".72rem", color: "#94a3b8" }}>Email cannot be changed. Contact your administrator.</span>
                </div>

                {saveErr && <div className="st-error">{saveErr}</div>}
                {saveMsg && <div className="st-success">✓ {saveMsg}</div>}

                <div style={{ display: "flex", justifyContent: "flex-end", paddingTop: 4 }}>
                  <button type="submit" className="st-save-btn" disabled={saving}>
                    {saving && <span className="st-spin" />}
                    {saving ? "Saving…" : "Save Profile"}
                  </button>
                </div>
              </form>
            )}
          </div>
        )}

        {/* Security tab */}
        {tab === "security" && (
          <div className="st-card">
            <div className="st-card-title">Change Password</div>
            <div className="st-card-sub">Choose a strong password with at least 8 characters.</div>

            <form onSubmit={handleChangePassword} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div className="st-field">
                <label style={lbl}>Current Password *</label>
                <input type="password" value={pwForm.currentPassword} onChange={e => setPwForm(f => ({ ...f, currentPassword: e.target.value }))} style={inp} placeholder="Enter current password" />
              </div>
              <div className="st-grid2">
                <div className="st-field">
                  <label style={lbl}>New Password *</label>
                  <input type="password" value={pwForm.newPassword} onChange={e => setPwForm(f => ({ ...f, newPassword: e.target.value }))} style={inp} placeholder="Min. 8 characters" />
                </div>
                <div className="st-field">
                  <label style={lbl}>Confirm New Password *</label>
                  <input type="password" value={pwForm.confirmPassword} onChange={e => setPwForm(f => ({ ...f, confirmPassword: e.target.value }))} style={inp} placeholder="Repeat new password" />
                </div>
              </div>

              {/* Password strength indicator */}
              {pwForm.newPassword && (
                <div>
                  <div style={{ display: "flex", gap: 4, marginBottom: 4 }}>
                    {[8, 12, 16].map((len, i) => (
                      <div key={i} style={{ flex: 1, height: 4, borderRadius: 2, background: pwForm.newPassword.length >= len ? (i === 0 ? "#f59e0b" : i === 1 ? "#0d9488" : "#16a34a") : "rgba(10,22,40,.1)", transition: "background .3s" }} />
                    ))}
                  </div>
                  <span style={{ fontSize: ".72rem", color: pwForm.newPassword.length < 8 ? "#ef4444" : pwForm.newPassword.length < 12 ? "#f59e0b" : "#16a34a" }}>
                    {pwForm.newPassword.length < 8 ? "Too short" : pwForm.newPassword.length < 12 ? "Good" : "Strong"}
                  </span>
                </div>
              )}

              {pwErr && <div className="st-error">{pwErr}</div>}
              {pwMsg && <div className="st-success">✓ {pwMsg}</div>}

              <div style={{ display: "flex", justifyContent: "flex-end" }}>
                <button type="submit" className="st-save-btn" disabled={pwSaving}>
                  {pwSaving && <span className="st-spin" />}
                  {pwSaving ? "Changing…" : "Change Password"}
                </button>
              </div>
            </form>

            <div className="st-divider" />

            <div style={{ padding: "14px 16px", background: "rgba(37,99,235,.05)", border: "1px solid rgba(37,99,235,.15)", borderRadius: 12 }}>
              <div style={{ fontSize: ".82rem", fontWeight: 600, color: "#2563eb", marginBottom: 6 }}>🛡️ Security Tips</div>
              <ul style={{ margin: 0, paddingLeft: 18, fontSize: ".78rem", color: "#64748b", lineHeight: 1.7 }}>
                <li>Use at least 12 characters for a strong password</li>
                <li>Mix uppercase, lowercase, numbers, and symbols</li>
                <li>Never share your password with anyone</li>
                <li>Change your password every 3–6 months</li>
              </ul>
            </div>
          </div>
        )}

        {/* Doctor professional tab */}
        {tab === "doctor" && isDoctor && (
          <div className="st-card">
            <div className="st-card-title">Professional Details</div>
            <div className="st-card-sub">Your specialization, qualifications, and consultation information.</div>

            <form onSubmit={handleSaveProfile} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div className="st-grid2">
                <div className="st-field">
                  <label style={lbl}>Specialty</label>
                  <input value={form.specialty} onChange={e => setForm(f => ({ ...f, specialty: e.target.value }))} style={inp} placeholder="e.g. Orthodontics" />
                </div>
                <div className="st-field">
                  <label style={lbl}>Consultation Fee (₹)</label>
                  <input type="number" min={0} value={form.consultationFee} onChange={e => setForm(f => ({ ...f, consultationFee: e.target.value }))} style={inp} placeholder="e.g. 500" />
                </div>
              </div>
              <div className="st-field">
                <label style={lbl}>Qualifications</label>
                <input value={form.qualifications} onChange={e => setForm(f => ({ ...f, qualifications: e.target.value }))} style={inp} placeholder="e.g. BDS, MDS (Orthodontics), FICOI" />
              </div>

              {saveErr && <div className="st-error">{saveErr}</div>}
              {saveMsg && <div className="st-success">✓ {saveMsg}</div>}

              <div style={{ display: "flex", justifyContent: "flex-end" }}>
                <button type="submit" className="st-save-btn" disabled={saving}>
                  {saving && <span className="st-spin" />}
                  {saving ? "Saving…" : "Save Professional Info"}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </>
  )
}