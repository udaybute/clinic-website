// store/bookingStore.ts
// Zustand store for the multi-step booking flow.
// Carries real IDs from the backend PLUS display names so StepConfirm
// can show human-readable labels without hardcoded lookup maps.

import { create } from "zustand"

interface BookingState {
  // Step 1 — Service
  serviceId:   string | null
  serviceName: string | null      // display label for confirm step
  servicePrice: string | null

  // Step 2 — Doctor
  doctorId:   string | null
  doctorName: string | null       // display label for confirm step

  // Step 3 — Date
  date: string | null             // "YYYY-MM-DD"

  // Step 4 — Time
  time: string | null             // "09:00"

  // Step 5 — Patient
  patientId:   string | null      // UUID returned by POST /patients
  patientName: string | null
  patientEmail: string | null
  patientPhone: string | null
  patientNotes: string | null

  // Actions
  setService:  (id: string, name: string, price?: string) => void
  setDoctor:   (id: string, name: string) => void
  setDate:     (date: string) => void
  setTime:     (time: string) => void
  setPatient:  (data: { id: string; name: string; email?: string; phone?: string; notes?: string }) => void
  reset:       () => void
}

const initialState = {
  serviceId:    null,
  serviceName:  null,
  servicePrice: null,
  doctorId:     null,
  doctorName:   null,
  date:         null,
  time:         null,
  patientId:    null,
  patientName:  null,
  patientEmail: null,
  patientPhone: null,
  patientNotes: null,
}

export const useBookingStore = create<BookingState>((set) => ({
  ...initialState,

  setService:  (id, name, price) => set({ serviceId: id, serviceName: name, servicePrice: price ?? null }),
  setDoctor:   (id, name)        => set({ doctorId: id,  doctorName: name }),
  setDate:     (date)            => set({ date }),
  setTime:     (time)            => set({ time }),
  setPatient:  (data)            => set({
    patientId:    data.id,
    patientName:  data.name,
    patientEmail: data.email  ?? null,
    patientPhone: data.phone  ?? null,
    patientNotes: data.notes  ?? null,
  }),
  reset: () => set(initialState),
}))