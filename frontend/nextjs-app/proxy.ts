// middleware.ts  — place at project ROOT (same level as app/)
// ─────────────────────────────────────────────────────────────────────────────
// Protects /dashboard routes. Redirects to /login if no token cookie found.
// Accepts both:
//   • Real JWTs (from Node.js backend)
//   • Mock tokens (prefix "mock_token_") for frontend-only development
// ─────────────────────────────────────────────────────────────────────────────

import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Read the access_token cookie (set by login page via document.cookie)
  const token = request.cookies.get("access_token")?.value

  const isProtected  = pathname.startsWith("/dashboard")
  const isLoginPage  = pathname.startsWith("/login")

  // No token + trying to access dashboard → redirect to login
  if (isProtected && !token) {
    const url = new URL("/login", request.url)
    url.searchParams.set("redirect", pathname)
    return NextResponse.redirect(url)
  }

  // Has token + on login page → redirect to dashboard
  if (isLoginPage && token) {
    return NextResponse.redirect(new URL("/dashboard", request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/dashboard/:path*", "/login"],
}