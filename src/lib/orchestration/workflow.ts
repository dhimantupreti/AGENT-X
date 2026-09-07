import { PersonaConfig, ContentPillar, PostDraft, CrisisState, ReplyDraft, ReplyOption } from '@/core/types';
import { IXAIClientAdapter } from '@/lib/adapters/xai/interface';
import { IXClientAdapter, PublishResult, MentionTriageItem } from '@/lib/adapters/x/interface';
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
    options?: {
      topic?: string;
      seedAngle?: string;
      format?: 'SINGLE_TWEET' | 'THREAD';
      selectedHookId?: string;
    }
  ): Promise<PostDraft> {
    const { persona, crisisState, xaiAdapter } = context;

    const pillar = persona.pillars.find((p) => p.id === pillarId) || persona.pillars[0];

    // 1. Generate content with multi-hook variations using x.ai (Grok)
    const generated = await xaiAdapter.generateDraft({
      persona,
      pillar,
      topic: options?.topic,
      seedAngle: options?.seedAngle,
      format: options?.format || 'SINGLE_TWEET',
    });

    // 2. Select initial hook
    const hookVariations = generated.hookVariations || [];
    const selectedHook = options?.selectedHookId
      ? hookVariations.find((h) => h.id === options.selectedHookId) || hookVariations[0]
      : hookVariations[0];

    const chosenContent = selectedHook ? selectedHook.hook : generated.primaryTweet;
    const chosenScore = selectedHook ? selectedHook.score : generated.hookScore;

    // 3. Build preliminary draft object
    const preliminaryDraft: Partial<PostDraft> = {
      id: `draft_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      pillarId: pillar.id,
      content: chosenContent,
      hookVariations,
      selectedHookId: selectedHook?.id,
      selectedHookArchetype: selectedHook?.archetype,
      thread: generated.threadTweets,
      hashtags: generated.hashtags,
      estimatedHookScore: chosenScore,
      generationPromptSummary: generated.strategicRationale,
      generationEngine: generated.generationEngine || 'mock',
      generatorModel: generated.generatorModel,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // 4. Run AI Crisis Risk & Sentiment Analysis
    const fullTextToAnalyze = [chosenContent, ...(generated.threadTweets || [])].join('\n\n');
    let aiRiskAssessment;
    try {
      aiRiskAssessment = await xaiAdapter.analyzeCrisisRisk(fullTextToAnalyze, persona);
    } catch (err) {
      console.warn('[Workflow] Error during AI crisis risk evaluation, falling back to mock risk:', err);
    }
    preliminaryDraft.aiRiskAssessment = aiRiskAssessment;

    // 5. First-class Compliance Check
    const complianceReport = ComplianceEngine.evaluateDraft(
      preliminaryDraft,
      persona,
      crisisState,
      aiRiskAssessment
    );

    const status = complianceReport.passed ? 'COMPLIANCE_REVIEW' : 'REJECTED';

    return {
      ...(preliminaryDraft as PostDraft),
      status,
      complianceReport,
    };
  }

  /**
   * Guardrail-enforced hook swapping:
   * Immediately resets approval state and forces compliance revalidation before publishing can occur.
   */
  public static swapDraftHook(
    draft: PostDraft,
    newHookId: string,
    persona: PersonaConfig,
    crisisState: CrisisState
  ): PostDraft {
    const variation = draft.hookVariations?.find((v) => v.id === newHookId);
    if (!variation) {
      throw new Error(`Hook variation '${newHookId}' not found on draft ${draft.id}`);
    }

    // Update content and hook reference
    draft.content = variation.hook;
    draft.selectedHookId = variation.id;
    draft.selectedHookArchetype = variation.archetype;
    draft.estimatedHookScore = variation.score;
    draft.updatedAt = new Date().toISOString();

    // STRICT GUARDRAIL: Reset approval state completely
    draft.approvedAt = undefined;
    draft.approvedBy = undefined;

    // Force immediate compliance re-evaluation
    const freshCompliance = ComplianceEngine.evaluateDraft(
      draft,
      persona,
      crisisState,
      draft.aiRiskAssessment
    );
    draft.complianceReport = freshCompliance;
    draft.status = freshCompliance.passed ? 'COMPLIANCE_REVIEW' : 'REJECTED';

    return { ...draft };
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

  /**
   * Phase 2E1: Create in-character reply draft with 2 tone-matched options
   */
  public static async createReplyPipeline(
    context: WorkflowContext,
    mention: MentionTriageItem
  ): Promise<ReplyDraft> {
    const { persona, crisisState, xaiAdapter } = context;

    if (crisisState.isFrozen) {
      throw new Error(`Reply drafting blocked: Crisis Pause active (${crisisState.reason || 'Manual creator freeze'})`);
    }

    const rawOptions = await xaiAdapter.generateReplyOptions(mention, persona);
    const options: ReplyOption[] = rawOptions.map((opt) => {
      const compliance = ComplianceEngine.evaluateDraft({ content: opt.text }, persona, crisisState);
      return {
        ...opt,
        complianceReport: compliance,
      };
    });

    const defaultOption = options[0];
    const initialText = defaultOption?.text || '';
    const initialCompliance = ComplianceEngine.evaluateDraft({ content: initialText }, persona, crisisState);

    return {
      id: `reply_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      mentionId: mention.id,
      inReplyToUser: mention.authorHandle,
      inReplyToText: mention.text,
      selectedOptionId: defaultOption?.id,
      selectedText: initialText,
      status: 'DRAFT',
      options,
      complianceReport: initialCompliance,
      createdAt: new Date().toISOString(),
    };
  }

  /**
   * Phase 2E1 Guardrail: If creator edits text after approval, approval is strictly wiped
   * and compliance re-runs immediately.
   */
  public static updateReplyTextPipeline(
    context: WorkflowContext,
    replyDraft: ReplyDraft,
    newText: string,
    optionId?: string
  ): ReplyDraft {
    const { persona, crisisState } = context;

    replyDraft.selectedText = newText;
    if (optionId) {
      replyDraft.selectedOptionId = optionId;
    }

    // STRICT GUARDRAIL: Wipe approval on edit
    replyDraft.approvedAt = undefined;
    replyDraft.approvedBy = undefined;

    // Force immediate re-evaluation of compliance
    const freshCompliance = ComplianceEngine.evaluateDraft({ content: newText }, persona, crisisState);
    replyDraft.complianceReport = freshCompliance;
    replyDraft.status = freshCompliance.passed ? 'DRAFT' : 'REJECTED';

    return { ...replyDraft };
  }

  /**
   * Phase 2E1: Human Approval Gate for replies
   */
  public static approveReplyPipeline(
    context: WorkflowContext,
    replyDraft: ReplyDraft
  ): ReplyDraft {
    const { persona, crisisState } = context;

    if (crisisState.isFrozen) {
      throw new Error(`Reply approval blocked: Crisis Pause active (${crisisState.reason || 'Manual creator freeze'})`);
    }

    const freshCompliance = ComplianceEngine.evaluateDraft({ content: replyDraft.selectedText }, persona, crisisState);
    replyDraft.complianceReport = freshCompliance;

    if (!freshCompliance.passed) {
      replyDraft.status = 'REJECTED';
      throw new Error('Reply approval blocked: Reply text violates compliance rules');
    }

    replyDraft.status = 'APPROVED';
    replyDraft.approvedAt = new Date().toISOString();
    replyDraft.approvedBy = 'CREATOR';

    return { ...replyDraft };
  }

  /**
   * Phase 2E1: Send approved reply via isolated MockXClientAdapter
   */
  public static async sendReplyPipeline(
    context: WorkflowContext,
    replyDraft: ReplyDraft
  ): Promise<{ replyDraft: ReplyDraft; result: PublishResult }> {
    const { persona, crisisState, xAdapter } = context;

    // Strict Gate 1: Check Crisis Mode
    if (crisisState.isFrozen) {
      throw new Error(`Sending reply blocked: Crisis Pause active (${crisisState.reason || 'Manual creator freeze'})`);
    }

    // Strict Gate 2: Explicit Human Approval
    if (replyDraft.status !== 'APPROVED') {
      throw new Error(
        `Sending reply blocked: Reply ${replyDraft.id} requires explicit creator approval before sending (current status: '${replyDraft.status}').`
      );
    }

    // Strict Gate 3: Re-verify compliance immediately prior to sending
    const freshCompliance = ComplianceEngine.evaluateDraft({ content: replyDraft.selectedText }, persona, crisisState);
    if (!freshCompliance.passed) {
      replyDraft.status = 'REJECTED';
      replyDraft.complianceReport = freshCompliance;
      throw new Error('Sending reply blocked: Reply failed pre-send compliance verification');
    }

    if (!xAdapter.sendReply) {
      throw new Error('X client adapter does not support sendReply');
    }

    const result = await xAdapter.sendReply(replyDraft.mentionId, replyDraft.selectedText);

    if (result.success && result.tweetId) {
      replyDraft.status = 'SENT';
      replyDraft.sentTweetId = result.tweetId;
      replyDraft.sentAt = new Date().toISOString();
    } else {
      throw new Error(`X API send reply failure: ${result.error || 'Unknown error'}`);
    }

    return { replyDraft, result };
  }
}
