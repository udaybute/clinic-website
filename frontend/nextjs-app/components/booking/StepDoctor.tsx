"use client"
// components/booking/StepDoctor.tsx
// FIXED: calls GET /api/booking/doctors (public, no JWT required)
import { useState, useEffect } from "react"
import API from "@/lib/api"
import { useBookingStore } from "@/store/bookingStore"
import styles from "./booking.module.css"

const FALLBACK_DOCTORS = [
  { id:"1", name:"Dr. Sarah Johnson", specialty:"Orthodontist",       experience:10, avatar:"https://images.unsplash.com/photo-1537368910025-700350fe46c7?w=120&h=120&fit=crop&crop=face" },
  { id:"2", name:"Dr. Michael Lee",   specialty:"Implant Specialist", experience:8,  avatar:"https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=120&h=120&fit=crop&crop=face" },
  { id:"3", name:"Dr. Emma Watson",   specialty:"Cosmetic Dentist",   experience:12, avatar:"https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=120&h=120&fit=crop&crop=face" },
]

interface Props { onNext: () => void; onBack: () => void }

export default function StepDoctor({ onNext, onBack }: Props) {
  const { doctorId, setDoctor } = useBookingStore()
  const [doctors, setDoctors]   = useState<any[]>(FALLBACK_DOCTORS)
  const [loading, setLoading]   = useState(true)

  useEffect(() => {
    // PUBLIC endpoint — no JWT needed, no redirect to login
    API.get("/booking/doctors")
      .then(res => {
        const list = res.data as any[]
        if (Array.isArray(list) && list.length) setDoctors(list)
      })
      .catch(() => { /* keep fallback */ })
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className={styles.bsRoot}>
      <div className={styles.bsNotice}>🩺 All doctors are board-certified specialists.</div>
      <span className={styles.bsLabel}>Choose Your Doctor</span>

      {loading ? (
        <div className={styles.bsDocGrid}>
          {[1,2,3].map(n => (
            <div key={n} className={styles.bsSkeleton} style={{ height:80, borderRadius:14 }} />
          ))}
        </div>
      ) : (
        <div className={styles.bsDocGrid}>
          {doctors.map((doc: any) => {
            const sel    = doctorId === doc.id
            const imgSrc = doc.avatar ?? doc.image
              ?? `https://ui-avatars.com/api/?name=${encodeURIComponent(doc.name)}&background=0d9488&color=fff&size=96`
            const expText = doc.experience ? `${doc.experience}+ yrs` : null
            const sub     = expText ?? ""

            return (
              <button
                key={doc.id}
                className={`${styles.bsDocCard}${sel ? " " + styles.bsDocSelected : ""}`}
                onClick={() => setDoctor(doc.id, doc.name)}
                type="button"
              >
                <img src={imgSrc} alt={doc.name} className={styles.bsDocAvatar} />
                <div className={styles.bsDocInfo}>
                  <span className={styles.bsDocName}>{doc.name}</span>
                  <span className={styles.bsDocSpec}>{doc.specialty ?? "General Dentist"}</span>
                  {sub && <span className={styles.bsDocExp}>{sub}</span>}
                </div>
                <div className={styles.bsDocCheck}>
                  {sel && (
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none"
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
        <button className={styles.bsBtnBack} onClick={onBack} type="button">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
          Back
        </button>
        <button className={styles.bsBtnNext} onClick={onNext} disabled={!doctorId} type="button">
          Continue
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round">
            <polyline points="9 18 15 12 9 6"/>
          </svg>
        </button>
      </div>
    </div>
  )
}