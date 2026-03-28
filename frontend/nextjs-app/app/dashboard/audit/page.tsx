"use client"

// app/dashboard/audit/page.tsx
// Admin-only audit log viewer.
// API: GET /api/audit?page=&limit=&resource=&userId=&from=&to=

import { useState, useEffect, useCallback } from "react"
import { useAuthStore } from "@/store/authStore"
import API from "@/lib/api"

interface AuditLog {
  id:         string
  userId:     string
  userEmail:  string
  action:     string
  resource:   string
  resourceId?: string
  details?:   Record<string, any>
  ip?:        string
  createdAt:  string
}

interface AuditResponse {
  logs:       AuditLog[]
  total:      number
  page:       number
  totalPages: number
}

const ACTION_COLORS: Record<string, { bg: string; color: string }> = {
  LOGIN:   { bg: "rgba(37,99,235,.08)",   color: "#2563eb" },
  CREATE:  { bg: "rgba(13,148,136,.08)",  color: "#0d9488" },
  UPDATE:  { bg: "rgba(245,158,11,.08)",  color: "#d97706" },
  DELETE:  { bg: "rgba(220,38,38,.08)",   color: "#dc2626" },
  LOGOUT:  { bg: "rgba(100,116,139,.08)", color: "#64748b" },
}
function actionStyle(action: string) {
  return ACTION_COLORS[action.toUpperCase()] ?? { bg: "rgba(10,22,40,.06)", color: "#64748b" }
}

function formatTs(ts: string) {
  return new Date(ts).toLocaleString("en-IN", {
    day: "numeric", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  })
}

function Skel({ w = "100%", h = "14px" }: { w?: string; h?: string }) {
  return (
    <div style={{
      width: w, height: h, borderRadius: 6,
      background: "linear-gradient(90deg,#f1f5f9 25%,#e2e8f0 50%,#f1f5f9 75%)",
      backgroundSize: "200% 100%", animation: "shimmer 1.4s infinite",
    }} />
  )
}

function AccessDenied() {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: 400, gap: 16, textAlign: "center" }}>
      <div style={{ fontSize: "3rem" }}>🔒</div>
      <h2 style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: "1.5rem", fontWeight: 700, color: "#0a1628" }}>Admin Access Required</h2>
      <p style={{ fontSize: ".9rem", color: "#64748b", maxWidth: 340 }}>Audit logs are restricted to administrators only.</p>
    </div>
  )
}

export default function AuditPage() {
  const { role } = useAuthStore()
  if (role() !== "admin") return <AccessDenied />

  const [logs,       setLogs]       = useState<AuditLog[]>([])
  const [total,      setTotal]      = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [page,       setPage]       = useState(1)
  const [loading,    setLoading]    = useState(true)
  const [error,      setError]      = useState<string | null>(null)

  // Filters
  const [resource,   setResource]   = useState("")
  const [from,       setFrom]       = useState("")
  const [to,         setTo]         = useState("")

  const fetchLogs = useCallback(async (pg = 1) => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams({ page: String(pg), limit: "50" })
      if (resource.trim()) params.set("resource", resource.trim())
      if (from)            params.set("from", from)
      if (to)              params.set("to", to)

      const res  = await API.get(`/audit?${params}`)
      const data = res.data as unknown as AuditResponse
      setLogs(data.logs)
      setTotal(data.total)
      setTotalPages(data.totalPages)
      setPage(pg)
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? err?.message ?? "Failed to load audit logs"
      setError(typeof msg === "string" ? msg : "Failed to load audit logs")
    } finally {
      setLoading(false)
    }
  }, [resource, from, to])

  useEffect(() => { fetchLogs(1) }, [])

  const inp: React.CSSProperties = {
    padding: "8px 12px", borderRadius: 9, border: "1.5px solid rgba(10,22,40,.1)",
    fontFamily: "'DM Sans',sans-serif", fontSize: ".84rem", color: "#0a1628",
    background: "#fff", outline: "none", minWidth: 140,
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@700&family=DM+Sans:wght@300;400;500;600&display=swap');
        @keyframes shimmer { to { background-position: -200% 0 } }
        @keyframes fadeIn  { from { opacity:0; transform:translateY(6px) } to { opacity:1; transform:translateY(0) } }
        .audit-row { animation: fadeIn .25s ease both; }
        .audit-row:hover { background: rgba(10,22,40,.02) !important; }
      `}</style>

      <div style={{ padding: "0 0 48px", fontFamily: "'DM Sans',sans-serif", maxWidth: 1200 }}>
        {/* Header */}
        <div style={{ marginBottom: 24 }}>
          <h1 style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: "1.9rem", fontWeight: 700, color: "#0a1628", margin: 0 }}>
            Audit Logs
          </h1>
          <p style={{ fontSize: ".85rem", color: "#64748b", marginTop: 4 }}>
            Security events, data changes, and user actions across the clinic system.
          </p>
        </div>

        {/* Filters */}
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 20, alignItems: "flex-end" }}>
          <div>
            <div style={{ fontSize: ".65rem", fontWeight: 600, letterSpacing: ".1em", textTransform: "uppercase", color: "#94a3b8", marginBottom: 4 }}>Resource</div>
            <input style={inp} placeholder="Patient, Appointment…" value={resource} onChange={e => setResource(e.target.value)} />
          </div>
          <div>
            <div style={{ fontSize: ".65rem", fontWeight: 600, letterSpacing: ".1em", textTransform: "uppercase", color: "#94a3b8", marginBottom: 4 }}>From</div>
            <input type="date" style={inp} value={from} onChange={e => setFrom(e.target.value)} />
          </div>
          <div>
            <div style={{ fontSize: ".65rem", fontWeight: 600, letterSpacing: ".1em", textTransform: "uppercase", color: "#94a3b8", marginBottom: 4 }}>To</div>
            <input type="date" style={inp} value={to} onChange={e => setTo(e.target.value)} />
          </div>
          <button
            onClick={() => fetchLogs(1)}
            style={{ padding: "9px 20px", borderRadius: 9, border: "none", background: "linear-gradient(135deg,#0d9488,#065f4a)", color: "#fff", fontFamily: "'DM Sans',sans-serif", fontSize: ".84rem", fontWeight: 600, cursor: "pointer" }}>
            Apply
          </button>
          <button
            onClick={() => { setResource(""); setFrom(""); setTo(""); setTimeout(() => fetchLogs(1), 0) }}
            style={{ padding: "9px 16px", borderRadius: 9, border: "1.5px solid rgba(10,22,40,.1)", background: "none", color: "#64748b", fontFamily: "'DM Sans',sans-serif", fontSize: ".84rem", cursor: "pointer" }}>
            Clear
          </button>
        </div>

        {/* Stats strip */}
        <div style={{ fontSize: ".8rem", color: "#94a3b8", marginBottom: 16 }}>
          {loading ? "Loading…" : `${total.toLocaleString()} event${total !== 1 ? "s" : ""} · Page ${page} of ${totalPages}`}
        </div>

        {/* Error */}
        {error && (
          <div style={{ padding: "12px 16px", borderRadius: 12, background: "rgba(220,38,38,.06)", border: "1px solid rgba(220,38,38,.2)", color: "#dc2626", fontSize: ".84rem", marginBottom: 16, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            {error}
            <button onClick={() => fetchLogs(page)} style={{ border: "none", background: "none", color: "#dc2626", cursor: "pointer", fontSize: ".8rem", fontWeight: 600 }}>Retry</button>
          </div>
        )}

        {/* Table */}
        <div style={{ background: "#fff", borderRadius: 16, border: "1px solid rgba(10,22,40,.07)", overflow: "hidden", boxShadow: "0 2px 16px rgba(10,22,40,.05)" }}>
          {/* Table header */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr 1fr 120px", gap: 12, padding: "12px 20px", background: "rgba(10,22,40,.02)", borderBottom: "1px solid rgba(10,22,40,.06)" }}>
            {["Timestamp", "User", "Action", "Resource", "IP", "Details"].map(h => (
              <div key={h} style={{ fontSize: ".65rem", fontWeight: 700, letterSpacing: ".1em", textTransform: "uppercase", color: "#94a3b8" }}>{h}</div>
            ))}
          </div>

          {/* Rows */}
          {loading ? (
            <div style={{ padding: "20px 20px", display: "flex", flexDirection: "column", gap: 14 }}>
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr 1fr 120px", gap: 12 }}>
                  {Array.from({ length: 6 }).map((_, j) => <Skel key={j} />)}
                </div>
              ))}
            </div>
          ) : logs.length === 0 ? (
            <div style={{ padding: "48px 20px", textAlign: "center", color: "#94a3b8", fontSize: ".9rem" }}>
              No audit events found for the selected filters.
            </div>
          ) : (
            logs.map((log, i) => {
              const as = actionStyle(log.action)
              return (
                <div key={log.id} className="audit-row" style={{
                  display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr 1fr 120px",
                  gap: 12, padding: "12px 20px",
                  borderBottom: i < logs.length - 1 ? "1px solid rgba(10,22,40,.04)" : "none",
                  background: i % 2 === 0 ? "#fff" : "rgba(249,247,244,.6)",
                  alignItems: "center",
                }}>
                  <div style={{ fontSize: ".78rem", color: "#64748b" }}>{formatTs(log.createdAt)}</div>
                  <div>
                    <div style={{ fontSize: ".82rem", fontWeight: 500, color: "#0a1628" }}>{log.userEmail.split("@")[0]}</div>
                    <div style={{ fontSize: ".7rem", color: "#94a3b8" }}>{log.userEmail}</div>
                  </div>
                  <div>
                    <span style={{ padding: "3px 10px", borderRadius: 20, fontSize: ".72rem", fontWeight: 600, background: as.bg, color: as.color }}>
                      {log.action}
                    </span>
                  </div>
                  <div>
                    <div style={{ fontSize: ".82rem", fontWeight: 500, color: "#0a1628" }}>{log.resource}</div>
                    {log.resourceId && <div style={{ fontSize: ".68rem", color: "#94a3b8", fontFamily: "monospace" }}>{log.resourceId.slice(0, 8)}…</div>}
                  </div>
                  <div style={{ fontSize: ".78rem", color: "#64748b", fontFamily: "monospace" }}>{log.ip ?? "—"}</div>
                  <div>
                    {log.details && (
                      <details style={{ cursor: "pointer" }}>
                        <summary style={{ fontSize: ".72rem", color: "#0d9488", cursor: "pointer", listStyle: "none" }}>View</summary>
                        <pre style={{ fontSize: ".68rem", color: "#374151", marginTop: 4, background: "rgba(10,22,40,.04)", padding: "6px 8px", borderRadius: 6, maxWidth: 200, overflow: "auto", whiteSpace: "pre-wrap", wordBreak: "break-all" }}>
                          {JSON.stringify(log.details, null, 2)}
                        </pre>
                      </details>
                    )}
                  </div>
                </div>
              )
            })
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 20, justifyContent: "center" }}>
            <button
              disabled={page <= 1}
              onClick={() => fetchLogs(page - 1)}
              style={{ padding: "7px 16px", borderRadius: 8, border: "1.5px solid rgba(10,22,40,.1)", background: "none", cursor: page <= 1 ? "not-allowed" : "pointer", fontSize: ".82rem", color: "#64748b", opacity: page <= 1 ? .4 : 1 }}>
              ← Prev
            </button>
            <span style={{ fontSize: ".82rem", color: "#64748b" }}>Page {page} / {totalPages}</span>
            <button
              disabled={page >= totalPages}
              onClick={() => fetchLogs(page + 1)}
              style={{ padding: "7px 16px", borderRadius: 8, border: "1.5px solid rgba(10,22,40,.1)", background: "none", cursor: page >= totalPages ? "not-allowed" : "pointer", fontSize: ".82rem", color: "#64748b", opacity: page >= totalPages ? .4 : 1 }}>
              Next →
            </button>
          </div>
        )}
      </div>
    </>
  )
}
