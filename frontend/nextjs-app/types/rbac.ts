// types/rbac.ts
// ─────────────────────────────────────────────────────────────────────────────
// RBAC — Role-Based Access Control
//
// CONFIDENTIALITY RULES:
//   Medical data (diagnosis, prescriptions, consultations, lab, medical history)
//   is DOCTOR-ONLY.  Admin and Receptionist NEVER have these permissions.
//
// DATA TIERS:
//   Tier 1 — Basic patient info   → Doctor ✅  Admin ✅  Receptionist ✅
//   Tier 2 — Clinical data        → Doctor ✅  Admin ❌  Receptionist ❌
//   Tier 3 — Prescription data    → Doctor ✅  Admin ❌  Receptionist ❌
//   Tier 4 — Financial data       → Doctor ✅  Admin ✅  Receptionist ✅ (basic)
// ─────────────────────────────────────────────────────────────────────────────

export type UserRole = "admin" | "doctor" | "receptionist"

export type Permission =
  | "patients:read_basic"
  | "patients:create"
  | "patients:update"
  | "patients:update_basic"
  | "patients:upload_docs"
  | "patients:read_medical"
  | "patients:update_medical"
  | "appointments:read"
  | "appointments:create"
  | "appointments:update"
  | "appointments:delete"
  | "appointments:assign"
  | "appointments:settings"
  | "checkin:manage"
  | "billing:read_basic"
  | "billing:create"
  | "billing:manage"
  | "billing:reports"
  | "prescriptions:read"
  | "prescriptions:write"
  | "consultations:read"
  | "consultations:write"
  | "lab:read"
  | "lab:request"
  | "reports:daily"
  | "reports:financial"
  | "reports:analytics"
  | "reports:doctor_performance"
  | "users:read"
  | "users:create"
  | "users:update"
  | "users:disable"
  | "doctors:read"
  | "doctors:manage"
  | "doctors:schedule"
  | "clinic:settings"
  | "clinic:holidays"
  | "clinic:fees"
  | "content:manage"
  | "security:audit"
  | "security:backup"
  | "communication:send"
  | "telemedicine:access"

export const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {

  doctor: [
    "patients:read_basic", "patients:read_medical",
    "patients:update", "patients:update_basic", "patients:update_medical",
    "patients:upload_docs",
    "appointments:read", "appointments:update",
    "prescriptions:read", "prescriptions:write",
    "consultations:read", "consultations:write",
    "lab:read", "lab:request",
    "billing:read_basic",
    "reports:daily",
    "doctors:read",
    "telemedicine:access",
    "communication:send",
  ],

  admin: [
    "patients:read_basic", "patients:create",
    "patients:update", "patients:update_basic",
    "appointments:read", "appointments:create", "appointments:update",
    "appointments:delete", "appointments:assign", "appointments:settings",
    "checkin:manage",
    "billing:read_basic", "billing:create", "billing:manage", "billing:reports",
    "reports:daily", "reports:financial", "reports:analytics", "reports:doctor_performance",
    "users:read", "users:create", "users:update", "users:disable",
    "doctors:read", "doctors:manage", "doctors:schedule",
    "clinic:settings", "clinic:holidays", "clinic:fees",
    "content:manage",
    "security:audit", "security:backup",
    "communication:send",
  ],

  receptionist: [
    "patients:read_basic", "patients:create",
    "patients:update", "patients:update_basic",
    "appointments:read", "appointments:create", "appointments:update",
    "appointments:delete", "appointments:assign",
    "checkin:manage",
    "billing:read_basic", "billing:create",
    "reports:daily",
    "doctors:read",
    "communication:send",
  ],
}

// ── Helpers ───────────────────────────────────────────────────────────────────
export function hasPermission(role: UserRole, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false
}

export function hasAnyPermission(role: UserRole, permissions: Permission[]): boolean {
  return permissions.some(p => hasPermission(role, p))
}

export function hasAllPermissions(role: UserRole, permissions: Permission[]): boolean {
  return permissions.every(p => hasPermission(role, p))
}

// Medical fields — confidential, Doctor-only
export const MEDICAL_FIELDS = [
  "diagnosis", "treatment", "consultationNotes", "doctorNotes",
  "prescriptions", "labResults", "vitals", "medicalHistory",
  "symptoms", "examination", "chiefComplaint", "bloodGroup",
  "allergies", "currentMedications", "consultations",
] as const

export type MedicalField = typeof MEDICAL_FIELDS[number]

export function sanitizePatientData<T extends Record<string, unknown>>(
  data: T,
  role: UserRole,
): Partial<T> {
  if (role === "doctor") return data
  const ALLOWED = [
    "id", "name", "email", "phone", "dob", "gender", "address", "insurance",
    "totalVisits", "lastVisit", "createdAt", "updatedAt", "avatar", "patientId",
    "appointmentId", "appointmentDate", "appointmentTime",
    "serviceName", "doctorName", "status",
  ]
  return Object.fromEntries(
    Object.entries(data).filter(([k]) => ALLOWED.includes(k))
  ) as Partial<T>
}

// ── Interfaces ────────────────────────────────────────────────────────────────
export interface User {
  id:         string
  name:       string
  email:      string
  phone?:     string
  role:       UserRole
  clinicId:   string
  avatar?:    string
  specialty?: string
  isActive:   boolean
  createdAt:  string
  lastLogin?: string
}

export interface BasicPatient {
  id:          string
  clinicId?:   string
  name:        string
  email:       string
  phone:       string
  dob?:        string
  gender?:     "male" | "female" | "other"
  address?:    string
  insurance?:  string
  totalVisits: number
  lastVisit?:  string
  createdAt:   string
  updatedAt?:  string
}

export interface MedicalPatient extends BasicPatient {
  bloodGroup?:         string
  medicalHistory?:     string
  allergies?:          string[]
  currentMedications?: string[]
  consultations?:      Consultation[]
  prescriptions?:      Prescription[]
  labResults?:         LabResult[]
  vitals?:             Vitals
  doctorNotes?:        string
}

export type AppointmentStatus =
  | "pending" | "confirmed" | "checked_in" | "in_progress"
  | "completed" | "cancelled" | "no_show"

export interface Appointment {
  id:            string
  clinicId?:     string
  patientId:     string
  patientName?:  string
  doctorId:      string
  doctorName?:   string
  serviceId?:    string
  serviceName?:  string
  date:          string
  time:          string
  duration:      number
  status:        AppointmentStatus
  amount:        number
  notes?:        string
  clinicalNotes?: string
  createdAt:     string
  updatedAt?:    string
}

export interface Medicine {
  id?:       string
  name:      string
  dosage:    string
  frequency: string
  duration:  string
  notes?:    string
}

export interface Prescription {
  id:             string
  clinicId?:      string
  patientId:      string
  patientName?:   string
  doctorId:       string
  doctorName?:    string
  appointmentId?: string
  diagnosis:      string
  medicines:      Medicine[]
  labTests?:      string[]
  notes?:         string
  followUpDate?:  string
  createdAt:      string
  updatedAt?:     string
}

export interface Vitals {
  bp?:          string
  pulse?:       string
  temperature?: string
  weight?:      string
  height?:      string
  recordedAt?:  string
}

export interface Consultation {
  id:             string
  clinicId?:      string
  appointmentId:  string
  patientId:      string
  doctorId:       string
  chiefComplaint: string
  symptoms:       string[]
  examination?:   string
  diagnosis?:     string
  treatment?:     string
  notes?:         string
  vitals?:        Vitals
  followUpDate?:  string
  createdAt:      string
  updatedAt?:     string
}

export interface LabResult {
  id:           string
  clinicId?:    string
  patientId:    string
  doctorId:     string
  testName:     string
  result?:      string
  normalRange?: string
  status:       "pending" | "completed"
  doctorNotes?: string
  date:         string
}

export type BillStatus = "pending" | "paid" | "partial" | "cancelled"

export interface BillItem {
  id?:         string
  description: string
  quantity:    number
  rate:        number
  amount:      number
}

export interface Bill {
  id:             string
  clinicId?:      string
  patientId:      string
  patientName?:   string
  appointmentId:  string
  items:          BillItem[]
  subtotal:       number
  discount:       number
  tax:            number
  total:          number
  paid:           number
  balance:        number
  status:         BillStatus
  paymentMethod?: "cash" | "card" | "upi" | "insurance"
  createdAt:      string
  updatedAt?:     string
}

export interface WaitlistEntry {
  id:            string
  patientId:     string
  patientName:   string
  appointmentId: string
  doctorName:    string
  arrivedAt:     string
  status:        "waiting" | "called" | "in_room" | "done"
  waitTime:      number
}

export interface NavItem {
  href:        string
  label:       string
  icon:        string
  permission?: Permission
  badge?:      number
}