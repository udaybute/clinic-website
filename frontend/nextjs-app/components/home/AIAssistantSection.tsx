"use client"

import Link from "next/link"
import { useEffect, useRef } from "react"

const CHAT_MESSAGES = [
  { from: "user", text: "Hi, I want to book a dental cleaning." },
  { from: "bot",  text: "Hello 😊 We'd love to help! We have slots available tomorrow afternoon. Would you prefer 2 PM or 4 PM?" },
  { from: "user", text: "2 PM works for me." },
  { from: "bot",  text: "Perfect! You're booked for tomorrow at 2 PM with Dr. Sharma. You'll receive a confirmation shortly 🦷" },
]

const FEATURES = [
  { icon: "🦷", label: "Advanced Dental Care", desc: "Modern equipment & painless procedures for your comfort." },
  { icon: "👨‍⚕️", label: "Experienced Dentists", desc: "10+ years of expertise with thousands of happy patients." },
  { icon: "⭐", label: "5-Star Patient Care", desc: "Rated highly for hygiene, care, and professionalism." },
  { icon: "📅", label: "Easy Booking", desc: "Book appointments instantly with quick confirmations." },
]

export default function DentalAssistantSection() {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) {
        e.target.querySelectorAll(".fade").forEach((el, i) => {
          setTimeout(() => el.classList.add("visible"), i * 100)
        })
      }
    }, { threshold: 0.1 })

    if (ref.current) obs.observe(ref.current)
    return () => obs.disconnect()
  }, [])

  return (
    <>
      <style>{`
        .root {
          font-family: 'Inter', sans-serif;
          background: #ffffff;
          padding: 100px 20px;
        }

        .inner {
          max-width: 1200px;
          margin: auto;
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 60px;
          align-items: center;
        }

        @media(max-width:900px){
          .inner { grid-template-columns:1fr; }
        }

        .eyebrow {
          font-size: 12px;
          color: #0ea5e9;
          font-weight: 600;
          margin-bottom: 10px;
        }

        .heading {
          font-size: clamp(28px,4vw,40px);
          font-weight: 700;
          color: #0f172a;
          margin-bottom: 16px;
        }

        .heading span {
          color: #0ea5e9;
        }

        .sub {
          color: #475569;
          font-size: 15px;
          line-height: 1.7;
          margin-bottom: 30px;
        }

        .feats {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
          margin-bottom: 30px;
        }

        .feat {
          background: #f8fafc;
          border-radius: 14px;
          padding: 16px;
          transition: 0.3s;
        }

        .feat:hover {
          transform: translateY(-4px);
          box-shadow: 0 10px 25px rgba(0,0,0,0.05);
        }

        .feat-icon {
          font-size: 20px;
          margin-bottom: 8px;
        }

        .feat-label {
          font-weight: 600;
          margin-bottom: 4px;
          color: #0f172a;
        }

        .feat-desc {
          font-size: 13px;
          color: #64748b;
        }

        .cta {
          display: inline-block;
          background: #0ea5e9;
          color: white;
          padding: 14px 26px;
          border-radius: 50px;
          font-weight: 600;
          text-decoration: none;
          transition: 0.3s;
        }

        .cta:hover {
          background: #0284c7;
        }

        /* Chat */

        .chat {
          background: #f8fafc;
          border-radius: 20px;
          border: 1px solid #e2e8f0;
          overflow: hidden;
        }

        .chat-header {
          padding: 16px;
          display: flex;
          align-items: center;
          gap: 10px;
          border-bottom: 1px solid #e2e8f0;
        }

        .avatar {
          width: 36px;
          height: 36px;
          border-radius: 50%;
          background: #0ea5e9;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
        }

        .chat-body {
          padding: 16px;
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .msg {
          max-width: 75%;
        }

        .msg.user {
          align-self: flex-end;
        }

        .msg.bot {
          align-self: flex-start;
        }

        .bubble {
          padding: 10px 14px;
          border-radius: 12px;
          font-size: 14px;
        }

        .user .bubble {
          background: #0ea5e9;
          color: white;
        }

        .bot .bubble {
          background: white;
          border: 1px solid #e2e8f0;
        }

        .fade {
          opacity: 0;
          transform: translateY(20px);
          transition: all 0.6s ease;
        }

        .fade.visible {
          opacity: 1;
          transform: translateY(0);
        }
      `}</style>

      <section className="root" ref={ref}>
        <div className="inner">

          {/* LEFT */}
          <div>
            <div className="eyebrow fade">Trusted Dental Care</div>

            <h2 className="heading fade">
              Your Smile, Our <span>Priority</span>
            </h2>

            <p className="sub fade">
              Experience world-class dental care with our expert team. 
              From routine cleanings to advanced cosmetic treatments, 
              we ensure a comfortable and stress-free experience.
            </p>

            <div className="feats fade">
              {FEATURES.map(f => (
                <div key={f.label} className="feat">
                  <div className="feat-icon">{f.icon}</div>
                  <div className="feat-label">{f.label}</div>
                  <div className="feat-desc">{f.desc}</div>
                </div>
              ))}
            </div>

            <Link href="/booking" className="cta fade">
              Book Appointment →
            </Link>
          </div>

          {/* RIGHT */}
          <div className="fade">
            <div className="chat">
              <div className="chat-header">
                <div className="avatar">🦷</div>
                <div>
                  <strong>Clinic Assistant</strong>
                  <div style={{fontSize:"12px", color:"#64748b"}}>Online now</div>
                </div>
              </div>

              <div className="chat-body">
                {CHAT_MESSAGES.map((m, i) => (
                  <div key={i} className={`msg ${m.from}`}>
                    <div className="bubble">{m.text}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

        </div>
      </section>
    </>
  )
}