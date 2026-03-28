"use client"

// app/(dashboard)/dashboard/doctors/page.tsx
// ADMIN ONLY — manages doctor profiles
//
// API:
//   GET    /api/staff?role=doctor&search=&page=
//   POST   /api/staff
//   PUT    /api/staff/:id
//   PATCH  /api/staff/:id/status
//   DELETE /api/staff/:id

import { useState, useEffect, useCallback, useRef } from "react"
import { useAuthStore } from "@/store/authStore"
import API from "@/lib/api"

// ── Types ─────────────────────────────────────────────────────────────────────
interface Doctor {
  id:              string
  name:            string
  email:           string
  phone?:          string
  role:            "doctor"
  isActive:        boolean
  specialty?:      string
  experience?:     number
  qualifications?: string
  consultationFee?: number
  availability?:   string[]
  createdAt:       string
  _count?:         { appointments: number }
}

interface DoctorResponse {
  users:      Doctor[]
  total:      number
  page:       number
  totalPages: number
  counts:     Record<string, number>
}

// ── Constants ─────────────────────────────────────────────────────────────────
const SPECIALTIES = [
  "General Dentistry", "Orthodontics", "Oral Surgery",
  "Endodontics", "Periodontics", "Prosthodontics",
  "Pediatric Dentistry", "Cosmetic Dentistry",
]

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]

const SPECIALTY_COLORS: Record<string, string> = {
  "General Dentistry":  "#0d9488",
  "Orthodontics":       "#7c3aed",
  "Oral Surgery":       "#dc2626",
  "Endodontics":        "#2563eb",
  "Periodontics":       "#16a34a",
  "Prosthodontics":     "#d97706",
  "Pediatric Dentistry":"#ec4899",
  "Cosmetic Dentistry": "#0891b2",
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function getInitials(name: string) {
  return name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()
}
function formatDate(d: string) {
  return new Date(d).toLocaleDateString("en-IN", { month: "short", year: "numeric" })
}
function fmt(v: number) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(v)
}
function Skel({ w = "100%", h = "14px", r = "6px" }: { w?: string; h?: string; r?: string }) {
  return <div style={{ width: w, height: h, borderRadius: r, background: "linear-gradient(90deg,#f1f5f9 25%,#e2e8f0 50%,#f1f5f9 75%)", backgroundSize: "200% 100%", animation: "shimmer 1.4s infinite" }} />
}

function AccessDenied() {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: 400, gap: 16, textAlign: "center" }}>
      <div style={{ fontSize: "3rem" }}>🔒</div>
      <h2 style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: "1.5rem", fontWeight: 700, color: "#0a1628" }}>Admin Access Required</h2>
      <p style={{ fontSize: ".9rem", color: "#64748b", maxWidth: 340 }}>Doctor management is restricted to administrators.</p>
    </div>
  )
}

// ── Doctor Modal ──────────────────────────────────────────────────────────────
function DoctorModal({ mode, initial = {}, onClose, onSave }: {
  mode: "create" | "edit"
  initial?: Partial<Doctor>
  onClose: () => void
  onSave: (d: any) => Promise<void>
}) {
  const [form, setForm] = useState({
    name:            initial.name            ?? "",
    email:           initial.email           ?? "",
    phone:           initial.phone           ?? "",
    password:        "",
    specialty:       initial.specialty       ?? "",
    experience:      String(initial.experience ?? ""),
    qualifications:  initial.qualifications  ?? "",
    consultationFee: String(initial.consultationFee ?? ""),
    availability:    initial.availability    ?? [] as string[],
  })
  const [saving, setSaving] = useState(false)
  const [error,  setError]  = useState("")

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }))

  // Availability: toggle days
  const [selDays, setSelDays] = useState<string[]>(
    DAYS.filter(d => (initial.availability ?? []).some(a => a.startsWith(d)))
  )
  const [startTime, setStartTime] = useState("09:00")
  const [endTime,   setEndTime]   = useState("18:00")

  const toggleDay = (day: string) =>
    setSelDays(d => d.includes(day) ? d.filter(x => x !== day) : [...d, day])

  const buildAvailability = () =>
    DAYS.filter(d => selDays.includes(d)).map(d => `${d} ${startTime}-${endTime}`)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name.trim())  return setError("Name is required")
    if (!form.email.trim()) return setError("Email is required")
    if (mode === "create" && !form.password) return setError("Password is required")
    setError("")
    setSaving(true)
    try {
      const payload: any = {
        name:            form.name.trim(),
        email:           form.email.trim(),
        role:            "doctor",
        phone:           form.phone.trim()           || undefined,
        specialty:       form.specialty              || undefined,
        experience:      form.experience ? parseInt(form.experience) : undefined,
        qualifications:  form.qualifications.trim()  || undefined,
        consultationFee: form.consultationFee ? parseFloat(form.consultationFee) : undefined,
        availability:    buildAvailability(),
      }
      if (form.password) payload.password = form.password
      await onSave(payload)
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? err?.message ?? "Save failed"
      setError(Array.isArray(msg) ? msg[0] : msg)
    } finally {
      setSaving(false)
    }
  }

  const inp: React.CSSProperties = { width: "100%", padding: "9px 12px", borderRadius: 9, border: "1.5px solid rgba(10,22,40,.12)", fontFamily: "'DM Sans',sans-serif", fontSize: ".85rem", color: "#0a1628", outline: "none" }
  const lbl: React.CSSProperties = { fontSize: ".66rem", fontWeight: 600, letterSpacing: ".1em", textTransform: "uppercase", color: "#94a3b8", display: "block", marginBottom: 4 }

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(10,22,40,.6)", zIndex: 500, display: "flex", alignItems: "center", justifyContent: "center", padding: 20, backdropFilter: "blur(4px)" }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: "#fff", borderRadius: 20, width: "100%", maxWidth: 600, maxHeight: "92vh", overflowY: "auto", boxShadow: "0 24px 64px rgba(10,22,40,.25)" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "18px 22px", borderBottom: "1px solid rgba(10,22,40,.07)", position: "sticky", top: 0, background: "#fff", zIndex: 1 }}>
          <div>
            <h2 style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: "1.2rem", fontWeight: 700, color: "#0a1628" }}>
              {mode === "create" ? "Add New Doctor" : "Edit Doctor Profile"}
            </h2>
            <div style={{ fontSize: ".72rem", color: "#94a3b8" }}>Complete the profile for best results</div>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "#94a3b8", fontSize: "1.2rem" }}>✕</button>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: "18px 22px", display: "flex", flexDirection: "column", gap: 14 }}>
          {/* Personal info */}
          <div style={{ fontSize: ".66rem", fontWeight: 700, letterSpacing: ".1em", textTransform: "uppercase", color: "#0d9488" }}>Personal Information</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div><label style={lbl}>Full Name *</label><input value={form.name} onChange={set("name")} style={inp} placeholder="Dr. Priya Mehta" /></div>
            <div><label style={lbl}>Phone</label><input value={form.phone} onChange={set("phone")} style={inp} placeholder="+91 98765 00000" /></div>
            <div><label style={lbl}>Email *</label><input type="email" value={form.email} onChange={set("email")} style={inp} placeholder="dr.priya@clinic.com" /></div>
            <div><label style={lbl}>{mode === "create" ? "Password *" : "New Password"}</label><input type="password" value={form.password} onChange={set("password")} style={inp} placeholder={mode === "create" ? "Min. 8 characters" : "Leave blank to keep"} /></div>
          </div>

          {/* Professional */}
          <div style={{ height: 1, background: "rgba(10,22,40,.07)", margin: "2px 0" }} />
          <div style={{ fontSize: ".66rem", fontWeight: 700, letterSpacing: ".1em", textTransform: "uppercase", color: "#0d9488" }}>Professional Details</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label style={lbl}>Specialty</label>
              <select value={form.specialty} onChange={set("specialty")} style={inp}>
                <option value="">— Select specialty —</option>
                {SPECIALTIES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div><label style={lbl}>Experience (years)</label><input type="number" min={0} max={60} value={form.experience} onChange={set("experience")} style={inp} placeholder="e.g. 8" /></div>
          </div>
          <div><label style={lbl}>Qualifications</label><input value={form.qualifications} onChange={set("qualifications")} style={inp} placeholder="e.g. BDS, MDS (Orthodontics), FICOI" /></div>
          <div><label style={lbl}>Consultation Fee (₹)</label><input type="number" min={0} value={form.consultationFee} onChange={set("consultationFee")} style={inp} placeholder="e.g. 500" /></div>

          {/* Availability */}
          <div style={{ height: 1, background: "rgba(10,22,40,.07)", margin: "2px 0" }} />
          <div style={{ fontSize: ".66rem", fontWeight: 700, letterSpacing: ".1em", textTransform: "uppercase", color: "#0d9488" }}>Availability Schedule</div>
          <div>
            <label style={lbl}>Working Days</label>
            <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
              {DAYS.map(d => (
                <button key={d} type="button"
                  onClick={() => toggleDay(d)}
                  style={{
                    padding: "5px 12px", borderRadius: 8,
                    border: `1.5px solid ${selDays.includes(d) ? "#0d9488" : "rgba(10,22,40,.12)"}`,
                    background: selDays.includes(d) ? "#0d9488" : "#fff",
                    color: selDays.includes(d) ? "#fff" : "#64748b",
                    cursor: "pointer", fontFamily: "'DM Sans',sans-serif", fontSize: ".78rem", fontWeight: 500,
                    transition: "all .15s",
                  }}>
                  {d}
                </button>
              ))}
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div><label style={lbl}>Start Time</label><input type="time" value={startTime} onChange={e => setStartTime(e.target.value)} style={inp} /></div>
            <div><label style={lbl}>End Time</label><input type="time" value={endTime} onChange={e => setEndTime(e.target.value)} style={inp} /></div>
          </div>
          {selDays.length > 0 && (
            <div style={{ fontSize: ".76rem", color: "#0d9488", background: "rgba(13,148,136,.06)", borderRadius: 9, padding: "8px 12px", border: "1px solid rgba(13,148,136,.15)" }}>
              📅 Schedule: {selDays.join(", ")} · {startTime}–{endTime}
            </div>
          )}

          {error && <div style={{ background: "rgba(220,38,38,.06)", border: "1px solid rgba(220,38,38,.2)", borderRadius: 9, padding: "9px 13px", fontSize: ".82rem", color: "#dc2626" }}>{error}</div>}

          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", paddingTop: 4 }}>
            <button type="button" onClick={onClose} style={{ padding: "9px 20px", borderRadius: 50, border: "1.5px solid rgba(10,22,40,.12)", background: "none", cursor: "pointer", fontFamily: "'DM Sans',sans-serif", fontSize: ".83rem", color: "#64748b" }}>Cancel</button>
            <button type="submit" disabled={saving} style={{ padding: "9px 24px", borderRadius: 50, border: "none", background: "linear-gradient(135deg,#0d9488,#0a1628)", color: "#fff", cursor: saving ? "not-allowed" : "pointer", fontFamily: "'DM Sans',sans-serif", fontSize: ".83rem", fontWeight: 500, opacity: saving ? .65 : 1, display: "flex", alignItems: "center", gap: 7 }}>
              {saving && <span style={{ width: 14, height: 14, border: "2px solid rgba(255,255,255,.3)", borderTopColor: "#fff", borderRadius: "50%", animation: "spin .7s linear infinite", display: "inline-block" }} />}
              {saving ? "Saving…" : mode === "create" ? "Add Doctor" : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Doctor Card ───────────────────────────────────────────────────────────────
function DoctorCard({ doc, onEdit, onToggle, onDelete, toggling, deleting, isAdmin }: {
  doc:      Doctor
  onEdit:   () => void
  onToggle: (id: string, active: boolean) => void
  onDelete: (id: string) => void
  toggling: string | null
  deleting: string | null
  isAdmin:  boolean
}) {
  const spColor = SPECIALTY_COLORS[doc.specialty ?? ""] ?? "#0d9488"

  return (
    <div style={{
      background: "#fff", borderRadius: 20, border: `1px solid ${doc.isActive ? "rgba(10,22,40,.07)" : "rgba(10,22,40,.12)"}`,
      boxShadow: "0 4px 20px rgba(10,22,40,.06)", overflow: "hidden",
      opacity: doc.isActive ? 1 : .7, animation: "fadeIn .3s ease both",
      transition: "transform .25s cubic-bezier(.34,1.56,.64,1), box-shadow .25s",
    }}
      onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.transform = "translateY(-4px)"; (e.currentTarget as HTMLDivElement).style.boxShadow = "0 12px 40px rgba(10,22,40,.12)" }}
      onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.transform = ""; (e.currentTarget as HTMLDivElement).style.boxShadow = "0 4px 20px rgba(10,22,40,.06)" }}
    >
      {/* Top accent bar */}
      <div style={{ height: 4, background: doc.isActive ? `linear-gradient(90deg, ${spColor}, #0a1628)` : "#cbd5e1" }} />

      <div style={{ padding: "20px 20px 16px" }}>
        {/* Avatar + name + specialty */}
        <div style={{ display: "flex", alignItems: "flex-start", gap: 14, marginBottom: 14 }}>
          <div style={{
            width: 56, height: 56, borderRadius: "50%", flexShrink: 0,
            background: doc.isActive ? `linear-gradient(135deg, ${spColor}, #0a1628)` : "#cbd5e1",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: ".9rem", fontWeight: 700, color: "#fff",
            boxShadow: doc.isActive ? `0 4px 14px ${spColor}40` : "none",
          }}>
            {getInitials(doc.name)}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: "1.1rem", fontWeight: 700, color: "#0a1628", marginBottom: 2 }}>
              {doc.name}
            </div>
            {doc.specialty && (
              <span style={{ fontSize: ".7rem", fontWeight: 700, padding: "2px 9px", borderRadius: 50, background: `${spColor}18`, color: spColor, letterSpacing: ".04em" }}>
                {doc.specialty}
              </span>
            )}
            {!doc.isActive && (
              <span style={{ marginLeft: 6, fontSize: ".65rem", fontWeight: 700, padding: "2px 8px", borderRadius: 50, background: "rgba(220,38,38,.1)", color: "#dc2626", letterSpacing: ".06em", textTransform: "uppercase" }}>
                Inactive
              </span>
            )}
          </div>
        </div>

        {/* Key stats */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 14 }}>
          {[
            { icon: "📅", val: String(doc._count?.appointments ?? 0), lbl: "Appointments" },
            { icon: "⏱️", val: doc.experience ? `${doc.experience}y` : "—",      lbl: "Experience" },
            { icon: "💰", val: doc.consultationFee ? fmt(doc.consultationFee) : "—", lbl: "Consult Fee" },
          ].map(s => (
            <div key={s.lbl} style={{ background: "rgba(10,22,40,.03)", borderRadius: 10, padding: "8px 10px", textAlign: "center" }}>
              <div style={{ fontSize: "1rem", marginBottom: 2 }}>{s.icon}</div>
              <div style={{ fontSize: ".82rem", fontWeight: 700, color: "#0a1628" }}>{s.val}</div>
              <div style={{ fontSize: ".62rem", color: "#94a3b8" }}>{s.lbl}</div>
            </div>
          ))}
        </div>

        {/* Qualifications */}
        {doc.qualifications && (
          <div style={{ fontSize: ".74rem", color: "#64748b", background: "rgba(10,22,40,.02)", borderRadius: 8, padding: "7px 10px", marginBottom: 10, lineHeight: 1.5 }}>
            🎓 {doc.qualifications}
          </div>
        )}

        {/* Availability chips */}
        {doc.availability && doc.availability.length > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginBottom: 12 }}>
            {doc.availability.map(a => (
              <span key={a} style={{ fontSize: ".68rem", padding: "2px 7px", borderRadius: 6, background: "rgba(37,99,235,.07)", color: "#2563eb", fontWeight: 500 }}>
                {a}
              </span>
            ))}
          </div>
        )}

        {/* Contact */}
        <div style={{ fontSize: ".74rem", color: "#64748b", marginBottom: 14 }}>
          ✉️ {doc.email}{doc.phone ? ` · 📞 ${doc.phone}` : ""}
        </div>

        {/* Footer */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, paddingTop: 12, borderTop: "1px solid rgba(10,22,40,.06)" }}>
          <span style={{ fontSize: ".68rem", color: "#94a3b8" }}>Since {formatDate(doc.createdAt)}</span>
          {isAdmin && (
            <div style={{ marginLeft: "auto", display: "flex", gap: 6 }}>
              <button onClick={onEdit}
                style={{ padding: "6px 13px", borderRadius: 8, border: "1.5px solid rgba(10,22,40,.12)", background: "none", cursor: "pointer", fontFamily: "'DM Sans',sans-serif", fontSize: ".74rem", color: "#64748b", transition: "all .15s" }}
                onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(10,22,40,.04)"; (e.currentTarget as HTMLButtonElement).style.color = "#0a1628" }}
                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = ""; (e.currentTarget as HTMLButtonElement).style.color = "#64748b" }}>
                ✏️ Edit
              </button>
              <button
                disabled={toggling === doc.id}
                onClick={() => onToggle(doc.id, !doc.isActive)}
                style={{ padding: "6px 13px", borderRadius: 8, border: `1.5px solid ${doc.isActive ? "rgba(220,38,38,.25)" : "rgba(22,163,74,.25)"}`, background: "none", cursor: toggling === doc.id ? "not-allowed" : "pointer", fontFamily: "'DM Sans',sans-serif", fontSize: ".74rem", color: doc.isActive ? "#ef4444" : "#16a34a", opacity: toggling === doc.id ? .5 : 1 }}>
                {toggling === doc.id ? "…" : doc.isActive ? "Deactivate" : "Activate"}
              </button>
              <button
                disabled={deleting === doc.id}
                onClick={() => onDelete(doc.id)}
                style={{ padding: "6px 10px", borderRadius: 8, border: "1.5px solid rgba(220,38,38,.2)", background: "none", cursor: deleting === doc.id ? "not-allowed" : "pointer", fontFamily: "'DM Sans',sans-serif", fontSize: ".74rem", color: "#ef4444", opacity: deleting === doc.id ? .5 : 1 }}>
                {deleting === doc.id ? "…" : "🗑️"}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function DoctorsPage() {
  const { role } = useAuthStore()
  const isAdmin = role() === "admin"
  // All roles with doctors:read can view; only admin can mutate

  const [doctors,       setDoctors]      = useState<Doctor[]>([])
  const [total,         setTotal]        = useState(0)
  const [totalPages,    setTotalPages]   = useState(1)
  const [page,          setPage]         = useState(1)
  const [search,        setSearch]       = useState("")
  const [specFilter,    setSpecFilter]   = useState("all")
  const [loading,       setLoading]      = useState(true)
  const [error,         setError]        = useState<string | null>(null)
  const [showCreate,    setShowCreate]   = useState(false)
  const [editTarget,    setEditTarget]   = useState<Doctor | null>(null)
  const [toggling,      setToggling]     = useState<string | null>(null)
  const [deleting,      setDeleting]     = useState<string | null>(null)
  const [successMsg,    setSuccessMsg]   = useState("")
  const searchRef = useRef<NodeJS.Timeout | null>(null)

  const fetchDoctors = useCallback(async (pg = 1, q = search, sp = specFilter) => {
    setLoading(true); setError(null)
    try {
      const params = new URLSearchParams({ page: String(pg), limit: "12", role: "doctor" })
      if (q.trim()) params.set("search", q.trim())
      const res  = await API.get(`/staff?${params}`)
      const data = res.data as unknown as DoctorResponse
      let docs = data.users as Doctor[]
      if (sp !== "all") docs = docs.filter(d => d.specialty === sp)
      setDoctors(docs); setTotal(data.total); setTotalPages(data.totalPages); setPage(pg)
    } catch (err: any) {
      setError(err?.response?.data?.message ?? "Failed to load doctors")
    } finally { setLoading(false) }
  }, [search, specFilter])

  useEffect(() => { fetchDoctors(1, "", "all") }, [])

  const handleSearch = (q: string) => {
    setSearch(q)
    clearTimeout(searchRef.current)
    searchRef.current = setTimeout(() => fetchDoctors(1, q, specFilter), 400)
  }

  const showSuccess = (msg: string) => { setSuccessMsg(msg); setTimeout(() => setSuccessMsg(""), 3000) }

  const handleCreate = async (data: any) => {
    await API.post("/staff", data)
    setShowCreate(false); fetchDoctors(1, search, specFilter); showSuccess("Doctor added successfully!")
  }

  const handleUpdate = async (data: any) => {
    if (!editTarget) return
    await API.put(`/staff/${editTarget.id}`, data)
    setEditTarget(null); fetchDoctors(page, search, specFilter); showSuccess("Doctor profile updated!")
  }

  const handleToggle = async (id: string, isActive: boolean) => {
    setToggling(id)
    try {
      await API.patch(`/staff/${id}/status`, { isActive })
      fetchDoctors(page, search, specFilter)
      showSuccess(isActive ? "Doctor activated!" : "Doctor deactivated!")
    } catch (err: any) { alert(err?.response?.data?.message ?? "Toggle failed") }
    finally { setToggling(null) }
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Remove this doctor? If they have appointment history, their account will be deactivated instead.")) return
    setDeleting(id)
    try {
      await API.delete(`/staff/${id}`)
      fetchDoctors(page, search, specFilter); showSuccess("Doctor removed!")
    } catch (err: any) { alert(err?.response?.data?.message ?? "Delete failed") }
    finally { setDeleting(null) }
  }

  // Specialties from loaded doctors for filter
  const availableSpecs = ["all", ...Array.from(new Set(doctors.map(d => d.specialty).filter(Boolean) as string[]))]

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@700&family=DM+Sans:wght@300;400;500;600&display=swap');
        @keyframes shimmer { to{background-position:-200% 0} }
        @keyframes spin    { to{transform:rotate(360deg)} }
        @keyframes fadeIn  { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }

        .dr-root    { font-family:'DM Sans',sans-serif; display:flex; flex-direction:column; gap:20px; }
        .dr-header  { display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:12px; }
        .dr-title   { font-family:'Cormorant Garamond',serif; font-size:1.5rem; font-weight:700; color:#0a1628; }
        .dr-sub     { font-size:.8rem; color:#64748b; margin-top:2px; }

        .dr-toolbar { display:flex; align-items:center; gap:10px; flex-wrap:wrap; }
        .dr-specs   { display:flex; gap:6px; flex-wrap:wrap; }
        .dr-spec    { padding:5px 12px; border-radius:50px; border:1px solid rgba(10,22,40,.1); background:#fff; cursor:pointer; font-family:'DM Sans',sans-serif; font-size:.74rem; color:#64748b; transition:all .15s; }
        .dr-spec:hover { border-color:#0d9488; color:#0d9488; }
        .dr-spec.active { background:#0a1628; color:#fff; border-color:#0a1628; }

        .dr-search  { display:flex; align-items:center; gap:7px; padding:7px 13px; border-radius:50px; border:1.5px solid rgba(10,22,40,.1); background:#fff; transition:border-color .18s; }
        .dr-search:focus-within { border-color:#0d9488; }
        .dr-search input { border:none; outline:none; font-family:'DM Sans',sans-serif; font-size:.8rem; color:#0a1628; background:transparent; width:170px; }
        .dr-search input::placeholder { color:#94a3b8; }

        .dr-add-btn { margin-left:auto; display:inline-flex; align-items:center; gap:6px; padding:9px 18px; border-radius:50px; border:none; cursor:pointer; background:linear-gradient(135deg,#0d9488,#0a1628); color:#fff; font-family:'DM Sans',sans-serif; font-size:.83rem; font-weight:500; box-shadow:0 3px 12px rgba(13,148,136,.28); transition:transform .18s; white-space:nowrap; }
        .dr-add-btn:hover { transform:translateY(-1px); }

        .dr-grid    { display:grid; grid-template-columns:repeat(auto-fill,minmax(290px,1fr)); gap:20px; }

        .dr-skel-card { background:#fff; border-radius:20px; border:1px solid rgba(10,22,40,.07); padding:20px; display:flex; flex-direction:column; gap:12px; }

        .dr-pagination { display:flex; align-items:center; gap:6px; justify-content:center; flex-wrap:wrap; }
        .dr-pgbtn { padding:5px 11px; border-radius:8px; border:1px solid rgba(10,22,40,.1); background:#fff; cursor:pointer; font-family:'DM Sans',sans-serif; font-size:.76rem; color:#64748b; transition:all .15s; }
        .dr-pgbtn:hover:not(:disabled) { background:rgba(10,22,40,.04); }
        .dr-pgbtn.active { background:#0a1628; color:#fff; border-color:#0a1628; }
        .dr-pgbtn:disabled { opacity:.4; cursor:not-allowed; }

        .dr-empty   { text-align:center; padding:60px 20px; color:#94a3b8; }
        .dr-error   { background:rgba(220,38,38,.06); border:1px solid rgba(220,38,38,.2); border-radius:12px; padding:14px 18px; font-size:.83rem; color:#dc2626; display:flex; gap:8px; align-items:center; }
        .dr-success { background:rgba(22,163,74,.08); border:1px solid rgba(22,163,74,.2); border-radius:12px; padding:12px 18px; font-size:.83rem; color:#16a34a; animation:fadeIn .3s ease; }
      `}</style>

      <div className="dr-root">
        <div className="dr-header">
          <div>
            <div className="dr-title">Doctor Management</div>
            <div className="dr-sub">{total} doctor{total !== 1 ? "s" : ""} in your clinic</div>
          </div>
        </div>

        {successMsg && <div className="dr-success">✓ {successMsg}</div>}

        {/* Toolbar */}
        <div className="dr-toolbar">
          <div className="dr-specs">
            {availableSpecs.map(s => (
              <button key={s} className={`dr-spec${specFilter === s ? " active" : ""}`}
                onClick={() => { setSpecFilter(s); fetchDoctors(1, search, s) }}>
                {s === "all" ? "All Specialties" : s}
              </button>
            ))}
          </div>
          <div className="dr-search">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <input placeholder="Search by name or specialty…" value={search} onChange={e => handleSearch(e.target.value)} />
            {search && <button onClick={() => handleSearch("")} style={{ background: "none", border: "none", cursor: "pointer", color: "#94a3b8", fontSize: "1rem", padding: 0 }}>✕</button>}
          </div>
          {isAdmin && (
            <button className="dr-add-btn" onClick={() => setShowCreate(true)}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              Add Doctor
            </button>
          )}
        </div>

        {error && (
          <div className="dr-error">
            ⚠️ {error}
            <button onClick={() => fetchDoctors(page, search, specFilter)} style={{ marginLeft: "auto", background: "rgba(220,38,38,.1)", border: "none", color: "#dc2626", padding: "4px 10px", borderRadius: 7, cursor: "pointer", fontSize: ".76rem" }}>Retry</button>
          </div>
        )}

        {/* Doctor grid */}
        {loading ? (
          <div className="dr-grid">
            {[1,2,3,4,5,6].map(n => (
              <div key={n} className="dr-skel-card">
                <div style={{ height: 4, borderRadius: 4, background: "rgba(10,22,40,.06)" }} />
                <div style={{ display: "flex", gap: 12 }}>
                  <Skel w="56px" h="56px" r="50%" />
                  <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6 }}>
                    <Skel h="16px" w="60%" /><Skel h="22px" w="40%" r="50px" />
                  </div>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
                  <Skel h="60px" r="10px" /><Skel h="60px" r="10px" /><Skel h="60px" r="10px" />
                </div>
                <Skel h="32px" r="8px" />
                <Skel h="36px" r="8px" />
              </div>
            ))}
          </div>
        ) : !doctors.length ? (
          <div className="dr-empty">
            <div style={{ fontSize: "3rem", marginBottom: 12 }}>👨‍⚕️</div>
            <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: "1.2rem", fontWeight: 700, color: "#0a1628", marginBottom: 6 }}>
              {search || specFilter !== "all" ? "No doctors match your filters" : "No doctors added yet"}
            </div>
            <div style={{ fontSize: ".84rem", color: "#94a3b8", marginBottom: 20 }}>
              {search || specFilter !== "all" ? "Try adjusting your search or filter." : "Add your first doctor to get started."}
            </div>
            {!search && specFilter === "all" && isAdmin && (
              <button onClick={() => setShowCreate(true)} style={{ padding: "10px 24px", borderRadius: 50, border: "none", background: "linear-gradient(135deg,#0d9488,#0a1628)", color: "#fff", cursor: "pointer", fontFamily: "'DM Sans',sans-serif", fontSize: ".85rem", fontWeight: 500 }}>
                Add First Doctor
              </button>
            )}
          </div>
        ) : (
          <>
            <div className="dr-grid">
              {doctors.map((doc, i) => (
                <div key={doc.id} style={{ animationDelay: `${i * 50}ms` }}>
                  <DoctorCard
                    doc={doc}
                    onEdit={() => setEditTarget(doc)}
                    onToggle={handleToggle}
                    onDelete={handleDelete}
                    toggling={toggling}
                    deleting={deleting}
                    isAdmin={isAdmin}
                  />
                </div>
              ))}
            </div>

            {totalPages > 1 && (
              <div className="dr-pagination">
                <button className="dr-pgbtn" disabled={page <= 1} onClick={() => fetchDoctors(page - 1, search, specFilter)}>‹ Prev</button>
                {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                  const pg = totalPages <= 7 ? i + 1 : page <= 4 ? i + 1 : page >= totalPages - 3 ? totalPages - 6 + i : page - 3 + i
                  return <button key={pg} className={`dr-pgbtn${page === pg ? " active" : ""}`} onClick={() => fetchDoctors(pg, search, specFilter)}>{pg}</button>
                })}
                <button className="dr-pgbtn" disabled={page >= totalPages} onClick={() => fetchDoctors(page + 1, search, specFilter)}>Next ›</button>
              </div>
            )}
          </>
        )}
      </div>

      {showCreate && <DoctorModal mode="create" onClose={() => setShowCreate(false)} onSave={handleCreate} />}
      {editTarget  && <DoctorModal mode="edit" initial={editTarget} onClose={() => setEditTarget(null)} onSave={handleUpdate} />}
    </>
  )
}