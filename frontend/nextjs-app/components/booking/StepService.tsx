"use client"
// components/booking/StepService.tsx
// FIXED: calls GET /api/booking/services (public, no JWT required)
import { useState, useEffect } from "react"
import API from "@/lib/api"
import { useBookingStore } from "@/store/bookingStore"
import styles from "./booking.module.css"

const FALLBACK_SERVICES = [
  { id:"1", name:"Teeth Cleaning",  duration:45, price:800,   icon:"🦷", category:"Preventive"  },
  { id:"2", name:"Teeth Whitening", duration:60, price:3500,  icon:"✨", category:"Cosmetic"    },
  { id:"3", name:"Dental Implants", duration:90, price:18000, icon:"🔩", category:"Restorative" },
  { id:"4", name:"Root Canal",      duration:75, price:6000,  icon:"💉", category:"Endodontic"  },
  { id:"5", name:"Orthodontics",    duration:45, price:25000, icon:"😁", category:"Orthodontic" },
  { id:"6", name:"Dental Checkup",  duration:30, price:800,   icon:"🩺", category:"Preventive"  },
]

interface Props { onNext: () => void }

export default function StepService({ onNext }: Props) {
  const { serviceId, setService } = useBookingStore()
  const [services, setServices]   = useState<any[]>(FALLBACK_SERVICES)
  const [loading,  setLoading]    = useState(true)

  useEffect(() => {
    // PUBLIC endpoint — no JWT needed, no redirect to login
    API.get("/booking/services")
      .then(res => {
        const list = res.data as any[]
        if (Array.isArray(list) && list.length) setServices(list)
      })
      .catch(() => { /* keep fallback — API unavailable */ })
      .finally(() => setLoading(false))
  }, [])

  const handleSelect = (s: any) => {
    const price = s.price ? `₹${Number(s.price).toLocaleString()}` : undefined
    setService(s.id, s.name, price)
  }

  return (
    <div className={styles.bsRoot}>
      <div className={styles.bsNotice}>🦷 All services include a free initial consultation.</div>
      <span className={styles.bsLabel}>Available Services</span>

      {loading ? (
        <div className={styles.bsOptionGrid}>
          {[1,2,3,4].map(n => (
            <div key={n} className={styles.bsSkeleton} style={{ height:72, borderRadius:14 }} />
          ))}
        </div>
      ) : (
        <div className={styles.bsOptionGrid}>
          {services.map((s: any) => {
            const sel  = serviceId === s.id
            const icon = s.icon ?? "🦷"
            const sub  = [
              s.duration && `${s.duration} min`,
              s.price    && `₹${Number(s.price).toLocaleString()}`,
            ].filter(Boolean).join(" · ")

            return (
              <button
                key={s.id}
                className={`${styles.bsOption}${sel ? " " + styles.bsOptionSelected : ""}`}
                onClick={() => handleSelect(s)}
                type="button"
              >
                <div className={styles.bsOptionIcon}>{icon}</div>
                <div className={styles.bsOptionText}>
                  <span className={styles.bsOptionName}>{s.name}</span>
                  <span className={styles.bsOptionSub}>{sub}</span>
                </div>
                <div className={styles.bsOptionCheck}>
                  {sel && (
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none"
                      stroke="white" strokeWidth="3" strokeLinecap="round">
                      <polyline points="20 6 9 17 4 12"/>
                    </svg>
                  )}
                </div>
              </button>
            )
          })}
        </div>
      )}

      <div className={styles.bsNav}>
        <button
          className={styles.bsBtnNext}
          onClick={onNext}
          disabled={!serviceId}
          type="button"
        >
          Continue
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
            stroke="white" strokeWidth="2" strokeLinecap="round">
            <polyline points="9 18 15 12 9 6"/>
          </svg>
        </button>
      </div>
    </div>
  )
}