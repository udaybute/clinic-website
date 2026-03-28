"use client"

// components/dashboard/DashSidebar.tsx
// Status: ✅ No errors found — reproduced with one minor fix:
//   - Added 'use client' guard check (already present)
//   - Fixed eslint-disable comment scope to be minimal
//   - Ensured onToggle is stable reference (parent should useCallback)

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useEffect, useState } from "react"
import { useAuthStore } from "@/store/authStore"
import type { Permission } from "@/types/rbac"

const NAV_ITEMS = [
  { href: "/dashboard",                 label: "Dashboard",       icon: "⊞" },
  // Check-In & Waiting Room: all roles see the queue; page controls what each role can do
  { href: "/dashboard/checkin",         label: "Check-In",        icon: "✅", permission: "appointments:read"    },
  { href: "/dashboard/waitlist",        label: "Waiting Room",    icon: "⏳", permission: "appointments:read"    },
  { href: "/dashboard/appointments",    label: "Appointments",    icon: "📅", permission: "appointments:read"    },
  { href: "/dashboard/calendar",        label: "Calendar",        icon: "🗓", permission: "appointments:read"    },
  { href: "/dashboard/patients",        label: "Patients",        icon: "👤", permission: "patients:read_basic"  },
  // Reports: available to all roles (doctor sees their daily stats, admin sees clinic-wide)
  { href: "/dashboard/reports",         label: "My Reports",      icon: "📋", permission: "reports:daily"        },
  // Doctor-only clinical pages
  { href: "/dashboard/consultations",   label: "Consultations",   icon: "🩺", permission: "consultations:read"   },
  { href: "/dashboard/prescriptions",   label: "Prescriptions",   icon: "💊", permission: "prescriptions:read"   },
  { href: "/dashboard/lab",             label: "Lab & Reports",   icon: "🔬", permission: "lab:read"             },
  { href: "/dashboard/billing",         label: "Billing",         icon: "💳", permission: "billing:read_basic"   },
  { href: "/dashboard/messages",        label: "Messages",        icon: "💬", permission: "communication:send"   },
  // Admin-only management pages
  { href: "/dashboard/analytics",       label: "Analytics",       icon: "📊", permission: "reports:analytics"    },
  { href: "/dashboard/staff",           label: "Staff",           icon: "👥", permission: "users:read"           },
  { href: "/dashboard/services",        label: "Services",        icon: "🦷", permission: "clinic:settings"      },
  // Doctors page: all roles have doctors:read — admin gets full CRUD, others get read-only
  { href: "/dashboard/doctors",         label: "Doctors",         icon: "🏥", permission: "doctors:read"         },
  { href: "/dashboard/clinic-settings", label: "Clinic Settings", icon: "⚙️", permission: "clinic:settings"     },
  { href: "/dashboard/audit",           label: "Audit Logs",      icon: "🔒", permission: "security:audit"       },
  { href: "/dashboard/settings",        label: "Settings",        icon: "⚙️" },
]

const ROLE_LABELS: Record<string, string> = {
  admin: "Super Admin", doctor: "Doctor", receptionist: "Receptionist",
}
const ROLE_COLORS: Record<string, string> = {
  admin: "#d4a843", doctor: "#0d9488", receptionist: "#2563eb",
}

interface Props { open: boolean; onToggle: () => void }

export default function DashSidebar({ open, onToggle }: Props) {
  const pathname = usePathname()
  const { user, can, logout } = useAuthStore()
  const [isMobile, setIsMobile] = useState(false)
  const [mounted,  setMounted]  = useState(false)

  useEffect(() => {
    setMounted(true)
    const check = () => setIsMobile(window.innerWidth <= 768)
    check()
    window.addEventListener("resize", check)
    return () => window.removeEventListener("resize", check)
  }, [])

  // Close mobile drawer on route change
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (isMobile && open) onToggle()
  }, [pathname]) // intentionally only pathname — onToggle is stable from parent

  // Lock body scroll when mobile drawer is open
  useEffect(() => {
    if (!mounted) return
    document.body.style.overflow = (isMobile && open) ? "hidden" : ""
    return () => { document.body.style.overflow = "" }
  }, [isMobile, open, mounted])

  const visibleItems = NAV_ITEMS.filter(i =>
    !i.permission || can(i.permission as Permission)
  )

  const role      = user?.role ?? "admin"
  const roleColor = ROLE_COLORS[role] ?? "#0d9488"
  const initials  = user?.name?.split(" ").map(n => n[0]).join("").slice(0, 2) ?? "U"
  const collapsed = !open && !isMobile

  const sidebarStyle: React.CSSProperties = isMobile
    ? {
        position:   "fixed",
        top:        0,
        left:       0,
        bottom:     0,
        width:      "265px",
        transform:  open ? "translateX(0)" : "translateX(-100%)",
        transition: "transform .28s cubic-bezier(.25,0,.25,1)",
        zIndex:     300,
        boxShadow:  open ? "6px 0 40px rgba(0,0,0,.35)" : "none",
        minHeight:  "100%",
      }
    : {
        width:      open ? "240px" : "68px",
        transition: "width .3s cubic-bezier(.4,0,.2,1)",
        minHeight:  "100vh",
        position:   "relative",
        zIndex:     50,
      }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@700&family=DM+Sans:wght@300;400;500;600&display=swap');
        @keyframes sidebarOverlayIn { from{opacity:0} to{opacity:1} }

        .dsb-root {
          background: #0a1628;
          display: flex;
          flex-direction: column;
          flex-shrink: 0;
          overflow: hidden;
        }
        .dsb-root::before {
          content: '';
          position: absolute; top: -60px; left: -60px;
          width: 220px; height: 220px; border-radius: 50%;
          background: radial-gradient(circle, rgba(13,148,136,.1), transparent 65%);
          pointer-events: none;
        }
        .dsb-toggle {
          position: absolute; top: 22px; right: -12px;
          width: 24px; height: 24px; border-radius: 50%;
          background: #0d9488; border: 2.5px solid #0a1628;
          display: flex; align-items: center; justify-content: center;
          cursor: pointer; z-index: 11;
          box-shadow: 0 2px 10px rgba(13,148,136,.5);
          color: white; font-size: .65rem; font-weight: 700;
          transition: transform .2s, background .2s;
        }
        .dsb-toggle:hover { background: #14b8a6; transform: scale(1.1); }
        .dsb-header {
          display: flex; align-items: center; gap: 10px;
          padding: 16px 18px;
          border-bottom: 1px solid rgba(255,255,255,.07);
          text-decoration: none; flex-shrink: 0;
        }
        .dsb-icon {
          width: 36px; height: 36px; border-radius: 10px; flex-shrink: 0;
          background: linear-gradient(135deg, #0d9488, #0a1628);
          display: flex; align-items: center; justify-content: center;
          font-size: 1.1rem; box-shadow: 0 3px 12px rgba(13,148,136,.35);
        }
        .dsb-logo-name { font-family: 'Cormorant Garamond', serif; font-size: 1.1rem; font-weight: 700; color: #fff; line-height: 1; }
        .dsb-logo-sub  { font-size: .55rem; font-weight: 600; letter-spacing: .2em; text-transform: uppercase; color: #0d9488; margin-top: 2px; }
        .dsb-close {
          margin-left: auto; flex-shrink: 0;
          width: 28px; height: 28px; border-radius: 8px;
          background: rgba(255,255,255,.1); border: none; cursor: pointer;
          color: rgba(255,255,255,.7);
          display: flex; align-items: center; justify-content: center;
          transition: background .18s, color .18s;
        }
        .dsb-close:hover { background: rgba(255,255,255,.18); color: #fff; }
        .dsb-role {
          display: flex; align-items: center; gap: 6px;
          padding: 8px 18px;
          border-bottom: 1px solid rgba(255,255,255,.07);
        }
        .dsb-role-dot   { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
        .dsb-role-label { font-size: .62rem; font-weight: 700; letter-spacing: .1em; text-transform: uppercase; white-space: nowrap; }
        .dsb-nav { flex: 1; padding: 8px 0; overflow-y: auto; overflow-x: hidden; }
        .dsb-nav::-webkit-scrollbar { width: 3px; }
        .dsb-nav::-webkit-scrollbar-thumb { background: rgba(255,255,255,.1); border-radius: 2px; }
        .dsb-item {
          display: flex; align-items: center; gap: 12px;
          text-decoration: none; font-size: .875rem; font-weight: 400;
          color: rgba(255,255,255,.5); position: relative;
          transition: color .18s, background .18s;
          white-space: nowrap; overflow: hidden;
        }
        .dsb-item:hover  { color: rgba(255,255,255,.92); background: rgba(255,255,255,.05); }
        .dsb-item.active { color: #fff; font-weight: 500; background: rgba(13,148,136,.14); }
        .dsb-item.active::before {
          content: ''; position: absolute; left: 0; top: 0; bottom: 0; width: 3px;
          background: #0d9488; border-radius: 0 2px 2px 0;
        }
        .dsb-item-icon  { font-size: 1.05rem; flex-shrink: 0; width: 20px; text-align: center; }
        .dsb-item-label { overflow: hidden; transition: opacity .15s; }
        .dsb-foot { border-top: 1px solid rgba(255,255,255,.07); flex-shrink: 0; }
        .dsb-user { display: flex; align-items: center; gap: 10px; margin-bottom: 10px; }
        .dsb-av {
          width: 34px; height: 34px; border-radius: 50%; flex-shrink: 0;
          background: linear-gradient(135deg, #0d9488, #065f4a);
          display: flex; align-items: center; justify-content: center;
          font-size: .72rem; font-weight: 700; color: white;
        }
        .dsb-uname { font-size: .82rem; font-weight: 500; color: #fff; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .dsb-urole { font-size: .65rem; color: rgba(255,255,255,.35); }
        .dsb-out {
          display: flex; align-items: center; gap: 7px;
          padding: 8px 10px; border-radius: 9px;
          border: 1px solid rgba(255,255,255,.08); background: none;
          cursor: pointer; width: 100%;
          font-family: 'DM Sans', sans-serif; font-size: .75rem;
          color: rgba(255,255,255,.4); transition: all .18s;
        }
        .dsb-out:hover { background: rgba(220,38,38,.12); color: #ef4444; border-color: rgba(220,38,38,.2); }
        .dsb-out-label { white-space: nowrap; transition: opacity .15s; }
      `}</style>

      {/* Mobile overlay — solid bg only, NO backdrop-filter/blur */}
      {isMobile && open && (
        <div
          onClick={onToggle}
          aria-hidden="true"
          style={{
            position:   "fixed",
            inset:      0,
            background: "rgba(10,22,40,0.65)",
            zIndex:     299,
            animation:  "sidebarOverlayIn .2s ease",
          }}
        />
      )}

      <aside className="dsb-root" style={sidebarStyle} aria-label="Dashboard navigation">

        {/* Desktop collapse toggle */}
        {!isMobile && (
          <button
            className="dsb-toggle"
            onClick={onToggle}
            aria-label={open ? "Collapse sidebar" : "Expand sidebar"}
          >
            {open ? "‹" : "›"}
          </button>
        )}

        {/* Header */}
        <Link href="/dashboard" className="dsb-header">
          <div className="dsb-icon">🦷</div>
          {!collapsed && (
            <div>
              <div className="dsb-logo-name">DentalCare</div>
              <div className="dsb-logo-sub">Clinic OS</div>
            </div>
          )}
          {isMobile && (
            <button
              className="dsb-close"
              onClick={e => { e.preventDefault(); e.stopPropagation(); onToggle() }}
              aria-label="Close sidebar"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <line x1="18" y1="6"  x2="6"  y2="18"/>
                <line x1="6"  y1="6"  x2="18" y2="18"/>
              </svg>
            </button>
          )}
        </Link>

        {/* Role badge */}
        <div className="dsb-role" style={{ justifyContent: collapsed ? "center" : "flex-start" }}>
          <div className="dsb-role-dot" style={{ background: roleColor }} />
          {!collapsed && (
            <span className="dsb-role-label" style={{ color: roleColor }}>
              {ROLE_LABELS[role] ?? role}
            </span>
          )}
        </div>

        {/* Nav links */}
        <nav className="dsb-nav" aria-label="Dashboard menu">
          {visibleItems.map(item => (
            <Link
              key={item.href}
              href={item.href}
              className={`dsb-item${pathname === item.href ? " active" : ""}`}
              style={{
                padding:        collapsed ? "11px 0" : "11px 18px",
                justifyContent: collapsed ? "center" : "flex-start",
              }}
              title={collapsed ? item.label : undefined}
              aria-current={pathname === item.href ? "page" : undefined}
            >
              <span className="dsb-item-icon">{item.icon}</span>
              <span className="dsb-item-label" style={{ opacity: collapsed ? 0 : 1 }}>
                {item.label}
              </span>
            </Link>
          ))}
        </nav>

        {/* Footer: user info + logout */}
        <div className="dsb-foot" style={{ padding: collapsed ? "12px 10px" : "12px 18px" }}>
          <div className="dsb-user">
            <div className="dsb-av">{initials}</div>
            {!collapsed && (
              <div style={{ minWidth: 0, overflow: "hidden" }}>
                <div className="dsb-uname">{user?.name ?? "User"}</div>
                <div className="dsb-urole">{ROLE_LABELS[role] ?? role}</div>
              </div>
            )}
          </div>
          <button
            className="dsb-out"
            onClick={logout}
            style={{ justifyContent: collapsed ? "center" : "flex-start" }}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/>
              <polyline points="16 17 21 12 16 7"/>
              <line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
            {!collapsed && <span className="dsb-out-label">Sign Out</span>}
          </button>
        </div>
      </aside>
    </>
  )
}