import { BigQuery } from '@google-cloud/bigquery';
import { IBigQueryTelemetryProvider } from './interface';
import { MockBigQueryTelemetryProvider } from './mock';
import {
  TweetEvent,
  DraftLifecycleEvent,
  AnalyticsOverview,
  HookArchetypeROI,
  PillarBalanceMetric,
  CreatorPreferenceMetric,
  HookArchetype,
  EvolutionSignal,
} from '@/core/types';
import { getAppConfig } from '@/lib/config';
// SQL Metric Safety Rule helper
function computeIntentScore(
  impressions: number,
  bookmarks: number,
  profileClicks: number,
  retweets: number
): number | null {
  if (!impressions || impressions <= 0) return null;
  const numerator = bookmarks * 3 + profileClicks * 2 + retweets;
  return Math.round((numerator / impressions) * 10000) / 100;
}

/**
 * Live BigQuery Telemetry Provider implementing IBigQueryTelemetryProvider.
 * Authenticates via Google Cloud Application Default Credentials (ADC).
 * Guarantees:
 * 1. Unified provider boundary (single entrypoint for routes and services).
 * 2. Best-effort, non-blocking telemetry writes (failures never disrupt drafting or publishing).
 * 3. Canonical BigQuery views:
 *    - `v_hook_archetype_roi`
 *    - `v_pillar_target_vs_actual`
 *    - `v_creator_preference_signals`
 * 4. Parameterized SQL queries scoped strictly to the AGENTX dataset.
 * 5. Automatic graceful failover to MockBigQueryTelemetryProvider if ADC is unconfigured.
 */
export class BigQueryTelemetryProvider implements IBigQueryTelemetryProvider {
  private client: BigQuery | null = null;
  private mockFallback: MockBigQueryTelemetryProvider;
  private projectId: string | null = null;
  private datasetId: string = 'agentx_analytics';
  private location: string = 'US';
  private initialized: boolean = false;
  private isLiveMode: boolean = false;

  constructor(mockFallback?: MockBigQueryTelemetryProvider) {
    this.mockFallback = mockFallback || new MockBigQueryTelemetryProvider();
  }

  /**
   * Lazy initialization to avoid instantiation overhead when not needed
   */
  private ensureInitialized(): void {
    if (this.initialized) return;
    this.initialized = true;

    const config = getAppConfig();
    this.projectId = config.GCP_PROJECT_ID || null;
    this.datasetId = config.BIGQUERY_DATASET || 'agentx_analytics';
    this.location = config.BIGQUERY_LOCATION || 'US';

    if (!this.projectId) {
      // Local development or CI without GCP project configured
      this.isLiveMode = false;
      return;
    }

    try {
      // ADC is automatically resolved by @google-cloud/bigquery when no keyfile/credentials are passed
      this.client = new BigQuery({
        projectId: this.projectId,
        location: this.location,
      });
      this.isLiveMode = true;
    } catch (err: unknown) {
      console.warn(
        '[BigQuery Telemetry] Could not initialize BigQuery client via ADC. Falling back to mock telemetry.',
        err instanceof Error ? err.message : err
      );
      this.isLiveMode = false;
    }
  }

  /**
   * Ingest published tweet telemetry to BigQuery table `tweet_events`.
   * Best-effort and non-blocking: never throws on insert failure.
   */
  public async recordTweetEvent(event: TweetEvent): Promise<void> {
    this.ensureInitialized();

    // Always mirror to in-memory fallback for local continuity
    await this.mockFallback.recordTweetEvent(event).catch(() => {});

    if (!this.isLiveMode || !this.client || !this.projectId) {
      return;
    }

    try {
      const row = {
        tweet_id: event.tweetId,
        author_handle: event.authorHandle,
        content: event.text,
        pillar_id: event.pillarId || null,
        persona_version: event.personaVersion,
        draft_id: event.draftId || null,
        hook_archetype: event.hookArchetype || null,
        hook_id: event.hookId || null,
        seed_research_id: event.seedResearchId || null,
        format: event.format || 'SINGLE_TWEET',
        thread_length: event.threadLength || 0,
        estimated_hook_score: event.estimatedHookScore || null,
        created_at: event.createdAt,
        impressions: event.metrics.impressions,
        likes: event.metrics.likes,
        retweets: event.metrics.retweets,
        replies: event.metrics.replies,
        bookmarks: event.metrics.bookmarks,
        profile_clicks: event.metrics.profileClicks,
        url_clicks: event.metrics.urlClicks,
        engagement_rate: event.metrics.engagementRate,
        updated_at: event.metrics.updatedAt,
      };

      await this.client
        .dataset(this.datasetId)
        .table('tweet_events')
        .insert([row], { ignoreUnknownValues: true, raw: true });
    } catch (error: unknown) {
      console.warn(
        `[BigQuery Telemetry Write Warning] Failed to stream tweet event ${event.tweetId} to BigQuery:`,
        error instanceof Error ? error.message : error
      );
      // Best-effort: do not rethrow, app continues normally
    }
  }

  /**
   * Ingest creator draft lifecycle telemetry to BigQuery table `draft_lifecycle_events`.
   * Best-effort and non-blocking: never throws on insert failure.
   */
  public async recordLifecycleEvent(event: DraftLifecycleEvent): Promise<void> {
    this.ensureInitialized();

    // Mirror to in-memory fallback
    await this.mockFallback.recordLifecycleEvent(event).catch(() => {});

    if (!this.isLiveMode || !this.client || !this.projectId) {
      return;
    }

    try {
      const row = {
        event_id: event.eventId,
        draft_id: event.draftId,
        author_handle: event.authorHandle,
        event_type: event.eventType,
        pillar_id: event.pillarId || null,
        initial_hook_archetype: event.initialHookArchetype || null,
        selected_hook_archetype: event.selectedHookArchetype || null,
        initial_hook_id: event.initialHookId || null,
        selected_hook_id: event.selectedHookId || null,
        format: event.format || null,
        is_hook_swapped: event.isHookSwapped,
        time_in_queue_seconds: event.timeInQueueSeconds ?? null,
        created_at: event.createdAt,
      };

      await this.client
        .dataset(this.datasetId)
        .table('draft_lifecycle_events')
        .insert([row], { ignoreUnknownValues: true, raw: true });
    } catch (error: unknown) {
      console.warn(
        `[BigQuery Telemetry Write Warning] Failed to stream lifecycle event ${event.eventId} to BigQuery:`,
        error instanceof Error ? error.message : error
      );
      // Best-effort: do not rethrow, app continues normally
    }
  }

  /**
   * Retrieve aggregated 30-day analytics overview by querying the 3 canonical BigQuery views:
   * - `v_hook_archetype_roi`
   * - `v_pillar_target_vs_actual`
   * - `v_creator_preference_signals`
   * Uses parameterized queries (@authorHandle).
   * Gracefully falls back to mock fixtures if ADC credentials or network fails.
   */
  public async getAnalyticsOverview(authorHandle: string): Promise<AnalyticsOverview> {
    this.ensureInitialized();

    if (!this.isLiveMode || !this.client || !this.projectId) {
      return await this.mockFallback.getAnalyticsOverview(authorHandle);
    }

    try {
      const queryROI = `
        SELECT
          hook_archetype,
          total_posts,
          total_impressions,
          total_bookmarks,
          total_profile_clicks,
          avg_estimated_score,
          intent_score,
          bookmarks_per_k_impressions,
          super_hook_percentage,
          performance_tier
        FROM \`${this.projectId}.${this.datasetId}.v_hook_archetype_roi\`
        WHERE author_handle = @authorHandle
      `;

      const queryPillar = `
        SELECT
          pillar_id,
          pillar_name,
          target_weight_pct,
          published_count,
          actual_share_pct,
          skew_pct,
          pillar_intent_score,
          allocation_status
        FROM \`${this.projectId}.${this.datasetId}.v_pillar_target_vs_actual\`
        WHERE author_handle = @authorHandle
      `;

      const queryPref = `
        SELECT
          total_drafts,
          approved_drafts,
          dismissed_drafts,
          hook_swapped_drafts,
          preferred_archetype,
          hook_swap_rate_pct,
          approval_rate_pct,
          avg_time_to_approval_seconds,
          creator_curation_style
        FROM \`${this.projectId}.${this.datasetId}.v_creator_preference_signals\`
        WHERE author_handle = @authorHandle
        LIMIT 1
      `;

      const [roiResult, pillarResult, prefResult] = await Promise.all([
        this.client.query({ query: queryROI, params: { authorHandle } }),
        this.client.query({ query: queryPillar, params: { authorHandle } }),
        this.client.query({ query: queryPref, params: { authorHandle } }),
      ]);

      const roiRows = (roiResult[0] || []) as any[];
      const pillarRows = (pillarResult[0] || []) as any[];
      const prefRows = (prefResult[0] || []) as any[];

      // Transform rows to typed contracts obeying SQL Metric Safety
      const hookArchetypeROI: HookArchetypeROI[] = roiRows.map((r) => ({
        archetype: r.hook_archetype as HookArchetype,
        totalPosts: Number(r.total_posts || 0),
        totalImpressions: Number(r.total_impressions || 0),
        totalBookmarks: Number(r.total_bookmarks || 0),
        totalProfileClicks: Number(r.total_profile_clicks || 0),
        avgEstimatedScore:
          r.avg_estimated_score !== null && r.avg_estimated_score !== undefined
            ? Number(r.avg_estimated_score)
            : undefined,
        intentScore:
          r.intent_score !== null && r.intent_score !== undefined
            ? Number(r.intent_score)
            : null,
        bookmarksPerKImpressions:
          r.bookmarks_per_k_impressions !== null && r.bookmarks_per_k_impressions !== undefined
            ? Number(r.bookmarks_per_k_impressions)
            : null,
        superHookPercentage: Number(r.super_hook_percentage || 0),
        performanceTier: r.performance_tier || 'INSUFFICIENT_DATA',
      }));

      const pillarBalance: PillarBalanceMetric[] = pillarRows.map((r) => ({
        pillarId: r.pillar_id,
        pillarName: r.pillar_name,
        targetWeightPct: Number(r.target_weight_pct || 0),
        publishedCount: Number(r.published_count || 0),
        actualSharePct:
          r.actual_share_pct !== null && r.actual_share_pct !== undefined
            ? Number(r.actual_share_pct)
            : null,
        skewPct:
          r.skew_pct !== null && r.skew_pct !== undefined
            ? Number(r.skew_pct)
            : null,
        pillarIntentScore:
          r.pillar_intent_score !== null && r.pillar_intent_score !== undefined
            ? Number(r.pillar_intent_score)
            : null,
        allocationStatus: r.allocation_status || 'NO_DATA',
      }));

      const prefRow = prefRows[0] || {};
      const creatorPreferences: CreatorPreferenceMetric = {
        totalDrafts: Number(prefRow.total_drafts || 0),
        approvedDrafts: Number(prefRow.approved_drafts || 0),
        dismissedDrafts: Number(prefRow.dismissed_drafts || 0),
        hookSwappedDrafts: Number(prefRow.hook_swapped_drafts || 0),
        hookSwapRatePct:
          prefRow.hook_swap_rate_pct !== null && prefRow.hook_swap_rate_pct !== undefined
            ? Number(prefRow.hook_swap_rate_pct)
            : null,
        approvalRatePct:
          prefRow.approval_rate_pct !== null && prefRow.approval_rate_pct !== undefined
            ? Number(prefRow.approval_rate_pct)
            : null,
        preferredArchetype: prefRow.preferred_archetype ? (prefRow.preferred_archetype as HookArchetype) : undefined,
        avgTimeToApprovalSeconds:
          prefRow.avg_time_to_approval_seconds !== null && prefRow.avg_time_to_approval_seconds !== undefined
            ? Number(prefRow.avg_time_to_approval_seconds)
            : null,
        creatorCurationStyle: prefRow.creator_curation_style || 'NO_DRAFTS',
      };

      const totalImpressions = hookArchetypeROI.reduce((sum, r) => sum + r.totalImpressions, 0);
      const totalBookmarks = hookArchetypeROI.reduce((sum, r) => sum + r.totalBookmarks, 0);
      const totalProfileClicks = hookArchetypeROI.reduce((sum, r) => sum + r.totalProfileClicks, 0);
      const overallIntentScore = computeIntentScore(totalImpressions, totalBookmarks, totalProfileClicks, 0);

      return {
        authorHandle,
        period: 'Last 30 Days',
        totalImpressions,
        totalBookmarks,
        overallIntentScore,
        complianceRate: 100,
        hookArchetypeROI,
        pillarBalance,
        creatorPreferences,
        telemetryEngine: 'bigquery_live',
        updatedAt: new Date().toISOString(),
      };
    } catch (error: unknown) {
      console.warn(
        '[BigQuery Telemetry Read Warning] Failed to query BigQuery views, falling back to mock overview:',
        error instanceof Error ? error.message : error
      );
      return await this.mockFallback.getAnalyticsOverview(authorHandle);
    }
  }

  /**
   * Diagnostic helper: returns true if live BigQuery ADC initialization succeeded
   */
  public isLive(): boolean {
    this.ensureInitialized();
    return this.isLiveMode;
  }

  /**
   * Helper to access the fallback mock provider
   */
  public getMockProvider(): MockBigQueryTelemetryProvider {
    return this.mockFallback;
  }
}

/**
 * Singleton instance of BigQueryTelemetryProvider.
 * All routes and services access BigQuery telemetry through this single boundary.
 */
export const bigQueryTelemetryProvider: IBigQueryTelemetryProvider = new BigQueryTelemetryProvider();

/**
 * Backwards compatibility adapter for legacy imports
 */
export class BigQueryDataLayer {
  public static async logTweetEvent(event: TweetEvent): Promise<void> {
    await bigQueryTelemetryProvider.recordTweetEvent(event);
  }

  public static async getRecentEvents(): Promise<TweetEvent[]> {
    if (bigQueryTelemetryProvider instanceof BigQueryTelemetryProvider) {
      return bigQueryTelemetryProvider.getMockProvider().getRecentTweetEvents();
    }
    return [];
  }

  public static async getEvolutionSignals(): Promise<EvolutionSignal[]> {
    if (bigQueryTelemetryProvider instanceof BigQueryTelemetryProvider) {
      return bigQueryTelemetryProvider.getMockProvider().getEvolutionSignals();
    }
    return [];
  }
}
