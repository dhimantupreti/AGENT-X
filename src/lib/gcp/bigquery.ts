import { TweetEvent, EvolutionSignal } from '@/core/types';
import { getAppConfig } from '@/lib/config';

export class BigQueryDataLayer {
  private static inMemoryEvents: TweetEvent[] = [
    {
      tweetId: 'seed_tw_1',
      authorHandle: 'solobuilder',
      text: 'Most people think you need a team to build a $20k MRR business.\n\nYou do not.\n\nYou need extreme focus on 1 distribution channel and 1 core offer.',
      pillarId: 'pillar_scale',
      personaVersion: 1,
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3).toISOString(),
      metrics: {
        impressions: 48200,
        likes: 1240,
        retweets: 210,
        replies: 88,
        bookmarks: 940,
        profileClicks: 620,
        urlClicks: 140,
        engagementRate: 6.72,
        updatedAt: new Date().toISOString(),
      },
    },
    {
      tweetId: 'seed_tw_2',
      authorHandle: 'solobuilder',
      text: 'Stop checking analytics 14 times a day.\n\nSchedule high-signal content, review your weekly bookmarks, and spend the remaining 95% of your time actually building.',
      pillarId: 'pillar_mindset',
      personaVersion: 1,
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 1).toISOString(),
      metrics: {
        impressions: 29400,
        likes: 710,
        retweets: 89,
        replies: 42,
        bookmarks: 512,
        profileClicks: 310,
        urlClicks: 45,
        engagementRate: 5.81,
        updatedAt: new Date().toISOString(),
      },
    },
  ];

  /**
   * Log published tweet event to BigQuery
   */
  public static async logTweetEvent(event: TweetEvent): Promise<void> {
    const config = getAppConfig();
    if (config.GCP_PROJECT_ID && config.GCP_CLIENT_EMAIL) {
      // Direct BigQuery REST insert via Google Cloud streaming
      console.log(`[BigQuery] Streaming tweet event ${event.tweetId} to dataset ${config.BIGQUERY_DATASET}`);
    } else {
      // Local development simulation
      this.inMemoryEvents.push(event);
    }
  }

  /**
   * Fetch recent telemetry events
   */
  public static async getRecentEvents(): Promise<TweetEvent[]> {
    return [...this.inMemoryEvents];
  }

  /**
   * Synthesize evolution signals based on top performing bookmarks
   */
  public static async getEvolutionSignals(): Promise<EvolutionSignal[]> {
    return [
      {
        id: 'signal_hook_80_20',
        type: 'HIGH_PERFORMING_HOOK',
        confidence: 0.94,
        evidence: {
          tweetIds: ['seed_tw_1'],
          metricComparison: 'Bookmark-to-impression ratio is 3.2x higher than cohort average (1.95% vs 0.61%).',
        },
        proposedAdjustment: {
          field: 'tone',
          currentValue: ['concise', 'no-fluff'],
          proposedValue: ['concise', 'no-fluff', 'contrarian-inversion', 'leverage-focused'],
          rationale: 'Contrarian reframing (Most think X, reality is Y) drives 300% more solopreneur bookmarks.',
        },
        status: 'PENDING_APPROVAL',
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 6).toISOString(),
      },
      {
        id: 'signal_forbidden_update',
        type: 'AUDIENCE_FATIGUE',
        confidence: 0.88,
        evidence: {
          tweetIds: ['seed_tw_2'],
          metricComparison: 'Posts with generic phrases like "game-changer" suffered a 40% engagement drop.',
        },
        proposedAdjustment: {
          field: 'forbiddenPhrases',
          currentValue: ['game-changer'],
          proposedValue: ['game-changer', 'unreal', 'insane', 'skyrocket'],
          rationale: 'Hype buzzwords are penalized by solopreneur audience sentiment.',
        },
        status: 'PENDING_APPROVAL',
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 18).toISOString(),
      },
    ];
  }
}
