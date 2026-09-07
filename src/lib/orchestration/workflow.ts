import { PersonaConfig, ContentPillar, PostDraft, CrisisState } from '@/core/types';
import { IXAIClientAdapter } from '@/lib/adapters/xai/interface';
import { IXClientAdapter, PublishResult } from '@/lib/adapters/x/interface';
import { ComplianceEngine } from '@/lib/compliance/engine';

export interface WorkflowContext {
  persona: PersonaConfig;
  crisisState: CrisisState;
  xaiAdapter: IXAIClientAdapter;
  xAdapter: IXClientAdapter;
}

export class AgentOrchestrator {
  /**
   * Run autonomous strategy & drafting pipeline for a pillar
   */
  public static async createDraftPipeline(
    context: WorkflowContext,
    pillarId: string,
    options?: { topic?: string; format?: 'SINGLE_TWEET' | 'THREAD' }
  ): Promise<PostDraft> {
    const { persona, crisisState, xaiAdapter } = context;

    const pillar = persona.pillars.find((p) => p.id === pillarId) || persona.pillars[0];

    // 1. Generate content using x.ai (Grok)
    const generated = await xaiAdapter.generateDraft({
      persona,
      pillar,
      topic: options?.topic,
      format: options?.format || 'SINGLE_TWEET',
    });

    // 2. Build preliminary draft object
    const preliminaryDraft: Partial<PostDraft> = {
      id: `draft_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      pillarId: pillar.id,
      content: generated.primaryTweet,
      thread: generated.threadTweets,
      hashtags: generated.hashtags,
      estimatedHookScore: generated.hookScore,
      generationPromptSummary: generated.strategicRationale,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // 3. First-class Compliance Check
    const complianceReport = ComplianceEngine.evaluateDraft(preliminaryDraft, persona, crisisState);

    const status = complianceReport.passed ? 'COMPLIANCE_REVIEW' : 'REJECTED';

    return {
      ...(preliminaryDraft as PostDraft),
      status,
      complianceReport,
    };
  }

  /**
   * Execute publishing pipeline with safety gate
   */
  public static async publishDraftPipeline(
    context: WorkflowContext,
    draft: PostDraft
  ): Promise<{ draft: PostDraft; result: PublishResult }> {
    const { persona, crisisState, xAdapter } = context;

    // Strict Gate 1: Check Crisis Mode
    if (crisisState.isFrozen) {
      throw new Error(`Publishing blocked: Crisis Pause active (${crisisState.reason || 'Manual creator freeze'})`);
    }

    // Strict Gate 2: Enforce Explicit Human Approval (Policy-Safe Operating Model)
    if (draft.status !== 'APPROVED') {
      throw new Error(
        `Publishing blocked: Draft ${draft.id} requires explicit creator approval before publishing (current status: '${draft.status}').`
      );
    }

    // Strict Gate 3: Re-verify compliance immediately prior to network call
    const freshCompliance = ComplianceEngine.evaluateDraft(draft, persona, crisisState);
    if (!freshCompliance.passed) {
      draft.status = 'REJECTED';
      draft.complianceReport = freshCompliance;
      throw new Error('Publishing blocked: Draft failed pre-publish compliance verification');
    }

    // Execute publish via isolated X API adapter
    draft.status = 'PUBLISHING';
    const result = await xAdapter.publishDraft(draft);

    if (result.success && result.tweetId) {
      draft.status = 'PUBLISHED';
      draft.publishedTweetId = result.tweetId;
      draft.publishedAt = new Date().toISOString();
      draft.updatedAt = new Date().toISOString();
    } else {
      draft.status = 'COMPLIANCE_REVIEW'; // Fall back for review
      throw new Error(`X API publish failure: ${result.error || 'Unknown error'}`);
    }

    return { draft, result };
  }
}
