"use client"

// app/(dashboard)/dashboard/waitlist/page.tsx
// Real-time waitlist of all checked-in patients with queue management
//
// API:
//   GET  /api/checkin/waitlist          → checked_in patients in order
//   GET  /api/checkin/completed         → completed today
//   POST /api/checkin/queue/next        → call next patient
//   PUT  /api/checkin/:id/status        → update individual status

import { useState, useEffect, useCallback, useRef } from "react"
import { useAuthStore } from "@/store/authStore"
import API from "@/lib/api"

// ── Types ─────────────────────────────────────────────────────────────────────
interface WaitlistItem {
  id:            string
  patientId:     string
  time:          string
  status:        string
  notes?:        string
  position:      number
  estimatedWait: number
  patient:       { id: string; name: string; phone?: string; dob?: string; bloodGroup?: string; allergies?: string[] }
  doctor:        { id: string; name: string; specialty?: string }
  service?:      { id: string; name: string } | null
}

interface CompletedItem extends Omit<WaitlistItem, "position" | "estimatedWait"> {
  updatedAt: string
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function getInitials(name: string) {
  return name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()
}
function calcAge(dob?: string) {
  if (!dob) return null
  return `${Math.floor((Date.now() - new Date(dob).getTime()) / (365.25 * 24 * 60 * 60 * 1000))}y`
}
function formatTime(d: string) {
  return new Date(d).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })
}
function Skel({ w = "100%", h = "14px", r = "6px" }: { w?: string; h?: string; r?: string }) {
  return <div style={{ width: w, height: h, borderRadius: r, background: "linear-gradient(90deg,#f1f5f9 25%,#e2e8f0 50%,#f1f5f9 75%)", backgroundSize: "200% 100%", animation: "shimmer 1.4s infinite" }} />
}

// ── Waitlist Card ─────────────────────────────────────────────────────────────
function WaitlistCard({ item, onCall, onCancel, calling, cancelling, canEdit }: {
  item:       WaitlistItem
  onCall:     (id: string) => void
  onCancel:   (id: string) => void
  calling:    boolean
  cancelling: boolean
  canEdit:    boolean
}) {
  const isFirst = item.position === 1
  const age     = calcAge(item.patient.dob)

  return (
    <div style={{
      background: "#fff", borderRadius: 18,
      border: `1px solid ${isFirst ? "rgba(13,148,136,.3)" : "rgba(10,22,40,.07)"}`,
      boxShadow: isFirst ? "0 0 0 3px rgba(13,148,136,.1), 0 4px 20px rgba(10,22,40,.08)" : "0 2px 10px rgba(10,22,40,.05)",
      overflow: "hidden", animation: "fadeIn .3s ease both",
      position: "relative",
    }}>
      {/* Position indicator */}
      <div style={{
        position: "absolute", top: 0, left: 0, bottom: 0, width: 4,
        background: isFirst ? "#0d9488" : item.position <= 3 ? "#f59e0b" : "#e2e8f0",
      }} />

      <div style={{ padding: "16px 18px 16px 22px" }}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
          {/* Position number */}
          <div style={{
            width: 44, height: 44, borderRadius: "50%", flexShrink: 0,
            background: isFirst ? "linear-gradient(135deg,#0d9488,#0a1628)" : "rgba(10,22,40,.06)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontFamily: "'Cormorant Garamond',serif", fontSize: isFirst ? "1rem" : ".85rem", fontWeight: 700,
            color: isFirst ? "#fff" : "#94a3b8",
            boxShadow: isFirst ? "0 4px 14px rgba(13,148,136,.3)" : "none",
          }}>
            {isFirst ? "NEXT" : `#${item.position}`}
          </div>

          {/* Patient info */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 3 }}>
              <span style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: "1.05rem", fontWeight: 700, color: "#0a1628" }}>{item.patient.name}</span>
              {item.patient.bloodGroup && (
                <span style={{ fontSize: ".66rem", fontWeight: 700, color: "#ef4444", background: "rgba(239,68,68,.1)", padding: "1px 7px", borderRadius: 50 }}>{item.patient.bloodGroup}</span>
              )}
              {isFirst && (
                <span style={{ fontSize: ".66rem", fontWeight: 700, color: "#0d9488", background: "rgba(13,148,136,.1)", padding: "1px 8px", borderRadius: 50, letterSpacing: ".05em", textTransform: "uppercase" }}>Next Up</span>
              )}
            </div>

            <div style={{ fontSize: ".75rem", color: "#64748b" }}>
              {item.patient.phone ?? "—"}{age ? ` · ${age}` : ""} · {item.service?.name ?? "General"} · {item.doctor.name}
            </div>

            {item.patient.allergies && item.patient.allergies.length > 0 && (
              <div style={{ marginTop: 5 }}>
                {item.patient.allergies.map(a => (
                  <span key={a} style={{ display: "inline-block", fontSize: ".63rem", fontWeight: 600, color: "#ef4444", background: "rgba(239,68,68,.08)", padding: "1px 6px", borderRadius: 50, marginRight: 4 }}>⚠️ {a}</span>
                ))}
              </div>
            )}

            {item.notes && (
              <div style={{ marginTop: 6, fontSize: ".75rem", color: "#475569", background: "rgba(10,22,40,.03)", borderRadius: 7, padding: "5px 9px", fontStyle: "italic" }}>
                "{item.notes}"
              </div>
            )}
          </div>

          {/* Wait time + check-in time */}
          <div style={{ flexShrink: 0, textAlign: "right" }}>
            <div style={{ fontSize: ".88rem", fontWeight: 700, color: "#0d9488" }}>{item.time}</div>
            <div style={{ fontSize: ".72rem", color: "#94a3b8", marginTop: 2 }}>
              ~{item.estimatedWait}m wait
            </div>
          </div>
        </div>

        {/* Action buttons — admin/receptionist only */}
        {canEdit && (
          <div style={{ display: "flex", gap: 8, marginTop: 14, paddingTop: 12, borderTop: "1px solid rgba(10,22,40,.06)" }}>
            <button
              disabled={calling}
              onClick={() => onCall(item.id)}
              style={{
                flex: 1, padding: "9px 0", borderRadius: 10, border: "none",
                background: isFirst ? "linear-gradient(135deg,#0d9488,#0a1628)" : "rgba(13,148,136,.08)",
                color: isFirst ? "#fff" : "#0d9488",
                cursor: calling ? "not-allowed" : "pointer",
                fontFamily: "'DM Sans',sans-serif", fontSize: ".82rem", fontWeight: 600,
                opacity: calling ? .6 : 1, transition: "all .18s",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
              }}>
              {calling
                ? <><span style={{ width: 13, height: 13, border: "2px solid rgba(0,0,0,.2)", borderTopColor: isFirst ? "#fff" : "#0d9488", borderRadius: "50%", animation: "spin .7s linear infinite", display: "inline-block" }} /> Calling…</>
                : "📢 Call Patient"}
            </button>
            <button
              disabled={cancelling}
              onClick={() => onCancel(item.id)}
              style={{ padding: "9px 14px", borderRadius: 10, border: "1px solid rgba(220,38,38,.2)", background: "none", cursor: cancelling ? "not-allowed" : "pointer", fontFamily: "'DM Sans',sans-serif", fontSize: ".76rem", color: "#ef4444", opacity: cancelling ? .4 : 1 }}>
              {cancelling ? "…" : "Cancel"}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Completed Card (compact) ──────────────────────────────────────────────────
function CompletedCard({ item }: { item: CompletedItem }) {
  return (
    <div style={{ background: "#fff", borderRadius: 12, border: "1px solid rgba(10,22,40,.06)", padding: "12px 16px", display: "flex", alignItems: "center", gap: 12, animation: "fadeIn .25s ease both" }}>
      <div style={{ width: 36, height: 36, borderRadius: "50%", background: "rgba(13,148,136,.1)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: ".7rem", fontWeight: 700, color: "#0d9488", flexShrink: 0 }}>
        {getInitials(item.patient.name)}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: ".84rem", fontWeight: 500, color: "#0a1628" }}>{item.patient.name}</div>
        <div style={{ fontSize: ".72rem", color: "#94a3b8" }}>{item.service?.name ?? "General"} · {item.doctor.name}</div>
      </div>
      <div style={{ textAlign: "right", flexShrink: 0 }}>
        <div style={{ fontSize: ".7rem", color: "#0d9488", fontWeight: 600 }}>✔ Done</div>
        <div style={{ fontSize: ".68rem", color: "#94a3b8" }}>{item.time}</div>
      </div>
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function WaitlistPage() {
  const { role } = useAuthStore()
  const canEdit  = role() === "admin" || role() === "receptionist"

  const [waitlist,   setWaitlist]   = useState<WaitlistItem[]>([])
  const [completed,  setCompleted]  = useState<CompletedItem[]>([])
  const [loading,    setLoading]    = useState(true)
  const [error,      setError]      = useState<string | null>(null)
  const [calling,    setCalling]    = useState<string | null>(null)
  const [cancelling, setCancelling] = useState<string | null>(null)
  const [callingNext, setCallingNext] = useState(false)
  const [successMsg, setSuccessMsg] = useState("")
  const [tab,        setTab]        = useState<"waiting" | "completed">("waiting")
  const pollRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  const fetchAll = useCallback(async (silent = false) => {
    if (!silent) setLoading(true)
    setError(null)
    try {
      const [wRes, cRes] = await Promise.all([
        API.get("/checkin/waitlist"),
        API.get("/checkin/completed"),
      ])
      setWaitlist(wRes.data as unknown as WaitlistItem[])
      setCompleted(cRes.data as unknown as CompletedItem[])
    } catch (err: any) {
      setError(err?.response?.data?.message ?? "Failed to load waitlist")
    } finally {
      if (!silent) setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchAll()
    pollRef.current = setInterval(() => fetchAll(true), 20_000)
    return () => clearInterval(pollRef.current)
  }, [])

  const showSuccess = (msg: string) => { setSuccessMsg(msg); setTimeout(() => setSuccessMsg(""), 3000) }

  const handleCall = async (id: string) => {
    setCalling(id)
    try {
      await API.put(`/checkin/${id}/status`, { status: "in_progress" })
      fetchAll(true)
      showSuccess("Patient called! Starting consultation.")
    } catch (err: any) {
      alert(err?.response?.data?.message ?? "Failed to call patient")
    } finally {
      setCalling(null)
    }
  }

  const handleCancel = async (id: string) => {
    if (!confirm("Remove patient from waitlist?")) return
    setCancelling(id)
    try {
      await API.put(`/checkin/${id}/status`, { status: "cancelled" })
      fetchAll(true)
      showSuccess("Patient removed from waitlist.")
    } catch (err: any) {
      alert(err?.response?.data?.message ?? "Failed to cancel")
    } finally {
      setCancelling(null)
    }
  }

  const handleCallNext = async () => {
    setCallingNext(true)
    try {
      await API.post("/checkin/queue/next")
      fetchAll(true)
      showSuccess("Next patient called! Consultation started.")
    } catch (err: any) {
      alert(err?.response?.data?.message ?? "No patients waiting")
    } finally {
      setCallingNext(false)
    }
  }

  const avgWait = waitlist.length > 0 ? Math.round(waitlist.length * 20 / 2) : 0

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@700&family=DM+Sans:wght@300;400;500;600&display=swap');
        @keyframes shimmer { to{background-position:-200% 0} }
        @keyframes spin    { to{transform:rotate(360deg)} }
        @keyframes fadeIn  { from{opacity:0;transform:translateY(6px)} to{opacity:1;transform:translateY(0)} }
        @keyframes pulse   { 0%,100%{opacity:1} 50%{opacity:.4} }

        .wl-root    { font-family:'DM Sans',sans-serif; display:flex; flex-direction:column; gap:20px; }
        .wl-header  { display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:12px; }
        .wl-title   { font-family:'Cormorant Garamond',serif; font-size:1.5rem; font-weight:700; color:#0a1628; }
        .wl-sub     { font-size:.8rem; color:#64748b; margin-top:2px; }

        .wl-hero    { background:linear-gradient(135deg,#0d9488 0%,#0a1628 100%); border-radius:20px; padding:24px 28px; display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:16px; }
        .wl-hero-stat { text-align:center; }
        .wl-hero-num  { font-family:'Cormorant Garamond',serif; font-size:2.4rem; font-weight:700; color:#fff; line-height:1; }
        .wl-hero-lbl  { font-size:.74rem; color:rgba(255,255,255,.65); margin-top:2px; }
        .wl-hero-divider { width:1px; height:50px; background:rgba(255,255,255,.15); }
        .wl-next-btn { padding:13px 28px; border-radius:50px; border:2px solid rgba(255,255,255,.3); background:rgba(255,255,255,.12); cursor:pointer; font-family:'DM Sans',sans-serif; font-size:.9rem; font-weight:600; color:#fff; transition:all .18s; display:flex; align-items:center; gap:8px; backdrop-filter:blur(4px); }
        .wl-next-btn:hover:not(:disabled) { background:rgba(255,255,255,.22); border-color:rgba(255,255,255,.5); transform:translateY(-1px); }
        .wl-next-btn:disabled { opacity:.5; cursor:not-allowed; }

        .wl-tabs    { display:flex; gap:4px; background:rgba(10,22,40,.04); border-radius:12px; padding:4px; }
        .wl-tab     { flex:1; padding:8px 16px; border-radius:9px; border:none; cursor:pointer; font-family:'DM Sans',sans-serif; font-size:.82rem; font-weight:500; color:#64748b; background:none; transition:all .18s; display:flex; align-items:center; justify-content:center; gap:6px; }
        .wl-tab.active { background:#fff; color:#0a1628; box-shadow:0 1px 6px rgba(10,22,40,.1); }
        .wl-tab-cnt { font-size:.68rem; font-weight:700; padding:1px 6px; border-radius:50px; background:rgba(10,22,40,.08); }
        .wl-tab.active .wl-tab-cnt { background:rgba(13,148,136,.1); color:#0d9488; }

        .wl-queue   { display:flex; flex-direction:column; gap:12px; }
        .wl-completed { display:flex; flex-direction:column; gap:8px; }
        .wl-empty   { text-align:center; padding:60px 20px; color:#94a3b8; }
        .wl-error   { background:rgba(220,38,38,.06); border:1px solid rgba(220,38,38,.2); border-radius:12px; padding:14px 18px; font-size:.83rem; color:#dc2626; display:flex; gap:8px; align-items:center; }
        .wl-success { background:rgba(22,163,74,.08); border:1px solid rgba(22,163,74,.2); border-radius:12px; padding:12px 18px; font-size:.83rem; color:#16a34a; animation:fadeIn .3s ease; }
        @media(max-width:640px) {
          .wl-header { flex-direction:column; align-items:stretch; }
          .wl-hero   { flex-direction:column; align-items:flex-start; padding:18px 20px; gap:12px; }
          .wl-hero-divider { width:100%; height:1px; }
          .wl-next-btn { width:100%; justify-content:center; }
        }
      `}</style>

      <div className="wl-root">
        {/* Header */}
        <div className="wl-header">
          <div>
            <div className="wl-title">Live Waitlist</div>
            <div className="wl-sub">
              Real-time patient queue
              <span style={{ display: "inline-block", width: 7, height: 7, borderRadius: "50%", background: "#0d9488", marginLeft: 8, animation: "pulse 2s infinite" }} />
              Auto-updates every 20s
            </div>
          </div>
          <button onClick={() => fetchAll()} style={{ padding: "8px 14px", borderRadius: 50, border: "1.5px solid rgba(10,22,40,.1)", background: "#fff", cursor: "pointer", fontFamily: "'DM Sans',sans-serif", fontSize: ".76rem", color: "#64748b" }}>
            ↻ Refresh
          </button>
        </div>

        {/* Hero stats bar */}
        <div className="wl-hero">
          {[
            { num: waitlist.length,    lbl: "Patients Waiting" },
            { num: completed.length,   lbl: "Completed Today"  },
            { num: `${avgWait}m`,      lbl: "Avg. Wait Time"   },
          ].map((s, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: i < 2 ? 28 : 0 }}>
              <div className="wl-hero-stat">
                <div className="wl-hero-num">{s.num}</div>
                <div className="wl-hero-lbl">{s.lbl}</div>
              </div>
              {i < 2 && <div className="wl-hero-divider" />}
            </div>
          ))}

          {canEdit && (
            <button
              className="wl-next-btn"
              disabled={callingNext || waitlist.length === 0}
              onClick={handleCallNext}>
              {callingNext
                ? <><span style={{ width: 16, height: 16, border: "2px solid rgba(255,255,255,.3)", borderTopColor: "#fff", borderRadius: "50%", animation: "spin .7s linear infinite", display: "inline-block" }} /> Calling…</>
                : <><span style={{ fontSize: "1.1rem" }}>📢</span> Call Next Patient</>}
            </button>
          )}
        </div>

        {successMsg && <div className="wl-success">✓ {successMsg}</div>}

        {error && (
          <div className="wl-error">
            ⚠️ {error}
            <button onClick={() => fetchAll()} style={{ marginLeft: "auto", background: "rgba(220,38,38,.1)", border: "none", color: "#dc2626", padding: "4px 10px", borderRadius: 7, cursor: "pointer", fontSize: ".76rem" }}>Retry</button>
          </div>
        )}

        {/* Tabs */}
        <div className="wl-tabs">
          <button className={`wl-tab${tab === "waiting" ? " active" : ""}`} onClick={() => setTab("waiting")}>
            ⏳ Waiting Queue <span className="wl-tab-cnt">{waitlist.length}</span>
          </button>
          <button className={`wl-tab${tab === "completed" ? " active" : ""}`} onClick={() => setTab("completed")}>
            ✔️ Completed Today <span className="wl-tab-cnt">{completed.length}</span>
          </button>
        </div>

        {/* Waiting tab */}
        {tab === "waiting" && (
          loading ? (
            <div className="wl-queue">
              {[1,2,3].map(n => (
                <div key={n} style={{ background: "#fff", borderRadius: 18, padding: "16px 22px", border: "1px solid rgba(10,22,40,.07)", display: "flex", alignItems: "center", gap: 14 }}>
                  <Skel w="44px" h="44px" r="50%" />
                  <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 7 }}><Skel h="16px" w="40%" /><Skel h="12px" w="60%" /></div>
                  <Skel h="70px" w="120px" r="10px" />
                </div>
              ))}
            </div>
          ) : !waitlist.length ? (
            <div className="wl-empty">
              <div style={{ fontSize: "3rem", marginBottom: 12 }}>🎉</div>
              <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: "1.2rem", fontWeight: 700, color: "#0a1628", marginBottom: 6 }}>Queue is empty!</div>
              <div style={{ fontSize: ".84rem", color: "#94a3b8" }}>No patients currently waiting. Check-in patients from the Check-In page.</div>
            </div>
          ) : (
            <div className="wl-queue">
              {waitlist.map((item, i) => (
                <div key={item.id} style={{ animationDelay: `${i * 50}ms` }}>
                  <WaitlistCard
                    item={item}
                    onCall={handleCall}
                    onCancel={handleCancel}
                    calling={calling === item.id}
                    cancelling={cancelling === item.id}
                    canEdit={canEdit}
                  />
                </div>
              ))}
            </div>
          )
        )}

        {/* Completed tab */}
        {tab === "completed" && (
          loading ? (
            <div className="wl-completed">
              {[1,2,3,4].map(n => (
                <div key={n} style={{ background: "#fff", borderRadius: 12, padding: "12px 16px", border: "1px solid rgba(10,22,40,.06)", display: "flex", alignItems: "center", gap: 12 }}>
                  <Skel w="36px" h="36px" r="50%" />
                  <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 5 }}><Skel h="13px" w="45%" /><Skel h="11px" w="60%" /></div>
                </div>
              ))}
            </div>
          ) : !completed.length ? (
            <div className="wl-empty">
              <div style={{ fontSize: "2rem", marginBottom: 10 }}>📋</div>
              <div>No completed consultations yet today</div>
            </div>
          ) : (
            <div className="wl-completed">
              {completed.map((item, i) => (
                <div key={item.id} style={{ animationDelay: `${i * 30}ms` }}>
                  <CompletedCard item={item} />
                </div>
              ))}
            </div>
          )
        )}
      </div>
    </>
  )
}