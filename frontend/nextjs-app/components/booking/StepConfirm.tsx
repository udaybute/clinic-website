"use client"
// components/booking/StepConfirm.tsx
// FIXED: calls POST /api/booking/appointment (public, no JWT required)
import { useState } from "react"
import Link from "next/link"
import API from "@/lib/api"
import { useBookingStore } from "@/store/bookingStore"
import styles from "./booking.module.css"

interface Props { onBack: () => void }

function formatDate(d: string) {
  if (!d) return "—"
  return new Date(d + "T12:00:00").toLocaleDateString("en-IN", {
    weekday:"short", month:"long", day:"numeric", year:"numeric",
  })
}

function formatTime(t: string) {
  if (!t) return "—"
  const [h, m] = t.split(":").map(Number)
  const ampm   = h >= 12 ? "PM" : "AM"
  return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${ampm}`
}

export default function StepConfirm({ onBack }: Props) {
  const store = useBookingStore()

  const [loading, setLoading] = useState(false)
  const [done,    setDone]    = useState(false)
  const [error,   setError]   = useState("")

  const rows = [
    { icon:"🦷", key:"Service",  value: store.serviceName  ?? "—" },
    { icon:"🩺", key:"Doctor",   value: store.doctorName   ?? "—" },
    { icon:"📅", key:"Date",     value: formatDate(store.date  ?? "") },
    { icon:"⏰", key:"Time",     value: formatTime(store.time  ?? "") },
    { icon:"👤", key:"Patient",  value: store.patientName  ?? "—" },
    { icon:"📧", key:"Email",    value: store.patientEmail ?? "—" },
    { icon:"📱", key:"Phone",    value: store.patientPhone ?? "—" },
    ...(store.servicePrice ? [{ icon:"💰", key:"Price", value: store.servicePrice }] : []),
  ]

  const submit = async () => {
    if (!store.patientId) {
      return setError("Patient details are missing. Please go back.")
    }
    setLoading(true)
    setError("")
    try {
      // PUBLIC endpoint — POST /api/booking/appointment (no JWT needed)
      await API.post("/booking/appointment", {
        patientId: store.patientId,              // UUID from StepPatient
        doctorId:  store.doctorId,
        serviceId: store.serviceId  ?? undefined,
        date:      store.date,                   // "YYYY-MM-DD"
        time:      store.time,                   // "09:00" 24h
        notes:     store.patientNotes ?? undefined,
      })
      setDone(true)
      store.reset()
    } catch (err: any) {
      const msg = err?.response?.data?.message
      setError(Array.isArray(msg) ? msg[0] : (msg ?? "Something went wrong. Please try again."))
    } finally {
      setLoading(false)
    }
  }

  if (done) {
    return (
      <div className={styles.bsSuccess}>
        <span className={styles.bsSuccessIcon}>🎉</span>
        <h2 className={styles.bsSuccessTitle}>Appointment Confirmed!</h2>
        <p className={styles.bsSuccessSub}>
          You'll receive a confirmation shortly. We look forward to seeing you!
        </p>
        <div className={styles.bsSuccessEmail}>
          📧 Confirmation sent to <strong>{store.patientEmail ?? "your email"}</strong>
        </div>
        <div style={{ marginTop:20 }}>
          <Link
            href="/"
            style={{
              display:"inline-flex", alignItems:"center", gap:7,
              padding:"11px 24px", borderRadius:50,
              background:"linear-gradient(135deg,#0d9488,#0b1f3a)",
              color:"#fff", textDecoration:"none",
              fontFamily:"'DM Sans',sans-serif",
              fontSize:".88rem", fontWeight:600,
            }}
          >
            Back to Home
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.bsRoot}>
      <span className={styles.bsLabel}>Review Your Booking</span>

      <div className={styles.bsSummary}>
        {rows.map(row => (
          <div key={row.key} className={styles.bsSummaryRow}>
            <div className={styles.bsSummaryIcon}>{row.icon}</div>
            <div>
              <div className={styles.bsSummaryKey}>{row.key}</div>
              <div className={styles.bsSummaryValue}>{row.value}</div>
            </div>
          </div>
        ))}
      </div>

      <div className={styles.bsPolicy}>
        By confirming, you agree to our cancellation policy. Free cancellation up to 24 hours before your appointment.
      </div>

      {error && <p className={styles.bsError}>⚠️ {error}</p>}

      <button className={styles.bsBtnConfirm} onClick={submit} disabled={loading} type="button">
        {loading
          ? <><span className={styles.bsSpinner} /> Processing…</>
          : <>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
              Confirm Appointment
            </>
        }
      </button>

      <div className={styles.bsNav} style={{ marginTop:12 }}>
        <button
          className={styles.bsBtnBack}
          style={{ width:"100%", justifyContent:"center" }}
          onClick={onBack}
          type="button"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
          Edit Details
        </button>
      </div>
    </div>
  )
}