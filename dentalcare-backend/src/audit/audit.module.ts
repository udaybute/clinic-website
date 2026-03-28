// src/audit/audit.module.ts
import { Module } from '@nestjs/common';
import { AuditController } from './audit.controller';
import { AuditService } from './audit.service';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports:     [PrismaModule],
  controllers: [AuditController],
  providers:   [AuditService],
  exports:     [AuditService], // so other modules can call auditService.log()
})
export class AuditModule {}
