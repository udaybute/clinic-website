// types/service.ts
// Shared Service type used by lib/services.data.ts and the detail page.
// Export from here so @/types resolves correctly via tsconfig paths.

export interface ServiceDoctor {
  name:      string
  specialty: string
  rating:    number
  image:     string
}

export interface ServiceStep {
  title: string
  desc:  string
}

export interface ServiceFaq {
  q: string
  a: string
}

export interface ServiceStats {
  successRate: string
  recovery:    string
  visits:      string
}

export interface Service {
  id:          string        // slug used in URL: /services/[id]
  name:        string
  category:    string
  price:       number        // in ₹
  duration:    number        // minutes
  description: string
  image?:      string
  anaesthesia?: string

  benefits?:  string[]
  includes?:  string[]
  stats?:     ServiceStats
  steps?:     ServiceStep[]
  faqs?:      ServiceFaq[]
  doctors?:   ServiceDoctor[]
}
