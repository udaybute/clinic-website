"use client"

// app/(dashboard)/layout.tsx

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuthStore } from "@/store/authStore"
import DashSidebar from "@/components/dashboard/DashSidebar"
import DashTopbar  from "@/components/dashboard/DashTopbar"

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { isLoggedIn } = useAuthStore()
  const router = useRouter()
  const [mounted,     setMounted]     = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)

  useEffect(() => {
    setMounted(true)
    // Desktop → open, Mobile → closed
    setSidebarOpen(window.innerWidth > 768)

    const onResize = () => {
      if (window.innerWidth > 768) setSidebarOpen(true)
    }
    window.addEventListener("resize", onResize)
    return () => window.removeEventListener("resize", onResize)
  }, [])

  useEffect(() => {
    if (mounted && !isLoggedIn) router.replace("/login")
  }, [isLoggedIn, mounted, router])

  if (!mounted || !isLoggedIn) return null

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&display=swap');
        .dash-shell {
          display: flex; min-height: 100vh;
          background: #f0f2f5; font-family: 'DM Sans',sans-serif;
        }
        .dash-main {
          flex: 1; display: flex; flex-direction: column; min-width: 0;
        }
        .dash-content {
          flex: 1; padding: 24px 28px;
          overflow-y: auto; overflow-x: hidden;
        }
        @media (max-width: 768px) {
          .dash-content { padding: 16px; }
          /* NO "aside { display:none }" — sidebar hides via transform */
        }
      `}</style>

      <div className="dash-shell">
        <DashSidebar open={sidebarOpen} onToggle={() => setSidebarOpen(v => !v)} />
        <div className="dash-main">
          <DashTopbar onMenuClick={() => setSidebarOpen(v => !v)} />
          <div className="dash-content">{children}</div>
        </div>
      </div>
    </>
  )
}