import { z } from 'zod';

/**
 * Environment configuration schema
 */
export const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  // x.ai / Grok API
  XAI_API_KEY: z.string().optional(),
  XAI_BASE_URL: z.string().default('https://api.x.ai/v1'),
  XAI_MODEL: z.string().default('grok-beta'),
  // X API v2 Credentials
  X_API_KEY: z.string().optional(),
  X_API_KEY_SECRET: z.string().optional(),
  X_ACCESS_TOKEN: z.string().optional(),
  X_ACCESS_TOKEN_SECRET: z.string().optional(),
  X_CLIENT_ID: z.string().optional(),
  X_CLIENT_SECRET: z.string().optional(),
  // Google Cloud Data Layer (BigQuery)
  GCP_PROJECT_ID: z.string().optional(),
  GCP_CLIENT_EMAIL: z.string().optional(),
  GCP_PRIVATE_KEY: z.string().optional(),
  BIGQUERY_DATASET: z.string().default('agentx_analytics'),
  BIGQUERY_LOCATION: z.string().default('US'),
});

export type AppEnv = z.infer<typeof envSchema>;

/**
 * Zod schema for Grok / x.ai Structured Drafting Output
 */
export const draftGenerationResponseSchema = z.object({
  primaryTweet: z.string().min(1).max(280),
  threadTweets: z.array(z.string().min(1).max(280)).default([]),
  hashtags: z.array(z.string()).default([]),
  hookScore: z.number().min(0).max(100),
  strategicRationale: z.string(),
  suggestedScheduleSlot: z.string(), // e.g. "MORNING_PRIME" | "EVENING_PEAK"
});

export type DraftGenerationResponse = z.infer<typeof draftGenerationResponseSchema>;

/**
 * Zod schema for Compliance Policy Evaluation
 */
export const complianceCheckInputSchema = z.object({
  content: z.string(),
  thread: z.array(z.string()).optional(),
  forbiddenPhrases: z.array(z.string()).default([]),
  crisisModeActive: z.boolean().default(false),
});

export type ComplianceCheckInput = z.infer<typeof complianceCheckInputSchema>;

/**
 * Persona Config Schema (ensures safe self-evolution boundaries)
 */
export const personaConfigSchema = z.object({
  id: z.string(),
  userId: z.string(),
  version: z.number().int().positive(),
  handle: z.string().regex(/^[A-Za-z0-9_]{1,15}$/, 'Invalid X handle format'),
  displayName: z.string().min(1).max(50),
  bio: z.string().max(160),
  niche: z.string().min(2),
  targetAudience: z.string().min(2),
  tone: z.object({
    primary: z.enum(['authoritative', 'conversational', 'provocative', 'educational', 'inspirational']),
    styleTags: z.array(z.string()),
    forbiddenPhrases: z.array(z.string()),
  }),
  pillars: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      weight: z.number().min(0).max(100),
      description: z.string(),
      sampleHooks: z.array(z.string()),
    })
  ),
  createdAt: z.string(),
  updatedAt: z.string(),
  evolutionNotes: z.string().optional(),
});
