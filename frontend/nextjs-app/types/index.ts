// types/index.ts — central type exports

export type { Service, ServiceDoctor, ServiceStep, ServiceFaq, ServiceStats } from "./service"

// ── Auth types (mirrors backend User model / auth endpoints) ──────────────────

export interface AdminUser {
  id:               string
  name:             string
  email:            string
  role:             "admin" | "doctor" | "receptionist"
  specialty?:       string
  phone?:           string
  avatar?:          string
  isActive:         boolean
  lastLogin?:       string
  clinicId:         string
  createdAt:        string
  updatedAt?:       string
  experience?:      number
  qualifications?:  string
  consultationFee?: number
  availability?:    string[]
}

export interface LoginRequest {
  email:    string
  password: string
}

export interface LoginResponse {
  access_token: string
  user:         AdminUser
}

export interface Doctor {
  id:              string
  name:            string
  specialty:       string
  experience:      number
  qualifications:  string
  consultationFee: number
  avatar:          string
  image?:          string
  rating:          number
  reviewCount:     number
  tags:            string[]
  bio:             string
  availability:    string[]
  // optional runtime-only fields (not in DB schema)
  patientCount?:   string
  education?:      string
  available?:      boolean
}
