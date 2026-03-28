"use client"

// app/dashboard/calendar/page.tsx
// Standalone full-screen calendar view — wraps AppointmentCalendar component.

import AppointmentCalendar from "@/components/dashboard/AppointmentCalendar"

export default function CalendarPage() {
  return (
    <div style={{ fontFamily: "'DM Sans',sans-serif" }}>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: "1.9rem", fontWeight: 700, color: "#0a1628", margin: 0 }}>
          Appointment Calendar
        </h1>
        <p style={{ fontSize: ".85rem", color: "#64748b", marginTop: 4 }}>
          Full schedule view — day, week, month and agenda modes.
        </p>
      </div>
      <AppointmentCalendar />
    </div>
  )
}
