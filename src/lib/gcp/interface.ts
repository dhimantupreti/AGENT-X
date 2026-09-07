import { TweetEvent, DraftLifecycleEvent, AnalyticsOverview } from '@/core/types';

/**
 * Single provider boundary for all BigQuery telemetry ingestion and analytics reads.
 * Ensures routes and UI components never need to know whether BigQuery is live or mock.
 */
export interface IBigQueryTelemetryProvider {
  /**
   * Best-effort, non-blocking ingestion of published tweet telemetry.
   * Inserts row into `tweet_events` table.
   */
  recordTweetEvent(event: TweetEvent): Promise<void>;

  /**
   * Best-effort, non-blocking ingestion of draft lifecycle telemetry.
   * Inserts row into `draft_lifecycle_events` table.
   */
  recordLifecycleEvent(event: DraftLifecycleEvent): Promise<void>;

  /**
   * Read aggregated 30-day analytics overview.
   * Executes parameterized queries against the 3 canonical BigQuery views:
   *   - `v_hook_archetype_roi`
   *   - `v_pillar_target_vs_actual`
   *   - `v_creator_preference_signals`
   * Falls back gracefully to mock fixtures if ADC or BigQuery is unconfigured or fails.
   */
  getAnalyticsOverview(authorHandle: string): Promise<AnalyticsOverview>;
}
