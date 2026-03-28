"use client"

// components/dashboard/PatientTimeline.tsx
// Renders a vertical chronological timeline of a patient's clinic activity.
// Data comes from GET /api/patients/:id/medical (doctors) or GET /api/patients/:id (others).
// Pass the full MedicalRecord object via the `patient` prop.

import Link from "next/link"

interface TimelineAppointment {
  id:      string
  date:    string
  time:    string
  status:  string
  service?: { name: string }
  doctor?:  { name: string }
}

interface TimelinePrescription {
  id:        string
  createdAt: string
  diagnosis: string
  doctor?:   { name: string }
  medicines?: Array<{ name: string; dose: string }>
}

interface TimelineConsultation {
  id:        string
  createdAt: string
  chiefComplaint?: string
  diagnosis?:      string
  doctor?:   { name: string }
}

interface TimelineLabRequest {
  id:        string
  createdAt: string
  testName:  string
  status:    string
  doctor?:   { name: string }
}

interface TimelineBill {
  id:        string
  createdAt: string
  total:     number
  paid:      number
  status:    string
}

interface PatientRecord {
  appointments?:  TimelineAppointment[]
  prescriptions?: TimelinePrescription[]
  consultations?: TimelineConsultation[]
  labRequests?:   TimelineLabRequest[]
  bills?:         TimelineBill[]
}

interface Props {
  patient: PatientRecord
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmt(dateStr?: string | null) {
  if (!dateStr) return "—"
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return "—"
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
}

type EventType = "appointment" | "prescription" | "consultation" | "lab" | "bill"

interface TEvent {
  id:       string
  type:     EventType
  date:     Date
  title:    string
  subtitle: string
  badge?:   string
  badgeOk?: boolean
  href?:    string
  extra?:   string
}

const TYPE_META: Record<EventType, { icon: string; color: string; bg: string }> = {
  appointment:  { icon: "📅", color: "#2563eb", bg: "rgba(37,99,235,.1)"  },
  prescription: { icon: "💊", color: "#0d9488", bg: "rgba(13,148,136,.1)" },
  consultation: { icon: "🩺", color: "#7c3aed", bg: "rgba(124,58,237,.1)" },
  lab:          { icon: "🔬", color: "#d97706", bg: "rgba(245,158,11,.1)"  },
  bill:         { icon: "💳", color: "#64748b", bg: "rgba(100,116,139,.1)" },
}

const APPT_STATUS_COLORS: Record<string, string> = {
  confirmed:   "#0d9488",
  completed:   "#16a34a",
  pending:     "#d97706",
  cancelled:   "#dc2626",
  no_show:     "#94a3b8",
  checked_in:  "#2563eb",
  in_progress: "#7c3aed",
}

const BILL_STATUS_COLORS: Record<string, string> = {
  paid:      "#16a34a",
  partial:   "#d97706",
  pending:   "#dc2626",
  cancelled: "#94a3b8",
}

// ── Main component ────────────────────────────────────────────────────────────
export default function PatientTimeline({ patient }: Props) {
  const events: TEvent[] = []

  // Appointments
  for (const a of patient.appointments ?? []) {
    const d = new Date(a.date)
    if (!isNaN(d.getTime())) {
      events.push({
        id:       a.id,
        type:     "appointment",
        date:     d,
        title:    a.service?.name ?? "Appointment",
        subtitle: `${a.time}${a.doctor ? ` · Dr. ${a.doctor.name}` : ""}`,
        badge:    a.status,
        badgeOk:  a.status === "completed",
        href:     "/dashboard/appointments",
      })
    }
  }

  // Prescriptions
  for (const p of patient.prescriptions ?? []) {
    const d = new Date(p.createdAt)
    if (!isNaN(d.getTime())) {
      events.push({
        id:       p.id,
        type:     "prescription",
        date:     d,
        title:    p.diagnosis ?? "Prescription",
        subtitle: p.doctor ? `Dr. ${p.doctor.name}` : "Prescription",
        extra:    p.medicines?.slice(0, 3).map(m => m.name).join(", "),
        href:     "/dashboard/prescriptions",
      })
    }
  }

  // Consultations
  for (const c of patient.consultations ?? []) {
    const d = new Date(c.createdAt)
    if (!isNaN(d.getTime())) {
      events.push({
        id:       c.id,
        type:     "consultation",
        date:     d,
        title:    c.chiefComplaint ?? "Consultation",
        subtitle: c.doctor ? `Dr. ${c.doctor.name}` : "Consultation",
        extra:    c.diagnosis,
        href:     "/dashboard/consultations",
      })
    }
  }

  // Lab requests
  for (const l of patient.labRequests ?? []) {
    const d = new Date(l.createdAt)
    if (!isNaN(d.getTime())) {
      events.push({
        id:       l.id,
        type:     "lab",
        date:     d,
        title:    l.testName ?? "Lab Test",
        subtitle: l.doctor ? `Dr. ${l.doctor.name}` : "Lab",
        badge:    l.status,
        badgeOk:  l.status === "completed",
        href:     "/dashboard/lab",
      })
    }
  }

  // Bills
  for (const b of patient.bills ?? []) {
    const d = new Date(b.createdAt)
    if (!isNaN(d.getTime())) {
      events.push({
        id:       b.id,
        type:     "bill",
        date:     d,
        title:    `Bill — ₹${b.total.toLocaleString()}`,
        subtitle: b.paid > 0 ? `Paid ₹${b.paid.toLocaleString()}` : "Unpaid",
        badge:    b.status,
        badgeOk:  b.status === "paid",
        href:     "/dashboard/billing",
      })
    }
  }

  // Sort newest first
  events.sort((a, b) => b.date.getTime() - a.date.getTime())

  if (events.length === 0) {
    return (
      <div style={{ textAlign: "center", padding: "40px 20px", color: "#94a3b8" }}>
        <div style={{ fontSize: "2.5rem", marginBottom: 10 }}>📋</div>
        <p style={{ fontSize: ".9rem" }}>No history found for this patient.</p>
      </div>
    )
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&display=swap');
        .ptl-item { position:relative; padding:0 0 20px 40px; }
        .ptl-item:last-child { padding-bottom: 0; }
        .ptl-item::before {
          content:''; position:absolute; left:16px; top:28px; bottom:0;
          width:2px; background:rgba(10,22,40,.07);
        }
        .ptl-item:last-child::before { display:none; }
        .ptl-dot {
          position:absolute; left:0; top:4px;
          width:32px; height:32px; border-radius:50%;
          display:flex; align-items:center; justify-content:center;
          font-size:.9rem; flex-shrink:0;
        }
        .ptl-card {
          background:#fff; border-radius:12px;
          border:1px solid rgba(10,22,40,.07);
          padding:12px 14px; font-family:'DM Sans',sans-serif;
          transition:box-shadow .15s;
        }
        .ptl-card:hover { box-shadow:0 4px 16px rgba(10,22,40,.08); }
        .ptl-card-link { text-decoration:none; display:block; }
        .ptl-type  { font-size:.62rem; font-weight:700; letter-spacing:.1em; text-transform:uppercase; margin-bottom:3px; }
        .ptl-title { font-size:.87rem; font-weight:600; color:#0a1628; margin-bottom:2px; }
        .ptl-sub   { font-size:.76rem; color:#64748b; margin-bottom:4px; }
        .ptl-extra { font-size:.72rem; color:#94a3b8; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
        .ptl-foot  { display:flex; align-items:center; justify-content:space-between; margin-top:6px; }
        .ptl-date  { font-size:.68rem; color:#94a3b8; }
        .ptl-badge { font-size:.62rem; font-weight:700; padding:2px 8px; border-radius:20px; text-transform:capitalize; }
      `}</style>

      <div style={{ fontFamily: "'DM Sans',sans-serif", paddingLeft: 4 }}>
        {events.map(ev => {
          const meta = TYPE_META[ev.type]
          const badgeColor =
            ev.type === "appointment" ? APPT_STATUS_COLORS[ev.badge ?? ""] :
            ev.type === "bill"        ? BILL_STATUS_COLORS[ev.badge ?? ""] :
            ev.badgeOk                ? "#16a34a" : "#d97706"

          return (
            <div key={ev.id} className="ptl-item">
              <div className="ptl-dot" style={{ background: meta.bg }}>
                {meta.icon}
              </div>

              <a href={ev.href ?? "#"} className="ptl-card-link">
                <div className="ptl-card">
                  <div className="ptl-type" style={{ color: meta.color }}>{ev.type}</div>
                  <div className="ptl-title">{ev.title}</div>
                  <div className="ptl-sub">{ev.subtitle}</div>
                  {ev.extra && <div className="ptl-extra">{ev.extra}</div>}
                  <div className="ptl-foot">
                    <span className="ptl-date">{fmt(ev.date.toISOString())}</span>
                    {ev.badge && (
                      <span
                        className="ptl-badge"
                        style={{
                          background: `${badgeColor}18`,
                          color: badgeColor,
                        }}
                      >
                        {ev.badge.replace(/_/g, " ")}
                      </span>
                    )}
                  </div>
                </div>
              </a>
            </div>
          )
        })}
      </div>
    </>
  )
}
