"use client"
// components/booking/StepPatient.tsx
// FIXED: calls POST /api/booking/patient (public, no JWT required)
import { useState } from "react"
import API from "@/lib/api"
import { useBookingStore } from "@/store/bookingStore"
import styles from "./booking.module.css"

interface Props { onNext: () => void; onBack: () => void }

export default function StepPatient({ onNext, onBack }: Props) {
  const { setPatient } = useBookingStore()

  const [name,    setName]    = useState("")
  const [email,   setEmail]   = useState("")
  const [phone,   setPhone]   = useState("")
  const [notes,   setNotes]   = useState("")
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState("")

  const isValid = name.trim().length >= 2
    && email.includes("@")
    && phone.trim().length >= 7

  const submit = async () => {
    if (!isValid) return
    setLoading(true)
    setError("")
    try {
      // PUBLIC endpoint — POST /api/booking/patient
      // Returns { id, name, email, phone } — id is the real patient UUID
      const res     = await API.post("/booking/patient", { name, email, phone, notes: notes || undefined })
      const patient = res.data as any

      setPatient({
        id:    patient.id,
        name:  patient.name  ?? name,
        email: patient.email ?? email,
        phone: patient.phone ?? phone,
        notes: notes || undefined,
      })
      onNext()
    } catch (err: any) {
      const msg = err?.response?.data?.message
      setError(Array.isArray(msg) ? msg[0] : (msg ?? "Something went wrong. Please try again."))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={styles.bsRoot}>
      <div className={styles.bsNotice}>🔒 Your information is private and securely stored.</div>
      <span className={styles.bsLabel}>Your Details</span>

      <div className={styles.bsInputRow}>
        <div className={styles.bsInputGroup}>
          <label className={styles.bsInputLabel}>Full Name *</label>
          <input
            className={styles.bsInput}
            placeholder="Rahul Sharma"
            value={name}
            onChange={e => setName(e.target.value)}
          />
        </div>
        <div className={styles.bsInputGroup}>
          <label className={styles.bsInputLabel}>Phone Number *</label>
          <input
            className={styles.bsInput}
            placeholder="+91 98765 43210"
            value={phone}
            onChange={e => setPhone(e.target.value)}
          />
        </div>
      </div>

      <div className={styles.bsInputGroup}>
        <label className={styles.bsInputLabel}>Email Address *</label>
        <input
          className={styles.bsInput}
          type="email"
          placeholder="you@example.com"
          value={email}
          onChange={e => setEmail(e.target.value)}
        />
      </div>

      <div className={styles.bsInputGroup}>
        <label className={styles.bsInputLabel}>Notes (optional)</label>
        <textarea
          className={`${styles.bsInput} ${styles.bsTextarea}`}
          placeholder="Any allergies, concerns, or special requests…"
          value={notes}
          onChange={e => setNotes(e.target.value)}
        />
      </div>

      {error && <p className={styles.bsError}>⚠️ {error}</p>}

      <div className={styles.bsNav}>
        <button className={styles.bsBtnBack} onClick={onBack} type="button">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
          Back
        </button>
        <button
          className={styles.bsBtnNext}
          onClick={submit}
          disabled={!isValid || loading}
          type="button"
        >
          {loading
            ? <span className={styles.bsSpinner} />
            : <>
                Save & Continue
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round">
                  <polyline points="9 18 15 12 9 6"/>
                </svg>
              </>
          }
        </button>
      </div>
    </div>
  )
}