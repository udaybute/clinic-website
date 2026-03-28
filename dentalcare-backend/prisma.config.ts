// prisma.config.ts
import 'dotenv/config';
import path from 'path';
import { defineConfig, env } from 'prisma/config';

export default defineConfig({
  schema: path.join(__dirname, 'prisma/schema.prisma'),
  datasource: {
    url: env('DATABASE_URL'),
  },
  migrations: {
    seed: 'ts-node -r dotenv/config prisma/seed.ts',  // ← replace whatever is here
  },
});