// lib/rxTemplates.ts
// Common dental procedure prescription templates
// Speeds up prescription writing with one-click pre-fills

export interface RxDrug {
  genericName:   string
  brandName:     string
  strength:      string
  dose:          string
  frequency:     string
  duration:      string
  foodInstruction: string
  notes:         string
  medicineId:    string
}

export interface RxTemplate {
  id:           string
  name:         string
  category:     string
  description:  string
  indication:   string
  drugs:        RxDrug[]
  instructions: string   // patient instructions
  followUp:     string   // follow-up advice
  icon:         string
}

export const RX_TEMPLATES: RxTemplate[] = [
  // ─── EXTRACTIONS ─────────────────────────────────────────────────────────

  {
    id: "simple-extraction",
    name: "Simple Extraction",
    category: "Extraction",
    description: "Post simple extraction pain & infection prophylaxis",
    indication: "Simple tooth extraction — no complications",
    icon: "🦷",
    drugs: [
      {
        medicineId: "amoxicillin",
        genericName: "Amoxicillin",
        brandName: "Mox / Novamox",
        strength: "500mg",
        dose: "1 capsule",
        frequency: "Three times daily (TDS)",
        duration: "5 days",
        foodInstruction: "After meals",
        notes: "Complete the full course",
      },
      {
        medicineId: "ibuprofen",
        genericName: "Ibuprofen",
        brandName: "Brufen",
        strength: "400mg",
        dose: "1 tablet",
        frequency: "Three times daily (TDS)",
        duration: "3 days",
        foodInstruction: "After meals",
        notes: "Take for pain. Do not exceed 3 tablets in 24 hours",
      },
      {
        medicineId: "chlorhexidine",
        genericName: "Chlorhexidine Gluconate 0.2%",
        brandName: "Hexidine",
        strength: "0.2% mouthwash",
        dose: "15 mL, rinse 30 seconds",
        frequency: "Twice daily (BD)",
        duration: "7 days",
        foodInstruction: "After meals — do not swallow",
        notes: "Start the day after extraction. Do not rinse on the day of extraction",
      },
    ],
    instructions:
      "• Bite on gauze for 30 minutes after procedure\n• No spitting, rinsing, or smoking for 24 hours\n• Soft foods and cold liquids for 24 hours\n• Ice pack on cheek 20 min on / 20 min off for first 6 hours\n• No hot beverages for 24 hours\n• Sleep with head slightly elevated",
    followUp: "Review in 7 days. Contact immediately if severe pain, bleeding, or fever develops.",
  },
  {
    id: "surgical-extraction",
    name: "Surgical / Impacted Wisdom Tooth Extraction",
    category: "Extraction",
    description: "Post-surgical extraction (impacted 3rd molar) with anti-oedema cover",
    indication: "Surgical removal of impacted wisdom tooth",
    icon: "⚕️",
    drugs: [
      {
        medicineId: "amoxicillin-clavulanate",
        genericName: "Amoxicillin + Clavulanate",
        brandName: "Augmentin",
        strength: "625mg",
        dose: "1 tablet",
        frequency: "Twice daily (BD)",
        duration: "7 days",
        foodInstruction: "With first bite of meal",
        notes: "Take with food to reduce GI side effects",
      },
      {
        medicineId: "metronidazole",
        genericName: "Metronidazole",
        brandName: "Flagyl",
        strength: "400mg",
        dose: "1 tablet",
        frequency: "Three times daily (TDS)",
        duration: "5 days",
        foodInstruction: "After meals",
        notes: "STRICTLY avoid alcohol during and 48 hours after course",
      },
      {
        medicineId: "diclofenac",
        genericName: "Diclofenac Sodium",
        brandName: "Voveran",
        strength: "50mg",
        dose: "1 tablet",
        frequency: "Twice daily (BD)",
        duration: "5 days",
        foodInstruction: "After meals",
        notes: "For pain and inflammation",
      },
      {
        medicineId: "dexamethasone",
        genericName: "Dexamethasone",
        brandName: "Dexona",
        strength: "4mg",
        dose: "1 tablet",
        frequency: "Once daily (OD)",
        duration: "3 days",
        foodInstruction: "After breakfast",
        notes: "Reduces post-surgical swelling. Take in morning only",
      },
      {
        medicineId: "omeprazole",
        genericName: "Omeprazole",
        brandName: "Omez",
        strength: "20mg",
        dose: "1 capsule",
        frequency: "Once daily (OD)",
        duration: "7 days",
        foodInstruction: "30 min before breakfast",
        notes: "Gastric protection while on NSAIDs and steroids",
      },
      {
        medicineId: "chlorhexidine",
        genericName: "Chlorhexidine Gluconate 0.2%",
        brandName: "Hexidine",
        strength: "0.2% mouthwash",
        dose: "15 mL, rinse 30 seconds",
        frequency: "Twice daily (BD)",
        duration: "14 days",
        foodInstruction: "After meals — do not swallow",
        notes: "Crucial for surgical site hygiene",
      },
    ],
    instructions:
      "• Bite on gauze 45 minutes. Keep head elevated\n• Ice pack: 20 min on / 20 min off for 48 hours\n• No spitting, rinsing, smoking, or straws for 24 hours\n• Soft diet for 5-7 days — no seeds/nuts\n• Avoid vigorous exercise for 3 days\n• Do not touch the surgical area with fingers or tongue",
    followUp: "Suture removal in 7 days. Contact immediately for severe pain after day 3 (dry socket), trismus, or fever above 38.5°C.",
  },

  // ─── ROOT CANAL TREATMENT ────────────────────────────────────────────────

  {
    id: "rct-acute",
    name: "Root Canal — Acute Pulpitis/Abscess",
    category: "Endodontics",
    description: "Antibiotic + analgesic cover for acute dental abscess / irreversible pulpitis",
    indication: "Acute apical abscess or irreversible pulpitis with systemic signs",
    icon: "🔬",
    drugs: [
      {
        medicineId: "amoxicillin",
        genericName: "Amoxicillin",
        brandName: "Mox",
        strength: "500mg",
        dose: "1 capsule",
        frequency: "Three times daily (TDS)",
        duration: "5 days",
        foodInstruction: "After meals",
        notes: "",
      },
      {
        medicineId: "metronidazole",
        genericName: "Metronidazole",
        brandName: "Flagyl",
        strength: "400mg",
        dose: "1 tablet",
        frequency: "Three times daily (TDS)",
        duration: "5 days",
        foodInstruction: "After meals",
        notes: "Avoid alcohol completely during course",
      },
      {
        medicineId: "ibuprofen",
        genericName: "Ibuprofen",
        brandName: "Brufen",
        strength: "400mg",
        dose: "1 tablet",
        frequency: "Three times daily (TDS)",
        duration: "3 days",
        foodInstruction: "After meals",
        notes: "Take regularly for first 2 days for sustained pain control",
      },
      {
        medicineId: "paracetamol",
        genericName: "Paracetamol",
        brandName: "Dolo 650",
        strength: "650mg",
        dose: "1 tablet",
        frequency: "Three times daily (TDS)",
        duration: "3 days",
        foodInstruction: "After meals",
        notes: "Alternate with Ibuprofen if needed (stagger by 3 hours)",
      },
    ],
    instructions:
      "• Avoid chewing on the treated tooth until final restoration\n• Do not bite hard foods\n• If prescribed temporary filling: avoid sticky foods\n• Call if pain significantly worsens after 48 hours",
    followUp: "Continue RCT in 3-5 days once acute phase resolves. Emergency contact available if pain is unmanageable.",
  },
  {
    id: "rct-post-op",
    name: "Root Canal — Post-treatment",
    category: "Endodontics",
    description: "Post RCT pain and inflammation management",
    indication: "After root canal treatment session — inflammatory pain expected",
    icon: "🦷",
    drugs: [
      {
        medicineId: "ibuprofen",
        genericName: "Ibuprofen",
        brandName: "Brufen",
        strength: "400mg",
        dose: "1 tablet",
        frequency: "Three times daily (TDS)",
        duration: "3 days",
        foodInstruction: "After meals",
        notes: "",
      },
      {
        medicineId: "paracetamol",
        genericName: "Paracetamol",
        brandName: "Crocin",
        strength: "500mg",
        dose: "1-2 tablets",
        frequency: "Three times daily (TDS)",
        duration: "3 days",
        foodInstruction: "After meals",
        notes: "",
      },
    ],
    instructions:
      "• Some discomfort and sensitivity for 2-3 days is normal\n• Avoid chewing on the treated side until crown placement\n• Temporary filling may feel slightly different — normal",
    followUp: "Crown preparation appointment scheduled. Call if severe pain or swelling develops.",
  },

  // ─── PERIODONTOLOGY ───────────────────────────────────────────────────────

  {
    id: "periodontitis-acute",
    name: "Acute Necrotising Gingivitis (ANUG)",
    category: "Periodontics",
    description: "ANUG / ANUP treatment — antibiotic + antiseptic protocol",
    indication: "Acute Necrotising Ulcerative Gingivitis/Periodontitis",
    icon: "🦠",
    drugs: [
      {
        medicineId: "metronidazole",
        genericName: "Metronidazole",
        brandName: "Flagyl",
        strength: "400mg",
        dose: "1 tablet",
        frequency: "Three times daily (TDS)",
        duration: "5 days",
        foodInstruction: "After meals",
        notes: "Drug of choice for ANUG. No alcohol during course",
      },
      {
        medicineId: "amoxicillin",
        genericName: "Amoxicillin",
        brandName: "Mox",
        strength: "500mg",
        dose: "1 capsule",
        frequency: "Three times daily (TDS)",
        duration: "5 days",
        foodInstruction: "After meals",
        notes: "Synergistic with Metronidazole for fusospirochaetal infection",
      },
      {
        medicineId: "chlorhexidine",
        genericName: "Chlorhexidine Gluconate 0.2%",
        brandName: "Hexidine",
        strength: "0.2% mouthwash",
        dose: "15 mL, rinse 1 minute",
        frequency: "Three times daily (TDS)",
        duration: "14 days",
        foodInstruction: "After meals",
        notes: "Critical — use after every meal",
      },
      {
        medicineId: "vitamin-c",
        genericName: "Ascorbic Acid (Vitamin C)",
        brandName: "Limcee",
        strength: "500mg",
        dose: "1 tablet",
        frequency: "Twice daily (BD)",
        duration: "30 days",
        foodInstruction: "After meals",
        notes: "Nutritional support for tissue repair",
      },
    ],
    instructions:
      "• Do NOT smoke — critical for healing\n• Soft diet during treatment\n• Warm saline rinses additionally (1/2 tsp salt in warm water, 4x/day)\n• Maintain oral hygiene carefully with soft brush\n• Nutritious diet essential for recovery",
    followUp: "Review in 5 days. Debridement and root planing once acute phase resolves.",
  },
  {
    id: "periodontitis-chronic",
    name: "Chronic Periodontitis — Post Scaling",
    category: "Periodontics",
    description: "Post full-mouth debridement antimicrobial adjunct",
    indication: "Moderate-severe chronic periodontitis after scaling and root planing",
    icon: "🔬",
    drugs: [
      {
        medicineId: "doxycycline",
        genericName: "Doxycycline",
        brandName: "Doxin",
        strength: "100mg",
        dose: "1 tablet",
        frequency: "Once daily (OD)",
        duration: "7 days",
        foodInstruction: "After meals — sit upright for 30 min",
        notes: "Anti-collagenase effect improves periodontal attachment. Avoid sun exposure",
      },
      {
        medicineId: "chlorhexidine",
        genericName: "Chlorhexidine Gluconate 0.2%",
        brandName: "Hexidine",
        strength: "0.2% mouthwash",
        dose: "10 mL, rinse 1 minute",
        frequency: "Twice daily (BD)",
        duration: "14 days",
        foodInstruction: "After meals",
        notes: "Start after scaling appointment. Temporary staining is expected",
      },
    ],
    instructions:
      "• Gentle brushing with soft brush BD — modify technique as instructed\n• Interdental cleaning daily\n• Temporary sensitivity after scaling is normal\n• Some mild bleeding may occur during brushing for 2-3 days",
    followUp: "Periodontal re-evaluation in 6-8 weeks. Supportive periodontal therapy every 3 months.",
  },

  // ─── ORAL LESIONS ─────────────────────────────────────────────────────────

  {
    id: "aphthous-ulcer",
    name: "Recurrent Aphthous Ulcers",
    category: "Oral Medicine",
    description: "Topical and systemic treatment for recurrent aphthous stomatitis",
    indication: "Minor aphthous ulcers (canker sores)",
    icon: "💊",
    drugs: [
      {
        medicineId: "triamcinolone-topical",
        genericName: "Triamcinolone Acetonide 0.1% in Orabase",
        brandName: "Kenacort-A",
        strength: "0.1% paste",
        dose: "Apply thin film",
        frequency: "Three times daily (TDS)",
        duration: "7 days",
        foodInstruction: "After meals and at bedtime — gently dab, do not rub",
        notes: "Most effective when applied at onset. Reduces duration and pain",
      },
      {
        medicineId: "lidocaine-gel",
        genericName: "Lignocaine 2% Gel",
        brandName: "Xylocaine Gel",
        strength: "2% gel",
        dose: "Apply small amount",
        frequency: "As needed (SOS)",
        duration: "As required",
        foodInstruction: "Apply before meals to reduce pain while eating",
        notes: "Temporary pain relief only — 15-20 minute effect",
      },
      {
        medicineId: "vitamin-b12",
        genericName: "Methylcobalamin",
        brandName: "Mecobalamin 500",
        strength: "500mcg",
        dose: "1 tablet",
        frequency: "Twice daily (BD)",
        duration: "30 days",
        foodInstruction: "After meals",
        notes: "Reduces recurrence frequency with long-term use",
      },
      {
        medicineId: "folic-acid",
        genericName: "Folic Acid",
        brandName: "Folvite",
        strength: "5mg",
        dose: "1 tablet",
        frequency: "Once daily (OD)",
        duration: "30 days",
        foodInstruction: "After meals",
        notes: "Deficiency associated with recurrent ulcers",
      },
    ],
    instructions:
      "• Keep area clean and dry before applying paste\n• Soft diet and avoid spicy/acidic foods\n• Avoid SLS (sodium lauryl sulphate) toothpastes\n• Contact if ulcer does not heal within 3 weeks",
    followUp: "If ulcers recur frequently (>3/year), investigate for haematological deficiencies, celiac disease, or immune disorder.",
  },
  {
    id: "oral-candidiasis",
    name: "Oral Candidiasis (Thrush)",
    category: "Oral Medicine",
    description: "Antifungal protocol for oral candidiasis / denture stomatitis",
    indication: "Oropharyngeal candidiasis, angular cheilitis, denture stomatitis",
    icon: "🔬",
    drugs: [
      {
        medicineId: "fluconazole",
        genericName: "Fluconazole",
        brandName: "Forcan",
        strength: "150mg",
        dose: "1 capsule",
        frequency: "Once daily (OD)",
        duration: "7 days",
        foodInstruction: "With or without food",
        notes: "Loading dose 200mg on Day 1 if severe",
      },
      {
        medicineId: "clotrimazole",
        genericName: "Clotrimazole 1% Gel",
        brandName: "Candid Mouth Paint",
        strength: "1% gel",
        dose: "Apply small amount",
        frequency: "Four times daily (QID)",
        duration: "14 days",
        foodInstruction: "After meals and at bedtime",
        notes: "Apply to affected areas in mouth. Continue 48h after symptoms clear",
      },
    ],
    instructions:
      "• Clean dentures with antifungal solution (denture brush + Nystatin) overnight\n• Leave dentures out at night during treatment\n• Rinse mouth after using inhalers (steroid inhaler users)\n• Identify and address predisposing factors (xerostomia, antibiotics, immune status)",
    followUp: "Review in 2 weeks. Persistent candidiasis warrants investigation for diabetes, immunocompromise, or HIV.",
  },
  {
    id: "herpes-labialis",
    name: "Herpes Labialis (Cold Sores)",
    category: "Oral Medicine",
    description: "Antiviral treatment for primary or recurrent herpes labialis",
    indication: "Herpes labialis / primary herpetic gingivostomatitis",
    icon: "💊",
    drugs: [
      {
        medicineId: "valacyclovir",
        genericName: "Valacyclovir",
        brandName: "Valcivir",
        strength: "1000mg",
        dose: "1 tablet",
        frequency: "Twice daily (BD)",
        duration: "7 days",
        foodInstruction: "With or without food",
        notes: "Most effective when started within 72 hours of prodrome. For cold sore: 2g BD × 1 day (single-day therapy)",
      },
    ],
    instructions:
      "• Start medication immediately at tingling/prodrome phase for best effect\n• Avoid direct contact with lesions to prevent spread\n• Apply petroleum jelly to prevent crusting\n• Avoid kissing / sharing utensils during active outbreak\n• Sun protection (SPF 30+ lip balm) to reduce trigger",
    followUp: "Frequent recurrences (>6/year): consider suppressive therapy Valacyclovir 500mg OD.",
  },
  {
    id: "lichen-planus",
    name: "Oral Lichen Planus",
    category: "Oral Medicine",
    description: "Corticosteroid management of symptomatic oral lichen planus",
    indication: "Symptomatic erosive or reticular oral lichen planus",
    icon: "🔬",
    drugs: [
      {
        medicineId: "triamcinolone-topical",
        genericName: "Triamcinolone Acetonide 0.1%",
        brandName: "Kenacort-A Orabase",
        strength: "0.1% paste",
        dose: "Apply thin film",
        frequency: "Three times daily (TDS)",
        duration: "14 days",
        foodInstruction: "After meals and at bedtime",
        notes: "For localised lesions. First-line topical therapy",
      },
      {
        medicineId: "prednisolone",
        genericName: "Prednisolone",
        brandName: "Wysolone",
        strength: "20mg",
        dose: "1 tablet",
        frequency: "Once daily (OD)",
        duration: "7 days",
        foodInstruction: "After breakfast",
        notes: "For severe erosive/widespread lesions only. Taper over 2 weeks",
      },
    ],
    instructions:
      "• Avoid spicy, acidic, and rough-textured foods\n• Maintain excellent oral hygiene with soft brush\n• Avoid SLS toothpastes\n• Oral lichen planus requires long-term monitoring — small risk of malignant transformation",
    followUp: "Biopsy to confirm diagnosis if not done. 6-monthly surveillance. Refer to oral medicine specialist for refractory cases.",
  },

  // ─── IMPLANTS & SURGERY ───────────────────────────────────────────────────

  {
    id: "dental-implant",
    name: "Dental Implant Surgery",
    category: "Implantology",
    description: "Pre- and post-implant surgical antibiotic and supportive care",
    indication: "Dental implant placement",
    icon: "🏥",
    drugs: [
      {
        medicineId: "amoxicillin-clavulanate",
        genericName: "Amoxicillin + Clavulanate",
        brandName: "Augmentin",
        strength: "625mg",
        dose: "1 tablet",
        frequency: "Twice daily (BD)",
        duration: "7 days",
        foodInstruction: "With food",
        notes: "Start 1 hour before procedure for prophylaxis. Continue post-op",
      },
      {
        medicineId: "metronidazole",
        genericName: "Metronidazole",
        brandName: "Flagyl",
        strength: "400mg",
        dose: "1 tablet",
        frequency: "Three times daily (TDS)",
        duration: "5 days",
        foodInstruction: "After meals",
        notes: "Anaerobic coverage essential for implant integration",
      },
      {
        medicineId: "diclofenac",
        genericName: "Diclofenac Sodium",
        brandName: "Voveran SR",
        strength: "100mg SR",
        dose: "1 tablet",
        frequency: "Once daily (OD)",
        duration: "5 days",
        foodInstruction: "After meals",
        notes: "",
      },
      {
        medicineId: "dexamethasone",
        genericName: "Dexamethasone",
        brandName: "Dexona",
        strength: "4mg",
        dose: "1 tablet",
        frequency: "Once daily (OD)",
        duration: "3 days",
        foodInstruction: "After breakfast",
        notes: "Reduce peri-implant oedema and trismus",
      },
      {
        medicineId: "calcium-vitamin-d",
        genericName: "Calcium + Vitamin D3",
        brandName: "Shelcal",
        strength: "500mg/250IU",
        dose: "1 tablet",
        frequency: "Twice daily (BD)",
        duration: "90 days",
        foodInstruction: "After meals",
        notes: "Essential for osseointegration. Continue for 3 months",
      },
      {
        medicineId: "chlorhexidine",
        genericName: "Chlorhexidine Gluconate 0.2%",
        brandName: "Hexidine",
        strength: "0.2% mouthwash",
        dose: "15 mL, rinse 1 minute",
        frequency: "Twice daily (BD)",
        duration: "14 days",
        foodInstruction: "After meals",
        notes: "DO NOT brush surgical area. Use mouthwash only around implant site",
      },
    ],
    instructions:
      "• No smoking — critical for osseointegration success\n• Soft diet for minimum 2 weeks\n• Keep head elevated for 48 hours\n• Avoid strenuous exercise for 5 days\n• Do not disturb the surgical site — no probing or prodding",
    followUp: "Suture removal in 10 days. Osseointegration assessment at 3-6 months. No loading until integration confirmed.",
  },

  // ─── PAEDIATRIC DENTISTRY ─────────────────────────────────────────────────

  {
    id: "paediatric-extraction",
    name: "Paediatric Extraction",
    category: "Paediatric Dentistry",
    description: "Post-extraction for children — weight-adjusted analgesics",
    indication: "Simple extraction in children (adjust dose by weight)",
    icon: "👶",
    drugs: [
      {
        medicineId: "paracetamol",
        genericName: "Paracetamol",
        brandName: "Calpol Syrup",
        strength: "120mg/5mL",
        dose: "15 mg/kg per dose (5 mL for 10kg child)",
        frequency: "Three times daily (TDS)",
        duration: "3 days",
        foodInstruction: "After meals",
        notes: "Max 60mg/kg/day. Do not exceed adult dose",
      },
      {
        medicineId: "ibuprofen",
        genericName: "Ibuprofen",
        brandName: "Brufen Syrup",
        strength: "100mg/5mL",
        dose: "10 mg/kg per dose",
        frequency: "Three times daily (TDS)",
        duration: "3 days",
        foodInstruction: "After meals",
        notes: "For children > 6 months. Can alternate with paracetamol",
      },
    ],
    instructions:
      "• Child should not rinse for 24 hours\n• Soft diet and cold liquids for 24 hours\n• Keep hands away from mouth\n• Watch for bleeding — apply clean gauze and press gently",
    followUp: "Review in 1 week. Space maintainer consideration if premature primary tooth loss.",
  },

  // ─── ENDOCARDITIS PROPHYLAXIS ─────────────────────────────────────────────

  {
    id: "endocarditis-prophylaxis",
    name: "Infective Endocarditis Prophylaxis",
    category: "Medical Considerations",
    description: "Pre-procedure antibiotic prophylaxis for high-risk cardiac patients",
    indication: "High cardiac risk patients before invasive dental procedure (AHA guidelines)",
    icon: "❤️",
    drugs: [
      {
        medicineId: "amoxicillin",
        genericName: "Amoxicillin",
        brandName: "Amoxil",
        strength: "2000mg (2g)",
        dose: "4 capsules (500mg each)",
        frequency: "Stat (single dose)",
        duration: "1 day",
        foodInstruction: "30-60 minutes before procedure",
        notes: "Single pre-procedure dose only. For penicillin-allergic patients: Clindamycin 600mg or Azithromycin 500mg single dose",
      },
    ],
    instructions:
      "• One dose only — 30-60 minutes before the dental procedure\n• Document cardiac condition in notes\n• Confirm with cardiologist if unsure about risk classification\n• High-risk conditions: prosthetic heart valves, prior endocarditis, congenital heart disease (unrepaired)",
    followUp: "No follow-up required for prophylaxis itself. Continue monitoring primary cardiac condition.",
  },
]

export function getTemplatesByCategory(category: string): RxTemplate[] {
  return RX_TEMPLATES.filter(t => t.category === category)
}

export function getTemplateById(id: string): RxTemplate | undefined {
  return RX_TEMPLATES.find(t => t.id === id)
}

export const TEMPLATE_CATEGORIES = [
  "Extraction",
  "Endodontics",
  "Periodontics",
  "Oral Medicine",
  "Implantology",
  "Paediatric Dentistry",
  "Medical Considerations",
]
