// src/common/utils/sanitize-patient.ts
// Strips confidential medical fields from patient objects for non-doctor roles.
// Called in patients.controller.ts before returning data.

export const MEDICAL_ONLY_FIELDS = [
  'bloodGroup',
  'medicalHistory',
  'allergies',
  'currentMedications',
  'doctorNotes',
  'prescriptions',
  'consultations',
  'labRequests',
  'labResults',
  'vitals',
  'diagnosis',
  'treatment',
  'symptoms',
  'examination',
  'chiefComplaint',
  'clinicalNotes',
] as const;

export type MedicalField = (typeof MEDICAL_ONLY_FIELDS)[number];

/**
 * Strip medical fields from a single patient for non-doctor roles.
 * Always returns a plain object (not a Prisma model) to avoid leaking extras.
 */
export function sanitizePatient(patient: any, role: string): any {
  if (!patient) return patient;
  if (role === 'doctor') return patient;

  const safe = { ...patient };
  for (const field of MEDICAL_ONLY_FIELDS) {
    delete safe[field];
  }
  return safe;
}

/**
 * Strip medical fields from an array of patients.
 */
export function sanitizePatients(patients: any[], role: string): any[] {
  if (role === 'doctor') return patients;
  return patients.map(p => sanitizePatient(p, role));
}