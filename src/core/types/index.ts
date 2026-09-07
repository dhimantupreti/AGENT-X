/**
 * AGENTX Core Domain Types
 * Defines strict contracts for agents, platform adapters, compliance, and evolution.
 */

export type PostStatus =
  | 'DRAFT'
  | 'COMPLIANCE_REVIEW'
  | 'APPROVED'
  | 'SCHEDULED'
  | 'PUBLISHING'
  | 'PUBLISHED'
  | 'REJECTED'
  | 'CRISIS_FROZEN';

export type ContentPillar = {
  id: string;
  name: string;
  weight: number; // Percentage allocation (0 to 100)
  description: string;
  sampleHooks: string[];
};

export interface PersonaConfig {
  id: string;
  userId: string;
  version: number;
  handle: string;
  displayName: string;
  bio: string;
  niche: string;
  targetAudience: string;
  tone: {
    primary: 'authoritative' | 'conversational' | 'provocative' | 'educational' | 'inspirational';
    styleTags: string[]; // e.g. ["concise", "no-fluff", "story-driven", "data-backed"]
    forbiddenPhrases: string[];
  };
  pillars: ContentPillar[];
  createdAt: string;
  updatedAt: string;
  evolutionNotes?: string;
}

export interface ComplianceViolation {
  ruleId: string;
  severity: 'CRITICAL' | 'WARNING' | 'INFO';
  category: 'BRAND_SAFETY' | 'X_POLICY' | 'RATE_LIMIT' | 'CLAIM_VERIFICATION' | 'TONE_DEVIATION';
  message: string;
  suggestion?: string;
}

export interface ComplianceReport {
  passed: boolean;
  score: number; // 0 to 100
  violations: ComplianceViolation[];
  checkedAt: string;
}

export interface PostDraft {
  id: string;
  pillarId: string;
  content: string; // The primary post or first tweet in thread
  thread?: string[]; // Subsequent tweets if multi-part
  hashtags?: string[];
  status: PostStatus;
  complianceReport?: ComplianceReport;
  estimatedHookScore?: number; // 0 - 100 estimated virality/retention
  suggestedScheduleTime?: string;
  scheduledFor?: string;
  publishedTweetId?: string;
  publishedAt?: string;
  approvedAt?: string; // Explicit human approval timestamp
  approvedBy?: string; // 'CREATOR'
  generationPromptSummary?: string;
  createdAt: string;
  updatedAt: string;
}

export interface TweetMetrics {
  impressions: number;
  likes: number;
  retweets: number;
  replies: number;
  bookmarks: number;
  profileClicks: number;
  urlClicks: number;
  engagementRate: number; // (engagements / impressions) * 100
  updatedAt: string;
}

export interface TweetEvent {
  tweetId: string;
  authorHandle: string;
  text: string;
  createdAt: string;
  metrics: TweetMetrics;
  pillarId?: string;
  draftId?: string;
  personaVersion: number;
}

export interface CrisisState {
  isFrozen: boolean;
  reason?: string;
  activatedAt?: string;
  activatedBy?: string; // 'MANUAL_USER' | 'AUTO_SENTIMENT_TRIGGER' | 'X_POLICY_SPIKE'
}

export type EvolutionSignalType =
  | 'HIGH_PERFORMING_HOOK'
  | 'ENGAGEMENT_VELOCITY_DROP'
  | 'AUDIENCE_FATIGUE'
  | 'OPTIMAL_TIME_SHIFT'
  | 'PILLAR_SHIFT_RECOMMENDED';

export interface EvolutionSignal {
  id: string;
  type: EvolutionSignalType;
  confidence: number; // 0 to 1.0
  evidence: {
    tweetIds: string[];
    metricComparison: string;
  };
  proposedAdjustment: {
    field: 'tone' | 'pillars' | 'hookTemplates' | 'forbiddenPhrases';
    currentValue: string | string[];
    proposedValue: string | string[];
    rationale: string;
  };
  status: 'PENDING_APPROVAL' | 'APPLIED' | 'DISMISSED';
  approvedBy?: string;
  approvedAt?: string;
  createdAt: string;
}
