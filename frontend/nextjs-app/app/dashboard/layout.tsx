"use client"

// app/dashboard/layout.tsx
// FIX 5: Public Navbar (Home/Services/Doctors) must NOT appear inside the dashboard.
// The dashboard has its own DashSidebar + DashTopbar — that's all it needs.

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuthStore } from "@/store/authStore"
import DashSidebar  from "@/components/dashboard/DashSidebar"
import DashTopbar   from "@/components/dashboard/DashTopbar"
import Breadcrumb   from "@/components/dashboard/Breadcrumb"

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [mounted,     setMounted]     = useState(false)
  const { isLoggedIn } = useAuthStore()
  const router = useRouter()

  useEffect(() => {
    setMounted(true)
    setSidebarOpen(window.innerWidth > 768)
  }, [])

  // Guard: only redirect after mount so Zustand has time to hydrate from localStorage
  useEffect(() => {
    if (mounted && !isLoggedIn) router.replace("/login")
  }, [isLoggedIn, mounted, router])

  if (!mounted || !isLoggedIn) return null

  return (
    <>
      <style>{`
        /* FIX 5: Override the root layout to hide public Navbar inside dashboard */
        /* The public Navbar is rendered in app/layout.tsx — hide it here */
        body:has(.dash-shell) > header,
        body:has(.dash-shell) .nb-root,
        body:has(.dash-shell) footer {
          display: none !important;
        }

        .dash-shell {
          display: flex;
          min-height: 100vh;
          background: #f0f2f5;
          font-family: 'DM Sans', sans-serif;
        }
        .dash-main {
          flex: 1;
          display: flex;
          flex-direction: column;
          min-width: 0;
          overflow: hidden;
        }
        .dash-content {
          flex: 1;
          padding: 24px 28px;
          overflow-y: auto;
        }
        @media (max-width: 768px) {
          .dash-content { padding: 16px; }
          .dash-shell > aside { display: none; }
        }
      `}</style>

      <div className="dash-shell">
        <DashSidebar open={sidebarOpen} onToggle={() => setSidebarOpen(v => !v)} />
        <div className="dash-main">
          <DashTopbar onMenuClick={() => setSidebarOpen(v => !v)} />
          <div className="dash-content">
            <Breadcrumb />
            {children}
          </div>
        </div>
      </div>
    </>
  )
}