import { z } from 'zod';

/**
 * Environment configuration schema
 */
export const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  // x.ai / Grok API
  XAI_API_KEY: z.string().optional(),
  XAI_BASE_URL: z.string().default('https://api.x.ai/v1'),
  XAI_MODEL: z.string().default('grok-3-mini'),
  XAI_TIMEOUT_MS: z.coerce.number().default(8000),
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
 * Zod schema for Hook Variation Output
 */
export const hookVariationSchema = z.object({
  id: z.string(),
  hook: z.string().min(1).max(280),
  archetype: z.enum(['INVERSION', 'HARD_DATA', 'DIRECT_QUESTION']),
  score: z.number().min(0).max(100),
  rationale: z.string(),
});

export type HookVariationOutput = z.infer<typeof hookVariationSchema>;

/**
 * Zod schema for Grok / x.ai Structured Drafting Output
 */
export const draftGenerationResponseSchema = z.object({
  primaryTweet: z.string().min(1).max(280),
  hookVariations: z.array(hookVariationSchema).default([]),
  threadTweets: z.array(z.string().min(1).max(280)).default([]),
  hashtags: z.array(z.string()).default([]),
  hookScore: z.number().min(0).max(100),
  strategicRationale: z.string(),
  suggestedScheduleSlot: z.string(), // e.g. "MORNING_PRIME" | "EVENING_PEAK"
  generationEngine: z.enum(['xai_live', 'mock']).optional(),
  generatorModel: z.string().optional(),
});

export type DraftGenerationResponse = z.infer<typeof draftGenerationResponseSchema>;

/**
 * Strict JSON schema for xAI Responses API (text.format.schema)
 */
export const XAI_DRAFT_RESPONSE_JSON_SCHEMA = {
  type: 'object',
  properties: {
    primaryTweet: {
      type: 'string',
      description: 'The opening post (<= 280 chars), exactly matching hookVariations[0].hook.',
    },
    hookVariations: {
      type: 'array',
      description: 'Exactly 3 distinct hook variations (INVERSION, HARD_DATA, DIRECT_QUESTION).',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          hook: { type: 'string', description: '<= 280 chars' },
          archetype: {
            type: 'string',
            enum: ['INVERSION', 'HARD_DATA', 'DIRECT_QUESTION'],
          },
          score: { type: 'number', minimum: 0, maximum: 100 },
          rationale: { type: 'string' },
        },
        required: ['id', 'hook', 'archetype', 'score', 'rationale'],
        additionalProperties: false,
      },
    },
    threadTweets: {
      type: 'array',
      description: 'Optional subsequent tweets if a thread format was requested (each <= 280 chars).',
      items: { type: 'string' },
    },
    hashtags: {
      type: 'array',
      description: 'Relevant hashtags (without #).',
      items: { type: 'string' },
    },
    hookScore: {
      type: 'number',
      minimum: 0,
      maximum: 100,
      description: 'Estimated virality and retention score for primary hook.',
    },
    strategicRationale: {
      type: 'string',
      description: 'Explanation of angle, psychological positioning, and distribution strategy.',
    },
    suggestedScheduleSlot: {
      type: 'string',
      description: 'Recommended slot (e.g. MORNING_PRIME, AFTERNOON_PEAK, EVENING_INSIGHT).',
    },
  },
  required: [
    'primaryTweet',
    'hookVariations',
    'threadTweets',
    'hashtags',
    'hookScore',
    'strategicRationale',
    'suggestedScheduleSlot',
  ],
  additionalProperties: false,
} as const;

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
 * Zod schema for AI Crisis Risk & Sentiment Analysis
 */
export const crisisRiskAssessmentSchema = z.object({
  riskScore: z.number().min(0).max(100),
  brandLiability: z.enum(['LOW', 'MEDIUM', 'HIGH']),
  toneToxicity: z.enum(['LOW', 'MEDIUM', 'HIGH']),
  sarcasmAmbiguityRisk: z.enum(['LOW', 'MEDIUM', 'HIGH']),
  escalationRequired: z.boolean(),
  reason: z.string(),
  recommendation: z.string(),
  generationEngine: z.enum(['xai_live', 'mock']).optional(),
  assessedAt: z.string().optional(),
});

export type CrisisRiskAssessmentOutput = z.infer<typeof crisisRiskAssessmentSchema>;

/**
 * Strict JSON schema for xAI Responses API Crisis Analysis (text.format.schema)
 */
export const XAI_CRISIS_ANALYSIS_JSON_SCHEMA = {
  type: 'object',
  properties: {
    riskScore: {
      type: 'number',
      minimum: 0,
      maximum: 100,
      description: 'Overall risk score between 0 (safe) and 100 (extreme crisis risk).',
    },
    brandLiability: {
      type: 'string',
      enum: ['LOW', 'MEDIUM', 'HIGH'],
      description: 'Legal exposure, unsubstantiated claims, or reputational damage risk.',
    },
    toneToxicity: {
      type: 'string',
      enum: ['LOW', 'MEDIUM', 'HIGH'],
      description: 'Hostility, aggression, harassment, hate speech, or derogatory wording.',
    },
    sarcasmAmbiguityRisk: {
      type: 'string',
      enum: ['LOW', 'MEDIUM', 'HIGH'],
      description: 'Satire, misinterpretable irony, or ambiguous wording.',
    },
    escalationRequired: {
      type: 'boolean',
      description: 'Whether human escalation and review is strictly required before publishing.',
    },
    reason: {
      type: 'string',
      description: 'Concise explanation of primary safety or brand risk drivers.',
    },
    recommendation: {
      type: 'string',
      description: 'Actionable guidance for the creator to mitigate detected risk.',
    },
  },
  required: [
    'riskScore',
    'brandLiability',
    'toneToxicity',
    'sarcasmAmbiguityRisk',
    'escalationRequired',
    'reason',
    'recommendation',
  ],
  additionalProperties: false,
} as const;

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
