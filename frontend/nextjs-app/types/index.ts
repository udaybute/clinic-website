// types/index.ts — central type exports

export type { Service, ServiceDoctor, ServiceStep, ServiceFaq, ServiceStats } from "./service"

export interface Doctor {
  id:              string
  name:            string
  specialty:       string
  experience:      number
  qualifications:  string
  consultationFee: number
  avatar:          string
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
