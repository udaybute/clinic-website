// utils/index.ts
// ─────────────────────────────────────────────────────────────────────────────
// Shared utility functions.
// ─────────────────────────────────────────────────────────────────────────────

// ── Formatting ────────────────────────────────────────────────────────────────

/** Format number as Indian currency string  →  "₹2.4L" / "₹3,500" */
export function formatCurrency(value: number): string {
  if (value >= 100_000) return `₹${(value / 100_000).toFixed(1)}L`
  if (value >= 1_000)   return `₹${value.toLocaleString("en-IN")}`
  return `₹${value}`
}

/** "2025-03-19" → "Wednesday, 19 March 2025" */
export function formatDateLong(iso: string): string {
  return new Date(iso + "T12:00:00").toLocaleDateString("en-IN", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  })
}

/** "2025-03-19" → "19 Mar 2025" */
export function formatDateShort(iso: string): string {
  return new Date(iso + "T12:00:00").toLocaleDateString("en-IN", {
    day: "numeric", month: "short", year: "numeric",
  })
}

/** "09:00" → "9:00 AM" */
export function formatTime(time: string): string {
  const [h, m] = time.split(":").map(Number)
  const ampm = h >= 12 ? "PM" : "AM"
  return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${ampm}`
}

/** "2025-03-19T08:34:00Z" → "2 hours ago" */
export function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60_000)
  if (mins < 1)   return "just now"
  if (mins < 60)  return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24)   return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  if (days < 7)   return `${days}d ago`
  return formatDateShort(iso)
}

// ── Validation ────────────────────────────────────────────────────────────────

export const isValidEmail = (email: string): boolean =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)

export const isValidPhone = (phone: string): boolean =>
  /^[+]?[\d\s\-()]{7,15}$/.test(phone)

export const isValidPassword = (pw: string): boolean =>
  pw.length >= 8 && /[A-Z]/.test(pw) && /[0-9]/.test(pw)

// ── String helpers ────────────────────────────────────────────────────────────

/** "john doe" → "John Doe" */
export const titleCase = (s: string): string =>
  s.replace(/\w\S*/g, t => t.charAt(0).toUpperCase() + t.slice(1).toLowerCase())

/** "dr-sarah-johnson" → "Dr Sarah Johnson" */
export const slugToTitle = (slug: string): string =>
  titleCase(slug.replace(/-/g, " "))

/** Get initials from full name: "Sarah Johnson" → "SJ" */
export const getInitials = (name: string): string =>
  name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2)

// ── Array helpers ─────────────────────────────────────────────────────────────

/** Normalise any API list response to a plain array */
export function normaliseList<T>(data: unknown): T[] {
  if (Array.isArray(data))              return data as T[]
  if (Array.isArray((data as any)?.data))   return (data as any).data as T[]
  if (Array.isArray((data as any)?.items))  return (data as any).items as T[]
  return []
}

/** Group array by key: groupBy(doctors, "specialty") */
export function groupBy<T>(items: T[], key: keyof T): Record<string, T[]> {
  return items.reduce((acc, item) => {
    const k = String(item[key])
    acc[k] = acc[k] ?? []
    acc[k].push(item)
    return acc
  }, {} as Record<string, T[]>)
}

// ── Cookie helpers (for middleware JWT) ───────────────────────────────────────

export const setCookie = (name: string, value: string, days = 7): void => {
  if (typeof document === "undefined") return
  const expires = new Date()
  expires.setDate(expires.getDate() + days)
  document.cookie = `${name}=${value}; expires=${expires.toUTCString()}; path=/; SameSite=Strict`
}

export const getCookie = (name: string): string | null => {
  if (typeof document === "undefined") return null
  const match = document.cookie.match(new RegExp(`(^| )${name}=([^;]+)`))
  return match ? match[2] : null
}

export const deleteCookie = (name: string): void => {
  if (typeof document === "undefined") return
  document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`
}