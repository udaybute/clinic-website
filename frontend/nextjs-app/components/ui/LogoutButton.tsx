"use client"

// components/ui/LogoutButton.tsx
// Use this anywhere in the dashboard to log out:
//
//   import LogoutButton from "@/components/ui/LogoutButton"
//   <LogoutButton />                    ← default style
//   <LogoutButton variant="icon" />     ← icon only
//   <LogoutButton variant="minimal" />  ← text link style

import { useAuthStore } from "@/store/authStore"

interface Props {
  variant?: "default" | "icon" | "minimal"
  className?: string
}

export default function LogoutButton({ variant = "default", className = "" }: Props) {
  const { logout, user } = useAuthStore()

  const ROLE_COLORS: Record<string, string> = {
    admin:        "#d4a843",
    doctor:       "#0d9488",
    receptionist: "#2563eb",
  }
  const roleColor = ROLE_COLORS[user?.role ?? "admin"] ?? "#0d9488"

  if (variant === "icon") {
    return (
      <button
        onClick={logout}
        title="Sign Out"
        aria-label="Sign Out"
        style={{
          background: "none", border: "none", cursor: "pointer",
          padding: "8px", borderRadius: "8px", color: "#94a3b8",
          display: "flex", alignItems: "center", justifyContent: "center",
          transition: "color .18s, background .18s",
        }}
        onMouseEnter={e => {
          (e.currentTarget as HTMLButtonElement).style.color = "#ef4444"
          ;(e.currentTarget as HTMLButtonElement).style.background = "rgba(220,38,38,.08)"
        }}
        onMouseLeave={e => {
          (e.currentTarget as HTMLButtonElement).style.color = "#94a3b8"
          ;(e.currentTarget as HTMLButtonElement).style.background = "none"
        }}
        className={className}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/>
          <polyline points="16 17 21 12 16 7"/>
          <line x1="21" y1="12" x2="9" y2="12"/>
        </svg>
      </button>
    )
  }

  if (variant === "minimal") {
    return (
      <button
        onClick={logout}
        style={{
          background: "none", border: "none", cursor: "pointer",
          fontFamily: "'DM Sans', sans-serif", fontSize: ".82rem",
          color: "#94a3b8", padding: "4px 0", display: "flex",
          alignItems: "center", gap: "6px", transition: "color .18s",
        }}
        onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.color = "#ef4444"}
        onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.color = "#94a3b8"}
        className={className}
      >
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/>
          <polyline points="16 17 21 12 16 7"/>
          <line x1="21" y1="12" x2="9" y2="12"/>
        </svg>
        Sign Out
      </button>
    )
  }

  // Default variant — full button
  return (
    <>
      <style>{`
        .lb-btn {
          display: inline-flex; align-items: center; gap: 8px;
          padding: 10px 20px; border-radius: 50px; border: none; cursor: pointer;
          font-family: 'DM Sans', sans-serif; font-size: .84rem; font-weight: 500;
          background: rgba(220,38,38,.08); color: #ef4444;
          border: 1.5px solid rgba(220,38,38,.2);
          transition: background .18s, box-shadow .18s, transform .18s;
        }
        .lb-btn:hover {
          background: rgba(220,38,38,.14);
          box-shadow: 0 4px 14px rgba(220,38,38,.15);
          transform: translateY(-1px);
        }
      `}</style>
      <button onClick={logout} className={`lb-btn ${className}`}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/>
          <polyline points="16 17 21 12 16 7"/>
          <line x1="21" y1="12" x2="9" y2="12"/>
        </svg>
        Sign Out
      </button>
    </>
  )
}