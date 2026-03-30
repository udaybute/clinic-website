"use client"

// app/(dashboard)/dashboard/billing/page.tsx
// FULLY REWRITTEN — replaces all mock data with real API calls.
//
// API endpoints used:
//   GET    /api/bills?search=&status=&page=&limit=   → paginated list + statusCounts
//   GET    /api/bills/reports                        → revenue summary (admin only)
//   GET    /api/bills/:id                            → single bill detail
//   POST   /api/bills                                → create bill
//   PUT    /api/bills/:id                            → record payment / update status
//   DELETE /api/bills/:id                            → delete (admin, no payments)

import { useState, useEffect, useCallback, useRef } from "react"
import { useAuthStore }  from "@/store/authStore"
import PermissionGate    from "@/components/ui/PermissionGate"
import API               from "@/lib/api"
import { printBill }     from "@/lib/printUtils"

// ── Types ─────────────────────────────────────────────────────────────────────
type BillStatus = "pending" | "partial" | "paid" | "cancelled"
type PayMethod  = "cash" | "card" | "upi" | "insurance"

interface BillItem {
  id?:         string
  description: string
  quantity:    number
  rate:        number
  amount:      number
}

interface Bill {
  id:            string
  clinicId:      string
  patientId:     string
  appointmentId: string
  subtotal:      number
  discount:      number
  tax:           number
  total:         number
  paid:          number
  balance:       number
  status:        BillStatus
  paymentMethod: PayMethod | null
  createdAt:     string
  items:         BillItem[]
  patient:       { id: string; name: string; phone: string; email?: string }
  appointment?:  {
    id: string; date: string; time: string
    doctor?:  { id: string; name: string }
    service?: { id: string; name: string }
  }
}

interface BillsResponse {
  bills:        Bill[]
  total:        number
  page:         number
  limit:        number
  totalPages:   number
  statusCounts: Record<string, number>
}

interface RevenueSummary {
  today:    { billed: number; collected: number }
  monthly:  { billed: number; collected: number }
  yearly:   { billed: number; collected: number }
  outstanding: number
}

// ── Helpers ───────────────────────────────────────────────────────────────────
const STATUS_CONFIG: Record<BillStatus, { bg: string; color: string; label: string; icon: string }> = {
  paid:      { bg: "rgba(22,163,74,.1)",   color: "#16a34a", label: "Paid",      icon: "✅" },
  pending:   { bg: "rgba(245,158,11,.1)",  color: "#d97706", label: "Pending",   icon: "⏳" },
  partial:   { bg: "rgba(37,99,235,.1)",   color: "#2563eb", label: "Partial",   icon: "🔵" },
  cancelled: { bg: "rgba(220,38,38,.1)",   color: "#dc2626", label: "Cancelled", icon: "✕"  },
}

const PAY_METHOD_LABELS: Record<string, string> = {
  cash: "Cash", card: "Card", upi: "UPI", insurance: "Insurance",
}

function fmt(n: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency", currency: "INR", maximumFractionDigits: 2,
  }).format(n)
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
}

function Skel({ w = "100%", h = "14px", r = "6px" }: { w?: string; h?: string; r?: string }) {
  return <div style={{ width: w, height: h, borderRadius: r, background: "linear-gradient(90deg,#f1f5f9 25%,#e2e8f0 50%,#f1f5f9 75%)", backgroundSize: "200% 100%", animation: "shimmer 1.4s infinite" }} />
}

// ── Create Bill Modal ─────────────────────────────────────────────────────────
function CreateBillModal({ onClose, onSave }: { onClose: () => void; onSave: (d: any) => Promise<void> }) {
  const [form, setForm] = useState({
    patientId: "", appointmentId: "", discount: "0", tax: "0", paymentMethod: "",
  })
  const [items, setItems] = useState<Omit<BillItem, "id">[]>([
    { description: "", quantity: 1, rate: 0, amount: 0 },
  ])
  const [patients, setPatients]       = useState<any[]>([])
  const [appointments, setAppts]      = useState<any[]>([])
  const [saving, setSaving]           = useState(false)
  const [error,  setError]            = useState("")

  useEffect(() => {
    API.get("/patients?limit=100").then(r => {
      const d = r.data as any
      setPatients(Array.isArray(d) ? d : (d?.patients ?? []))
    }).catch(() => {})
  }, [])

  useEffect(() => {
    if (!form.patientId) return
    API.get(`/appointments?patientId=${form.patientId}&status=completed&limit=50`).then(r => {
      const d = r.data as any
      setAppts(Array.isArray(d) ? d : (d?.appointments ?? []))
    }).catch(() => {})
  }, [form.patientId])

  const updateItem = (i: number, k: string, v: string) => {
    setItems(prev => prev.map((item, idx) => {
      if (idx !== i) return item
      const updated = { ...item, [k]: k === "description" ? v : parseFloat(v) || 0 }
      if (k === "quantity" || k === "rate") {
        updated.amount = Math.round(updated.quantity * updated.rate * 100) / 100
      }
      return updated
    }))
  }

  const addItem    = () => setItems(p => [...p, { description: "", quantity: 1, rate: 0, amount: 0 }])
  const removeItem = (i: number) => setItems(p => p.filter((_, idx) => idx !== i))

  const subtotal = items.reduce((s, i) => s + i.amount, 0)
  const discount = parseFloat(form.discount) || 0
  const tax      = parseFloat(form.tax)      || 0
  const total    = Math.round((subtotal - discount + (subtotal * tax) / 100) * 100) / 100

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.patientId)     return setError("Patient is required")
    if (!form.appointmentId) return setError("Appointment is required")
    if (!items.length || items.every(i => !i.description)) return setError("At least one item is required")
    setError("")
    setSaving(true)
    try {
      await onSave({
        patientId:     form.patientId,
        appointmentId: form.appointmentId,
        items:         items.filter(i => i.description),
        discount,
        tax,
        paymentMethod: form.paymentMethod || undefined,
      })
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? err?.message ?? "Failed to create bill"
      setError(Array.isArray(msg) ? msg[0] : msg)
    } finally {
      setSaving(false)
    }
  }

  const inputSt: React.CSSProperties = { padding: "8px 11px", borderRadius: 8, border: "1.5px solid rgba(10,22,40,.12)", background: "#fff", fontFamily: "'DM Sans',sans-serif", fontSize: ".83rem", color: "#0a1628", outline: "none", width: "100%" }
  const labelSt: React.CSSProperties = { fontSize: ".66rem", fontWeight: 600, letterSpacing: ".1em", textTransform: "uppercase", color: "#94a3b8", display: "block", marginBottom: 4 }

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(10,22,40,.6)", zIndex: 500, display: "flex", alignItems: "center", justifyContent: "center", padding: 20, backdropFilter: "blur(4px)" }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: "#fff", borderRadius: 20, width: "100%", maxWidth: 620, maxHeight: "92vh", overflowY: "auto", boxShadow: "0 24px 64px rgba(10,22,40,.25)" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "18px 22px", borderBottom: "1px solid rgba(10,22,40,.07)" }}>
          <h2 style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: "1.25rem", fontWeight: 700, color: "#0a1628" }}>Generate Bill</h2>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "#94a3b8", fontSize: "1.2rem" }}>✕</button>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: "18px 22px", display: "flex", flexDirection: "column", gap: 14 }}>
          {/* Patient + Appointment */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label style={labelSt}>Patient *</label>
              {patients.length ? (
                <select value={form.patientId} onChange={e => setForm(f => ({ ...f, patientId: e.target.value }))} style={inputSt}>
                  <option value="">— Select Patient —</option>
                  {patients.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              ) : (
                <input placeholder="Patient ID" value={form.patientId} onChange={e => setForm(f => ({ ...f, patientId: e.target.value }))} style={inputSt} />
              )}
            </div>
            <div>
              <label style={labelSt}>Appointment *</label>
              {appointments.length ? (
                <select value={form.appointmentId} onChange={e => setForm(f => ({ ...f, appointmentId: e.target.value }))} style={inputSt}>
                  <option value="">— Select Appointment —</option>
                  {appointments.map((a: any) => (
                    <option key={a.id} value={a.id}>
                      {formatDate(a.date)} {a.time} — {a.service?.name ?? "General"}
                    </option>
                  ))}
                </select>
              ) : (
                <input placeholder="Appointment ID" value={form.appointmentId} onChange={e => setForm(f => ({ ...f, appointmentId: e.target.value }))} style={inputSt} />
              )}
            </div>
          </div>

          {/* Bill items */}
          <div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
              <label style={{ ...labelSt, marginBottom: 0 }}>Bill Items</label>
              <button type="button" onClick={addItem} style={{ fontSize: ".72rem", color: "#0d9488", background: "none", border: "none", cursor: "pointer", fontWeight: 600 }}>+ Add Item</button>
            </div>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: ".8rem" }}>
              <thead>
                <tr style={{ background: "rgba(10,22,40,.03)" }}>
                  {["Description", "Qty", "Rate (₹)", "Amount (₹)", ""].map(h => (
                    <th key={h} style={{ padding: "6px 8px", textAlign: "left", fontSize: ".64rem", fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", color: "#94a3b8" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {items.map((item, i) => (
                  <tr key={i}>
                    <td style={{ padding: "5px 4px" }}>
                      <input value={item.description} onChange={e => updateItem(i, "description", e.target.value)}
                        placeholder="Service / item" style={{ ...inputSt, padding: "6px 8px" }} />
                    </td>
                    <td style={{ padding: "5px 4px", width: 60 }}>
                      <input type="number" min={1} value={item.quantity} onChange={e => updateItem(i, "quantity", e.target.value)}
                        style={{ ...inputSt, padding: "6px 8px" }} />
                    </td>
                    <td style={{ padding: "5px 4px", width: 90 }}>
                      <input type="number" min={0} value={item.rate} onChange={e => updateItem(i, "rate", e.target.value)}
                        style={{ ...inputSt, padding: "6px 8px" }} />
                    </td>
                    <td style={{ padding: "5px 8px", fontWeight: 600, color: "#0d9488", whiteSpace: "nowrap" }}>
                      {fmt(item.amount)}
                    </td>
                    <td style={{ padding: "5px 4px" }}>
                      {items.length > 1 && (
                        <button type="button" onClick={() => removeItem(i)}
                          style={{ background: "none", border: "none", cursor: "pointer", color: "#ef4444", fontSize: "1rem", lineHeight: 1 }}>✕</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Discount + Tax + Payment */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
            <div>
              <label style={labelSt}>Discount (₹)</label>
              <input type="number" min={0} value={form.discount} onChange={e => setForm(f => ({ ...f, discount: e.target.value }))} style={inputSt} />
            </div>
            <div>
              <label style={labelSt}>Tax (%)</label>
              <input type="number" min={0} max={100} value={form.tax} onChange={e => setForm(f => ({ ...f, tax: e.target.value }))} style={inputSt} />
            </div>
            <div>
              <label style={labelSt}>Payment Method</label>
              <select value={form.paymentMethod} onChange={e => setForm(f => ({ ...f, paymentMethod: e.target.value }))} style={inputSt}>
                <option value="">— Later —</option>
                <option value="cash">Cash</option>
                <option value="card">Card</option>
                <option value="upi">UPI</option>
                <option value="insurance">Insurance</option>
              </select>
            </div>
          </div>

          {/* Total preview */}
          <div style={{ background: "rgba(10,22,40,.03)", borderRadius: 12, padding: "14px 16px" }}>
            {[
              { k: "Subtotal",  v: fmt(subtotal) },
              { k: `Discount`,  v: `-${fmt(discount)}` },
              { k: `Tax (${form.tax || 0}%)`, v: fmt(subtotal * tax / 100) },
            ].map(r => (
              <div key={r.k} style={{ display: "flex", justifyContent: "space-between", marginBottom: 6, fontSize: ".82rem", color: "#64748b" }}>
                <span>{r.k}</span><span>{r.v}</span>
              </div>
            ))}
            <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 700, fontSize: ".95rem", color: "#0a1628", borderTop: "1.5px solid rgba(10,22,40,.1)", paddingTop: 8, marginTop: 4 }}>
              <span>Total</span><span style={{ color: "#0d9488" }}>{fmt(total)}</span>
            </div>
          </div>

          {error && (
            <div style={{ background: "rgba(220,38,38,.06)", border: "1px solid rgba(220,38,38,.2)", borderRadius: 9, padding: "9px 13px", fontSize: ".82rem", color: "#dc2626" }}>{error}</div>
          )}

          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
            <button type="button" onClick={onClose}
              style={{ padding: "9px 20px", borderRadius: 50, border: "1.5px solid rgba(10,22,40,.12)", background: "none", cursor: "pointer", fontFamily: "'DM Sans',sans-serif", fontSize: ".83rem", color: "#64748b" }}>
              Cancel
            </button>
            <button type="submit" disabled={saving}
              style={{ padding: "9px 24px", borderRadius: 50, border: "none", background: "linear-gradient(135deg,#0d9488,#0a1628)", color: "#fff", cursor: saving ? "not-allowed" : "pointer", fontFamily: "'DM Sans',sans-serif", fontSize: ".83rem", fontWeight: 500, opacity: saving ? .65 : 1, display: "flex", alignItems: "center", gap: 7 }}>
              {saving && <span style={{ width: 14, height: 14, border: "2px solid rgba(255,255,255,.3)", borderTopColor: "#fff", borderRadius: "50%", animation: "spin .7s linear infinite", display: "inline-block" }} />}
              {saving ? "Generating…" : "Generate Bill"}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Record Payment Modal ──────────────────────────────────────────────────────
function PaymentModal({ bill, onClose, onSave }: { bill: Bill; onClose: () => void; onSave: (d: any) => Promise<void> }) {
  const [amount, setAmount]   = useState(String(bill.balance))
  const [method, setMethod]   = useState<string>(bill.paymentMethod ?? "cash")
  const [saving, setSaving]   = useState(false)
  const [error,  setError]    = useState("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const paid = parseFloat(amount)
    if (isNaN(paid) || paid <= 0) return setError("Enter a valid amount")
    if (paid > bill.balance)      return setError(`Maximum payable: ${fmt(bill.balance)}`)
    setError("")
    setSaving(true)
    try {
      await onSave({ paid: bill.paid + paid, paymentMethod: method })
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? err?.message ?? "Payment failed"
      setError(Array.isArray(msg) ? msg[0] : msg)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(10,22,40,.6)", zIndex: 510, display: "flex", alignItems: "center", justifyContent: "center", padding: 20, backdropFilter: "blur(4px)" }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: "#fff", borderRadius: 20, width: "100%", maxWidth: 400, padding: 24, boxShadow: "0 24px 64px rgba(10,22,40,.25)" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
          <h3 style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: "1.15rem", fontWeight: 700, color: "#0a1628" }}>Record Payment</h3>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "#94a3b8", fontSize: "1.1rem" }}>✕</button>
        </div>

        <div style={{ background: "rgba(10,22,40,.03)", borderRadius: 12, padding: "12px 14px", marginBottom: 16, fontSize: ".82rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
            <span style={{ color: "#64748b" }}>Bill Total</span>
            <span style={{ fontWeight: 600 }}>{fmt(bill.total)}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
            <span style={{ color: "#64748b" }}>Already Paid</span>
            <span style={{ color: "#16a34a", fontWeight: 600 }}>{fmt(bill.paid)}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span style={{ color: "#64748b" }}>Balance Due</span>
            <span style={{ color: "#ef4444", fontWeight: 700 }}>{fmt(bill.balance)}</span>
          </div>
        </div>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div>
            <label style={{ fontSize: ".66rem", fontWeight: 600, letterSpacing: ".1em", textTransform: "uppercase", color: "#94a3b8", display: "block", marginBottom: 4 }}>
              Amount (₹)
            </label>
            <input type="number" min={1} max={bill.balance} value={amount} onChange={e => setAmount(e.target.value)}
              style={{ width: "100%", padding: "9px 12px", borderRadius: 9, border: "1.5px solid rgba(10,22,40,.12)", background: "#fff", fontFamily: "'DM Sans',sans-serif", fontSize: ".85rem", color: "#0a1628", outline: "none" }} />
          </div>
          <div>
            <label style={{ fontSize: ".66rem", fontWeight: 600, letterSpacing: ".1em", textTransform: "uppercase", color: "#94a3b8", display: "block", marginBottom: 4 }}>
              Payment Method
            </label>
            <select value={method} onChange={e => setMethod(e.target.value)}
              style={{ width: "100%", padding: "9px 12px", borderRadius: 9, border: "1.5px solid rgba(10,22,40,.12)", background: "#fff", fontFamily: "'DM Sans',sans-serif", fontSize: ".85rem", color: "#0a1628", outline: "none" }}>
              <option value="cash">Cash</option>
              <option value="card">Card</option>
              <option value="upi">UPI</option>
              <option value="insurance">Insurance</option>
            </select>
          </div>

          {error && <div style={{ background: "rgba(220,38,38,.06)", border: "1px solid rgba(220,38,38,.2)", borderRadius: 8, padding: "8px 12px", fontSize: ".8rem", color: "#dc2626" }}>{error}</div>}

          <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
            <button type="button" onClick={onClose}
              style={{ flex: 1, padding: "9px", borderRadius: 50, border: "1.5px solid rgba(10,22,40,.12)", background: "none", cursor: "pointer", fontFamily: "'DM Sans',sans-serif", fontSize: ".83rem", color: "#64748b" }}>
              Cancel
            </button>
            <button type="submit" disabled={saving}
              style={{ flex: 2, padding: "9px", borderRadius: 50, border: "none", background: "linear-gradient(135deg,#16a34a,#0a1628)", color: "#fff", cursor: saving ? "not-allowed" : "pointer", fontFamily: "'DM Sans',sans-serif", fontSize: ".83rem", fontWeight: 500, opacity: saving ? .65 : 1 }}>
              {saving ? "Processing…" : "Confirm Payment"}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function BillingPage() {
  const { role, can } = useAuthStore()
  const isAdmin       = role() === "admin"
  const canCreate     = can("billing:create")
  const canManage     = can("billing:manage")

  // ── State ──────────────────────────────────────────────────────────────────
  const [bills,        setBills]        = useState<Bill[]>([])
  const [statusCounts, setStatusCounts] = useState<Record<string, number>>({})
  const [total,        setTotal]        = useState(0)
  const [totalPages,   setTotalPages]   = useState(1)
  const [page,         setPage]         = useState(1)
  const [revenue,      setRevenue]      = useState<RevenueSummary | null>(null)

  const [search,       setSearch]       = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [loading,      setLoading]      = useState(true)
  const [revenueLoading, setRevLoading] = useState(true)
  const [error,        setError]        = useState<string | null>(null)

  const [selected,     setSelected]     = useState<Bill | null>(null)
  const [showCreate,   setShowCreate]   = useState(false)
  const [payBill,      setPayBill]      = useState<Bill | null>(null)
  const [deleting,     setDeleting]     = useState<string | null>(null)

  const searchRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const LIMIT = 25

  // ── Fetch bills ────────────────────────────────────────────────────────────
  const fetchBills = useCallback(async (pg = 1, q = search, sf = statusFilter) => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams({ page: String(pg), limit: String(LIMIT) })
      if (q.trim()) params.set("search", q.trim())
      if (sf !== "all") params.set("status", sf)

      const res  = await API.get(`/bills?${params}`)
      const data = res.data as unknown as BillsResponse
      setBills(data.bills)
      setTotal(data.total)
      setTotalPages(data.totalPages)
      setStatusCounts(data.statusCounts ?? {})
      setPage(pg)
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? err?.message ?? "Failed to load bills"
      setError(typeof msg === "string" ? msg : "Failed to load bills")
    } finally {
      setLoading(false)
    }
  }, [search, statusFilter])

  // ── Fetch revenue summary (admin only) ─────────────────────────────────────
  const fetchRevenue = useCallback(async () => {
    if (!isAdmin) return
    setRevLoading(true)
    try {
      const res = await API.get("/bills/reports")
      setRevenue(res.data as unknown as RevenueSummary)
    } catch { setRevenue(null) }
    finally { setRevLoading(false) }
  }, [isAdmin])

  useEffect(() => { fetchBills(1, "", "all"); fetchRevenue() }, [])

  const handleSearch = (q: string) => {
    setSearch(q)
    clearTimeout(searchRef.current)
    searchRef.current = setTimeout(() => fetchBills(1, q, statusFilter), 400)
  }

  const handleStatusFilter = (s: string) => {
    setStatusFilter(s)
    fetchBills(1, search, s)
  }

  // ── CRUD ───────────────────────────────────────────────────────────────────
  const handleCreate = async (data: any) => {
    await API.post("/bills", data)
    setShowCreate(false)
    fetchBills(1, search, statusFilter)
    fetchRevenue()
  }

  const handlePayment = async (data: any) => {
    if (!payBill) return
    await API.put(`/bills/${payBill.id}`, data)
    setPayBill(null)
    // Refresh selected detail
    if (selected?.id === payBill.id) {
      const res = await API.get(`/bills/${payBill.id}`)
      setSelected(res.data as unknown as Bill)
    }
    fetchBills(page, search, statusFilter)
    fetchRevenue()
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this bill? This cannot be undone.")) return
    setDeleting(id)
    try {
      await API.delete(`/bills/${id}`)
      if (selected?.id === id) setSelected(null)
      fetchBills(page, search, statusFilter)
      fetchRevenue()
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? "Delete failed"
      alert(Array.isArray(msg) ? msg[0] : msg)
    } finally {
      setDeleting(null) }
  }

  // ── Summary stat cards ─────────────────────────────────────────────────────
  const statCards = [
    {
      num:   revenueLoading ? "…" : fmt(revenue?.monthly.collected ?? 0),
      label: "Monthly Collected",
      color: "#0d9488",
      show:  isAdmin,
    },
    {
      num:   revenueLoading ? "…" : fmt(revenue?.outstanding ?? 0),
      label: "Outstanding",
      color: "#f59e0b",
      show:  isAdmin,
    },
    {
      num:   revenueLoading ? "…" : fmt(revenue?.today.billed ?? 0),
      label: "Today's Revenue",
      color: "#2563eb",
      show:  isAdmin,
    },
    {
      num:   loading ? "…" : String(total),
      label: "Total Bills",
      color: "#0a1628",
      show:  true,
    },
  ].filter(s => s.show)

  const allStatuses = ["all", "pending", "partial", "paid", "cancelled"]

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@700&family=DM+Sans:wght@300;400;500;600&display=swap');
        @keyframes shimmer { to{background-position:-200% 0} }
        @keyframes spin    { to{transform:rotate(360deg)} }
        @keyframes fadeIn  { from{opacity:0;transform:translateY(6px)} to{opacity:1;transform:translateY(0)} }

        .bl-root  { font-family:'DM Sans',sans-serif; display:flex; flex-direction:column; gap:20px; }

        /* Stats */
        .bl-stats { display:grid; grid-template-columns:repeat(auto-fit,minmax(150px,1fr)); gap:14px; }
        @media(max-width:480px) { .bl-stats{grid-template-columns:1fr 1fr;} .bl-stat{padding:14px 16px;} .bl-stat-num{font-size:1.3rem;} }
        .bl-stat  { background:#fff; border-radius:16px; border:1px solid rgba(10,22,40,.07); padding:18px 20px; box-shadow:0 2px 12px rgba(10,22,40,.05); }
        .bl-stat-num { font-family:'Cormorant Garamond',serif; font-size:1.6rem; font-weight:700; line-height:1; }
        .bl-stat-lbl { font-size:.72rem; color:#64748b; margin-top:4px; }

        /* Toolbar */
        .bl-toolbar { display:flex; align-items:center; gap:12px; flex-wrap:wrap; }
        @media(max-width:640px) { .bl-toolbar{flex-direction:column;align-items:stretch;} .bl-new-btn{width:100%;justify-content:center;margin-left:0;} .bl-search input{width:100%;} .bl-search{flex:1;} }
        .bl-filters { display:flex; gap:6px; flex-wrap:wrap; }
        .bl-fbtn    { padding:6px 13px; border-radius:50px; border:1.5px solid rgba(10,22,40,.1); background:none; cursor:pointer; font-family:'DM Sans',sans-serif; font-size:.76rem; font-weight:500; color:#64748b; transition:all .18s; display:flex; align-items:center; gap:5px; }
        .bl-fbtn.active    { background:#0a1628; color:#fff; border-color:#0a1628; }
        .bl-fbtn:hover:not(.active) { border-color:#0a1628; color:#0a1628; }
        .bl-fbtn-cnt { font-size:.62rem; font-weight:700; padding:1px 5px; border-radius:50px; background:rgba(10,22,40,.08); }
        .bl-fbtn.active .bl-fbtn-cnt { background:rgba(255,255,255,.2); }

        .bl-search  { display:flex; align-items:center; gap:7px; padding:7px 13px; border-radius:50px; border:1.5px solid rgba(10,22,40,.1); background:#fff; transition:border-color .18s; }
        .bl-search:focus-within { border-color:#0d9488; }
        .bl-search input { border:none; outline:none; font-family:'DM Sans',sans-serif; font-size:.8rem; color:#0a1628; background:transparent; width:160px; }
        .bl-search input::placeholder { color:#94a3b8; }
        .bl-new-btn { margin-left:auto; display:inline-flex; align-items:center; gap:6px; padding:9px 18px; border-radius:50px; border:none; cursor:pointer; background:linear-gradient(135deg,#0d9488,#0a1628); color:#fff; font-family:'DM Sans',sans-serif; font-size:.83rem; font-weight:500; box-shadow:0 3px 12px rgba(13,148,136,.28); transition:transform .18s; white-space:nowrap; }
        .bl-new-btn:hover { transform:translateY(-1px); }

        /* Layout */
        .bl-layout { display:grid; grid-template-columns:1fr 390px; gap:20px; align-items:start; }
        @media(max-width:1100px) { .bl-layout { grid-template-columns:1fr; } }

        /* Card */
        .bl-card  { background:#fff; border-radius:18px; border:1px solid rgba(10,22,40,.07); box-shadow:0 2px 16px rgba(10,22,40,.05); overflow:hidden; }
        .bl-table-wrap { overflow-x:auto; -webkit-overflow-scrolling:touch; }

        /* Table */
        .bl-table { width:100%; border-collapse:collapse; min-width:600px; }
        .bl-table thead th { text-align:left; padding:11px 16px; font-size:.66rem; font-weight:700; letter-spacing:.1em; text-transform:uppercase; color:#94a3b8; border-bottom:1px solid rgba(10,22,40,.07); background:rgba(10,22,40,.02); white-space:nowrap; }
        .bl-table tbody tr { cursor:pointer; transition:background .15s; animation:fadeIn .25s ease both; }
        .bl-table tbody tr:hover  { background:rgba(10,22,40,.02); }
        .bl-table tbody tr.sel    { background:rgba(13,148,136,.04); }
        .bl-table tbody td { padding:11px 16px; border-bottom:1px solid rgba(10,22,40,.04); vertical-align:middle; }
        .bl-table tbody tr:last-child td { border-bottom:none; }
        .bl-pt-name { font-size:.84rem; font-weight:500; color:#0a1628; }
        .bl-pt-date { font-size:.7rem; color:#94a3b8; }
        .bl-amount  { font-size:.88rem; font-weight:700; color:#0a1628; }
        .bl-paid    { font-size:.75rem; color:#16a34a; font-weight:600; }
        .bl-balance { font-size:.75rem; color:#ef4444; font-weight:600; }
        .bl-badge   { font-size:.63rem; font-weight:700; letter-spacing:.06em; text-transform:uppercase; padding:3px 9px; border-radius:50px; }
        .bl-method  { font-size:.72rem; color:#64748b; }

        /* Pagination */
        .bl-pagination { display:flex; align-items:center; gap:6px; justify-content:center; padding:14px; flex-wrap:wrap; }
        .bl-pgbtn { padding:5px 11px; border-radius:8px; border:1px solid rgba(10,22,40,.1); background:#fff; cursor:pointer; font-family:'DM Sans',sans-serif; font-size:.76rem; color:#64748b; transition:all .15s; }
        .bl-pgbtn:hover:not(:disabled) { background:rgba(10,22,40,.04); }
        .bl-pgbtn.active { background:#0a1628; color:#fff; border-color:#0a1628; }
        .bl-pgbtn:disabled { opacity:.4; cursor:not-allowed; }

        /* Detail */
        .bl-detail { background:#fff; border-radius:18px; border:1px solid rgba(10,22,40,.07); box-shadow:0 2px 16px rgba(10,22,40,.05); overflow:hidden; position:sticky; top:80px; }
        .bl-detail-body { padding:18px 20px; max-height:calc(100vh - 220px); overflow-y:auto; }
        .bl-d-row  { display:flex; justify-content:space-between; align-items:center; padding:7px 0; border-bottom:1px solid rgba(10,22,40,.05); }
        .bl-d-row:last-child { border-bottom:none; }
        .bl-d-key  { font-size:.76rem; color:#64748b; }
        .bl-d-val  { font-size:.82rem; font-weight:500; color:#0a1628; }
        .bl-items-tbl { width:100%; border-collapse:collapse; font-size:.78rem; }
        .bl-items-tbl th { text-align:left; padding:6px 8px; background:rgba(10,22,40,.03); color:#94a3b8; font-size:.64rem; letter-spacing:.08em; text-transform:uppercase; }
        .bl-items-tbl td { padding:7px 8px; border-bottom:1px solid rgba(10,22,40,.04); }
        .bl-items-tbl tr:last-child td { border-bottom:none; }
        .bl-total-row  { display:flex; justify-content:space-between; font-size:.82rem; margin-bottom:6px; }
        .bl-total-grand { font-weight:700; font-size:.94rem; color:#0a1628; border-top:2px solid rgba(10,22,40,.1); padding-top:8px; margin-top:4px; }
        .bl-detail-btns { display:flex; gap:8px; flex-wrap:wrap; padding:14px 20px; border-top:1px solid rgba(10,22,40,.06); }
        .bl-dbtn { flex:1; min-width:100px; padding:9px; border-radius:10px; border:1px solid rgba(10,22,40,.1); background:none; cursor:pointer; font-family:'DM Sans',sans-serif; font-size:.76rem; font-weight:500; color:#64748b; transition:all .18s; text-align:center; }
        .bl-dbtn:hover  { background:rgba(10,22,40,.04); color:#0a1628; }
        .bl-dbtn.primary { background:linear-gradient(135deg,#0d9488,#0a1628); color:#fff; border:none; }
        .bl-dbtn.primary:hover { opacity:.88; }
        .bl-dbtn.pay    { border-color:rgba(22,163,74,.3); color:#16a34a; }
        .bl-dbtn.pay:hover { background:rgba(22,163,74,.06); }
        .bl-dbtn.danger { border-color:rgba(220,38,38,.2); color:#ef4444; }
        .bl-dbtn.danger:hover { background:rgba(220,38,38,.06); }
        .bl-dbtn:disabled { opacity:.4; cursor:not-allowed; }

        .bl-empty { text-align:center; padding:48px; color:#94a3b8; font-size:.88rem; }
        .bl-error { background:rgba(220,38,38,.06); border:1px solid rgba(220,38,38,.2); border-radius:12px; padding:14px 18px; font-size:.83rem; color:#dc2626; display:flex; align-items:center; gap:8px; }
        .bl-placeholder { color:#94a3b8; font-size:.85rem; text-align:center; padding:48px 20px; }
      `}</style>

      <div className="bl-root">

        {/* Revenue stat cards */}
        <div className="bl-stats">
          {statCards.map(s => (
            <div key={s.label} className="bl-stat">
              <div className="bl-stat-num" style={{ color: s.color }}>{s.num}</div>
              <div className="bl-stat-lbl">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Toolbar */}
        <div className="bl-toolbar">
          <div className="bl-filters">
            {allStatuses.map(s => {
              const cfg = s === "all" ? null : STATUS_CONFIG[s as BillStatus]
              return (
                <button key={s} className={`bl-fbtn${statusFilter === s ? " active" : ""}`}
                  onClick={() => handleStatusFilter(s)}>
                  {cfg ? `${cfg.icon} ` : "📋 "}{s === "all" ? "All" : cfg!.label}
                  {!loading && <span className="bl-fbtn-cnt">{s === "all" ? total : (statusCounts[s] ?? 0)}</span>}
                </button>
              )
            })}
          </div>
          <div className="bl-search">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <input placeholder="Search patient…" value={search} onChange={e => handleSearch(e.target.value)} />
            {search && <button onClick={() => handleSearch("")} style={{ background: "none", border: "none", cursor: "pointer", color: "#94a3b8", fontSize: "1rem", padding: 0 }}>✕</button>}
          </div>
          {canCreate && (
            <button className="bl-new-btn" onClick={() => setShowCreate(true)}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              Generate Bill
            </button>
          )}
        </div>

        {error && (
          <div className="bl-error">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
            {error}
            <button onClick={() => fetchBills(page, search, statusFilter)}
              style={{ marginLeft: "auto", background: "rgba(220,38,38,.1)", border: "none", color: "#dc2626", padding: "4px 12px", borderRadius: 8, cursor: "pointer", fontSize: ".78rem", fontWeight: 500 }}>
              Retry
            </button>
          </div>
        )}

        <div className="bl-layout">
          {/* Bills table */}
          <div className="bl-card">
            {loading ? (
              <div style={{ padding: 18, display: "flex", flexDirection: "column", gap: 10 }}>
                {[1,2,3,4,5].map(n => (
                  <div key={n} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 5 }}><Skel h="13px" w="50%" /><Skel h="11px" w="30%" /></div>
                    <Skel h="13px" w="70px" /><Skel h="13px" w="60px" />
                    <Skel h="22px" w="65px" r="50px" />
                  </div>
                ))}
              </div>
            ) : !bills.length ? (
              <div className="bl-empty">
                {search || statusFilter !== "all" ? "No bills match your filters." : "No bills generated yet."}
              </div>
            ) : (
              <>
                <div className="bl-table-wrap">
                <table className="bl-table">
                  <thead>
                    <tr><th>Patient</th><th>Total</th><th>Paid</th><th>Balance</th><th>Status</th><th>Method</th></tr>
                  </thead>
                  <tbody>
                    {bills.map((b, i) => {
                      const st = STATUS_CONFIG[b.status]
                      return (
                        <tr key={b.id} className={selected?.id === b.id ? "sel" : ""} style={{ animationDelay: `${i * 25}ms` }}
                          onClick={() => setSelected(b)}>
                          <td>
                            <div className="bl-pt-name">{b.patient.name}</div>
                            <div className="bl-pt-date">{formatDate(b.createdAt)}</div>
                          </td>
                          <td><span className="bl-amount">{fmt(b.total)}</span></td>
                          <td><span className="bl-paid">{fmt(b.paid)}</span></td>
                          <td><span className="bl-balance">{b.balance > 0 ? fmt(b.balance) : "—"}</span></td>
                          <td><span className="bl-badge" style={{ background: st.bg, color: st.color }}>{st.icon} {st.label}</span></td>
                          <td><span className="bl-method">{b.paymentMethod ? PAY_METHOD_LABELS[b.paymentMethod] : "—"}</span></td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
                </div>

                {totalPages > 1 && (
                  <div className="bl-pagination">
                    <button className="bl-pgbtn" disabled={page <= 1} onClick={() => fetchBills(page - 1, search, statusFilter)}>‹</button>
                    {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                      const pg = totalPages <= 7 ? i + 1 : page <= 4 ? i + 1 : page >= totalPages - 3 ? totalPages - 6 + i : page - 3 + i
                      return <button key={pg} className={`bl-pgbtn${page === pg ? " active" : ""}`} onClick={() => fetchBills(pg, search, statusFilter)}>{pg}</button>
                    })}
                    <button className="bl-pgbtn" disabled={page >= totalPages} onClick={() => fetchBills(page + 1, search, statusFilter)}>›</button>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Detail panel */}
          <div className="bl-detail">
            {!selected ? (
              <div className="bl-placeholder">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#cbd5e1" strokeWidth="1.5" style={{ marginBottom: 10 }}><rect x="4" y="2" width="16" height="20" rx="2"/><line x1="8" y1="6" x2="16" y2="6"/><line x1="8" y1="10" x2="16" y2="10"/><line x1="8" y1="14" x2="12" y2="14"/></svg>
                <div>Select a bill to view details</div>
              </div>
            ) : (() => {
              const st = STATUS_CONFIG[selected.status]
              return (
                <>
                  <div style={{ padding: "16px 20px", borderBottom: "1px solid rgba(10,22,40,.07)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div>
                      <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: "1.1rem", fontWeight: 700, color: "#0a1628" }}>
                        {selected.patient.name}
                      </div>
                      <div style={{ fontSize: ".72rem", color: "#94a3b8" }}>{formatDate(selected.createdAt)}</div>
                    </div>
                    <span className="bl-badge" style={{ background: st.bg, color: st.color }}>{st.icon} {st.label}</span>
                  </div>

                  <div className="bl-detail-body">
                    {/* Patient + appointment info */}
                    {[
                      { k: "Phone",   v: selected.patient.phone },
                      selected.appointment?.doctor  ? { k: "Doctor",  v: selected.appointment.doctor.name }  : null,
                      selected.appointment?.service ? { k: "Service", v: selected.appointment.service.name } : null,
                      selected.paymentMethod ? { k: "Payment", v: PAY_METHOD_LABELS[selected.paymentMethod] } : null,
                    ].filter(Boolean).map((r: any) => (
                      <div key={r.k} className="bl-d-row">
                        <span className="bl-d-key">{r.k}</span>
                        <span className="bl-d-val">{r.v}</span>
                      </div>
                    ))}

                    {/* Items */}
                    <div style={{ marginTop: 14, marginBottom: 6, fontSize: ".66rem", fontWeight: 700, letterSpacing: ".1em", textTransform: "uppercase", color: "#94a3b8" }}>Items</div>
                    <table className="bl-items-tbl">
                      <thead><tr><th>Description</th><th>Qty</th><th>Rate</th><th>Amt</th></tr></thead>
                      <tbody>
                        {selected.items.map((item, i) => (
                          <tr key={i}>
                            <td>{item.description}</td>
                            <td>{item.quantity}</td>
                            <td>{fmt(item.rate)}</td>
                            <td style={{ fontWeight: 500 }}>{fmt(item.amount)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>

                    {/* Totals */}
                    <div style={{ marginTop: 12 }}>
                      {[
                        { k: "Subtotal", v: fmt(selected.subtotal) },
                        { k: "Discount", v: `-${fmt(selected.discount)}` },
                        { k: `Tax (${selected.tax}%)`, v: fmt(selected.subtotal * selected.tax / 100) },
                      ].map(r => (
                        <div key={r.k} className="bl-total-row" style={{ color: "#64748b" }}>
                          <span>{r.k}</span><span>{r.v}</span>
                        </div>
                      ))}
                      <div className={`bl-total-row bl-total-grand`}>
                        <span>Total</span><span>{fmt(selected.total)}</span>
                      </div>
                      <div className="bl-total-row" style={{ color: "#16a34a", fontWeight: 600 }}>
                        <span>Paid</span><span>{fmt(selected.paid)}</span>
                      </div>
                      {selected.balance > 0 && (
                        <div className="bl-total-row" style={{ color: "#ef4444", fontWeight: 700 }}>
                          <span>Balance Due</span><span>{fmt(selected.balance)}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Action buttons */}
                  <div className="bl-detail-btns">
                    <button className="bl-dbtn primary" onClick={() => printBill(selected)}>🖨️ Print</button>
                    {selected.balance > 0 && (canCreate || canManage) && (
                      <button className="bl-dbtn pay" onClick={() => setPayBill(selected)}>
                        💳 Record Payment
                      </button>
                    )}
                    {canManage && selected.paid === 0 && (
                      <button className="bl-dbtn danger" disabled={deleting === selected.id}
                        onClick={() => handleDelete(selected.id)}>
                        {deleting === selected.id ? "…" : "Delete"}
                      </button>
                    )}
                  </div>
                </>
              )
            })()}
          </div>
        </div>
      </div>

      {showCreate && (
        <CreateBillModal onClose={() => setShowCreate(false)} onSave={handleCreate} />
      )}

      {payBill && (
        <PaymentModal bill={payBill} onClose={() => setPayBill(null)} onSave={handlePayment} />
      )}
    </>
  )
}