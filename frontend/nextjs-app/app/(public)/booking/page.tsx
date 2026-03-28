"use client"
// app/(public)/booking/page.tsx
// Multi-step booking page — clean orchestrator, no inline styles.
// All styles live in components/booking/booking.module.css

import { useState } from "react"
import StepService  from "@/components/booking/StepService"
import StepDoctor   from "@/components/booking/StepDoctor"
import StepDate     from "@/components/booking/StepDate"
import StepTime     from "@/components/booking/StepTime"
import StepPatient  from "@/components/booking/StepPatient"
import StepConfirm  from "@/components/booking/StepConfirm"
import styles from "@/components/booking/booking.module.css"

const STEPS = [
  { id:1, label:"Service", icon:"🦷" },
  { id:2, label:"Doctor",  icon:"🩺" },
  { id:3, label:"Date",    icon:"📅" },
  { id:4, label:"Time",    icon:"⏰" },
  { id:5, label:"Details", icon:"👤" },
  { id:6, label:"Confirm", icon:"✅" },
]

const FLOATERS = [
  { e:"🦷", style:{ top:"8%",    left:"2%",  animationDelay:"0s"   } },
  { e:"🩺", style:{ top:"20%",   right:"3%", animationDelay:"1.5s" } },
  { e:"📅", style:{ bottom:"25%",left:"3%",  animationDelay:"3s"   } },
  { e:"✨", style:{ bottom:"15%",right:"4%", animationDelay:"2s"   } },
]

export default function BookingPage() {
  const [step, setStep] = useState(1)

  const next = () => setStep(s => Math.min(s + 1, STEPS.length))
  const prev = () => setStep(s => Math.max(s - 1, 1))
  // Only allow clicking completed steps
  const goTo = (n: number) => { if (n < step) setStep(n) }

  const pct = Math.round(((step - 1) / (STEPS.length - 1)) * 100)

  const stepComponent: Record<number, React.ReactNode> = {
    1: <StepService onNext={next} />,
    2: <StepDoctor  onNext={next} onBack={prev} />,
    3: <StepDate    onNext={next} onBack={prev} />,
    4: <StepTime    onNext={next} onBack={prev} />,
    5: <StepPatient onNext={next} onBack={prev} />,
    6: <StepConfirm onBack={prev} />,
  }

  return (
    <>
      {/* Ambient elements outside main div so they don't inherit padding */}
      <div className={styles.blobA} />
      <div className={styles.blobB} />
      {FLOATERS.map(({ e, style }, i) => (
        <div key={i} className={styles.float} style={style as React.CSSProperties}>{e}</div>
      ))}

      <div className={styles.root}>

        {/* Header */}
        <div className={styles.header}>
          <div className={styles.eyebrow}>📅 Online Booking</div>
          <h1 className={styles.title}>Book Your <em>Appointment</em></h1>
          <p className={styles.subtitle}>Simple, fast & confirmed instantly — 6 easy steps</p>
        </div>

        {/* Progress */}
        <div className={styles.progressWrap}>
          <div className={styles.progressTrack}>
            <div className={styles.progressFill} style={{ width:`${pct}%` }} />
          </div>
          <div className={styles.steps}>
            {STEPS.map(s => {
              const state = s.id < step ? "done" : s.id === step ? "active" : "future"
              return (
                <div
                  key={s.id}
                  className={`${styles.stepDot}${state === "future" ? " " + styles.future : ""}`}
                  onClick={() => goTo(s.id)}
                  role="button"
                  tabIndex={s.id < step ? 0 : -1}
                  aria-label={`Step ${s.id}: ${s.label}`}
                >
                  <div className={`${styles.stepCircle} ${styles[state]}`}>
                    {state === "done"
                      ? <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round">
                          <polyline points="20 6 9 17 4 12"/>
                        </svg>
                      : s.id
                    }
                  </div>
                  <span className={`${styles.stepLabel} ${styles[state]}`}>{s.label}</span>
                </div>
              )
            })}
          </div>
        </div>

        {/* Step card */}
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <div className={styles.cardIcon}>{STEPS[step - 1].icon}</div>
            <div>
              <p className={styles.cardTitle}>{STEPS[step - 1].label}</p>
              <p className={styles.cardSub}>Step {step} of {STEPS.length}</p>
            </div>
            <div className={styles.stepCounter}>
              <span className={styles.stepN}>{String(step).padStart(2, "0")}</span>
              <span className={styles.stepTotal}>/ {String(STEPS.length).padStart(2, "0")}</span>
            </div>
          </div>
          <div className={styles.cardBody}>
            {stepComponent[step]}
          </div>
        </div>

      </div>
    </>
  )
}