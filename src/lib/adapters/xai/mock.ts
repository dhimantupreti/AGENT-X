import { IXAIClientAdapter, GenerateDraftRequest } from './interface';
import { DraftGenerationResponse } from '@/core/schemas';
import { HookVariation, CrisisRiskAssessment, PersonaConfig, ReplyOption } from '@/core/types';
import { MentionTriageItem } from '@/lib/adapters/x/interface';

export class MockXAIClientAdapter implements IXAIClientAdapter {
  async generateDraft(request: GenerateDraftRequest): Promise<DraftGenerationResponse> {
    await new Promise((resolve) => setTimeout(resolve, 400));

    const { persona, pillar, topic, seedAngle } = request;
    const contextTopic = seedAngle || topic || pillar.sampleHooks[0] || 'Solo leverage and distribution';

    // Generate 3 distinct hook variations (Inversion, Hard Data, Direct Question)
    const hookVariations: HookVariation[] = [
      {
        id: `hook_inv_${Date.now()}`,
        archetype: 'INVERSION',
        hook: `Most solo creators spend 80% of their energy building features and 20% on distribution.\n\nThe top 1% invert this ratio completely.\n\nHere is how we distribute with leverage:`,
        score: 94,
        rationale: 'Contrarian inversion pattern drives high bookmark retention among solo founders.',
      },
      {
        id: `hook_data_${Date.now()}`,
        archetype: 'HARD_DATA',
        hook: `We scaled our bootstrapped micro-SaaS from $0 to $18k MRR with $45/month in server costs.\n\nNo venture capital. No marketing agency.\n\nThe exact technical playbook:`,
        score: 91,
        rationale: 'Concrete financial receipts and lean infrastructure numbers create immediate authority.',
      },
      {
        id: `hook_quest_${Date.now()}`,
        archetype: 'DIRECT_QUESTION',
        hook: `What is the single most expensive mistake solo founders make in year 1?\n\nOptimizing for vanity likes instead of high-intent bookmarks and DMs.\n\nA 3-part diagnostic framework:`,
        score: 87,
        rationale: 'Diagnostic question targets founder self-reflection and encourages discussion.',
      },
    ];

    if (request.format === 'THREAD') {
      return {
        primaryTweet: hookVariations[0].hook,
        hookVariations,
        threadTweets: [
          `[Core: Problem Discovery]\n1/ The 'Customer Problem Library':\n\nNever start building in a vacuum. Spend 2 weeks categorizing recurring friction in niche communities before writing your first database schema.`,
          `[Core: Lean Systems]\n2/ Ruthless Simplicity:\n\nPick boring, reliable technologies. Every complex microservice you avoid is a support ticket you will never have to debug at 2 AM.`,
          `[Core: Distribution Feedback]\n3/ Double Down on Bookmarks:\n\nTrack your bookmark-to-impression ratio. High bookmarks signal retention value that should be expanded into your core product onboarding.`,
          `[Creator CTA]\n4/ Summary:\n\n• Curate customer problems\n• Keep infrastructure minimal\n• Follow high-intent signals\n\nIf you enjoyed this breakdown, follow @${persona.handle} for more raw breakdowns on building solo.`,
        ],
        hashtags: ['buildinpublic', 'solopreneur', 'indiehackers'],
        hookScore: hookVariations[0].score,
        strategicRationale: `Multi-hook thread blueprint generated for topic "${contextTopic}". Structured across Hook, Core Insights, and Creator CTA.`,
        suggestedScheduleSlot: 'MORNING_PRIME',
        generationEngine: 'mock',
        generatorModel: 'mock-grok',
      };
    }

    return {
      primaryTweet: hookVariations[0].hook,
      hookVariations,
      threadTweets: [],
      hashtags: ['buildinpublic', 'startups'],
      hookScore: hookVariations[0].score,
      strategicRationale: `Generated 3 hook variations for "${contextTopic}". Defaulting to top-scored Inversion Hook.`,
      suggestedScheduleSlot: 'AFTERNOON_PEAK',
      generationEngine: 'mock',
      generatorModel: 'mock-grok',
    };
  }

  async analyzeCrisisRisk(text: string, _persona?: PersonaConfig): Promise<CrisisRiskAssessment> {
    const criticalAbuseTerms = ['kill', 'threat', 'slur', 'harass', 'doxx', 'abuse'];
    const matchedAbuse = criticalAbuseTerms.filter((term) => text.toLowerCase().includes(term));

    if (matchedAbuse.length > 0) {
      return {
        riskScore: 92,
        brandLiability: 'HIGH',
        toneToxicity: 'HIGH',
        sarcasmAmbiguityRisk: 'LOW',
        escalationRequired: true,
        reason: `Detected explicit abusive or hostile language: ${matchedAbuse.join(', ')}`,
        recommendation: 'Reject or completely rewrite content before publishing.',
        generationEngine: 'mock',
        assessedAt: new Date().toISOString(),
      };
    }

    const sensitiveTerms = ['scam', 'fraud', 'bankrupt', 'hack', 'lawsuit', 'ponzi'];
    const matched = sensitiveTerms.filter((term) => text.toLowerCase().includes(term));

    if (matched.length > 0) {
      return {
        riskScore: 85,
        brandLiability: 'HIGH',
        toneToxicity: 'MEDIUM',
        sarcasmAmbiguityRisk: 'LOW',
        escalationRequired: true,
        reason: `Detected sensitive high-risk terms: ${matched.join(', ')}`,
        recommendation: 'Escalate to creator review and freeze auto-publishing until verified.',
        generationEngine: 'mock',
        assessedAt: new Date().toISOString(),
      };
    }

    return {
      riskScore: 5,
      brandLiability: 'LOW',
      toneToxicity: 'LOW',
      sarcasmAmbiguityRisk: 'LOW',
      escalationRequired: false,
      reason: 'No crisis indicators, brand liabilities, or hostile phrasing detected.',
      recommendation: 'Proceed with standard approval pipeline.',
      generationEngine: 'mock',
      assessedAt: new Date().toISOString(),
    };
  }

  async generateReplyOptions(mention: MentionTriageItem, persona: PersonaConfig): Promise<ReplyOption[]> {
    await new Promise((resolve) => setTimeout(resolve, 350));

    const options: ReplyOption[] = [];
    const textLower = mention.text.toLowerCase();

    if (
      mention.sentiment === 'POSITIVE' ||
      textLower.includes('how') ||
      textLower.includes('what') ||
      textLower.includes('why')
    ) {
      options.push({
        id: `opt_insight_${Date.now()}_1`,
        toneStyle: 'DIRECT_INSIGHT',
        text: `@${mention.authorHandle} Great question. In solopreneur architectures, we prioritize low maintenance and high analytical leverage. Simple setup, zero ops overhead.`,
        rationale: 'Direct, educational, and highlights architectural leverage without marketing fluff.',
      });
      options.push({
        id: `opt_followup_${Date.now()}_2`,
        toneStyle: 'CONVERSATIONAL_FOLLOWUP',
        text: `@${mention.authorHandle} Exactly. The key tradeoff is query speed vs storage costs. For telemetry and bookmarks, columnar partitioning gives you 10x clarity with minimal code.`,
        rationale: 'Engaging, technical follow-up that invites deeper audience conversation.',
      });
    } else if (
      mention.sentiment === 'NEGATIVE' ||
      textLower.includes('garbage') ||
      textLower.includes('fail') ||
      textLower.includes('wrong')
    ) {
      options.push({
        id: `opt_reframe_${Date.now()}_1`,
        toneStyle: 'CONTRARIAN_REFRAME',
        text: `@${mention.authorHandle} Valid skepticism. Most tools optimize for vanity post counts. I only care about bookmark-to-impression ratio and actual revenue conversion.`,
        rationale: 'Acknowledges critique calmly and pivots to empirical solopreneur metric discipline.',
      });
      options.push({
        id: `opt_insight_${Date.now()}_2`,
        toneStyle: 'DIRECT_INSIGHT',
        text: `@${mention.authorHandle} Fair pushback. That is why every post runs through strict persona constraints—no hype buzzwords, no platitudes, just reproducible systems.`,
        rationale: 'Direct defense grounded in persona compliance rules and transparent standards.',
      });
    } else {
      // Neutral / Attack / Spam
      options.push({
        id: `opt_boundary_${Date.now()}_1`,
        toneStyle: 'DIPLOMATIC_BOUNDARY',
        text: `@${mention.authorHandle} Thanks for the comment. We stay focused on lean software distribution and solopreneur revenue systems.`,
        rationale: 'Maintains polite but firm topical boundaries without feeding hostility.',
      });
      options.push({
        id: `opt_followup_${Date.now()}_2`,
        toneStyle: 'CONVERSATIONAL_FOLLOWUP',
        text: `@${mention.authorHandle} Appreciate the note. Sharing the breakdown and live numbers here every week.`,
        rationale: 'Short, courteous acknowledgment that directs attention back to verifiable insights.',
      });
    }

    return options;
  }
}
