// hooks/index.ts
// ─────────────────────────────────────────────────────────────────────────────
// Shared custom hooks used across the app.
// ─────────────────────────────────────────────────────────────────────────────

"use client"

import { useState, useEffect, useRef, useCallback, DependencyList } from "react"
import { getList } from "@/lib/api"

// ── useApi ────────────────────────────────────────────────────────────────────
// Generic data fetching hook with loading / error states.
// Automatically handles the Node.js array + paginated response shape.
//
// Usage:
//   const { data, loading, error, refetch } = useApi<Doctor[]>("/doctors")

export function useApi<T>(
  url: string,
  params?: Record<string, unknown>,
  deps: DependencyList = []
) {
  const [data,    setData]    = useState<T | null>(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState<string | null>(null)

  const fetch = useCallback(async () => {
    setLoading(true); setError(null)
    try {
      const { default: API } = await import("@/lib/api")
      const res = await API.get(url, { params })
      // Normalise array / paginated / single-object responses
      const raw = res.data
      const d = Array.isArray(raw)
        ? raw
        : Array.isArray(raw?.data) ? raw.data
        : raw
      setData(d as T)
    } catch (e: any) {
      setError(e?.message ?? "Failed to fetch data")
    } finally {
      setLoading(false)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url, JSON.stringify(params), ...deps])

  useEffect(() => { fetch() }, [fetch])

  return { data, loading, error, refetch: fetch }
}

// ── useDebounce ───────────────────────────────────────────────────────────────
// Debounces a value — useful for search inputs.
//
// Usage:
//   const debouncedSearch = useDebounce(searchTerm, 400)

export function useDebounce<T>(value: T, delay = 400): T {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(timer)
  }, [value, delay])
  return debounced
}

// ── useScrollReveal ───────────────────────────────────────────────────────────
// Attach to any element ref — adds "visible" class when scrolled into view.
//
// Usage:
//   const ref = useScrollReveal()
//   <div ref={ref} className="reveal">…</div>

export function useScrollReveal(threshold = 0.12) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) el.classList.add("visible") },
      { threshold }
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [threshold])

  return ref
}

// ── usePagination ─────────────────────────────────────────────────────────────
// Client-side pagination helper.
//
// Usage:
//   const { page, perPage, paginated, totalPages, next, prev, goTo } =
//     usePagination(items, 10)

export function usePagination<T>(items: T[], perPage = 10) {
  const [page, setPage] = useState(1)

  const totalPages = Math.max(1, Math.ceil(items.length / perPage))
  const paginated  = items.slice((page - 1) * perPage, page * perPage)

  const next  = () => setPage(p => Math.min(p + 1, totalPages))
  const prev  = () => setPage(p => Math.max(p - 1, 1))
  const goTo  = (n: number) => setPage(Math.max(1, Math.min(n, totalPages)))
  const reset = () => setPage(1)

  // Reset to page 1 whenever the list changes
  const len = items.length
  useEffect(() => setPage(1), [len])

  return { page, perPage, paginated, totalPages, next, prev, goTo, reset }
}

// ── useLocalStorage ───────────────────────────────────────────────────────────
// Persists state to localStorage with SSR safety.
//
// Usage:
//   const [theme, setTheme] = useLocalStorage("theme", "light")

export function useLocalStorage<T>(key: string, initialValue: T) {
  const [stored, setStored] = useState<T>(() => {
    if (typeof window === "undefined") return initialValue
    try {
      const item = localStorage.getItem(key)
      return item ? JSON.parse(item) : initialValue
    } catch {
      return initialValue
    }
  })

  const setValue = (value: T | ((prev: T) => T)) => {
    const newValue = value instanceof Function ? value(stored) : value
    setStored(newValue)
    if (typeof window !== "undefined") {
      localStorage.setItem(key, JSON.stringify(newValue))
    }
  }

  return [stored, setValue] as const
}

// ── useClickOutside ───────────────────────────────────────────────────────────
// Fires callback when user clicks outside the referenced element.
//
// Usage:
//   const ref = useClickOutside(() => setOpen(false))
//   <div ref={ref}>…</div>

export function useClickOutside<T extends HTMLElement>(callback: () => void) {
  const ref = useRef<T>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        callback()
      }
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [callback])

  return ref
}