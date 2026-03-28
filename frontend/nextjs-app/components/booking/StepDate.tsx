"use client"
// components/booking/StepDate.tsx
import { useBookingStore } from "@/store/bookingStore"
import styles from "./booking.module.css"

interface Props { onNext: () => void; onBack: () => void }

const today = new Date().toISOString().split("T")[0]

export default function StepDate({ onNext, onBack }: Props) {
  const { date, setDate } = useBookingStore()

  const display = date
    ? new Date(date + "T12:00:00").toLocaleDateString("en-IN", {
        weekday: "long", month: "long", day: "numeric", year: "numeric",
      })
    : null

  return (
    <div className={styles.bsRoot}>
      <div className={styles.bsNotice}>📅 We're open Monday–Saturday. Same-day appointments available.</div>
      <span className={styles.bsLabel}>Select Appointment Date</span>

      <input
        type="date"
        className={styles.bsDateInput}
        min={today}
        value={date ?? ""}
        onChange={e => setDate(e.target.value)}
      />

      {display && (
        <div className={styles.bsDateConfirm}>
          ✅ Selected: <strong>{display}</strong>
        </div>
      )}

      <div className={styles.bsNav}>
        <button className={styles.bsBtnBack} onClick={onBack} type="button">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
          Back
        </button>
        <button className={styles.bsBtnNext} onClick={onNext} disabled={!date} type="button">
          Continue
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round">
            <polyline points="9 18 15 12 9 6"/>
          </svg>
        </button>
      </div>
    </div>
  )
}