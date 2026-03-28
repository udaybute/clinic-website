"use client"

// ScrollReveal.tsx
// A reusable wrapper that fades + slides children into view on scroll.
// Usage:
//   <ScrollReveal>
//     <YourComponent />
//   </ScrollReveal>
//
// Props:
//   delay   — CSS transition delay in ms  (default: 0)
//   once    — only animate once           (default: true)
//   className — extra classes on wrapper

import { useEffect, useRef } from "react"

interface Props {
  children: React.ReactNode
  delay?:   number
  once?:    boolean
  className?: string
}

export default function ScrollReveal({
  children,
  delay    = 0,
  once     = true,
  className = "",
}: Props) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.style.transitionDelay = `${delay}ms`
          el.classList.add("reveal-visible")
          if (once) obs.disconnect()
        } else if (!once) {
          el.classList.remove("reveal-visible")
        }
      },
      { threshold: 0.1 }
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [delay, once])

  return (
    <div ref={ref} className={`reveal-wrap ${className}`}>
      <style>{`
        .reveal-wrap {
          opacity: 0;
          transform: translateY(28px);
          transition: opacity 0.65s ease, transform 0.65s ease;
        }
        .reveal-wrap.reveal-visible {
          opacity: 1;
          transform: translateY(0);
        }
      `}</style>
      {children}
    </div>
  )
}
