"use client"

// app/dashboard/consultations/page.tsx
// Premium SOAP clinical notes format — Doctor only.
// S = Subjective, O = Objective (Vitals + Examination), A = Assessment, P = Plan
//
// API endpoints:
//   GET  /api/consultations/queue              → today's appointment queue
//   GET  /api/consultations/patient/:id        → patient consultation history
//   POST /api/consultations                    → create new consultation
//   PUT  /api/consultations/:id                → update existing consultation

import { useState, useEffect, useCallback } from "react"
import { useAuthStore } from "@/store/authStore"
import API from "@/lib/api"

// ── Types ─────────────────────────────────────────────────────────────────────
interface Patient {
  id: string; name: string; dob?: string; phone?: string
  bloodGroup?: string; allergies?: string[]
}

interface QueueItem {
  id:           string
  time:         string
  status:       string
  patient:      Patient
  service?:     { id: string; name: string } | null
  consultation: ConsultationRecord | null
}

interface ConsultationRecord {
  id:             string
  appointmentId:  string
  chiefComplaint: string
  symptoms:       string[]
  examination?:   string
  diagnosis?:     string
  treatment?:     string
  notes?:         string
  bp?:            string
  pulse?:         string
  temperature?:   string
  weight?:        string
  height?:        string
  followUpDate?:  string
  createdAt:      string
}

interface Vitals { bp: string; pulse: string; temperature: string; weight: string; height: string; spo2: string }

interface FormState {
  // S — Subjective
  chiefComplaint:    string
  symptoms:          string[]
  historyPresenting: string   // History of presenting complaint
  medicalHistory:    string
  dentalHistory:     string
  // O — Objective
  vitals:            Vitals
  extraoral:         string   // Extra-oral examination
  intraoral:         string   // Intra-oral examination
  teethInvolved:     string   // e.g. "16, 17" FDI notation
  // A — Assessment
  diagnosis:         string
  differentialDx:    string
  severity:          "mild" | "moderate" | "severe" | ""
  // P — Plan
  treatment:         string
  labTests:          string
  referral:          string
  notes:             string
  followUpDate:      string
}

// ── Constants ─────────────────────────────────────────────────────────────────
const SYMPTOM_LIST = [
  "Toothache", "Sensitivity (cold)", "Sensitivity (hot)", "Sensitivity (sweet)",
  "Bleeding gums", "Swollen gums", "Swollen face", "Bad breath",
  "Jaw pain", "TMJ clicking", "Broken tooth", "Chipped tooth",
  "Missing tooth", "Loose tooth", "Discoloration", "Mouth ulcer",
  "Dry mouth", "Difficulty chewing", "Difficulty swallowing", "Lip/tongue numbness",
  "Receding gums", "Food packing", "Pain on biting",
]

const ORAL_EXAM_PROMPTS = [
  "Soft tissues WNL", "Plaque/calculus present", "Periodontal pocketing",
  "Caries detected", "Periapical tenderness", "Mobility grade",
  "Occlusion class I/II/III", "Missing teeth", "Existing restorations",
]

const TREATMENT_SUGGESTIONS = [
  "Scaling & Root Planing", "Extraction", "Root Canal Treatment",
  "Composite Restoration", "Crown Preparation", "Denture Fabrication",
  "Surgical Extraction", "Implant Placement", "Orthodontic Referral",
  "Periodontal Surgery", "Whitening", "Fluoride Application",
]

const SEVERITY_OPTIONS: Array<{ value: "mild" | "moderate" | "severe" | ""; label: string; color: string }> = [
  { value: "",         label: "Not set",  color: "#94a3b8" },
  { value: "mild",     label: "Mild",     color: "#16a34a" },
  { value: "moderate", label: "Moderate", color: "#d97706" },
  { value: "severe",   label: "Severe",   color: "#dc2626" },
]

const EMPTY_FORM: FormState = {
  chiefComplaint: "", symptoms: [], historyPresenting: "", medicalHistory: "", dentalHistory: "",
  vitals: { bp: "", pulse: "", temperature: "", weight: "", height: "", spo2: "" },
  extraoral: "", intraoral: "", teethInvolved: "",
  diagnosis: "", differentialDx: "", severity: "",
  treatment: "", labTests: "", referral: "", notes: "", followUpDate: "",
}

const STATUS_COLOR: Record<string, string> = {
  in_progress: "#0d9488", checked_in: "#2563eb",
  confirmed: "#16a34a", pending: "#f59e0b",
  completed: "#64748b", cancelled: "#dc2626",
}

type SoapTab = "S" | "O" | "A" | "P" | "history"

// ── Helpers ───────────────────────────────────────────────────────────────────
function getInitials(name: string) { return name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase() }
function calcAge(dob?: string) {
  if (!dob) return "—"
  return `${Math.floor((Date.now() - new Date(dob).getTime()) / (365.25 * 24 * 60 * 60 * 1000))} yrs`
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
      <h2 style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: "1.5rem", fontWeight: 700, color: "#0a1628" }}>Access Restricted</h2>
      <p style={{ fontSize: ".9rem", color: "#64748b", maxWidth: 360 }}>Consultation notes are confidential medical records accessible to treating doctors only.</p>
      <div style={{ padding: "10px 20px", borderRadius: 12, background: "rgba(220,38,38,.06)", border: "1px solid rgba(220,38,38,.2)", fontSize: ".8rem", color: "#dc2626", fontWeight: 500 }}>🚫 Doctor access required</div>
    </div>
  )
}

const SOAP_META: Record<SoapTab, { label: string; icon: string; color: string; desc: string }> = {
  S: { label: "Subjective", icon: "💬", color: "#2563eb", desc: "Patient-reported complaint & history" },
  O: { label: "Objective",  icon: "🔬", color: "#7c3aed", desc: "Vitals, clinical & oral examination" },
  A: { label: "Assessment", icon: "🩺", color: "#d97706", desc: "Diagnosis & clinical assessment" },
  P: { label: "Plan",       icon: "📋", color: "#0d9488", desc: "Treatment, investigations & follow-up" },
  history: { label: "History", icon: "📅", color: "#64748b", desc: "Previous consultations" },
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function ConsultationsPage() {
  const { role } = useAuthStore()
  if (role() !== "doctor") return <AccessDenied />

  const [queue,        setQueue]        = useState<QueueItem[]>([])
  const [queueLoading, setQueueLoading] = useState(true)
  const [selected,     setSelected]     = useState<QueueItem | null>(null)
  const [activeTab,    setActiveTab]    = useState<SoapTab>("S")

  const [form,    setForm]    = useState<FormState>(EMPTY_FORM)
  const [saving,  setSaving]  = useState(false)
  const [saveMsg, setSaveMsg] = useState("")
  const [saveErr, setSaveErr] = useState("")

  const [history,     setHistory]     = useState<ConsultationRecord[]>([])
  const [histLoading, setHistLoading] = useState(false)
  const [expandedHist, setExpandedHist] = useState<string | null>(null)

  const fetchQueue = useCallback(async () => {
    setQueueLoading(true)
    try {
      const res = await API.get("/consultations/queue")
      const data = (res.data as unknown as QueueItem[]) ?? []
      setQueue(data)
      if (data.length && !selected) selectPatient(data[0])
    } catch { setQueue([]) } finally { setQueueLoading(false) }
  }, [])

  useEffect(() => { fetchQueue() }, [])

  const selectPatient = (item: QueueItem) => {
    setSelected(item); setSaveMsg(""); setSaveErr(""); setActiveTab("S")
    if (item.consultation) {
      const c = item.consultation
      setForm({
        chiefComplaint: c.chiefComplaint ?? "",
        symptoms:       c.symptoms       ?? [],
        historyPresenting: "", medicalHistory: "", dentalHistory: "",
        vitals: { bp: c.bp ?? "", pulse: c.pulse ?? "", temperature: c.temperature ?? "", weight: c.weight ?? "", height: c.height ?? "", spo2: "" },
        extraoral: "", intraoral: c.examination ?? "", teethInvolved: "",
        diagnosis: c.diagnosis ?? "", differentialDx: "", severity: "",
        treatment: c.treatment ?? "", labTests: "", referral: "",
        notes: c.notes ?? "",
        followUpDate: c.followUpDate ? new Date(c.followUpDate).toISOString().split("T")[0] : "",
      })
    } else { setForm(EMPTY_FORM) }
  }

  const fetchHistory = useCallback(async (patientId: string) => {
    setHistLoading(true); setHistory([])
    try {
      const res = await API.get(`/consultations/patient/${patientId}`)
      setHistory((res.data as unknown as ConsultationRecord[]) ?? [])
    } catch { setHistory([]) } finally { setHistLoading(false) }
  }, [])

  useEffect(() => {
    if (activeTab === "history" && selected) fetchHistory(selected.patient.id)
  }, [activeTab, selected])

  const toggleSymptom = (s: string) =>
    setForm(f => ({ ...f, symptoms: f.symptoms.includes(s) ? f.symptoms.filter(x => x !== s) : [...f.symptoms, s] }))

  const sf = (k: keyof Omit<FormState, "vitals" | "symptoms">) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setForm(f => ({ ...f, [k]: e.target.value }))

  const sv = (k: keyof Vitals) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(f => ({ ...f, vitals: { ...f.vitals, [k]: e.target.value } }))

  const handleSave = async () => {
    if (!selected) return
    if (!form.chiefComplaint.trim()) { setSaveErr("Chief complaint is required (Subjective section)"); return }
    setSaveErr(""); setSaving(true)
    try {
      const payload = {
        patientId:      selected.patient.id,
        appointmentId:  selected.id,
        chiefComplaint: form.chiefComplaint.trim(),
        symptoms:       form.symptoms,
        examination:    [form.extraoral, form.intraoral].filter(Boolean).join("\n\nIntra-oral: ") || undefined,
        diagnosis:      form.diagnosis.trim()   || undefined,
        treatment:      form.treatment.trim()   || undefined,
        notes:          [form.notes, form.labTests ? `Lab: ${form.labTests}` : "", form.referral ? `Referral: ${form.referral}` : ""].filter(Boolean).join("\n") || undefined,
        followUpDate:   form.followUpDate        || undefined,
        vitals: {
          bp:          form.vitals.bp          || undefined,
          pulse:       form.vitals.pulse       || undefined,
          temperature: form.vitals.temperature || undefined,
          weight:      form.vitals.weight      || undefined,
          height:      form.vitals.height      || undefined,
        },
      }
      if (selected.consultation) {
        await API.put(`/consultations/${selected.consultation.id}`, payload)
        setSaveMsg("✓ Consultation updated!")
      } else {
        await API.post("/consultations", payload)
        setSaveMsg("✓ Consultation saved!")
      }
      setTimeout(() => setSaveMsg(""), 4000)
      fetchQueue()
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? err?.message ?? "Save failed"
      setSaveErr(Array.isArray(msg) ? msg[0] : msg)
    } finally { setSaving(false) }
  }

  const inputSt: React.CSSProperties = {
    width: "100%", padding: "9px 12px", borderRadius: 9,
    border: "1.5px solid #e2e8f0", fontFamily: "'DM Sans',sans-serif",
    fontSize: ".875rem", color: "#0a1628", background: "#fff", outline: "none",
    transition: "border-color .2s, box-shadow .2s",
  }
  const labelSt: React.CSSProperties = {
    fontSize: ".65rem", fontWeight: 700, letterSpacing: ".13em",
    textTransform: "uppercase", color: "#94a3b8", display: "block", marginBottom: 6,
  }
  const taSt = { ...inputSt, resize: "vertical" as const }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@700&family=DM+Sans:wght@300;400;500;600&display=swap');
        @keyframes shimmer { to{background-position:-200% 0} }
        @keyframes spin    { to{transform:rotate(360deg)} }
        @keyframes fadeIn  { from{opacity:0;transform:translateY(6px)} to{opacity:1;transform:translateY(0)} }

        .co-root { font-family:'DM Sans',sans-serif; display:grid; grid-template-columns:268px 1fr; gap:18px; height:calc(100vh - 130px); }
        @media(max-width:900px) { .co-root { grid-template-columns:1fr; height:auto; } }

        .co-list { background:#fff; border-radius:18px; border:1px solid rgba(10,22,40,.07); box-shadow:0 2px 12px rgba(10,22,40,.05); display:flex; flex-direction:column; overflow:hidden; }
        .co-list-head { padding:14px 18px; border-bottom:1px solid rgba(10,22,40,.06); display:flex; align-items:center; justify-content:space-between; }
        .co-list-title { font-family:'Cormorant Garamond',serif; font-size:1rem; font-weight:700; color:#0a1628; }
        .co-list-body  { flex:1; overflow-y:auto; }
        .co-pt-item { display:flex; align-items:center; gap:10px; padding:11px 15px; cursor:pointer; border-bottom:1px solid rgba(10,22,40,.04); transition:background .15s; position:relative; }
        .co-pt-item:hover { background:rgba(10,22,40,.03); }
        .co-pt-item.active { background:rgba(13,148,136,.07); border-right:3px solid #0d9488; }
        .co-pt-av { width:36px; height:36px; border-radius:50%; background:linear-gradient(135deg,#0d9488,#0a1628); display:flex; align-items:center; justify-content:center; font-size:.7rem; font-weight:700; color:#fff; flex-shrink:0; }
        .co-pt-name { font-size:.84rem; font-weight:500; color:#0a1628; }
        .co-pt-meta { font-size:.7rem; color:#94a3b8; }
        .co-pt-time { font-size:.7rem; font-weight:600; color:#0d9488; margin-left:auto; white-space:nowrap; }
        .co-done-tag { font-size:.58rem; font-weight:700; background:rgba(13,148,136,.1); color:#0d9488; padding:2px 6px; border-radius:50px; letter-spacing:.05em; text-transform:uppercase; }

        .co-main { display:flex; flex-direction:column; gap:14px; overflow-y:auto; }

        .co-pt-header { background:#fff; border-radius:18px; border:1px solid rgba(10,22,40,.07); padding:16px 20px; display:flex; align-items:center; gap:14px; box-shadow:0 2px 12px rgba(10,22,40,.05); flex-shrink:0; }
        .co-pt-hav { width:50px; height:50px; border-radius:50%; background:linear-gradient(135deg,#0d9488,#0a1628); display:flex; align-items:center; justify-content:center; font-size:.85rem; font-weight:700; color:#fff; flex-shrink:0; }
        .co-pt-hname { font-family:'Cormorant Garamond',serif; font-size:1.2rem; font-weight:700; color:#0a1628; }

        .co-form-card { background:#fff; border-radius:18px; border:1px solid rgba(10,22,40,.07); overflow:hidden; flex:1; box-shadow:0 2px 12px rgba(10,22,40,.05); display:flex; flex-direction:column; min-height:0; }

        /* SOAP Tab bar */
        .soap-tabs { display:flex; border-bottom:1px solid rgba(10,22,40,.06); flex-shrink:0; overflow-x:auto; }
        .soap-tab { display:flex; flex-direction:column; align-items:center; padding:10px 18px; border:none; background:none; cursor:pointer; font-family:'DM Sans',sans-serif; border-bottom:3px solid transparent; transition:all .18s; flex-shrink:0; }
        .soap-tab .st-letter { font-size:1rem; font-weight:700; margin-bottom:2px; }
        .soap-tab .st-label  { font-size:.65rem; color:#94a3b8; font-weight:500; }
        .soap-tab.active .st-label { color:inherit; }

        .co-tab-body { padding:20px 22px; flex:1; overflow-y:auto; }

        .co-chips { display:flex; flex-wrap:wrap; gap:7px; }
        .co-chip  { padding:5px 12px; border-radius:50px; border:1.5px solid rgba(10,22,40,.1); background:#fff; cursor:pointer; font-size:.76rem; font-weight:500; color:#64748b; transition:all .18s; font-family:'DM Sans',sans-serif; }
        .co-chip:hover { border-color:#0d9488; color:#0d9488; }
        .co-chip.sel { background:#0d9488; border-color:#0d9488; color:#fff; }
        .co-grid2 { display:grid; grid-template-columns:1fr 1fr; gap:14px; }
        .co-grid3 { display:grid; grid-template-columns:repeat(3,1fr); gap:12px; }
        .co-grid6 { display:grid; grid-template-columns:repeat(3,1fr); gap:10px; }
        @media(max-width:640px) { .co-grid2,.co-grid3,.co-grid6 { grid-template-columns:1fr; } }

        .soap-section { background:#f8fafc; border-radius:12px; padding:16px; border:1px solid #e2e8f0; margin-bottom:14px; }
        .soap-section-hd { font-size:.68rem; font-weight:700; text-transform:uppercase; letter-spacing:.14em; margin-bottom:12px; display:flex; align-items:center; gap:6px; }

        .co-footer { display:flex; gap:10px; padding:14px 22px; border-top:1px solid rgba(10,22,40,.06); align-items:center; flex-wrap:wrap; flex-shrink:0; background:#fff; }
        .co-save-btn { padding:10px 24px; border-radius:50px; border:none; cursor:pointer; background:linear-gradient(135deg,#0d9488,#0a1628); color:#fff; font-family:'DM Sans',sans-serif; font-size:.875rem; font-weight:600; box-shadow:0 3px 14px rgba(13,148,136,.28); transition:transform .18s; display:flex; align-items:center; gap:7px; }
        .co-save-btn:hover:not(:disabled) { transform:translateY(-1px); }
        .co-save-btn:disabled { opacity:.6; cursor:not-allowed; }
        .co-spin { width:14px; height:14px; border:2px solid rgba(255,255,255,.3); border-top-color:#fff; border-radius:50%; animation:spin .7s linear infinite; display:inline-block; }
        .co-success { display:flex; align-items:center; gap:6px; font-size:.82rem; color:#16a34a; font-weight:500; padding:7px 14px; background:rgba(22,163,74,.08); border-radius:50px; animation:fadeIn .3s ease; }
        .co-error   { font-size:.82rem; color:#dc2626; padding:7px 14px; background:rgba(220,38,38,.06); border-radius:9px; border:1px solid rgba(220,38,38,.2); }

        .co-hist-item { background:#f8fafc; border-radius:14px; border:1px solid #e2e8f0; padding:16px; margin-bottom:10px; animation:fadeIn .25s ease both; cursor:pointer; transition:box-shadow .18s; }
        .co-hist-item:hover { box-shadow:0 4px 18px rgba(10,22,40,.08); }
        .co-empty { text-align:center; padding:48px; color:#94a3b8; font-size:.85rem; }
        .co-no-select { display:flex; flex-direction:column; align-items:center; justify-content:center; height:100%; color:#94a3b8; font-size:.85rem; gap:12px; padding:40px; text-align:center; }

        input:focus, select:focus, textarea:focus { border-color:#0d9488 !important; box-shadow:0 0 0 3px rgba(13,148,136,.1) !important; outline:none; }
        .treatment-chip:hover { border-color:#0d9488 !important; color:#0d9488 !important; }
      `}</style>

      <div className="co-root">

        {/* Queue */}
        <div className="co-list">
          <div className="co-list-head">
            <span className="co-list-title">Today's Queue</span>
            <button onClick={fetchQueue} style={{ background: "none", border: "none", cursor: "pointer", color: "#0d9488", fontSize: ".75rem", fontWeight: 600, fontFamily: "'DM Sans',sans-serif" }}>↻ Refresh</button>
          </div>
          <div className="co-list-body">
            {queueLoading ? (
              <div style={{ padding: 14, display: "flex", flexDirection: "column", gap: 10 }}>
                {[1,2,3].map(n => (
                  <div key={n} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0" }}>
                    <Skel w="36px" h="36px" r="50%" />
                    <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 5 }}><Skel h="13px" w="70%" /><Skel h="11px" w="50%" /></div>
                  </div>
                ))}
              </div>
            ) : !queue.length ? (
              <div className="co-empty">No appointments scheduled for today</div>
            ) : (
              queue.map(item => (
                <div key={item.id} className={`co-pt-item${selected?.id === item.id ? " active" : ""}`} onClick={() => selectPatient(item)}>
                  <div className="co-pt-dot" style={{ width: 7, height: 7, borderRadius: "50%", flexShrink: 0, background: STATUS_COLOR[item.status] ?? "#94a3b8" }} />
                  <div className="co-pt-av">{getInitials(item.patient.name)}</div>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div className="co-pt-name">{item.patient.name}</div>
                    <div className="co-pt-meta">{item.service?.name ?? "General"}</div>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 3 }}>
                    <div className="co-pt-time">{item.time}</div>
                    {item.consultation && <span className="co-done-tag">✓ Done</span>}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Main panel */}
        <div className="co-main">
          {!selected ? (
            <div className="co-no-select">
              <div style={{ width: 64, height: 64, borderRadius: 20, background: "linear-gradient(135deg,rgba(13,148,136,.12),rgba(13,148,136,.04))", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.8rem" }}>🩺</div>
              <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: "1.1rem", fontWeight: 700, color: "#0a1628" }}>Select a patient to begin</div>
              <div>Click a patient from today's queue to open their SOAP notes</div>
            </div>
          ) : (
            <>
              {/* Patient header */}
              <div className="co-pt-header">
                <div className="co-pt-hav">{getInitials(selected.patient.name)}</div>
                <div style={{ flex: 1 }}>
                  <div className="co-pt-hname">{selected.patient.name}</div>
                  <div style={{ fontSize: ".77rem", color: "#64748b" }}>
                    {calcAge(selected.patient.dob)} · {selected.patient.phone ?? "—"}
                    {selected.patient.bloodGroup && <span style={{ marginLeft: 8, fontWeight: 700, color: "#ef4444", fontSize: ".8rem" }}>Blood: {selected.patient.bloodGroup}</span>}
                  </div>
                  {selected.patient.allergies && selected.patient.allergies.length > 0 && (
                    <div style={{ marginTop: 5, display: "flex", gap: 5, flexWrap: "wrap" }}>
                      {selected.patient.allergies.map(a => (
                        <span key={a} style={{ padding: "2px 8px", borderRadius: 50, background: "rgba(239,68,68,.1)", color: "#ef4444", fontSize: ".68rem", fontWeight: 600 }}>⚠️ {a}</span>
                      ))}
                    </div>
                  )}
                </div>
                <div style={{ textAlign: "right", flexShrink: 0 }}>
                  <div style={{ background: "rgba(13,148,136,.1)", color: "#0d9488", borderRadius: 20, padding: "4px 12px", fontSize: ".75rem", fontWeight: 600, marginBottom: 4 }}>{selected.service?.name ?? "General"}</div>
                  <div style={{ fontSize: ".7rem", color: "#94a3b8" }}>📅 {new Date().toLocaleDateString("en-IN")} · {selected.time}</div>
                  {selected.consultation && <div style={{ fontSize: ".68rem", color: "#0d9488", marginTop: 3, fontWeight: 500 }}>✓ Notes recorded</div>}
                </div>
              </div>

              {/* SOAP Form Card */}
              <div className="co-form-card">
                {/* SOAP Tabs */}
                <div className="soap-tabs">
                  {(["S", "O", "A", "P", "history"] as SoapTab[]).map(t => {
                    const meta = SOAP_META[t]
                    const isActive = activeTab === t
                    return (
                      <button
                        key={t}
                        className={`soap-tab${isActive ? " active" : ""}`}
                        onClick={() => setActiveTab(t)}
                        style={{ color: isActive ? meta.color : "#94a3b8", borderBottomColor: isActive ? meta.color : "transparent" }}
                      >
                        <span className="st-letter">{meta.icon} {t === "history" ? "" : t}</span>
                        <span className="st-label">{meta.label}</span>
                      </button>
                    )
                  })}
                  {/* Progress dots */}
                  <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", padding: "0 16px", gap: 6 }}>
                    {(["S", "O", "A", "P"] as const).map(t => {
                      const filled = t === "S" ? form.chiefComplaint
                        : t === "O" ? form.vitals.bp || form.intraoral
                        : t === "A" ? form.diagnosis
                        : form.treatment
                      return <div key={t} style={{ width: 7, height: 7, borderRadius: "50%", background: filled ? "#0d9488" : "#e2e8f0", transition: "background .2s" }} title={`${SOAP_META[t].label}: ${filled ? "filled" : "empty"}`} />
                    })}
                  </div>
                </div>

                <div className="co-tab-body">

                  {/* S — Subjective */}
                  {activeTab === "S" && (
                    <div>
                      <div className="soap-section">
                        <div className="soap-section-hd" style={{ color: "#2563eb" }}>💬 Chief Complaint <span style={{ color: "#ef4444" }}>*</span></div>
                        <input
                          style={inputSt}
                          placeholder="Patient's main concern today — in their own words..."
                          value={form.chiefComplaint}
                          onChange={sf("chiefComplaint")}
                        />
                      </div>

                      <div className="soap-section">
                        <div className="soap-section-hd" style={{ color: "#2563eb" }}>🦷 Presenting Symptoms</div>
                        <div className="co-chips" style={{ marginBottom: 12 }}>
                          {SYMPTOM_LIST.map(s => (
                            <button key={s} type="button" className={`co-chip${form.symptoms.includes(s) ? " sel" : ""}`} onClick={() => toggleSymptom(s)}>{s}</button>
                          ))}
                        </div>
                        {form.symptoms.length > 0 && (
                          <div style={{ fontSize: ".78rem", color: "#64748b" }}>Selected: <strong>{form.symptoms.join(", ")}</strong></div>
                        )}
                      </div>

                      <div className="co-grid2">
                        <div className="soap-section">
                          <div className="soap-section-hd" style={{ color: "#2563eb" }}>📋 History of Presenting Complaint</div>
                          <textarea style={{ ...taSt, height: 80 }} placeholder="Duration, onset, aggravating/relieving factors, radiation of pain..." value={form.historyPresenting} onChange={sf("historyPresenting")} />
                        </div>
                        <div>
                          <div className="soap-section" style={{ marginBottom: 12 }}>
                            <div className="soap-section-hd" style={{ color: "#2563eb" }}>❤️ Medical History</div>
                            <textarea style={{ ...taSt, height: 60 }} placeholder="Systemic conditions, medications, surgeries..." value={form.medicalHistory} onChange={sf("medicalHistory")} />
                          </div>
                          <div className="soap-section">
                            <div className="soap-section-hd" style={{ color: "#2563eb" }}>🦷 Dental History</div>
                            <textarea style={{ ...taSt, height: 60 }} placeholder="Previous dental treatment, extractions, orthodontics..." value={form.dentalHistory} onChange={sf("dentalHistory")} />
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* O — Objective */}
                  {activeTab === "O" && (
                    <div>
                      {/* Vitals */}
                      <div className="soap-section">
                        <div className="soap-section-hd" style={{ color: "#7c3aed" }}>💉 Vitals</div>
                        <div className="co-grid6">
                          {([
                            { key: "bp",          label: "Blood Pressure",  placeholder: "120/80 mmHg", icon: "❤️" },
                            { key: "pulse",       label: "Pulse Rate",      placeholder: "72 bpm",      icon: "💓" },
                            { key: "temperature", label: "Temperature",     placeholder: "98.6 °F",     icon: "🌡️" },
                            { key: "spo2",        label: "SpO2",            placeholder: "98%",         icon: "🫁" },
                            { key: "weight",      label: "Weight",          placeholder: "kg",          icon: "⚖️" },
                            { key: "height",      label: "Height",          placeholder: "cm",          icon: "📏" },
                          ] as { key: keyof Vitals; label: string; placeholder: string; icon: string }[]).map(v => (
                            <div key={v.key}>
                              <label style={labelSt}>{v.icon} {v.label}</label>
                              <input style={inputSt} placeholder={v.placeholder} value={form.vitals[v.key]} onChange={sv(v.key)} />
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Extra-oral */}
                      <div className="soap-section">
                        <div className="soap-section-hd" style={{ color: "#7c3aed" }}>🔎 Extra-Oral Examination</div>
                        <textarea style={{ ...taSt, height: 72 }} placeholder="Facial symmetry, lymph nodes, TMJ, swelling, sinus/fistula, lip/skin lesions..." value={form.extraoral} onChange={sf("extraoral")} />
                      </div>

                      {/* Intra-oral */}
                      <div className="soap-section">
                        <div className="soap-section-hd" style={{ color: "#7c3aed" }}>🦷 Intra-Oral Examination</div>
                        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
                          {ORAL_EXAM_PROMPTS.map(p => (
                            <button key={p} type="button" style={{ padding: "4px 10px", borderRadius: 20, border: "1px solid #e2e8f0", background: "#fff", cursor: "pointer", fontSize: ".72rem", color: "#64748b", fontFamily: "'DM Sans',sans-serif" }}
                              onClick={() => setForm(f => ({ ...f, intraoral: f.intraoral ? f.intraoral + "\n" + p : p }))}>
                              + {p}
                            </button>
                          ))}
                        </div>
                        <textarea style={{ ...taSt, height: 90 }} placeholder="Soft tissues, teeth, periodontium, occlusion, oral hygiene status..." value={form.intraoral} onChange={sf("intraoral")} />
                        <div style={{ marginTop: 10 }}>
                          <label style={labelSt}>Teeth Involved (FDI notation)</label>
                          <input style={inputSt} placeholder="e.g. 16, 26, 36 — or Universal: 3, 14" value={form.teethInvolved} onChange={sf("teethInvolved")} />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* A — Assessment */}
                  {activeTab === "A" && (
                    <div>
                      <div className="soap-section">
                        <div className="soap-section-hd" style={{ color: "#d97706" }}>🩺 Diagnosis</div>
                        <textarea style={{ ...taSt, height: 80 }} placeholder="Primary diagnosis with site, tooth number, and severity..." value={form.diagnosis} onChange={sf("diagnosis")} />
                        <div style={{ marginTop: 12 }}>
                          <label style={labelSt}>Severity</label>
                          <div style={{ display: "flex", gap: 8 }}>
                            {SEVERITY_OPTIONS.map(opt => (
                              <button key={opt.value} type="button"
                                onClick={() => setForm(f => ({ ...f, severity: opt.value }))}
                                style={{ padding: "6px 16px", borderRadius: 20, border: "2px solid", borderColor: form.severity === opt.value ? opt.color : "#e2e8f0", background: form.severity === opt.value ? opt.color : "#fff", color: form.severity === opt.value ? "#fff" : opt.color, fontSize: ".78rem", fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans',sans-serif", transition: "all .15s" }}>
                                {opt.label}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>

                      <div className="soap-section">
                        <div className="soap-section-hd" style={{ color: "#d97706" }}>🔀 Differential Diagnosis</div>
                        <textarea style={{ ...taSt, height: 72 }} placeholder="Other possible diagnoses to consider..." value={form.differentialDx} onChange={sf("differentialDx")} />
                      </div>
                    </div>
                  )}

                  {/* P — Plan */}
                  {activeTab === "P" && (
                    <div>
                      <div className="soap-section">
                        <div className="soap-section-hd" style={{ color: "#0d9488" }}>🔧 Treatment Plan</div>
                        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
                          {TREATMENT_SUGGESTIONS.map(t => (
                            <button key={t} type="button" className="treatment-chip"
                              style={{ padding: "4px 10px", borderRadius: 20, border: "1px solid #e2e8f0", background: "#fff", cursor: "pointer", fontSize: ".72rem", color: "#64748b", fontFamily: "'DM Sans',sans-serif", transition: "all .15s" }}
                              onClick={() => setForm(f => ({ ...f, treatment: f.treatment ? f.treatment + "\n• " + t : "• " + t }))}>
                              + {t}
                            </button>
                          ))}
                        </div>
                        <textarea style={{ ...taSt, height: 90 }} placeholder="Planned procedures and interventions..." value={form.treatment} onChange={sf("treatment")} />
                      </div>

                      <div className="co-grid2">
                        <div className="soap-section">
                          <div className="soap-section-hd" style={{ color: "#0d9488" }}>🔬 Investigations</div>
                          <textarea style={{ ...taSt, height: 72 }} placeholder="OPG, CBCT, Blood tests, Biopsy, Vitality tests..." value={form.labTests} onChange={sf("labTests")} />
                        </div>
                        <div className="soap-section">
                          <div className="soap-section-hd" style={{ color: "#0d9488" }}>🏥 Referral</div>
                          <textarea style={{ ...taSt, height: 72 }} placeholder="Refer to specialist (Periodontist, Oral Surgeon, Endodontist)..." value={form.referral} onChange={sf("referral")} />
                        </div>
                      </div>

                      <div className="co-grid2">
                        <div className="soap-section">
                          <div className="soap-section-hd" style={{ color: "#0d9488" }}>📝 Clinical Notes</div>
                          <textarea style={{ ...taSt, height: 72 }} placeholder="Additional clinical notes, patient communication..." value={form.notes} onChange={sf("notes")} />
                        </div>
                        <div className="soap-section">
                          <div className="soap-section-hd" style={{ color: "#0d9488" }}>📅 Follow-up Date</div>
                          <input type="date" style={inputSt} value={form.followUpDate} onChange={sf("followUpDate")} min={new Date().toISOString().split("T")[0]} />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* History */}
                  {activeTab === "history" && (
                    <>
                      {histLoading ? (
                        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                          {[1,2].map(n => <div key={n} style={{ background: "#f8fafc", borderRadius: 12, padding: 16, display: "flex", flexDirection: "column", gap: 7 }}><Skel h="13px" w="50%" /><Skel h="11px" w="70%" /><Skel h="40px" /></div>)}
                        </div>
                      ) : !history.length ? (
                        <div className="co-empty"><div style={{ fontSize: "2rem", marginBottom: 10 }}>📋</div>No previous consultations for {selected.patient.name}</div>
                      ) : (
                        history.map((c, i) => (
                          <div key={c.id} className="co-hist-item" style={{ animationDelay: `${i * 40}ms` }} onClick={() => setExpandedHist(expandedHist === c.id ? null : c.id)}>
                            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
                              <div>
                                <div style={{ fontSize: ".875rem", fontWeight: 700, color: "#0a1628" }}>{c.diagnosis ?? "Diagnosis not recorded"}</div>
                                <div style={{ fontSize: ".72rem", color: "#94a3b8", marginTop: 2 }}>{formatDate(c.createdAt)}</div>
                              </div>
                              <span style={{ color: "#94a3b8", fontSize: ".8rem", flexShrink: 0 }}>{expandedHist === c.id ? "▲" : "▼"}</span>
                            </div>
                            <div style={{ fontSize: ".8rem", color: "#475569", fontStyle: "italic", marginTop: 6 }}>"{c.chiefComplaint}"</div>
                            {expandedHist === c.id && (
                              <div style={{ marginTop: 12, borderTop: "1px solid #e2e8f0", paddingTop: 12, display: "flex", flexDirection: "column", gap: 8 }}>
                                {c.symptoms.length > 0 && (
                                  <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
                                    {c.symptoms.map(s => <span key={s} style={{ background: "rgba(13,148,136,.08)", color: "#0d9488", borderRadius: 20, padding: "2px 8px", fontSize: ".7rem" }}>{s}</span>)}
                                  </div>
                                )}
                                {(c.bp || c.pulse || c.temperature) && (
                                  <div style={{ display: "flex", gap: 12, fontSize: ".78rem", color: "#64748b" }}>
                                    {c.bp && <span>BP: {c.bp}</span>}
                                    {c.pulse && <span>Pulse: {c.pulse}</span>}
                                    {c.temperature && <span>Temp: {c.temperature}</span>}
                                  </div>
                                )}
                                {c.examination && <div style={{ fontSize: ".8rem", color: "#374151" }}><strong>Examination:</strong> {c.examination}</div>}
                                {c.treatment && <div style={{ fontSize: ".8rem", color: "#374151" }}><strong>Treatment:</strong> {c.treatment}</div>}
                                {c.notes && <div style={{ fontSize: ".78rem", color: "#64748b" }}><strong>Notes:</strong> {c.notes}</div>}
                                {c.followUpDate && <div style={{ fontSize: ".78rem", color: "#0d9488", fontWeight: 600 }}>📅 Follow-up: {formatDate(c.followUpDate)}</div>}
                              </div>
                            )}
                          </div>
                        ))
                      )}
                    </>
                  )}
                </div>

                {/* Footer */}
                <div className="co-footer">
                  {/* SOAP progress summary */}
                  <div style={{ display: "flex", gap: 6, flex: 1, flexWrap: "wrap" }}>
                    {(["S", "O", "A", "P"] as const).map(t => {
                      const filled = t === "S" ? form.chiefComplaint
                        : t === "O" ? form.vitals.bp || form.intraoral
                        : t === "A" ? form.diagnosis
                        : form.treatment
                      return (
                        <div key={t} style={{ display: "flex", alignItems: "center", gap: 4, padding: "3px 8px", borderRadius: 20, background: filled ? "rgba(13,148,136,.08)" : "#f1f5f9", border: `1px solid ${filled ? "rgba(13,148,136,.2)" : "#e2e8f0"}` }}>
                          <div style={{ width: 6, height: 6, borderRadius: "50%", background: filled ? "#0d9488" : "#cbd5e1" }} />
                          <span style={{ fontSize: ".65rem", fontWeight: 700, color: filled ? "#0d9488" : "#94a3b8" }}>{t}</span>
                        </div>
                      )
                    })}
                  </div>

                  <button className="co-save-btn" onClick={handleSave} disabled={saving}>
                    {saving && <span className="co-spin" />}
                    {saving ? "Saving…" : selected.consultation ? "Update Notes" : "💾 Save SOAP Notes"}
                  </button>
                  {saveMsg && <div className="co-success">{saveMsg}</div>}
                  {saveErr && <div className="co-error">{saveErr}</div>}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  )
}
