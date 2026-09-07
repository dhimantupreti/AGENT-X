import { IXAIClientAdapter, GenerateDraftRequest } from './interface';
import { DraftGenerationResponse } from '@/core/schemas';

export class MockXAIClientAdapter implements IXAIClientAdapter {
  async generateDraft(request: GenerateDraftRequest): Promise<DraftGenerationResponse> {
    await new Promise((resolve) => setTimeout(resolve, 600));

    const { persona, pillar } = request;

    if (request.format === 'THREAD') {
      return {
        primaryTweet: `Most solo creators spend 80% of their energy creating content and 20% distributing it.\n\nThe top 1% invert this ratio completely.\n\nHere is the 4-step flywheel we use to generate 500k+ impressions every month with zero ad spend 🧵👇`,
        threadTweets: [
          `1/ The 'Atomic Insight' Framework:\n\nNever start with an empty editor. Document 1 genuine customer problem or technical hurdle you solved today.\n\nYour daily logs are your greatest content moat.`,
          `2/ Contrarian Observation:\n\nAvoid safe consensus takes. The algorithm and your audience both reward high-conviction perspectives that challenge prevailing conventional wisdom.`,
          `3/ The Feedback Loop:\n\nLook at your top 5% bookmarks. Expand that single idea into a dedicated deep dive next week. High bookmarks = high value retained.`,
          `4/ Summary:\n\n• Document your work daily\n• Pick high-conviction stances\n• Double down on bookmarked hooks\n\nIf you enjoyed this, follow @${persona.handle} for more raw breakdowns on building solo.`,
        ],
        hashtags: ['buildinpublic', 'solopreneur', 'creatorEconomy'],
        hookScore: 92,
        strategicRationale: `Leverages a strong contrast pattern (80/20 inversion) aligned with pillar '${pillar.name}' and tone '${persona.tone.primary}'. High hook potential for solo founders.`,
        suggestedScheduleSlot: 'MORNING_PRIME',
      };
    }

    return {
      primaryTweet: `The single biggest mistake I see early founders make on X:\n\nOptimizing for likes instead of DMs and high-intent profile clicks.\n\n100 vanity likes < 3 enterprise conversations. Build for buyers, not lurkers.`,
      threadTweets: [],
      hashtags: ['buildinpublic', 'startups'],
      hookScore: 88,
      strategicRationale: `Addresses a common founder blind spot with high-contrast formatting. Direct, punchy, and adheres to '${persona.tone.primary}' voice without fluff.`,
      suggestedScheduleSlot: 'AFTERNOON_ENGAGEMENT',
    };
  }

  async analyzeCrisisRisk(text: string): Promise<{ riskScore: number; reason: string; recommendation: string }> {
    const sensitiveTerms = ['scam', 'fraud', 'bankrupt', 'hack', 'lawsuit', 'ponzi'];
    const matched = sensitiveTerms.filter((term) => text.toLowerCase().includes(term));

    if (matched.length > 0) {
      return {
        riskScore: 85,
        reason: `Detected sensitive high-risk terms: ${matched.join(', ')}`,
        recommendation: 'Escalate to creator review and freeze auto-publishing until verified.',
      };
    }

    return {
      riskScore: 5,
      reason: 'No crisis indicators or brand risk flags detected.',
      recommendation: 'Proceed with standard approval pipeline.',
    };
  }
}
