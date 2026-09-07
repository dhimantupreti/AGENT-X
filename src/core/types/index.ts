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

export type HookArchetype = 'INVERSION' | 'HARD_DATA' | 'DIRECT_QUESTION';

export interface HookVariation {
  id: string;
  hook: string;
  archetype: HookArchetype;
  score: number; // 0 to 100
  rationale: string;
}

export type ResearchCategory = 'AUDIENCE_FRICTION' | 'CONTRARIAN_THESIS' | 'CASE_STUDY';

export interface ResearchItem {
  id: string;
  pillarId: string;
  category: ResearchCategory;
  topic: string;
  summary: string;
  seedAngle: string;
  audiencePainPoint?: string;
  isUserCreated?: boolean;
  createdAt?: string;
  rawNoteSource?: string;
}

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

export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH';

export interface CrisisRiskAssessment {
  riskScore: number; // 0 to 100
  brandLiability: RiskLevel;
  toneToxicity: RiskLevel;
  sarcasmAmbiguityRisk: RiskLevel;
  escalationRequired: boolean;
  reason: string;
  recommendation: string;
  generationEngine?: 'xai_live' | 'mock';
  assessedAt?: string;
}

export interface ComplianceReport {
  passed: boolean;
  score: number; // 0 to 100
  violations: ComplianceViolation[];
  checkedAt: string;
  aiRiskAssessment?: CrisisRiskAssessment;
}

export interface PostDraft {
  id: string;
  pillarId: string;
  content: string; // The primary post or first tweet in thread
  thread?: string[]; // Subsequent tweets if multi-part
  hashtags?: string[];
  status: PostStatus;
  complianceReport?: ComplianceReport;
  aiRiskAssessment?: CrisisRiskAssessment;
  estimatedHookScore?: number; // 0 - 100 estimated virality/retention
  suggestedScheduleTime?: string;
  scheduledFor?: string;
  publishedTweetId?: string;
  publishedAt?: string;
  approvedAt?: string; // Explicit human approval timestamp
  approvedBy?: string; // 'CREATOR'
  hookVariations?: HookVariation[];
  selectedHookId?: string;
  selectedHookArchetype?: HookArchetype;
  generationPromptSummary?: string;
  generationEngine?: 'xai_live' | 'mock';
  generatorModel?: string;
  createdAt: string;
  updatedAt: string;
}

// Phase 2E1: In-Character Reply Drafting Domain Types
export type ReplyToneStyle =
  | 'DIRECT_INSIGHT'
  | 'CONVERSATIONAL_FOLLOWUP'
  | 'CONTRARIAN_REFRAME'
  | 'DIPLOMATIC_BOUNDARY';

export interface ReplyOption {
  id: string; // e.g. "opt_1", "opt_2"
  toneStyle: ReplyToneStyle;
  text: string; // 1-280 chars
  rationale: string;
  complianceReport?: ComplianceReport;
}

export interface ReplyDraft {
  id: string;
  mentionId: string;
  inReplyToUser: string;
  inReplyToText: string;
  selectedOptionId?: string;
  selectedText: string;
  status: 'DRAFT' | 'APPROVED' | 'SENT' | 'REJECTED';
  options: ReplyOption[];
  complianceReport?: ComplianceReport;
  approvedAt?: string;
  approvedBy?: 'CREATOR';
  sentTweetId?: string;
  sentAt?: string;
  createdAt: string;
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
  hookArchetype?: HookArchetype;
  hookId?: string;
  seedResearchId?: string;
  format?: 'SINGLE_TWEET' | 'THREAD';
  threadLength?: number;
  estimatedHookScore?: number;
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
  draftingImpact?: string; // Explains what changes in Stage 4 Grok drafting
  status: 'PENDING_APPROVAL' | 'APPLIED' | 'DISMISSED';
  approvedBy?: string;
  approvedAt?: string;
  createdAt: string;
}

// Phase 2B1: Analytics Visibility Contracts
export interface HookArchetypeROI {
  archetype: HookArchetype;
  totalPosts: number;
  totalImpressions: number;
  totalBookmarks: number;
  totalProfileClicks: number;
  avgEstimatedScore?: number;
  intentScore: number | null; // NULL if impressions = 0
  bookmarksPerKImpressions: number | null;
  superHookPercentage: number;
  performanceTier: 'SUPER_HOOK' | 'SOLID_PERFORMER' | 'AVERAGE' | 'INSUFFICIENT_DATA';
}

export interface PillarBalanceMetric {
  pillarId: string;
  pillarName: string;
  targetWeightPct: number;
  publishedCount: number;
  actualSharePct: number | null;
  skewPct: number | null;
  pillarIntentScore: number | null;
  allocationStatus: 'ON_TARGET' | 'UNDER_ALLOCATED' | 'OVER_ALLOCATED' | 'NO_DATA';
}

export interface CreatorPreferenceMetric {
  totalDrafts: number;
  approvedDrafts: number;
  dismissedDrafts: number;
  hookSwappedDrafts: number;
  hookSwapRatePct: number | null;
  approvalRatePct: number | null;
  preferredArchetype?: HookArchetype;
  avgTimeToApprovalSeconds: number | null;
  creatorCurationStyle: 'ACTIVE_CURATOR' | 'SELECTIVE_EDITOR' | 'DEFAULT_ACCEPTING' | 'NO_DRAFTS';
}

export interface DraftLifecycleEvent {
  eventId: string;
  draftId: string;
  authorHandle: string;
  eventType: 'DRAFT_CREATED' | 'HOOK_SWAPPED' | 'APPROVED' | 'DISMISSED' | 'PUBLISHED';
  pillarId?: string;
  initialHookArchetype?: HookArchetype;
  selectedHookArchetype?: HookArchetype;
  initialHookId?: string;
  selectedHookId?: string;
  format?: 'SINGLE_TWEET' | 'THREAD';
  isHookSwapped: boolean;
  timeInQueueSeconds?: number;
  createdAt: string;
}

export interface AnalyticsOverview {
  authorHandle: string;
  period: string; // e.g. "Last 30 Days"
  totalImpressions: number;
  totalBookmarks: number;
  overallIntentScore: number | null;
  complianceRate: number;
  hookArchetypeROI: HookArchetypeROI[];
  pillarBalance: PillarBalanceMetric[];
  creatorPreferences: CreatorPreferenceMetric;
  telemetryEngine?: 'bigquery_live' | 'mock';
  updatedAt: string;
}

