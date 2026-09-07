import { IXClientAdapter, PublishResult, MentionTriageItem } from './interface';
import { PostDraft, TweetMetrics } from '@/core/types';

export class MockXClientAdapter implements IXClientAdapter {
  private publishedTweets: Map<string, { draft: PostDraft; metrics: TweetMetrics }> = new Map();

  async publishDraft(draft: PostDraft): Promise<PublishResult> {
    // Simulate network latency
    await new Promise((resolve) => setTimeout(resolve, 400));

    const tweetId = `mock_tw_${Date.now()}`;
    const initialMetrics: TweetMetrics = {
      impressions: 42,
      likes: 3,
      retweets: 1,
      replies: 0,
      bookmarks: 2,
      profileClicks: 5,
      urlClicks: 1,
      engagementRate: 14.28,
      updatedAt: new Date().toISOString(),
    };

    this.publishedTweets.set(tweetId, { draft, metrics: initialMetrics });

    return {
      success: true,
      tweetId,
      url: `https://x.com/mock_user/status/${tweetId}`,
      rateLimitRemaining: 98,
    };
  }

  async fetchRecentMetrics(tweetIds: string[]): Promise<Map<string, TweetMetrics>> {
    const results = new Map<string, TweetMetrics>();

    for (const id of tweetIds) {
      const existing = this.publishedTweets.get(id);
      if (existing) {
        // Increment metrics slightly to simulate real engagement growth
        existing.metrics.impressions += Math.floor(Math.random() * 50) + 10;
        existing.metrics.likes += Math.floor(Math.random() * 5);
        existing.metrics.retweets += Math.random() > 0.7 ? 1 : 0;
        existing.metrics.bookmarks += Math.random() > 0.6 ? 1 : 0;
        existing.metrics.updatedAt = new Date().toISOString();
        results.set(id, existing.metrics);
      } else {
        results.set(id, {
          impressions: 120,
          likes: 8,
          retweets: 2,
          replies: 1,
          bookmarks: 4,
          profileClicks: 9,
          urlClicks: 3,
          engagementRate: 12.5,
          updatedAt: new Date().toISOString(),
        });
      }
    }

    return results;
  }

  async fetchMentions(limit: number = 5): Promise<MentionTriageItem[]> {
    const items: MentionTriageItem[] = [
      {
        id: 'mention_1',
        authorHandle: 'tech_builder_99',
        text: 'How does AGENTX compare to traditional social schedulers like Buffer or Hypefury?',
        sentiment: 'POSITIVE',
        urgency: 'HIGH',
        recommendedAction: 'REPLY',
        suggestedReply:
          'Traditional tools schedule what you write. AGENTX acts as an autonomous strategist—analyzing virality signals, running compliance checks, and evolving your persona based on actual engagement.',
        receivedAt: new Date(Date.now() - 1000 * 60 * 12).toISOString(),
      },
      {
        id: 'mention_2',
        authorHandle: 'skeptic_ai',
        text: 'Another AI wrapper posting generic garbage? Prove me wrong.',
        sentiment: 'NEGATIVE',
        urgency: 'HIGH',
        recommendedAction: 'REPLY',
        suggestedReply:
          'Fair critique. That is why AGENTX enforces strict persona anti-drift and banned generic phrase filters. No fluff, only high-signal insights backed by data.',
        receivedAt: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
      },
      {
        id: 'mention_3',
        authorHandle: 'crypto_spammer_bot',
        text: 'DM for 100x gem pumps!!! #crypto #sol',
        sentiment: 'ATTACK',
        urgency: 'LOW',
        recommendedAction: 'IGNORE',
        receivedAt: new Date(Date.now() - 1000 * 60 * 180).toISOString(),
      },
    ];
    return items.slice(0, limit);
  }

  async checkRateLimitStatus(): Promise<{ endpoint: string; remaining: number; resetAt: string }> {
    return {
      endpoint: '/2/tweets',
      remaining: 85,
      resetAt: new Date(Date.now() + 1000 * 60 * 15).toISOString(),
    };
  }
}
