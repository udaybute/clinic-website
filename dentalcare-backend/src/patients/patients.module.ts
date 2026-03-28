// src/patients/patients.module.ts
import { Module } from '@nestjs/common';
import { PatientsController } from './patients.controller';
import { PatientsService } from './patients.service';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [PatientsController],
  providers: [PatientsService],
  exports: [PatientsService], // exported for use by appointments, billing etc.
})
export class PatientsModule {}
