"use client"

// components/dashboard/AppointmentCalendar.tsx
// FIXED: Replaced hardcoded EVENTS array with real API fetch from /api/appointments
// Falls back to empty array gracefully if backend is unreachable

import { useState, useEffect, useCallback } from "react"
import { Calendar, dateFnsLocalizer, View } from "react-big-calendar"
import { format, parse, startOfWeek, getDay } from "date-fns"
import { enIN } from "date-fns/locale"
import "react-big-calendar/lib/css/react-big-calendar.css"
import API from "@/lib/api"
import { useAuthStore } from "@/store/authStore"

// ── date-fns localizer ─────────────────────────────────────────
const locales = { "en-IN": enIN }
const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek: () => startOfWeek(new Date(), { weekStartsOn: 1 }),
  getDay,
  locales,
})

// ── Types ──────────────────────────────────────────────────────
interface CalendarEvent {
  id:      string
  title:   string
  start:   Date
  end:     Date
  doctor:  string
  status:  "confirmed" | "pending" | "cancelled" | "completed" | "checked_in" | "in_progress" | "no_show"
  service: string
}

// Map backend AppStatus → calendar display status
const STATUS_MAP: Record<string, CalendarEvent["status"]> = {
  pending:     "pending",
  confirmed:   "confirmed",
  checked_in:  "confirmed",
  in_progress: "confirmed",
  completed:   "confirmed",
  cancelled:   "cancelled",
  no_show:     "cancelled",
}

// ── Event colours ──────────────────────────────────────────────
const EVENT_STYLES: Record<string, { background: string; borderLeft: string }> = {
  confirmed: { background: "rgba(13,148,136,.12)",  borderLeft: "3px solid #0d9488" },
  pending:   { background: "rgba(245,158,11,.12)",  borderLeft: "3px solid #f59e0b" },
  cancelled: { background: "rgba(220,38,38,.10)",   borderLeft: "3px solid #ef4444" },
}

export default function AppointmentCalendar() {
  const { token } = useAuthStore()
  const [events,   setEvents]  = useState<CalendarEvent[]>([])
  const [loading,  setLoading] = useState(true)
  const [view,     setView]    = useState<View>("week")
  const [date,     setDate]    = useState(new Date())
  const [selected, setSel]     = useState<CalendarEvent | null>(null)

  // ── Fetch appointments from backend ───────────────────────────
  const fetchAppointments = useCallback(async () => {
    if (!token) return
    try {
      setLoading(true)
      const res = await API.get("/appointments")
      // res.data is the unwrapped array from the Axios interceptor
      const appointments: any[] = Array.isArray(res.data) ? res.data : []

      const mapped: CalendarEvent[] = appointments.map(appt => {
        // Backend stores date as ISO string + time as "10:00 AM" string
        const baseDate  = new Date(appt.date)
        const [time, meridiem] = (appt.time as string).split(" ")
        const [h, m]   = time.split(":").map(Number)
        const hours    = meridiem === "PM" && h !== 12 ? h + 12 : meridiem === "AM" && h === 12 ? 0 : h
        const start    = new Date(baseDate.getFullYear(), baseDate.getMonth(), baseDate.getDate(), hours, m)
        const end      = new Date(start.getTime() + (appt.duration ?? 30) * 60000)

        return {
          id:      appt.id,
          title:   `${appt.patient?.name ?? "Patient"} — ${appt.service?.name ?? "Appointment"}`,
          start,
          end,
          doctor:  appt.doctor?.name ?? "Doctor",
          status:  STATUS_MAP[appt.status] ?? "pending",
          service: appt.service?.name ?? "Appointment",
        }
      })

      setEvents(mapped)
    } catch (err) {
      // Backend unreachable — show empty calendar, not an error screen
      console.warn("AppointmentCalendar: could not fetch appointments", err)
      setEvents([])
    } finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => { fetchAppointments() }, [fetchAppointments])

  const eventStyleGetter = (event: CalendarEvent) => ({
    style: {
      ...(EVENT_STYLES[event.status] ?? EVENT_STYLES.pending),
      borderRadius: "8px",
      color: "#0a1628",
      fontSize: "0.75rem",
      fontWeight: 500,
      padding: "3px 7px",
      border: "none",
    },
  })

  return (
    <>
      <style>{`
        .rbc-calendar           { font-family:'DM Sans',sans-serif; border-radius:12px; overflow:hidden; }
        .rbc-header             { padding:10px 0; font-size:.78rem; font-weight:600; color:#64748b; border-bottom:1px solid rgba(10,22,40,.07); }
        .rbc-today              { background:rgba(13,148,136,.05) !important; }
        .rbc-off-range-bg       { background:#f9f7f4; }
        .rbc-time-slot          { border-top:1px solid rgba(10,22,40,.04) !important; }
        .rbc-time-gutter .rbc-timeslot-group { border:none !important; }
        .rbc-time-content       { border-top:1px solid rgba(10,22,40,.07) !important; }
        .rbc-current-time-indicator { background:#0d9488; height:2px; }
        .rbc-toolbar            { display:none; }
        .rbc-event              { box-shadow:none !important; }
        .rbc-event.rbc-selected { outline:2px solid #0d9488; }
        .rbc-show-more          { color:#0d9488; font-size:.75rem; }
        .rbc-time-gutter .rbc-label { font-size:.7rem; color:#94a3b8; }

        .cal-toolbar { display:flex; align-items:center; justify-content:space-between; margin-bottom:16px; flex-wrap:wrap; gap:10px; }
        .cal-nav { display:flex; align-items:center; gap:6px; }
        .cal-nav-btn { background:none; border:1px solid rgba(10,22,40,.1); border-radius:8px; padding:6px 10px; cursor:pointer; color:#64748b; font-family:'DM Sans',sans-serif; font-size:.8rem; transition:all .18s; }
        .cal-nav-btn:hover { background:rgba(10,22,40,.05); color:#0a1628; border-color:rgba(10,22,40,.2); }
        .cal-nav-today { background:linear-gradient(135deg,#0d9488,#0a1628); color:#fff; border:none; padding:6px 14px; border-radius:8px; cursor:pointer; font-family:'DM Sans',sans-serif; font-size:.8rem; font-weight:500; transition:opacity .18s; }
        .cal-nav-today:hover { opacity:.88; }
        .cal-date-label { font-family:'Cormorant Garamond',serif; font-size:1.1rem; font-weight:700; color:#0a1628; }
        .cal-views { display:flex; gap:4px; }
        .cal-view-btn { padding:5px 12px; border-radius:8px; border:1px solid rgba(10,22,40,.1); background:none; cursor:pointer; font-family:'DM Sans',sans-serif; font-size:.78rem; color:#64748b; transition:all .18s; }
        .cal-view-btn.active { background:#0a1628; color:#fff; border-color:#0a1628; }
        .cal-view-btn:hover:not(.active) { background:rgba(10,22,40,.04); }
        .cal-legend { display:flex; gap:14px; margin-top:12px; flex-wrap:wrap; }
        .cal-legend-item { display:flex; align-items:center; gap:5px; font-size:.72rem; color:#64748b; }
        .cal-legend-dot  { width:10px; height:10px; border-radius:50%; }
        .cal-loading { display:flex; align-items:center; justify-content:center; height:480px; color:#94a3b8; font-size:.9rem; gap:10px; }
        .cal-spinner { width:20px; height:20px; border:2px solid rgba(13,148,136,.2); border-top-color:#0d9488; border-radius:50%; animation:calSpin .7s linear infinite; }
        @keyframes calSpin { to{transform:rotate(360deg)} }

        .cal-popup { position:fixed; bottom:32px; right:32px; background:#fff; border-radius:16px; padding:18px 20px; box-shadow:0 8px 40px rgba(10,22,40,.15); border:1px solid rgba(10,22,40,.07); min-width:240px; z-index:100; animation:calPopIn .25s cubic-bezier(.34,1.56,.64,1); }
        @keyframes calPopIn { from{opacity:0;transform:scale(.92) translateY(10px)} to{opacity:1;transform:scale(1) translateY(0)} }
        .cal-popup-close { position:absolute; top:10px; right:12px; background:none; border:none; cursor:pointer; color:#94a3b8; font-size:1rem; transition:color .18s; }
        .cal-popup-close:hover { color:#0a1628; }
        .cal-popup-title { font-family:'Cormorant Garamond',serif; font-size:1rem; font-weight:700; color:#0a1628; margin-bottom:8px; }
        .cal-popup-row { display:flex; align-items:center; gap:6px; font-size:.78rem; color:#64748b; margin-bottom:4px; }
      `}</style>

      {/* Toolbar */}
      <div className="cal-toolbar">
        <div className="cal-nav">
          <button className="cal-nav-btn" onClick={() => {
            const d = new Date(date)
            view === "month" ? d.setMonth(d.getMonth() - 1) : d.setDate(d.getDate() - 7)
            setDate(d)
          }}>‹</button>
          <button className="cal-nav-today" onClick={() => setDate(new Date())}>Today</button>
          <button className="cal-nav-btn" onClick={() => {
            const d = new Date(date)
            view === "month" ? d.setMonth(d.getMonth() + 1) : d.setDate(d.getDate() + 7)
            setDate(d)
          }}>›</button>
          <span className="cal-date-label">
            {format(date, view === "month" ? "MMMM yyyy" : "MMMM d, yyyy")}
          </span>
        </div>
        <div className="cal-views">
          {(["month", "week", "day", "agenda"] as View[]).map(v => (
            <button
              key={v}
              className={`cal-view-btn${view === v ? " active" : ""}`}
              onClick={() => setView(v)}
            >
              {v.charAt(0).toUpperCase() + v.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="cal-loading">
          <div className="cal-spinner" />
          Loading appointments…
        </div>
      ) : (
        <Calendar
          localizer={localizer}
          events={events}
          view={view}
          date={date}
          onView={setView}
          onNavigate={setDate}
          style={{ height: 480 }}
          eventPropGetter={eventStyleGetter as any}
          onSelectEvent={e => setSel(e as CalendarEvent)}
          popup
        />
      )}

      {/* Legend */}
      <div className="cal-legend">
        {[
          { color: "#0d9488", label: "Confirmed" },
          { color: "#f59e0b", label: "Pending"   },
          { color: "#ef4444", label: "Cancelled" },
        ].map(l => (
          <div key={l.label} className="cal-legend-item">
            <div className="cal-legend-dot" style={{ background: l.color }} />
            {l.label}
          </div>
        ))}
      </div>

      {/* Event detail popup */}
      {selected && (
        <div className="cal-popup">
          <button className="cal-popup-close" onClick={() => setSel(null)}>✕</button>
          <div className="cal-popup-title">{selected.title}</div>
          <div className="cal-popup-row">📅 {format(selected.start, "EEE, MMM d · h:mm a")}</div>
          <div className="cal-popup-row">🩺 {selected.doctor}</div>
          <div className="cal-popup-row">🦷 {selected.service}</div>
          <div className="cal-popup-row">
            <span style={{
              fontSize: ".65rem", fontWeight: 700, padding: "2px 8px", borderRadius: "50px",
              background: (EVENT_STYLES[selected.status] ?? EVENT_STYLES.pending).background,
              color: selected.status === "confirmed" ? "#0d9488"
                   : selected.status === "pending"   ? "#d97706"
                   : "#dc2626",
            }}>
              {selected.status.toUpperCase()}
            </span>
          </div>
        </div>
      )}
    </>
  )
}