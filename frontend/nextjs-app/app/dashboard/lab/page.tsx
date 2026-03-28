"use client"

// app/(dashboard)/dashboard/lab/page.tsx
// STRICTLY DOCTOR ONLY.
//
// API endpoints:
//   GET    /api/lab/summary                  → stats panel
//   GET    /api/lab?search=&status=&page=    → paginated list
//   GET    /api/lab/:id                      → single request detail
//   POST   /api/lab                          → request new test
//   PUT    /api/lab/:id                      → enter result / update status
//   DELETE /api/lab/:id                      → delete pending request

import { useState, useEffect, useCallback, useRef } from "react"
import { useAuthStore } from "@/store/authStore"
import API from "@/lib/api"

// ── Types ─────────────────────────────────────────────────────────────────────
type LabStatus = "pending" | "in_progress" | "completed"

interface LabRequest {
  id:          string
  clinicId:    string
  patientId:   string
  doctorId:    string
  testName:    string
  result?:     string
  normalRange?: string
  status:      LabStatus
  doctorNotes?: string
  date:        string
  patient:     { id: string; name: string; phone?: string; dob?: string }
  doctor:      { id: string; name: string }
}

interface LabSummary {
  total: number; pending: number; inProgress: number; completed: number
}

interface LabResponse {
  labRequests:  LabRequest[]
  total:        number
  page:         number
  totalPages:   number
  statusCounts: Record<string, number>
}

interface Patient { id: string; name: string; phone?: string }

// ── Constants ─────────────────────────────────────────────────────────────────
const COMMON_TESTS = [
  "Complete Blood Count (CBC)",
  "Blood Glucose (Fasting)",
  "OPG X-ray",
  "Periapical X-ray",
  "CBCT Scan",
  "RVG X-ray",
  "Bite Wing X-ray",
  "Panoramic X-ray",
  "Liver Function Test",
  "Kidney Function Test",
  "INR / Coagulation",
  "HIV Test",
  "HbA1c",
  "Vitamin D",
  "Calcium Level",
]

const TEST_TYPES = ["Blood", "Imaging", "Biopsy", "Urine", "Culture", "Other"]

const STATUS_CONFIG: Record<LabStatus, { bg: string; color: string; label: string; icon: string }> = {
  pending:     { bg: "rgba(245,158,11,.1)",  color: "#d97706", label: "Pending",     icon: "⏳" },
  in_progress: { bg: "rgba(37,99,235,.1)",   color: "#2563eb", label: "In Progress", icon: "🔬" },
  completed:   { bg: "rgba(22,163,74,.1)",   color: "#16a34a", label: "Completed",   icon: "✅" },
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function getInitials(name: string) {
  return name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()
}
function formatDate(d: string) {
  return new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
}
function calcAge(dob?: string) {
  if (!dob) return null
  return `${Math.floor((Date.now() - new Date(dob).getTime()) / (365.25 * 24 * 60 * 60 * 1000))} yrs`
}
function Skel({ w = "100%", h = "14px", r = "6px" }: { w?: string; h?: string; r?: string }) {
  return <div style={{ width: w, height: h, borderRadius: r, background: "linear-gradient(90deg,#f1f5f9 25%,#e2e8f0 50%,#f1f5f9 75%)", backgroundSize: "200% 100%", animation: "shimmer 1.4s infinite" }} />
}

// ── Access Denied ─────────────────────────────────────────────────────────────
function AccessDenied() {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: 400, gap: 16, textAlign: "center" }}>
      <div style={{ fontSize: "3rem" }}>🔒</div>
      <h2 style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: "1.5rem", fontWeight: 700, color: "#0a1628" }}>Access Restricted</h2>
      <p style={{ fontSize: ".9rem", color: "#64748b", maxWidth: 360 }}>Lab reports are confidential medical data accessible to treating doctors only.</p>
      <div style={{ padding: "10px 20px", borderRadius: 12, background: "rgba(220,38,38,.06)", border: "1px solid rgba(220,38,38,.2)", fontSize: ".8rem", color: "#dc2626", fontWeight: 500 }}>🚫 Doctor access required</div>
    </div>
  )
}

// ── Request Lab Test Modal ────────────────────────────────────────────────────
function RequestModal({ onClose, onSave }: { onClose: () => void; onSave: (d: any) => Promise<void> }) {
  const [patients,   setPatients]   = useState<Patient[]>([])
  const [pLoading,   setPLoading]   = useState(true)
  const [form, setForm] = useState({ patientId: "", testName: "", testType: "", normalRange: "", doctorNotes: "" })
  const [saving, setSaving] = useState(false)
  const [error,  setError]  = useState("")

  useEffect(() => {
    API.get("/patients?limit=100").then(r => {
      const d = r.data as any
      const list = Array.isArray(d) ? d : (d?.patients ?? [])
      setPatients(list)
      if (list.length) setForm(f => ({ ...f, patientId: list[0].id }))
    }).catch(() => {}).finally(() => setPLoading(false))
  }, [])

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.patientId) return setError("Please select a patient")
    if (!form.testName.trim()) return setError("Test name is required")
    setError("")
    setSaving(true)
    try {
      await onSave({
        patientId:   form.patientId,
        testName:    form.testName.trim(),
        testType:    form.testType    || undefined,
        normalRange: form.normalRange || undefined,
        doctorNotes: form.doctorNotes || undefined,
      })
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? err?.message ?? "Failed to create request"
      setError(Array.isArray(msg) ? msg[0] : msg)
    } finally {
      setSaving(false)
    }
  }

  const inputSt: React.CSSProperties = { width: "100%", padding: "9px 12px", borderRadius: 9, border: "1.5px solid rgba(10,22,40,.12)", background: "#fff", fontFamily: "'DM Sans',sans-serif", fontSize: ".85rem", color: "#0a1628", outline: "none" }
  const labelSt: React.CSSProperties = { fontSize: ".66rem", fontWeight: 600, letterSpacing: ".1em", textTransform: "uppercase", color: "#94a3b8", display: "block", marginBottom: 4 }

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(10,22,40,.6)", zIndex: 500, display: "flex", alignItems: "center", justifyContent: "center", padding: 20, backdropFilter: "blur(4px)" }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: "#fff", borderRadius: 20, width: "100%", maxWidth: 560, maxHeight: "90vh", overflowY: "auto", boxShadow: "0 24px 64px rgba(10,22,40,.25)" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "18px 22px", borderBottom: "1px solid rgba(10,22,40,.07)" }}>
          <h2 style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: "1.2rem", fontWeight: 700, color: "#0a1628" }}>Request Lab Test</h2>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "#94a3b8", fontSize: "1.2rem" }}>✕</button>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: "18px 22px", display: "flex", flexDirection: "column", gap: 14 }}>
          {/* Patient */}
          <div>
            <label style={labelSt}>Patient *</label>
            {pLoading ? <Skel h="38px" r="9px" /> : (
              patients.length ? (
                <select value={form.patientId} onChange={set("patientId")} style={inputSt}>
                  <option value="">— Select Patient —</option>
                  {patients.map(p => <option key={p.id} value={p.id}>{p.name}{p.phone ? ` · ${p.phone}` : ""}</option>)}
                </select>
              ) : (
                <input placeholder="Patient ID" value={form.patientId} onChange={set("patientId")} style={inputSt} />
              )
            )}
          </div>

          {/* Test name */}
          <div>
            <label style={labelSt}>Test Name *</label>
            <input list="lab-tests" placeholder="e.g. Complete Blood Count" value={form.testName} onChange={set("testName")} style={inputSt} />
            <datalist id="lab-tests">
              {COMMON_TESTS.map(t => <option key={t} value={t} />)}
            </datalist>
          </div>

          {/* Quick select common tests */}
          <div>
            <label style={labelSt}>Common Tests</label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {COMMON_TESTS.slice(0, 8).map(t => (
                <button key={t} type="button"
                  onClick={() => setForm(f => ({ ...f, testName: t }))}
                  style={{
                    padding: "3px 10px", borderRadius: 50, border: "1px solid rgba(10,22,40,.1)",
                    background: form.testName === t ? "#0d9488" : "#fff",
                    color: form.testName === t ? "#fff" : "#64748b",
                    cursor: "pointer", fontFamily: "'DM Sans',sans-serif", fontSize: ".73rem",
                    transition: "all .15s",
                  }}>
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* Type + Normal range */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label style={labelSt}>Test Type</label>
              <select value={form.testType} onChange={set("testType")} style={inputSt}>
                <option value="">— Select —</option>
                {TEST_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label style={labelSt}>Normal Range</label>
              <input placeholder="e.g. 4.5-11.0 × 10³/µL" value={form.normalRange} onChange={set("normalRange")} style={inputSt} />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label style={labelSt}>Instructions to Lab</label>
            <textarea value={form.doctorNotes} onChange={set("doctorNotes")} rows={2}
              placeholder="Special instructions or urgency notes…"
              style={{ ...inputSt, resize: "vertical" } as any} />
          </div>

          {error && <div style={{ background: "rgba(220,38,38,.06)", border: "1px solid rgba(220,38,38,.2)", borderRadius: 9, padding: "9px 13px", fontSize: ".82rem", color: "#dc2626" }}>{error}</div>}

          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
            <button type="button" onClick={onClose}
              style={{ padding: "9px 20px", borderRadius: 50, border: "1.5px solid rgba(10,22,40,.12)", background: "none", cursor: "pointer", fontFamily: "'DM Sans',sans-serif", fontSize: ".83rem", color: "#64748b" }}>
              Cancel
            </button>
            <button type="submit" disabled={saving}
              style={{ padding: "9px 24px", borderRadius: 50, border: "none", background: "linear-gradient(135deg,#0d9488,#0a1628)", color: "#fff", cursor: saving ? "not-allowed" : "pointer", fontFamily: "'DM Sans',sans-serif", fontSize: ".83rem", fontWeight: 500, opacity: saving ? .65 : 1, display: "flex", alignItems: "center", gap: 7 }}>
              {saving && <span style={{ width: 14, height: 14, border: "2px solid rgba(255,255,255,.3)", borderTopColor: "#fff", borderRadius: "50%", animation: "spin .7s linear infinite", display: "inline-block" }} />}
              {saving ? "Requesting…" : "Request Test"}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Enter Result Modal ────────────────────────────────────────────────────────
function ResultModal({ lab, onClose, onSave }: { lab: LabRequest; onClose: () => void; onSave: (d: any) => Promise<void> }) {
  const [form, setForm]   = useState({ result: lab.result ?? "", normalRange: lab.normalRange ?? "", notes: lab.doctorNotes ?? "", status: lab.status })
  const [saving, setSaving] = useState(false)
  const [error,  setError]  = useState("")

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setSaving(true)
    try {
      await onSave({
        result:      form.result      || undefined,
        normalRange: form.normalRange || undefined,
        notes:       form.notes       || undefined,
        status:      form.status,
      })
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? err?.message ?? "Failed to save"
      setError(Array.isArray(msg) ? msg[0] : msg)
    } finally {
      setSaving(false)
    }
  }

  const inputSt: React.CSSProperties = { width: "100%", padding: "9px 12px", borderRadius: 9, border: "1.5px solid rgba(10,22,40,.12)", background: "#fff", fontFamily: "'DM Sans',sans-serif", fontSize: ".85rem", color: "#0a1628", outline: "none" }
  const labelSt: React.CSSProperties = { fontSize: ".66rem", fontWeight: 600, letterSpacing: ".1em", textTransform: "uppercase", color: "#94a3b8", display: "block", marginBottom: 4 }

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(10,22,40,.6)", zIndex: 500, display: "flex", alignItems: "center", justifyContent: "center", padding: 20, backdropFilter: "blur(4px)" }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: "#fff", borderRadius: 20, width: "100%", maxWidth: 500, boxShadow: "0 24px 64px rgba(10,22,40,.25)" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "18px 22px", borderBottom: "1px solid rgba(10,22,40,.07)" }}>
          <div>
            <h2 style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: "1.2rem", fontWeight: 700, color: "#0a1628" }}>{lab.testName}</h2>
            <div style={{ fontSize: ".73rem", color: "#94a3b8" }}>{lab.patient.name}</div>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "#94a3b8", fontSize: "1.2rem" }}>✕</button>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: "18px 22px", display: "flex", flexDirection: "column", gap: 14 }}>
          <div>
            <label style={labelSt}>Status</label>
            <select value={form.status} onChange={set("status")} style={inputSt}>
              <option value="pending">⏳ Pending</option>
              <option value="in_progress">🔬 In Progress</option>
              <option value="completed">✅ Completed</option>
            </select>
          </div>

          <div>
            <label style={labelSt}>Result</label>
            <textarea value={form.result} onChange={set("result")} rows={4}
              placeholder="Enter lab result values here…"
              style={{ ...inputSt, resize: "vertical" } as any} />
          </div>

          <div>
            <label style={labelSt}>Normal Range</label>
            <input value={form.normalRange} onChange={set("normalRange")}
              placeholder="e.g. 4.5–11.0 × 10³/µL" style={inputSt} />
          </div>

          <div>
            <label style={labelSt}>Doctor's Notes</label>
            <textarea value={form.notes} onChange={set("notes")} rows={2}
              placeholder="Interpretation or follow-up notes…"
              style={{ ...inputSt, resize: "vertical" } as any} />
          </div>

          {error && <div style={{ background: "rgba(220,38,38,.06)", border: "1px solid rgba(220,38,38,.2)", borderRadius: 9, padding: "9px 13px", fontSize: ".82rem", color: "#dc2626" }}>{error}</div>}

          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
            <button type="button" onClick={onClose}
              style={{ padding: "9px 20px", borderRadius: 50, border: "1.5px solid rgba(10,22,40,.12)", background: "none", cursor: "pointer", fontFamily: "'DM Sans',sans-serif", fontSize: ".83rem", color: "#64748b" }}>
              Cancel
            </button>
            <button type="submit" disabled={saving}
              style={{ padding: "9px 24px", borderRadius: 50, border: "none", background: "linear-gradient(135deg,#16a34a,#0a1628)", color: "#fff", cursor: saving ? "not-allowed" : "pointer", fontFamily: "'DM Sans',sans-serif", fontSize: ".83rem", fontWeight: 500, opacity: saving ? .65 : 1, display: "flex", alignItems: "center", gap: 7 }}>
              {saving && <span style={{ width: 14, height: 14, border: "2px solid rgba(255,255,255,.3)", borderTopColor: "#fff", borderRadius: "50%", animation: "spin .7s linear infinite", display: "inline-block" }} />}
              {saving ? "Saving…" : "Save Results"}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function LabPage() {
  const { role } = useAuthStore()

  // ── RBAC guard ─────────────────────────────────────────────────────────────
  if (role() !== "doctor") return <AccessDenied />

  // ── State ──────────────────────────────────────────────────────────────────
  const [labRequests,  setLabRequests]  = useState<LabRequest[]>([])
  const [statusCounts, setStatusCounts] = useState<Record<string, number>>({})
  const [summary,      setSummary]      = useState<LabSummary | null>(null)
  const [total,        setTotal]        = useState(0)
  const [totalPages,   setTotalPages]   = useState(1)
  const [page,         setPage]         = useState(1)

  const [search,       setSearch]       = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [loading,      setLoading]      = useState(true)
  const [error,        setError]        = useState<string | null>(null)

  const [selected,     setSelected]     = useState<LabRequest | null>(null)
  const [showRequest,  setShowRequest]  = useState(false)
  const [resultTarget, setResultTarget] = useState<LabRequest | null>(null)
  const [deleting,     setDeleting]     = useState<string | null>(null)

  const searchRef = useRef<NodeJS.Timeout>()
  const LIMIT = 20

  // ── Fetch lab requests ─────────────────────────────────────────────────────
  const fetchLab = useCallback(async (pg = 1, q = search, sf = statusFilter) => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams({ page: String(pg), limit: String(LIMIT) })
      if (q.trim()) params.set("search", q.trim())
      if (sf !== "all") params.set("status", sf)

      const res  = await API.get(`/lab?${params}`)
      const data = res.data as unknown as LabResponse
      setLabRequests(data.labRequests)
      setTotal(data.total)
      setTotalPages(data.totalPages)
      setStatusCounts(data.statusCounts ?? {})
      setPage(pg)
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? err?.message ?? "Failed to load lab requests"
      setError(typeof msg === "string" ? msg : "Failed to load lab requests")
    } finally {
      setLoading(false)
    }
  }, [search, statusFilter])

  // ── Fetch summary stats ────────────────────────────────────────────────────
  const fetchSummary = useCallback(async () => {
    try {
      const res = await API.get("/lab/summary")
      setSummary(res.data as unknown as LabSummary)
    } catch { setSummary(null) }
  }, [])

  useEffect(() => { fetchLab(1, "", "all"); fetchSummary() }, [])

  const handleSearch = (q: string) => {
    setSearch(q)
    clearTimeout(searchRef.current)
    searchRef.current = setTimeout(() => fetchLab(1, q, statusFilter), 400)
  }

  const handleStatusFilter = (s: string) => {
    setStatusFilter(s)
    fetchLab(1, search, s)
  }

  // ── CRUD handlers ──────────────────────────────────────────────────────────
  const handleCreate = async (data: any) => {
    await API.post("/lab", data)
    setShowRequest(false)
    fetchLab(1, search, statusFilter)
    fetchSummary()
  }

  const handleUpdate = async (data: any) => {
    if (!resultTarget) return
    await API.put(`/lab/${resultTarget.id}`, data)
    setResultTarget(null)
    if (selected?.id === resultTarget.id) {
      const res = await API.get(`/lab/${resultTarget.id}`)
      setSelected(res.data as unknown as LabRequest)
    }
    fetchLab(page, search, statusFilter)
    fetchSummary()
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this lab request? This cannot be undone.")) return
    setDeleting(id)
    try {
      await API.delete(`/lab/${id}`)
      if (selected?.id === id) setSelected(null)
      fetchLab(page, search, statusFilter)
      fetchSummary()
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? "Delete failed"
      alert(Array.isArray(msg) ? msg[0] : msg)
    } finally {
      setDeleting(null) }
  }

  const allStatuses = ["all", "pending", "in_progress", "completed"]

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@700&family=DM+Sans:wght@300;400;500;600&display=swap');
        @keyframes shimmer { to{background-position:-200% 0} }
        @keyframes spin    { to{transform:rotate(360deg)} }
        @keyframes fadeIn  { from{opacity:0;transform:translateY(6px)} to{opacity:1;transform:translateY(0)} }

        .lb-root   { font-family:'DM Sans',sans-serif; display:flex; flex-direction:column; gap:20px; }

        /* Stats */
        .lb-stats  { display:grid; grid-template-columns:repeat(4,1fr); gap:14px; }
        @media(max-width:700px) { .lb-stats { grid-template-columns:repeat(2,1fr); } }
        .lb-stat   { background:#fff; border-radius:16px; border:1px solid rgba(10,22,40,.07); padding:16px 18px; box-shadow:0 2px 10px rgba(10,22,40,.05); display:flex; align-items:center; gap:12px; }
        .lb-stat-icon { width:42px; height:42px; border-radius:12px; display:flex; align-items:center; justify-content:center; font-size:1.1rem; flex-shrink:0; }
        .lb-stat-num { font-family:'Cormorant Garamond',serif; font-size:1.8rem; font-weight:700; line-height:1; }
        .lb-stat-lbl { font-size:.72rem; color:#64748b; margin-top:2px; }

        /* Toolbar */
        .lb-toolbar { display:flex; align-items:center; gap:10px; flex-wrap:wrap; }
        .lb-filters { display:flex; gap:6px; flex-wrap:wrap; }
        .lb-fbtn    { padding:6px 13px; border-radius:50px; border:1.5px solid rgba(10,22,40,.1); background:none; cursor:pointer; font-family:'DM Sans',sans-serif; font-size:.76rem; font-weight:500; color:#64748b; transition:all .18s; display:flex; align-items:center; gap:5px; }
        .lb-fbtn.active    { background:#0a1628; color:#fff; border-color:#0a1628; }
        .lb-fbtn:hover:not(.active) { border-color:#0a1628; color:#0a1628; }
        .lb-fbtn-cnt { font-size:.62rem; font-weight:700; padding:1px 5px; border-radius:50px; background:rgba(10,22,40,.08); }
        .lb-fbtn.active .lb-fbtn-cnt { background:rgba(255,255,255,.2); }
        .lb-search  { display:flex; align-items:center; gap:7px; padding:7px 13px; border-radius:50px; border:1.5px solid rgba(10,22,40,.1); background:#fff; transition:border-color .18s; }
        .lb-search:focus-within { border-color:#0d9488; }
        .lb-search input { border:none; outline:none; font-family:'DM Sans',sans-serif; font-size:.8rem; color:#0a1628; background:transparent; width:180px; }
        .lb-search input::placeholder { color:#94a3b8; }
        .lb-new-btn { margin-left:auto; display:inline-flex; align-items:center; gap:6px; padding:9px 18px; border-radius:50px; border:none; cursor:pointer; background:linear-gradient(135deg,#0d9488,#0a1628); color:#fff; font-family:'DM Sans',sans-serif; font-size:.83rem; font-weight:500; box-shadow:0 3px 12px rgba(13,148,136,.28); transition:transform .18s; white-space:nowrap; }
        .lb-new-btn:hover { transform:translateY(-1px); }

        /* Layout */
        .lb-layout  { display:grid; grid-template-columns:1fr 380px; gap:20px; align-items:start; }
        @media(max-width:1100px) { .lb-layout { grid-template-columns:1fr; } }

        /* List */
        .lb-card   { background:#fff; border-radius:18px; border:1px solid rgba(10,22,40,.07); box-shadow:0 2px 16px rgba(10,22,40,.05); overflow:hidden; }
        .lb-list   { display:flex; flex-direction:column; }
        .lb-item   { display:flex; align-items:center; gap:12px; padding:14px 18px; border-bottom:1px solid rgba(10,22,40,.04); cursor:pointer; transition:background .15s; animation:fadeIn .25s ease both; }
        .lb-item:last-child { border-bottom:none; }
        .lb-item:hover  { background:rgba(10,22,40,.02); }
        .lb-item.sel    { background:rgba(13,148,136,.05); border-left:3px solid #0d9488; }
        .lb-av     { width:40px; height:40px; border-radius:50%; background:linear-gradient(135deg,#0d9488,#0a1628); display:flex; align-items:center; justify-content:center; font-size:.72rem; font-weight:700; color:#fff; flex-shrink:0; }
        .lb-name   { font-size:.86rem; font-weight:500; color:#0a1628; }
        .lb-test   { font-size:.74rem; color:#0d9488; font-weight:500; }
        .lb-meta   { font-size:.72rem; color:#94a3b8; }
        .lb-badge  { font-size:.63rem; font-weight:700; letter-spacing:.06em; text-transform:uppercase; padding:3px 9px; border-radius:50px; white-space:nowrap; }
        .lb-actions { display:flex; gap:5px; flex-shrink:0; }
        .lb-actbtn  { padding:5px 10px; border-radius:7px; border:1px solid rgba(10,22,40,.1); background:none; cursor:pointer; font-size:.7rem; color:#64748b; font-family:'DM Sans',sans-serif; transition:all .15s; white-space:nowrap; }
        .lb-actbtn:hover { background:rgba(10,22,40,.05); color:#0a1628; }
        .lb-actbtn.primary { background:linear-gradient(135deg,#0d9488,#0a1628); color:#fff; border:none; }
        .lb-actbtn.primary:hover { opacity:.88; }
        .lb-actbtn.danger { border-color:rgba(220,38,38,.2); color:#ef4444; }
        .lb-actbtn.danger:hover { background:rgba(220,38,38,.06); }
        .lb-actbtn:disabled { opacity:.4; cursor:not-allowed; }

        /* Detail panel */
        .lb-detail  { background:#fff; border-radius:18px; border:1px solid rgba(10,22,40,.07); box-shadow:0 2px 16px rgba(10,22,40,.05); overflow:hidden; position:sticky; top:80px; }
        .lb-d-head  { padding:16px 20px; border-bottom:1px solid rgba(10,22,40,.07); }
        .lb-d-title { font-family:'Cormorant Garamond',serif; font-size:1.1rem; font-weight:700; color:#0a1628; }
        .lb-d-body  { padding:16px 20px; max-height:calc(100vh - 280px); overflow-y:auto; }
        .lb-d-row   { display:flex; justify-content:space-between; align-items:flex-start; padding:7px 0; border-bottom:1px solid rgba(10,22,40,.05); }
        .lb-d-row:last-child { border-bottom:none; }
        .lb-d-key   { font-size:.75rem; color:#64748b; flex-shrink:0; }
        .lb-d-val   { font-size:.82rem; font-weight:500; color:#0a1628; text-align:right; max-width:60%; word-break:break-word; }
        .lb-result-box { background:rgba(13,148,136,.04); border:1px solid rgba(13,148,136,.15); border-radius:12px; padding:14px; margin-top:10px; }
        .lb-result-lbl { font-size:.65rem; font-weight:700; letter-spacing:.1em; text-transform:uppercase; color:#0d9488; margin-bottom:7px; }
        .lb-result-val { font-size:.85rem; color:#0a1628; line-height:1.6; white-space:pre-wrap; }
        .lb-d-footer { padding:14px 20px; border-top:1px solid rgba(10,22,40,.06); display:flex; gap:8px; }
        .lb-d-btn   { flex:1; padding:9px; border-radius:10px; border:1px solid rgba(10,22,40,.1); background:none; cursor:pointer; font-family:'DM Sans',sans-serif; font-size:.76rem; font-weight:500; color:#64748b; transition:all .18s; text-align:center; }
        .lb-d-btn:hover { background:rgba(10,22,40,.04); color:#0a1628; }
        .lb-d-btn.primary { background:linear-gradient(135deg,#0d9488,#0a1628); color:#fff; border:none; }
        .lb-d-btn.primary:hover { opacity:.88; }

        /* Pagination */
        .lb-pagination { display:flex; align-items:center; gap:6px; justify-content:center; padding:14px; flex-wrap:wrap; }
        .lb-pgbtn { padding:5px 11px; border-radius:8px; border:1px solid rgba(10,22,40,.1); background:#fff; cursor:pointer; font-family:'DM Sans',sans-serif; font-size:.76rem; color:#64748b; transition:all .15s; }
        .lb-pgbtn:hover:not(:disabled) { background:rgba(10,22,40,.04); }
        .lb-pgbtn.active { background:#0a1628; color:#fff; border-color:#0a1628; }
        .lb-pgbtn:disabled { opacity:.4; cursor:not-allowed; }

        .lb-empty   { text-align:center; padding:48px; color:#94a3b8; font-size:.88rem; }
        .lb-error   { background:rgba(220,38,38,.06); border:1px solid rgba(220,38,38,.2); border-radius:12px; padding:14px 18px; font-size:.83rem; color:#dc2626; display:flex; align-items:center; gap:8px; }
        .lb-placeholder { color:#94a3b8; font-size:.85rem; text-align:center; padding:48px 20px; }
      `}</style>

      <div className="lb-root">

        {/* ── Stats panel ── */}
        <div className="lb-stats">
          {[
            { icon: "🔬", label: "Total Requests",  num: summary?.total      ?? "—", color: "#0d9488", bg: "rgba(13,148,136,.1)"  },
            { icon: "⏳", label: "Pending",         num: summary?.pending    ?? "—", color: "#d97706", bg: "rgba(245,158,11,.1)"  },
            { icon: "🧪", label: "In Progress",     num: summary?.inProgress ?? "—", color: "#2563eb", bg: "rgba(37,99,235,.1)"   },
            { icon: "✅", label: "Completed",       num: summary?.completed  ?? "—", color: "#16a34a", bg: "rgba(22,163,74,.1)"   },
          ].map(s => (
            <div key={s.label} className="lb-stat">
              <div className="lb-stat-icon" style={{ background: s.bg }}>{s.icon}</div>
              <div>
                <div className="lb-stat-num" style={{ color: s.color }}>{s.num}</div>
                <div className="lb-stat-lbl">{s.label}</div>
              </div>
            </div>
          ))}
        </div>

        {/* ── Toolbar ── */}
        <div className="lb-toolbar">
          <div className="lb-filters">
            {allStatuses.map(s => {
              const cfg = s === "all" ? null : STATUS_CONFIG[s as LabStatus]
              return (
                <button key={s} className={`lb-fbtn${statusFilter === s ? " active" : ""}`}
                  onClick={() => handleStatusFilter(s)}>
                  {cfg ? `${cfg.icon} ` : "📋 "}{s === "all" ? "All" : cfg!.label}
                  {!loading && <span className="lb-fbtn-cnt">{s === "all" ? total : (statusCounts[s] ?? 0)}</span>}
                </button>
              )
            })}
          </div>
          <div className="lb-search">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <input placeholder="Search patient or test…" value={search} onChange={e => handleSearch(e.target.value)} />
            {search && <button onClick={() => handleSearch("")} style={{ background: "none", border: "none", cursor: "pointer", color: "#94a3b8", fontSize: "1rem", padding: 0 }}>✕</button>}
          </div>
          <button className="lb-new-btn" onClick={() => setShowRequest(true)}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Request Lab Test
          </button>
        </div>

        {error && (
          <div className="lb-error">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
            {error}
            <button onClick={() => fetchLab(page, search, statusFilter)} style={{ marginLeft: "auto", background: "rgba(220,38,38,.1)", border: "none", color: "#dc2626", padding: "4px 12px", borderRadius: 8, cursor: "pointer", fontSize: ".78rem", fontWeight: 500 }}>Retry</button>
          </div>
        )}

        <div className="lb-layout">

          {/* ── Lab requests list ── */}
          <div className="lb-card">
            {loading ? (
              <div style={{ padding: 18, display: "flex", flexDirection: "column", gap: 10 }}>
                {[1,2,3,4].map(n => (
                  <div key={n} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <Skel w="40px" h="40px" r="50%" />
                    <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6 }}><Skel h="13px" w="50%" /><Skel h="11px" w="70%" /></div>
                    <Skel h="24px" w="80px" r="50px" />
                  </div>
                ))}
              </div>
            ) : !labRequests.length ? (
              <div className="lb-empty">
                <div style={{ fontSize: "2rem", marginBottom: 10 }}>🔬</div>
                {search || statusFilter !== "all"
                  ? "No lab requests match your filters."
                  : "No lab tests requested yet."}
              </div>
            ) : (
              <>
                <div className="lb-list">
                  {labRequests.map((lab, i) => {
                    const st = STATUS_CONFIG[lab.status]
                    return (
                      <div key={lab.id} className={`lb-item${selected?.id === lab.id ? " sel" : ""}`}
                        style={{ animationDelay: `${i * 30}ms` }}
                        onClick={() => setSelected(lab)}>
                        <div className="lb-av">{getInitials(lab.patient.name)}</div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div className="lb-name">{lab.patient.name}</div>
                          <div className="lb-test">{lab.testName}</div>
                          <div className="lb-meta">{formatDate(lab.date)}</div>
                        </div>
                        <span className="lb-badge" style={{ background: st.bg, color: st.color }}>{st.icon} {st.label}</span>
                        <div className="lb-actions" onClick={e => e.stopPropagation()}>
                          <button className="lb-actbtn primary" onClick={() => setResultTarget(lab)}>
                            {lab.status === "completed" ? "Edit" : "Enter Result"}
                          </button>
                          {lab.status === "pending" && (
                            <button className="lb-actbtn danger" disabled={deleting === lab.id}
                              onClick={() => handleDelete(lab.id)}>
                              {deleting === lab.id ? "…" : "Delete"}
                            </button>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>

                {totalPages > 1 && (
                  <div className="lb-pagination">
                    <button className="lb-pgbtn" disabled={page <= 1} onClick={() => fetchLab(page - 1, search, statusFilter)}>‹ Prev</button>
                    {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                      const pg = totalPages <= 7 ? i + 1 : page <= 4 ? i + 1 : page >= totalPages - 3 ? totalPages - 6 + i : page - 3 + i
                      return <button key={pg} className={`lb-pgbtn${page === pg ? " active" : ""}`} onClick={() => fetchLab(pg, search, statusFilter)}>{pg}</button>
                    })}
                    <button className="lb-pgbtn" disabled={page >= totalPages} onClick={() => fetchLab(page + 1, search, statusFilter)}>Next ›</button>
                  </div>
                )}
              </>
            )}
          </div>

          {/* ── Detail panel ── */}
          <div className="lb-detail">
            {!selected ? (
              <div className="lb-placeholder">
                <div style={{ fontSize: "2rem", marginBottom: 10 }}>🧪</div>
                <div>Select a lab request to view details</div>
              </div>
            ) : (() => {
              const st = STATUS_CONFIG[selected.status]
              return (
                <>
                  <div className="lb-d-head">
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
                      <div className="lb-d-title">{selected.testName}</div>
                      <span className="lb-badge" style={{ background: st.bg, color: st.color }}>{st.icon} {st.label}</span>
                    </div>
                    <div style={{ fontSize: ".75rem", color: "#94a3b8" }}>Requested {formatDate(selected.date)}</div>
                  </div>

                  <div className="lb-d-body">
                    {/* Patient info */}
                    <div style={{ fontSize: ".65rem", fontWeight: 700, letterSpacing: ".1em", textTransform: "uppercase", color: "#0d9488", marginBottom: 8 }}>Patient</div>
                    {[
                      { k: "Name",  v: selected.patient.name },
                      { k: "Age",   v: calcAge(selected.patient.dob) ?? "—" },
                      { k: "Phone", v: selected.patient.phone ?? "—" },
                    ].map(r => (
                      <div key={r.k} className="lb-d-row">
                        <span className="lb-d-key">{r.k}</span>
                        <span className="lb-d-val">{r.v}</span>
                      </div>
                    ))}

                    {/* Test info */}
                    <div style={{ fontSize: ".65rem", fontWeight: 700, letterSpacing: ".1em", textTransform: "uppercase", color: "#0d9488", margin: "14px 0 8px" }}>Test Details</div>
                    {[
                      selected.normalRange ? { k: "Normal Range",    v: selected.normalRange } : null,
                      selected.doctorNotes ? { k: "Lab Instructions", v: selected.doctorNotes } : null,
                    ].filter(Boolean).map((r: any) => (
                      <div key={r.k} className="lb-d-row">
                        <span className="lb-d-key">{r.k}</span>
                        <span className="lb-d-val">{r.v}</span>
                      </div>
                    ))}

                    {/* Result */}
                    {selected.result ? (
                      <div className="lb-result-box">
                        <div className="lb-result-lbl">Result</div>
                        <div className="lb-result-val">{selected.result}</div>
                        {selected.normalRange && (
                          <div style={{ marginTop: 8, fontSize: ".72rem", color: "#64748b" }}>
                            Normal: {selected.normalRange}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div style={{ marginTop: 12, padding: "12px 14px", borderRadius: 10, background: "rgba(245,158,11,.06)", border: "1px solid rgba(245,158,11,.2)", fontSize: ".8rem", color: "#d97706", textAlign: "center" }}>
                        ⏳ Awaiting lab result
                      </div>
                    )}
                  </div>

                  <div className="lb-d-footer">
                    <button className="lb-d-btn primary" onClick={() => setResultTarget(selected)}>
                      {selected.status === "completed" ? "✏️ Edit Result" : "🔬 Enter Result"}
                    </button>
                    <button className="lb-d-btn" onClick={() => window.print()}>🖨️ Print</button>
                  </div>
                </>
              )
            })()}
          </div>
        </div>
      </div>

      {showRequest && (
        <RequestModal onClose={() => setShowRequest(false)} onSave={handleCreate} />
      )}

      {resultTarget && (
        <ResultModal lab={resultTarget} onClose={() => setResultTarget(null)} onSave={handleUpdate} />
      )}
    </>
  )
}