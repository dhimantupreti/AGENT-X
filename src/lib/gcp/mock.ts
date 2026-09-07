import { IBigQueryTelemetryProvider } from './interface';
import { TweetEvent, DraftLifecycleEvent, AnalyticsOverview, EvolutionSignal, PersonaConfig } from '@/core/types';
import { INITIAL_ANALYTICS_OVERVIEW, INITIAL_LIFECYCLE_EVENTS, INITIAL_PERSONA, INITIAL_EVOLUTION_SIGNALS } from '@/lib/state/seedData';
import { EvolutionSignalSynthesizer } from '@/lib/evolution/synthesizer';

/**
 * In-Memory Mock BigQuery Telemetry Provider
 * Used for local development, CI testing, and graceful failover when ADC is unavailable.
 */
export class MockBigQueryTelemetryProvider implements IBigQueryTelemetryProvider {
  private inMemoryTweets: TweetEvent[] = [
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

  private inMemoryLifecycle: DraftLifecycleEvent[] = [...INITIAL_LIFECYCLE_EVENTS];

  /**
   * Ingest tweet event to in-memory store
   */
  public async recordTweetEvent(event: TweetEvent): Promise<void> {
    this.inMemoryTweets.push(event);
  }

  /**
   * Ingest draft lifecycle event to in-memory store
   */
  public async recordLifecycleEvent(event: DraftLifecycleEvent): Promise<void> {
    this.inMemoryLifecycle.push(event);
  }

  /**
   * Return deterministic view-aligned mock analytics overview
   */
  public async getAnalyticsOverview(authorHandle: string): Promise<AnalyticsOverview> {
    const base: AnalyticsOverview = JSON.parse(JSON.stringify(INITIAL_ANALYTICS_OVERVIEW));
    base.authorHandle = authorHandle;
    base.telemetryEngine = 'mock';
    base.updatedAt = new Date().toISOString();
    return base;
  }

  /**
   * Telemetry inspection helpers for verification and evolution signals
   */
  public getRecentTweetEvents(): TweetEvent[] {
    return [...this.inMemoryTweets];
  }

  public getRecentLifecycleEvents(): DraftLifecycleEvent[] {
    return [...this.inMemoryLifecycle];
  }

  public getEvolutionSignals(persona?: PersonaConfig): EvolutionSignal[] {
    const activePersona = persona || INITIAL_PERSONA;
    const synthesized = EvolutionSignalSynthesizer.synthesize({
      persona: activePersona,
      lifecycleEvents: this.inMemoryLifecycle,
    });
    return synthesized.length > 0 ? synthesized : INITIAL_EVOLUTION_SIGNALS;
  }
}
