// lib/api.ts
// Axios instance with JWT auth and response envelope unwrapping.
//
// Backend response envelope (NestJS ResponseInterceptor):
//   All endpoints:  { success: true,  message: "OK",               data: <payload> }
//   Auth login:     { success: true,  message: "Login successful",  data: { access_token, user } }
//   Errors:         { success: false, message: "...",               statusCode: 4xx }
//
// This interceptor unwraps .data so callers receive the payload directly.

import axios from 'axios'

if (
  typeof window === 'undefined' &&
  process.env.NODE_ENV === 'production' &&
  !process.env.NEXT_PUBLIC_API_URL
) {
  throw new Error('Missing required environment variable: NEXT_PUBLIC_API_URL')
}

const BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api'

const API = axios.create({
  baseURL:        BASE_URL,
  timeout:        15_000,
  headers:        { 'Content-Type': 'application/json' },
  withCredentials: false,
})

// ── Request interceptor: attach Bearer token ──────────────────────────────────
API.interceptors.request.use(
  (config) => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('access_token')
      if (token) {
        config.headers.Authorization = `Bearer ${token}`
      }
    }
    return config
  },
  (error) => Promise.reject(error),
)

// ── Response interceptor: unwrap { success, message, data } envelope ──────────
API.interceptors.response.use(
  (response) => {
    const body = response.data

    // Detect our standard envelope and unwrap it
    if (
      body !== null &&
      typeof body === 'object' &&
      'success' in body &&
      body.success === true &&
      'data' in body
    ) {
      return { ...response, data: body.data }
    }

    // Not our envelope (e.g. health check) — pass through
    return response
  },
  (error) => {
    if (typeof window !== 'undefined') {
      if (error.response?.status === 401) {
        // Clear all auth state
        localStorage.removeItem('access_token')
        localStorage.removeItem('user')
        localStorage.removeItem('auth')
        document.cookie = 'access_token=; path=/; max-age=0; SameSite=Lax'

        // Redirect to login unless already there
        if (!window.location.pathname.includes('/login')) {
          window.location.href = '/login'
        }
      }
    }
    return Promise.reject(error)
  },
)

export default API

// Convenience wrappers
export const getList   = <T>(url: string, params?: object) =>
  API.get<T[]>(url, { params }).then(r => r.data as unknown as T[])
export const getOne    = <T>(url: string) =>
  API.get<T>(url).then(r => r.data as unknown as T)
export const createOne = <T>(url: string, data: object) =>
  API.post<T>(url, data).then(r => r.data as unknown as T)
export const updateOne = <T>(url: string, data: object) =>
  API.put<T>(url, data).then(r => r.data as unknown as T)
export const deleteOne = <T>(url: string) =>
  API.delete<T>(url).then(r => r.data as unknown as T)