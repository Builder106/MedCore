import { config as dotenvConfig } from 'dotenv';
import { z } from 'zod';

if (process.env.NODE_ENV !== 'test' && !process.env.VITEST) {
  dotenvConfig();
}

const Schema = z.object({
  PORT: z.coerce.number().default(3001),
  SESSION_SECRET: z.string().min(32).default('medcore-dev-session-secret-min-32-chars'),
  SESSION_MAX_AGE_DAYS: z.coerce.number().default(7),
  DATABASE_URL: z.string().optional(),
  WEB_PUSH_PUBLIC_KEY: z.string().optional(),
  WEB_PUSH_PRIVATE_KEY: z.string().optional(),
  WEB_PUSH_CONTACT: z.string().default('mailto:demo@medcore.local'),
  OPENAI_API_KEY: z.string().optional(),
  OPENROUTER_API_KEY: z.string().optional(),
  GROQ_API_KEY: z.string().optional(),
  DATABASE_ENCRYPTION_KEY: z.string().optional(),
  DAILY_API_KEY: z.string().optional(),
  DAILY_DOMAIN: z.string().optional(),
  AT_USERNAME: z.string().default('sandbox'),
  AT_API_KEY: z.string().optional(),
  AT_SENDER_ID: z.string().default('MEDCORE'),
  AUDIO_RETENTION_DAYS: z.coerce.number().default(30),
  SMS_RESPONSE_TTL_MS: z.coerce.number().default(120000),
  DEMO_DOCTOR_PIN: z.string().default('4242'),
  DEMO_PATIENT_PIN: z.string().default('1212'),
  DEMO_ADMIN_PIN: z.string().default('3434'),
  DEMO_DOCTOR_PHONE: z.string().optional(),
  DEMO_PATIENT_PHONE: z.string().optional(),
  DEMO_ADMIN_PHONE: z.string().optional(),
});

export const env = Schema.parse(process.env);
export type Env = typeof env;
