"use client"

// app/(dashboard)/dashboard/appointments/page.tsx
// FULLY REWRITTEN — replaces all mock data with real API calls.
//
// API endpoints:
//   GET    /api/appointments?search=&status=&dateRange=&page=&limit=
//   GET    /api/appointments/:id
//   POST   /api/appointments
//   PUT    /api/appointments/:id
//   DELETE /api/appointments/:id

import { useState, useEffect, useCallback, useRef } from "react"
import { useAuthStore }  from "@/store/authStore"
import PermissionGate    from "@/components/ui/PermissionGate"
import API               from "@/lib/api"

// ── Types ─────────────────────────────────────────────────────────────────────
type AppStatus =
  "pending" | "confirmed" | "checked_in" | "in_progress" |
  "completed" | "cancelled" | "no_show"

type DateRange = "today" | "tomorrow" | "week" | "month" | "all"

interface Appointment {
  id:            string
  clinicId:      string
  patientId:     string
  doctorId:      string
  serviceId?:    string
  date:          string
  time:          string
  duration:      number
  status:        AppStatus
  amount:        number
  notes?:        string
  clinicalNotes?: string
  patient:       { id: string; name: string; phone: string; email?: string }
  doctor:        { id: string; name: string; specialty?: string }
  service?:      { id: string; name: string; duration?: number; price?: number }
  bill?:         { id: string; total: number; paid: number; status: string } | null
}

interface AppointmentsResponse {
  appointments:  Appointment[]
  total:         number
  page:          number
  limit:         number
  totalPages:    number
  statusCounts:  Record<string, number>
}

interface Doctor   { id: string; name: string; specialty?: string }
interface Patient  { id: string; name: string; phone: string }
interface Service  { id: string; name: string; price: number; duration: number }

// ── Constants ─────────────────────────────────────────────────────────────────
const STATUS_CONFIG: Record<AppStatus, { bg: string; color: string; label: string; icon: string }> = {
  pending:     { bg: "rgba(245,158,11,.1)",  color: "#d97706", label: "Pending",     icon: "⏳" },
  confirmed:   { bg: "rgba(22,163,74,.1)",   color: "#16a34a", label: "Confirmed",   icon: "✅" },
  checked_in:  { bg: "rgba(37,99,235,.1)",   color: "#2563eb", label: "Checked In",  icon: "🏥" },
  in_progress: { bg: "rgba(124,58,237,.1)",  color: "#7c3aed", label: "In Progress", icon: "⚡" },
  completed:   { bg: "rgba(13,148,136,.1)",  color: "#0d9488", label: "Completed",   icon: "✔️" },
  cancelled:   { bg: "rgba(220,38,38,.1)",   color: "#dc2626", label: "Cancelled",   icon: "✕"  },
  no_show:     { bg: "rgba(100,116,139,.1)", color: "#64748b", label: "No Show",     icon: "👻" },
}

const DATE_RANGES: { value: DateRange; label: string }[] = [
  { value: "today",    label: "Today"     },
  { value: "tomorrow", label: "Tomorrow"  },
  { value: "week",     label: "This Week" },
  { value: "month",    label: "This Month"},
  { value: "all",      label: "All Time"  },
]

// Status transitions allowed per role
const STATUS_TRANSITIONS: Record<AppStatus, AppStatus[]> = {
  pending:     ["confirmed", "cancelled"],
  confirmed:   ["checked_in", "cancelled"],
  checked_in:  ["in_progress", "cancelled"],
  in_progress: ["completed", "cancelled"],
  completed:   [],
  cancelled:   [],
  no_show:     [],
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function getInitials(name: string) {
  return name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()
}

function formatDate(dateStr: string) {
  const d    = new Date(dateStr)
  const now  = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const apptDay = new Date(d.getFullYear(), d.getMonth(), d.getDate())
  const diff = Math.round((apptDay.getTime() - today.getTime()) / 86_400_000)
  if (diff === 0)  return "Today"
  if (diff === 1)  return "Tomorrow"
  if (diff === -1) return "Yesterday"
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(amount)
}

function Skel({ w = "100%", h = "14px", r = "6px" }: { w?: string; h?: string; r?: string }) {
  return <div style={{ width: w, height: h, borderRadius: r, background: "linear-gradient(90deg,#f1f5f9 25%,#e2e8f0 50%,#f1f5f9 75%)", backgroundSize: "200% 100%", animation: "shimmer 1.4s infinite" }} />
}

// ── Book/Edit Appointment Modal ───────────────────────────────────────────────
interface BookModalProps {
  mode:     "create" | "edit"
  initial?: Partial<Appointment>
  onClose:  () => void
  onSave:   (data: any) => Promise<void>
  isDoctor: boolean
}

function AppointmentModal({ mode, initial = {}, onClose, onSave, isDoctor }: BookModalProps) {
  const [patients,  setPatients]  = useState<Patient[]>([])
  const [doctors,   setDoctors]   = useState<Doctor[]>([])
  const [services,  setServices]  = useState<Service[]>([])
  const [loadingData, setLoadingData] = useState(true)

  const [form, setForm] = useState({
    patientId:     initial.patientId     ?? "",
    doctorId:      initial.doctorId      ?? "",
    serviceId:     initial.serviceId     ?? "",
    date:          initial.date          ? new Date(initial.date).toISOString().split("T")[0] : "",
    time:          initial.time          ?? "",
    duration:      String(initial.duration ?? 30),
    amount:        String(initial.amount   ?? 0),
    notes:         initial.notes          ?? "",
    clinicalNotes: initial.clinicalNotes  ?? "",
    status:        initial.status         ?? "pending",
  })
  const [saving, setSaving] = useState(false)
  const [error,  setError]  = useState("")

  useEffect(() => {
    const loadData = async () => {
      try {
        const [pRes, dRes, sRes] = await Promise.all([
          API.get("/patients?limit=100"),
          API.get("/staff?role=doctor&limit=100"),
          API.get("/services/clinic").catch(() => ({ data: { services: [] } })),
        ])
        // Patients list
        const pData = pRes.data as any
        setPatients(Array.isArray(pData) ? pData : (pData?.patients ?? []))
        // Doctors list from staff endpoint
        const dData = dRes.data as any
        setDoctors(Array.isArray(dData) ? dData : (dData?.staff ?? dData?.users ?? []))
        // Services list
        const sData = sRes.data as any
        setServices(Array.isArray(sData) ? sData : (sData?.services ?? []))
      } catch {
        // non-critical — modal still usable without dropdowns
      } finally {
        setLoadingData(false)
      }
    }
    loadData()
  }, [])

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.patientId) return setError("Patient is required")
    if (!form.doctorId)  return setError("Doctor is required")
    if (!form.date)       return setError("Date is required")
    if (!form.time)       return setError("Time is required")
    if (!form.amount)     return setError("Amount is required")
    setError("")
    setSaving(true)
    try {
      const payload: any = {
        patientId: form.patientId,
        doctorId:  form.doctorId,
        serviceId: form.serviceId || undefined,
        date:      form.date,
        time:      form.time,
        duration:  parseInt(form.duration) || 30,
        amount:    parseFloat(form.amount) || 0,
        notes:     form.notes || undefined,
      }
      if (mode === "edit") {
        payload.status = form.status
        if (isDoctor) payload.clinicalNotes = form.clinicalNotes || undefined
      }
      await onSave(payload)
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? err?.message ?? "Save failed"
      setError(Array.isArray(msg) ? msg[0] : msg)
    } finally {
      setSaving(false)
    }
  }

  const inputStyle: React.CSSProperties = {
    padding: "9px 12px", borderRadius: 9,
    border: "1.5px solid rgba(10,22,40,.12)", background: "#fff",
    fontFamily: "'DM Sans',sans-serif", fontSize: ".85rem", color: "#0a1628",
    outline: "none", width: "100%",
  }
  const labelStyle: React.CSSProperties = {
    fontSize: ".68rem", fontWeight: 600, letterSpacing: ".1em",
    textTransform: "uppercase", color: "#94a3b8", display: "block", marginBottom: 4,
  }

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(10,22,40,.6)", zIndex: 500, display: "flex", alignItems: "center", justifyContent: "center", padding: 20, backdropFilter: "blur(4px)" }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: "#fff", borderRadius: 20, width: "100%", maxWidth: 560, maxHeight: "90vh", overflowY: "auto", boxShadow: "0 24px 64px rgba(10,22,40,.25)" }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "20px 24px", borderBottom: "1px solid rgba(10,22,40,.07)" }}>
          <h2 style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: "1.25rem", fontWeight: 700, color: "#0a1628" }}>
            {mode === "create" ? "Book New Appointment" : "Edit Appointment"}
          </h2>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "#94a3b8", fontSize: "1.2rem", lineHeight: 1 }}>✕</button>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: 14 }}>
          {/* Patient */}
          <div>
            <label style={labelStyle}>Patient <span style={{ color: "#ef4444" }}>*</span></label>
            {loadingData ? <Skel h="38px" r="9px" /> : (
              patients.length ? (
                <select value={form.patientId} onChange={set("patientId")} style={inputStyle}>
                  <option value="">— Select Patient —</option>
                  {patients.map(p => <option key={p.id} value={p.id}>{p.name} · {p.phone}</option>)}
                </select>
              ) : (
                <input placeholder="Patient ID" value={form.patientId} onChange={set("patientId")} style={inputStyle} />
              )
            )}
          </div>

          {/* Doctor */}
          <div>
            <label style={labelStyle}>Doctor <span style={{ color: "#ef4444" }}>*</span></label>
            {loadingData ? <Skel h="38px" r="9px" /> : (
              doctors.length ? (
                <select value={form.doctorId} onChange={set("doctorId")} style={inputStyle}>
                  <option value="">— Select Doctor —</option>
                  {doctors.map(d => <option key={d.id} value={d.id}>{d.name}{d.specialty ? ` · ${d.specialty}` : ""}</option>)}
                </select>
              ) : (
                <input placeholder="Doctor ID" value={form.doctorId} onChange={set("doctorId")} style={inputStyle} />
              )
            )}
          </div>

          {/* Date + Time */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label style={labelStyle}>Date <span style={{ color: "#ef4444" }}>*</span></label>
              <input type="date" value={form.date} onChange={set("date")} style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Time <span style={{ color: "#ef4444" }}>*</span></label>
              <input type="time" value={form.time} onChange={set("time")} style={inputStyle} />
            </div>
          </div>

          {/* Service + Duration */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label style={labelStyle}>Service</label>
              {services.length ? (
                <select value={form.serviceId} onChange={set("serviceId")} style={inputStyle}>
                  <option value="">— Select Service —</option>
                  {services.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              ) : (
                <input placeholder="Service name" value={form.serviceId} onChange={set("serviceId")} style={inputStyle} />
              )}
            </div>
            <div>
              <label style={labelStyle}>Duration (min)</label>
              <input type="number" min={15} value={form.duration} onChange={set("duration")} style={inputStyle} />
            </div>
          </div>

          {/* Amount */}
          <div>
            <label style={labelStyle}>Amount (₹) <span style={{ color: "#ef4444" }}>*</span></label>
            <input type="number" min={0} value={form.amount} onChange={set("amount")} style={inputStyle} />
          </div>

          {/* Status (edit mode) */}
          {mode === "edit" && (
            <div>
              <label style={labelStyle}>Status</label>
              <select value={form.status} onChange={set("status")} style={inputStyle}>
                {Object.entries(STATUS_CONFIG).map(([v, c]) => (
                  <option key={v} value={v}>{c.icon} {c.label}</option>
                ))}
              </select>
            </div>
          )}

          {/* Notes */}
          <div>
            <label style={labelStyle}>Notes</label>
            <textarea value={form.notes} onChange={set("notes")} rows={2}
              style={{ ...inputStyle, resize: "vertical" } as any} />
          </div>

          {/* Clinical notes — doctor only */}
          {isDoctor && mode === "edit" && (
            <div>
              <label style={{ ...labelStyle, color: "#0d9488" }}>Clinical Notes <span style={{ fontSize: ".6rem", background: "rgba(13,148,136,.1)", padding: "1px 7px", borderRadius: 50, marginLeft: 4 }}>Doctor Only</span></label>
              <textarea value={form.clinicalNotes} onChange={set("clinicalNotes")} rows={3}
                style={{ ...inputStyle, resize: "vertical" } as any} />
            </div>
          )}

          {error && (
            <div style={{ background: "rgba(220,38,38,.06)", border: "1px solid rgba(220,38,38,.2)", borderRadius: 9, padding: "9px 13px", fontSize: ".82rem", color: "#dc2626" }}>
              {error}
            </div>
          )}

          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
            <button type="button" onClick={onClose}
              style={{ padding: "9px 20px", borderRadius: 50, border: "1.5px solid rgba(10,22,40,.12)", background: "none", cursor: "pointer", fontFamily: "'DM Sans',sans-serif", fontSize: ".83rem", color: "#64748b" }}>
              Cancel
            </button>
            <button type="submit" disabled={saving}
              style={{ padding: "9px 24px", borderRadius: 50, border: "none", background: "linear-gradient(135deg,#0d9488,#0a1628)", color: "#fff", cursor: saving ? "not-allowed" : "pointer", fontFamily: "'DM Sans',sans-serif", fontSize: ".83rem", fontWeight: 500, opacity: saving ? .65 : 1, display: "flex", alignItems: "center", gap: 7 }}>
              {saving && <span style={{ width: 14, height: 14, border: "2px solid rgba(255,255,255,.3)", borderTopColor: "#fff", borderRadius: "50%", animation: "spin .7s linear infinite", display: "inline-block" }} />}
              {saving ? "Saving…" : mode === "create" ? "Book Appointment" : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── View Detail Modal ─────────────────────────────────────────────────────────
function ViewModal({ appt, isDoctor, onClose, onStatusChange }: {
  appt: Appointment
  isDoctor: boolean
  onClose: () => void
  onStatusChange: (id: string, status: AppStatus) => Promise<void>
}) {
  const [updating, setUpdating] = useState(false)
  const transitions = STATUS_TRANSITIONS[appt.status] ?? []
  const st = STATUS_CONFIG[appt.status]

  const handleStatus = async (newStatus: AppStatus) => {
    setUpdating(true)
    try { await onStatusChange(appt.id, newStatus) }
    finally { setUpdating(false) }
  }

  const Row = ({ label, value }: { label: string; value: string }) => (
    <div style={{ display: "flex", justifyContent: "space-between", padding: "7px 0", borderBottom: "1px solid rgba(10,22,40,.05)" }}>
      <span style={{ fontSize: ".75rem", color: "#94a3b8" }}>{label}</span>
      <span style={{ fontSize: ".82rem", fontWeight: 500, color: "#0a1628" }}>{value}</span>
    </div>
  )

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(10,22,40,.6)", zIndex: 500, display: "flex", alignItems: "center", justifyContent: "center", padding: 20, backdropFilter: "blur(4px)" }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: "#fff", borderRadius: 20, width: "100%", maxWidth: 480, maxHeight: "90vh", overflowY: "auto", boxShadow: "0 24px 64px rgba(10,22,40,.25)" }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "20px 24px", borderBottom: "1px solid rgba(10,22,40,.07)" }}>
          <div style={{ width: 44, height: 44, borderRadius: "50%", background: "linear-gradient(135deg,#0d9488,#0a1628)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: ".8rem", fontWeight: 700, color: "#fff" }}>
            {getInitials(appt.patient.name)}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: "1.1rem", fontWeight: 700, color: "#0a1628" }}>{appt.patient.name}</div>
            <div style={{ fontSize: ".72rem", color: "#94a3b8" }}>{appt.patient.phone}</div>
          </div>
          <span style={{ fontSize: ".7rem", fontWeight: 700, padding: "4px 12px", borderRadius: 50, background: st.bg, color: st.color }}>{st.icon} {st.label}</span>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "#94a3b8", fontSize: "1.2rem", lineHeight: 1 }}>✕</button>
        </div>

        <div style={{ padding: "20px 24px" }}>
          <Row label="Doctor"      value={appt.doctor.name} />
          <Row label="Service"     value={appt.service?.name ?? "General"} />
          <Row label="Date"        value={formatDate(appt.date)} />
          <Row label="Time"        value={appt.time} />
          <Row label="Duration"    value={`${appt.duration} min`} />
          <Row label="Amount"      value={formatCurrency(appt.amount)} />
          {appt.bill && (
            <Row label="Bill Status" value={`${formatCurrency(appt.bill.paid)} paid of ${formatCurrency(appt.bill.total)}`} />
          )}
          {appt.notes && (
            <div style={{ marginTop: 12 }}>
              <div style={{ fontSize: ".68rem", fontWeight: 700, letterSpacing: ".1em", textTransform: "uppercase", color: "#94a3b8", marginBottom: 6 }}>Notes</div>
              <div style={{ fontSize: ".82rem", color: "#475569", background: "rgba(10,22,40,.02)", borderRadius: 9, padding: "9px 12px" }}>{appt.notes}</div>
            </div>
          )}

          {/* Clinical notes — doctor only */}
          {isDoctor && appt.clinicalNotes && (
            <div style={{ marginTop: 12 }}>
              <div style={{ fontSize: ".68rem", fontWeight: 700, letterSpacing: ".1em", textTransform: "uppercase", color: "#0d9488", marginBottom: 6 }}>Clinical Notes</div>
              <div style={{ fontSize: ".82rem", color: "#475569", background: "rgba(13,148,136,.05)", border: "1px solid rgba(13,148,136,.15)", borderRadius: 9, padding: "9px 12px" }}>{appt.clinicalNotes}</div>
            </div>
          )}

          {/* Status actions */}
          {transitions.length > 0 && (
            <div style={{ marginTop: 18 }}>
              <div style={{ fontSize: ".68rem", fontWeight: 700, letterSpacing: ".1em", textTransform: "uppercase", color: "#94a3b8", marginBottom: 8 }}>Update Status</div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {transitions.map(s => {
                  const sc = STATUS_CONFIG[s]
                  return (
                    <button key={s} disabled={updating} onClick={() => handleStatus(s)}
                      style={{ padding: "7px 16px", borderRadius: 50, border: `1.5px solid ${sc.color}40`, background: sc.bg, color: sc.color, cursor: updating ? "not-allowed" : "pointer", fontFamily: "'DM Sans',sans-serif", fontSize: ".78rem", fontWeight: 600, opacity: updating ? .6 : 1 }}>
                      {updating ? "…" : `${sc.icon} Mark ${sc.label}`}
                    </button>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function AppointmentsPage() {
  const { user, can, role } = useAuthStore()
  const isDoctor   = role() === "doctor"
  const canCreate  = can("appointments:create")
  const canEdit    = can("appointments:update")
  const canDelete  = can("appointments:delete")

  // ── State ──────────────────────────────────────────────────────────────────
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [statusCounts, setStatusCounts] = useState<Record<string, number>>({})
  const [total,        setTotal]        = useState(0)
  const [totalPages,   setTotalPages]   = useState(1)
  const [page,         setPage]         = useState(1)

  const [search,     setSearch]     = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [dateRange,  setDateRange]  = useState<DateRange>("today")

  const [loading,  setLoading]  = useState(true)
  const [error,    setError]    = useState<string | null>(null)

  const [viewAppt,   setViewAppt]   = useState<Appointment | null>(null)
  const [editAppt,   setEditAppt]   = useState<Appointment | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [deleting,   setDeleting]   = useState<string | null>(null)

  const searchRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const LIMIT = 25

  // ── Fetch ──────────────────────────────────────────────────────────────────
  const fetchAppointments = useCallback(async (
    pg = 1, q = search, st = statusFilter, dr = dateRange
  ) => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams({
        page:      String(pg),
        limit:     String(LIMIT),
        dateRange: dr,
      })
      if (q.trim()) params.set("search", q.trim())
      if (st !== "all") params.set("status", st)

      const res  = await API.get(`/appointments?${params}`)
      const data = res.data as unknown as AppointmentsResponse
      setAppointments(data.appointments)
      setTotal(data.total)
      setTotalPages(data.totalPages)
      setStatusCounts(data.statusCounts ?? {})
      setPage(pg)
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? err?.message ?? "Failed to load appointments"
      setError(typeof msg === "string" ? msg : "Failed to load appointments")
    } finally {
      setLoading(false)
    }
  }, [search, statusFilter, dateRange])

  useEffect(() => { fetchAppointments(1, "", "all", "today") }, [])

  const handleSearch = (q: string) => {
    setSearch(q)
    clearTimeout(searchRef.current)
    searchRef.current = setTimeout(() => fetchAppointments(1, q, statusFilter, dateRange), 400)
  }

  const handleStatusFilter = (s: string) => {
    setStatusFilter(s)
    fetchAppointments(1, search, s, dateRange)
  }

  const handleDateRange = (dr: DateRange) => {
    setDateRange(dr)
    fetchAppointments(1, search, statusFilter, dr)
  }

  // ── CRUD ───────────────────────────────────────────────────────────────────
  const handleCreate = async (data: any) => {
    await API.post("/appointments", data)
    setShowCreate(false)
    fetchAppointments(1, search, statusFilter, dateRange)
  }

  const handleUpdate = async (data: any) => {
    if (!editAppt) return
    await API.put(`/appointments/${editAppt.id}`, data)
    setEditAppt(null)
    fetchAppointments(page, search, statusFilter, dateRange)
  }

  const handleStatusChange = async (id: string, status: AppStatus) => {
    await API.put(`/appointments/${id}`, { status })
    setViewAppt(prev => prev ? { ...prev, status } : null)
    fetchAppointments(page, search, statusFilter, dateRange)
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Cancel/delete this appointment?")) return
    setDeleting(id)
    try {
      await API.delete(`/appointments/${id}`)
      if (viewAppt?.id === id) setViewAppt(null)
      fetchAppointments(page, search, statusFilter, dateRange)
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? "Failed"
      alert(Array.isArray(msg) ? msg[0] : msg)
    } finally {
      setDeleting(null)
    }
  }

  const allStatuses = ["all", "pending", "confirmed", "checked_in", "in_progress", "completed", "cancelled", "no_show"]

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@700&family=DM+Sans:wght@300;400;500;600&display=swap');
        @keyframes shimmer { to{background-position:-200% 0} }
        @keyframes spin    { to{transform:rotate(360deg)} }
        @keyframes fadeIn  { from{opacity:0;transform:translateY(6px)} to{opacity:1;transform:translateY(0)} }

        .ap-root     { font-family:'DM Sans',sans-serif; display:flex; flex-direction:column; gap:20px; }
        .ap-topbar   { display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:12px; }
        .ap-filters  { display:flex; gap:6px; flex-wrap:wrap; }
        .ap-fbtn     { padding:6px 13px; border-radius:50px; border:1.5px solid rgba(10,22,40,.1); background:none; cursor:pointer; font-family:'DM Sans',sans-serif; font-size:.76rem; font-weight:500; color:#64748b; transition:all .18s; display:flex; align-items:center; gap:5px; }
        .ap-fbtn.active  { background:#0a1628; color:#fff; border-color:#0a1628; }
        .ap-fbtn:hover:not(.active) { border-color:#0a1628; color:#0a1628; }
        .ap-fbtn-cnt { font-size:.62rem; font-weight:700; padding:1px 5px; border-radius:50px; background:rgba(10,22,40,.08); }
        .ap-fbtn.active .ap-fbtn-cnt { background:rgba(255,255,255,.2); }

        .ap-drbar    { display:flex; gap:6px; flex-wrap:wrap; }
        .ap-drbtn    { padding:5px 11px; border-radius:8px; border:1px solid rgba(10,22,40,.1); background:#fff; cursor:pointer; font-family:'DM Sans',sans-serif; font-size:.74rem; color:#64748b; transition:all .15s; }
        .ap-drbtn.active { background:#0d9488; color:#fff; border-color:#0d9488; }
        .ap-drbtn:hover:not(.active) { background:rgba(10,22,40,.03); }

        .ap-search   { display:flex; align-items:center; gap:8px; padding:8px 14px; border-radius:50px; border:1.5px solid rgba(10,22,40,.1); background:#fff; transition:border-color .18s; }
        .ap-search:focus-within { border-color:#0d9488; }
        .ap-search input { border:none; outline:none; font-family:'DM Sans',sans-serif; font-size:.83rem; color:#0a1628; background:transparent; width:200px; }
        .ap-search input::placeholder { color:#94a3b8; }

        .ap-new-btn  { display:inline-flex; align-items:center; gap:7px; background:linear-gradient(135deg,#0d9488,#0a1628); color:#fff; border:none; cursor:pointer; font-family:'DM Sans',sans-serif; font-size:.83rem; font-weight:500; padding:9px 18px; border-radius:50px; box-shadow:0 3px 14px rgba(13,148,136,.28); transition:transform .18s; white-space:nowrap; }
        .ap-new-btn:hover { transform:translateY(-1px); }

        .ap-card     { background:#fff; border-radius:18px; border:1px solid rgba(10,22,40,.07); box-shadow:0 2px 16px rgba(10,22,40,.05); overflow:hidden; }

        /* Table */
        .ap-table    { width:100%; border-collapse:collapse; }
        .ap-table thead th { text-align:left; padding:12px 16px; font-size:.66rem; font-weight:700; letter-spacing:.1em; text-transform:uppercase; color:#94a3b8; border-bottom:1px solid rgba(10,22,40,.07); background:rgba(10,22,40,.02); white-space:nowrap; }
        .ap-table tbody tr { transition:background .15s; animation:fadeIn .25s ease both; }
        .ap-table tbody tr:hover { background:rgba(10,22,40,.02); }
        .ap-table tbody td { padding:12px 16px; border-bottom:1px solid rgba(10,22,40,.04); vertical-align:middle; }
        .ap-table tbody tr:last-child td { border-bottom:none; }

        .ap-patient  { display:flex; align-items:center; gap:10px; }
        .ap-av       { width:34px; height:34px; border-radius:50%; flex-shrink:0; background:linear-gradient(135deg,#0d9488,#0a1628); display:flex; align-items:center; justify-content:center; font-size:.66rem; font-weight:700; color:#fff; }
        .ap-pt-name  { font-size:.84rem; font-weight:500; color:#0a1628; }
        .ap-pt-svc   { font-size:.7rem; color:#94a3b8; }
        .ap-doctor   { font-size:.8rem; color:#64748b; }
        .ap-dt       { font-size:.82rem; color:#0a1628; font-weight:500; }
        .ap-dt-sub   { font-size:.7rem; color:#94a3b8; }
        .ap-amount   { font-size:.86rem; font-weight:600; color:#0d9488; white-space:nowrap; }
        .ap-badge    { font-size:.63rem; font-weight:700; letter-spacing:.06em; text-transform:uppercase; padding:3px 9px; border-radius:50px; white-space:nowrap; }
        .ap-actions  { display:flex; gap:5px; }
        .ap-actbtn   { padding:5px 10px; border-radius:7px; border:1px solid rgba(10,22,40,.1); background:none; cursor:pointer; font-size:.7rem; color:#64748b; transition:all .15s; font-family:'DM Sans',sans-serif; white-space:nowrap; }
        .ap-actbtn:hover { background:rgba(10,22,40,.05); color:#0a1628; }
        .ap-actbtn.primary { background:linear-gradient(135deg,#0d9488,#0a1628); color:#fff; border:none; }
        .ap-actbtn.primary:hover { opacity:.88; }
        .ap-actbtn.danger { border-color:rgba(220,38,38,.2); color:#ef4444; }
        .ap-actbtn.danger:hover { background:rgba(220,38,38,.06); }
        .ap-actbtn:disabled { opacity:.4; cursor:not-allowed; }

        /* Pagination */
        .ap-pagination { display:flex; align-items:center; gap:6px; justify-content:center; padding:14px; flex-wrap:wrap; }
        .ap-pgbtn { padding:5px 11px; border-radius:8px; border:1px solid rgba(10,22,40,.1); background:#fff; cursor:pointer; font-family:'DM Sans',sans-serif; font-size:.76rem; color:#64748b; transition:all .15s; }
        .ap-pgbtn:hover:not(:disabled) { background:rgba(10,22,40,.04); }
        .ap-pgbtn.active { background:#0a1628; color:#fff; border-color:#0a1628; }
        .ap-pgbtn:disabled { opacity:.4; cursor:not-allowed; }

        .ap-empty  { text-align:center; padding:48px; color:#94a3b8; font-size:.88rem; }
        .ap-error  { background:rgba(220,38,38,.06); border:1px solid rgba(220,38,38,.2); border-radius:12px; padding:14px 18px; font-size:.83rem; color:#dc2626; display:flex; align-items:center; gap:8px; }
        .ap-meta   { font-size:.78rem; color:#94a3b8; }

        .ap-table-wrap { overflow-x:auto; -webkit-overflow-scrolling:touch; }
        @media(max-width:900px) {
          .ap-table thead th:nth-child(2),
          .ap-table tbody td:nth-child(2) { display:none; }
        }
        @media(max-width:700px) {
          .ap-table thead th:nth-child(5),
          .ap-table tbody td:nth-child(5) { display:none; }
          .ap-search input { width:140px; }
        }
        @media(max-width:640px) {
          .ap-topbar { flex-direction:column; align-items:stretch; }
          .ap-new-btn { width:100%; justify-content:center; }
          .ap-search { flex:1; }
          .ap-search input { width:100%; }
          .ap-filters { overflow-x:auto; flex-wrap:nowrap; padding-bottom:4px; -webkit-overflow-scrolling:touch; }
          .ap-drbar { overflow-x:auto; flex-wrap:nowrap; padding-bottom:4px; }
        }
      `}</style>

      <div className="ap-root">

        {/* Date range bar */}
        <div className="ap-drbar">
          {DATE_RANGES.map(dr => (
            <button key={dr.value} className={`ap-drbtn${dateRange === dr.value ? " active" : ""}`}
              onClick={() => handleDateRange(dr.value)}>
              {dr.label}
            </button>
          ))}
        </div>

        {/* Status filters + search + new button */}
        <div className="ap-topbar">
          <div className="ap-filters">
            {allStatuses.slice(0, 5).map(s => {
              const cfg = s === "all" ? null : STATUS_CONFIG[s as AppStatus]
              const cnt = statusCounts[s] ?? 0
              return (
                <button key={s} className={`ap-fbtn${statusFilter === s ? " active" : ""}`}
                  onClick={() => handleStatusFilter(s)}>
                  {cfg ? cfg.icon : "📋"} {s === "all" ? "All" : cfg!.label}
                  {!loading && <span className="ap-fbtn-cnt">{s === "all" ? total : cnt}</span>}
                </button>
              )
            })}
          </div>
          <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
            <div className="ap-search">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
              <input placeholder="Search patient, service…" value={search} onChange={e => handleSearch(e.target.value)} />
              {search && <button onClick={() => handleSearch("")} style={{ background: "none", border: "none", cursor: "pointer", color: "#94a3b8", fontSize: "1rem", lineHeight: 1, padding: 0 }}>✕</button>}
            </div>
            {!loading && <span className="ap-meta">{total} appointment{total !== 1 ? "s" : ""}</span>}
            <PermissionGate permission="appointments:create">
              <button className="ap-new-btn" onClick={() => setShowCreate(true)}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                New Appointment
              </button>
            </PermissionGate>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="ap-error">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
            {error}
            <button onClick={() => fetchAppointments(page, search, statusFilter, dateRange)}
              style={{ marginLeft: "auto", background: "rgba(220,38,38,.1)", border: "none", color: "#dc2626", padding: "4px 12px", borderRadius: 8, cursor: "pointer", fontSize: ".78rem", fontWeight: 500 }}>
              Retry
            </button>
          </div>
        )}

        {/* Table card */}
        <div className="ap-card">
          {loading ? (
            <div style={{ padding: 20, display: "flex", flexDirection: "column", gap: 12 }}>
              {[1,2,3,4,5].map(n => (
                <div key={n} style={{ display: "flex", alignItems: "center", gap: 14 }}>
                  <Skel w="34px" h="34px" r="50%" />
                  <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6 }}>
                    <Skel h="13px" w="40%" /><Skel h="11px" w="60%" />
                  </div>
                  <Skel h="13px" w="80px" />
                  <Skel h="13px" w="80px" />
                  <Skel h="24px" w="80px" r="50px" />
                  <Skel h="13px" w="60px" />
                </div>
              ))}
            </div>
          ) : !appointments.length ? (
            <div className="ap-empty">
              {search || statusFilter !== "all"
                ? "No appointments match your filters."
                : dateRange === "today"
                  ? "No appointments scheduled for today."
                  : "No appointments found."
              }
            </div>
          ) : (
            <>
              <div className="ap-table-wrap">
              <table className="ap-table">
                <thead>
                  <tr>
                    <th>Patient</th>
                    <th>Doctor</th>
                    <th>Date & Time</th>
                    <th>Status</th>
                    <th>Amount</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {appointments.map((a, i) => {
                    const st = STATUS_CONFIG[a.status] ?? STATUS_CONFIG.pending
                    return (
                      <tr key={a.id} style={{ animationDelay: `${i * 30}ms` }}>
                        <td>
                          <div className="ap-patient">
                            <div className="ap-av">{getInitials(a.patient.name)}</div>
                            <div>
                              <div className="ap-pt-name">{a.patient.name}</div>
                              <div className="ap-pt-svc">{a.service?.name ?? "General"}</div>
                            </div>
                          </div>
                        </td>
                        <td><span className="ap-doctor">{a.doctor.name}</span></td>
                        <td>
                          <div className="ap-dt">{formatDate(a.date)}</div>
                          <div className="ap-dt-sub">{a.time}</div>
                        </td>
                        <td>
                          <span className="ap-badge" style={{ background: st.bg, color: st.color }}>
                            {st.icon} {st.label}
                          </span>
                        </td>
                        <td><span className="ap-amount">{formatCurrency(a.amount)}</span></td>
                        <td>
                          <div className="ap-actions">
                            <button className="ap-actbtn primary" onClick={() => setViewAppt(a)}>View</button>
                            {canEdit && (
                              <button className="ap-actbtn" onClick={() => setEditAppt(a)}>Edit</button>
                            )}
                            {canDelete && (
                              <button
                                className="ap-actbtn danger"
                                disabled={deleting === a.id || ["completed","cancelled","no_show"].includes(a.status)}
                                onClick={() => handleDelete(a.id)}
                              >
                                {deleting === a.id ? "…" : "Cancel"}
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="ap-pagination">
                  <button className="ap-pgbtn" disabled={page <= 1} onClick={() => fetchAppointments(page - 1, search, statusFilter, dateRange)}>‹ Prev</button>
                  {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                    const pg = totalPages <= 7 ? i + 1 : page <= 4 ? i + 1 : page >= totalPages - 3 ? totalPages - 6 + i : page - 3 + i
                    return <button key={pg} className={`ap-pgbtn${page === pg ? " active" : ""}`} onClick={() => fetchAppointments(pg, search, statusFilter, dateRange)}>{pg}</button>
                  })}
                  <button className="ap-pgbtn" disabled={page >= totalPages} onClick={() => fetchAppointments(page + 1, search, statusFilter, dateRange)}>Next ›</button>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* View modal */}
      {viewAppt && (
        <ViewModal
          appt={viewAppt}
          isDoctor={isDoctor}
          onClose={() => setViewAppt(null)}
          onStatusChange={handleStatusChange}
        />
      )}

      {/* Create modal */}
      {showCreate && (
        <AppointmentModal
          mode="create"
          isDoctor={isDoctor}
          onClose={() => setShowCreate(false)}
          onSave={handleCreate}
        />
      )}

      {/* Edit modal */}
      {editAppt && (
        <AppointmentModal
          mode="edit"
          initial={editAppt}
          isDoctor={isDoctor}
          onClose={() => setEditAppt(null)}
          onSave={handleUpdate}
        />
      )}
    </>
  )
}