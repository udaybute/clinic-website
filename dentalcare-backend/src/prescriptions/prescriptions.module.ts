// src/prescriptions/prescriptions.module.ts
import { Module } from '@nestjs/common';
import { PrescriptionsController } from './prescriptions.controller';
import { PrescriptionsService }    from './prescriptions.service';
// FIXED: 'prisma/prisma.module' → '../../prisma/prisma.module'
import { PrismaModule }            from '../../prisma/prisma.module';

@Module({
  imports:     [PrismaModule],
  controllers: [PrescriptionsController],
  providers:   [PrescriptionsService],
  exports:     [PrescriptionsService],
})
export class PrescriptionsModule {}