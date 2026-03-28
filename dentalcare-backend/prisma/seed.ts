// prisma/seed.ts
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import * as bcrypt from 'bcryptjs';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

const CLINIC_ID = 'clinic_001';

async function main() {
  console.log('🌱 Seeding database...\n');

  const hash = (pw: string) => bcrypt.hash(pw, 10);

  // ── Clinic ─────────────────────────────────────────────────────────────
  await prisma.clinic.upsert({
    where: { id: CLINIC_ID },
    update: {},
    create: {
      id: CLINIC_ID,
      name: 'DentalCare Smile Studio',
      email: 'clinic@dentalcare.in',
      phone: '9000000000',
      address: 'Mumbai, Maharashtra',
      website: 'https://dentalcare.in',
    },
  });
  console.log('✓ Clinic seeded');

  // ── Users ──────────────────────────────────────────────────────────────
  const [, doctor] = await Promise.all([
    prisma.user.upsert({
      where: { email: 'admin@dentalcare.in' },
      update: {},
      create: {
        name: 'Super Admin',
        email: 'admin@dentalcare.in',
        password: await hash('Admin@123'),
        role: 'admin',
        clinicId: CLINIC_ID,
      },
    }),
    prisma.user.upsert({
      where: { email: 'doctor@dentalcare.in' },
      update: {},
      create: {
        name: 'Dr. Sarah Johnson',
        email: 'doctor@dentalcare.in',
        password: await hash('Doctor@123'),
        role: 'doctor',
        clinicId: CLINIC_ID,
        specialty: 'General Dentistry',
      },
    }),
    prisma.user.upsert({
      where: { email: 'reception@dentalcare.in' },
      update: {},
      create: {
        name: 'Reception Staff',
        email: 'reception@dentalcare.in',
        password: await hash('Reception@123'),
        role: 'receptionist',
        clinicId: CLINIC_ID,
      },
    }),
  ]);
  console.log('✓ Users seeded');

  // ── Services ── ADDED: required for booking flow FK constraint ──────────
  // Without services in the DB, GET /api/booking/services returns [],
  // the frontend falls back to static IDs "1"–"6" which don't exist in DB,
  // and POST /api/booking/appointment throws P2003 FK violation.
  const servicesData = [
    {
      name: 'Teeth Cleaning',
      description:
        'Professional scaling & polishing to remove plaque and keep gums healthy.',
      duration: 45,
      price: 800,
      category: 'Preventive',
      popular: false,
      icon: '🦷',
    },
    {
      name: 'Teeth Whitening',
      description:
        'Advanced laser whitening for a noticeably brighter smile in one session.',
      duration: 60,
      price: 3500,
      category: 'Cosmetic',
      popular: true,
      icon: '✨',
    },
    {
      name: 'Dental Implants',
      description:
        'Permanent titanium implants that look, feel, and function like natural teeth.',
      duration: 90,
      price: 18000,
      category: 'Restorative',
      popular: false,
      icon: '🔩',
    },
    {
      name: 'Root Canal',
      description:
        'Painless endodontic treatment to save infected teeth using modern rotary tools.',
      duration: 75,
      price: 6000,
      category: 'Endodontic',
      popular: false,
      icon: '💉',
    },
    {
      name: 'Orthodontics',
      description:
        'Invisible aligners and metal braces tailored to create your perfect alignment.',
      duration: 45,
      price: 25000,
      category: 'Orthodontic',
      popular: true,
      icon: '😁',
    },
    {
      name: 'Cosmetic Veneers',
      description:
        'Ultra-thin porcelain shells bonded to the front of teeth for a flawless finish.',
      duration: 120,
      price: 8500,
      category: 'Cosmetic',
      popular: false,
      icon: '💎',
    },
    {
      name: 'Dental Checkup',
      description:
        'Comprehensive oral examination with X-rays and personalised treatment planning.',
      duration: 30,
      price: 500,
      category: 'Preventive',
      popular: false,
      icon: '🩺',
    },
    {
      name: 'Gum Contouring',
      description:
        'Laser gum reshaping to balance your gumline and reveal more of your smile.',
      duration: 60,
      price: 4500,
      category: 'Periodontic',
      popular: false,
      icon: '🔬',
    },
  ];

  for (const s of servicesData) {
    // Use name as a stable natural key for upsert
    const existing = await prisma.service.findFirst({
      where: { clinicId: CLINIC_ID, name: s.name },
    });
    if (!existing) {
      await prisma.service.create({
        data: { ...s, clinicId: CLINIC_ID, isActive: true },
      });
    }
  }
  console.log('✓ Services seeded');

  // ── Patients ───────────────────────────────────────────────────────────
  const patient1 = await prisma.patient.upsert({
    where: { id: 'patient_001' },
    update: {},
    create: {
      id: 'patient_001',
      clinicId: CLINIC_ID,
      name: 'Rahul Sharma',
      email: 'rahul@example.com',
      phone: '9876543210',
      dob: new Date('1990-05-15'),
      gender: 'male',
      address: 'Mumbai, Maharashtra',
      totalVisits: 3,
      lastVisit: new Date(),
      bloodGroup: 'O+',
      allergies: ['Penicillin'],
      currentMedications: [],
      medicalHistory: 'Mild hypertension',
    },
  });

  const patient2 = await prisma.patient.upsert({
    where: { id: 'patient_002' },
    update: {},
    create: {
      id: 'patient_002',
      clinicId: CLINIC_ID,
      name: 'Priya Patel',
      email: 'priya@example.com',
      phone: '9988776655',
      dob: new Date('1995-11-20'),
      gender: 'female',
      address: 'Pune, Maharashtra',
      totalVisits: 1,
      lastVisit: new Date(),
      bloodGroup: 'A+',
      allergies: [],
      currentMedications: [],
    },
  });
  console.log('✓ Patients seeded');

  // ── Appointments ───────────────────────────────────────────────────────
  const appt1 = await prisma.appointment.create({
    data: {
      clinicId: CLINIC_ID,
      patientId: patient1.id,
      doctorId: doctor.id,
      date: new Date(),
      time: '10:00',
      duration: 30,
      status: 'pending',
      amount: 800,
    },
  });

  const appt2 = await prisma.appointment.create({
    data: {
      clinicId: CLINIC_ID,
      patientId: patient2.id,
      doctorId: doctor.id,
      date: new Date(),
      time: '11:00',
      duration: 45,
      status: 'completed',
      amount: 1500,
      clinicalNotes: 'Root canal completed. Prescribed antibiotics.',
    },
  });
  console.log('✓ Appointments seeded');

  // ── Prescriptions ──────────────────────────────────────────────────────
  await prisma.prescription.create({
    data: {
      clinicId: CLINIC_ID,
      patientId: patient2.id,
      doctorId: doctor.id,
      appointmentId: appt2.id,
      diagnosis: 'Post root canal infection prevention',
      labTests: ['Complete Blood Count'],
      medicines: {
        create: [
          {
            name: 'Amoxicillin',
            dosage: '500mg',
            frequency: 'Twice daily',
            duration: '5 days',
          },
          {
            name: 'Ibuprofen',
            dosage: '400mg',
            frequency: 'Thrice daily after meals',
            duration: '3 days',
            notes: 'Take with food',
          },
        ],
      },
    },
  });
  console.log('✓ Prescriptions seeded');

  // ── Lab Requests ───────────────────────────────────────────────────────
  await prisma.labRequest.create({
    data: {
      clinicId: CLINIC_ID,
      patientId: patient2.id,
      doctorId: doctor.id,
      testName: 'Complete Blood Count',
      status: 'pending',
    },
  });
  console.log('✓ Lab requests seeded');

  // ── Bills ──────────────────────────────────────────────────────────────
  const subtotal = 1500;
  const discount = 100;
  const tax = 18;
  const total = subtotal - discount + (subtotal * tax) / 100;

  await prisma.bill.create({
    data: {
      clinicId: CLINIC_ID,
      patientId: patient2.id,
      appointmentId: appt2.id,
      subtotal,
      discount,
      tax,
      total,
      paid: total,
      balance: 0,
      status: 'paid',
      paymentMethod: 'cash',
      items: {
        create: [
          {
            description: 'Root Canal Treatment',
            quantity: 1,
            rate: 1200,
            amount: 1200,
          },
          { description: 'X-Ray', quantity: 1, rate: 300, amount: 300 },
        ],
      },
    },
  });
  console.log('✓ Bills seeded');

  console.log(`
✅ Seed complete!

Demo credentials:
  Admin        → admin@dentalcare.in      / Admin@123
  Doctor       → doctor@dentalcare.in     / Doctor@123
  Receptionist → reception@dentalcare.in  / Reception@123
  `);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
