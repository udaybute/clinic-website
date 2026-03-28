import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';
import helmet from 'helmet';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Security headers — must be applied before any other middleware
  app.use(helmet());

  // Limit request body to 1 MB to prevent DoS via large payloads
  app.use(require('express').json({ limit: '1mb' }));
  app.use(require('express').urlencoded({ limit: '1mb', extended: true }));

  // All routes prefixed with /api — matches frontend NEXT_PUBLIC_API_URL
  app.setGlobalPrefix('api');

  // CORS — from architecture doc section 11.4
  if (!process.env.FRONTEND_URL && process.env.NODE_ENV === 'production') {
    throw new Error('Missing required environment variable: FRONTEND_URL');
  }
  app.enableCors({
    origin:      process.env.FRONTEND_URL ?? 'http://localhost:3000',
    credentials: true,
    methods:     ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  });

  // Auto-validate & strip unknown fields from all DTOs
  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, forbidNonWhitelisted: false }),
  );

  // Wrap every response in { success, message, data } envelope
  app.useGlobalInterceptors(new ResponseInterceptor());

  const port = process.env.PORT ?? 4000;
  await app.listen(port);
  console.log(`\n🦷 DentalCare backend running → http://localhost:${port}/api\n`);
}
bootstrap();