// ─────────────────────────────────────────────────────────────────────────────
// app.module.ts  — add AiModule to the imports array
// (Only the diff is shown below; your full app.module.ts stays the same)
// ─────────────────────────────────────────────────────────────────────────────

import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'

// …existing imports…
import { AiModule } from './ai/ai.module'

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),

    // …all your existing modules…
    // AuthModule,
    // PatientsModule,
    // AppointmentsModule,
    // BillingModule,
    // PrescriptionsModule,
    // ConsultationsModule,
    // LabModule,
    // StaffModule,
    // CheckinModule,
    // SettingsModule,
    // AnalyticsModule,

    AiModule,   // ← ADD THIS LINE
  ],
})
export class AppModule {}
