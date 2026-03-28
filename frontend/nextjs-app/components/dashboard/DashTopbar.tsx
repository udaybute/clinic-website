"use client"

// components/dashboard/DashTopbar.tsx
// Live notification bell: fetches GET /api/notifications/count on mount + every 60s.
// Clicking the bell opens a dropdown with GET /api/notifications list.

import { usePathname } from "next/navigation"
import { useAuthStore } from "@/store/authStore"
import { useState, useEffect, useRef, useCallback } from "react"
import API from "@/lib/api"

const PAGE_TITLES: Record<string, { title: string; sub: string }> = {
  "/dashboard":                 { title: "Dashboard",       sub: "Overview & key metrics"        },
  "/dashboard/checkin":         { title: "Check-In",        sub: "Manage patient arrivals"        },
  "/dashboard/waitlist":        { title: "Waiting Room",    sub: "Live queue management"          },
  "/dashboard/appointments":    { title: "Appointments",    sub: "Manage your schedule"           },
  "/dashboard/calendar":        { title: "Calendar",        sub: "Visual appointment view"        },
  "/dashboard/patients":        { title: "Patients",        sub: "Patient records & history"      },
  "/dashboard/consultations":   { title: "Consultations",   sub: "Clinical notes & diagnosis"     },
  "/dashboard/prescriptions":   { title: "Prescriptions",   sub: "Write & manage prescriptions"   },
  "/dashboard/lab":             { title: "Lab & Reports",   sub: "Tests & investigations"         },
  "/dashboard/billing":         { title: "Billing",         sub: "Invoices & payments"            },
  "/dashboard/messages":        { title: "Messages",        sub: "Patient communications"         },
  "/dashboard/reports":         { title: "My Reports",      sub: "Today's schedule & daily summary"  },
  "/dashboard/analytics":       { title: "Analytics",       sub: "Performance & revenue insights" },
  "/dashboard/staff":           { title: "Staff",           sub: "Manage clinic team"             },
  "/dashboard/doctors":         { title: "Doctors",         sub: "Doctor profiles & schedules"    },
  "/dashboard/services":        { title: "Services",        sub: "Manage clinic services"         },
  "/dashboard/clinic-settings": { title: "Clinic Settings", sub: "Hours, fees & configuration"   },
  "/dashboard/audit":           { title: "Audit Logs",      sub: "Security & access logs"        },
  "/dashboard/settings":        { title: "Settings",        sub: "Account preferences"            },
}

const ROLE_CONFIG: Record<string, { label: string; color: string; bg: string; icon: string }> = {
  admin:        { label: "Super Admin",  color: "#d4a843", bg: "rgba(212,168,67,.12)", icon: "👑" },
  doctor:       { label: "Doctor",       color: "#0d9488", bg: "rgba(13,148,136,.1)",  icon: "🩺" },
  receptionist: { label: "Receptionist", color: "#2563eb", bg: "rgba(37,99,235,.1)",   icon: "💁" },
}

const NOTIF_ICONS: Record<string, string> = {
  appointment_pending: "📅",
  lab_pending:         "🔬",
  bill_overdue:        "💳",
}

interface NotifItem {
  id:      string
  type:    string
  title:   string
  message: string
  time:    string
  href:    string
}

interface Props { onMenuClick: () => void }

export default function DashTopbar({ onMenuClick }: Props) {
  const pathname = usePathname()
  const { user, logout } = useAuthStore()

  const [notifCount, setNotifCount] = useState(0)
  const [notifOpen,  setNotifOpen]  = useState(false)
  const [notifList,  setNotifList]  = useState<NotifItem[]>([])
  const [notifLoad,  setNotifLoad]  = useState(false)
  const bellRef = useRef<HTMLButtonElement>(null)
  const dropRef = useRef<HTMLDivElement>(null)

  const fetchCount = useCallback(async () => {
    try {
      const res = await API.get("/notifications/count")
      setNotifCount(res.data?.count ?? 0)
    } catch { /* ignore — bell shows 0 if backend not reachable */ }
  }, [])

  const fetchList = useCallback(async () => {
    setNotifLoad(true)
    try {
      const res = await API.get("/notifications")
      setNotifList(Array.isArray(res.data) ? res.data : [])
    } catch {
      setNotifList([])
    } finally {
      setNotifLoad(false)
    }
  }, [])

  // Fetch count on mount + every 60 seconds
  useEffect(() => {
    fetchCount()
    const id = setInterval(fetchCount, 60_000)
    return () => clearInterval(id)
  }, [fetchCount])

  // Close dropdown on outside click
  useEffect(() => {
    if (!notifOpen) return
    const handler = (e: MouseEvent) => {
      if (
        bellRef.current && !bellRef.current.contains(e.target as Node) &&
        dropRef.current  && !dropRef.current.contains(e.target as Node)
      ) setNotifOpen(false)
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [notifOpen])

  const toggleNotif = () => {
    if (!notifOpen) fetchList()
    setNotifOpen(v => !v)
  }

  const meta    = PAGE_TITLES[pathname] ?? { title: "Dashboard", sub: "" }
  const role    = user?.role ?? "admin"
  const rc      = ROLE_CONFIG[role] ?? ROLE_CONFIG.admin
  const initials = user?.name?.split(" ").map(n => n[0]).join("").slice(0, 2) ?? "U"
  const today   = new Date().toLocaleDateString("en-IN", {
    weekday: "short", day: "numeric", month: "short", year: "numeric",
  })

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@700&family=DM+Sans:wght@300;400;500;600&display=swap');

        .dtb-root {
          height: 64px;
          background: #fff;
          border-bottom: 1px solid rgba(10,22,40,.07);
          display: flex;
          align-items: center;
          padding: 0 20px;
          gap: 12px;
          flex-shrink: 0;
          position: sticky;
          top: 0;
          z-index: 350;
          box-shadow: 0 1px 12px rgba(10,22,40,.05);
          font-family: 'DM Sans', sans-serif;
        }
        .dtb-ham {
          min-width: 44px; height: 44px; flex-shrink: 0;
          background: none; border: none; cursor: pointer;
          color: #64748b; border-radius: 10px;
          display: flex; align-items: center; justify-content: center;
          transition: background .18s, color .18s;
        }
        .dtb-ham:hover  { background: rgba(10,22,40,.06); color: #0a1628; }
        .dtb-ham:active { background: rgba(10,22,40,.1); }
        .dtb-titles { flex: 1; min-width: 0; }
        .dtb-title {
          font-family: 'Cormorant Garamond', serif;
          font-size: 1.2rem; font-weight: 700; color: #0a1628; line-height: 1;
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
        }
        .dtb-sub {
          font-size: .72rem; color: #94a3b8; margin-top: 2px;
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
        }
        .dtb-right {
          display: flex; align-items: center; gap: 8px;
          flex-shrink: 0; overflow: hidden; position: relative;
        }
        .dtb-date {
          font-size: .72rem; color: #94a3b8;
          padding: 5px 12px; border-radius: 50px;
          background: rgba(10,22,40,.04);
          border: 1px solid rgba(10,22,40,.07);
          white-space: nowrap;
          display: flex; align-items: center; gap: 5px;
        }
        .dtb-bell {
          position: relative;
          width: 36px; height: 36px; border-radius: 10px;
          background: none; border: 1px solid rgba(10,22,40,.08);
          display: flex; align-items: center; justify-content: center;
          cursor: pointer; font-size: .9rem; flex-shrink: 0;
          transition: background .18s;
        }
        .dtb-bell:hover  { background: rgba(10,22,40,.04); }
        .dtb-bell.active { background: rgba(13,148,136,.08); border-color: rgba(13,148,136,.2); }
        .dtb-badge {
          position: absolute; top: -5px; right: -5px;
          min-width: 17px; height: 17px; border-radius: 50%;
          background: #ef4444; color: white; font-size: .48rem;
          font-weight: 700; display: flex; align-items: center; justify-content: center;
          border: 2px solid #fff; padding: 0 3px;
        }
        /* Notification dropdown */
        .dtb-notif-drop {
          position: absolute; top: calc(100% + 10px); right: 0;
          width: 340px; max-width: calc(100vw - 24px);
          background: #fff; border-radius: 16px;
          border: 1px solid rgba(10,22,40,.08);
          box-shadow: 0 16px 48px rgba(10,22,40,.18);
          z-index: 500;
          animation: dtbDropIn .18s ease;
          overflow: hidden;
        }
        @keyframes dtbDropIn { from { opacity:0; transform:translateY(-6px) } to { opacity:1; transform:translateY(0) } }
        .dtb-notif-head {
          padding: 14px 16px 10px;
          border-bottom: 1px solid rgba(10,22,40,.06);
          display: flex; align-items: center; justify-content: space-between;
        }
        .dtb-notif-title { font-size: .85rem; font-weight: 600; color: #0a1628; }
        .dtb-notif-cnt   { font-size: .7rem; color: #64748b; }
        .dtb-notif-list  { max-height: 320px; overflow-y: auto; }
        .dtb-notif-item {
          display: flex; align-items: flex-start; gap: 10px;
          padding: 12px 16px;
          border-bottom: 1px solid rgba(10,22,40,.04);
          cursor: pointer; text-decoration: none;
          transition: background .15s;
        }
        .dtb-notif-item:last-child { border-bottom: none; }
        .dtb-notif-item:hover { background: rgba(13,148,136,.04); }
        .dtb-notif-ico {
          font-size: 1.2rem; flex-shrink: 0; margin-top: 1px;
        }
        .dtb-notif-body { flex: 1; min-width: 0; }
        .dtb-notif-item-title { font-size: .8rem; font-weight: 600; color: #0a1628; margin-bottom: 2px; }
        .dtb-notif-item-msg   { font-size: .74rem; color: #64748b; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .dtb-notif-item-time  { font-size: .65rem; color: #94a3b8; margin-top: 3px; }
        .dtb-notif-empty {
          padding: 32px 16px; text-align: center;
          font-size: .84rem; color: #94a3b8;
        }
        .dtb-sep { width: 1px; height: 24px; background: rgba(10,22,40,.08); flex-shrink: 0; }
        .dtb-user { display: flex; align-items: center; gap: 8px; flex-shrink: 0; }
        .dtb-av {
          width: 34px; height: 34px; border-radius: 50%; flex-shrink: 0;
          display: flex; align-items: center; justify-content: center;
          font-size: .72rem; font-weight: 700; color: white;
        }
        .dtb-uname { font-size: .82rem; font-weight: 500; color: #0a1628; white-space: nowrap; }
        .dtb-rbadge {
          font-size: .6rem; font-weight: 700; letter-spacing: .07em; text-transform: uppercase;
          padding: 2px 8px; border-radius: 50px;
          display: flex; align-items: center; gap: 4px; white-space: nowrap;
        }
        .dtb-signout-full {
          display: inline-flex; align-items: center; gap: 7px;
          padding: 8px 16px; border-radius: 50px; cursor: pointer;
          background: rgba(220,38,38,.08); color: #ef4444;
          border: 1.5px solid rgba(220,38,38,.2);
          font-family: 'DM Sans', sans-serif; font-size: .8rem; font-weight: 500;
          white-space: nowrap; flex-shrink: 0;
          transition: background .18s, box-shadow .18s;
        }
        .dtb-signout-full:hover { background: rgba(220,38,38,.14); box-shadow: 0 3px 12px rgba(220,38,38,.15); }
        .dtb-signout-icon {
          display: none;
          width: 36px; height: 36px; border-radius: 10px;
          border: 1px solid rgba(220,38,38,.2);
          background: rgba(220,38,38,.06);
          cursor: pointer; color: #ef4444;
          align-items: center; justify-content: center;
          flex-shrink: 0; transition: background .18s;
        }
        .dtb-signout-icon:hover { background: rgba(220,38,38,.12); }

        @media (max-width: 900px) { .dtb-date { display: none; } }
        @media (max-width: 768px) {
          .dtb-root    { padding: 0 12px; gap: 8px; }
          .dtb-sub     { display: none; }
          .dtb-uname   { display: none; }
          .dtb-sep     { display: none; }
          .dtb-signout-full { display: none; }
          .dtb-signout-icon { display: flex; }
        }
        @media (max-width: 480px) {
          .dtb-rbadge { display: none; }
          .dtb-title  { font-size: 1rem; }
        }
      `}</style>

      <header className="dtb-root">

        <button className="dtb-ham" onClick={onMenuClick} aria-label="Toggle sidebar">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <line x1="3"  y1="6"  x2="21" y2="6"  />
            <line x1="3"  y1="12" x2="21" y2="12" />
            <line x1="3"  y1="18" x2="15" y2="18" />
          </svg>
        </button>

        <div className="dtb-titles">
          <div className="dtb-title">{meta.title}</div>
          <div className="dtb-sub">{meta.sub}</div>
        </div>

        <div className="dtb-right">
          <div className="dtb-date">📅 {today}</div>

          {/* Live notification bell */}
          <button
            ref={bellRef}
            className={`dtb-bell${notifOpen ? " active" : ""}`}
            aria-label={`Notifications${notifCount > 0 ? ` (${notifCount})` : ""}`}
            onClick={toggleNotif}
          >
            🔔
            {notifCount > 0 && (
              <span className="dtb-badge">
                {notifCount > 99 ? "99+" : notifCount}
              </span>
            )}
          </button>

          {/* Notification dropdown */}
          {notifOpen && (
            <div ref={dropRef} className="dtb-notif-drop">
              <div className="dtb-notif-head">
                <span className="dtb-notif-title">Notifications</span>
                <span className="dtb-notif-cnt">
                  {notifLoad ? "Loading…" : `${notifList.length} alert${notifList.length !== 1 ? "s" : ""}`}
                </span>
              </div>
              <div className="dtb-notif-list">
                {notifLoad ? (
                  <div className="dtb-notif-empty">Loading notifications…</div>
                ) : notifList.length === 0 ? (
                  <div className="dtb-notif-empty">✅ All clear — no pending alerts</div>
                ) : (
                  notifList.map(n => (
                    <a
                      key={n.id}
                      href={n.href}
                      className="dtb-notif-item"
                      onClick={() => setNotifOpen(false)}
                    >
                      <span className="dtb-notif-ico">{NOTIF_ICONS[n.type] ?? "🔔"}</span>
                      <div className="dtb-notif-body">
                        <div className="dtb-notif-item-title">{n.title}</div>
                        <div className="dtb-notif-item-msg">{n.message}</div>
                        <div className="dtb-notif-item-time">{n.time}</div>
                      </div>
                    </a>
                  ))
                )}
              </div>
            </div>
          )}

          <div className="dtb-sep" />

          <div className="dtb-user">
            <div className="dtb-av" style={{ background: `linear-gradient(135deg, ${rc.color}, #0a1628)` }}>
              {initials}
            </div>
            <div>
              <div className="dtb-uname">{user?.name ?? "User"}</div>
              <span className="dtb-rbadge" style={{ background: rc.bg, color: rc.color }}>
                {rc.icon} {rc.label}
              </span>
            </div>
          </div>

          <div className="dtb-sep" />

          <button className="dtb-signout-full" onClick={logout}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/>
              <polyline points="16 17 21 12 16 7"/>
              <line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
            Sign Out
          </button>

          <button className="dtb-signout-icon" onClick={logout} aria-label="Sign out">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/>
              <polyline points="16 17 21 12 16 7"/>
              <line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
          </button>
        </div>
      </header>
    </>
  )
}
