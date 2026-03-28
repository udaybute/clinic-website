// lib/services.data.ts
// Static service data for SSG — used by:
//   - app/(public)/services/[id]/page.tsx (detail page)
//   - generateStaticParams (build-time route generation)
//
// IDs here are URL slugs. They are SEPARATE from DB UUIDs.
// When a user books from the detail page, the serviceId in the URL is the slug
// and the booking step fetches real services from /api/booking/services.
//
// To add a new service: add it here AND seed it in prisma/seed.ts.

import type { Service } from "@/types/service"

export const SERVICES: Service[] = [
  // ── 1. Teeth Cleaning ─────────────────────────────────────────────────────
  {
    id:          "teeth-cleaning",
    name:        "Teeth Cleaning",
    category:    "Preventive",
    price:       800,
    duration:    45,
    description: "Professional scaling and polishing to remove plaque, tartar, and surface stains — keeping your gums healthy and your smile fresh.",
    image:       "https://images.unsplash.com/photo-1606811841689-23dfddce3e95?w=800&auto=format&fit=crop",
    anaesthesia: "None",

    benefits: [
      "Removes hardened tartar",
      "Prevents gum disease",
      "Fresher breath",
      "Brighter smile",
    ],

    stats: {
      successRate: "100%",
      recovery:    "None",
      visits:      "1",
    },

    includes: [
      "Ultrasonic scaling",
      "Hand scaling & root planing",
      "Polishing & stain removal",
      "Fluoride application",
      "Oral hygiene guidance",
    ],

    steps: [
      { title: "Examination",     desc: "A quick check of gum health and plaque levels before we begin." },
      { title: "Scaling",         desc: "Ultrasonic and hand instruments remove tartar above and below the gumline." },
      { title: "Polishing",       desc: "Stain removal and surface polishing for a smooth, clean finish." },
      { title: "Fluoride rinse",  desc: "Protective fluoride treatment to strengthen enamel post-cleaning." },
    ],

    faqs: [
      { q: "How often should I get a cleaning?",    a: "Every 6 months for most patients. Those with gum disease may need every 3–4 months." },
      { q: "Does scaling hurt?",                    a: "Mild sensitivity is common. We use gentle techniques and can apply topical numbing gel on request." },
      { q: "Will it remove all stains?",            a: "Surface stains from tea, coffee, and tobacco are removed. Deep intrinsic stains may need whitening." },
    ],

    doctors: [
      { name:"Dr. Sarah Johnson", specialty:"General Dentist",   rating:4.9, image:"https://images.unsplash.com/photo-1537368910025-700350fe46c7?w=80&auto=format&fit=crop&crop=face" },
    ],
  },

  // ── 2. Teeth Whitening ────────────────────────────────────────────────────
  {
    id:          "teeth-whitening",
    name:        "Teeth Whitening",
    category:    "Cosmetic",
    price:       3500,
    duration:    60,
    description: "Professional-grade laser whitening that lifts stains by up to 8 shades in a single session, leaving you with a radiant, confident smile.",
    image:       "https://images.unsplash.com/photo-1606811841689-23dfddce3e95?w=800&auto=format&fit=crop",
    anaesthesia: "None",

    benefits: [
      "Up to 8 shades brighter",
      "Long-lasting results",
      "Sensitivity-safe formula",
      "Single session treatment",
    ],

    stats: {
      successRate: "95%",
      recovery:    "None",
      visits:      "1",
    },

    includes: [
      "Professional shade assessment",
      "Gum protection barrier",
      "LED whitening activation",
      "Take-home maintenance kit",
      "Aftercare instructions",
    ],

    steps: [
      { title: "Shade assessment",     desc: "We photograph and record your current tooth shade for comparison." },
      { title: "Gum protection",       desc: "A protective barrier is applied to gums before gel activation." },
      { title: "Whitening activation", desc: "Professional-grade gel is activated using LED light for 3 rounds." },
      { title: "Final shade check",    desc: "Results are compared with the initial shade record." },
    ],

    faqs: [
      { q: "How long do results last?",   a: "Typically 6–12 months with good oral hygiene and avoiding staining foods." },
      { q: "Will my teeth be sensitive?", a: "Mild sensitivity for 24–48 hours is normal and resolves on its own." },
      { q: "Is it safe for enamel?",      a: "Yes. We use enamel-safe peroxide concentrations under strict clinical control." },
    ],

    doctors: [
      { name:"Dr. Emma Watson", specialty:"Cosmetic Dentist", rating:4.9, image:"https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=80&auto=format&fit=crop&crop=face" },
    ],
  },

  // ── 3. Dental Implants ────────────────────────────────────────────────────
  {
    id:          "dental-implants",
    name:        "Dental Implants",
    category:    "Restorative",
    price:       18000,
    duration:    90,
    description: "Permanent titanium tooth replacement designed to restore natural chewing ability, speech, and aesthetics with a lifetime result.",
    image:       "https://images.unsplash.com/photo-1588776814546-1ffcf47267a5?w=800&auto=format&fit=crop",
    anaesthesia: "Local",

    benefits: [
      "Permanent, lifetime solution",
      "Looks and feels natural",
      "Preserves jawbone",
      "No adhesives or removal",
    ],

    stats: {
      successRate: "98%",
      recovery:    "2–5 days",
      visits:      "3",
    },

    includes: [
      "3D CT scan & treatment plan",
      "Titanium implant placement",
      "Custom porcelain crown",
      "Post-surgery care kit",
      "12-month follow-up",
    ],

    steps: [
      { title: "Consultation & scan",  desc: "Detailed 3D CT scan for precise implant positioning and bone analysis." },
      { title: "Implant placement",    desc: "Titanium implant inserted into the jawbone under local anaesthesia." },
      { title: "Healing phase",        desc: "3–6 months for osseointegration — the implant fuses with the bone." },
      { title: "Crown attachment",     desc: "Custom-shade porcelain crown placed for a natural finish." },
    ],

    faqs: [
      { q: "How long do implants last?",       a: "With proper care, dental implants can last a lifetime." },
      { q: "Am I a good candidate?",           a: "Most adults with healthy gums and adequate bone density qualify." },
      { q: "Is the procedure painful?",        a: "The procedure is done under local anaesthesia. Post-op discomfort is managed with medication." },
      { q: "Can I eat normally after?",        a: "Soft foods for 2 weeks post-surgery. Full chewing restored after crown placement." },
    ],

    doctors: [
      { name:"Dr. Michael Lee", specialty:"Implant Specialist", rating:4.8, image:"https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=80&auto=format&fit=crop&crop=face" },
    ],
  },

  // ── 4. Root Canal ─────────────────────────────────────────────────────────
  {
    id:          "root-canal",
    name:        "Root Canal Therapy",
    category:    "Endodontic",
    price:       6000,
    duration:    75,
    description: "Modern painless root canal treatment using rotary instrumentation to eliminate infection and save your natural tooth.",
    image:       "https://images.unsplash.com/photo-1629909613654-28e377c37b09?w=800&auto=format&fit=crop",
    anaesthesia: "Local",

    benefits: [
      "Saves your natural tooth",
      "Immediate pain relief",
      "Stops infection spread",
      "Painless with modern tech",
    ],

    stats: {
      successRate: "95%",
      recovery:    "1–2 days",
      visits:      "2",
    },

    includes: [
      "Digital X-ray imaging",
      "Pulp removal & canal shaping",
      "Antimicrobial disinfection",
      "Biocompatible sealing (gutta-percha)",
      "Post & core buildup",
    ],

    steps: [
      { title: "Diagnosis",         desc: "Digital X-ray and pulp vitality test to confirm infection depth." },
      { title: "Access & cleaning", desc: "Infected pulp tissue removed; canals shaped with rotary files." },
      { title: "Disinfection",      desc: "Canals irrigated with antimicrobial solution to eliminate bacteria." },
      { title: "Sealing",           desc: "Canals sealed with biocompatible gutta-percha; tooth rebuilt with a crown." },
    ],

    faqs: [
      { q: "Is root canal treatment painful?", a: "No. Modern techniques and effective anaesthesia make the procedure comfortable." },
      { q: "How many appointments needed?",    a: "Usually 2 visits — one for treatment, one for crown placement." },
      { q: "What if I delay treatment?",       a: "Infection can spread to adjacent teeth and jawbone. Early treatment is critical." },
    ],

    doctors: [
      { name:"Dr. Sarah Johnson", specialty:"Endodontist", rating:4.9, image:"https://images.unsplash.com/photo-1537368910025-700350fe46c7?w=80&auto=format&fit=crop&crop=face" },
    ],
  },

  // ── 5. Orthodontics ───────────────────────────────────────────────────────
  {
    id:          "orthodontics",
    name:        "Orthodontics",
    category:    "Orthodontic",
    price:       25000,
    duration:    45,
    description: "Invisible aligners and precision-fitted metal braces to straighten crowded, spaced, or misaligned teeth at any age.",
    image:       "https://images.unsplash.com/photo-1606811971618-4486d14f3f99?w=800&auto=format&fit=crop",
    anaesthesia: "None",

    benefits: [
      "Straightens teeth at any age",
      "Invisible aligner option",
      "Improves bite function",
      "Boosts confidence",
    ],

    stats: {
      successRate: "97%",
      recovery:    "None",
      visits:      "8–12",
    },

    includes: [
      "3D digital smile simulation",
      "Custom aligner fabrication",
      "Monthly progress reviews",
      "Retainer after treatment",
      "Emergency wire adjustment",
    ],

    steps: [
      { title: "Smile simulation",   desc: "3D scan and digital simulation shows your expected final result." },
      { title: "Aligner fitting",    desc: "Custom aligners or brackets fitted and bonded professionally." },
      { title: "Monthly reviews",    desc: "Regular check-ups every 4–6 weeks to monitor and adjust progress." },
      { title: "Retention phase",    desc: "Custom retainer provided to maintain your new alignment." },
    ],

    faqs: [
      { q: "How long does treatment take?",     a: "6–24 months depending on complexity. Mild cases with aligners can complete in 6 months." },
      { q: "Are invisible aligners effective?", a: "Yes, for most mild-to-moderate alignment issues. Severe cases may need braces." },
      { q: "Can adults get orthodontic treatment?", a: "Absolutely. We treat patients of all ages with tailored plans." },
    ],

    doctors: [
      { name:"Dr. Sarah Johnson", specialty:"Orthodontist", rating:4.9, image:"https://images.unsplash.com/photo-1537368910025-700350fe46c7?w=80&auto=format&fit=crop&crop=face" },
    ],
  },

  // ── 6. Cosmetic Veneers ───────────────────────────────────────────────────
  {
    id:          "cosmetic-veneers",
    name:        "Cosmetic Veneers",
    category:    "Cosmetic",
    price:       8500,
    duration:    120,
    description: "Ultra-thin porcelain shells bonded to the front surface of teeth to instantly transform colour, shape, and symmetry.",
    image:       "https://images.unsplash.com/photo-1606811841689-23dfddce3e95?w=800&auto=format&fit=crop",
    anaesthesia: "Local (minimal)",

    benefits: [
      "Instant smile transformation",
      "Natural translucent look",
      "Stain-resistant porcelain",
      "Minimal tooth reduction",
    ],

    stats: {
      successRate: "96%",
      recovery:    "None",
      visits:      "2",
    },

    includes: [
      "Digital smile design",
      "Teeth preparation & impression",
      "Temporary veneers",
      "Custom lab-fabricated porcelain",
      "Precision bonding",
    ],

    steps: [
      { title: "Digital smile design", desc: "We design your ideal smile digitally before any work begins." },
      { title: "Tooth preparation",    desc: "Minimal enamel removed to create space for the veneer thickness." },
      { title: "Temporary veneers",    desc: "Provisional veneers placed while lab fabricates your custom set." },
      { title: "Final bonding",        desc: "Porcelain veneers bonded with precision adhesive and cured." },
    ],

    faqs: [
      { q: "Are veneers permanent?",       a: "They last 10–15 years with care. Replacement involves a similar process." },
      { q: "Do veneers look natural?",     a: "Yes. Porcelain mimics the translucency of natural enamel very closely." },
      { q: "Can I whiten veneers?",        a: "Porcelain doesn't respond to whitening. The shade is set at fabrication." },
    ],

    doctors: [
      { name:"Dr. Emma Watson", specialty:"Cosmetic Dentist", rating:4.9, image:"https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=80&auto=format&fit=crop&crop=face" },
    ],
  },

  // ── 7. Dental Checkup ─────────────────────────────────────────────────────
  {
    id:          "dental-checkup",
    name:        "Dental Checkup",
    category:    "Preventive",
    price:       500,
    duration:    30,
    description: "Comprehensive oral examination with digital X-rays and personalised treatment planning — your complete oral health MOT.",
    image:       "https://images.unsplash.com/photo-1588776814546-1ffcf47267a5?w=800&auto=format&fit=crop",
    anaesthesia: "None",

    benefits: [
      "Early problem detection",
      "Oral cancer screening",
      "Personalised treatment plan",
      "Peace of mind",
    ],

    stats: {
      successRate: "100%",
      recovery:    "None",
      visits:      "1",
    },

    includes: [
      "Full mouth examination",
      "Digital bitewing X-rays",
      "Gum health assessment",
      "Oral cancer screening",
      "Personalised care plan",
    ],

    steps: [
      { title: "Clinical examination", desc: "Thorough check of all teeth, gums, jaw, and soft tissues." },
      { title: "Digital X-rays",       desc: "Low-radiation digital imaging to detect hidden decay and bone levels." },
      { title: "Gum assessment",       desc: "Probing to measure gum pocket depth and check for early disease." },
      { title: "Treatment planning",   desc: "Clear written plan with priorities, costs, and appointment scheduling." },
    ],

    faqs: [
      { q: "How often should I have a checkup?",  a: "Every 6 months for most people. High-risk patients may need quarterly visits." },
      { q: "Are X-rays safe?",                    a: "Digital X-rays use up to 90% less radiation than traditional film." },
      { q: "What if a problem is found?",         a: "We discuss findings immediately and book treatment at your convenience." },
    ],

    doctors: [
      { name:"Dr. Sarah Johnson", specialty:"General Dentist", rating:4.9, image:"https://images.unsplash.com/photo-1537368910025-700350fe46c7?w=80&auto=format&fit=crop&crop=face" },
      { name:"Dr. Michael Lee",   specialty:"General Dentist", rating:4.8, image:"https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=80&auto=format&fit=crop&crop=face" },
    ],
  },

  // ── 8. Gum Contouring ─────────────────────────────────────────────────────
  {
    id:          "gum-contouring",
    name:        "Gum Contouring",
    category:    "Periodontic",
    price:       4500,
    duration:    60,
    description: "Precision laser gum reshaping to balance your gumline, reduce excessive gum display, and reveal more of your natural smile.",
    image:       "https://images.unsplash.com/photo-1606811841689-23dfddce3e95?w=800&auto=format&fit=crop",
    anaesthesia: "Local",

    benefits: [
      "Balanced, symmetrical gumline",
      "Reduces 'gummy smile'",
      "Laser means less bleeding",
      "Fast healing",
    ],

    stats: {
      successRate: "97%",
      recovery:    "3–5 days",
      visits:      "1",
    },

    includes: [
      "Digital gumline design",
      "Laser tissue contouring",
      "Tissue sealing (no sutures)",
      "Healing gel application",
      "Post-op care instructions",
    ],

    steps: [
      { title: "Digital planning",   desc: "We map your ideal gumline digitally and show you the expected result." },
      { title: "Laser contouring",   desc: "Diode laser precisely removes excess gum tissue with minimal bleeding." },
      { title: "Sealing & healing",  desc: "Laser simultaneously seals blood vessels — no stitches required." },
      { title: "Post-care review",   desc: "Follow-up at 1 week to assess healing and final result." },
    ],

    faqs: [
      { q: "Does gum contouring hurt?",      a: "Local anaesthesia is used. Post-procedure tenderness resolves within 3–5 days." },
      { q: "Are the results permanent?",     a: "Yes, in most cases. Gum tissue does not regenerate after laser removal." },
      { q: "Can it fix a gummy smile?",      a: "Absolutely — it's one of the most effective treatments for excessive gum display." },
    ],

    doctors: [
      { name:"Dr. Emma Watson", specialty:"Periodontist", rating:4.9, image:"https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=80&auto=format&fit=crop&crop=face" },
    ],
  },
]

/* ── Helper used by dynamic route ── */
export function getServiceById(id: string): Service | undefined {
  return SERVICES.find(s => s.id === id)
}