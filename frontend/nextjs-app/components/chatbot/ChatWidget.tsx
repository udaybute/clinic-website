"use client"

// components/chatbot/ChatWidget.tsx
// AI receptionist chat widget for DentalCare Smile Studio
// API: POST /api/ai/chat  →  { success: true, data: { reply: string, sessionId: string } }
// Design: CSS-in-JSX only — NO Tailwind. Fonts: DM Sans. Colors: #0d9488 teal, #0a1628 navy.

import { useState, useEffect, useRef, useCallback } from "react"
import API from "@/lib/api"

// ── Types ─────────────────────────────────────────────────────────────────────
interface Message {
  id:        string
  role:      "user" | "bot"
  text:      string
  timestamp: Date
  error?:    boolean
}

// ── Constants ─────────────────────────────────────────────────────────────────
const PHONE          = "8668296156"
const PHONE_DISPLAY  = "+91 86682 96156"
const WA_NUMBER      = "918668296156"

const QUICK_REPLIES = [
  "Book an appointment",
  "What are your timings?",
  "Cost of teeth whitening?",
  "Do you accept insurance?",
]

const WELCOME: Message = {
  id:        "welcome",
  role:      "bot",
  text:      "Hi there! 👋 I'm the DentalCare AI assistant. I can help you book appointments, answer questions about our services, pricing, and doctors. How can I help you today?",
  timestamp: new Date(),
}

const uid = () => Math.random().toString(36).slice(2)
const fmt = (d: Date) => d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })

// ── Typing dots ───────────────────────────────────────────────────────────────
function TypingDots() {
  return (
    <div style={{ display:"flex", alignItems:"center", gap:4, padding:"10px 14px" }}>
      {[0,1,2].map(i => (
        <span key={i} style={{
          width:7, height:7, borderRadius:"50%",
          background:"rgba(13,148,136,.5)",
          animation:`cwDot 1.2s ease-in-out ${i*0.18}s infinite`,
          display:"inline-block",
        }} />
      ))}
    </div>
  )
}

// ── Message bubble ────────────────────────────────────────────────────────────
function Bubble({ msg }: { msg: Message }) {
  const isUser = msg.role === "user"
  return (
    <div style={{
      display:"flex", flexDirection: isUser ? "row-reverse" : "row",
      alignItems:"flex-end", gap:8,
      animation:"cwFadeUp .28s ease both",
    }}>
      {!isUser && (
        <div style={{
          width:30, height:30, borderRadius:"50%", flexShrink:0,
          background:"linear-gradient(135deg,#0d9488,#0a1628)",
          display:"flex", alignItems:"center", justifyContent:"center",
          fontSize:".85rem", boxShadow:"0 2px 8px rgba(13,148,136,.3)",
        }}>🦷</div>
      )}
      <div style={{
        maxWidth:"78%", display:"flex", flexDirection:"column",
        gap:3, alignItems: isUser ? "flex-end" : "flex-start",
      }}>
        <div style={{
          padding:"10px 14px",
          borderRadius: isUser ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
          background: isUser
            ? "linear-gradient(135deg,#0d9488,#065f4a)"
            : msg.error ? "rgba(220,38,38,.08)" : "rgba(10,22,40,.06)",
          color: isUser ? "#fff" : msg.error ? "#dc2626" : "#0a1628",
          fontSize:".84rem", lineHeight:1.55,
          border: msg.error ? "1px solid rgba(220,38,38,.2)" : "none",
          boxShadow: isUser ? "0 2px 12px rgba(13,148,136,.25)" : "none",
          wordBreak: "break-word",
        }}>
          {msg.text}
        </div>
        <span style={{ fontSize:".62rem", color:"#94a3b8", padding:"0 4px" }}>
          {fmt(msg.timestamp)}
        </span>
      </div>
      {isUser && (
        <div style={{
          width:30, height:30, borderRadius:"50%", flexShrink:0,
          background:"linear-gradient(135deg,#0a1628,#1e3a5f)",
          display:"flex", alignItems:"center", justifyContent:"center",
          fontSize:".7rem", fontWeight:700, color:"#fff",
        }}>You</div>
      )}
    </div>
  )
}

// ── Main widget ───────────────────────────────────────────────────────────────
export default function ChatWidget() {
  const [open,      setOpen]      = useState(false)
  const [messages,  setMessages]  = useState<Message[]>([WELCOME])
  const [input,     setInput]     = useState("")
  const [loading,   setLoading]   = useState(false)
  const [unread,    setUnread]    = useState(0)
  const [showQuick, setShowQuick] = useState(true)
  const [sessionId, setSessionId] = useState<string | undefined>(undefined)

  const bodyRef  = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (bodyRef.current) bodyRef.current.scrollTop = bodyRef.current.scrollHeight
  }, [messages, loading])

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 120)
      setUnread(0)
    }
  }, [open])

  const send = useCallback(async (text: string) => {
    const trimmed = text.trim()
    if (!trimmed || loading) return

    setShowQuick(false)
    setInput("")
    setMessages(prev => [...prev, { id: uid(), role:"user", text: trimmed, timestamp: new Date() }])
    setLoading(true)

    try {
      // ── ROOT CAUSE FIX ────────────────────────────────────────────────────
      // lib/api.ts intercepts responses and auto-unwraps body.data when
      // body.success === true. So the backend MUST return:
      //   { success: true, data: { reply, sessionId } }
      // not { success: true, reply, sessionId } at the top level.
      //
      // After the interceptor runs, `res` here IS the unwrapped data object:
      //   { reply: string, sessionId: string }
      // ─────────────────────────────────────────────────────────────────────
      const data = await API.post("/ai/chat", { message: trimmed, sessionId }) as any

      // Handle both shapes: interceptor-unwrapped { reply, sessionId }
      // and raw axios response { data: { reply, sessionId } } just in case
      const reply     = data?.reply     ?? data?.data?.reply
      const newSessId = data?.sessionId ?? data?.data?.sessionId

      if (!reply) throw new Error("Empty reply from server")

      if (newSessId) setSessionId(newSessId)

      setMessages(prev => [...prev, {
        id:        uid(),
        role:      "bot",
        text:      reply,
        timestamp: new Date(),
      }])

      if (!open) setUnread(u => u + 1)

    } catch (err: any) {
      console.error("[ChatWidget] API error:", err?.message ?? err)
      setMessages(prev => [...prev, {
        id:        uid(),
        role:      "bot",
        text:      `Sorry, I'm having trouble connecting right now. Please call or WhatsApp us at ${PHONE_DISPLAY}.`,
        timestamp: new Date(),
        error:     true,
      }])
    } finally {
      setLoading(false)
    }
  }, [loading, open, sessionId])

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(input) }
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&display=swap');

        @keyframes cwFadeUp  { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
        @keyframes cwSlideUp { from{opacity:0;transform:translateY(20px) scale(.97)} to{opacity:1;transform:translateY(0) scale(1)} }
        @keyframes cwDot     { 0%,80%,100%{transform:scale(0.7);opacity:.4} 40%{transform:scale(1);opacity:1} }
        @keyframes cwPulse   { 0%,100%{box-shadow:0 6px 24px rgba(13,148,136,.45)} 50%{box-shadow:0 6px 32px rgba(13,148,136,.7)} }
        @keyframes cwPulseDot{ 0%,100%{opacity:1} 50%{opacity:.4} }

        .cw-widget { position:fixed; bottom:24px; right:24px; z-index:9990; font-family:'DM Sans',sans-serif; }

        .cw-trigger {
          width:58px; height:58px; border-radius:50%;
          background:linear-gradient(135deg,#0d9488,#0a1628);
          border:none; cursor:pointer;
          display:flex; align-items:center; justify-content:center;
          box-shadow:0 6px 24px rgba(13,148,136,.45);
          transition:transform .25s cubic-bezier(.34,1.56,.64,1);
          animation:cwPulse 3s ease-in-out infinite;
          position:relative;
        }
        .cw-trigger:hover { transform:scale(1.1); animation:none; box-shadow:0 10px 32px rgba(13,148,136,.6); }

        .cw-badge {
          position:absolute; top:-4px; right:-4px;
          background:#ef4444; color:#fff; font-size:.65rem; font-weight:700;
          width:20px; height:20px; border-radius:50%;
          display:flex; align-items:center; justify-content:center;
          border:2px solid #fff; animation:cwFadeUp .2s ease;
        }

        .cw-panel {
          position:absolute; bottom:70px; right:0;
          width:340px; height:520px; border-radius:20px;
          background:#fff; display:flex; flex-direction:column;
          box-shadow:0 24px 64px rgba(10,22,40,.18), 0 4px 16px rgba(10,22,40,.08);
          overflow:hidden; animation:cwSlideUp .28s cubic-bezier(.34,1.1,.64,1);
          border:1px solid rgba(10,22,40,.07);
        }
        @media(max-width:420px){
          .cw-panel { width:calc(100vw - 32px); right:-8px; }
        }

        .cw-header {
          padding:14px 16px; flex-shrink:0;
          background:linear-gradient(135deg,#0a1628 0%,#0f2240 100%);
          display:flex; align-items:center; gap:12px;
        }
        .cw-hav {
          width:40px; height:40px; border-radius:50%; flex-shrink:0;
          background:linear-gradient(135deg,#0d9488,#065f4a);
          display:flex; align-items:center; justify-content:center;
          font-size:1.1rem; box-shadow:0 0 0 3px rgba(13,148,136,.25);
        }
        .cw-hname { font-size:.9rem; font-weight:600; color:#fff; }
        .cw-hsub  { font-size:.7rem; color:rgba(255,255,255,.55); margin-top:2px; display:flex; align-items:center; gap:5px; }
        .cw-hdot  { width:6px; height:6px; border-radius:50%; background:#22c55e; animation:cwPulseDot 2s infinite; }
        .cw-hclose {
          margin-left:auto; width:28px; height:28px; border-radius:50%;
          border:none; cursor:pointer; background:rgba(255,255,255,.1);
          color:rgba(255,255,255,.7); display:flex; align-items:center; justify-content:center;
          transition:background .15s; flex-shrink:0;
        }
        .cw-hclose:hover { background:rgba(255,255,255,.2); color:#fff; }

        .cw-body {
          flex:1; overflow-y:auto; padding:16px;
          display:flex; flex-direction:column; gap:14px;
          scroll-behavior:smooth;
        }
        .cw-body::-webkit-scrollbar { width:3px; }
        .cw-body::-webkit-scrollbar-thumb { background:rgba(10,22,40,.1); border-radius:3px; }

        .cw-typing { display:flex; align-items:flex-end; gap:8px; animation:cwFadeUp .2s ease; }
        .cw-tav {
          width:30px; height:30px; border-radius:50%;
          background:linear-gradient(135deg,#0d9488,#0a1628);
          display:flex; align-items:center; justify-content:center;
          font-size:.85rem; flex-shrink:0;
        }
        .cw-tbubble { background:rgba(10,22,40,.06); border-radius:18px 18px 18px 4px; min-width:58px; }

        .cw-quick { display:flex; flex-wrap:wrap; gap:7px; padding:0 16px 10px; flex-shrink:0; }
        .cw-qbtn {
          padding:6px 13px; border-radius:50px;
          border:1.5px solid rgba(13,148,136,.25); background:rgba(13,148,136,.05);
          color:#0d9488; font-family:'DM Sans',sans-serif; font-size:.78rem; font-weight:500;
          cursor:pointer; white-space:nowrap;
          transition:background .15s, border-color .15s, transform .15s;
        }
        .cw-qbtn:hover:not(:disabled) { background:rgba(13,148,136,.12); border-color:#0d9488; transform:translateY(-1px); }
        .cw-qbtn:disabled { opacity:.45; cursor:not-allowed; }

        .cw-input-row {
          padding:12px 14px; border-top:1px solid rgba(10,22,40,.07);
          display:flex; align-items:center; gap:10px;
          flex-shrink:0; background:#fff;
        }
        .cw-input {
          flex:1; border:1.5px solid rgba(10,22,40,.1); outline:none;
          border-radius:50px; padding:10px 16px;
          font-family:'DM Sans',sans-serif; font-size:.84rem; color:#0a1628;
          background:rgba(10,22,40,.03); transition:border-color .2s, box-shadow .2s;
        }
        .cw-input:focus { border-color:#0d9488; box-shadow:0 0 0 3px rgba(13,148,136,.1); background:#fff; }
        .cw-input::placeholder { color:#94a3b8; }
        .cw-input:disabled { opacity:.55; }

        .cw-send {
          width:38px; height:38px; border-radius:50%; flex-shrink:0;
          border:none; cursor:pointer;
          background:linear-gradient(135deg,#0d9488,#065f4a);
          display:flex; align-items:center; justify-content:center;
          box-shadow:0 3px 12px rgba(13,148,136,.35);
          transition:transform .2s, opacity .2s;
        }
        .cw-send:hover:not(:disabled) { transform:scale(1.08); }
        .cw-send:disabled { opacity:.4; cursor:not-allowed; }

        .cw-footer {
          padding:5px 14px 9px; text-align:center;
          font-size:.62rem; color:#94a3b8; flex-shrink:0; background:#fff;
        }
      `}</style>

      <div className="cw-widget">

        {/* ── Trigger button ── */}
        <button
          className="cw-trigger"
          onClick={() => setOpen(o => !o)}
          aria-label={open ? "Close chat" : "Open AI chat assistant"}
        >
          {unread > 0 && !open && <span className="cw-badge">{unread}</span>}
          {open ? (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          ) : (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
            </svg>
          )}
        </button>

        {/* ── Chat panel ── */}
        {open && (
          <div className="cw-panel" role="dialog" aria-label="DentalCare AI Assistant">

            <div className="cw-header">
              <div className="cw-hav">🦷</div>
              <div>
                <div className="cw-hname">DentalCare AI</div>
                <div className="cw-hsub">
                  <span className="cw-hdot" />
                  Online · Usually replies instantly
                </div>
              </div>
              <button className="cw-hclose" onClick={() => setOpen(false)} aria-label="Close chat">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>

            <div className="cw-body" ref={bodyRef}>
              {messages.map(m => <Bubble key={m.id} msg={m} />)}
              {loading && (
                <div className="cw-typing">
                  <div className="cw-tav">🦷</div>
                  <div className="cw-tbubble"><TypingDots /></div>
                </div>
              )}
            </div>

            {showQuick && (
              <div className="cw-quick">
                {QUICK_REPLIES.map(q => (
                  <button key={q} className="cw-qbtn" disabled={loading}
                    onClick={() => { setInput(q); send(q) }}>
                    {q}
                  </button>
                ))}
              </div>
            )}

            <div className="cw-input-row">
              <input
                ref={inputRef}
                className="cw-input"
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKey}
                placeholder="Type a message…"
                disabled={loading}
                maxLength={500}
                aria-label="Type your message"
              />
              <button
                className="cw-send"
                onClick={() => send(input)}
                disabled={!input.trim() || loading}
                aria-label="Send message"
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round">
                  <line x1="22" y1="2" x2="11" y2="13"/>
                  <polygon points="22 2 15 22 11 13 2 9 22 2"/>
                </svg>
              </button>
            </div>

            <div className="cw-footer">🔒 Private conversation · Powered by DentalCare AI</div>
          </div>
        )}
      </div>
    </>
  )
}