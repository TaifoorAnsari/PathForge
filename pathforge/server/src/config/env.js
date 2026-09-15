/**
 * Environment Configuration
 * 
 * Single source of truth for all environment variables.
 * Uses Zod to validate at startup — if any required var is missing,
 * the server crashes immediately with a clear error message.
 * 
 * WHY: Fail fast on startup, not at runtime when a user hits a code path
 * that tries to read a missing env var.
 */

const { z } = require('zod');
const dotenv = require('dotenv');
const path = require('path');

// Load .env file from the server root directory
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const envSchema = z.object({
  // App
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(5000),

  // Database
  MONGO_URI: z.string().min(1, 'MONGO_URI is required'),

  // Redis
  REDIS_URL: z.string().min(1, 'REDIS_URL is required'),

  // JWT
  JWT_ACCESS_SECRET: z.string().min(32, 'JWT_ACCESS_SECRET must be at least 32 characters'),
  JWT_REFRESH_SECRET: z.string().min(32, 'JWT_REFRESH_SECRET must be at least 32 characters'),
  JWT_ACCESS_EXPIRES: z.string().default('15m'),
  JWT_REFRESH_EXPIRES: z.string().default('30d'),

  // Gemini AI
  GEMINI_API_KEY: z.string().default(''),
  GEMINI_MODEL: z.string().default('gemini-3.6-flash'),

  // Cluster matching
  CLUSTER_MATCH_THRESHOLD: z.coerce.number().min(0).max(1).default(0.82),

  // Email
  EMAIL_PROVIDER_API_KEY: z.string().default(''),
  EMAIL_FROM_ADDRESS: z.string().email().default('noreply@pathforge.dev'),

  // Cloudinary
  CLOUDINARY_URL: z.string().default(''),

  // Client
  CLIENT_URL: z.string().default('http://localhost:5173'),

  // CORS
  CORS_ALLOWED_ORIGINS: z.string().default('http://localhost:5173'),

  // Sentry
  SENTRY_DSN: z.string().default(''),
});

// In test environment, automatically isolate database to pathforge_test so tests never wipe development accounts
const rawEnv = {
  ...process.env,
  MONGO_URI:
    process.env.NODE_ENV === 'test'
      ? (process.env.TEST_MONGO_URI || 'mongodb://localhost:27017/pathforge_test')
      : (process.env.MONGO_URI || 'mongodb://localhost:27017/pathforge'),
};

// Validate and parse — crashes on failure with descriptive errors
const parsed = envSchema.safeParse(rawEnv);

if (!parsed.success) {
  console.error('❌ Invalid environment variables:');
  console.error(parsed.error.flatten().fieldErrors);
  process.exit(1);
}

module.exports = { env: parsed.data };
