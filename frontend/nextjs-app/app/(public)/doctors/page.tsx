// app/(public)/doctors/page.tsx
// Server Component — SSR + full SEO + ISR.
// Calls GET /api/staff?role=doctor (existing backend endpoint, no changes needed).
// Falls back to static data if API is unavailable — no backend break.

import type { Metadata } from "next"
import DoctorsClient from "./DoctorsClient"

// ── SEO Metadata ──────────────────────────────────────────────────────────────
export const metadata: Metadata = {
  title: "Our Specialist Doctors | DentalCare Smile Studio",
  description:
    "Meet our board-certified dental specialists — orthodontists, implant surgeons, cosmetic dentists with 8–15+ years of experience. Book a free consultation today in Pune.",
  keywords: [
    "dental specialists pune", "orthodontist pune", "dental implants pune",
    "cosmetic dentist pune", "best dentist koregaon park pune",
  ],
  openGraph: {
    title:       "Our Specialist Doctors | DentalCare Smile Studio",
    description: "Board-certified specialists. 4.9★ avg. rating. 20,000+ patients treated.",
    url:         "/doctors",
    images:      [{ url: "/og-doctors.jpg", width: 1200, height: 630 }],
  },
  alternates: { canonical: "https://dentalcare.in/doctors" },
}

// ── JSON-LD structured data ───────────────────────────────────────────────────
const JSONLD = {
  "@context":        "https://schema.org",
  "@type":           "MedicalOrganization",
  name:              "DentalCare Smile Studio",
  url:               "https://dentalcare.in/doctors",
  medicalSpecialty:  ["Dentistry","Orthodontics","Oral Surgery","Cosmetic Dentistry"],
  aggregateRating:   { "@type": "AggregateRating", ratingValue: "4.9", reviewCount: "1200" },
  employee: [
    { "@type": "Physician", name: "Dr. Sarah Johnson",  medicalSpecialty: "Orthodontics"       },
    { "@type": "Physician", name: "Dr. Michael Lee",    medicalSpecialty: "Oral Surgery"        },
    { "@type": "Physician", name: "Dr. Emma Watson",    medicalSpecialty: "Cosmetic Dentistry"  },
    { "@type": "Physician", name: "Dr. Priya Mehta",    medicalSpecialty: "Endodontics"         },
  ],
}

// ── Static fallback data ──────────────────────────────────────────────────────
const FALLBACK_DOCTORS = [
  {
    id: "1", name: "Dr. Sarah Johnson", specialty: "Orthodontist",
    experience: 10, qualifications: "BDS, MDS (Orthodontics)", consultationFee: 500,
    avatar: "https://images.unsplash.com/photo-1537368910025-700350fe46c7?w=400&h=400&fit=crop&crop=face",
    rating: 4.9, reviewCount: 318, isActive: true,
    tags: ["Braces", "Invisalign", "Retainers"],
    bio: "Specialist in invisible alignment and smile correction for teens and adults.",
    availability: ["Mon 09:00-18:00","Tue 09:00-18:00","Wed 09:00-18:00","Thu 09:00-18:00","Fri 09:00-18:00"],
  },
  {
    id: "2", name: "Dr. Michael Lee", specialty: "Implant Specialist",
    experience: 8, qualifications: "BDS, MDS (Oral Surgery), FICOI", consultationFee: 500,
    avatar: "https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=400&h=400&fit=crop&crop=face",
    rating: 4.8, reviewCount: 204, isActive: true,
    tags: ["Implants", "Bone Graft", "Restorations"],
    bio: "Pioneer in full-arch dental implants and complex bone reconstruction surgery.",
    availability: ["Mon 09:00-18:00","Tue 09:00-18:00","Thu 09:00-18:00","Sat 09:00-14:00"],
  },
  {
    id: "3", name: "Dr. Emma Watson", specialty: "Cosmetic Dentist",
    experience: 12, qualifications: "BDS, MDS (Prosthodontics), AACD", consultationFee: 500,
    avatar: "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=400&h=400&fit=crop&crop=face",
    rating: 4.9, reviewCount: 427, isActive: true,
    tags: ["Veneers", "Whitening", "Bonding"],
    bio: "Award-winning cosmetic specialist transforming smiles with artistry and precision.",
    availability: ["Tue 09:00-18:00","Wed 09:00-18:00","Fri 09:00-18:00","Sat 09:00-14:00"],
  },
  {
    id: "4", name: "Dr. Priya Mehta", specialty: "Endodontist",
    experience: 9, qualifications: "BDS, MDS (Endodontics)", consultationFee: 400,
    avatar: "https://images.unsplash.com/photo-1551836022-deb4988cc6c0?w=400&h=400&fit=crop&crop=face",
    rating: 4.8, reviewCount: 156, isActive: true,
    tags: ["Root Canal", "Pain-Free", "Rotary Tech"],
    bio: "Pain-free root canal specialist using the latest rotary endodontic technology.",
    availability: ["Mon 09:00-18:00","Wed 09:00-18:00","Thu 09:00-18:00","Fri 09:00-18:00"],
  },
]

export default async function DoctorsPage() {
  // Fetch from real backend — GET /api/staff?role=doctor
  let doctors: any[] = []
  try {
    const base = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api"
    const res  = await fetch(`${base}/staff?role=doctor&limit=20&active=true`, {
      next: { revalidate: 300 }, // ISR — refresh every 5 minutes
      signal: AbortSignal.timeout(8000), // fail fast if backend is sleeping
    })
    if (res.ok) {
      const data = await res.json()
      // Backend returns { users: [], total, page, ... } from staff.service.ts
      doctors = data?.users ?? data ?? []
    }
  } catch {
    // API unavailable on build — use fallback, no crash
  }

  // Use fallback if API returned nothing
  if (!doctors.length) doctors = FALLBACK_DOCTORS

  // Normalise backend User fields → component-expected shape
  // Preserves all field names from staff.service.ts (id, name, specialty, experience,
  // qualifications, consultationFee, avatar, isActive, availability)
  const mapped = doctors
    .filter(d => d.isActive !== false)
    .map(d => ({
      id:              d.id ?? d._id ?? String(Math.random()),
      name:            d.name,
      specialty:       d.specialty  ?? "General Dentist",
      experience:      d.experience ?? 5,
      qualifications:  d.qualifications ?? "BDS",
      consultationFee: d.consultationFee ?? 500,
      avatar:          d.avatar ?? `https://ui-avatars.com/api/?name=${encodeURIComponent(d.name)}&background=0d9488&color=fff&size=200`,
      rating:          d.rating      ?? 4.8,
      reviewCount:     d.reviewCount ?? 100,
      tags:            d.tags        ?? [],
      bio:             d.bio         ?? `Experienced ${d.specialty ?? "dental"} specialist dedicated to patient care.`,
      availability:    d.availability ?? [],
    }))

  const specialties = ["All", ...Array.from(new Set(mapped.map(d => d.specialty)))]

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(JSONLD) }}
      />
      <DoctorsClient doctors={mapped} specialties={specialties} />
    </>
  )
}