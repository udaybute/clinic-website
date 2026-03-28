"use client"

// app/dashboard/services/page.tsx
// Admin CRUD management for clinic services.
// API endpoints used:
//   GET    /api/services/clinic           → list services for this clinic (authenticated)
//   POST   /api/services                  → create new service (admin)
//   PUT    /api/services/:id              → update service (admin)
//   DELETE /api/services/:id              → delete service (admin)

import { useState, useEffect, useCallback } from "react"
import { useAuthStore }    from "@/store/authStore"
import PermissionGate      from "@/components/ui/PermissionGate"
import ConfirmDialog       from "@/components/dashboard/ConfirmDialog"
import API                 from "@/lib/api"

// ── Types ─────────────────────────────────────────────────────────────────────
interface Service {
  id:          string
  name:        string
  description: string
  duration:    number
  price:       number
  category:    string
  popular:     boolean
  isActive:    boolean
  icon:        string
}

const EMPTY_FORM = {
  name:        "",
  description: "",
  duration:    30,
  price:       0,
  category:    "General",
  popular:     false,
  isActive:    true,
  icon:        "🦷",
}

const CATEGORIES = [
  "General", "Cosmetic", "Orthodontics", "Surgery", "Pediatric", "Preventive", "Emergency"
]

const ICON_OPTIONS = ["🦷","🔬","💊","🩺","🏥","✨","😁","🦴","💉","🩻","🪥","🫁"]

// ── Helpers ───────────────────────────────────────────────────────────────────
function inp(extra?: React.CSSProperties): React.CSSProperties {
  return {
    width: "100%", padding: "9px 12px", borderRadius: 9,
    border: "1.5px solid rgba(10,22,40,.1)",
    fontFamily: "'DM Sans',sans-serif", fontSize: ".87rem", color: "#0a1628",
    background: "#fff", outline: "none", boxSizing: "border-box", ...extra,
  }
}

function Badge({ active }: { active: boolean }) {
  return (
    <span style={{
      padding: "2px 10px", borderRadius: 20, fontSize: ".68rem", fontWeight: 600,
      background: active ? "rgba(13,148,136,.1)" : "rgba(100,116,139,.1)",
      color: active ? "#0d9488" : "#64748b",
    }}>
      {active ? "Active" : "Inactive"}
    </span>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function ServicesManagementPage() {
  const { can } = useAuthStore()

  const [services,    setServices]    = useState<Service[]>([])
  const [loading,     setLoading]     = useState(true)
  const [error,       setError]       = useState<string | null>(null)
  const [saving,      setSaving]      = useState(false)
  const [deleting,    setDeleting]    = useState(false)

  // Form state
  const [showForm,    setShowForm]    = useState(false)
  const [editId,      setEditId]      = useState<string | null>(null)
  const [form,        setForm]        = useState({ ...EMPTY_FORM })
  const [formErr,     setFormErr]     = useState<string | null>(null)

  // Confirm dialog
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [deleteTarget,setDeleteTarget]= useState<Service | null>(null)

  const fetchServices = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await API.get("/services/clinic")
      setServices(Array.isArray(res.data?.services) ? res.data.services : res.data ?? [])
    } catch (e: any) {
      setError(e?.response?.data?.message ?? e?.message ?? "Failed to load services")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchServices() }, [fetchServices])

  // ── Open form for create / edit ────────────────────────────────────────────
  const openCreate = () => {
    setForm({ ...EMPTY_FORM })
    setEditId(null)
    setFormErr(null)
    setShowForm(true)
  }

  const openEdit = (s: Service) => {
    setForm({
      name:        s.name,
      description: s.description,
      duration:    s.duration,
      price:       s.price,
      category:    s.category,
      popular:     s.popular,
      isActive:    s.isActive,
      icon:        s.icon || "🦷",
    })
    setEditId(s.id)
    setFormErr(null)
    setShowForm(true)
  }

  // ── Save (create or update) ────────────────────────────────────────────────
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name.trim())        { setFormErr("Service name is required."); return }
    if (form.price < 0)           { setFormErr("Price cannot be negative."); return }
    if (form.duration <= 0)       { setFormErr("Duration must be > 0 minutes."); return }

    setSaving(true)
    setFormErr(null)
    try {
      if (editId) {
        await API.put(`/services/${editId}`, form)
      } else {
        await API.post("/services", form)
      }
      setShowForm(false)
      fetchServices()
    } catch (e: any) {
      setFormErr(e?.response?.data?.message ?? e?.message ?? "Save failed")
    } finally {
      setSaving(false)
    }
  }

  // ── Delete ─────────────────────────────────────────────────────────────────
  const confirmDelete = (s: Service) => {
    setDeleteTarget(s)
    setConfirmOpen(true)
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await API.delete(`/services/${deleteTarget.id}`)
      setConfirmOpen(false)
      setDeleteTarget(null)
      fetchServices()
    } catch (e: any) {
      setError(e?.response?.data?.message ?? "Delete failed")
      setConfirmOpen(false)
    } finally {
      setDeleting(false)
    }
  }

  const isAdmin = can("clinic:settings" as any)

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@700&family=DM+Sans:wght@300;400;500;600&display=swap');
        @keyframes fadeIn { from { opacity:0; transform:translateY(6px) } to { opacity:1; transform:translateY(0) } }
        .svc-card { animation: fadeIn .22s ease both; transition: box-shadow .18s; }
        .svc-card:hover { box-shadow: 0 6px 28px rgba(10,22,40,.1) !important; }
        .svc-form-overlay { position:fixed;inset:0;background:rgba(10,22,40,.45);z-index:800;display:flex;align-items:center;justify-content:center;padding:16px;animation:fadeIn .15s ease; }
        .svc-form-box { background:#fff;border-radius:20px;width:100%;max-width:540px;max-height:90vh;overflow-y:auto;box-shadow:0 24px 64px rgba(10,22,40,.2); }
        .svc-shimmer { background:linear-gradient(90deg,#f1f5f9 25%,#e2e8f0 50%,#f1f5f9 75%);background-size:200% 100%;animation:shimmer 1.4s infinite;border-radius:8px; }
        @keyframes shimmer { to { background-position:-200% 0 } }
      `}</style>

      <div style={{ fontFamily: "'DM Sans',sans-serif", maxWidth: 1100 }}>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
          <div>
            <h1 style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: "1.9rem", fontWeight: 700, color: "#0a1628", margin: 0 }}>
              Services
            </h1>
            <p style={{ fontSize: ".84rem", color: "#64748b", margin: "4px 0 0" }}>
              Manage the dental services offered by your clinic.
            </p>
          </div>
          {isAdmin && (
            <button
              onClick={openCreate}
              style={{ display: "flex", alignItems: "center", gap: 7, padding: "9px 20px", borderRadius: 9999, border: "none", background: "linear-gradient(135deg,#0d9488,#065f4a)", color: "#fff", fontFamily: "'DM Sans',sans-serif", fontSize: ".87rem", fontWeight: 600, cursor: "pointer", boxShadow: "0 3px 16px rgba(13,148,136,.3)" }}
            >
              + Add Service
            </button>
          )}
        </div>

        {/* Error */}
        {error && (
          <div style={{ padding: "12px 16px", borderRadius: 12, background: "rgba(220,38,38,.06)", border: "1px solid rgba(220,38,38,.2)", color: "#dc2626", fontSize: ".84rem", marginBottom: 20, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            {error}
            <button onClick={fetchServices} style={{ border: "none", background: "none", color: "#dc2626", fontWeight: 600, cursor: "pointer", fontSize: ".8rem" }}>Retry</button>
          </div>
        )}

        {/* Stats */}
        {!loading && (
          <div style={{ display: "flex", gap: 12, marginBottom: 20, flexWrap: "wrap" }}>
            {[
              { label: "Total",    value: services.length,                             color: "#0a1628" },
              { label: "Active",   value: services.filter(s => s.isActive).length,     color: "#0d9488" },
              { label: "Popular",  value: services.filter(s => s.popular).length,      color: "#d97706" },
              { label: "Inactive", value: services.filter(s => !s.isActive).length,    color: "#64748b" },
            ].map(stat => (
              <div key={stat.label} style={{ background: "#fff", borderRadius: 12, border: "1px solid rgba(10,22,40,.07)", padding: "12px 20px", textAlign: "center", minWidth: 90 }}>
                <div style={{ fontSize: "1.4rem", fontWeight: 700, color: stat.color }}>{stat.value}</div>
                <div style={{ fontSize: ".7rem", color: "#94a3b8", marginTop: 2, fontWeight: 500 }}>{stat.label}</div>
              </div>
            ))}
          </div>
        )}

        {/* Services grid */}
        {loading ? (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(300px,1fr))", gap: 16 }}>
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} style={{ background: "#fff", borderRadius: 16, border: "1px solid rgba(10,22,40,.07)", padding: 20 }}>
                <div style={{ display: "flex", gap: 10, marginBottom: 12 }}>
                  <div className="svc-shimmer" style={{ width: 40, height: 40 }} />
                  <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6 }}>
                    <div className="svc-shimmer" style={{ height: 14, width: "60%" }} />
                    <div className="svc-shimmer" style={{ height: 11, width: "40%" }} />
                  </div>
                </div>
                <div className="svc-shimmer" style={{ height: 11, marginBottom: 6 }} />
                <div className="svc-shimmer" style={{ height: 11, width: "80%" }} />
              </div>
            ))}
          </div>
        ) : services.length === 0 ? (
          <div style={{ textAlign: "center", padding: "60px 20px", color: "#94a3b8" }}>
            <div style={{ fontSize: "3rem", marginBottom: 12 }}>🦷</div>
            <p style={{ fontSize: ".9rem" }}>No services yet. {isAdmin ? "Add your first service above." : "No services configured."}</p>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(300px,1fr))", gap: 16 }}>
            {services.map(s => (
              <div
                key={s.id}
                className="svc-card"
                style={{ background: "#fff", borderRadius: 16, border: "1px solid rgba(10,22,40,.07)", padding: 20, boxShadow: "0 2px 12px rgba(10,22,40,.04)", display: "flex", flexDirection: "column", gap: 12 }}
              >
                {/* Top */}
                <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                  <div style={{ width: 44, height: 44, borderRadius: 12, background: "linear-gradient(135deg,rgba(13,148,136,.12),rgba(13,148,136,.05))", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.4rem", flexShrink: 0 }}>
                    {s.icon || "🦷"}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3 }}>
                      <span style={{ fontSize: ".9rem", fontWeight: 600, color: "#0a1628" }}>{s.name}</span>
                      {s.popular && <span style={{ fontSize: ".6rem", fontWeight: 700, background: "rgba(212,168,67,.15)", color: "#d4a843", borderRadius: 20, padding: "1px 7px" }}>POPULAR</span>}
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <span style={{ fontSize: ".72rem", color: "#64748b", background: "rgba(10,22,40,.05)", borderRadius: 6, padding: "1px 7px" }}>{s.category}</span>
                      <Badge active={s.isActive} />
                    </div>
                  </div>
                </div>

                {/* Description */}
                <p style={{ fontSize: ".82rem", color: "#64748b", lineHeight: 1.6, margin: 0, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                  {s.description || "No description provided."}
                </p>

                {/* Price + Duration */}
                <div style={{ display: "flex", gap: 12 }}>
                  <div style={{ flex: 1, background: "rgba(13,148,136,.05)", borderRadius: 10, padding: "8px 12px", textAlign: "center" }}>
                    <div style={{ fontSize: "1rem", fontWeight: 700, color: "#0d9488" }}>₹{s.price.toLocaleString()}</div>
                    <div style={{ fontSize: ".65rem", color: "#94a3b8", marginTop: 2 }}>Price</div>
                  </div>
                  <div style={{ flex: 1, background: "rgba(10,22,40,.03)", borderRadius: 10, padding: "8px 12px", textAlign: "center" }}>
                    <div style={{ fontSize: "1rem", fontWeight: 700, color: "#0a1628" }}>{s.duration} min</div>
                    <div style={{ fontSize: ".65rem", color: "#94a3b8", marginTop: 2 }}>Duration</div>
                  </div>
                </div>

                {/* Actions (admin only) */}
                {isAdmin && (
                  <div style={{ display: "flex", gap: 8, paddingTop: 4, borderTop: "1px solid rgba(10,22,40,.06)" }}>
                    <button
                      onClick={() => openEdit(s)}
                      style={{ flex: 1, padding: "7px 0", borderRadius: 8, border: "1.5px solid rgba(13,148,136,.25)", background: "none", color: "#0d9488", fontFamily: "'DM Sans',sans-serif", fontSize: ".8rem", fontWeight: 600, cursor: "pointer", transition: "background .15s" }}
                      onMouseEnter={e => (e.currentTarget.style.background = "rgba(13,148,136,.06)")}
                      onMouseLeave={e => (e.currentTarget.style.background = "none")}
                    >
                      ✏️ Edit
                    </button>
                    <button
                      onClick={() => confirmDelete(s)}
                      style={{ padding: "7px 14px", borderRadius: 8, border: "1.5px solid rgba(220,38,38,.2)", background: "none", color: "#dc2626", fontFamily: "'DM Sans',sans-serif", fontSize: ".8rem", cursor: "pointer", transition: "background .15s" }}
                      onMouseEnter={e => (e.currentTarget.style.background = "rgba(220,38,38,.06)")}
                      onMouseLeave={e => (e.currentTarget.style.background = "none")}
                    >
                      🗑
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Create / Edit form overlay ─────────────────────────────────────── */}
      {showForm && (
        <div className="svc-form-overlay" onClick={() => !saving && setShowForm(false)}>
          <div className="svc-form-box" onClick={e => e.stopPropagation()}>

            {/* Form header */}
            <div style={{ padding: "22px 24px 16px", borderBottom: "1px solid rgba(10,22,40,.07)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h2 style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: "1.3rem", fontWeight: 700, color: "#0a1628", margin: 0 }}>
                {editId ? "Edit Service" : "New Service"}
              </h2>
              <button onClick={() => setShowForm(false)} style={{ background: "none", border: "none", fontSize: "1.2rem", cursor: "pointer", color: "#94a3b8", lineHeight: 1 }}>×</button>
            </div>

            <form onSubmit={handleSave} style={{ padding: "20px 24px 24px", display: "flex", flexDirection: "column", gap: 14 }}>

              {formErr && (
                <div style={{ padding: "10px 14px", borderRadius: 10, background: "rgba(220,38,38,.06)", border: "1px solid rgba(220,38,38,.2)", color: "#dc2626", fontSize: ".82rem" }}>{formErr}</div>
              )}

              {/* Icon picker */}
              <div>
                <label style={{ fontSize: ".68rem", fontWeight: 600, letterSpacing: ".1em", textTransform: "uppercase", color: "#94a3b8", display: "block", marginBottom: 6 }}>Icon</label>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {ICON_OPTIONS.map(ico => (
                    <button
                      key={ico}
                      type="button"
                      onClick={() => setForm(f => ({ ...f, icon: ico }))}
                      style={{ width: 38, height: 38, borderRadius: 10, border: `2px solid ${form.icon === ico ? "#0d9488" : "rgba(10,22,40,.1)"}`, background: form.icon === ico ? "rgba(13,148,136,.08)" : "#fff", fontSize: "1.2rem", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", transition: "border-color .15s" }}
                    >
                      {ico}
                    </button>
                  ))}
                </div>
              </div>

              {/* Name */}
              <div>
                <label style={{ fontSize: ".68rem", fontWeight: 600, letterSpacing: ".1em", textTransform: "uppercase", color: "#94a3b8", display: "block", marginBottom: 5 }}>Name *</label>
                <input style={inp()} value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Teeth Whitening" required />
              </div>

              {/* Description */}
              <div>
                <label style={{ fontSize: ".68rem", fontWeight: 600, letterSpacing: ".1em", textTransform: "uppercase", color: "#94a3b8", display: "block", marginBottom: 5 }}>Description</label>
                <textarea style={{ ...inp(), minHeight: 80, resize: "vertical" }} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Describe this service…" />
              </div>

              {/* Category + Price + Duration row */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
                <div>
                  <label style={{ fontSize: ".68rem", fontWeight: 600, letterSpacing: ".1em", textTransform: "uppercase", color: "#94a3b8", display: "block", marginBottom: 5 }}>Category</label>
                  <select style={{ ...inp(), cursor: "pointer" }} value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: ".68rem", fontWeight: 600, letterSpacing: ".1em", textTransform: "uppercase", color: "#94a3b8", display: "block", marginBottom: 5 }}>Price (₹)</label>
                  <input style={inp()} type="number" min={0} value={form.price} onChange={e => setForm(f => ({ ...f, price: Number(e.target.value) }))} />
                </div>
                <div>
                  <label style={{ fontSize: ".68rem", fontWeight: 600, letterSpacing: ".1em", textTransform: "uppercase", color: "#94a3b8", display: "block", marginBottom: 5 }}>Duration (min)</label>
                  <input style={inp()} type="number" min={1} value={form.duration} onChange={e => setForm(f => ({ ...f, duration: Number(e.target.value) }))} />
                </div>
              </div>

              {/* Toggles */}
              <div style={{ display: "flex", gap: 20 }}>
                {[
                  { key: "isActive", label: "Active" },
                  { key: "popular",  label: "Popular" },
                ].map(({ key, label }) => (
                  <label key={key} style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: ".85rem", color: "#374151" }}>
                    <input
                      type="checkbox"
                      checked={form[key as keyof typeof form] as boolean}
                      onChange={e => setForm(f => ({ ...f, [key]: e.target.checked }))}
                      style={{ width: 16, height: 16, accentColor: "#0d9488" }}
                    />
                    {label}
                  </label>
                ))}
              </div>

              {/* Actions */}
              <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", paddingTop: 4 }}>
                <button type="button" onClick={() => setShowForm(false)} disabled={saving} style={{ padding: "9px 20px", borderRadius: 9999, border: "1.5px solid rgba(10,22,40,.12)", background: "none", color: "#64748b", fontFamily: "'DM Sans',sans-serif", fontSize: ".85rem", cursor: "pointer" }}>
                  Cancel
                </button>
                <button type="submit" disabled={saving} style={{ padding: "9px 24px", borderRadius: 9999, border: "none", background: "linear-gradient(135deg,#0d9488,#065f4a)", color: "#fff", fontFamily: "'DM Sans',sans-serif", fontSize: ".87rem", fontWeight: 600, cursor: saving ? "not-allowed" : "pointer", opacity: saving ? .7 : 1 }}>
                  {saving ? "Saving…" : editId ? "Update Service" : "Create Service"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirm delete */}
      <ConfirmDialog
        open={confirmOpen}
        title={`Delete "${deleteTarget?.name}"?`}
        message="This service will be permanently removed. Existing appointments using this service will not be affected."
        confirmLabel="Delete"
        danger
        loading={deleting}
        onConfirm={handleDelete}
        onCancel={() => { setConfirmOpen(false); setDeleteTarget(null) }}
      />
    </>
  )
}
