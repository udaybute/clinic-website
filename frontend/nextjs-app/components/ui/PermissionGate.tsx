"use client"

// components/ui/PermissionGate.tsx
// Renders children only if the current user has the required permission or role.
// Server-side: always renders nothing (SSR safe — auth is client-only).

import { useAuthStore }  from "@/store/authStore"
import type { Permission, UserRole } from "@/types/rbac"

interface Props {
  /** Show if user has this permission */
  permission?: Permission
  /** Show if user has ANY of these permissions */
  permissions?: Permission[]
  /** Show if user has this exact role */
  role?: UserRole
  /** Show if user has ANY of these roles */
  roles?: UserRole[]
  /** What to render if the check fails — default: null */
  fallback?: React.ReactNode
  children: React.ReactNode
}

export default function PermissionGate({
  permission,
  permissions,
  role,
  roles,
  fallback = null,
  children,
}: Props) {
  const { user, can, canAny } = useAuthStore()

  // Not logged in — show nothing
  if (!user) return <>{fallback}</>

  const userRole = user.role as UserRole

  // Check single permission
  if (permission && !can(permission)) return <>{fallback}</>

  // Check any of multiple permissions
  if (permissions && permissions.length > 0 && !canAny(permissions)) return <>{fallback}</>

  // Check single role
  if (role && userRole !== role) return <>{fallback}</>

  // Check any of multiple roles
  if (roles && roles.length > 0 && !roles.includes(userRole)) return <>{fallback}</>

  return <>{children}</>
}

// ── MedicalGate — Doctor-only wrapper ────────────────────────────────────────
// Use this instead of <PermissionGate permission="patients:read_medical">
// when wrapping medical content — shows a lock icon to non-doctors instead of nothing.

export function MedicalGate({ children }: { children: React.ReactNode }) {
  const { user } = useAuthStore()

  if (user?.role === "doctor") return <>{children}</>

  return (
    <div style={{
      display:        "flex",
      alignItems:     "center",
      gap:            8,
      padding:        "10px 14px",
      borderRadius:   10,
      background:     "rgba(10,22,40,.04)",
      border:         "1px solid rgba(10,22,40,.08)",
      color:          "#94a3b8",
      fontSize:       ".8rem",
    }}>
      🔒 Medical data — Doctor access only
    </div>
  )
}