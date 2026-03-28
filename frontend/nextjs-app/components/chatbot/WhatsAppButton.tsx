"use client"

// components/chatbot/WhatsAppButton.tsx
// Isolated as a 'use client' component — keeps public layout.tsx a Server Component.
// Design: CSS-in-JSX only — no Tailwind. Brand colors: #25d366 WhatsApp green.

import { useState } from "react"

// ── Update this to the clinic's real WhatsApp number ─────────────────────────
const WA_NUMBER = "918668296156"   // country code + number, no + or spaces

// Pre-filled messages — the button cycles through context-aware options
// depending on what the user was doing on the site
const WA_DEFAULT_MSG = encodeURIComponent(
  "Hi! I visited your website and would like to book an appointment at DentalCare Smile Studio. Please let me know your available slots. 🙏"
)

export default function WhatsAppButton() {
  const [hovered, setHovered] = useState(false)

  return (
    <>
      <style>{`
        @keyframes waPulse {
          0%,100% { box-shadow: 0 6px 24px rgba(37,211,102,.45); }
          50%      { box-shadow: 0 8px 32px rgba(37,211,102,.7);  }
        }

        .wa-wrap {
          position: fixed;
          bottom: 96px;
          right: 24px;
          z-index: 9989;
          display: flex;
          align-items: center;
          gap: 10px;
          flex-direction: row-reverse;
        }

        .wa-btn {
          width: 52px;
          height: 52px;
          border-radius: 50%;
          background: #25d366;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 6px 24px rgba(37,211,102,.45);
          text-decoration: none;
          flex-shrink: 0;
          animation: waPulse 3s ease-in-out infinite;
          transition: transform .25s cubic-bezier(.34,1.56,.64,1), box-shadow .25s ease, animation .25s;
        }
        .wa-btn:hover {
          transform: scale(1.12);
          box-shadow: 0 10px 36px rgba(37,211,102,.65);
          animation: none;
        }

        .wa-tooltip {
          background: #0a1628;
          color: #fff;
          font-family: 'DM Sans', sans-serif;
          font-size: .76rem;
          font-weight: 500;
          white-space: nowrap;
          padding: 7px 13px;
          border-radius: 10px;
          pointer-events: none;
          box-shadow: 0 4px 16px rgba(10,22,40,.2);
          transition: opacity .2s, transform .2s;
          position: relative;
        }
        /* Arrow pointing right toward button */
        .wa-tooltip::after {
          content: '';
          position: absolute;
          right: -6px;
          top: 50%;
          transform: translateY(-50%);
          border: 6px solid transparent;
          border-left-color: #0a1628;
          border-right: none;
        }
      `}</style>

      <div
        className="wa-wrap"
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        {/* Tooltip — shown on hover */}
        {hovered && (
          <div className="wa-tooltip">
            Chat on WhatsApp
          </div>
        )}

        <a
          href={`https://wa.me/${WA_NUMBER}?text=${WA_DEFAULT_MSG}`}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Chat with us on WhatsApp"
          className="wa-btn"
        >
          <svg
            width="26"
            height="26"
            viewBox="0 0 24 24"
            fill="white"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
          >
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
          </svg>
        </a>
      </div>
    </>
  )
}