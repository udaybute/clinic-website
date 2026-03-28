// src/consultations/consultations.module.ts
import { Module } from '@nestjs/common';
import { ConsultationsController } from './consultations.controller';
import { ConsultationsService }    from './consultations.service';
import { PrismaModule }            from '../../prisma/prisma.module';

@Module({
  imports:     [PrismaModule],
  controllers: [ConsultationsController],
  providers:   [ConsultationsService],
  exports:     [ConsultationsService],
})
export class ConsultationsModule {}