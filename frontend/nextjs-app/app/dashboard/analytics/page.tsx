"use client"

// app/(dashboard)/dashboard/analytics/page.tsx
// STRICTLY ADMIN ONLY.
//
// Single API call: GET /api/analytics/full?months=6
// Returns: { kpis, revenueTrend, appointmentStats, serviceBreakdown, doctorPerformance, recentBills }

import { useState, useEffect, useCallback } from "react"
import { useAuthStore } from "@/store/authStore"
import API from "@/lib/api"
import {
  AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell,
  Legend,
} from "recharts"

// ── Types ─────────────────────────────────────────────────────────────────────
interface KPIs {
  revenue: {
    current:     number
    collected:   number
    growth:      number
    outstanding: number
  }
  appointments: { current: number; growth: number }
  patients:     { total: number; newThisMonth: number; growth: number }
}

interface RevenueTrendItem {
  month:        string
  billed:       number
  collected:    number
  appointments: number
}

interface DoctorPerf {
  id:           string
  name:         string
  specialty:    string
  appointments: number
  revenue:      number
  collected:    number
}

interface ServiceItem {
  name:    string
  count:   number
  revenue: number
}

interface RecentBill {
  id: string; patient: string; total: number; paid: number; balance: number; status: string; date: string
}

interface AnalyticsData {
  kpis:               KPIs
  revenueTrend:       RevenueTrendItem[]
  appointmentStats:   Record<string, number>
  serviceBreakdown:   ServiceItem[]
  doctorPerformance:  DoctorPerf[]
  recentBills:        RecentBill[]
}

// ── Palette ───────────────────────────────────────────────────────────────────
const PIE_COLORS = ["#0d9488", "#2563eb", "#7c3aed", "#d97706", "#ef4444", "#94a3b8"]
const APPT_STATUS_COLORS: Record<string, string> = {
  completed:   "#0d9488",
  confirmed:   "#16a34a",
  pending:     "#f59e0b",
  checked_in:  "#2563eb",
  in_progress: "#7c3aed",
  cancelled:   "#ef4444",
  no_show:     "#94a3b8",
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmt(v: number) {
  if (v >= 100000) return `₹${(v / 100000).toFixed(1)}L`
  if (v >= 1000)   return `₹${(v / 1000).toFixed(0)}k`
  return `₹${v}`
}
function fmtExact(v: number) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(v)
}
function fmtDate(d: string) {
  return new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short" })
}

function GrowthBadge({ value }: { value: number }) {
  const up = value >= 0
  return (
    <span style={{
      fontSize: ".72rem", fontWeight: 700, padding: "2px 8px", borderRadius: 50,
      background: up ? "rgba(22,163,74,.1)" : "rgba(220,38,38,.1)",
      color: up ? "#16a34a" : "#dc2626",
    }}>
      {up ? "↑" : "↓"} {Math.abs(value)}%
    </span>
  )
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
      <p style={{ fontSize: ".9rem", color: "#64748b", maxWidth: 360 }}>
        Analytics and financial reports are accessible to administrators only.
      </p>
      <div style={{ padding: "10px 20px", borderRadius: 12, background: "rgba(220,38,38,.06)", border: "1px solid rgba(220,38,38,.2)", fontSize: ".8rem", color: "#dc2626", fontWeight: 500 }}>
        🚫 Admin access required
      </div>
    </div>
  )
}

// ── Custom Tooltip ────────────────────────────────────────────────────────────
function RevenueTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background: "#fff", border: "1px solid rgba(10,22,40,.1)", borderRadius: 10, padding: "10px 14px", fontSize: ".8rem", boxShadow: "0 4px 16px rgba(10,22,40,.1)" }}>
      <div style={{ fontWeight: 700, color: "#0a1628", marginBottom: 6 }}>{label}</div>
      {payload.map((p: any) => (
        <div key={p.dataKey} style={{ color: p.color, marginBottom: 3 }}>
          {p.name}: <strong>{p.dataKey === "appointments" ? p.value : fmt(p.value)}</strong>
        </div>
      ))}
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function AnalyticsPage() {
  const { role } = useAuthStore()

  // ── RBAC guard — admin only ────────────────────────────────────────────────
  if (role() !== "admin") return <AccessDenied />

  // ── State ──────────────────────────────────────────────────────────────────
  const [data,    setData]    = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState<string | null>(null)
  const [months,  setMonths]  = useState(6)

  // ── Fetch all analytics in one call ───────────────────────────────────────
  const fetchAnalytics = useCallback(async (m = months) => {
    setLoading(true)
    setError(null)
    try {
      const res  = await API.get(`/analytics/full?months=${m}`)
      setData(res.data as unknown as AnalyticsData)
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? err?.message ?? "Failed to load analytics"
      setError(typeof msg === "string" ? msg : "Failed to load analytics")
    } finally {
      setLoading(false)
    }
  }, [months])

  useEffect(() => { fetchAnalytics(6) }, [])

  const handleMonthsChange = (m: number) => {
    setMonths(m)
    fetchAnalytics(m)
  }

  // ── Appointment pie data ───────────────────────────────────────────────────
  const apptPieData = data ? Object.entries(data.appointmentStats)
    .filter(([, v]) => v > 0)
    .map(([k, v]) => ({ name: k.replace("_", " "), value: v, color: APPT_STATUS_COLORS[k] ?? "#94a3b8" }))
    : []

  const totalAppts = apptPieData.reduce((s, i) => s + i.value, 0)

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@700&family=DM+Sans:wght@300;400;500;600&display=swap');
        @keyframes shimmer { to{background-position:-200% 0} }
        @keyframes fadeIn  { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }

        .an-root  { font-family:'DM Sans',sans-serif; display:flex; flex-direction:column; gap:24px; }
        .an-header { display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:12px; }
        .an-title  { font-family:'Cormorant Garamond',serif; font-size:1.6rem; font-weight:700; color:#0a1628; }
        .an-subtitle { font-size:.82rem; color:#64748b; margin-top:2px; }

        .an-month-btns { display:flex; gap:6px; }
        .an-mbtn { padding:6px 14px; border-radius:8px; border:1px solid rgba(10,22,40,.1); background:#fff; cursor:pointer; font-family:'DM Sans',sans-serif; font-size:.76rem; color:#64748b; transition:all .15s; }
        .an-mbtn.active { background:#0a1628; color:#fff; border-color:#0a1628; }
        .an-mbtn:hover:not(.active) { background:rgba(10,22,40,.04); }

        .an-kpis  { display:grid; grid-template-columns:repeat(4,1fr); gap:16px; }
        @media(max-width:900px) { .an-kpis{grid-template-columns:repeat(2,1fr);} }
        @media(max-width:480px) { .an-kpis{grid-template-columns:1fr;} }
        .an-kpi   { background:#fff; border-radius:18px; border:1px solid rgba(10,22,40,.07); padding:20px 22px; box-shadow:0 2px 12px rgba(10,22,40,.05); animation:fadeIn .4s ease both; }
        .an-kpi-icon { width:42px; height:42px; border-radius:12px; display:flex; align-items:center; justify-content:center; font-size:1.1rem; margin-bottom:12px; }
        .an-kpi-num  { font-family:'Cormorant Garamond',serif; font-size:2rem; font-weight:700; color:#0a1628; line-height:1; margin-bottom:4px; }
        .an-kpi-lbl  { font-size:.76rem; color:#64748b; margin-bottom:6px; }
        .an-kpi-sub  { font-size:.72rem; color:#94a3b8; margin-top:4px; }
        @media(max-width:480px) { .an-kpi{padding:14px 16px;} .an-kpi-num{font-size:1.6rem;} }

        .an-grid2 { display:grid; grid-template-columns:1fr 1fr; gap:20px; }
        .an-grid3 { display:grid; grid-template-columns:2fr 1fr; gap:20px; }
        @media(max-width:900px) { .an-grid2,.an-grid3{grid-template-columns:1fr;} }
        @media(max-width:640px) { .an-card{padding:16px;} .an-header{gap:8px;} .an-doc-stats{gap:10px;} .an-bar-label{width:80px;} .an-title{font-size:1.3rem;} }
        @media(max-width:480px) { .an-month-btns{flex-wrap:wrap;gap:4px;} .an-skel-kpis{grid-template-columns:repeat(2,1fr);} .an-doc-row{flex-wrap:wrap;} }

        .an-card       { background:#fff; border-radius:18px; border:1px solid rgba(10,22,40,.07); box-shadow:0 2px 16px rgba(10,22,40,.05); padding:22px; animation:fadeIn .4s ease both; }
        .an-card-title { font-family:'Cormorant Garamond',serif; font-size:1.05rem; font-weight:700; color:#0a1628; margin-bottom:18px; display:flex; align-items:center; justify-content:space-between; }
        .an-card-sub   { font-size:.74rem; color:#94a3b8; font-family:'DM Sans',sans-serif; font-weight:400; }

        .an-doc-row   { display:flex; align-items:center; gap:12px; padding:10px 0; border-bottom:1px solid rgba(10,22,40,.05); }
        .an-doc-row:last-child { border-bottom:none; }
        .an-doc-av    { width:36px; height:36px; border-radius:50%; background:linear-gradient(135deg,#0d9488,#0a1628); display:flex; align-items:center; justify-content:center; font-size:.68rem; font-weight:700; color:#fff; flex-shrink:0; }
        .an-doc-name  { font-size:.84rem; font-weight:500; color:#0a1628; }
        .an-doc-spec  { font-size:.7rem; color:#94a3b8; }
        .an-doc-stats { display:flex; gap:16px; margin-left:auto; }
        .an-doc-stat  { text-align:right; }
        .an-doc-val   { font-size:.82rem; font-weight:600; color:#0d9488; }
        .an-doc-key   { font-size:.64rem; color:#94a3b8; }

        .an-bill-row  { display:flex; align-items:center; gap:12px; padding:9px 0; border-bottom:1px solid rgba(10,22,40,.05); }
        .an-bill-row:last-child { border-bottom:none; }
        .an-bill-name { font-size:.83rem; font-weight:500; color:#0a1628; }
        .an-bill-date { font-size:.7rem; color:#94a3b8; }
        .an-bill-badge { font-size:.62rem; font-weight:700; letter-spacing:.06em; text-transform:uppercase; padding:2px 8px; border-radius:50px; }

        .an-bar-row   { display:flex; align-items:center; gap:10px; margin-bottom:10px; }
        .an-bar-label { font-size:.76rem; color:#64748b; width:110px; flex-shrink:0; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
        .an-bar-track { flex:1; background:rgba(10,22,40,.06); border-radius:50px; height:8px; }
        .an-bar-fill  { height:8px; border-radius:50px; transition:width .6s ease; }
        .an-bar-val   { font-size:.74rem; font-weight:600; color:#0d9488; width:60px; text-align:right; flex-shrink:0; }

        .an-error { background:rgba(220,38,38,.06); border:1px solid rgba(220,38,38,.2); border-radius:12px; padding:14px 18px; font-size:.83rem; color:#dc2626; display:flex; align-items:center; gap:8px; }
        .an-skel-kpis { display:grid; grid-template-columns:repeat(4,1fr); gap:16px; }
        @media(max-width:900px) { .an-skel-kpis{grid-template-columns:repeat(2,1fr);} }
      `}</style>

      <div className="an-root">

        {/* Header */}
        <div className="an-header">
          <div>
            <div className="an-title">Analytics & Reports</div>
            <div className="an-subtitle">Real-time insights from your clinic data</div>
          </div>
          <div className="an-month-btns">
            {[3, 6, 12].map(m => (
              <button key={m} className={`an-mbtn${months === m ? " active" : ""}`}
                onClick={() => handleMonthsChange(m)} disabled={loading}>
                {m}M
              </button>
            ))}
            <button onClick={() => fetchAnalytics(months)}
              style={{ padding: "6px 12px", borderRadius: 8, border: "1px solid rgba(10,22,40,.1)", background: "#fff", cursor: "pointer", fontSize: ".76rem", color: "#0d9488", fontWeight: 600 }}>
              ↻ Refresh
            </button>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="an-error">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
            {error}
            <button onClick={() => fetchAnalytics(months)} style={{ marginLeft: "auto", background: "rgba(220,38,38,.1)", border: "none", color: "#dc2626", padding: "4px 12px", borderRadius: 8, cursor: "pointer", fontSize: ".78rem", fontWeight: 500 }}>Retry</button>
          </div>
        )}

        {/* KPI Cards */}
        {loading ? (
          <div className="an-skel-kpis">
            {[1,2,3,4].map(n => (
              <div key={n} style={{ background: "#fff", borderRadius: 18, padding: 22, border: "1px solid rgba(10,22,40,.07)", display: "flex", flexDirection: "column", gap: 10 }}>
                <Skel w="42px" h="42px" r="12px" />
                <Skel h="32px" w="60%" />
                <Skel h="13px" w="80%" />
                <Skel h="20px" w="50%" />
              </div>
            ))}
          </div>
        ) : data && (
          <div className="an-kpis">
            {[
              {
                icon: "💰", color: "#0d9488", bg: "rgba(13,148,136,.1)",
                num:  fmt(data.kpis.revenue.current),
                lbl:  "Monthly Revenue",
                sub:  `${fmt(data.kpis.revenue.collected)} collected`,
                growth: data.kpis.revenue.growth,
                delay: 0,
              },
              {
                icon: "📅", color: "#2563eb", bg: "rgba(37,99,235,.1)",
                num:  data.kpis.appointments.current.toString(),
                lbl:  "Appointments This Month",
                sub:  "vs last month",
                growth: data.kpis.appointments.growth,
                delay: 60,
              },
              {
                icon: "👤", color: "#7c3aed", bg: "rgba(124,58,237,.1)",
                num:  data.kpis.patients.newThisMonth.toString(),
                lbl:  "New Patients",
                sub:  `${data.kpis.patients.total.toLocaleString("en-IN")} total`,
                growth: data.kpis.patients.growth,
                delay: 120,
              },
              {
                icon: "⚠️", color: "#ef4444", bg: "rgba(239,68,68,.1)",
                num:  fmt(data.kpis.revenue.outstanding),
                lbl:  "Outstanding Balance",
                sub:  "Pending + partial payments",
                growth: null,
                delay: 180,
              },
            ].map(k => (
              <div key={k.lbl} className="an-kpi" style={{ animationDelay: `${k.delay}ms` }}>
                <div className="an-kpi-icon" style={{ background: k.bg }}>{k.icon}</div>
                <div className="an-kpi-num" style={{ color: k.color }}>{k.num}</div>
                <div className="an-kpi-lbl">{k.lbl}</div>
                {k.growth !== null ? <GrowthBadge value={k.growth} /> : null}
                <div className="an-kpi-sub">{k.sub}</div>
              </div>
            ))}
          </div>
        )}

        {/* Revenue trend chart */}
        {loading ? (
          <div style={{ background: "#fff", borderRadius: 18, padding: 22, border: "1px solid rgba(10,22,40,.07)" }}>
            <Skel h="18px" w="40%" />
            <div style={{ marginTop: 20 }}><Skel h="260px" /></div>
          </div>
        ) : data && (
          <div className="an-card">
            <div className="an-card-title">
              Revenue & Appointments — Last {months} Months
              <span className="an-card-sub">Billed vs Collected</span>
            </div>
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={data.revenueTrend} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="gbilled" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#0d9488" stopOpacity={0.18} />
                    <stop offset="95%" stopColor="#0d9488" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gcollected" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#2563eb" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(10,22,40,.06)" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                <YAxis tickFormatter={fmt} tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                <Tooltip content={<RevenueTooltip />} />
                <Area type="monotone" dataKey="billed"    name="Billed"    stroke="#0d9488" strokeWidth={2.5} fill="url(#gbilled)"    dot={{ r: 4, fill: "#0d9488" }} />
                <Area type="monotone" dataKey="collected" name="Collected" stroke="#2563eb" strokeWidth={2}   fill="url(#gcollected)" dot={{ r: 3, fill: "#2563eb" }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Appointments bar + Service pie */}
        {!loading && data && (
          <div className="an-grid2">
            <div className="an-card">
              <div className="an-card-title">Monthly Appointments</div>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={data.revenueTrend} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(10,22,40,.06)" vertical={false} />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ borderRadius: 10, border: "1px solid rgba(10,22,40,.1)", fontSize: 12 }} />
                  <Bar dataKey="appointments" fill="#0d9488" radius={[6, 6, 0, 0]} maxBarSize={40} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="an-card">
              <div className="an-card-title">
                Appointment Status
                <span className="an-card-sub">{totalAppts} total</span>
              </div>
              {apptPieData.length > 0 ? (
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie data={apptPieData} cx="50%" cy="50%" innerRadius={50} outerRadius={80}
                      paddingAngle={2} dataKey="value">
                      {apptPieData.map((entry, i) => (
                        <Cell key={i} fill={entry.color} />
                      ))}
                    </Pie>
                    <Legend iconType="circle" iconSize={8}
                      formatter={(v) => <span style={{ fontSize: 11, color: "#64748b", textTransform: "capitalize" }}>{v}</span>} />
                    <Tooltip formatter={(v) => [v, ""]}
                      contentStyle={{ borderRadius: 10, border: "1px solid rgba(10,22,40,.1)", fontSize: 12 }} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div style={{ textAlign: "center", color: "#94a3b8", padding: "40px 0", fontSize: ".85rem" }}>No appointment data</div>
              )}
            </div>
          </div>
        )}

        {/* Service breakdown + Doctor performance */}
        {!loading && data && (
          <div className="an-grid3">
            {/* Service breakdown — horizontal bar */}
            <div className="an-card">
              <div className="an-card-title">Revenue by Service</div>
              {data.serviceBreakdown.length === 0 ? (
                <div style={{ textAlign: "center", color: "#94a3b8", fontSize: ".85rem", padding: "32px 0" }}>No billing data yet</div>
              ) : (() => {
                const maxRev = Math.max(...data.serviceBreakdown.map(s => s.revenue), 1)
                return data.serviceBreakdown.map((s, i) => (
                  <div key={s.name} className="an-bar-row" style={{ animationDelay: `${i * 60}ms` }}>
                    <div className="an-bar-label" title={s.name}>{s.name}</div>
                    <div className="an-bar-track">
                      <div className="an-bar-fill" style={{ width: `${(s.revenue / maxRev) * 100}%`, background: PIE_COLORS[i % PIE_COLORS.length] }} />
                    </div>
                    <div className="an-bar-val">{fmt(s.revenue)}</div>
                  </div>
                ))
              })()}
            </div>

            {/* Doctor performance */}
            <div className="an-card">
              <div className="an-card-title">Doctor Performance</div>
              {data.doctorPerformance.length === 0 ? (
                <div style={{ textAlign: "center", color: "#94a3b8", fontSize: ".85rem", padding: "32px 0" }}>No doctors found</div>
              ) : data.doctorPerformance.map(d => (
                <div key={d.id} className="an-doc-row">
                  <div className="an-doc-av">{d.name.split(" ").map(n => n[0]).join("").slice(0, 2)}</div>
                  <div>
                    <div className="an-doc-name">{d.name}</div>
                    <div className="an-doc-spec">{d.specialty}</div>
                  </div>
                  <div className="an-doc-stats">
                    <div className="an-doc-stat">
                      <div className="an-doc-val">{d.appointments}</div>
                      <div className="an-doc-key">Appts</div>
                    </div>
                    <div className="an-doc-stat">
                      <div className="an-doc-val">{fmt(d.revenue)}</div>
                      <div className="an-doc-key">Revenue</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recent bills */}
        {!loading && data && data.recentBills.length > 0 && (
          <div className="an-card">
            <div className="an-card-title">
              Recent Bills
              <a href="/dashboard/billing" style={{ fontSize: ".75rem", color: "#0d9488", textDecoration: "none", fontFamily: "'DM Sans',sans-serif", fontWeight: 500 }}>View all →</a>
            </div>
            {data.recentBills.map(b => {
              const statusColors: Record<string, { bg: string; color: string }> = {
                paid:      { bg: "rgba(22,163,74,.1)",  color: "#16a34a" },
                pending:   { bg: "rgba(245,158,11,.1)", color: "#d97706" },
                partial:   { bg: "rgba(37,99,235,.1)",  color: "#2563eb" },
                cancelled: { bg: "rgba(220,38,38,.1)",  color: "#dc2626" },
              }
              const sc = statusColors[b.status] ?? { bg: "rgba(10,22,40,.06)", color: "#64748b" }
              return (
                <div key={b.id} className="an-bill-row">
                  <div style={{ flex: 1 }}>
                    <div className="an-bill-name">{b.patient}</div>
                    <div className="an-bill-date">{fmtDate(b.date)}</div>
                  </div>
                  <div style={{ textAlign: "right", marginRight: 12 }}>
                    <div style={{ fontSize: ".86rem", fontWeight: 700, color: "#0a1628" }}>{fmtExact(b.total)}</div>
                    {b.balance > 0 && <div style={{ fontSize: ".72rem", color: "#ef4444" }}>Due: {fmtExact(b.balance)}</div>}
                  </div>
                  <span className="an-bill-badge" style={{ background: sc.bg, color: sc.color }}>
                    {b.status}
                  </span>
                </div>
              )
            })}
          </div>
        )}

        {/* Loading skeleton for charts */}
        {loading && (
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <div style={{ background: "#fff", borderRadius: 18, padding: 22, border: "1px solid rgba(10,22,40,.07)" }}>
              <Skel h="260px" />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
              <div style={{ background: "#fff", borderRadius: 18, padding: 22, border: "1px solid rgba(10,22,40,.07)" }}><Skel h="220px" /></div>
              <div style={{ background: "#fff", borderRadius: 18, padding: 22, border: "1px solid rgba(10,22,40,.07)" }}><Skel h="220px" /></div>
            </div>
          </div>
        )}
      </div>
    </>
  )
}