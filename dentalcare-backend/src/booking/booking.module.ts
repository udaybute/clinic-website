// src/booking/booking.module.ts
// Public booking module — NO auth guards on any endpoint.
// These routes are intentionally unauthenticated so patients
// can book without logging in to the clinic dashboard.

import { Module } from '@nestjs/common';
import { BookingController } from './booking.controller';
import { BookingService } from './booking.service';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [BookingController],
  providers: [BookingService],
})
export class BookingModule {}
