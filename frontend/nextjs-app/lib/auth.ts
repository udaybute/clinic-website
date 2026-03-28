// lib/auth.ts
// ─────────────────────────────────────────────────────────────────────────────
// Authentication helpers.
//
// Node.js backend endpoints used:
//   POST /api/auth/login    → { access_token, user }
//   POST /api/auth/logout   → 200 OK
//   GET  /api/auth/me       → AdminUser
//   POST /api/auth/refresh  → { access_token }
// ─────────────────────────────────────────────────────────────────────────────

"use client"

import { useState, useEffect, useCallback } from "react"
import API from "./api"
import type { AdminUser, LoginRequest, LoginResponse } from "@/types"

const TOKEN_KEY = "access_token"
const USER_KEY  = "user"

// ── Token storage ─────────────────────────────────────────────────────────────

export const saveToken = (token: string): void => {
  if (typeof window !== "undefined") localStorage.setItem(TOKEN_KEY, token)
}

export const getToken = (): string | null => {
  if (typeof window === "undefined") return null
  return localStorage.getItem(TOKEN_KEY)
}

export const clearAuth = (): void => {
  if (typeof window === "undefined") return
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(USER_KEY)
}

export const saveUser = (user: AdminUser): void => {
  if (typeof window !== "undefined")
    localStorage.setItem(USER_KEY, JSON.stringify(user))
}

export const getSavedUser = (): AdminUser | null => {
  if (typeof window === "undefined") return null
  try {
    const raw = localStorage.getItem(USER_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export const isAuthenticated = (): boolean => !!getToken()

// ── Auth API calls ────────────────────────────────────────────────────────────

export const login = async (credentials: LoginRequest): Promise<LoginResponse> => {
  const res = await API.post<LoginResponse>("/auth/login", credentials)
  const data = res.data as LoginResponse
  saveToken(data.access_token)
  saveUser(data.user)
  return data
}

export const logout = async (): Promise<void> => {
  try {
    await API.post("/auth/logout")
  } catch {
    // Swallow — clear client state regardless
  } finally {
    clearAuth()
    window.location.href = "/login"
  }
}

export const fetchCurrentUser = async (): Promise<AdminUser> => {
  const res = await API.get<AdminUser>("/auth/me")
  return res.data as AdminUser
}

// ── useAuth hook ──────────────────────────────────────────────────────────────
// Use this hook in any component that needs the current user.
//
// Example:
//   const { user, loading, isLoggedIn } = useAuth()

export function useAuth() {
  const [user,    setUser]    = useState<AdminUser | null>(getSavedUser)
  const [loading, setLoading] = useState(!getSavedUser())

  const refresh = useCallback(async () => {
    if (!getToken()) { setLoading(false); return }
    try {
      const u = await fetchCurrentUser()
      setUser(u)
      saveUser(u)
    } catch {
      clearAuth()
      setUser(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { refresh() }, [refresh])

  return {
    user,
    loading,
    isLoggedIn: !!user,
    logout,
    refresh,
  }
}