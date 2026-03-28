"use client"
// components/booking/StepTime.tsx
import { useBookingStore } from "@/store/bookingStore"
import styles from "./booking.module.css"

const TIME_SLOTS = [
  { time:"09:00", period:"Morning",   label:"9:00 AM"  },
  { time:"10:00", period:"Morning",   label:"10:00 AM" },
  { time:"11:00", period:"Morning",   label:"11:00 AM" },
  { time:"13:00", period:"Afternoon", label:"1:00 PM"  },
  { time:"14:00", period:"Afternoon", label:"2:00 PM"  },
  { time:"15:00", period:"Afternoon", label:"3:00 PM"  },
  { time:"16:00", period:"Afternoon", label:"4:00 PM"  },
  { time:"17:00", period:"Evening",   label:"5:00 PM"  },
  { time:"18:00", period:"Evening",   label:"6:00 PM"  },
]

interface Props { onNext: () => void; onBack: () => void }

export default function StepTime({ onNext, onBack }: Props) {
  const { time, setTime } = useBookingStore()

  return (
    <div className={styles.bsRoot}>
      <div className={styles.bsNotice}>⏰ Slot duration varies by service (30–90 min).</div>
      <span className={styles.bsLabel}>Available Time Slots</span>

      <div className={styles.bsTimeGrid}>
        {TIME_SLOTS.map(slot => (
          <button
            key={slot.time}
            className={`${styles.bsTimeBtn}${time === slot.time ? " " + styles.bsTimeSelected : ""}`}
            onClick={() => setTime(slot.time)}
            type="button"
          >
            {slot.label}
            <span className={styles.bsTimePeriod}>{slot.period}</span>
          </button>
        ))}
      </div>

      <div className={styles.bsNav}>
        <button className={styles.bsBtnBack} onClick={onBack} type="button">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
          Back
        </button>
        <button className={styles.bsBtnNext} onClick={onNext} disabled={!time} type="button">
          Continue
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round">
            <polyline points="9 18 15 12 9 6"/>
          </svg>
        </button>
      </div>
    </div>
  )
}