// store/authStore.ts
// Zustand auth store — persisted to localStorage.
//
// KEY CONTRACT with lib/api.ts:
//   localStorage.setItem('access_token', token)   ← api.ts reads THIS exact key
//   localStorage.setItem('auth', JSON.stringify({user,token}))  ← Zustand persist
//
// Both must stay in sync — setAuth() and logout() handle both.

import { create } from "zustand"
import { persist } from "zustand/middleware"
import type { Permission, UserRole } from "@/types/rbac"
import { ROLE_PERMISSIONS } from "@/types/rbac"

export interface User {
  id:        string
  name:      string
  email:     string
  role:      UserRole
  clinicId:  string
  isActive:  boolean
  specialty?: string
  createdAt: string
}

interface AuthState {
  user:       User | null
  token:      string | null
  isLoggedIn: boolean
  setAuth:    (user: User, token: string) => void
  logout:     () => void
  can:        (permission: Permission) => boolean
  canAny:     (permissions: Permission[]) => boolean
  role:       () => UserRole | null
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user:       null,
      token:      null,
      isLoggedIn: false,

      setAuth: (user: User, token: string) => {
        // 1. Update Zustand state
        set({ user, token, isLoggedIn: true })

        // 2. Write token to localStorage under the key api.ts reads
        if (typeof window !== "undefined") {
          localStorage.setItem("access_token", token)

          // 3. Write cookie for the middleware/proxy.ts route guard
          document.cookie = `access_token=${token}; path=/; max-age=${7 * 24 * 60 * 60}; SameSite=Lax`
        }
      },

      logout: () => {
        // 1. Clear Zustand state
        set({ user: null, token: null, isLoggedIn: false })

        // 2. Clear all storage
        if (typeof window !== "undefined") {
          localStorage.removeItem("access_token")
          localStorage.removeItem("user")
          localStorage.removeItem("auth")   // Zustand persist key

          // 3. Expire the cookie
          document.cookie = "access_token=; path=/; max-age=0; SameSite=Lax"

          // 4. Hard redirect to login
          window.location.href = "/login"
        }
      },

      can: (permission: Permission) => {
        const role = get().user?.role
        if (!role) return false
        return ROLE_PERMISSIONS[role]?.includes(permission) ?? false
      },

      canAny: (permissions: Permission[]) => {
        return permissions.some(p => get().can(p))
      },

      role: () => get().user?.role ?? null,
    }),
    {
      name:    "auth",   // localStorage key for Zustand persist
      version: 1,
      // Only persist user and token — isLoggedIn is derived
      partialize: (state) => ({
        user:  state.user,
        token: state.token,
      }),
      // Re-hydrate isLoggedIn when store reloads from localStorage
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.isLoggedIn = !!(state.user && state.token)
          // Re-sync the raw localStorage key so api.ts can read it
          if (state.token && typeof window !== "undefined") {
            localStorage.setItem("access_token", state.token)
          }
        }
      },
    },
  ),
)