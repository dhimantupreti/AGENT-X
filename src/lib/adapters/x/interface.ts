import { TweetMetrics, PostDraft } from '@/core/types';

export interface PublishResult {
  success: boolean;
  tweetId?: string;
  url?: string;
  error?: string;
  rateLimitRemaining?: number;
}

export interface MentionTriageItem {
  id: string;
  authorHandle: string;
  text: string;
  sentiment: 'POSITIVE' | 'NEUTRAL' | 'NEGATIVE' | 'ATTACK';
  urgency: 'HIGH' | 'MEDIUM' | 'LOW';
  recommendedAction: 'REPLY' | 'IGNORE' | 'ESCALATE_CRISIS';
  suggestedReply?: string;
  receivedAt: string;
}

export interface IXClientAdapter {
  publishDraft(draft: PostDraft): Promise<PublishResult>;
  fetchRecentMetrics(tweetIds: string[]): Promise<Map<string, TweetMetrics>>;
  fetchMentions(limit?: number): Promise<MentionTriageItem[]>;
  checkRateLimitStatus(): Promise<{ endpoint: string; remaining: number; resetAt: string }>;
}
