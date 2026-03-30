"use client"

// app/(dashboard)/dashboard/patients/page.tsx
// FULLY REWRITTEN — replaces all mock data with real API calls.
//
// API endpoints used:
//   GET  /api/patients?search=&page=&limit=   → paginated list
//   GET  /api/patients/:id                    → single patient (basic)
//   GET  /api/patients/:id/medical            → full medical (doctor only)
//   POST /api/patients                        → create patient
//   PUT  /api/patients/:id                    → update patient
//   DELETE /api/patients/:id                  → delete (admin only)

import { useState, useEffect, useCallback, useRef } from "react"
import { useAuthStore }  from "@/store/authStore"
import PermissionGate    from "@/components/ui/PermissionGate"
import API               from "@/lib/api"

// ── Types ─────────────────────────────────────────────────────────────────────
interface Patient {
  id:          string
  clinicId:    string
  name:        string
  email:       string
  phone:       string
  dob?:        string
  gender?:     "male" | "female" | "other"
  address?:    string
  insurance?:  string
  totalVisits: number
  lastVisit?:  string
  createdAt:   string
  updatedAt?:  string
  _count?:     { appointments: number }
  // Medical — only present for doctors
  bloodGroup?:         string
  medicalHistory?:     string
  allergies?:          string[]
  currentMedications?: string[]
  doctorNotes?:        string
}

interface MedicalRecord extends Patient {
  prescriptions?: any[]
  consultations?: any[]
  labRequests?:   any[]
  appointments?:  any[]
}

interface PatientsResponse {
  patients:   Patient[]
  total:      number
  page:       number
  limit:      number
  totalPages: number
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function getInitials(name: string) {
  return name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()
}

function formatDate(dateStr?: string | null) {
  if (!dateStr) return "—"
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return "—"
  const now  = new Date()
  const diff = Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24))
  if (diff === 0) return "Today"
  if (diff === 1) return "Yesterday"
  if (diff  < 7)  return `${diff} days ago`
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
}

function formatAge(dob?: string) {
  if (!dob) return "—"
  const age = Math.floor((Date.now() - new Date(dob).getTime()) / (365.25 * 24 * 60 * 60 * 1000))
  return `${age} yrs`
}

// ── Skeleton ─────────────────────────────────────────────────────────────────
function Skel({ w = "100%", h = "14px", r = "6px" }: { w?: string; h?: string; r?: string }) {
  return <div style={{ width:w, height:h, borderRadius:r, background:"linear-gradient(90deg,#f1f5f9 25%,#e2e8f0 50%,#f1f5f9 75%)", backgroundSize:"200% 100%", animation:"shimmer 1.4s infinite" }} />
}

// ── Create/Edit Modal ─────────────────────────────────────────────────────────
interface ModalProps {
  mode:     "create" | "edit"
  initial?: Partial<Patient>
  isDoctor: boolean
  onClose:  () => void
  onSave:   (data: any) => Promise<void>
}

function PatientModal({ mode, initial = {}, isDoctor, onClose, onSave }: ModalProps) {
  const [form, setForm] = useState({
    name:               initial.name               ?? "",
    email:              initial.email              ?? "",
    phone:              initial.phone              ?? "",
    dob:                initial.dob                ?? "",
    gender:             initial.gender             ?? "",
    address:            initial.address            ?? "",
    insurance:          initial.insurance          ?? "",
    bloodGroup:         initial.bloodGroup         ?? "",
    medicalHistory:     initial.medicalHistory     ?? "",
    allergiesRaw:       (initial.allergies         ?? []).join(", "),
    medicationsRaw:     (initial.currentMedications ?? []).join(", "),
    doctorNotes:        initial.doctorNotes        ?? "",
  })
  const [saving, setSaving] = useState(false)
  const [error,  setError]  = useState("")

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name.trim())  return setError("Name is required")
    if (!form.phone.trim()) return setError("Phone is required")
    setError("")
    setSaving(true)
    try {
      const payload: any = {
        name:     form.name.trim(),
        email:    form.email.trim()   || undefined,
        phone:    form.phone.trim(),
        dob:      form.dob            || undefined,
        gender:   form.gender         || undefined,
        address:  form.address.trim() || undefined,
        insurance: form.insurance.trim() || undefined,
      }
      if (isDoctor) {
        payload.bloodGroup         = form.bloodGroup.trim()     || undefined
        payload.medicalHistory     = form.medicalHistory.trim() || undefined
        payload.allergies          = form.allergiesRaw.split(",").map(s => s.trim()).filter(Boolean)
        payload.currentMedications = form.medicationsRaw.split(",").map(s => s.trim()).filter(Boolean)
        payload.doctorNotes        = form.doctorNotes.trim()    || undefined
      }
      await onSave(payload)
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? err?.message ?? "Save failed"
      setError(Array.isArray(msg) ? msg[0] : msg)
    } finally {
      setSaving(false)
    }
  }

  const Field = ({ label, name, type = "text", as = "input", options = [] as string[], required = false }: any) => (
    <div style={{ display:"flex", flexDirection:"column", gap:4 }}>
      <label style={{ fontSize:".68rem", fontWeight:600, letterSpacing:".1em", textTransform:"uppercase", color:"#94a3b8" }}>
        {label}{required && <span style={{ color:"#ef4444", marginLeft:2 }}>*</span>}
      </label>
      {as === "select" ? (
        <select value={(form as any)[name]} onChange={set(name)} style={{ padding:"9px 12px", borderRadius:9, border:"1.5px solid rgba(10,22,40,.12)", background:"#fff", fontFamily:"'DM Sans',sans-serif", fontSize:".85rem", color:"#0a1628", outline:"none" }}>
          <option value="">— Select —</option>
          {options.map((o: string) => <option key={o} value={o}>{o.charAt(0).toUpperCase() + o.slice(1)}</option>)}
        </select>
      ) : as === "textarea" ? (
        <textarea value={(form as any)[name]} onChange={set(name)} rows={3}
          style={{ padding:"9px 12px", borderRadius:9, border:"1.5px solid rgba(10,22,40,.12)", background:"#fff", fontFamily:"'DM Sans',sans-serif", fontSize:".85rem", color:"#0a1628", outline:"none", resize:"vertical" }} />
      ) : (
        <input type={type} value={(form as any)[name]} onChange={set(name)}
          style={{ padding:"9px 12px", borderRadius:9, border:"1.5px solid rgba(10,22,40,.12)", background:"#fff", fontFamily:"'DM Sans',sans-serif", fontSize:".85rem", color:"#0a1628", outline:"none" }} />
      )}
    </div>
  )

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(10,22,40,.6)", zIndex:500, display:"flex", alignItems:"center", justifyContent:"center", padding:20, backdropFilter:"blur(4px)" }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background:"#fff", borderRadius:20, width:"100%", maxWidth:600, maxHeight:"90vh", overflowY:"auto", boxShadow:"0 24px 64px rgba(10,22,40,.25)" }}>
        {/* Header */}
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"20px 24px", borderBottom:"1px solid rgba(10,22,40,.07)" }}>
          <h2 style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:"1.3rem", fontWeight:700, color:"#0a1628" }}>
            {mode === "create" ? "Register New Patient" : "Edit Patient"}
          </h2>
          <button onClick={onClose} style={{ background:"none", border:"none", cursor:"pointer", color:"#94a3b8", fontSize:"1.2rem", lineHeight:1 }}>✕</button>
        </div>

        <form onSubmit={handleSubmit} style={{ padding:"20px 24px", display:"flex", flexDirection:"column", gap:14 }}>
          {/* Basic info */}
          <div style={{ fontSize:".68rem", fontWeight:700, letterSpacing:".1em", textTransform:"uppercase", color:"#0d9488", marginBottom:4 }}>Basic Information</div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
            <Field label="Full Name"    name="name"     required />
            <Field label="Phone"        name="phone"    required />
            <Field label="Email"        name="email"    type="email" />
            <Field label="Date of Birth" name="dob"     type="date" />
            <Field label="Gender"       name="gender"   as="select" options={["male","female","other"]} />
            <Field label="Insurance"    name="insurance" />
          </div>
          <Field label="Address" name="address" as="textarea" />

          {/* Medical info — only for doctors */}
          {isDoctor && (
            <>
              <div style={{ height:1, background:"rgba(10,22,40,.07)", margin:"4px 0" }} />
              <div style={{ fontSize:".68rem", fontWeight:700, letterSpacing:".1em", textTransform:"uppercase", color:"#0d9488" }}>Medical Information <span style={{ fontSize:".6rem", background:"rgba(13,148,136,.1)", color:"#0d9488", padding:"1px 7px", borderRadius:50, marginLeft:4 }}>Doctor Only</span></div>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
                <Field label="Blood Group" name="bloodGroup" />
                <div />
              </div>
              <Field label="Medical History" name="medicalHistory" as="textarea" />
              <Field label="Allergies (comma separated)" name="allergiesRaw" />
              <Field label="Current Medications (comma separated)" name="medicationsRaw" />
              <Field label="Doctor's Notes" name="doctorNotes" as="textarea" />
            </>
          )}

          {error && (
            <div style={{ background:"rgba(220,38,38,.06)", border:"1px solid rgba(220,38,38,.2)", borderRadius:9, padding:"9px 13px", fontSize:".82rem", color:"#dc2626" }}>
              {error}
            </div>
          )}

          <div style={{ display:"flex", gap:10, justifyContent:"flex-end", marginTop:4 }}>
            <button type="button" onClick={onClose}
              style={{ padding:"9px 20px", borderRadius:50, border:"1.5px solid rgba(10,22,40,.12)", background:"none", cursor:"pointer", fontFamily:"'DM Sans',sans-serif", fontSize:".83rem", color:"#64748b" }}>
              Cancel
            </button>
            <button type="submit" disabled={saving}
              style={{ padding:"9px 24px", borderRadius:50, border:"none", background:"linear-gradient(135deg,#0d9488,#0a1628)", color:"#fff", cursor:saving?"not-allowed":"pointer", fontFamily:"'DM Sans',sans-serif", fontSize:".83rem", fontWeight:500, opacity:saving?.65:1, display:"flex", alignItems:"center", gap:7 }}>
              {saving && <span style={{ width:14, height:14, border:"2px solid rgba(255,255,255,.3)", borderTopColor:"#fff", borderRadius:"50%", animation:"spin .7s linear infinite", display:"inline-block" }} />}
              {saving ? "Saving…" : mode === "create" ? "Register Patient" : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function PatientsPage() {
  const { user, can, role } = useAuthStore()
  const isDoctor       = role() === "doctor"
  const canViewMedical = can("patients:read_medical")
  const canCreate      = can("patients:create")
  const canUpdate      = can("patients:update") || can("patients:update_basic" as any)
  const canDelete      = role() === "admin"

  // ── State ──────────────────────────────────────────────────────────────────
  const [patients,    setPatients]    = useState<Patient[]>([])
  const [total,       setTotal]       = useState(0)
  const [totalPages,  setTotalPages]  = useState(1)
  const [page,        setPage]        = useState(1)
  const [search,      setSearch]      = useState("")
  const [loading,     setLoading]     = useState(true)
  const [error,       setError]       = useState<string | null>(null)

  const [selected,    setSelected]    = useState<Patient | null>(null)
  const [medRecord,   setMedRecord]   = useState<MedicalRecord | null>(null)
  const [medLoading,  setMedLoading]  = useState(false)

  const [showCreate,  setShowCreate]  = useState(false)
  const [editTarget,  setEditTarget]  = useState<Patient | null>(null)
  const [deleting,    setDeleting]    = useState<string | null>(null)

  const searchTimeout = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const LIMIT = 20

  // ── Fetch patients ──────────────────────────────────────────────────────────
  const fetchPatients = useCallback(async (pg = 1, q = search) => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams({
        page:  String(pg),
        limit: String(LIMIT),
      })
      if (q.trim()) params.set("search", q.trim())

      const res = await API.get<PatientsResponse>(`/patients?${params}`)
      const data = res.data as unknown as PatientsResponse
      setPatients(data.patients)
      setTotal(data.total)
      setTotalPages(data.totalPages)
      setPage(pg)
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? err?.message ?? "Failed to load patients"
      setError(typeof msg === "string" ? msg : "Failed to load patients")
    } finally {
      setLoading(false)
    }
  }, [search])

  useEffect(() => { fetchPatients(1, "") }, [])

  // Debounced search
  const handleSearch = (q: string) => {
    setSearch(q)
    clearTimeout(searchTimeout.current)
    searchTimeout.current = setTimeout(() => fetchPatients(1, q), 400)
  }

  // ── Fetch medical record (doctor only, on patient select) ──────────────────
  const fetchMedical = useCallback(async (patientId: string) => {
    if (!canViewMedical) return
    setMedLoading(true)
    setMedRecord(null)
    try {
      const res = await API.get(`/patients/${patientId}/medical`)
      setMedRecord(res.data as unknown as MedicalRecord)
    } catch {
      setMedRecord(null) // non-critical — basic data is already shown
    } finally {
      setMedLoading(false)
    }
  }, [canViewMedical])

  const handleSelect = (p: Patient) => {
    setSelected(p)
    if (canViewMedical) fetchMedical(p.id)
  }

  // ── CRUD handlers ───────────────────────────────────────────────────────────
  const handleCreate = async (data: any) => {
    await API.post("/patients", data)
    setShowCreate(false)
    fetchPatients(1, search)
  }

  const handleUpdate = async (data: any) => {
    if (!editTarget) return
    await API.put(`/patients/${editTarget.id}`, data)
    setEditTarget(null)
    // Refresh detail + list
    fetchPatients(page, search)
    if (selected?.id === editTarget.id) {
      // Optimistically update selected
      setSelected(prev => prev ? { ...prev, ...data } : prev)
      if (canViewMedical) fetchMedical(editTarget.id)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this patient? This cannot be undone.")) return
    setDeleting(id)
    try {
      await API.delete(`/patients/${id}`)
      if (selected?.id === id) setSelected(null)
      fetchPatients(page, search)
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? "Delete failed"
      alert(Array.isArray(msg) ? msg[0] : msg)
    } finally {
      setDeleting(null)
    }
  }

  // Use medical record for detail if available, else fall back to basic
  const detailData: MedicalRecord | Patient | null = medRecord ?? selected

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@700&family=DM+Sans:wght@300;400;500;600&display=swap');
        @keyframes shimmer { to{background-position:-200% 0} }
        @keyframes spin    { to{transform:rotate(360deg)} }
        @keyframes fadeIn  { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }

        .pt-root   { font-family:'DM Sans',sans-serif; display:flex; flex-direction:column; gap:20px; }
        .pt-notice { padding:12px 18px; border-radius:12px; font-size:.8rem; font-weight:500; display:flex; align-items:center; gap:8px; }
        .pt-notice.doctor     { background:rgba(13,148,136,.08); color:#0d9488; border:1px solid rgba(13,148,136,.2); }
        .pt-notice.restricted { background:rgba(245,158,11,.08); color:#d97706; border:1px solid rgba(245,158,11,.2); }

        .pt-toolbar { display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:12px; }
        @media(max-width:640px) { .pt-toolbar{flex-direction:column;align-items:stretch;} .pt-toolbar>*{width:100%;} }
        .pt-search  { display:flex; align-items:center; gap:8px; padding:8px 14px; border-radius:50px; border:1.5px solid rgba(10,22,40,.1); background:#fff; transition:border-color .18s; flex:1; max-width:320px; }
        @media(max-width:640px) { .pt-search{max-width:100%;} }
        .pt-search:focus-within { border-color:#0d9488; }
        .pt-search input { border:none; outline:none; font-family:'DM Sans',sans-serif; font-size:.83rem; color:#0a1628; background:transparent; width:100%; }
        .pt-search input::placeholder { color:#94a3b8; }

        .pt-add { display:inline-flex; align-items:center; gap:6px; background:linear-gradient(135deg,#0d9488,#0a1628); color:#fff; border:none; cursor:pointer; font-family:'DM Sans',sans-serif; font-size:.83rem; font-weight:500; padding:9px 18px; border-radius:50px; box-shadow:0 3px 14px rgba(13,148,136,.28); transition:transform .18s; white-space:nowrap; }
        .pt-add:hover { transform:translateY(-1px); }

        .pt-meta { font-size:.78rem; color:#94a3b8; }

        .pt-layout { display:grid; grid-template-columns:1fr 380px; gap:20px; align-items:start; }
        @media(max-width:1100px) { .pt-layout { grid-template-columns:1fr; } }

        /* Patient cards */
        .pt-grid  { display:grid; grid-template-columns:repeat(auto-fill,minmax(250px,1fr)); gap:14px; }
        @media(max-width:640px) { .pt-grid{grid-template-columns:1fr;} }
        .pt-card  { background:#fff; border-radius:16px; border:1px solid rgba(10,22,40,.07); box-shadow:0 2px 12px rgba(10,22,40,.05); padding:18px; cursor:pointer; transition:transform .25s cubic-bezier(.34,1.56,.64,1),box-shadow .25s,border-color .2s; animation:fadeIn .3s ease both; }
        .pt-card:hover { transform:translateY(-4px); box-shadow:0 8px 30px rgba(10,22,40,.1); }
        .pt-card.selected { border-color:#0d9488; box-shadow:0 0 0 3px rgba(13,148,136,.1); }
        .pt-card-top { display:flex; align-items:center; gap:12px; margin-bottom:12px; }
        .pt-av  { width:40px; height:40px; border-radius:50%; background:linear-gradient(135deg,#0d9488,#0a1628); display:flex; align-items:center; justify-content:center; font-size:.75rem; font-weight:700; color:#fff; flex-shrink:0; }
        .pt-name { font-size:.9rem; font-weight:600; color:#0a1628; }
        .pt-pid  { font-size:.68rem; color:#94a3b8; }
        .pt-divider { height:1px; background:rgba(10,22,40,.06); margin:10px 0; }
        .pt-row  { display:flex; justify-content:space-between; margin-bottom:5px; }
        .pt-key  { font-size:.72rem; color:#94a3b8; }
        .pt-val  { font-size:.75rem; font-weight:500; color:#0a1628; }
        .pt-val.teal { color:#0d9488; font-weight:600; }
        .pt-medical-tag { font-size:.6rem; font-weight:700; letter-spacing:.08em; text-transform:uppercase; padding:2px 7px; border-radius:50px; margin-left:auto; flex-shrink:0; }
        .pt-medical-tag.unlocked { background:rgba(13,148,136,.1); color:#0d9488; }
        .pt-medical-tag.locked   { background:rgba(220,38,38,.08); color:#ef4444; }
        .pt-card-actions { display:flex; gap:6px; margin-top:10px; }
        .pt-card-btn { flex:1; padding:6px 0; border-radius:8px; border:1px solid rgba(10,22,40,.1); background:none; cursor:pointer; font-family:'DM Sans',sans-serif; font-size:.7rem; color:#64748b; transition:all .15s; }
        .pt-card-btn:hover { background:rgba(10,22,40,.04); color:#0a1628; }
        .pt-card-btn.danger { border-color:rgba(220,38,38,.2); color:#ef4444; }
        .pt-card-btn.danger:hover { background:rgba(220,38,38,.06); }
        .pt-card-btn:disabled { opacity:.5; cursor:not-allowed; }

        /* Detail panel */
        .pt-detail { background:#fff; border-radius:18px; border:1px solid rgba(10,22,40,.07); box-shadow:0 2px 16px rgba(10,22,40,.05); overflow:hidden; position:sticky; top:80px; }
        .pt-detail-head { padding:18px 20px; border-bottom:1px solid rgba(10,22,40,.06); display:flex; align-items:center; gap:12px; }
        .pt-detail-av { width:48px; height:48px; border-radius:50%; background:linear-gradient(135deg,#0d9488,#0a1628); display:flex; align-items:center; justify-content:center; font-size:.85rem; font-weight:700; color:#fff; flex-shrink:0; }
        .pt-detail-name { font-family:'Cormorant Garamond',serif; font-size:1.15rem; font-weight:700; color:#0a1628; }
        .pt-detail-sub  { font-size:.72rem; color:#94a3b8; }
        .pt-detail-body { padding:16px 20px; max-height:calc(100vh - 280px); overflow-y:auto; }
        @media(max-width:640px) { .pt-detail-body{max-height:none;} }
        .pt-section-title { font-size:.68rem; font-weight:700; letter-spacing:.12em; text-transform:uppercase; color:#94a3b8; margin-bottom:10px; display:flex; align-items:center; gap:6px; }
        .pt-info-grid { display:grid; grid-template-columns:1fr 1fr; gap:8px; margin-bottom:16px; }
        @media(max-width:480px) { .pt-info-grid{grid-template-columns:1fr;} }
        .pt-info-item { background:rgba(10,22,40,.02); border-radius:9px; padding:9px 12px; }
        .pt-info-key  { font-size:.65rem; color:#94a3b8; letter-spacing:.06em; text-transform:uppercase; }
        .pt-info-val  { font-size:.82rem; font-weight:500; color:#0a1628; margin-top:2px; }
        .pt-medical-section { border-radius:12px; padding:14px 16px; margin-bottom:14px; }
        .pt-medical-section.accessible { background:rgba(13,148,136,.05); border:1px solid rgba(13,148,136,.15); }
        .pt-medical-section.locked     { background:rgba(220,38,38,.04); border:1px solid rgba(220,38,38,.12); }
        .pt-locked-msg { display:flex; align-items:flex-start; gap:8px; font-size:.8rem; color:#ef4444; font-weight:500; }
        .pt-vital-row { display:flex; justify-content:space-between; align-items:center; padding:5px 0; border-bottom:1px solid rgba(10,22,40,.05); }
        .pt-vital-row:last-child { border-bottom:none; }
        .pt-vital-label { font-size:.75rem; color:#64748b; }
        .pt-vital-val   { font-size:.8rem; font-weight:500; color:#0a1628; }
        .pt-note-box { background:#fff; border-radius:8px; padding:10px 12px; font-size:.78rem; color:#475569; line-height:1.6; border:1px solid rgba(10,22,40,.07); }
        .pt-allergy-chip { display:inline-block; padding:2px 9px; border-radius:50px; font-size:.7rem; font-weight:600; background:rgba(239,68,68,.1); color:#ef4444; margin-right:5px; margin-bottom:4px; }
        .pt-actions { display:flex; gap:8px; margin-top:16px; flex-wrap:wrap; }
        .pt-action-btn { flex:1; min-width:100px; padding:9px; border-radius:10px; border:1px solid rgba(10,22,40,.1); background:none; cursor:pointer; font-family:'DM Sans',sans-serif; font-size:.76rem; font-weight:500; color:#64748b; transition:all .18s; }
        .pt-action-btn:hover { background:rgba(10,22,40,.04); color:#0a1628; }
        .pt-action-btn.primary { background:linear-gradient(135deg,#0d9488,#0a1628); color:#fff; border:none; }
        .pt-action-btn.primary:hover { opacity:.88; }
        .pt-placeholder { color:#94a3b8; font-size:.85rem; text-align:center; padding:48px 20px; }

        /* Pagination */
        .pt-pagination { display:flex; align-items:center; gap:6px; justify-content:center; margin-top:8px; flex-wrap:wrap; }
        .pt-page-btn { padding:6px 12px; border-radius:8px; border:1px solid rgba(10,22,40,.1); background:#fff; cursor:pointer; font-family:'DM Sans',sans-serif; font-size:.78rem; color:#64748b; transition:all .15s; }
        .pt-page-btn:hover:not(:disabled) { background:rgba(10,22,40,.04); color:#0a1628; }
        .pt-page-btn.active { background:#0a1628; color:#fff; border-color:#0a1628; }
        .pt-page-btn:disabled { opacity:.4; cursor:not-allowed; }

        /* Error */
        .pt-error { background:rgba(220,38,38,.06); border:1px solid rgba(220,38,38,.2); border-radius:12px; padding:14px 18px; font-size:.83rem; color:#dc2626; display:flex; align-items:center; gap:8px; }
        .pt-empty { text-align:center; color:#94a3b8; font-size:.85rem; padding:48px 20px; }
      `}</style>

      <div className="pt-root">

        {/* Access notice */}
        {isDoctor
          ? <div className="pt-notice doctor">🔓 <strong>Doctor View</strong> — Full medical records, prescriptions, and clinical history are visible to you.</div>
          : <div className="pt-notice restricted">🔒 <strong>Restricted View</strong> — Basic patient information only. Medical records are confidential and restricted to doctors.</div>
        }

        {/* Toolbar */}
        <div className="pt-toolbar">
          <div style={{ display:"flex", alignItems:"center", gap:12, flex:1 }}>
            <div className="pt-search">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
              <input
                placeholder="Search by name, phone or email…"
                value={search}
                onChange={e => handleSearch(e.target.value)}
              />
              {search && (
                <button onClick={() => handleSearch("")} style={{ background:"none", border:"none", cursor:"pointer", color:"#94a3b8", fontSize:"1rem", lineHeight:1, padding:0 }}>✕</button>
              )}
            </div>
            {!loading && (
              <span className="pt-meta">{total.toLocaleString("en-IN")} patient{total !== 1 ? "s" : ""}</span>
            )}
          </div>
          <PermissionGate permission="patients:create">
            <button className="pt-add" onClick={() => setShowCreate(true)}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              Register Patient
            </button>
          </PermissionGate>
        </div>

        {/* Error */}
        {error && (
          <div className="pt-error">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
            {error}
            <button onClick={() => fetchPatients(page, search)} style={{ marginLeft:"auto", background:"rgba(220,38,38,.1)", border:"none", color:"#dc2626", padding:"4px 12px", borderRadius:8, cursor:"pointer", fontSize:".78rem", fontWeight:500 }}>Retry</button>
          </div>
        )}

        <div className="pt-layout">
          {/* Patient grid */}
          <div>
            {loading ? (
              <div className="pt-grid">
                {[1,2,3,4,5,6].map(n => (
                  <div key={n} style={{ background:"#fff", borderRadius:16, padding:18, border:"1px solid rgba(10,22,40,.07)", display:"flex", flexDirection:"column", gap:10 }}>
                    <div style={{ display:"flex", alignItems:"center", gap:12 }}>
                      <Skel w="40px" h="40px" r="50%" />
                      <div style={{ flex:1, display:"flex", flexDirection:"column", gap:6 }}><Skel h="14px" w="60%" /><Skel h="11px" w="40%" /></div>
                    </div>
                    <Skel h="1px" />
                    <Skel h="12px" w="80%" /><Skel h="12px" w="60%" /><Skel h="12px" w="70%" />
                  </div>
                ))}
              </div>
            ) : !patients.length ? (
              <div className="pt-empty">
                {search ? `No patients found for "${search}"` : "No patients registered yet"}
              </div>
            ) : (
              <>
                <div className="pt-grid">
                  {patients.map((p, i) => (
                    <div
                      key={p.id}
                      className={`pt-card${selected?.id === p.id ? " selected" : ""}`}
                      style={{ animationDelay: `${i * 40}ms` }}
                      onClick={() => handleSelect(p)}
                    >
                      <div className="pt-card-top">
                        <div className="pt-av">{getInitials(p.name)}</div>
                        <div style={{ minWidth:0 }}>
                          <div className="pt-name">{p.name}</div>
                          <div className="pt-pid">{p.phone}</div>
                        </div>
                        <span className={`pt-medical-tag ${canViewMedical ? "unlocked" : "locked"}`}>
                          {canViewMedical ? "🔓 Medical" : "🔒 Basic"}
                        </span>
                      </div>
                      <div className="pt-divider" />
                      <div className="pt-row"><span className="pt-key">Age</span><span className="pt-val">{formatAge(p.dob)}</span></div>
                      <div className="pt-row"><span className="pt-key">Visits</span><span className="pt-val teal">{p.totalVisits}</span></div>
                      <div className="pt-row"><span className="pt-key">Last Visit</span><span className="pt-val">{formatDate(p.lastVisit)}</span></div>

                      {/* Card actions */}
                      <div className="pt-card-actions" onClick={e => e.stopPropagation()}>
                        {canUpdate && (
                          <button className="pt-card-btn" onClick={() => setEditTarget(p)}>Edit</button>
                        )}
                        {canDelete && (
                          <button
                            className="pt-card-btn danger"
                            disabled={deleting === p.id}
                            onClick={() => handleDelete(p.id)}
                          >
                            {deleting === p.id ? "…" : "Delete"}
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="pt-pagination" style={{ marginTop:16 }}>
                    <button className="pt-page-btn" disabled={page <= 1} onClick={() => fetchPatients(page - 1, search)}>‹ Prev</button>
                    {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                      const pg = totalPages <= 7 ? i + 1 : page <= 4 ? i + 1 : page >= totalPages - 3 ? totalPages - 6 + i : page - 3 + i
                      return (
                        <button key={pg} className={`pt-page-btn${page === pg ? " active" : ""}`} onClick={() => fetchPatients(pg, search)}>
                          {pg}
                        </button>
                      )
                    })}
                    <button className="pt-page-btn" disabled={page >= totalPages} onClick={() => fetchPatients(page + 1, search)}>Next ›</button>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Detail panel */}
          <div className="pt-detail">
            {!selected ? (
              <div className="pt-placeholder">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#cbd5e1" strokeWidth="1.5" style={{ marginBottom:10 }}><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                <div>Select a patient to view details</div>
              </div>
            ) : (
              <>
                <div className="pt-detail-head">
                  <div className="pt-detail-av">{getInitials(selected.name)}</div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div className="pt-detail-name">{selected.name}</div>
                    <div className="pt-detail-sub">{selected.gender ?? "—"} · {formatAge(selected.dob)}</div>
                  </div>
                  {medLoading && (
                    <div style={{ width:16, height:16, border:"2px solid rgba(13,148,136,.2)", borderTopColor:"#0d9488", borderRadius:"50%", animation:"spin .7s linear infinite" }} />
                  )}
                </div>

                <div className="pt-detail-body">
                  {/* Basic info */}
                  <div className="pt-section-title">ℹ️ Basic Information</div>
                  <div className="pt-info-grid">
                    {[
                      { k:"Phone",       v: selected.phone },
                      { k:"Email",       v: selected.email || "—" },
                      { k:"Date of Birth", v: selected.dob ? new Date(selected.dob).toLocaleDateString("en-IN") : "—" },
                      { k:"Gender",      v: selected.gender ? selected.gender.charAt(0).toUpperCase() + selected.gender.slice(1) : "—" },
                      { k:"Total Visits", v: String(selected.totalVisits) },
                      { k:"Last Visit",  v: formatDate(selected.lastVisit) },
                    ].map(i => (
                      <div key={i.k} className="pt-info-item">
                        <div className="pt-info-key">{i.k}</div>
                        <div className="pt-info-val">{i.v}</div>
                      </div>
                    ))}
                  </div>

                  {selected.address && (
                    <>
                      <div className="pt-section-title">📍 Address</div>
                      <div style={{ fontSize:".82rem", color:"#475569", marginBottom:14, padding:"9px 12px", background:"rgba(10,22,40,.02)", borderRadius:9 }}>{selected.address}</div>
                    </>
                  )}

                  {/* Medical section */}
                  <div className="pt-section-title">
                    🏥 Medical Information
                    {canViewMedical
                      ? <span style={{ fontSize:".6rem", background:"rgba(13,148,136,.1)", color:"#0d9488", padding:"1px 7px", borderRadius:50, marginLeft:4 }}>Confidential</span>
                      : <span style={{ fontSize:".6rem", background:"rgba(220,38,38,.08)", color:"#ef4444", padding:"1px 7px", borderRadius:50, marginLeft:4 }}>🔒 Restricted</span>
                    }
                  </div>

                  {canViewMedical ? (
                    medLoading ? (
                      <div style={{ display:"flex", flexDirection:"column", gap:8, padding:"12px 0" }}>
                        <Skel h="14px" w="70%" /><Skel h="12px" w="90%" /><Skel h="12px" w="80%" />
                      </div>
                    ) : (
                      <div className="pt-medical-section accessible">
                        {detailData?.bloodGroup && (
                          <div className="pt-row" style={{ marginBottom:8 }}>
                            <span className="pt-key">Blood Group</span>
                            <span className="pt-val" style={{ fontWeight:700, color:"#ef4444" }}>{detailData.bloodGroup}</span>
                          </div>
                        )}

                        {(detailData as MedicalRecord)?.allergies && (detailData as MedicalRecord).allergies!.length > 0 && (
                          <div style={{ marginBottom:10 }}>
                            <div style={{ fontSize:".65rem", fontWeight:700, letterSpacing:".1em", textTransform:"uppercase", color:"#94a3b8", marginBottom:5 }}>Allergies ⚠️</div>
                            {(detailData as MedicalRecord).allergies!.map(a => (
                              <span key={a} className="pt-allergy-chip">{a}</span>
                            ))}
                          </div>
                        )}

                        {detailData?.medicalHistory && (
                          <div style={{ marginBottom:10 }}>
                            <div style={{ fontSize:".65rem", fontWeight:700, letterSpacing:".1em", textTransform:"uppercase", color:"#94a3b8", marginBottom:5 }}>Medical History</div>
                            <div className="pt-note-box">{detailData.medicalHistory}</div>
                          </div>
                        )}

                        {detailData?.doctorNotes && (
                          <div>
                            <div style={{ fontSize:".65rem", fontWeight:700, letterSpacing:".1em", textTransform:"uppercase", color:"#94a3b8", marginBottom:5 }}>Doctor's Notes</div>
                            <div className="pt-note-box">{detailData.doctorNotes}</div>
                          </div>
                        )}

                        {/* Recent prescriptions */}
                        {(detailData as MedicalRecord)?.prescriptions?.length ? (
                          <div style={{ marginTop:10 }}>
                            <div style={{ fontSize:".65rem", fontWeight:700, letterSpacing:".1em", textTransform:"uppercase", color:"#94a3b8", marginBottom:6 }}>Recent Prescriptions</div>
                            {(detailData as MedicalRecord).prescriptions!.slice(0, 3).map((rx: any) => (
                              <div key={rx.id} style={{ background:"#fff", borderRadius:8, padding:"8px 10px", border:"1px solid rgba(10,22,40,.07)", marginBottom:5, fontSize:".78rem", color:"#475569" }}>
                                <strong style={{ color:"#0a1628" }}>{rx.diagnosis}</strong>
                                <span style={{ marginLeft:8, fontSize:".7rem", color:"#94a3b8" }}>{new Date(rx.createdAt).toLocaleDateString("en-IN")}</span>
                              </div>
                            ))}
                          </div>
                        ) : null}

                        {!detailData?.bloodGroup && !(detailData as MedicalRecord)?.allergies?.length && !detailData?.medicalHistory && (
                          <div style={{ fontSize:".8rem", color:"#94a3b8", textAlign:"center", padding:"12px 0" }}>
                            No medical records on file yet
                          </div>
                        )}
                      </div>
                    )
                  ) : (
                    <div className="pt-medical-section locked">
                      <div className="pt-locked-msg">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" style={{ flexShrink:0, marginTop:1 }}><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>
                        <div>
                          <strong>Medical records are confidential</strong><br/>
                          <span style={{ fontSize:".74rem", fontWeight:400 }}>Prescriptions, diagnosis, vitals, and clinical notes are only accessible to the treating doctor.</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Action buttons */}
                  <div className="pt-actions">
                    <PermissionGate permission="appointments:create">
                      <button className="pt-action-btn primary"
                        onClick={() => window.location.href = `/dashboard/appointments?patientId=${selected.id}`}>
                        Book Appointment
                      </button>
                    </PermissionGate>
                    {canUpdate && (
                      <button className="pt-action-btn" onClick={() => setEditTarget(selected)}>
                        Edit Details
                      </button>
                    )}
                    <PermissionGate permission="prescriptions:read">
                      <button className="pt-action-btn"
                        onClick={() => window.location.href = `/dashboard/prescriptions?patientId=${selected.id}`}>
                        Prescriptions
                      </button>
                    </PermissionGate>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Create modal */}
      {showCreate && (
        <PatientModal
          mode="create"
          isDoctor={isDoctor}
          onClose={() => setShowCreate(false)}
          onSave={handleCreate}
        />
      )}

      {/* Edit modal */}
      {editTarget && (
        <PatientModal
          mode="edit"
          initial={editTarget}
          isDoctor={isDoctor}
          onClose={() => setEditTarget(null)}
          onSave={handleUpdate}
        />
      )}
    </>
  )
}