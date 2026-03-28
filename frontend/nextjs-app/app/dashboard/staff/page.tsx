"use client"

// app/(dashboard)/dashboard/staff/page.tsx
// ADMIN ONLY — manages all non-doctor staff (admin + receptionist)
//
// API:
//   GET    /api/staff?role=&search=&active=&page=
//   POST   /api/staff
//   PUT    /api/staff/:id
//   PATCH  /api/staff/:id/status
//   DELETE /api/staff/:id

import { useState, useEffect, useCallback, useRef } from "react"
import { useAuthStore } from "@/store/authStore"
import API from "@/lib/api"

// ── Types ─────────────────────────────────────────────────────────────────────
interface StaffMember {
  id:        string
  name:      string
  email:     string
  phone?:    string
  role:      "admin" | "receptionist" | "doctor"
  isActive:  boolean
  createdAt: string
  _count?:   { appointments: number }
}

interface StaffResponse {
  users:      StaffMember[]
  total:      number
  page:       number
  totalPages: number
  counts:     Record<string, number>
}

// ── Helpers ───────────────────────────────────────────────────────────────────
const ROLE_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  admin:        { label: "Admin",        color: "#d97706", bg: "rgba(245,158,11,.1)"  },
  receptionist: { label: "Receptionist", color: "#2563eb", bg: "rgba(37,99,235,.1)"  },
  doctor:       { label: "Doctor",       color: "#0d9488", bg: "rgba(13,148,136,.1)" },
}

function getInitials(name: string) {
  return name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()
}
function formatDate(d: string) {
  return new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
}
function Skel({ w = "100%", h = "14px", r = "6px" }: { w?: string; h?: string; r?: string }) {
  return <div style={{ width: w, height: h, borderRadius: r, background: "linear-gradient(90deg,#f1f5f9 25%,#e2e8f0 50%,#f1f5f9 75%)", backgroundSize: "200% 100%", animation: "shimmer 1.4s infinite" }} />
}

// ── Access Denied ─────────────────────────────────────────────────────────────
function AccessDenied() {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: 400, gap: 16, textAlign: "center" }}>
      <div style={{ fontSize: "3rem" }}>🔒</div>
      <h2 style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: "1.5rem", fontWeight: 700, color: "#0a1628" }}>Admin Access Required</h2>
      <p style={{ fontSize: ".9rem", color: "#64748b", maxWidth: 340 }}>Staff management is restricted to administrators only.</p>
    </div>
  )
}

// ── Staff Modal ───────────────────────────────────────────────────────────────
interface ModalProps {
  mode:      "create" | "edit"
  initial?:  Partial<StaffMember>
  onClose:   () => void
  onSave:    (d: any) => Promise<void>
}

function StaffModal({ mode, initial = {}, onClose, onSave }: ModalProps) {
  const [form, setForm] = useState({
    name:     initial.name  ?? "",
    email:    initial.email ?? "",
    phone:    initial.phone ?? "",
    role:     initial.role  ?? "receptionist",
    password: "",
  })
  const [saving, setSaving] = useState(false)
  const [error,  setError]  = useState("")

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name.trim())  return setError("Name is required")
    if (!form.email.trim()) return setError("Email is required")
    if (mode === "create" && !form.password) return setError("Password is required")
    setError("")
    setSaving(true)
    try {
      const payload: any = {
        name:  form.name.trim(),
        email: form.email.trim(),
        role:  form.role,
        phone: form.phone.trim() || undefined,
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
      <div style={{ background: "#fff", borderRadius: 20, width: "100%", maxWidth: 500, boxShadow: "0 24px 64px rgba(10,22,40,.25)" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "18px 22px", borderBottom: "1px solid rgba(10,22,40,.07)" }}>
          <h2 style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: "1.2rem", fontWeight: 700, color: "#0a1628" }}>
            {mode === "create" ? "Add Staff Member" : "Edit Staff Member"}
          </h2>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "#94a3b8", fontSize: "1.2rem" }}>✕</button>
        </div>
        <form onSubmit={handleSubmit} style={{ padding: "18px 22px", display: "flex", flexDirection: "column", gap: 13 }}>
          <div><label style={lbl}>Full Name *</label><input value={form.name} onChange={set("name")} style={inp} placeholder="e.g. Riya Sharma" /></div>
          <div><label style={lbl}>Email *</label><input type="email" value={form.email} onChange={set("email")} style={inp} placeholder="riya@clinic.com" /></div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div><label style={lbl}>Phone</label><input value={form.phone} onChange={set("phone")} style={inp} placeholder="+91 98765 00000" /></div>
            <div>
              <label style={lbl}>Role *</label>
              <select value={form.role} onChange={set("role")} style={inp}>
                <option value="receptionist">Receptionist</option>
                <option value="admin">Admin</option>
              </select>
            </div>
          </div>
          <div>
            <label style={lbl}>{mode === "create" ? "Password *" : "New Password (leave blank to keep)"}</label>
            <input type="password" value={form.password} onChange={set("password")} style={inp} placeholder={mode === "create" ? "Min. 8 characters" : "Leave blank to keep current"} />
          </div>
          {error && <div style={{ background: "rgba(220,38,38,.06)", border: "1px solid rgba(220,38,38,.2)", borderRadius: 9, padding: "9px 13px", fontSize: ".82rem", color: "#dc2626" }}>{error}</div>}
          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", paddingTop: 4 }}>
            <button type="button" onClick={onClose} style={{ padding: "9px 20px", borderRadius: 50, border: "1.5px solid rgba(10,22,40,.12)", background: "none", cursor: "pointer", fontFamily: "'DM Sans',sans-serif", fontSize: ".83rem", color: "#64748b" }}>Cancel</button>
            <button type="submit" disabled={saving} style={{ padding: "9px 24px", borderRadius: 50, border: "none", background: "linear-gradient(135deg,#0d9488,#0a1628)", color: "#fff", cursor: saving ? "not-allowed" : "pointer", fontFamily: "'DM Sans',sans-serif", fontSize: ".83rem", fontWeight: 500, opacity: saving ? .65 : 1, display: "flex", alignItems: "center", gap: 7 }}>
              {saving && <span style={{ width: 14, height: 14, border: "2px solid rgba(255,255,255,.3)", borderTopColor: "#fff", borderRadius: "50%", animation: "spin .7s linear infinite", display: "inline-block" }} />}
              {saving ? "Saving…" : mode === "create" ? "Add Member" : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function StaffPage() {
  const { role } = useAuthStore()
  if (role() !== "admin") return <AccessDenied />

  const [staff,        setStaff]        = useState<StaffMember[]>([])
  const [counts,       setCounts]       = useState<Record<string, number>>({})
  const [total,        setTotal]        = useState(0)
  const [totalPages,   setTotalPages]   = useState(1)
  const [page,         setPage]         = useState(1)
  const [roleFilter,   setRoleFilter]   = useState("all")
  const [search,       setSearch]       = useState("")
  const [loading,      setLoading]      = useState(true)
  const [error,        setError]        = useState<string | null>(null)
  const [showCreate,   setShowCreate]   = useState(false)
  const [editTarget,   setEditTarget]   = useState<StaffMember | null>(null)
  const [toggling,     setToggling]     = useState<string | null>(null)
  const [deleting,     setDeleting]     = useState<string | null>(null)
  const [successMsg,   setSuccessMsg]   = useState("")
  const searchRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  const fetchStaff = useCallback(async (pg = 1, q = search, rf = roleFilter) => {
    setLoading(true); setError(null)
    try {
      const params = new URLSearchParams({ page: String(pg), limit: "20" })
      if (q.trim()) params.set("search", q.trim())
      if (rf !== "all") params.set("role", rf)
      const res  = await API.get(`/staff?${params}`)
      const data = res.data as unknown as StaffResponse
      setStaff(data.users); setTotal(data.total); setTotalPages(data.totalPages)
      setCounts(data.counts ?? {}); setPage(pg)
    } catch (err: any) {
      setError(err?.response?.data?.message ?? "Failed to load staff")
    } finally { setLoading(false) }
  }, [search, roleFilter])

  useEffect(() => { fetchStaff(1, "", "all") }, [])

  const handleSearch = (q: string) => {
    setSearch(q)
    clearTimeout(searchRef.current)
    searchRef.current = setTimeout(() => fetchStaff(1, q, roleFilter), 400)
  }

  const showSuccess = (msg: string) => { setSuccessMsg(msg); setTimeout(() => setSuccessMsg(""), 3000) }

  const handleCreate = async (data: any) => {
    await API.post("/staff", data)
    setShowCreate(false); fetchStaff(1, search, roleFilter); showSuccess("Staff member added successfully!")
  }

  const handleUpdate = async (data: any) => {
    if (!editTarget) return
    await API.put(`/staff/${editTarget.id}`, data)
    setEditTarget(null); fetchStaff(page, search, roleFilter); showSuccess("Staff member updated!")
  }

  const handleToggle = async (id: string, isActive: boolean) => {
    setToggling(id)
    try {
      await API.patch(`/staff/${id}/status`, { isActive })
      fetchStaff(page, search, roleFilter)
      showSuccess(isActive ? "Account activated!" : "Account deactivated!")
    } catch (err: any) {
      alert(err?.response?.data?.message ?? "Toggle failed")
    } finally { setToggling(null) }
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Remove this staff member? If they have history, their account will be deactivated instead.")) return
    setDeleting(id)
    try {
      await API.delete(`/staff/${id}`)
      fetchStaff(page, search, roleFilter); showSuccess("Staff member removed!")
    } catch (err: any) {
      alert(err?.response?.data?.message ?? "Delete failed")
    } finally { setDeleting(null) }
  }

  const filterTabs = [
    { key: "all",          label: "All Staff"      },
    { key: "admin",        label: "Admins"         },
    { key: "receptionist", label: "Receptionists"  },
  ]

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@700&family=DM+Sans:wght@300;400;500;600&display=swap');
        @keyframes shimmer { to{background-position:-200% 0} }
        @keyframes spin    { to{transform:rotate(360deg)} }
        @keyframes fadeIn  { from{opacity:0;transform:translateY(6px)} to{opacity:1;transform:translateY(0)} }

        .sf-root   { font-family:'DM Sans',sans-serif; display:flex; flex-direction:column; gap:20px; }
        .sf-header { display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:12px; }
        .sf-title  { font-family:'Cormorant Garamond',serif; font-size:1.5rem; font-weight:700; color:#0a1628; }
        .sf-sub    { font-size:.8rem; color:#64748b; margin-top:2px; }

        .sf-stats  { display:grid; grid-template-columns:repeat(3,1fr); gap:14px; }
        @media(max-width:600px) { .sf-stats { grid-template-columns:1fr 1fr; } }
        .sf-stat   { background:#fff; border-radius:14px; border:1px solid rgba(10,22,40,.07); padding:14px 18px; display:flex; align-items:center; gap:12px; }
        .sf-stat-icon { width:38px; height:38px; border-radius:10px; display:flex; align-items:center; justify-content:center; font-size:1rem; flex-shrink:0; }
        .sf-stat-num { font-family:'Cormorant Garamond',serif; font-size:1.6rem; font-weight:700; color:#0a1628; line-height:1; }
        .sf-stat-lbl { font-size:.7rem; color:#64748b; }

        .sf-toolbar { display:flex; align-items:center; gap:10px; flex-wrap:wrap; }
        .sf-tabs    { display:flex; gap:5px; }
        .sf-tab     { padding:6px 13px; border-radius:50px; border:1.5px solid rgba(10,22,40,.1); background:none; cursor:pointer; font-family:'DM Sans',sans-serif; font-size:.76rem; font-weight:500; color:#64748b; transition:all .15s; display:flex; align-items:center; gap:5px; }
        .sf-tab.active { background:#0a1628; color:#fff; border-color:#0a1628; }
        .sf-tab:hover:not(.active) { border-color:#0a1628; color:#0a1628; }
        .sf-tab-cnt { font-size:.62rem; font-weight:700; padding:1px 5px; border-radius:50px; background:rgba(10,22,40,.08); }
        .sf-tab.active .sf-tab-cnt { background:rgba(255,255,255,.2); }

        .sf-search  { display:flex; align-items:center; gap:7px; padding:7px 13px; border-radius:50px; border:1.5px solid rgba(10,22,40,.1); background:#fff; transition:border-color .18s; }
        .sf-search:focus-within { border-color:#0d9488; }
        .sf-search input { border:none; outline:none; font-family:'DM Sans',sans-serif; font-size:.8rem; color:#0a1628; background:transparent; width:180px; }
        .sf-search input::placeholder { color:#94a3b8; }

        .sf-add-btn { display:inline-flex; align-items:center; gap:6px; padding:9px 18px; border-radius:50px; border:none; cursor:pointer; background:linear-gradient(135deg,#0d9488,#0a1628); color:#fff; font-family:'DM Sans',sans-serif; font-size:.83rem; font-weight:500; box-shadow:0 3px 12px rgba(13,148,136,.28); transition:transform .18s; margin-left:auto; white-space:nowrap; }
        .sf-add-btn:hover { transform:translateY(-1px); }

        .sf-card   { background:#fff; border-radius:18px; border:1px solid rgba(10,22,40,.07); box-shadow:0 2px 14px rgba(10,22,40,.05); overflow:hidden; }
        .sf-table  { width:100%; border-collapse:collapse; }
        .sf-table thead th { text-align:left; padding:12px 16px; font-size:.66rem; font-weight:700; letter-spacing:.1em; text-transform:uppercase; color:#94a3b8; border-bottom:1px solid rgba(10,22,40,.07); background:rgba(10,22,40,.02); white-space:nowrap; }
        .sf-table tbody tr { transition:background .15s; animation:fadeIn .25s ease both; }
        .sf-table tbody tr:hover { background:rgba(10,22,40,.02); }
        .sf-table tbody td { padding:12px 16px; border-bottom:1px solid rgba(10,22,40,.04); vertical-align:middle; }
        .sf-table tbody tr:last-child td { border-bottom:none; }

        .sf-person { display:flex; align-items:center; gap:10px; }
        .sf-av     { width:36px; height:36px; border-radius:50%; background:linear-gradient(135deg,#0d9488,#0a1628); display:flex; align-items:center; justify-content:center; font-size:.68rem; font-weight:700; color:#fff; flex-shrink:0; }
        .sf-name   { font-size:.84rem; font-weight:500; color:#0a1628; }
        .sf-email  { font-size:.71rem; color:#94a3b8; }
        .sf-badge  { font-size:.63rem; font-weight:700; letter-spacing:.06em; text-transform:uppercase; padding:3px 9px; border-radius:50px; }
        .sf-toggle { position:relative; width:40px; height:22px; border-radius:50px; border:none; cursor:pointer; transition:background .2s; flex-shrink:0; }
        .sf-toggle::after { content:''; position:absolute; top:3px; width:16px; height:16px; border-radius:50%; background:#fff; transition:left .2s; }
        .sf-toggle.on  { background:#0d9488; }
        .sf-toggle.off { background:#cbd5e1; }
        .sf-toggle.on::after  { left:21px; }
        .sf-toggle.off::after { left:3px; }
        .sf-toggle:disabled { opacity:.5; cursor:not-allowed; }

        .sf-actions { display:flex; gap:5px; }
        .sf-actbtn  { padding:5px 10px; border-radius:7px; border:1px solid rgba(10,22,40,.1); background:none; cursor:pointer; font-size:.7rem; color:#64748b; font-family:'DM Sans',sans-serif; transition:all .15s; }
        .sf-actbtn:hover { background:rgba(10,22,40,.05); color:#0a1628; }
        .sf-actbtn.danger { border-color:rgba(220,38,38,.2); color:#ef4444; }
        .sf-actbtn.danger:hover { background:rgba(220,38,38,.06); }
        .sf-actbtn:disabled { opacity:.4; cursor:not-allowed; }

        .sf-pagination { display:flex; align-items:center; gap:6px; justify-content:center; padding:14px; }
        .sf-pgbtn { padding:5px 11px; border-radius:8px; border:1px solid rgba(10,22,40,.1); background:#fff; cursor:pointer; font-family:'DM Sans',sans-serif; font-size:.76rem; color:#64748b; transition:all .15s; }
        .sf-pgbtn:hover:not(:disabled) { background:rgba(10,22,40,.04); }
        .sf-pgbtn.active { background:#0a1628; color:#fff; border-color:#0a1628; }
        .sf-pgbtn:disabled { opacity:.4; cursor:not-allowed; }

        .sf-empty   { text-align:center; padding:48px; color:#94a3b8; font-size:.88rem; }
        .sf-error   { background:rgba(220,38,38,.06); border:1px solid rgba(220,38,38,.2); border-radius:12px; padding:14px 18px; font-size:.83rem; color:#dc2626; display:flex; gap:8px; align-items:center; }
        .sf-success { background:rgba(22,163,74,.08); border:1px solid rgba(22,163,74,.2); border-radius:12px; padding:12px 18px; font-size:.83rem; color:#16a34a; display:flex; gap:8px; align-items:center; animation:fadeIn .3s ease; }
      `}</style>

      <div className="sf-root">
        {/* Header */}
        <div className="sf-header">
          <div>
            <div className="sf-title">Staff Management</div>
            <div className="sf-sub">Manage admin and reception team members</div>
          </div>
        </div>

        {/* Stats */}
        <div className="sf-stats">
          {[
            { icon: "👥", label: "Total Staff",      num: counts.all          ?? 0, bg: "rgba(10,22,40,.06)"  },
            { icon: "🛡️", label: "Admins",           num: counts.admin        ?? 0, bg: "rgba(245,158,11,.1)" },
            { icon: "📋", label: "Receptionists",    num: counts.receptionist ?? 0, bg: "rgba(37,99,235,.1)"  },
          ].map(s => (
            <div key={s.label} className="sf-stat">
              <div className="sf-stat-icon" style={{ background: s.bg }}>{s.icon}</div>
              <div>
                <div className="sf-stat-num">{s.num}</div>
                <div className="sf-stat-lbl">{s.label}</div>
              </div>
            </div>
          ))}
        </div>

        {successMsg && <div className="sf-success">✓ {successMsg}</div>}

        {/* Toolbar */}
        <div className="sf-toolbar">
          <div className="sf-tabs">
            {filterTabs.map(t => (
              <button key={t.key} className={`sf-tab${roleFilter === t.key ? " active" : ""}`}
                onClick={() => { setRoleFilter(t.key); fetchStaff(1, search, t.key) }}>
                {t.label}
                {!loading && <span className="sf-tab-cnt">{counts[t.key] ?? 0}</span>}
              </button>
            ))}
          </div>
          <div className="sf-search">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <input placeholder="Search by name or email…" value={search} onChange={e => handleSearch(e.target.value)} />
            {search && <button onClick={() => handleSearch("")} style={{ background: "none", border: "none", cursor: "pointer", color: "#94a3b8", fontSize: "1rem", padding: 0 }}>✕</button>}
          </div>
          <button className="sf-add-btn" onClick={() => setShowCreate(true)}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Add Staff
          </button>
        </div>

        {error && (
          <div className="sf-error">
            ⚠️ {error}
            <button onClick={() => fetchStaff(page, search, roleFilter)} style={{ marginLeft: "auto", background: "rgba(220,38,38,.1)", border: "none", color: "#dc2626", padding: "4px 10px", borderRadius: 7, cursor: "pointer", fontSize: ".76rem" }}>Retry</button>
          </div>
        )}

        {/* Table */}
        <div className="sf-card">
          {loading ? (
            <div style={{ padding: 18, display: "flex", flexDirection: "column", gap: 12 }}>
              {[1,2,3,4].map(n => (
                <div key={n} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <Skel w="36px" h="36px" r="50%" />
                  <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 5 }}><Skel h="13px" w="40%" /><Skel h="11px" w="55%" /></div>
                  <Skel h="22px" w="80px" r="50px" />
                  <Skel w="40px" h="22px" r="50px" />
                </div>
              ))}
            </div>
          ) : !staff.length ? (
            <div className="sf-empty">
              <div style={{ fontSize: "2rem", marginBottom: 10 }}>👥</div>
              {search || roleFilter !== "all" ? "No staff match your filters." : "No staff members yet."}
            </div>
          ) : (
            <>
              <table className="sf-table">
                <thead>
                  <tr><th>Member</th><th>Role</th><th>Phone</th><th>Joined</th><th>Status</th><th>Actions</th></tr>
                </thead>
                <tbody>
                  {staff.map((s, i) => {
                    const rc = ROLE_CONFIG[s.role] ?? ROLE_CONFIG.receptionist
                    return (
                      <tr key={s.id} style={{ animationDelay: `${i * 30}ms` }}>
                        <td>
                          <div className="sf-person">
                            <div className="sf-av" style={{ background: s.isActive ? "linear-gradient(135deg,#0d9488,#0a1628)" : "#cbd5e1" }}>
                              {getInitials(s.name)}
                            </div>
                            <div>
                              <div className="sf-name">{s.name}</div>
                              <div className="sf-email">{s.email}</div>
                            </div>
                          </div>
                        </td>
                        <td>
                          <span className="sf-badge" style={{ background: rc.bg, color: rc.color }}>{rc.label}</span>
                        </td>
                        <td style={{ fontSize: ".82rem", color: "#64748b" }}>{s.phone ?? "—"}</td>
                        <td style={{ fontSize: ".78rem", color: "#94a3b8" }}>{formatDate(s.createdAt)}</td>
                        <td>
                          <button
                            className={`sf-toggle ${s.isActive ? "on" : "off"}`}
                            disabled={toggling === s.id}
                            onClick={() => handleToggle(s.id, !s.isActive)}
                            title={s.isActive ? "Click to deactivate" : "Click to activate"}
                          />
                        </td>
                        <td>
                          <div className="sf-actions">
                            <button className="sf-actbtn" onClick={() => setEditTarget(s)}>Edit</button>
                            <button className="sf-actbtn danger" disabled={deleting === s.id}
                              onClick={() => handleDelete(s.id)}>
                              {deleting === s.id ? "…" : "Remove"}
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>

              {totalPages > 1 && (
                <div className="sf-pagination">
                  <button className="sf-pgbtn" disabled={page <= 1} onClick={() => fetchStaff(page - 1, search, roleFilter)}>‹ Prev</button>
                  {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                    const pg = totalPages <= 7 ? i + 1 : page <= 4 ? i + 1 : page >= totalPages - 3 ? totalPages - 6 + i : page - 3 + i
                    return <button key={pg} className={`sf-pgbtn${page === pg ? " active" : ""}`} onClick={() => fetchStaff(pg, search, roleFilter)}>{pg}</button>
                  })}
                  <button className="sf-pgbtn" disabled={page >= totalPages} onClick={() => fetchStaff(page + 1, search, roleFilter)}>Next ›</button>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {showCreate && <StaffModal mode="create" onClose={() => setShowCreate(false)} onSave={handleCreate} />}
      {editTarget  && <StaffModal mode="edit" initial={editTarget} onClose={() => setEditTarget(null)} onSave={handleUpdate} />}
    </>
  )
}