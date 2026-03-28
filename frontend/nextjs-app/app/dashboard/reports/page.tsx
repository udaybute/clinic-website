"use client"

// app/dashboard/reports/page.tsx
// Premium doctor daily dashboard — performance metrics, visual timeline,
// appointment distribution chart, quick actions, and live clinic overview.
//
// API:
//   GET /api/analytics/dashboard
//   GET /api/appointments?dateRange=today&limit=50
//   GET /api/lab?status=pending&limit=50

import { useState, useEffect, useCallback, useRef } from "react"
import { useAuthStore } from "@/store/authStore"
import API from "@/lib/api"

// ── Types ─────────────────────────────────────────────────────────────────────
interface TodayAppt {
  id:      string
  time:    string
  status:  string
  patient: { name: string; phone?: string }
  service?: { name: string } | null
}

interface LabItem {
  id:       string
  testName: string
  status:   string
  patient:  { name: string }
  date:     string
}

interface DashStats {
  totalPatients:        number
  appointmentsToday:    number
  pendingAppointments:  number
  completedToday:       number
  pendingLab?:          number
  prescriptionsToday?:  number
  revenue?:             number
}

// ── Helpers ───────────────────────────────────────────────────────────────────
const STATUS_META: Record<string, { bg: string; color: string; icon: string }> = {
  pending:     { bg: "rgba(245,158,11,.1)",  color: "#d97706",  icon: "⏳" },
  confirmed:   { bg: "rgba(37,99,235,.1)",   color: "#2563eb",  icon: "✓"  },
  checked_in:  { bg: "rgba(13,148,136,.1)",  color: "#0d9488",  icon: "🟢" },
  in_progress: { bg: "rgba(124,58,237,.1)",  color: "#7c3aed",  icon: "▶"  },
  completed:   { bg: "rgba(22,163,74,.1)",   color: "#16a34a",  icon: "✅" },
  cancelled:   { bg: "rgba(220,38,38,.1)",   color: "#dc2626",  icon: "✕"  },
  no_show:     { bg: "rgba(100,116,139,.1)", color: "#64748b",  icon: "—"  },
}

function StatusBadge({ status }: { status: string }) {
  const m = STATUS_META[status] ?? { bg: "rgba(10,22,40,.06)", color: "#64748b", icon: "" }
  return (
    <span style={{ padding: "3px 10px", borderRadius: 20, fontSize: ".68rem", fontWeight: 700, background: m.bg, color: m.color, textTransform: "capitalize", whiteSpace: "nowrap" }}>
      {status.replace(/_/g, " ")}
    </span>
  )
}

function Skel({ w = "100%", h = "14px", r = "6px" }: { w?: string; h?: string; r?: string }) {
  return <div style={{ width: w, height: h, borderRadius: r, background: "linear-gradient(90deg,#f1f5f9 25%,#e2e8f0 50%,#f1f5f9 75%)", backgroundSize: "200% 100%", animation: "shimmer 1.4s infinite" }} />
}

function getInitials(name: string) {
  return name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()
}

function useCurrentTime() {
  const [time, setTime] = useState(new Date())
  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 60000)
    return () => clearInterval(t)
  }, [])
  return time
}

function getGreeting(hour: number) {
  if (hour < 12) return "Good morning"
  if (hour < 17) return "Good afternoon"
  return "Good evening"
}

// Derived: group appointments by status for mini bar chart
function buildStatusDist(appts: TodayAppt[]) {
  const dist: Record<string, number> = {}
  appts.forEach(a => { dist[a.status] = (dist[a.status] ?? 0) + 1 })
  return dist
}

// Derive appointment slots as timeline blocks (sort by time)
function parseTime(t: string): number {
  const [h, m] = t.replace(/[AP]M/i, "").trim().split(":").map(Number)
  const isPM = /pm/i.test(t) && h !== 12
  const isAM = /am/i.test(t) && h === 12
  return (isPM ? h + 12 : isAM ? 0 : h) * 60 + (m || 0)
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function ReportsPage() {
  const { role, user } = useAuthStore()
  const isDoctor = role() === "doctor"
  const isAdmin  = role() === "admin"
  const now      = useCurrentTime()
  const greeting = getGreeting(now.getHours())

  const [stats,   setStats]   = useState<DashStats | null>(null)
  const [appts,   setAppts]   = useState<TodayAppt[]>([])
  const [labs,    setLabs]    = useState<LabItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState<string | null>(null)

  // For the animated number counters
  const [counted, setCounted] = useState(false)
  const countTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  const fetchAll = useCallback(async () => {
    setLoading(true); setError(null); setCounted(false)
    try {
      const [statsRes, apptsRes, labsRes] = await Promise.all([
        API.get("/analytics/dashboard"),
        API.get("/appointments?dateRange=today&limit=50"),
        isDoctor
          ? API.get("/lab?status=pending&limit=20")
          : Promise.resolve({ data: { labRequests: [] } }),
      ])
      setStats(statsRes.data as DashStats)
      const a = apptsRes.data as any
      setAppts(Array.isArray(a) ? a : (a?.appointments ?? []))
      const l = labsRes.data as any
      setLabs(Array.isArray(l) ? l : (l?.labRequests ?? []))
      // Trigger counter animation after data loads
      countTimer.current = setTimeout(() => setCounted(true), 100)
    } catch (err: any) {
      setError(err?.response?.data?.message ?? "Failed to load dashboard")
    } finally {
      setLoading(false)
    }
  }, [isDoctor])

  useEffect(() => { fetchAll() }, [fetchAll])
  useEffect(() => () => { if (countTimer.current) clearTimeout(countTimer.current) }, [])

  const today = now.toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" })
  const timeStr = now.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })

  // Derived metrics
  const totalToday   = stats?.appointmentsToday ?? 0
  const completed    = stats?.completedToday ?? 0
  const pending      = stats?.pendingAppointments ?? 0
  const inProgress   = appts.filter(a => a.status === "in_progress").length
  const checkedIn    = appts.filter(a => a.status === "checked_in").length
  const completionRate = totalToday > 0 ? Math.round((completed / totalToday) * 100) : 0
  const statusDist   = buildStatusDist(appts)

  // Sort appts by time
  const sortedAppts = [...appts].sort((a, b) => parseTime(a.time) - parseTime(b.time))

  // Next upcoming appointment (first non-completed, non-cancelled)
  const nextAppt = sortedAppts.find(a => !["completed", "cancelled", "no_show"].includes(a.status))

  // Quick action cards
  const quickActions = [
    { label: "Start Consultation", icon: "🩺", href: "/dashboard/consultations", color: "#0d9488", bg: "rgba(13,148,136,.08)" },
    { label: "Write Prescription",  icon: "💊", href: "/dashboard/prescriptions",  color: "#2563eb", bg: "rgba(37,99,235,.08)"  },
    { label: "View Lab Requests",   icon: "🔬", href: "/dashboard/lab",             color: "#7c3aed", bg: "rgba(124,58,237,.08)" },
    { label: "Patient Records",     icon: "👤", href: "/dashboard/patients",        color: "#d97706", bg: "rgba(245,158,11,.08)" },
  ]

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@600;700&family=DM+Sans:wght@300;400;500;600&display=swap');
        @keyframes shimmer { to { background-position:-200% 0 } }
        @keyframes fadeUp  { from { opacity:0; transform:translateY(10px) } to { opacity:1; transform:translateY(0) } }
        @keyframes countUp { from { opacity:0; transform:scale(.8) } to { opacity:1; transform:scale(1) } }
        @keyframes barGrow { from { width:0 } to { width:var(--target-w) } }
        @keyframes ringFill { from { stroke-dashoffset: 251 } to { stroke-dashoffset: var(--target-offset) } }
        @keyframes pulse2 { 0%,100% { opacity:1 } 50% { opacity:.5 } }
        .rp-stat-card { transition: transform .18s, box-shadow .18s; }
        .rp-stat-card:hover { transform: translateY(-3px); box-shadow: 0 12px 40px rgba(10,22,40,.1) !important; }
        .qa-card { transition: transform .15s, box-shadow .15s; }
        .qa-card:hover { transform: translateY(-3px); box-shadow: 0 8px 24px rgba(10,22,40,.1) !important; }
        .appt-row:hover { background: rgba(10,22,40,.025) !important; }
        .appt-row { transition: background .12s; }
        .next-badge { animation: pulse2 2s infinite; }
        .refresh-btn:hover { color: #0d9488 !important; }
      `}</style>

      <div style={{ fontFamily: "'DM Sans',sans-serif" }}>

        {/* ── Hero Header ──────────────────────────────────────────────────── */}
        <div style={{ background: "linear-gradient(135deg,#0a1628 0%,#0d4a42 60%,#0d9488 100%)", borderRadius: 20, padding: "28px 32px", marginBottom: 24, color: "#fff", position: "relative", overflow: "hidden" }}>
          {/* Decorative circles */}
          <div style={{ position: "absolute", right: -60, top: -60, width: 240, height: 240, borderRadius: "50%", background: "rgba(255,255,255,.04)", pointerEvents: "none" }} />
          <div style={{ position: "absolute", right: 40, bottom: -80, width: 180, height: 180, borderRadius: "50%", background: "rgba(255,255,255,.03)", pointerEvents: "none" }} />
          <div style={{ position: "relative" }}>
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 16 }}>
              <div>
                <div style={{ fontSize: ".78rem", letterSpacing: ".16em", textTransform: "uppercase", color: "rgba(255,255,255,.55)", fontWeight: 600, marginBottom: 4 }}>
                  {greeting}
                </div>
                <h1 style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: "2rem", fontWeight: 700, margin: 0, lineHeight: 1.1 }}>
                  {isDoctor ? `Dr. ${user?.name ?? "Doctor"}` : user?.name ?? "Dashboard"}
                </h1>
                <p style={{ margin: "6px 0 0", fontSize: ".84rem", color: "rgba(255,255,255,.6)" }}>
                  {today} · {timeStr}
                  {isDoctor && " · Dental Surgeon"}
                </p>
              </div>
              <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                {nextAppt && !loading && (
                  <div style={{ background: "rgba(255,255,255,.1)", borderRadius: 12, padding: "10px 16px", backdropFilter: "blur(8px)", border: "1px solid rgba(255,255,255,.12)" }}>
                    <div style={{ fontSize: ".6rem", textTransform: "uppercase", letterSpacing: ".14em", color: "rgba(255,255,255,.55)", fontWeight: 600, marginBottom: 3 }}>Next Patient</div>
                    <div style={{ fontSize: ".9rem", fontWeight: 600 }}>{nextAppt.patient.name}</div>
                    <div style={{ fontSize: ".72rem", color: "rgba(255,255,255,.6)", marginTop: 2 }}>{nextAppt.time} · {nextAppt.service?.name ?? "—"}</div>
                  </div>
                )}
                <button
                  className="refresh-btn"
                  onClick={fetchAll}
                  style={{ width: 38, height: 38, borderRadius: 10, background: "rgba(255,255,255,.1)", border: "1px solid rgba(255,255,255,.15)", cursor: "pointer", color: "rgba(255,255,255,.7)", fontSize: "1rem", backdropFilter: "blur(8px)", transition: "color .15s" }}
                  title="Refresh"
                >↻</button>
              </div>
            </div>

            {/* Hero mini-stats row */}
            {!loading && stats && (
              <div style={{ display: "flex", gap: 24, marginTop: 20, flexWrap: "wrap" }}>
                {[
                  { val: totalToday,       label: "Today",      accent: "rgba(255,255,255,.9)"  },
                  { val: completed,         label: "Done",       accent: "#4ade80"               },
                  { val: inProgress + checkedIn, label: "Active", accent: "#fbbf24"             },
                  { val: pending,           label: "Waiting",    accent: "#f87171"               },
                ].map(s => (
                  <div key={s.label}>
                    <div style={{ fontSize: "1.5rem", fontWeight: 700, color: s.accent, lineHeight: 1, fontFamily: "'Cormorant Garamond',serif" }}>{s.val}</div>
                    <div style={{ fontSize: ".65rem", textTransform: "uppercase", letterSpacing: ".12em", color: "rgba(255,255,255,.5)", fontWeight: 600, marginTop: 2 }}>{s.label}</div>
                  </div>
                ))}
                {isDoctor && labs.length > 0 && (
                  <div>
                    <div style={{ fontSize: "1.5rem", fontWeight: 700, color: "#c4b5fd", lineHeight: 1, fontFamily: "'Cormorant Garamond',serif" }}>{labs.length}</div>
                    <div style={{ fontSize: ".65rem", textTransform: "uppercase", letterSpacing: ".12em", color: "rgba(255,255,255,.5)", fontWeight: 600, marginTop: 2 }}>Pending Labs</div>
                  </div>
                )}
              </div>
            )}
            {loading && (
              <div style={{ display: "flex", gap: 24, marginTop: 20 }}>
                {[1,2,3,4].map(i => <div key={i} style={{ width: 50 }}><Skel h="24px" r="6px" /><div style={{ marginTop: 5 }}><Skel h="10px" w="40px" r="4px" /></div></div>)}
              </div>
            )}
          </div>
        </div>

        {/* Error */}
        {error && (
          <div style={{ padding: "12px 16px", borderRadius: 12, background: "rgba(220,38,38,.06)", border: "1px solid rgba(220,38,38,.2)", color: "#dc2626", fontSize: ".84rem", marginBottom: 20, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            {error}
            <button onClick={fetchAll} style={{ border: "none", background: "none", color: "#dc2626", fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans',sans-serif" }}>Retry</button>
          </div>
        )}

        {/* ── Quick Actions ─────────────────────────────────────────────────── */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12, marginBottom: 24 }}>
          {quickActions.map(qa => (
            <a key={qa.label} href={qa.href} style={{ textDecoration: "none" }}>
              <div className="qa-card" style={{ background: "#fff", borderRadius: 14, border: "1px solid rgba(10,22,40,.07)", padding: "16px", display: "flex", flexDirection: "column", gap: 10, boxShadow: "0 2px 10px rgba(10,22,40,.04)", cursor: "pointer" }}>
                <div style={{ width: 40, height: 40, borderRadius: 12, background: qa.bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.2rem" }}>{qa.icon}</div>
                <div style={{ fontSize: ".82rem", fontWeight: 600, color: "#0a1628", lineHeight: 1.3 }}>{qa.label}</div>
                <div style={{ marginTop: "auto", fontSize: ".72rem", color: qa.color, fontWeight: 600 }}>Open →</div>
              </div>
            </a>
          ))}
        </div>

        {/* ── Stat Cards + Completion Ring ─────────────────────────────────── */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr auto", gap: 14, marginBottom: 24 }}>
          {loading
            ? Array.from({ length: 3 }).map((_, i) => (
                <div key={i} style={{ background: "#fff", borderRadius: 16, border: "1px solid rgba(10,22,40,.07)", padding: "20px" }}>
                  <Skel h="14px" w="50%" /><div style={{ marginTop: 10 }}><Skel h="36px" w="60%" /></div><div style={{ marginTop: 8 }}><Skel h="6px" /></div>
                </div>
              ))
            : [
                { label: "Appointments Today", value: totalToday,    icon: "📅", color: "#2563eb", pct: 100               },
                { label: "Completed",           value: completed,     icon: "✅", color: "#16a34a", pct: completionRate    },
                { label: isDoctor ? "Pending Lab Tests" : "Total Patients", value: isDoctor ? labs.length : (stats?.totalPatients ?? 0), icon: isDoctor ? "🔬" : "👤", color: isDoctor ? "#7c3aed" : "#0d9488", pct: null },
              ].map(c => (
                <div key={c.label} className="rp-stat-card" style={{ background: "#fff", borderRadius: 16, border: "1px solid rgba(10,22,40,.07)", padding: "20px", boxShadow: "0 2px 10px rgba(10,22,40,.04)", animation: "fadeUp .3s ease both" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                    <div style={{ fontSize: ".72rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: ".1em", color: "#94a3b8" }}>{c.label}</div>
                    <span style={{ fontSize: "1.1rem" }}>{c.icon}</span>
                  </div>
                  <div style={{ fontSize: "2.2rem", fontWeight: 700, color: c.color, lineHeight: 1, fontFamily: "'Cormorant Garamond',serif", animation: counted ? "countUp .4s ease both" : "none" }}>{c.value}</div>
                  {c.pct !== null && (
                    <div style={{ marginTop: 12 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                        <span style={{ fontSize: ".65rem", color: "#94a3b8" }}>{c.pct}% completion</span>
                      </div>
                      <div style={{ height: 5, borderRadius: 99, background: "#f1f5f9", overflow: "hidden" }}>
                        <div style={{ height: "100%", borderRadius: 99, background: `linear-gradient(90deg,${c.color},${c.color}99)`, width: counted ? `${c.pct}%` : "0%", transition: "width 1.2s ease" }} />
                      </div>
                    </div>
                  )}
                </div>
              ))
          }

          {/* Completion Ring */}
          {!loading && (
            <div style={{ background: "#fff", borderRadius: 16, border: "1px solid rgba(10,22,40,.07)", padding: "20px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8, boxShadow: "0 2px 10px rgba(10,22,40,.04)", minWidth: 120, animation: "fadeUp .3s ease .1s both" }}>
              <div style={{ position: "relative", width: 80, height: 80 }}>
                <svg width="80" height="80" viewBox="0 0 80 80" style={{ transform: "rotate(-90deg)" }}>
                  <circle cx="40" cy="40" r="32" fill="none" stroke="#f1f5f9" strokeWidth="7" />
                  <circle
                    cx="40" cy="40" r="32" fill="none"
                    stroke={completionRate >= 75 ? "#16a34a" : completionRate >= 40 ? "#d97706" : "#dc2626"}
                    strokeWidth="7" strokeLinecap="round"
                    strokeDasharray="201"
                    strokeDashoffset={counted ? `${201 - (201 * completionRate / 100)}` : "201"}
                    style={{ transition: "stroke-dashoffset 1.4s ease" }}
                  />
                </svg>
                <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column" }}>
                  <span style={{ fontSize: "1.1rem", fontWeight: 700, color: "#0a1628", lineHeight: 1, fontFamily: "'Cormorant Garamond',serif" }}>{completionRate}%</span>
                </div>
              </div>
              <div style={{ fontSize: ".65rem", color: "#94a3b8", textAlign: "center", fontWeight: 600, textTransform: "uppercase", letterSpacing: ".1em" }}>Completion<br />Rate</div>
            </div>
          )}
        </div>

        {/* ── Status Distribution Bar ────────────────────────────────────────── */}
        {!loading && appts.length > 0 && (
          <div style={{ background: "#fff", borderRadius: 16, border: "1px solid rgba(10,22,40,.07)", padding: "18px 20px", marginBottom: 24, boxShadow: "0 2px 10px rgba(10,22,40,.04)", animation: "fadeUp .3s ease .15s both" }}>
            <div style={{ fontSize: ".72rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: ".1em", color: "#94a3b8", marginBottom: 14 }}>Appointment Status Breakdown</div>
            <div style={{ display: "flex", height: 10, borderRadius: 99, overflow: "hidden", gap: 2 }}>
              {Object.entries(statusDist).map(([status, count]) => {
                const meta = STATUS_META[status] ?? { color: "#94a3b8", bg: "#f1f5f9", icon: "" }
                const pct = (count / appts.length) * 100
                return (
                  <div key={status} title={`${status.replace(/_/g," ")}: ${count}`} style={{ height: "100%", background: meta.color, borderRadius: 99, width: counted ? `${pct}%` : "0%", transition: "width 1.2s ease", minWidth: pct > 0 ? 4 : 0 }} />
                )
              })}
            </div>
            <div style={{ display: "flex", gap: 16, marginTop: 12, flexWrap: "wrap" }}>
              {Object.entries(statusDist).map(([status, count]) => {
                const meta = STATUS_META[status] ?? { color: "#94a3b8", bg: "#f1f5f9", icon: "" }
                return (
                  <div key={status} style={{ display: "flex", alignItems: "center", gap: 5 }}>
                    <div style={{ width: 8, height: 8, borderRadius: "50%", background: meta.color, flexShrink: 0 }} />
                    <span style={{ fontSize: ".72rem", color: "#64748b" }}>{status.replace(/_/g, " ")} <strong style={{ color: "#0a1628" }}>{count}</strong></span>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* ── Main Two-Column Grid ────────────────────────────────────────────── */}
        <div style={{ display: "grid", gridTemplateColumns: labs.length > 0 && isDoctor ? "1fr 360px" : "1fr", gap: 20 }}>

          {/* Appointment Timeline */}
          <div style={{ background: "#fff", borderRadius: 16, border: "1px solid rgba(10,22,40,.07)", overflow: "hidden", boxShadow: "0 2px 10px rgba(10,22,40,.04)", animation: "fadeUp .3s ease .2s both" }}>
            <div style={{ padding: "16px 20px", borderBottom: "1px solid rgba(10,22,40,.06)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div>
                <div style={{ fontSize: ".92rem", fontWeight: 600, color: "#0a1628" }}>📅 Today's Schedule</div>
                <div style={{ fontSize: ".72rem", color: "#94a3b8", marginTop: 1 }}>{appts.length} appointments</div>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                {[
                  { label: "All",         filter: "all"        },
                  { label: "Pending",     filter: "pending"    },
                  { label: "In Progress", filter: "in_progress"},
                  { label: "Done",        filter: "completed"  },
                ].map(f => (
                  <span key={f.filter} style={{ padding: "3px 10px", borderRadius: 20, fontSize: ".68rem", fontWeight: 600, background: "#f1f5f9", color: "#64748b", cursor: "default" }}>{f.label}: {f.filter === "all" ? appts.length : appts.filter(a => a.status === f.filter).length}</span>
                ))}
              </div>
            </div>

            <div style={{ maxHeight: 440, overflowY: "auto" }}>
              {loading ? (
                <div style={{ padding: "16px 20px", display: "flex", flexDirection: "column", gap: 12 }}>
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} style={{ display: "flex", gap: 14, alignItems: "center" }}>
                      <Skel w="48px" h="48px" r="12px" />
                      <div style={{ flex: 1 }}><Skel h="13px" w="55%" /><div style={{ marginTop: 5 }}><Skel h="11px" w="35%" /></div></div>
                      <Skel w="70px" h="22px" r="20px" />
                    </div>
                  ))}
                </div>
              ) : sortedAppts.length === 0 ? (
                <div style={{ padding: "48px 20px", textAlign: "center", color: "#94a3b8" }}>
                  <div style={{ fontSize: "2rem", marginBottom: 10 }}>📅</div>
                  <div style={{ fontSize: ".85rem" }}>No appointments scheduled for today</div>
                </div>
              ) : (
                <div style={{ padding: "8px 0" }}>
                  {sortedAppts.map((a, i) => {
                    const isNext = nextAppt?.id === a.id
                    const isDone = ["completed", "cancelled", "no_show"].includes(a.status)
                    return (
                      <div
                        key={a.id}
                        className="appt-row"
                        style={{ padding: "11px 20px", display: "flex", alignItems: "center", gap: 14, borderLeft: isNext ? "3px solid #0d9488" : "3px solid transparent", background: isNext ? "rgba(13,148,136,.03)" : "transparent", opacity: isDone ? .65 : 1, animation: `fadeUp .2s ease ${i * 35}ms both` }}
                      >
                        {/* Time bubble */}
                        <div style={{ width: 52, height: 44, borderRadius: 12, background: isDone ? "#f1f5f9" : "linear-gradient(135deg,rgba(13,148,136,.12),rgba(13,148,136,.04))", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                          <span style={{ fontSize: ".72rem", fontWeight: 700, color: isDone ? "#94a3b8" : "#0d9488", lineHeight: 1 }}>
                            {a.time.replace(/\s?(AM|PM)/i, "")}
                          </span>
                          <span style={{ fontSize: ".55rem", color: isDone ? "#cbd5e1" : "#0d9488", fontWeight: 600, textTransform: "uppercase" }}>
                            {/PM/i.test(a.time) ? "PM" : /AM/i.test(a.time) ? "AM" : ""}
                          </span>
                        </div>

                        {/* Patient avatar */}
                        <div style={{ width: 36, height: 36, borderRadius: "50%", background: isDone ? "#e2e8f0" : "linear-gradient(135deg,#0d9488,#0a1628)", display: "flex", alignItems: "center", justifyContent: "center", color: isDone ? "#94a3b8" : "#fff", fontSize: ".72rem", fontWeight: 700, flexShrink: 0 }}>
                          {getInitials(a.patient.name)}
                        </div>

                        {/* Info */}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
                            <span style={{ fontSize: ".875rem", fontWeight: 600, color: "#0a1628", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{a.patient.name}</span>
                            {isNext && <span className="next-badge" style={{ fontSize: ".6rem", fontWeight: 700, background: "rgba(13,148,136,.12)", color: "#0d9488", borderRadius: 20, padding: "1px 7px", flexShrink: 0 }}>NEXT</span>}
                          </div>
                          <div style={{ fontSize: ".72rem", color: "#94a3b8" }}>{a.service?.name ?? "General Consultation"}</div>
                        </div>

                        <StatusBadge status={a.status} />
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Pending Lab Tests — doctor only */}
          {isDoctor && (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

              {/* Lab Tests Card */}
              <div style={{ background: "#fff", borderRadius: 16, border: "1px solid rgba(10,22,40,.07)", overflow: "hidden", boxShadow: "0 2px 10px rgba(10,22,40,.04)", animation: "fadeUp .3s ease .25s both" }}>
                <div style={{ padding: "14px 18px", borderBottom: "1px solid rgba(10,22,40,.06)", display: "flex", alignItems: "center", justifyContent: "space-between", background: labs.length > 0 ? "rgba(124,58,237,.03)" : "transparent" }}>
                  <div>
                    <div style={{ fontSize: ".88rem", fontWeight: 600, color: "#0a1628" }}>🔬 Pending Lab Tests</div>
                    <div style={{ fontSize: ".7rem", color: "#94a3b8", marginTop: 1 }}>Awaiting results</div>
                  </div>
                  {labs.length > 0 && (
                    <span style={{ background: "rgba(124,58,237,.1)", color: "#7c3aed", borderRadius: 20, padding: "3px 10px", fontSize: ".72rem", fontWeight: 700 }}>{labs.length}</span>
                  )}
                </div>
                <div style={{ maxHeight: 260, overflowY: "auto" }}>
                  {loading ? (
                    <div style={{ padding: "14px 18px", display: "flex", flexDirection: "column", gap: 10 }}>
                      {[1,2,3].map(i => <Skel key={i} h="44px" />)}
                    </div>
                  ) : labs.length === 0 ? (
                    <div style={{ padding: "36px 18px", textAlign: "center", color: "#94a3b8", fontSize: ".84rem" }}>
                      <div style={{ fontSize: "1.6rem", marginBottom: 8 }}>✅</div>
                      No pending lab tests
                    </div>
                  ) : (
                    <div style={{ padding: "6px 0" }}>
                      {labs.map((l, i) => (
                        <div key={l.id} style={{ padding: "10px 18px", display: "flex", alignItems: "center", gap: 12, borderBottom: i < labs.length - 1 ? "1px solid rgba(10,22,40,.04)" : "none", animation: `fadeUp .2s ease ${i * 40}ms both` }}>
                          <div style={{ width: 34, height: 34, borderRadius: 10, background: "rgba(124,58,237,.08)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontSize: ".95rem" }}>🔬</div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: ".84rem", fontWeight: 600, color: "#0a1628", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{l.testName}</div>
                            <div style={{ fontSize: ".7rem", color: "#94a3b8" }}>{l.patient.name}</div>
                          </div>
                          <a href="/dashboard/lab" style={{ fontSize: ".72rem", color: "#7c3aed", fontWeight: 700, textDecoration: "none", flexShrink: 0 }}>View →</a>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                {labs.length > 0 && (
                  <div style={{ padding: "10px 18px", borderTop: "1px solid rgba(10,22,40,.04)" }}>
                    <a href="/dashboard/lab" style={{ fontSize: ".78rem", fontWeight: 600, color: "#7c3aed", textDecoration: "none" }}>View all lab requests →</a>
                  </div>
                )}
              </div>

              {/* Doctor Performance Card */}
              {!loading && (
                <div style={{ background: "#fff", borderRadius: 16, border: "1px solid rgba(10,22,40,.07)", padding: "18px", boxShadow: "0 2px 10px rgba(10,22,40,.04)", animation: "fadeUp .3s ease .3s both" }}>
                  <div style={{ fontSize: ".72rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: ".1em", color: "#94a3b8", marginBottom: 14 }}>Today's Performance</div>

                  {[
                    { label: "Completion Rate", value: completionRate, max: 100, unit: "%",  color: completionRate >= 75 ? "#16a34a" : completionRate >= 40 ? "#d97706" : "#dc2626" },
                    { label: "Seen Patients",   value: completed,      max: Math.max(totalToday, 1), unit: `/${totalToday}`, color: "#0d9488"  },
                    { label: "Checked In",      value: checkedIn,      max: Math.max(totalToday, 1), unit: `/${totalToday}`, color: "#2563eb"  },
                  ].map(m => (
                    <div key={m.label} style={{ marginBottom: 14 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                        <span style={{ fontSize: ".78rem", color: "#64748b" }}>{m.label}</span>
                        <span style={{ fontSize: ".78rem", fontWeight: 700, color: "#0a1628" }}>{m.value}{m.unit}</span>
                      </div>
                      <div style={{ height: 6, borderRadius: 99, background: "#f1f5f9", overflow: "hidden" }}>
                        <div style={{
                          height: "100%", borderRadius: 99, background: m.color,
                          width: counted ? `${Math.min((m.value / m.max) * 100, 100)}%` : "0%",
                          transition: "width 1.3s ease .2s",
                        }} />
                      </div>
                    </div>
                  ))}

                  <div style={{ marginTop: 16, paddingTop: 14, borderTop: "1px solid #f1f5f9", display: "flex", gap: 16 }}>
                    <div style={{ flex: 1, textAlign: "center" }}>
                      <div style={{ fontSize: "1.4rem", fontWeight: 700, color: "#0d9488", fontFamily: "'Cormorant Garamond',serif" }}>{stats?.prescriptionsToday ?? "—"}</div>
                      <div style={{ fontSize: ".65rem", color: "#94a3b8", fontWeight: 600, textTransform: "uppercase", letterSpacing: ".1em" }}>Rx Written</div>
                    </div>
                    <div style={{ width: 1, background: "#f1f5f9" }} />
                    <div style={{ flex: 1, textAlign: "center" }}>
                      <div style={{ fontSize: "1.4rem", fontWeight: 700, color: "#7c3aed", fontFamily: "'Cormorant Garamond',serif" }}>{labs.length}</div>
                      <div style={{ fontSize: ".65rem", color: "#94a3b8", fontWeight: 600, textTransform: "uppercase", letterSpacing: ".1em" }}>Labs Pending</div>
                    </div>
                    <div style={{ width: 1, background: "#f1f5f9" }} />
                    <div style={{ flex: 1, textAlign: "center" }}>
                      <div style={{ fontSize: "1.4rem", fontWeight: 700, color: "#d97706", fontFamily: "'Cormorant Garamond',serif" }}>{pending}</div>
                      <div style={{ fontSize: ".65rem", color: "#94a3b8", fontWeight: 600, textTransform: "uppercase", letterSpacing: ".1em" }}>Still Waiting</div>
                    </div>
                  </div>
                </div>
              )}

              {/* Admin Revenue Card (admin only) */}
              {isAdmin && stats?.revenue !== undefined && (
                <div style={{ background: "linear-gradient(135deg,#0a1628,#0d4a42)", borderRadius: 16, padding: "18px", color: "#fff", animation: "fadeUp .3s ease .3s both" }}>
                  <div style={{ fontSize: ".65rem", textTransform: "uppercase", letterSpacing: ".14em", color: "rgba(255,255,255,.5)", fontWeight: 600, marginBottom: 6 }}>Today's Revenue</div>
                  <div style={{ fontSize: "1.8rem", fontWeight: 700, fontFamily: "'Cormorant Garamond',serif" }}>₹{(stats.revenue).toLocaleString("en-IN")}</div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Admin wide stats (non-doctor) ────────────────────────────────── */}
        {!isDoctor && !loading && stats && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: 14, marginTop: 20, animation: "fadeUp .3s ease .3s both" }}>
            {[
              { icon: "👤", label: "Total Patients",   value: stats.totalPatients ?? 0,       color: "#0d9488" },
              { icon: "📅", label: "Today's Appts",    value: stats.appointmentsToday ?? 0,   color: "#2563eb" },
              { icon: "✅", label: "Completed Today",  value: stats.completedToday ?? 0,      color: "#16a34a" },
              { icon: "⏳", label: "Still Pending",    value: stats.pendingAppointments ?? 0, color: "#d97706" },
            ].map(c => (
              <div key={c.label} className="rp-stat-card" style={{ background: "#fff", borderRadius: 14, border: "1px solid rgba(10,22,40,.07)", padding: "18px 20px", boxShadow: "0 2px 10px rgba(10,22,40,.04)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                  <span style={{ fontSize: "1.2rem" }}>{c.icon}</span>
                  <span style={{ fontSize: ".72rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: ".1em", color: "#94a3b8" }}>{c.label}</span>
                </div>
                <div style={{ fontSize: "2rem", fontWeight: 700, color: c.color, fontFamily: "'Cormorant Garamond',serif", animation: counted ? "countUp .4s ease both" : "none" }}>{c.value}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  )
}
