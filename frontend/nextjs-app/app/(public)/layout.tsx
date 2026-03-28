// app/(public)/layout.tsx
// Server Component — NO "use client" here.
// WhatsApp hover handled inside WhatsAppButton (client component).
// ChatWidget is already "use client" so it renders fine here.

import TopBar         from "@/components/layout/TopBar"
import Navbar         from "@/components/layout/Navbar"
import Footer         from "@/components/layout/Footer"
import ChatWidget     from "@/components/chatbot/ChatWidget"
import WhatsAppButton from "@/components/chatbot/WhatsAppButton"

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <TopBar />
      <Navbar />
      <main id="main-content">
        {children}
      </main>
      <Footer />

      {/*
        WhatsAppButton: bottom 96px (sits above the chat trigger)
        ChatWidget:     bottom 24px (the floating AI chat button)
        Both are 'use client' components — safe to import in a Server layout.
      */}
      <ChatWidget />
      <WhatsAppButton />
    </>
  )
}