"use client"

// app/dashboard/prescriptions/page.tsx
// Premium prescription writer — drug autocomplete, live Rx preview,
// template library, interaction checker, print-ready letterhead.

import { useState, useEffect, useCallback, useRef } from "react"
import { useAuthStore } from "@/store/authStore"
import API from "@/lib/api"
import { printPrescription } from "@/lib/printUtils"
import {
  searchMedicines, getMedicineById, checkInteractions,
  FREQUENCY_OPTIONS, DURATION_OPTIONS, DOSE_OPTIONS,
  type Medicine,
} from "@/lib/medicineDb"
import {
  RX_TEMPLATES, TEMPLATE_CATEGORIES, getTemplatesByCategory,
  type RxTemplate,
} from "@/lib/rxTemplates"

// ── Types ─────────────────────────────────────────────────────────────────────
interface RxMedicine {
  medicineId:      string
  name:            string
  brandName:       string
  strength:        string
  dose:            string
  frequency:       string
  duration:        string
  foodInstruction: string
  notes:           string
}

interface Prescription {
  id:            string
  createdAt:     string
  diagnosis:     string
  notes:         string
  instructions:  string
  followUpDate:  string | null
  labTests:      string[]
  medicines:     RxMedicine[]
  patient?:      { id: string; name: string; phone?: string; dob?: string; gender?: string }
  doctor?:       { id: string; name: string; specialization?: string; registrationNo?: string }
}

interface Patient { id: string; name: string; phone?: string; dob?: string; gender?: string }

// ── Helpers ───────────────────────────────────────────────────────────────────
function Skel({ w = "100%", h = "14px" }: { w?: string; h?: string }) {
  return (
    <div style={{ width: w, height: h, borderRadius: 6, background: "linear-gradient(90deg,#f1f5f9 25%,#e2e8f0 50%,#f1f5f9 75%)", backgroundSize: "200% 100%", animation: "shimmer 1.4s infinite" }} />
  )
}

function InteractionAlert({ drug1, drug2 }: { drug1: string; drug2: string }) {
  return (
    <div style={{ background: "rgba(245,158,11,.08)", border: "1px solid rgba(245,158,11,.3)", borderRadius: 8, padding: "8px 12px", display: "flex", alignItems: "center", gap: 8, fontSize: ".75rem", color: "#92400e" }}>
      <span style={{ fontSize: "1rem" }}>⚠️</span>
      <span><strong>{drug1}</strong> + <strong>{drug2}</strong> — potential interaction. Review before prescribing.</span>
    </div>
  )
}

const EMPTY_MED: RxMedicine = {
  medicineId: "", name: "", brandName: "", strength: "", dose: "1 tablet",
  frequency: "Twice daily (BD)", duration: "5 days", foodInstruction: "After meals", notes: "",
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function PrescriptionsPage() {
  const { user, role } = useAuthStore()
  const isDoctor = role() === "doctor"

  // List view state
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([])
  const [loading, setLoading]             = useState(true)
  const [error, setError]                 = useState<string | null>(null)
  const [search, setSearch]               = useState("")
  const [page, setPage]                   = useState(1)
  const [total, setTotal]                 = useState(0)
  const LIMIT = 15

  // Writer modal state
  const [showWriter, setShowWriter]           = useState(false)
  const [writerMode, setWriterMode]           = useState<"create" | "view">("create")
  const [selectedRx, setSelectedRx]           = useState<Prescription | null>(null)
  const [writerTab, setWriterTab]             = useState<"compose" | "templates" | "preview">("compose")

  // Form state
  const [patients, setPatients]               = useState<Patient[]>([])
  const [patientSearch, setPatientSearch]     = useState("")
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null)
  const [diagnosis, setDiagnosis]             = useState("")
  const [notes, setNotes]                     = useState("")
  const [instructions, setInstructions]       = useState("")
  const [followUpDate, setFollowUpDate]       = useState("")
  const [labTests, setLabTests]               = useState<string[]>([""])
  const [medicines, setMedicines]             = useState<RxMedicine[]>([{ ...EMPTY_MED }])
  const [saving, setSaving]                   = useState(false)
  const [saveError, setSaveError]             = useState<string | null>(null)

  // Drug search
  const [drugQuery, setDrugQuery]             = useState<Record<number, string>>({})
  const [drugResults, setDrugResults]         = useState<Record<number, Medicine[]>>({})
  const [drugOpen, setDrugOpen]               = useState<Record<number, boolean>>({})

  // Template picker
  const [templateCat, setTemplateCat]         = useState(TEMPLATE_CATEGORIES[0])

  // Interactions
  const interactions = checkInteractions(medicines.map(m => m.medicineId).filter(Boolean))

  // ── Fetch prescriptions ───────────────────────────────────────────────────
  const fetchRx = useCallback(async () => {
    setLoading(true); setError(null)
    try {
      const params = new URLSearchParams({ page: String(page), limit: String(LIMIT) })
      if (search) params.set("search", search)
      const res = await API.get(`/prescriptions?${params}`)
      const d = res.data as any
      setPrescriptions(Array.isArray(d) ? d : (d?.prescriptions ?? []))
      setTotal(d?.total ?? 0)
    } catch (e: any) {
      setError(e?.response?.data?.message ?? "Failed to load prescriptions")
    } finally {
      setLoading(false)
    }
  }, [page, search])

  useEffect(() => { fetchRx() }, [fetchRx])

  // ── Fetch patients (debounced) ────────────────────────────────────────────
  const patientTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  useEffect(() => {
    if (patientSearch.length < 2) { setPatients([]); return }
    if (patientTimer.current) clearTimeout(patientTimer.current)
    patientTimer.current = setTimeout(async () => {
      try {
        const res = await API.get(`/patients?search=${encodeURIComponent(patientSearch)}&limit=8`)
        const d = res.data as any
        setPatients(Array.isArray(d) ? d : (d?.patients ?? []))
      } catch { setPatients([]) }
    }, 300)
  }, [patientSearch])

  // ── Drug search per row ───────────────────────────────────────────────────
  function handleDrugQuery(idx: number, q: string) {
    setDrugQuery(p => ({ ...p, [idx]: q }))
    setDrugOpen(p => ({ ...p, [idx]: true }))
    setDrugResults(p => ({ ...p, [idx]: searchMedicines(q) }))
  }

  function selectDrug(idx: number, drug: Medicine) {
    setMedicines(prev => prev.map((m, i) => i !== idx ? m : {
      ...m,
      medicineId:      drug.id,
      name:            drug.genericName,
      brandName:       drug.brandNames[0] ?? "",
      strength:        drug.defaultStrength,
      dose:            drug.defaultDose,
      frequency:       drug.defaultFrequency,
      duration:        drug.defaultDuration,
      foodInstruction: drug.foodInstruction,
    }))
    setDrugQuery(p => ({ ...p, [idx]: drug.genericName }))
    setDrugOpen(p => ({ ...p, [idx]: false }))
  }

  // ── Apply template ────────────────────────────────────────────────────────
  function applyTemplate(tpl: RxTemplate) {
    setDiagnosis(tpl.indication)
    setInstructions(tpl.instructions)
    setMedicines(tpl.drugs.map(d => ({
      medicineId:      d.medicineId,
      name:            d.genericName,
      brandName:       d.brandName,
      strength:        d.strength,
      dose:            d.dose,
      frequency:       d.frequency,
      duration:        d.duration,
      foodInstruction: d.foodInstruction,
      notes:           d.notes,
    })))
    const newQ: Record<number, string> = {}
    tpl.drugs.forEach((d, i) => { newQ[i] = d.genericName })
    setDrugQuery(newQ)
    setWriterTab("compose")
  }

  // ── Save prescription ─────────────────────────────────────────────────────
  async function savePrescription() {
    if (!selectedPatient) { setSaveError("Select a patient"); return }
    if (!diagnosis.trim()) { setSaveError("Diagnosis is required"); return }
    if (!medicines[0]?.name) { setSaveError("Add at least one medicine"); return }
    setSaving(true); setSaveError(null)
    try {
      await API.post("/prescriptions", {
        patientId:    selectedPatient.id,
        diagnosis:    diagnosis.trim(),
        notes:        notes.trim(),
        instructions: instructions.trim(),
        followUpDate: followUpDate || null,
        labTests:     labTests.filter(Boolean),
        medicines:    medicines.filter(m => m.name.trim()),
      })
      setShowWriter(false)
      resetForm()
      fetchRx()
    } catch (e: any) {
      setSaveError(e?.response?.data?.message ?? "Failed to save prescription")
    } finally {
      setSaving(false)
    }
  }

  function resetForm() {
    setSelectedPatient(null); setPatientSearch("")
    setDiagnosis(""); setNotes(""); setInstructions(""); setFollowUpDate("")
    setLabTests([""]); setMedicines([{ ...EMPTY_MED }])
    setDrugQuery({}); setDrugResults({}); setDrugOpen({})
    setSaveError(null)
  }

  function openView(rx: Prescription) {
    setSelectedRx(rx); setWriterMode("view"); setShowWriter(true); setWriterTab("preview")
  }

  function openCreate() {
    resetForm(); setWriterMode("create"); setShowWriter(true); setWriterTab("compose")
  }

  function handlePrint(rx: Prescription) {
    printPrescription({
      id:           rx.id,
      createdAt:    rx.createdAt,
      diagnosis:    rx.diagnosis,
      notes:        rx.notes,
      instructions: rx.instructions,
      followUpDate: rx.followUpDate,
      labTests:     rx.labTests,
      medicines:    (rx.medicines ?? []).map(m => ({
        name:            m.name,
        brandName:       m.brandName,
        strength:        m.strength,
        dosage:          m.dose,
        frequency:       m.frequency,
        duration:        m.duration,
        foodInstruction: m.foodInstruction,
        notes:           m.notes,
      })),
      patient: rx.patient,
      doctor:  rx.doctor ?? { name: user?.name ?? "" },
    })
  }

  // Live preview medicines for composer
  const previewRx: Prescription = {
    id: "preview",
    createdAt: new Date().toISOString(),
    diagnosis, notes, instructions, followUpDate: followUpDate || null,
    labTests: labTests.filter(Boolean),
    medicines: medicines.filter(m => m.name.trim()),
    patient: selectedPatient ?? undefined,
    doctor: { id: "", name: user?.name ?? "Doctor", specialization: "Dental Surgeon" },
  }

  const totalPages = Math.ceil(total / LIMIT)

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@700&family=DM+Sans:wght@300;400;500;600&display=swap');
        @keyframes shimmer { to { background-position: -200% 0 } }
        @keyframes fadeIn  { from { opacity:0; transform:translateY(8px) } to { opacity:1; transform:translateY(0) } }
        @keyframes slideUp { from { opacity:0; transform:translateY(20px) } to { opacity:1; transform:translateY(0) } }
        .rx-card:hover { transform: translateY(-2px); box-shadow: 0 8px 30px rgba(10,22,40,.1) !important; }
        .rx-card { transition: transform .18s, box-shadow .18s; }
        .drug-row:hover { background: rgba(13,148,136,.04); }
        .tpl-card:hover { border-color: #0d9488 !important; background: rgba(13,148,136,.03) !important; cursor:pointer; }
        .tpl-card { transition: all .15s; }
        .writer-tab { cursor: pointer; padding: 8px 18px; border-radius: 8px; font-size: .8rem; font-weight: 500; transition: all .15s; border: none; background: none; }
        .writer-tab.active { background: #0a1628; color: #fff; }
        .writer-tab:not(.active) { color: #64748b; }
        .writer-tab:not(.active):hover { background: rgba(10,22,40,.06); }
        .rx-input {
          width: 100%; border: 1px solid #e2e8f0; border-radius: 8px;
          padding: 9px 12px; font-size: .875rem; font-family: 'DM Sans', sans-serif;
          color: #0a1628; background: #fff; outline: none;
          transition: border-color .15s, box-shadow .15s;
        }
        .rx-input:focus { border-color: #0d9488; box-shadow: 0 0 0 3px rgba(13,148,136,.12); }
        .rx-select {
          border: 1px solid #e2e8f0; border-radius: 8px; padding: 8px 12px;
          font-size: .8rem; font-family: 'DM Sans', sans-serif; color: #0a1628;
          background: #fff; outline: none; cursor: pointer;
          transition: border-color .15s;
        }
        .rx-select:focus { border-color: #0d9488; }
        .dd-item:hover { background: rgba(13,148,136,.08); }
        .section-hd { font-size: .7rem; font-weight: 700; text-transform: uppercase; letter-spacing: .12em; color: #94a3b8; margin-bottom: 10px; }
        @media(max-width:640px) {
          .rx-toolbar { flex-direction:column !important; align-items:stretch !important; }
          .rx-search  { max-width:100% !important; flex:1 !important; }
          .rx-add-btn { width:100% !important; justify-content:center !important; margin-left:0 !important; }
        }
        @media(max-width:480px) {
          .rx-grid-2col { grid-template-columns:1fr !important; }
          .rx-grid-4col { grid-template-columns:1fr 1fr !important; }
        }
      `}</style>

      <div style={{ fontFamily: "'DM Sans', sans-serif" }}>

        {/* Page Header */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 24 }}>
          <div>
            <h1 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "1.9rem", fontWeight: 700, color: "#0a1628", margin: 0 }}>
              Prescriptions
            </h1>
            <p style={{ fontSize: ".84rem", color: "#64748b", margin: "4px 0 0" }}>
              Write and manage patient prescriptions
            </p>
          </div>
          {isDoctor && (
            <button
              onClick={openCreate}
              style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 20px", borderRadius: 10, background: "linear-gradient(135deg,#0d9488,#0a7a6e)", color: "#fff", border: "none", cursor: "pointer", fontFamily: "'DM Sans', sans-serif", fontWeight: 600, fontSize: ".875rem", boxShadow: "0 4px 14px rgba(13,148,136,.3)" }}
            >
              <span style={{ fontSize: "1.1rem" }}>＋</span> New Prescription
            </button>
          )}
        </div>

        {/* Search */}
        <div style={{ marginBottom: 20 }}>
          <input
            className="rx-input"
            style={{ maxWidth: 400 }}
            placeholder="🔍  Search by patient or diagnosis..."
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1) }}
          />
        </div>

        {/* Error */}
        {error && (
          <div style={{ padding: "12px 16px", borderRadius: 12, background: "rgba(220,38,38,.06)", border: "1px solid rgba(220,38,38,.2)", color: "#dc2626", fontSize: ".84rem", marginBottom: 20, display: "flex", justifyContent: "space-between" }}>
            {error}
            <button onClick={fetchRx} style={{ border: "none", background: "none", color: "#dc2626", fontWeight: 600, cursor: "pointer" }}>Retry</button>
          </div>
        )}

        {/* Prescription List */}
        {loading ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} style={{ background: "#fff", borderRadius: 14, border: "1px solid rgba(10,22,40,.07)", padding: "18px 20px" }}>
                <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
                  <Skel w="44px" h="44px" />
                  <div style={{ flex: 1 }}><Skel w="40%" h="14px" /><div style={{ marginTop: 6 }}><Skel w="60%" h="11px" /></div></div>
                  <Skel w="80px" h="28px" />
                </div>
              </div>
            ))}
          </div>
        ) : prescriptions.length === 0 ? (
          <div style={{ textAlign: "center", padding: "60px 20px", color: "#94a3b8" }}>
            <div style={{ fontSize: "3rem", marginBottom: 12 }}>💊</div>
            <div style={{ fontSize: "1rem", fontWeight: 600, color: "#64748b" }}>No prescriptions found</div>
            {isDoctor && <div style={{ fontSize: ".84rem", marginTop: 8 }}>Click "New Prescription" to write the first one.</div>}
          </div>
        ) : (
          <>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {prescriptions.map((rx, i) => (
                <div
                  key={rx.id}
                  className="rx-card"
                  style={{ background: "#fff", borderRadius: 14, border: "1px solid rgba(10,22,40,.07)", padding: "16px 20px", display: "flex", alignItems: "center", gap: 16, boxShadow: "0 2px 8px rgba(10,22,40,.04)", animation: `fadeIn .2s ease ${i * 30}ms both` }}
                >
                  <div style={{ width: 44, height: 44, borderRadius: 12, background: "linear-gradient(135deg,rgba(13,148,136,.12),rgba(13,148,136,.05))", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontSize: "1.2rem", fontWeight: 700, color: "#0d9488", fontFamily: "Georgia, serif" }}>
                    ℞
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
                      <span style={{ fontSize: ".9rem", fontWeight: 600, color: "#0a1628" }}>{rx.patient?.name ?? "—"}</span>
                      <span style={{ fontSize: ".7rem", color: "#94a3b8" }}>
                        {new Date(rx.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                      </span>
                    </div>
                    <div style={{ fontSize: ".8rem", color: "#64748b", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{rx.diagnosis}</div>
                    <div style={{ display: "flex", gap: 6, marginTop: 6, flexWrap: "wrap" }}>
                      {(rx.medicines ?? []).slice(0, 4).map((m, j) => (
                        <span key={j} style={{ background: "rgba(13,148,136,.08)", color: "#0d9488", borderRadius: 20, padding: "2px 8px", fontSize: ".68rem", fontWeight: 600 }}>
                          {m.name} {m.strength}
                        </span>
                      ))}
                      {(rx.medicines ?? []).length > 4 && (
                        <span style={{ background: "#f1f5f9", color: "#64748b", borderRadius: 20, padding: "2px 8px", fontSize: ".68rem" }}>+{rx.medicines.length - 4} more</span>
                      )}
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                    <button onClick={() => openView(rx)} style={{ padding: "7px 14px", borderRadius: 8, border: "1px solid rgba(10,22,40,.1)", background: "#fff", cursor: "pointer", fontSize: ".75rem", fontWeight: 600, color: "#0a1628", fontFamily: "'DM Sans', sans-serif" }}>View</button>
                    <button onClick={() => handlePrint(rx)} style={{ padding: "7px 14px", borderRadius: 8, border: "none", background: "#0d9488", color: "#fff", cursor: "pointer", fontSize: ".75rem", fontWeight: 600, fontFamily: "'DM Sans', sans-serif" }}>🖨 Print</button>
                  </div>
                </div>
              ))}
            </div>
            {totalPages > 1 && (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginTop: 20 }}>
                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} style={{ padding: "7px 14px", borderRadius: 8, border: "1px solid #e2e8f0", background: "#fff", cursor: page === 1 ? "not-allowed" : "pointer", fontSize: ".8rem", opacity: page === 1 ? .5 : 1 }}>‹ Prev</button>
                <span style={{ fontSize: ".8rem", color: "#64748b" }}>Page {page} of {totalPages}</span>
                <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} style={{ padding: "7px 14px", borderRadius: 8, border: "1px solid #e2e8f0", background: "#fff", cursor: page === totalPages ? "not-allowed" : "pointer", fontSize: ".8rem", opacity: page === totalPages ? .5 : 1 }}>Next ›</button>
              </div>
            )}
          </>
        )}
      </div>

      {/* ── Writer / Viewer Modal ───────────────────────────────────────────── */}
      {showWriter && (
        <div
          style={{ position: "fixed", inset: 0, background: "rgba(10,22,40,.6)", zIndex: 400, display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "20px 16px", overflowY: "auto" }}
          onClick={e => { if (e.target === e.currentTarget) { setShowWriter(false); resetForm() } }}
        >
          <div style={{ background: "#fff", borderRadius: 20, width: "100%", maxWidth: 960, boxShadow: "0 24px 80px rgba(10,22,40,.25)", animation: "slideUp .3s ease", margin: "auto" }}>

            {/* Modal Header */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "18px 24px", borderBottom: "1px solid #f1f5f9" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: "linear-gradient(135deg,#0d9488,#065f4a)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontFamily: "Georgia", fontSize: "1.1rem", fontWeight: 700 }}>℞</div>
                <div>
                  <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "1.2rem", fontWeight: 700, color: "#0a1628" }}>
                    {writerMode === "create" ? "New Prescription" : "Prescription Details"}
                  </div>
                  {writerMode === "view" && selectedRx && (
                    <div style={{ fontSize: ".72rem", color: "#94a3b8" }}>{selectedRx.patient?.name} · {new Date(selectedRx.createdAt).toLocaleDateString("en-IN")}</div>
                  )}
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                {writerMode === "view" && selectedRx && (
                  <button onClick={() => handlePrint(selectedRx)} style={{ padding: "8px 16px", borderRadius: 9, background: "#0d9488", color: "#fff", border: "none", cursor: "pointer", fontWeight: 600, fontSize: ".8rem", fontFamily: "'DM Sans', sans-serif" }}>🖨 Print Rx</button>
                )}
                <button onClick={() => { setShowWriter(false); resetForm() }} style={{ width: 32, height: 32, borderRadius: 8, background: "rgba(10,22,40,.06)", border: "none", cursor: "pointer", fontSize: "1rem", color: "#64748b" }}>✕</button>
              </div>
            </div>

            {/* Tab Bar */}
            {writerMode === "create" && (
              <div style={{ display: "flex", gap: 4, padding: "12px 24px 0", borderBottom: "1px solid #f1f5f9" }}>
                {(["compose", "templates", "preview"] as const).map(t => (
                  <button key={t} className={`writer-tab${writerTab === t ? " active" : ""}`} onClick={() => setWriterTab(t)} style={{ fontFamily: "'DM Sans', sans-serif" }}>
                    {t === "compose" ? "✏️ Compose" : t === "templates" ? "📋 Templates" : "👁 Preview"}
                  </button>
                ))}
              </div>
            )}

            {/* Body */}
            <div style={{ padding: "24px", maxHeight: "76vh", overflowY: "auto" }}>

              {/* VIEW MODE */}
              {writerMode === "view" && selectedRx && (
                <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                    <div style={{ background: "#f8fafc", borderRadius: 10, padding: "16px" }}>
                      <div className="section-hd">Patient</div>
                      <div style={{ fontSize: ".9rem", fontWeight: 700, color: "#0a1628" }}>{selectedRx.patient?.name ?? "—"}</div>
                      {selectedRx.patient?.phone && <div style={{ fontSize: ".8rem", color: "#64748b", marginTop: 4 }}>{selectedRx.patient.phone}</div>}
                    </div>
                    <div style={{ background: "#f8fafc", borderRadius: 10, padding: "16px" }}>
                      <div className="section-hd">Doctor</div>
                      <div style={{ fontSize: ".9rem", fontWeight: 700, color: "#0a1628" }}>Dr. {selectedRx.doctor?.name ?? "—"}</div>
                      {selectedRx.followUpDate && <div style={{ fontSize: ".8rem", color: "#0d9488", marginTop: 4 }}>Follow-up: {new Date(selectedRx.followUpDate).toLocaleDateString("en-IN")}</div>}
                    </div>
                  </div>
                  <div>
                    <div className="section-hd">Diagnosis</div>
                    <div style={{ background: "#f8fafc", borderRadius: 8, padding: "12px 14px", borderLeft: "3px solid #0d9488", fontSize: ".875rem" }}>{selectedRx.diagnosis}</div>
                  </div>
                  {(selectedRx.medicines ?? []).length > 0 && (
                    <div>
                      <div className="section-hd">Medications ({selectedRx.medicines.length})</div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                        {selectedRx.medicines.map((m, i) => (
                          <div key={i} style={{ background: "#f8fafc", borderRadius: 10, padding: "14px 16px", border: "1px solid #e2e8f0" }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                              <div>
                                <span style={{ fontSize: ".875rem", fontWeight: 700, color: "#0a1628" }}>{m.name}</span>
                                {m.strength && <span style={{ fontSize: ".8rem", color: "#64748b", marginLeft: 8 }}>{m.strength}</span>}
                                {m.brandName && <span style={{ fontSize: ".72rem", color: "#94a3b8", marginLeft: 8 }}>({m.brandName})</span>}
                              </div>
                              <span style={{ background: "rgba(13,148,136,.1)", color: "#0d9488", borderRadius: 20, padding: "2px 10px", fontSize: ".7rem", fontWeight: 700 }}>{m.duration}</span>
                            </div>
                            <div style={{ display: "flex", gap: 16, marginTop: 8, fontSize: ".78rem", color: "#64748b" }}>
                              <span>💊 {m.dose}</span><span>🕐 {m.frequency}</span>
                              {m.foodInstruction && <span>🍽 {m.foodInstruction}</span>}
                            </div>
                            {m.notes && <div style={{ marginTop: 6, fontSize: ".75rem", color: "#94a3b8", fontStyle: "italic" }}>{m.notes}</div>}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {(selectedRx.labTests ?? []).filter(Boolean).length > 0 && (
                    <div>
                      <div className="section-hd">Lab Tests</div>
                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                        {selectedRx.labTests.filter(Boolean).map((t, i) => (
                          <span key={i} style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 20, padding: "4px 12px", fontSize: ".78rem", color: "#15803d", fontWeight: 600 }}>🔬 {t}</span>
                        ))}
                      </div>
                    </div>
                  )}
                  {selectedRx.instructions && (
                    <div>
                      <div className="section-hd">Patient Instructions</div>
                      <div style={{ background: "#f8fafc", borderRadius: 8, padding: "12px 14px", fontSize: ".84rem", color: "#374151", whiteSpace: "pre-wrap", lineHeight: 1.7 }}>{selectedRx.instructions}</div>
                    </div>
                  )}
                  {selectedRx.notes && (
                    <div>
                      <div className="section-hd">Clinical Notes</div>
                      <div style={{ background: "#f8fafc", borderRadius: 8, padding: "12px 14px", fontSize: ".84rem", color: "#374151" }}>{selectedRx.notes}</div>
                    </div>
                  )}
                </div>
              )}

              {/* TEMPLATES TAB */}
              {writerMode === "create" && writerTab === "templates" && (
                <div>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 20 }}>
                    {TEMPLATE_CATEGORIES.map(cat => (
                      <button key={cat} onClick={() => setTemplateCat(cat)} style={{ padding: "6px 14px", borderRadius: 20, border: "1px solid", borderColor: templateCat === cat ? "#0d9488" : "#e2e8f0", background: templateCat === cat ? "rgba(13,148,136,.1)" : "#fff", color: templateCat === cat ? "#0d9488" : "#64748b", fontSize: ".75rem", fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>{cat}</button>
                    ))}
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 12 }}>
                    {getTemplatesByCategory(templateCat).map(tpl => (
                      <div key={tpl.id} className="tpl-card" onClick={() => applyTemplate(tpl)} style={{ background: "#f8fafc", borderRadius: 12, border: "1px solid #e2e8f0", padding: "16px" }}>
                        <div style={{ display: "flex", alignItems: "flex-start", gap: 10, marginBottom: 10 }}>
                          <span style={{ fontSize: "1.4rem" }}>{tpl.icon}</span>
                          <div>
                            <div style={{ fontSize: ".875rem", fontWeight: 700, color: "#0a1628" }}>{tpl.name}</div>
                            <div style={{ fontSize: ".72rem", color: "#64748b", marginTop: 2 }}>{tpl.description}</div>
                          </div>
                        </div>
                        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                          {tpl.drugs.slice(0, 3).map((d, i) => (
                            <span key={i} style={{ background: "rgba(13,148,136,.08)", color: "#0d9488", borderRadius: 20, padding: "2px 8px", fontSize: ".65rem", fontWeight: 600 }}>{d.genericName}</span>
                          ))}
                          {tpl.drugs.length > 3 && <span style={{ background: "#f1f5f9", color: "#64748b", borderRadius: 20, padding: "2px 8px", fontSize: ".65rem" }}>+{tpl.drugs.length - 3} more</span>}
                        </div>
                        <div style={{ marginTop: 10, fontSize: ".7rem", color: "#94a3b8", textAlign: "right", fontWeight: 600 }}>Click to apply →</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* PREVIEW TAB */}
              {writerMode === "create" && writerTab === "preview" && (
                <div style={{ background: "#f8fafc", borderRadius: 12, padding: "20px", border: "1px solid #e2e8f0" }}>
                  <div style={{ fontFamily: "Georgia, serif", fontSize: "1.3rem", fontWeight: 700, color: "#0a1628", marginBottom: 4 }}>🦷 DentalCare</div>
                  <div style={{ fontSize: ".65rem", letterSpacing: ".15em", textTransform: "uppercase", color: "#0d9488", marginBottom: 16 }}>Prescription Preview</div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
                    <div style={{ background: "#fff", borderRadius: 8, padding: "12px", border: "1px solid #e2e8f0" }}>
                      <div className="section-hd">Patient</div>
                      <div style={{ fontWeight: 700 }}>{previewRx.patient?.name ?? "—"}</div>
                    </div>
                    <div style={{ background: "#fff", borderRadius: 8, padding: "12px", border: "1px solid #e2e8f0" }}>
                      <div className="section-hd">Doctor</div>
                      <div style={{ fontWeight: 700 }}>Dr. {user?.name ?? "—"}</div>
                      {followUpDate && <div style={{ fontSize: ".75rem", color: "#0d9488", marginTop: 2 }}>Follow-up: {new Date(followUpDate).toLocaleDateString("en-IN")}</div>}
                    </div>
                  </div>
                  {diagnosis && (
                    <div style={{ marginBottom: 12 }}>
                      <div className="section-hd">Diagnosis</div>
                      <div style={{ background: "#fff", borderRadius: 8, padding: "10px 12px", borderLeft: "3px solid #0d9488", fontSize: ".84rem" }}>{diagnosis}</div>
                    </div>
                  )}
                  {previewRx.medicines.length > 0 && (
                    <div style={{ marginBottom: 12 }}>
                      <div className="section-hd">Medications</div>
                      {previewRx.medicines.map((m, i) => (
                        <div key={i} style={{ background: "#fff", borderRadius: 8, padding: "10px 12px", border: "1px solid #e2e8f0", marginBottom: 6, fontSize: ".84rem" }}>
                          <strong>{m.name}</strong>{m.strength && ` ${m.strength}`} — {m.dose}, {m.frequency} × {m.duration}
                          {m.foodInstruction && <span style={{ color: "#0d9488", fontSize: ".75rem" }}> · {m.foodInstruction}</span>}
                        </div>
                      ))}
                    </div>
                  )}
                  {previewRx.labTests.length > 0 && (
                    <div>
                      <div className="section-hd">Lab Tests</div>
                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                        {previewRx.labTests.map((t, i) => (
                          <span key={i} style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 20, padding: "3px 10px", fontSize: ".75rem", color: "#15803d" }}>🔬 {t}</span>
                        ))}
                      </div>
                    </div>
                  )}
                  {!diagnosis && previewRx.medicines.length === 0 && (
                    <div style={{ textAlign: "center", color: "#94a3b8", padding: "32px", fontSize: ".85rem" }}>Start composing to see the preview here</div>
                  )}
                </div>
              )}

              {/* COMPOSE TAB */}
              {writerMode === "create" && writerTab === "compose" && (
                <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>

                  {/* Patient */}
                  <div>
                    <div className="section-hd">Patient *</div>
                    {selectedPatient ? (
                      <div style={{ display: "flex", alignItems: "center", gap: 10, background: "rgba(13,148,136,.06)", borderRadius: 10, padding: "12px 14px", border: "1px solid rgba(13,148,136,.2)" }}>
                        <div style={{ width: 36, height: 36, borderRadius: "50%", background: "linear-gradient(135deg,#0d9488,#065f4a)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 700, fontSize: ".85rem" }}>{selectedPatient.name.charAt(0)}</div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 600, color: "#0a1628" }}>{selectedPatient.name}</div>
                          {selectedPatient.phone && <div style={{ fontSize: ".75rem", color: "#64748b" }}>{selectedPatient.phone}</div>}
                        </div>
                        <button onClick={() => { setSelectedPatient(null); setPatientSearch("") }} style={{ width: 28, height: 28, borderRadius: 8, border: "none", background: "rgba(10,22,40,.08)", cursor: "pointer", color: "#64748b" }}>✕</button>
                      </div>
                    ) : (
                      <div style={{ position: "relative" }}>
                        <input className="rx-input" placeholder="Search patient by name or phone..." value={patientSearch} onChange={e => setPatientSearch(e.target.value)} />
                        {patients.length > 0 && (
                          <div style={{ position: "absolute", top: "100%", left: 0, right: 0, background: "#fff", borderRadius: 10, border: "1px solid #e2e8f0", boxShadow: "0 8px 30px rgba(10,22,40,.12)", zIndex: 50, marginTop: 4, overflow: "hidden" }}>
                            {patients.map(p => (
                              <div key={p.id} className="dd-item" onClick={() => { setSelectedPatient(p); setPatientSearch(""); setPatients([]) }} style={{ padding: "10px 14px", cursor: "pointer", display: "flex", alignItems: "center", gap: 10 }}>
                                <div style={{ width: 30, height: 30, borderRadius: "50%", background: "rgba(13,148,136,.1)", display: "flex", alignItems: "center", justifyContent: "center", color: "#0d9488", fontWeight: 700, fontSize: ".8rem" }}>{p.name.charAt(0)}</div>
                                <div>
                                  <div style={{ fontSize: ".875rem", fontWeight: 600, color: "#0a1628" }}>{p.name}</div>
                                  {p.phone && <div style={{ fontSize: ".72rem", color: "#94a3b8" }}>{p.phone}</div>}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Diagnosis */}
                  <div>
                    <div className="section-hd">Diagnosis *</div>
                    <textarea className="rx-input" rows={2} placeholder="Enter clinical diagnosis..." value={diagnosis} onChange={e => setDiagnosis(e.target.value)} style={{ resize: "vertical" }} />
                  </div>

                  {/* Interaction Alerts */}
                  {interactions.length > 0 && (
                    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                      {interactions.map((ix, i) => <InteractionAlert key={i} drug1={ix.drug1} drug2={ix.drug2} />)}
                    </div>
                  )}

                  {/* Medicines */}
                  <div>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                      <div className="section-hd" style={{ margin: 0 }}>Medications *</div>
                      <button onClick={() => setMedicines(p => [...p, { ...EMPTY_MED }])} style={{ display: "flex", alignItems: "center", gap: 5, padding: "5px 12px", borderRadius: 8, border: "1px solid rgba(13,148,136,.3)", background: "rgba(13,148,136,.08)", color: "#0d9488", cursor: "pointer", fontSize: ".75rem", fontWeight: 600, fontFamily: "'DM Sans', sans-serif" }}>＋ Add Medicine</button>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                      {medicines.map((med, idx) => {
                        const info = med.medicineId ? getMedicineById(med.medicineId) : undefined
                        return (
                          <div key={idx} className="drug-row" style={{ background: "#f8fafc", borderRadius: 12, padding: "16px", border: "1px solid #e2e8f0" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                              <span style={{ background: "rgba(13,148,136,.12)", color: "#0d9488", borderRadius: 20, padding: "2px 8px", fontSize: ".7rem", fontWeight: 700 }}>Rx {idx + 1}</span>
                              <div style={{ flex: 1 }} />
                              {medicines.length > 1 && (
                                <button onClick={() => setMedicines(p => p.filter((_, i) => i !== idx))} style={{ width: 24, height: 24, borderRadius: 6, border: "none", background: "rgba(220,38,38,.08)", color: "#dc2626", cursor: "pointer", fontSize: ".8rem" }}>✕</button>
                              )}
                            </div>
                            {/* Drug search */}
                            <div style={{ position: "relative", marginBottom: 10 }}>
                              <input
                                className="rx-input"
                                placeholder="🔍 Search medicine by name, brand, or drug class..."
                                value={drugQuery[idx] ?? med.name}
                                onChange={e => handleDrugQuery(idx, e.target.value)}
                                onFocus={() => { if ((drugQuery[idx] ?? "").length >= 2) setDrugOpen(p => ({ ...p, [idx]: true })) }}
                              />
                              {drugOpen[idx] && (drugResults[idx] ?? []).length > 0 && (
                                <div style={{ position: "absolute", top: "100%", left: 0, right: 0, background: "#fff", borderRadius: 10, border: "1px solid #e2e8f0", boxShadow: "0 8px 30px rgba(10,22,40,.15)", zIndex: 60, marginTop: 4, overflow: "hidden" }}>
                                  {drugResults[idx].map(drug => (
                                    <div key={drug.id} className="dd-item" onClick={() => selectDrug(idx, drug)} style={{ padding: "10px 14px", cursor: "pointer", borderBottom: "1px solid #f1f5f9" }}>
                                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                                        <div style={{ flex: 1 }}>
                                          <div style={{ fontSize: ".875rem", fontWeight: 700, color: "#0a1628" }}>{drug.genericName} <span style={{ fontWeight: 400, color: "#64748b", fontSize: ".78rem" }}>{drug.defaultStrength}</span></div>
                                          <div style={{ fontSize: ".72rem", color: "#94a3b8" }}>{drug.brandNames.slice(0, 2).join(", ")} · {drug.drugClass}</div>
                                        </div>
                                        <span style={{ background: "rgba(13,148,136,.08)", color: "#0d9488", borderRadius: 6, padding: "2px 8px", fontSize: ".68rem", fontWeight: 600, flexShrink: 0 }}>{drug.route}</span>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                            {/* Drug info banner */}
                            {info && (
                              <div style={{ background: "rgba(13,148,136,.06)", borderRadius: 8, padding: "8px 12px", marginBottom: 10, fontSize: ".72rem", color: "#0d9488", display: "flex", gap: 12, flexWrap: "wrap" }}>
                                <span>🏷 {info.category}</span>
                                <span>📍 {info.route}</span>
                                {info.contraindications.slice(0, 2).map((c, ci) => <span key={ci} style={{ color: "#dc2626" }}>⚠️ {c}</span>)}
                              </div>
                            )}
                            {/* Fields */}
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 8, marginBottom: 8 }}>
                              <div>
                                <div style={{ fontSize: ".65rem", color: "#94a3b8", marginBottom: 4, fontWeight: 600 }}>STRENGTH</div>
                                <input className="rx-input" placeholder="500mg" value={med.strength} onChange={e => setMedicines(p => p.map((m, i) => i === idx ? { ...m, strength: e.target.value } : m))} />
                              </div>
                              <div>
                                <div style={{ fontSize: ".65rem", color: "#94a3b8", marginBottom: 4, fontWeight: 600 }}>DOSE</div>
                                <select className="rx-select" style={{ width: "100%" }} value={med.dose} onChange={e => setMedicines(p => p.map((m, i) => i === idx ? { ...m, dose: e.target.value } : m))}>
                                  {DOSE_OPTIONS.map(d => <option key={d}>{d}</option>)}
                                </select>
                              </div>
                              <div>
                                <div style={{ fontSize: ".65rem", color: "#94a3b8", marginBottom: 4, fontWeight: 600 }}>FREQUENCY</div>
                                <select className="rx-select" style={{ width: "100%" }} value={med.frequency} onChange={e => setMedicines(p => p.map((m, i) => i === idx ? { ...m, frequency: e.target.value } : m))}>
                                  {FREQUENCY_OPTIONS.map(f => <option key={f}>{f}</option>)}
                                </select>
                              </div>
                              <div>
                                <div style={{ fontSize: ".65rem", color: "#94a3b8", marginBottom: 4, fontWeight: 600 }}>DURATION</div>
                                <select className="rx-select" style={{ width: "100%" }} value={med.duration} onChange={e => setMedicines(p => p.map((m, i) => i === idx ? { ...m, duration: e.target.value } : m))}>
                                  {DURATION_OPTIONS.map(d => <option key={d}>{d}</option>)}
                                </select>
                              </div>
                            </div>
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                              <div>
                                <div style={{ fontSize: ".65rem", color: "#94a3b8", marginBottom: 4, fontWeight: 600 }}>FOOD INSTRUCTION</div>
                                <select className="rx-select" style={{ width: "100%" }} value={med.foodInstruction} onChange={e => setMedicines(p => p.map((m, i) => i === idx ? { ...m, foodInstruction: e.target.value } : m))}>
                                  {["After meals", "Before meals", "With food", "Empty stomach", "At bedtime", "With or without food"].map(f => <option key={f}>{f}</option>)}
                                </select>
                              </div>
                              <div>
                                <div style={{ fontSize: ".65rem", color: "#94a3b8", marginBottom: 4, fontWeight: 600 }}>SPECIAL NOTES</div>
                                <input className="rx-input" placeholder="e.g. Avoid alcohol" value={med.notes} onChange={e => setMedicines(p => p.map((m, i) => i === idx ? { ...m, notes: e.target.value } : m))} />
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>

                  {/* Lab Tests */}
                  <div>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                      <div className="section-hd" style={{ margin: 0 }}>Lab Investigations</div>
                      <button onClick={() => setLabTests(p => [...p, ""])} style={{ padding: "4px 10px", borderRadius: 8, border: "1px solid #e2e8f0", background: "#fff", cursor: "pointer", fontSize: ".72rem", color: "#64748b", fontFamily: "'DM Sans', sans-serif" }}>＋ Add test</button>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      {labTests.map((t, i) => (
                        <div key={i} style={{ display: "flex", gap: 8 }}>
                          <input className="rx-input" placeholder="e.g. CBC, Blood Glucose, OPG X-ray" value={t} onChange={e => setLabTests(p => p.map((v, j) => j === i ? e.target.value : v))} />
                          {labTests.length > 1 && <button onClick={() => setLabTests(p => p.filter((_, j) => j !== i))} style={{ width: 36, height: 36, borderRadius: 8, border: "none", background: "rgba(220,38,38,.06)", color: "#dc2626", cursor: "pointer", flexShrink: 0 }}>✕</button>}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Instructions + Notes + Follow-up */}
                  <div>
                    <div className="section-hd">Patient Instructions</div>
                    <textarea className="rx-input" rows={3} placeholder="e.g. Bite on gauze for 30 min, avoid hot beverages..." value={instructions} onChange={e => setInstructions(e.target.value)} style={{ resize: "vertical" }} />
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 16, alignItems: "start" }}>
                    <div>
                      <div className="section-hd">Clinical Notes</div>
                      <textarea className="rx-input" rows={2} placeholder="Internal notes (not printed)..." value={notes} onChange={e => setNotes(e.target.value)} style={{ resize: "vertical" }} />
                    </div>
                    <div>
                      <div className="section-hd">Follow-up Date</div>
                      <input type="date" className="rx-input" style={{ width: 180 }} value={followUpDate} onChange={e => setFollowUpDate(e.target.value)} min={new Date().toISOString().split("T")[0]} />
                    </div>
                  </div>

                  {saveError && (
                    <div style={{ padding: "10px 14px", borderRadius: 8, background: "rgba(220,38,38,.06)", border: "1px solid rgba(220,38,38,.2)", color: "#dc2626", fontSize: ".84rem" }}>{saveError}</div>
                  )}

                  {/* Actions */}
                  <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", borderTop: "1px solid #f1f5f9", paddingTop: 16 }}>
                    <button onClick={() => setWriterTab("preview")} style={{ padding: "10px 20px", borderRadius: 10, border: "1px solid #e2e8f0", background: "#fff", cursor: "pointer", fontSize: ".875rem", fontWeight: 600, color: "#0a1628", fontFamily: "'DM Sans', sans-serif" }}>Preview Rx</button>
                    <button
                      onClick={savePrescription}
                      disabled={saving}
                      style={{ padding: "10px 24px", borderRadius: 10, border: "none", background: saving ? "#94a3b8" : "linear-gradient(135deg,#0d9488,#0a7a6e)", color: "#fff", cursor: saving ? "not-allowed" : "pointer", fontSize: ".875rem", fontWeight: 600, fontFamily: "'DM Sans', sans-serif", boxShadow: saving ? "none" : "0 4px 14px rgba(13,148,136,.3)" }}
                    >
                      {saving ? "Saving..." : "💾 Save Prescription"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
