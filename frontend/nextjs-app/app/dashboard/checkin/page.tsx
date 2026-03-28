"use client"

// app/(dashboard)/dashboard/checkin/page.tsx
// Admin + Receptionist: full access | Doctor: read-only queue view
//
// API:
//   GET  /api/checkin/queue                            → today's full queue
//   GET  /api/checkin/search?q=                        → patient search
//   GET  /api/checkin/patient/:id/appointments         → patient's today appointments
//   POST /api/checkin/:appointmentId                   → check-in appointment
//   POST /api/checkin/walkin                           → walk-in
//   PUT  /api/checkin/:appointmentId/status            → update status

import { useState, useEffect, useCallback, useRef } from "react"
import { useAuthStore } from "@/store/authStore"
import API from "@/lib/api"

// ── Types ─────────────────────────────────────────────────────────────────────
interface Patient {
  id: string; name: string; phone?: string; dob?: string
  bloodGroup?: string; allergies?: string[]
}

interface QueueItem {
  id:            string
  patientId:     string
  doctorId:      string
  serviceId?:    string
  date:          string
  time:          string
  status:        string
  amount:        number
  notes?:        string
  estimatedWait: number | null
  patient:       Patient
  doctor:        { id: string; name: string; specialty?: string }
  service?:      { id: string; name: string } | null
}

interface QueueResponse {
  queue:   QueueItem[]
  summary: { total: number; pending: number; confirmed: number; checkedIn: number; inProgress: number }
}

interface TodayAppt {
  id:      string
  time:    string
  doctor:  { id: string; name: string }
  service: { id: string; name: string } | null
  status:  string
}

// ── Constants ─────────────────────────────────────────────────────────────────
const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; icon: string; next?: string; nextLabel?: string }> = {
  pending:     { label: "Scheduled",   color: "#94a3b8", bg: "rgba(148,163,184,.1)", icon: "📅" },
  confirmed:   { label: "Confirmed",   color: "#16a34a", bg: "rgba(22,163,74,.1)",   icon: "✅", next: "checked_in",  nextLabel: "Check In"    },
  checked_in:  { label: "Waiting",     color: "#2563eb", bg: "rgba(37,99,235,.1)",   icon: "⏳", next: "in_progress", nextLabel: "Call Patient" },
  in_progress: { label: "In Progress", color: "#7c3aed", bg: "rgba(124,58,237,.1)",  icon: "⚡", next: "completed",   nextLabel: "Complete"    },
  completed:   { label: "Completed",   color: "#0d9488", bg: "rgba(13,148,136,.1)",  icon: "✔️" },
  cancelled:   { label: "Cancelled",   color: "#dc2626", bg: "rgba(220,38,38,.1)",   icon: "✕"  },
}

function getInitials(name: string) {
  return name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()
}
function calcAge(dob?: string) {
  if (!dob) return null
  return `${Math.floor((Date.now() - new Date(dob).getTime()) / (365.25 * 24 * 60 * 60 * 1000))}y`
}
function Skel({ w = "100%", h = "14px", r = "6px" }: { w?: string; h?: string; r?: string }) {
  return <div style={{ width: w, height: h, borderRadius: r, background: "linear-gradient(90deg,#f1f5f9 25%,#e2e8f0 50%,#f1f5f9 75%)", backgroundSize: "200% 100%", animation: "shimmer 1.4s infinite" }} />
}

// ── Walk-in Modal ─────────────────────────────────────────────────────────────
function WalkInModal({ clinicId, onClose, onSave }: { clinicId: string; onClose: () => void; onSave: (d: any) => Promise<void> }) {
  const [query,      setQuery]      = useState("")
  const [patients,   setPatients]   = useState<Patient[]>([])
  const [selPatient, setSelPatient] = useState<Patient | null>(null)
  const [appts,      setAppts]      = useState<TodayAppt[]>([])
  const [selAppt,    setSelAppt]    = useState<TodayAppt | null>(null)
  const [doctors,    setDoctors]    = useState<any[]>([])
  const [form, setForm] = useState({ doctorId: "", time: new Date().toTimeString().slice(0, 5), amount: "500", notes: "" })
  const [saving, setSaving] = useState(false)
  const [error,  setError]  = useState("")
  const searchRef = useRef<NodeJS.Timeout | null>(null)

  // Load doctors
  useEffect(() => {
    API.get("/staff?role=doctor&limit=50").then(r => {
      const d = r.data as any
      setDoctors(d?.users ?? [])
      if (d?.users?.length) setForm(f => ({ ...f, doctorId: d.users[0].id }))
    }).catch(() => {})
  }, [])

  // Search patients
  const handleSearch = (q: string) => {
    setQuery(q)
    clearTimeout(searchRef.current)
    if (!q.trim()) return setPatients([])
    searchRef.current = setTimeout(async () => {
      const res = await API.get(`/checkin/search?q=${encodeURIComponent(q)}`)
      setPatients(res.data as any ?? [])
    }, 300)
  }

  // Select patient → load their today appointments
  const selectPatient = async (p: Patient) => {
    setSelPatient(p); setPatients([]); setQuery(p.name); setAppts([]); setSelAppt(null)
    const res = await API.get(`/checkin/patient/${p.id}/appointments`)
    setAppts(res.data as any ?? [])
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selPatient) return setError("Please select a patient")
    setError(""); setSaving(true)
    try {
      if (selAppt) {
        // Check-in existing appointment
        await onSave({ type: "checkin", appointmentId: selAppt.id, notes: form.notes })
      } else {
        // Walk-in
        if (!form.doctorId) return setError("Please select a doctor")
        await onSave({ type: "walkin", patientId: selPatient.id, doctorId: form.doctorId, time: form.time, amount: parseFloat(form.amount) || 0, notes: form.notes || undefined })
      }
    } catch (err: any) {
      setError(err?.response?.data?.message ?? "Check-in failed")
    } finally { setSaving(false) }
  }

  const inp: React.CSSProperties = { width: "100%", padding: "9px 12px", borderRadius: 9, border: "1.5px solid rgba(10,22,40,.12)", fontFamily: "'DM Sans',sans-serif", fontSize: ".85rem", color: "#0a1628", outline: "none" }
  const lbl: React.CSSProperties = { fontSize: ".66rem", fontWeight: 600, letterSpacing: ".1em", textTransform: "uppercase", color: "#94a3b8", display: "block", marginBottom: 4 }

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(10,22,40,.6)", zIndex: 500, display: "flex", alignItems: "center", justifyContent: "center", padding: 20, backdropFilter: "blur(4px)" }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: "#fff", borderRadius: 20, width: "100%", maxWidth: 520, maxHeight: "90vh", overflowY: "auto", boxShadow: "0 24px 64px rgba(10,22,40,.25)" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "18px 22px", borderBottom: "1px solid rgba(10,22,40,.07)", position: "sticky", top: 0, background: "#fff", zIndex: 1 }}>
          <h2 style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: "1.2rem", fontWeight: 700, color: "#0a1628" }}>Patient Check-In</h2>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "#94a3b8", fontSize: "1.2rem" }}>✕</button>
        </div>
        <form onSubmit={handleSubmit} style={{ padding: "18px 22px", display: "flex", flexDirection: "column", gap: 14 }}>
          {/* Patient search */}
          <div style={{ position: "relative" }}>
            <label style={lbl}>Patient *</label>
            <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "9px 12px", borderRadius: 9, border: "1.5px solid rgba(10,22,40,.12)", background: "#fff" }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
              <input value={query} onChange={e => handleSearch(e.target.value)} placeholder="Search by name or phone…" style={{ border: "none", outline: "none", flex: 1, fontFamily: "'DM Sans',sans-serif", fontSize: ".85rem", color: "#0a1628" }} />
            </div>
            {patients.length > 0 && (
              <div style={{ position: "absolute", top: "100%", left: 0, right: 0, background: "#fff", border: "1px solid rgba(10,22,40,.1)", borderRadius: 10, boxShadow: "0 8px 24px rgba(10,22,40,.12)", zIndex: 10, marginTop: 4 }}>
                {patients.map(p => (
                  <div key={p.id} onClick={() => selectPatient(p)}
                    style={{ padding: "10px 14px", cursor: "pointer", borderBottom: "1px solid rgba(10,22,40,.05)", display: "flex", alignItems: "center", gap: 10 }}
                    onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.background = "rgba(10,22,40,.03)"}
                    onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.background = ""}>
                    <div style={{ width: 32, height: 32, borderRadius: "50%", background: "linear-gradient(135deg,#0d9488,#0a1628)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: ".65rem", fontWeight: 700, color: "#fff", flexShrink: 0 }}>
                      {getInitials(p.name)}
                    </div>
                    <div>
                      <div style={{ fontSize: ".84rem", fontWeight: 500, color: "#0a1628" }}>{p.name}</div>
                      <div style={{ fontSize: ".72rem", color: "#94a3b8" }}>{p.phone ?? "—"}{p.dob ? ` · ${calcAge(p.dob)}` : ""}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Today's appointments for selected patient */}
          {selPatient && (
            <div>
              <label style={lbl}>Today's Appointments</label>
              {appts.length === 0 ? (
                <div style={{ padding: "10px 13px", borderRadius: 9, background: "rgba(245,158,11,.06)", border: "1px solid rgba(245,158,11,.2)", fontSize: ".82rem", color: "#d97706" }}>
                  No appointments today — will create a walk-in visit
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                  {appts.map(a => (
                    <div key={a.id} onClick={() => setSelAppt(selAppt?.id === a.id ? null : a)}
                      style={{ padding: "10px 13px", borderRadius: 9, border: `1.5px solid ${selAppt?.id === a.id ? "#0d9488" : "rgba(10,22,40,.12)"}`, background: selAppt?.id === a.id ? "rgba(13,148,136,.05)" : "#fff", cursor: "pointer", display: "flex", alignItems: "center", gap: 12 }}>
                      <div style={{ fontSize: ".88rem", fontWeight: 700, color: "#0d9488", minWidth: 45 }}>{a.time}</div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: ".83rem", fontWeight: 500, color: "#0a1628" }}>{a.service?.name ?? "General"}</div>
                        <div style={{ fontSize: ".72rem", color: "#94a3b8" }}>{a.doctor.name}</div>
                      </div>
                      {selAppt?.id === a.id && <span style={{ fontSize: ".7rem", color: "#0d9488", fontWeight: 700 }}>✓ Selected</span>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Walk-in fields (shown when no appointment selected) */}
          {selPatient && !selAppt && (
            <>
              <div>
                <label style={lbl}>Doctor *</label>
                <select value={form.doctorId} onChange={e => setForm(f => ({ ...f, doctorId: e.target.value }))} style={inp}>
                  <option value="">— Select Doctor —</option>
                  {doctors.map((d: any) => <option key={d.id} value={d.id}>{d.name}{d.specialty ? ` · ${d.specialty}` : ""}</option>)}
                </select>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div><label style={lbl}>Check-in Time</label><input type="time" value={form.time} onChange={e => setForm(f => ({ ...f, time: e.target.value }))} style={inp} /></div>
                <div><label style={lbl}>Amount (₹)</label><input type="number" min={0} value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} style={inp} /></div>
              </div>
            </>
          )}

          {selPatient && (
            <div><label style={lbl}>Notes (optional)</label><textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2} placeholder="Any special notes…" style={{ ...inp, resize: "vertical" } as any} /></div>
          )}

          {error && <div style={{ background: "rgba(220,38,38,.06)", border: "1px solid rgba(220,38,38,.2)", borderRadius: 9, padding: "9px 13px", fontSize: ".82rem", color: "#dc2626" }}>{error}</div>}

          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
            <button type="button" onClick={onClose} style={{ padding: "9px 20px", borderRadius: 50, border: "1.5px solid rgba(10,22,40,.12)", background: "none", cursor: "pointer", fontFamily: "'DM Sans',sans-serif", fontSize: ".83rem", color: "#64748b" }}>Cancel</button>
            <button type="submit" disabled={saving || !selPatient} style={{ padding: "9px 24px", borderRadius: 50, border: "none", background: "linear-gradient(135deg,#0d9488,#0a1628)", color: "#fff", cursor: (!selPatient || saving) ? "not-allowed" : "pointer", fontFamily: "'DM Sans',sans-serif", fontSize: ".83rem", fontWeight: 500, opacity: (!selPatient || saving) ? .6 : 1, display: "flex", alignItems: "center", gap: 7 }}>
              {saving && <span style={{ width: 14, height: 14, border: "2px solid rgba(255,255,255,.3)", borderTopColor: "#fff", borderRadius: "50%", animation: "spin .7s linear infinite", display: "inline-block" }} />}
              {saving ? "Checking In…" : selAppt ? "Check In Appointment" : "Walk-In Check In"}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Queue Card ────────────────────────────────────────────────────────────────
function QueueCard({ item, onStatusChange, updating, canEdit }: {
  item:           QueueItem
  onStatusChange: (id: string, status: string) => Promise<void>
  updating:       string | null
  canEdit:        boolean
}) {
  const st  = STATUS_CONFIG[item.status] ?? STATUS_CONFIG.pending
  const age = calcAge(item.patient.dob)

  return (
    <div style={{
      background: "#fff", borderRadius: 16, border: `1px solid ${item.status === "in_progress" ? "rgba(124,58,237,.3)" : "rgba(10,22,40,.07)"}`,
      boxShadow: item.status === "in_progress" ? "0 0 0 3px rgba(124,58,237,.1)" : "0 2px 10px rgba(10,22,40,.05)",
      padding: "16px 18px", animation: "fadeIn .25s ease both",
      transition: "all .2s",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        {/* Avatar */}
        <div style={{ width: 44, height: 44, borderRadius: "50%", background: item.status === "in_progress" ? "linear-gradient(135deg,#7c3aed,#0a1628)" : "linear-gradient(135deg,#0d9488,#0a1628)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: ".78rem", fontWeight: 700, color: "#fff", flexShrink: 0, boxShadow: item.status === "in_progress" ? "0 0 0 3px rgba(124,58,237,.2)" : "none" }}>
          {getInitials(item.patient.name)}
        </div>

        {/* Patient info */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <span style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: "1rem", fontWeight: 700, color: "#0a1628" }}>{item.patient.name}</span>
            {item.patient.bloodGroup && <span style={{ fontSize: ".68rem", fontWeight: 700, color: "#ef4444", background: "rgba(239,68,68,.1)", padding: "1px 7px", borderRadius: 50 }}>{item.patient.bloodGroup}</span>}
          </div>
          <div style={{ fontSize: ".74rem", color: "#94a3b8", marginTop: 1 }}>
            {item.patient.phone ?? "—"}{age ? ` · ${age}` : ""} · {item.service?.name ?? "General"} · {item.doctor.name}
          </div>
          {item.patient.allergies && item.patient.allergies.length > 0 && (
            <div style={{ marginTop: 4 }}>
              {item.patient.allergies.map(a => (
                <span key={a} style={{ fontSize: ".65rem", fontWeight: 600, color: "#ef4444", background: "rgba(239,68,68,.08)", padding: "1px 6px", borderRadius: 50, marginRight: 4 }}>⚠️ {a}</span>
              ))}
            </div>
          )}
        </div>

        {/* Right side */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6, flexShrink: 0 }}>
          <span style={{ fontSize: ".7rem", fontWeight: 700, padding: "3px 10px", borderRadius: 50, background: st.bg, color: st.color }}>{st.icon} {st.label}</span>
          <span style={{ fontSize: ".8rem", fontWeight: 700, color: "#0d9488" }}>{item.time}</span>
          {item.estimatedWait !== null && item.status === "checked_in" && (
            <span style={{ fontSize: ".68rem", color: "#64748b" }}>~{item.estimatedWait}m wait</span>
          )}
        </div>
      </div>

      {/* Action buttons */}
      {canEdit && st.next && (
        <div style={{ marginTop: 12, paddingTop: 10, borderTop: "1px solid rgba(10,22,40,.06)", display: "flex", gap: 8 }}>
          <button
            disabled={updating === item.id}
            onClick={() => onStatusChange(item.id, st.next!)}
            style={{
              flex: 1, padding: "8px 0", borderRadius: 9, border: "none",
              background: item.status === "checked_in" ? "linear-gradient(135deg,#7c3aed,#0a1628)" : item.status === "in_progress" ? "linear-gradient(135deg,#0d9488,#0a1628)" : "linear-gradient(135deg,#16a34a,#0a1628)",
              color: "#fff", cursor: updating === item.id ? "not-allowed" : "pointer",
              fontFamily: "'DM Sans',sans-serif", fontSize: ".8rem", fontWeight: 600,
              opacity: updating === item.id ? .6 : 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
            }}>
            {updating === item.id
              ? <><span style={{ width: 13, height: 13, border: "2px solid rgba(255,255,255,.3)", borderTopColor: "#fff", borderRadius: "50%", animation: "spin .7s linear infinite", display: "inline-block" }} /> Processing…</>
              : `${st.nextLabel} →`}
          </button>
          <button disabled={updating === item.id} onClick={() => onStatusChange(item.id, "cancelled")}
            style={{ padding: "8px 14px", borderRadius: 9, border: "1px solid rgba(220,38,38,.2)", background: "none", cursor: "pointer", fontFamily: "'DM Sans',sans-serif", fontSize: ".76rem", color: "#ef4444", opacity: updating === item.id ? .4 : 1 }}>
            Cancel
          </button>
        </div>
      )}
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function CheckinPage() {
  const { role, can } = useAuthStore()
  const isDoctor  = role() === "doctor"
  const canEdit   = role() === "admin" || role() === "receptionist"

  const [queueData,  setQueueData]  = useState<QueueResponse | null>(null)
  const [loading,    setLoading]    = useState(true)
  const [error,      setError]      = useState<string | null>(null)
  const [updating,   setUpdating]   = useState<string | null>(null)
  const [showCheckin, setShowCheckin] = useState(false)
  const [filter,     setFilter]     = useState("all")
  const [successMsg, setSuccessMsg] = useState("")
  const pollRef = useRef<NodeJS.Timeout | null>(null)

  const fetchQueue = useCallback(async (silent = false) => {
    if (!silent) setLoading(true)
    setError(null)
    try {
      const res  = await API.get("/checkin/queue")
      setQueueData(res.data as unknown as QueueResponse)
    } catch (err: any) {
      setError(err?.response?.data?.message ?? "Failed to load queue")
    } finally {
      if (!silent) setLoading(false)
    }
  }, [])

  // Initial load + 30s auto-refresh
  useEffect(() => {
    fetchQueue()
    pollRef.current = setInterval(() => fetchQueue(true), 30_000)
    return () => clearInterval(pollRef.current)
  }, [])

  const showSuccess = (msg: string) => { setSuccessMsg(msg); setTimeout(() => setSuccessMsg(""), 3000) }

  const handleStatusChange = async (id: string, status: string) => {
    setUpdating(id)
    try {
      await API.put(`/checkin/${id}/status`, { status })
      fetchQueue(true)
      showSuccess(status === "completed" ? "Patient consultation completed!" : status === "in_progress" ? "Patient called!" : "Status updated!")
    } catch (err: any) {
      alert(err?.response?.data?.message ?? "Update failed")
    } finally {
      setUpdating(null)
    }
  }

  const handleCheckin = async (data: any) => {
    if (data.type === "checkin") {
      await API.post(`/checkin/${data.appointmentId}`, { notes: data.notes })
    } else {
      await API.post("/checkin/walkin", data)
    }
    setShowCheckin(false)
    fetchQueue(true)
    showSuccess("Patient checked in successfully!")
  }

  const queue = queueData?.queue ?? []
  const summary = queueData?.summary

  const filtered = filter === "all" ? queue : queue.filter(q => q.status === filter)

  const filterTabs = [
    { key: "all",        label: "All",        count: queue.length },
    { key: "confirmed",  label: "Confirmed",  count: summary?.confirmed  ?? 0 },
    { key: "checked_in", label: "Waiting",    count: summary?.checkedIn  ?? 0 },
    { key: "in_progress",label: "In Progress",count: summary?.inProgress ?? 0 },
  ]

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@700&family=DM+Sans:wght@300;400;500;600&display=swap');
        @keyframes shimmer { to{background-position:-200% 0} }
        @keyframes spin    { to{transform:rotate(360deg)} }
        @keyframes fadeIn  { from{opacity:0;transform:translateY(6px)} to{opacity:1;transform:translateY(0)} }

        .ci-root    { font-family:'DM Sans',sans-serif; display:flex; flex-direction:column; gap:20px; }
        .ci-header  { display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:12px; }
        .ci-title   { font-family:'Cormorant Garamond',serif; font-size:1.5rem; font-weight:700; color:#0a1628; }
        .ci-sub     { font-size:.8rem; color:#64748b; margin-top:2px; }

        .ci-stats   { display:grid; grid-template-columns:repeat(4,1fr); gap:14px; }
        @media(max-width:700px) { .ci-stats{grid-template-columns:repeat(2,1fr);} }
        .ci-stat    { background:#fff; border-radius:14px; border:1px solid rgba(10,22,40,.07); padding:14px 18px; display:flex; align-items:center; gap:12px; }
        .ci-stat-icon { width:38px; height:38px; border-radius:10px; display:flex; align-items:center; justify-content:center; font-size:1rem; flex-shrink:0; }
        .ci-stat-num  { font-family:'Cormorant Garamond',serif; font-size:1.7rem; font-weight:700; color:#0a1628; line-height:1; }
        .ci-stat-lbl  { font-size:.7rem; color:#64748b; }

        .ci-toolbar { display:flex; align-items:center; gap:10px; flex-wrap:wrap; }
        .ci-tabs    { display:flex; gap:5px; }
        .ci-tab     { padding:6px 14px; border-radius:50px; border:1.5px solid rgba(10,22,40,.1); background:none; cursor:pointer; font-family:'DM Sans',sans-serif; font-size:.76rem; font-weight:500; color:#64748b; transition:all .15s; display:flex; align-items:center; gap:5px; }
        .ci-tab.active { background:#0a1628; color:#fff; border-color:#0a1628; }
        .ci-tab:hover:not(.active) { border-color:#0a1628; color:#0a1628; }
        .ci-tab-cnt { font-size:.62rem; font-weight:700; padding:1px 5px; border-radius:50px; background:rgba(10,22,40,.08); }
        .ci-tab.active .ci-tab-cnt { background:rgba(255,255,255,.2); }

        .ci-checkin-btn { margin-left:auto; display:inline-flex; align-items:center; gap:6px; padding:10px 20px; border-radius:50px; border:none; cursor:pointer; background:linear-gradient(135deg,#0d9488,#0a1628); color:#fff; font-family:'DM Sans',sans-serif; font-size:.85rem; font-weight:500; box-shadow:0 3px 12px rgba(13,148,136,.28); transition:transform .18s; white-space:nowrap; }
        .ci-checkin-btn:hover { transform:translateY(-1px); }
        .ci-refresh-btn { padding:8px 14px; border-radius:50px; border:1.5px solid rgba(10,22,40,.1); background:#fff; cursor:pointer; font-family:'DM Sans',sans-serif; font-size:.76rem; color:#64748b; transition:all .15s; display:flex; align-items:center; gap:5px; }
        .ci-refresh-btn:hover { border-color:#0d9488; color:#0d9488; }

        .ci-queue   { display:flex; flex-direction:column; gap:12px; }
        .ci-empty   { text-align:center; padding:60px 20px; color:#94a3b8; }
        .ci-error   { background:rgba(220,38,38,.06); border:1px solid rgba(220,38,38,.2); border-radius:12px; padding:14px 18px; font-size:.83rem; color:#dc2626; display:flex; gap:8px; align-items:center; }
        .ci-success { background:rgba(22,163,74,.08); border:1px solid rgba(22,163,74,.2); border-radius:12px; padding:12px 18px; font-size:.83rem; color:#16a34a; animation:fadeIn .3s ease; }
        .ci-poll    { font-size:.72rem; color:#94a3b8; display:flex; align-items:center; gap:5px; }
      `}</style>

      <div className="ci-root">
        {/* Header */}
        <div className="ci-header">
          <div>
            <div className="ci-title">Patient Check-In</div>
            <div className="ci-sub">
              Today's queue · Auto-refreshes every 30s
              <span style={{ display: "inline-block", width: 7, height: 7, borderRadius: "50%", background: "#0d9488", marginLeft: 8, animation: "pulse 2s infinite" }} />
            </div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button className="ci-refresh-btn" onClick={() => fetchQueue()}>↻ Refresh</button>
            {canEdit && (
              <button className="ci-checkin-btn" onClick={() => setShowCheckin(true)}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                Check In Patient
              </button>
            )}
          </div>
        </div>

        {/* Stats */}
        {summary && (
          <div className="ci-stats">
            {[
              { icon: "📋", label: "Total Today",  num: summary.total,      bg: "rgba(10,22,40,.06)"  },
              { icon: "✅", label: "Confirmed",    num: summary.confirmed,  bg: "rgba(22,163,74,.1)"  },
              { icon: "⏳", label: "Waiting",      num: summary.checkedIn,  bg: "rgba(37,99,235,.1)"  },
              { icon: "⚡", label: "In Progress",  num: summary.inProgress, bg: "rgba(124,58,237,.1)" },
            ].map(s => (
              <div key={s.label} className="ci-stat">
                <div className="ci-stat-icon" style={{ background: s.bg }}>{s.icon}</div>
                <div><div className="ci-stat-num">{s.num}</div><div className="ci-stat-lbl">{s.label}</div></div>
              </div>
            ))}
          </div>
        )}

        {successMsg && <div className="ci-success">✓ {successMsg}</div>}

        {/* Filter tabs */}
        <div className="ci-toolbar">
          <div className="ci-tabs">
            {filterTabs.map(t => (
              <button key={t.key} className={`ci-tab${filter === t.key ? " active" : ""}`}
                onClick={() => setFilter(t.key)}>
                {t.label} <span className="ci-tab-cnt">{t.count}</span>
              </button>
            ))}
          </div>
        </div>

        {error && (
          <div className="ci-error">
            ⚠️ {error}
            <button onClick={() => fetchQueue()} style={{ marginLeft: "auto", background: "rgba(220,38,38,.1)", border: "none", color: "#dc2626", padding: "4px 10px", borderRadius: 7, cursor: "pointer", fontSize: ".76rem" }}>Retry</button>
          </div>
        )}

        {/* Queue */}
        {loading ? (
          <div className="ci-queue">
            {[1,2,3].map(n => (
              <div key={n} style={{ background: "#fff", borderRadius: 16, padding: "16px 18px", border: "1px solid rgba(10,22,40,.07)", display: "flex", alignItems: "center", gap: 12 }}>
                <Skel w="44px" h="44px" r="50%" />
                <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 7 }}><Skel h="16px" w="45%" /><Skel h="12px" w="65%" /></div>
                <Skel h="26px" w="90px" r="50px" />
              </div>
            ))}
          </div>
        ) : !filtered.length ? (
          <div className="ci-empty">
            <div style={{ fontSize: "2.5rem", marginBottom: 12 }}>🏥</div>
            <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: "1.1rem", fontWeight: 700, color: "#0a1628", marginBottom: 6 }}>
              {filter === "all" ? "No patients in today's queue" : `No patients with status "${filter.replace("_", " ")}"`}
            </div>
            {canEdit && filter === "all" && (
              <button onClick={() => setShowCheckin(true)} style={{ marginTop: 14, padding: "9px 22px", borderRadius: 50, border: "none", background: "linear-gradient(135deg,#0d9488,#0a1628)", color: "#fff", cursor: "pointer", fontFamily: "'DM Sans',sans-serif", fontSize: ".84rem" }}>
                Check In First Patient
              </button>
            )}
          </div>
        ) : (
          <div className="ci-queue">
            {filtered.map((item, i) => (
              <div key={item.id} style={{ animationDelay: `${i * 40}ms` }}>
                <QueueCard item={item} onStatusChange={handleStatusChange} updating={updating} canEdit={canEdit} />
              </div>
            ))}
          </div>
        )}
      </div>

      {showCheckin && (
        <WalkInModal clinicId="" onClose={() => setShowCheckin(false)} onSave={handleCheckin} />
      )}
    </>
  )
}