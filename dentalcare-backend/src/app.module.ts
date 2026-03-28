// src/app.module.ts
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { PatientsModule } from './patients/patients.module';
import { AppointmentsModule } from './appointments/appointments.module';
import { PrescriptionsModule } from './prescriptions/prescriptions.module';
import { ConsultationsModule } from './consultations/consultations.module';
import { BillingModule } from './billing/billing.module';
import { LabModule } from './lab/lab.module';
import { StaffModule } from './staff/staff.module';
import { AnalyticsModule } from './analytics/';
import { BookingModule } from './booking/booking.module';
import { AiModule } from './ai/ai.module';
import { ServicesModule } from './services/services.module';
import { AuditModule } from './audit/audit.module';
import { SettingsModule } from './settings/settings.module';
import { CheckinModule } from './checkin/checkin.module';
import { NotificationsModule } from './notifications/notifications.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    BookingModule,
    PatientsModule,
    AppointmentsModule,
    PrescriptionsModule,
    ConsultationsModule,
    BillingModule,
    LabModule,
    StaffModule,
    AnalyticsModule,
    AiModule,
    ServicesModule,
    AuditModule,
    SettingsModule,
    CheckinModule,
    NotificationsModule,
  ],
})
export class AppModule {}
