"use client"

// app/dashboard/messages/page.tsx
// Internal messaging hub — send notes between staff.
// Currently a UI scaffold. Messages API (POST /api/messages) is a future backend feature.

import { useState } from "react"
import { useAuthStore } from "@/store/authStore"

interface Message {
  id:        string
  from:      string
  fromRole:  string
  subject:   string
  body:      string
  time:      string
  read:      boolean
  priority:  "normal" | "urgent"
}

// Demo messages — replace with API.get('/messages') when backend is ready
const DEMO: Message[] = [
  { id: "1", from: "Dr. Sharma",    fromRole: "doctor",       subject: "Patient follow-up needed",      body: "Mrs. Patel (apt #1234) needs a follow-up call regarding her root canal post-op pain. Please schedule ASAP.",                                     time: "10:32 AM", read: false, priority: "urgent" },
  { id: "2", from: "Admin",         fromRole: "admin",        subject: "Schedule update for next week",  body: "Please note the clinic will be closed on Friday for maintenance. All appointments have been rescheduled by reception.",                          time: "9:15 AM",  read: false, priority: "normal" },
  { id: "3", from: "Priya (Recept)", fromRole: "receptionist", subject: "New walk-in patient registered",  body: "Walk-in patient Mr. Rajan Kumar (age 45) has been registered and is waiting in room 2. No prior records.",                                      time: "Yesterday", read: true, priority: "normal" },
  { id: "4", from: "Dr. Mehta",     fromRole: "doctor",       subject: "Lab results for Patient #892",   body: "OPG X-ray results are back for patient Aisha Begum. Results show early signs of impacted wisdom tooth. Will need extraction discussion.",          time: "Yesterday", read: true, priority: "normal" },
]

const ROLE_COLORS: Record<string, string> = {
  admin: "#d4a843", doctor: "#0d9488", receptionist: "#2563eb",
}

export default function MessagesPage() {
  const { user } = useAuthStore()
  const [selected, setSelected] = useState<Message | null>(DEMO[0])
  const [messages, setMessages] = useState<Message[]>(DEMO)
  const [compose,  setCompose]  = useState(false)
  const [to,       setTo]       = useState("")
  const [subject,  setSubject]  = useState("")
  const [body,     setBody]     = useState("")
  const [sending,  setSending]  = useState(false)
  const [sent,     setSent]     = useState("")

  const unread = messages.filter(m => !m.read).length

  const selectMsg = (m: Message) => {
    setMessages(ms => ms.map(x => x.id === m.id ? { ...x, read: true } : x))
    setSelected({ ...m, read: true })
    setCompose(false)
  }

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!to.trim() || !subject.trim() || !body.trim()) return
    setSending(true)
    // TODO: replace with API.post('/messages', { to, subject, body }) when endpoint is ready
    await new Promise(r => setTimeout(r, 700))
    setSent("Message sent successfully!")
    setTo(""); setSubject(""); setBody("")
    setSending(false)
    setTimeout(() => { setSent(""); setCompose(false) }, 2000)
  }

  const inp: React.CSSProperties = {
    width: "100%", padding: "10px 13px", borderRadius: 10,
    border: "1.5px solid rgba(10,22,40,.1)", fontFamily: "'DM Sans',sans-serif",
    fontSize: ".87rem", color: "#0a1628", background: "#fff", outline: "none",
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@700&family=DM+Sans:wght@300;400;500;600&display=swap');
        .msg-item { cursor:pointer; transition:background .15s; border-radius:12px; }
        .msg-item:hover { background:rgba(13,148,136,.05) !important; }
        .msg-item.active { background:rgba(13,148,136,.09) !important; }
        .msg-header { display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:10px; margin-bottom:20px; }
        .msg-compose-btn { flex-shrink:0; }
        .msg-layout { display:grid; grid-template-columns:300px 1fr; gap:16px; min-height:520px; }
        @media(max-width:768px) { .msg-layout { grid-template-columns:1fr; } .msg-panel-right { display:none; } .msg-panel-right.visible { display:flex; } }
        @media(max-width:480px) { .msg-header { flex-direction:column; align-items:stretch; } .msg-compose-btn { width:100%; justify-content:center !important; } }
      `}</style>

      <div style={{ fontFamily: "'DM Sans',sans-serif", maxWidth: 1100 }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
          <div>
            <h1 style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: "1.9rem", fontWeight: 700, color: "#0a1628", margin: 0 }}>
              Messages {unread > 0 && <span style={{ fontSize: ".9rem", fontWeight: 600, background: "#dc2626", color: "#fff", borderRadius: 20, padding: "2px 9px", verticalAlign: "middle" }}>{unread}</span>}
            </h1>
            <p style={{ fontSize: ".84rem", color: "#64748b", margin: "4px 0 0" }}>Internal staff communications</p>
          </div>
          <button
            onClick={() => { setCompose(true); setSelected(null) }}
            style={{ display: "flex", alignItems: "center", gap: 7, padding: "9px 20px", borderRadius: 9999, border: "none", background: "linear-gradient(135deg,#0d9488,#065f4a)", color: "#fff", fontFamily: "'DM Sans',sans-serif", fontSize: ".87rem", fontWeight: 600, cursor: "pointer", boxShadow: "0 3px 16px rgba(13,148,136,.3)" }}>
            ✏️ Compose
          </button>
        </div>

        {/* Notice banner — backend not yet implemented */}
        <div style={{ padding: "10px 16px", borderRadius: 10, background: "rgba(245,158,11,.07)", border: "1px solid rgba(245,158,11,.2)", fontSize: ".8rem", color: "#d97706", marginBottom: 20 }}>
          💬 <strong>Coming soon:</strong> Full messaging API is under development. Messages shown below are demo data. Compose will be functional once <code>/api/messages</code> is deployed.
        </div>

        {/* Two-panel layout */}
        <div className="msg-layout">
          {/* Left — message list */}
          <div style={{ background: "#fff", borderRadius: 16, border: "1px solid rgba(10,22,40,.07)", padding: "12px 10px", display: "flex", flexDirection: "column", gap: 4 }}>
            {messages.map(m => (
              <div
                key={m.id}
                className={`msg-item${selected?.id === m.id ? " active" : ""}`}
                onClick={() => selectMsg(m)}
                style={{ padding: "12px 12px", background: selected?.id === m.id ? undefined : "transparent" }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                  <div style={{ width: 32, height: 32, borderRadius: "50%", background: `linear-gradient(135deg, ${ROLE_COLORS[m.fromRole] ?? "#94a3b8"}, #0a1628)`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: ".68rem", fontWeight: 700, color: "#fff", flexShrink: 0 }}>
                    {m.from.split(" ").map(n => n[0]).join("").slice(0, 2)}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <span style={{ fontSize: ".82rem", fontWeight: m.read ? 400 : 700, color: "#0a1628", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{m.from}</span>
                      <span style={{ fontSize: ".68rem", color: "#94a3b8", flexShrink: 0, marginLeft: 6 }}>{m.time}</span>
                    </div>
                    <div style={{ fontSize: ".78rem", color: m.read ? "#94a3b8" : "#374151", fontWeight: m.read ? 400 : 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {m.priority === "urgent" && <span style={{ color: "#dc2626", marginRight: 4 }}>🔴</span>}
                      {m.subject}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Right — message detail or compose */}
          <div style={{ background: "#fff", borderRadius: 16, border: "1px solid rgba(10,22,40,.07)", padding: "24px 28px" }}>
            {compose ? (
              <form onSubmit={handleSend}>
                <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: "1.3rem", fontWeight: 700, color: "#0a1628", marginBottom: 20 }}>New Message</div>
                {sent && (
                  <div style={{ padding: "10px 16px", borderRadius: 10, background: "rgba(13,148,136,.07)", border: "1px solid rgba(13,148,136,.2)", color: "#0d9488", fontSize: ".84rem", marginBottom: 16 }}>{sent}</div>
                )}
                <div style={{ marginBottom: 14 }}>
                  <label style={{ fontSize: ".68rem", fontWeight: 600, letterSpacing: ".1em", textTransform: "uppercase", color: "#94a3b8", display: "block", marginBottom: 5 }}>To</label>
                  <input style={inp} placeholder="Staff name or email" value={to} onChange={e => setTo(e.target.value)} required />
                </div>
                <div style={{ marginBottom: 14 }}>
                  <label style={{ fontSize: ".68rem", fontWeight: 600, letterSpacing: ".1em", textTransform: "uppercase", color: "#94a3b8", display: "block", marginBottom: 5 }}>Subject</label>
                  <input style={inp} placeholder="Message subject" value={subject} onChange={e => setSubject(e.target.value)} required />
                </div>
                <div style={{ marginBottom: 20 }}>
                  <label style={{ fontSize: ".68rem", fontWeight: 600, letterSpacing: ".1em", textTransform: "uppercase", color: "#94a3b8", display: "block", marginBottom: 5 }}>Message</label>
                  <textarea style={{ ...inp, minHeight: 160, resize: "vertical" }} placeholder="Write your message…" value={body} onChange={e => setBody(e.target.value)} required />
                </div>
                <div style={{ display: "flex", gap: 10 }}>
                  <button type="submit" disabled={sending} style={{ padding: "10px 24px", borderRadius: 9999, border: "none", background: "linear-gradient(135deg,#0d9488,#065f4a)", color: "#fff", fontFamily: "'DM Sans',sans-serif", fontSize: ".87rem", fontWeight: 600, cursor: sending ? "not-allowed" : "pointer", opacity: sending ? .7 : 1 }}>
                    {sending ? "Sending…" : "Send Message"}
                  </button>
                  <button type="button" onClick={() => setCompose(false)} style={{ padding: "10px 18px", borderRadius: 9999, border: "1.5px solid rgba(10,22,40,.1)", background: "none", color: "#64748b", fontFamily: "'DM Sans',sans-serif", fontSize: ".87rem", cursor: "pointer" }}>
                    Cancel
                  </button>
                </div>
              </form>
            ) : selected ? (
              <>
                <div style={{ display: "flex", alignItems: "flex-start", gap: 16, marginBottom: 20, paddingBottom: 20, borderBottom: "1px solid rgba(10,22,40,.07)" }}>
                  <div style={{ width: 46, height: 46, borderRadius: "50%", background: `linear-gradient(135deg, ${ROLE_COLORS[selected.fromRole] ?? "#94a3b8"}, #0a1628)`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: ".78rem", fontWeight: 700, color: "#fff", flexShrink: 0 }}>
                    {selected.from.split(" ").map(n => n[0]).join("").slice(0, 2)}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
                      <div>
                        <span style={{ fontSize: ".95rem", fontWeight: 600, color: "#0a1628" }}>{selected.from}</span>
                        <span style={{ marginLeft: 10, padding: "2px 8px", borderRadius: 20, fontSize: ".68rem", fontWeight: 600, background: `${ROLE_COLORS[selected.fromRole] ?? "#94a3b8"}15`, color: ROLE_COLORS[selected.fromRole] ?? "#94a3b8" }}>
                          {selected.fromRole}
                        </span>
                      </div>
                      <span style={{ fontSize: ".78rem", color: "#94a3b8" }}>{selected.time}</span>
                    </div>
                    <div style={{ marginTop: 4, fontSize: ".9rem", fontWeight: 600, color: "#0a1628" }}>
                      {selected.priority === "urgent" && <span style={{ color: "#dc2626", marginRight: 6 }}>🔴 URGENT</span>}
                      {selected.subject}
                    </div>
                  </div>
                </div>
                <p style={{ fontSize: ".9rem", color: "#374151", lineHeight: 1.7, whiteSpace: "pre-wrap" }}>{selected.body}</p>
                <div style={{ marginTop: 24, paddingTop: 20, borderTop: "1px solid rgba(10,22,40,.07)" }}>
                  <button
                    onClick={() => { setCompose(true); setTo(selected.from); setSubject(`Re: ${selected.subject}`) }}
                    style={{ padding: "9px 20px", borderRadius: 9999, border: "1.5px solid rgba(13,148,136,.3)", background: "none", color: "#0d9488", fontFamily: "'DM Sans',sans-serif", fontSize: ".84rem", fontWeight: 600, cursor: "pointer" }}>
                    ↩ Reply
                  </button>
                </div>
              </>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", minHeight: 300, gap: 12, color: "#94a3b8" }}>
                <div style={{ fontSize: "2.5rem" }}>💬</div>
                <p style={{ fontSize: ".9rem" }}>Select a message to read</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
