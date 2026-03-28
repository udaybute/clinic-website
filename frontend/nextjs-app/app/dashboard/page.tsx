"use client"

// app/(dashboard)/dashboard/page.tsx
// FULLY REWRITTEN — replaces all hardcoded mock data with real API calls.
//
// API used: GET /api/analytics/dashboard (all roles)
// Returns: { stats, todayAppointments, recentPatients, revenue (admin only) }

import { useState, useEffect, useCallback } from "react"
import { useAuthStore }   from "@/store/authStore"
import PermissionGate     from "@/components/ui/PermissionGate"
import StatCard           from "@/components/dashboard/StatCard"
import API                from "@/lib/api"
import dynamic            from "next/dynamic"

const AppointmentCalendar = dynamic(
  () => import("@/components/dashboard/AppointmentCalendar"),
  {
    ssr: false,
    loading: () => (
      <div style={{ padding:"40px", textAlign:"center", color:"#94a3b8", fontSize:".85rem" }}>
        Loading calendar…
      </div>
    ),
  }
)

// ── Types ─────────────────────────────────────────────────────────────────────
interface DashboardStats {
  totalPatients:       number
  totalAppointments:   number
  monthlyAppointments: number
  pendingToday:        number
  completedToday:      number
  todayTotal:          number
}

interface TodayAppointment {
  id:       string
  time:     string
  status:   string
  patient:  { id: string; name: string }
  doctor:   { id: string; name: string }
  service:  { id: string; name: string } | null
  amount:   number
}

interface RecentPatient {
  id:          string
  name:        string
  phone:       string
  lastVisit:   string | null
  totalVisits: number
}

interface RevenueStats {
  monthlyBilled:    number
  monthlyCollected: number
  todayBilled:      number
  todayCollected:   number
}

interface DashboardData {
  stats:              DashboardStats
  todayAppointments:  TodayAppointment[]
  recentPatients:     RecentPatient[]
  revenue:            RevenueStats | null
}

// ── Helpers ───────────────────────────────────────────────────────────────────
const STATUS_STYLE: Record<string, { bg: string; color: string; label: string }> = {
  confirmed:   { bg: "rgba(22,163,74,.1)",   color: "#16a34a", label: "Confirmed"  },
  pending:     { bg: "rgba(245,158,11,.1)",  color: "#d97706", label: "Pending"    },
  cancelled:   { bg: "rgba(220,38,38,.1)",   color: "#dc2626", label: "Cancelled"  },
  completed:   { bg: "rgba(13,148,136,.1)",  color: "#0d9488", label: "Completed"  },
  checked_in:  { bg: "rgba(37,99,235,.1)",   color: "#2563eb", label: "Checked In" },
  in_progress: { bg: "rgba(124,58,237,.1)",  color: "#7c3aed", label: "In Progress"},
  no_show:     { bg: "rgba(100,116,139,.1)", color: "#64748b", label: "No Show"    },
}

function formatCurrency(amount: number): string {
  if (amount >= 100000) return `₹${(amount / 100000).toFixed(1)}L`
  if (amount >= 1000)   return `₹${(amount / 1000).toFixed(1)}k`
  return `₹${amount}`
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "Never"
  const d = new Date(dateStr)
  const now = new Date()
  const diff = Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24))
  if (diff === 0) return "Today"
  if (diff === 1) return "Yesterday"
  if (diff < 7)  return `${diff} days ago`
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short" })
}

function getInitials(name: string): string {
  return name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()
}

// ── Skeleton loader ───────────────────────────────────────────────────────────
function Skeleton({ w = "100%", h = "20px", radius = "8px" }: { w?: string; h?: string; radius?: string }) {
  return (
    <div style={{
      width: w, height: h, borderRadius: radius,
      background: "linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 50%, #f1f5f9 75%)",
      backgroundSize: "200% 100%",
      animation: "shimmer 1.5s infinite",
    }} />
  )
}

// ── Main component ────────────────────────────────────────────────────────────
export default function DashboardPage() {
  const { user, can, role } = useAuthStore()
  const userName  = user?.name ?? "there"
  const userRole  = role()
  const isAdmin   = userRole === "admin"
  const isDoctor  = userRole === "doctor"

  const [data,    setData]    = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState<string | null>(null)
  const [greeting, setGreeting] = useState("Good morning")

  useEffect(() => {
    const h = new Date().getHours()
    setGreeting(h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening")
  }, [])

  // ── Fetch real dashboard data from backend ──────────────────────────────────
  const fetchDashboard = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const res = await API.get("/analytics/dashboard")
      setData(res.data as DashboardData)
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? err?.message ?? "Failed to load dashboard"
      setError(typeof msg === "string" ? msg : "Failed to load dashboard data")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchDashboard() }, [fetchDashboard])

  // ── Build stat cards from real data ──────────────────────────────────────────
  const stats = data?.stats
  const revenue = data?.revenue

  const statCards = stats ? [
    {
      label: "Total Appointments",
      value: stats.totalAppointments.toLocaleString("en-IN"),
      icon:  "📅",
      color: "#0d9488",
      sub:   "All time",
    },
    {
      label: "This Month",
      value: stats.monthlyAppointments.toString(),
      icon:  "🗓️",
      color: "#2563eb",
      sub:   "Appointments",
    },
    {
      label: "Total Patients",
      value: stats.totalPatients.toLocaleString("en-IN"),
      icon:  "👤",
      color: "#7c3aed",
      sub:   "Registered",
    },
    {
      label: "Today's Schedule",
      value: stats.todayTotal.toString(),
      icon:  "⏰",
      color: "#eab308",
      sub:   `${stats.completedToday} done · ${stats.pendingToday} pending`,
    },
  ] : []

  const adminStatCards = (stats && revenue) ? [
    {
      label: "Monthly Revenue",
      value: formatCurrency(revenue.monthlyBilled),
      icon:  "💰",
      color: "#d4a843",
      sub:   `${formatCurrency(revenue.monthlyCollected)} collected`,
    },
    {
      label: "Today Revenue",
      value: formatCurrency(revenue.todayBilled),
      icon:  "📈",
      color: "#f97316",
      sub:   `${formatCurrency(revenue.todayCollected)} collected`,
    },
  ] : []

  // Banner numbers
  const bannerStats = stats ? [
    { num: stats.todayTotal.toString(),   lbl: "Today's Appts"  },
    { num: stats.pendingToday.toString(), lbl: "Pending"        },
    ...(revenue ? [{ num: formatCurrency(revenue.todayBilled), lbl: "Today Revenue" }] : []),
  ] : []

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@600;700&family=DM+Sans:wght@300;400;500;600&display=swap');
        @keyframes shimmer { to { background-position: -200% 0 } }
        @keyframes dpFade  { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }

        .dp-root  { font-family:'DM Sans',sans-serif; display:flex; flex-direction:column; gap:24px; }

        /* Banner */
        .dp-banner {
          background:linear-gradient(135deg,#0a1628 0%,#0f2240 60%,#065f4a 100%);
          border-radius:20px; padding:26px 32px;
          display:flex; align-items:center; justify-content:space-between;
          position:relative; overflow:hidden;
          animation:dpFade .6s ease both;
        }
        .dp-banner::after { content:''; position:absolute; top:-60px; right:-60px; width:200px; height:200px; border-radius:50%; background:radial-gradient(circle,rgba(13,148,136,.18),transparent 65%); pointer-events:none; }
        .dp-banner-text h2 { font-family:'Cormorant Garamond',serif; font-size:1.7rem; font-weight:700; color:#fff; margin-bottom:4px; }
        .dp-banner-text p  { font-size:.85rem; color:rgba(255,255,255,.55); font-weight:300; }
        .dp-banner-stats   { display:flex; gap:28px; position:relative; z-index:1; }
        .dp-banner-num { font-family:'Cormorant Garamond',serif; font-size:2rem; font-weight:700; color:#14b8a6; line-height:1; }
        .dp-banner-lbl { font-size:.65rem; color:rgba(255,255,255,.4); letter-spacing:.1em; text-transform:uppercase; margin-top:3px; }

        /* Stats grid */
        .dp-stats { display:grid; grid-template-columns:repeat(auto-fit,minmax(180px,1fr)); gap:16px; }

        /* Lower layout */
        .dp-lower { display:grid; grid-template-columns:1.4fr 1fr; gap:20px; }
        @media(max-width:1024px) { .dp-lower{grid-template-columns:1fr;} }

        /* Card */
        .dp-card { background:#fff; border-radius:18px; border:1px solid rgba(10,22,40,.07); box-shadow:0 2px 16px rgba(10,22,40,.05); overflow:hidden; }
        .dp-card-header { display:flex; align-items:center; justify-content:space-between; padding:18px 22px 0; margin-bottom:14px; }
        .dp-card-title  { font-family:'Cormorant Garamond',serif; font-size:1.1rem; font-weight:700; color:#0a1628; }
        .dp-card-link   { font-size:.75rem; color:#0d9488; text-decoration:none; font-weight:500; }
        .dp-card-link:hover { text-decoration:underline; }

        /* Appointment list */
        .dp-appt-list { padding:0 22px 18px; display:flex; flex-direction:column; gap:1px; }
        .dp-appt-item { display:flex; align-items:center; gap:12px; padding:11px 10px; border-radius:12px; transition:background .15s; cursor:pointer; }
        .dp-appt-item:hover { background:rgba(10,22,40,.025); }
        .dp-appt-time { font-size:.78rem; font-weight:600; color:#0d9488; width:48px; flex-shrink:0; }
        .dp-av { width:34px; height:34px; border-radius:50%; background:linear-gradient(135deg,#0d9488,#0a1628); display:flex; align-items:center; justify-content:center; font-size:.68rem; font-weight:700; color:#fff; flex-shrink:0; }
        .dp-appt-name    { font-size:.84rem; font-weight:500; color:#0a1628; }
        .dp-appt-service { font-size:.72rem; color:#94a3b8; }
        .dp-badge { font-size:.65rem; font-weight:700; letter-spacing:.06em; text-transform:uppercase; padding:3px 10px; border-radius:50px; white-space:nowrap; }

        /* Recent patients */
        .dp-pt-list { padding:0 22px 18px; display:flex; flex-direction:column; gap:1px; }
        .dp-pt-item { display:flex; align-items:center; gap:12px; padding:10px 10px; border-radius:12px; transition:background .15s; cursor:pointer; }
        .dp-pt-item:hover { background:rgba(10,22,40,.025); }
        .dp-pt-name      { font-size:.84rem; font-weight:500; color:#0a1628; }
        .dp-pt-sub       { font-size:.72rem; color:#94a3b8; }
        .dp-pt-right     { margin-left:auto; text-align:right; }
        .dp-pt-visits    { font-size:.82rem; font-weight:600; color:#0d9488; }
        .dp-pt-date      { font-size:.7rem; color:#94a3b8; }

        /* Calendar */
        .dp-cal-wrap { padding:0 22px 22px; }

        /* Error */
        .dp-error { background:rgba(220,38,38,.06); border:1px solid rgba(220,38,38,.2); border-radius:14px; padding:16px 20px; display:flex; align-items:center; gap:10px; color:#dc2626; font-size:.85rem; }

        /* Empty state */
        .dp-empty { padding:32px; text-align:center; color:#94a3b8; font-size:.85rem; }

        /* Skeleton */
        .dp-skel-grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(180px,1fr)); gap:16px; }
        .dp-skel-card { background:#fff; border-radius:18px; padding:22px; border:1px solid rgba(10,22,40,.07); display:flex; flex-direction:column; gap:12px; }

        @media(max-width:640px) {
          .dp-banner { flex-direction:column; gap:18px; align-items:flex-start; }
          .dp-stats  { grid-template-columns:repeat(2,1fr); }
          .dp-banner-stats { gap:18px; }
        }
      `}</style>

      <div className="dp-root">

        {/* ── Greeting banner ── */}
        <div className="dp-banner">
          <div className="dp-banner-text">
            <h2>{greeting}, {userName} 👋</h2>
            <p>Here's what's happening at your clinic today</p>
          </div>
          <div className="dp-banner-stats">
            {loading
              ? [1,2,3].slice(0, isAdmin ? 3 : 2).map(n => (
                  <div key={n} style={{ textAlign:"center" }}>
                    <div style={{ width:48, height:32, background:"rgba(255,255,255,.1)", borderRadius:8, margin:"0 auto 4px" }} />
                    <div style={{ width:60, height:10, background:"rgba(255,255,255,.06)", borderRadius:4, margin:"0 auto" }} />
                  </div>
                ))
              : bannerStats.map(s => (
                  <div key={s.lbl} style={{ textAlign:"center" }}>
                    <div className="dp-banner-num">{s.num}</div>
                    <div className="dp-banner-lbl">{s.lbl}</div>
                  </div>
                ))
            }
          </div>
        </div>

        {/* ── Error state ── */}
        {error && (
          <div className="dp-error">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
            {error}
            <button
              onClick={fetchDashboard}
              style={{ marginLeft:"auto", background:"rgba(220,38,38,.1)", border:"none", color:"#dc2626", padding:"4px 12px", borderRadius:8, cursor:"pointer", fontSize:".8rem", fontWeight:500 }}
            >
              Retry
            </button>
          </div>
        )}

        {/* ── Stat cards — skeleton while loading ── */}
        {loading ? (
          <div className="dp-skel-grid">
            {[1,2,3,4].map(n => (
              <div key={n} className="dp-skel-card">
                <Skeleton w="44px" h="44px" radius="12px" />
                <Skeleton h="32px" w="60%" />
                <Skeleton h="14px" w="80%" />
              </div>
            ))}
          </div>
        ) : (
          <>
            <div className="dp-stats">
              {statCards.map((s, i) => (
                <StatCard key={s.label} {...s} delay={i * 60} />
              ))}
              {adminStatCards.map((s, i) => (
                <PermissionGate key={s.label} permission="billing:reports">
                  <StatCard {...s} delay={(statCards.length + i) * 60} />
                </PermissionGate>
              ))}
            </div>
          </>
        )}

        {/* ── Lower section ── */}
        <div className="dp-lower">

          {/* Today's Appointments */}
          <div className="dp-card">
            <div className="dp-card-header">
              <span className="dp-card-title">Today's Appointments</span>
              <a href="/dashboard/appointments" className="dp-card-link">View all →</a>
            </div>

            {loading ? (
              <div className="dp-appt-list">
                {[1,2,3,4].map(n => (
                  <div key={n} style={{ display:"flex", alignItems:"center", gap:12, padding:"11px 10px" }}>
                    <Skeleton w="42px" h="16px" />
                    <Skeleton w="34px" h="34px" radius="50%" />
                    <div style={{ flex:1, display:"flex", flexDirection:"column", gap:6 }}>
                      <Skeleton h="14px" w="60%" />
                      <Skeleton h="12px" w="80%" />
                    </div>
                    <Skeleton w="70px" h="22px" radius="50px" />
                  </div>
                ))}
              </div>
            ) : !data?.todayAppointments?.length ? (
              <div className="dp-empty">No appointments scheduled for today</div>
            ) : (
              <div className="dp-appt-list">
                {data.todayAppointments.map(a => {
                  const st = STATUS_STYLE[a.status] ?? STATUS_STYLE.pending
                  return (
                    <div key={a.id} className="dp-appt-item">
                      <div className="dp-appt-time">{a.time}</div>
                      <div className="dp-av">{getInitials(a.patient.name)}</div>
                      <div style={{ flex:1, minWidth:0 }}>
                        <div className="dp-appt-name">{a.patient.name}</div>
                        <div className="dp-appt-service">
                          {a.service?.name ?? "General"} · {a.doctor.name}
                        </div>
                      </div>
                      <span className="dp-badge" style={{ background:st.bg, color:st.color }}>
                        {st.label}
                      </span>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Recent Patients */}
          <div className="dp-card">
            <div className="dp-card-header">
              <span className="dp-card-title">Recent Patients</span>
              <a href="/dashboard/patients" className="dp-card-link">View all →</a>
            </div>

            {loading ? (
              <div className="dp-pt-list">
                {[1,2,3,4].map(n => (
                  <div key={n} style={{ display:"flex", alignItems:"center", gap:12, padding:"10px 10px" }}>
                    <Skeleton w="34px" h="34px" radius="50%" />
                    <div style={{ flex:1, display:"flex", flexDirection:"column", gap:6 }}>
                      <Skeleton h="14px" w="70%" />
                      <Skeleton h="12px" w="50%" />
                    </div>
                    <div style={{ display:"flex", flexDirection:"column", gap:4, alignItems:"flex-end" }}>
                      <Skeleton w="50px" h="14px" />
                      <Skeleton w="40px" h="12px" />
                    </div>
                  </div>
                ))}
              </div>
            ) : !data?.recentPatients?.length ? (
              <div className="dp-empty">No patients found</div>
            ) : (
              <div className="dp-pt-list">
                {data.recentPatients.map(p => (
                  <div key={p.id} className="dp-pt-item">
                    <div className="dp-av">{getInitials(p.name)}</div>
                    <div>
                      <div className="dp-pt-name">{p.name}</div>
                      <div className="dp-pt-sub">{p.phone}</div>
                    </div>
                    <div className="dp-pt-right">
                      <div className="dp-pt-visits">{p.totalVisits} visits</div>
                      <div className="dp-pt-date">{formatDate(p.lastVisit)}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── Appointment Calendar ── */}
        <div className="dp-card">
          <div className="dp-card-header">
            <span className="dp-card-title">Appointment Calendar</span>
            <a href="/dashboard/appointments" className="dp-card-link">Manage →</a>
          </div>
          <div className="dp-cal-wrap">
            <AppointmentCalendar />
          </div>
        </div>

      </div>
    </>
  )
}