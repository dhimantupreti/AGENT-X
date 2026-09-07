import { AnalyticsOverview, HookArchetypeROI, PillarBalanceMetric, CreatorPreferenceMetric } from '@/core/types';
import { bigQueryTelemetryProvider } from '@/lib/gcp/bigquery';

/**
 * Read-Only Analytics Service for AGENTX
 * Queries the single provider boundary (bigQueryTelemetryProvider), which executes parameterized
 * queries against the 3 canonical BigQuery views:
 *   - v_hook_archetype_roi
 *   - v_pillar_target_vs_actual
 *   - v_creator_preference_signals
 * Falls back to mock view-aligned fixtures if ADC is unconfigured.
 */
export class AnalyticsService {
  /**
   * Retrieve aggregated 30-day analytics overview for a creator
   */
  public static async getAnalyticsOverview(authorHandle: string): Promise<AnalyticsOverview> {
    return await bigQueryTelemetryProvider.getAnalyticsOverview(authorHandle);
  }

  /**
   * Pure calculation utility mirroring BigQuery intent_score logic:
   * ((bookmarks * 3) + (profile_clicks * 2) + retweets) / impressions * 100
   * Follows SQL Metric Safety Rule: Returns null if impressions is 0 or negative
   */
  public static calculateIntentScore(
    impressions: number,
    bookmarks: number,
    profileClicks: number,
    retweets: number
  ): number | null {
    if (!impressions || impressions <= 0) return null;
    const numerator = (bookmarks * 3) + (profileClicks * 2) + retweets;
    return Math.round((numerator / impressions) * 10000) / 100;
  }

  /**
   * Pure calculation utility mirroring BigQuery pillar skew logic:
   * actualSharePct - targetWeightPct
   */
  public static calculatePillarSkew(actualSharePct: number | null, targetWeightPct: number): number | null {
    if (actualSharePct === null) return null;
    return Math.round((actualSharePct - targetWeightPct) * 10) / 10;
  }
}
