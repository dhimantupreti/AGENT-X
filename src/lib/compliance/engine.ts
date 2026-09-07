import { ComplianceReport, ComplianceViolation, PostDraft, PersonaConfig, CrisisState } from '@/core/types';

export class ComplianceEngine {
  /**
   * Run comprehensive pre-draft and pre-publish compliance checks
   */
  public static evaluateDraft(
    draft: Partial<PostDraft>,
    persona: PersonaConfig,
    crisisState?: CrisisState
  ): ComplianceReport {
    const violations: ComplianceViolation[] = [];
    let score = 100;

    // 1. Emergency Crisis Freeze Check
    if (crisisState?.isFrozen) {
      violations.push({
        ruleId: 'CRISIS_FREEZE_ACTIVE',
        severity: 'CRITICAL',
        category: 'X_POLICY',
        message: `Publishing is halted due to active Crisis Pause: ${crisisState.reason || 'Manual creator freeze'}`,
        suggestion: 'Resolve the active crisis incident in the Triage Radar before publishing.',
      });
      score = 0;
    }

    const allTweets = [draft.content || '', ...(draft.thread || [])];

    // 2. Character Length Constraints
    allTweets.forEach((tweet, index) => {
      if (tweet.length > 280) {
        violations.push({
          ruleId: 'CHAR_LIMIT_EXCEEDED',
          severity: 'CRITICAL',
          category: 'X_POLICY',
          message: `Tweet ${index + 1} exceeds the 280 character limit (${tweet.length} characters).`,
          suggestion: 'Trim excess words or convert the long section into an additional thread tweet.',
        });
        score -= 30;
      }
    });

    // 3. Persona Forbidden Phrases Check
    const forbiddenList = persona.tone.forbiddenPhrases || [];
    forbiddenList.forEach((phrase) => {
      const regex = new RegExp(`\\b${phrase}\\b`, 'i');
      allTweets.forEach((tweet, index) => {
        if (regex.test(tweet)) {
          violations.push({
            ruleId: 'FORBIDDEN_PHRASE_DETECTED',
            severity: 'CRITICAL',
            category: 'BRAND_SAFETY',
            message: `Tweet ${index + 1} contains banned brand phrase: "${phrase}".`,
            suggestion: `Replace or remove "${phrase}" to maintain brand voice integrity.`,
          });
          score -= 25;
        }
      });
    });

    // 4. Over-Hashtagging / Engagement Farming Check
    allTweets.forEach((tweet, index) => {
      const hashtagCount = (tweet.match(/#[a-zA-Z0-9_]+/g) || []).length;
      if (hashtagCount > 3) {
        violations.push({
          ruleId: 'EXCESSIVE_HASHTAGS',
          severity: 'WARNING',
          category: 'X_POLICY',
          message: `Tweet ${index + 1} contains ${hashtagCount} hashtags. More than 2-3 hashtags reduces distribution on X.`,
          suggestion: 'Limit hashtags to 1-2 highly relevant niche tags, or drop them entirely.',
        });
        score -= 10;
      }
    });

    // 5. Unsubstantiated / Guaranteed Return Claims
    const riskyHypePatterns = [
      /guaranteed\s+(returns?|income|profit|money)/i,
      /100%\s+risk[\s-]free/i,
      /secret\s+money\s+glitch/i,
      /get\s+rich\s+quick/i,
    ];

    riskyHypePatterns.forEach((pattern) => {
      allTweets.forEach((tweet, index) => {
        if (pattern.test(tweet)) {
          violations.push({
            ruleId: 'DECEPTIVE_HYPE_CLAIM',
            severity: 'CRITICAL',
            category: 'CLAIM_VERIFICATION',
            message: `Tweet ${index + 1} uses high-risk hype language matching "${pattern.source}".`,
            suggestion: 'Reframe claim around personal experience or verifiable data points.',
          });
          score -= 35;
        }
      });
    });

    // 6. Excessive All-Caps Shouting
    allTweets.forEach((tweet, index) => {
      const words = tweet.split(/\s+/).filter((w) => w.length > 3);
      const capsWords = words.filter((w) => w === w.toUpperCase() && /^[A-Z]+$/.test(w));
      if (capsWords.length >= 4) {
        violations.push({
          ruleId: 'AGGRESSIVE_CAPS_DETECTED',
          severity: 'WARNING',
          category: 'TONE_DEVIATION',
          message: `Tweet ${index + 1} contains excessive ALL-CAPS words (${capsWords.join(', ')}).`,
          suggestion: 'Use sentence casing with bold or line breaks for emphasis instead.',
        });
        score -= 10;
      }
    });

    const normalizedScore = Math.max(0, Math.min(100, score));
    const passed = violations.every((v) => v.severity !== 'CRITICAL') && normalizedScore >= 70;

    return {
      passed,
      score: normalizedScore,
      violations,
      checkedAt: new Date().toISOString(),
    };
  }
}
