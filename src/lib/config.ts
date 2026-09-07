import { envSchema, AppEnv } from '@/core/schemas';

/**
 * Validated server runtime configuration
 */
export function getAppConfig(): AppEnv {
  const result = envSchema.safeParse({
    NODE_ENV: process.env.NODE_ENV,
    XAI_API_KEY: process.env.XAI_API_KEY?.trim(),
    XAI_BASE_URL: process.env.XAI_BASE_URL?.trim(),
    XAI_MODEL: process.env.XAI_MODEL?.trim(),
    XAI_TIMEOUT_MS: process.env.XAI_TIMEOUT_MS,
    X_API_KEY: process.env.X_API_KEY?.trim(),
    X_API_KEY_SECRET: process.env.X_API_KEY_SECRET?.trim(),
    X_ACCESS_TOKEN: process.env.X_ACCESS_TOKEN?.trim(),
    X_ACCESS_TOKEN_SECRET: process.env.X_ACCESS_TOKEN_SECRET?.trim(),
    X_CLIENT_ID: process.env.X_CLIENT_ID?.trim(),
    X_CLIENT_SECRET: process.env.X_CLIENT_SECRET?.trim(),
    GCP_PROJECT_ID: process.env.GCP_PROJECT_ID?.trim(),
    GCP_CLIENT_EMAIL: process.env.GCP_CLIENT_EMAIL?.trim(),
    GCP_PRIVATE_KEY: process.env.GCP_PRIVATE_KEY?.trim(),
    BIGQUERY_DATASET: process.env.BIGQUERY_DATASET?.trim(),
    BIGQUERY_LOCATION: process.env.BIGQUERY_LOCATION?.trim(),
  });

  if (!result.success) {
    console.warn('Configuration warning - invalid environment parameters:', result.error.format());
    return {
      NODE_ENV: 'development',
      XAI_BASE_URL: 'https://api.x.ai/v1',
      XAI_MODEL: 'grok-3-mini',
      XAI_TIMEOUT_MS: 8000,
      BIGQUERY_DATASET: 'agentx_analytics',
      BIGQUERY_LOCATION: 'US',
    };
  }

  return result.data;
}

export const isMockMode = (): boolean => {
  return (
    process.env.NEXT_PUBLIC_USE_MOCK_ADAPTERS === 'true' ||
    !process.env.X_API_KEY ||
    !process.env.XAI_API_KEY
  );
};
