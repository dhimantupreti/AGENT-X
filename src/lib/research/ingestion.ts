import { PersonaConfig, ContentPillar, ResearchCategory, ResearchItem } from '@/core/types';

export const RESEARCH_CATEGORIES: ResearchCategory[] = [
  'AUDIENCE_FRICTION',
  'CONTRARIAN_THESIS',
  'CASE_STUDY',
];

export class IdeaIngestionEngine {
  /**
   * Deterministic category classifier based on keyword heuristic density
   */
  public static classifyCategory(rawText: string): ResearchCategory {
    const text = rawText.toLowerCase();

    // 1. Case Study Indicators (metrics, percentages, milestones, revenue, experiments)
    const caseStudyPattern = /(\$?\b\d+k?\b|\b\d+%\b|\bmrr\b|\barr\b|\brevenue\b|\bcustomers?\b|\busers?\b|\bgrew\b|\bgrowth\b|\bbenchmark\b|\bcase study\b|\bexperiment\b|\bstack\b|\bspent \d+\b|\bjumped\b|\bconversion\b)/i;
    const hasCaseStudySignals = caseStudyPattern.test(text);

    // 2. Contrarian Thesis Indicators (provocative counter-takes, myths, unconventional truths)
    const contrarianPattern = /\b(stop|don't|dont|myth|unpopular|wrong|actually|instead|truth|overrated|waste|overkill|nobody needs|stop doing|anti-pattern)\b/i;
    const hasContrarianSignals = contrarianPattern.test(text);

    // 3. Audience Friction Indicators (pain points, struggles, burnout, traps)
    const frictionPattern = /\b(hate|struggle|problem|fail|failed|annoying|frustrated|mistake|burnout|anxiety|waste of time|stuck|friction|tired of|exhausted|headache)\b/i;
    const hasFrictionSignals = frictionPattern.test(text);

    // Scoring precedence
    if (hasCaseStudySignals && !hasContrarianSignals && !hasFrictionSignals) {
      return 'CASE_STUDY';
    }
    if (hasFrictionSignals && !hasContrarianSignals) {
      return 'AUDIENCE_FRICTION';
    }
    if (hasContrarianSignals) {
      return 'CONTRARIAN_THESIS';
    }
    if (hasCaseStudySignals) {
      return 'CASE_STUDY';
    }

    return 'CONTRARIAN_THESIS';
  }

  /**
   * Deterministic content pillar matching based on semantic keyword scoring against persona pillars
   */
  public static matchPillar(rawText: string, pillars: ContentPillar[]): string {
    if (!pillars || pillars.length === 0) return '';

    const text = rawText.toLowerCase();

    // Pillar keyword heuristics
    const keywordMap: Record<string, string[]> = {
      pillar_scale: [
        'distribution', 'mrr', 'arr', 'revenue', 'sales', 'growth', 'customer', 'acquisition',
        'subscribers', 'newsletter', 'marketing', 'channel', 'conversion', 'offer', 'monetize',
      ],
      pillar_systems: [
        'stack', 'code', 'database', 'next.js', 'serverless', 'kubernetes', 'cloud', 'deploy',
        'devops', 'engineering', 'architecture', 'backend', 'frontend', 'sql', 'bigquery',
        'build', 'infra', 'infrastructure', 'tech', 'api', 'microservices',
      ],
      pillar_mindset: [
        'burnout', 'mindset', 'analytics', 'fear', 'focus', 'psychology', 'reality', 'solo',
        'founder', 'habits', 'consistency', 'fatigue', 'discipline', 'isolation', 'anxiety',
        'side project', 'mental', 'sanity', 'patience',
      ],
    };

    let bestPillarId = pillars[0].id;
    let highestScore = -1;

    for (const pillar of pillars) {
      let score = 0;
      const specificKeywords = keywordMap[pillar.id] || [];

      // Match against specific keyword dictionary
      for (const kw of specificKeywords) {
        if (text.includes(kw)) score += 3;
      }

      // Match against pillar name tokens
      const nameTokens = pillar.name.toLowerCase().split(/\s+/);
      for (const token of nameTokens) {
        if (token.length > 3 && text.includes(token)) score += 2;
      }

      // Match against pillar description tokens
      const descTokens = pillar.description.toLowerCase().split(/\s+/);
      for (const token of descTokens) {
        if (token.length > 4 && text.includes(token)) score += 1;
      }

      if (score > highestScore) {
        highestScore = score;
        bestPillarId = pillar.id;
      }
    }

    return bestPillarId;
  }

  /**
   * Refines a raw note into a structured, draft-ready ResearchItem
   */
  public static refineNote(
    rawText: string,
    persona: PersonaConfig,
    overrideCategory?: ResearchCategory
  ): ResearchItem {
    const trimmed = (rawText || '').trim();
    if (trimmed.length < 10) {
      throw new Error('Raw idea note must be at least 10 characters long to extract high-signal topics.');
    }

    const category = overrideCategory || this.classifyCategory(trimmed);
    const pillarId = this.matchPillar(trimmed, persona.pillars);

    // Clean up text
    const cleanSentence = trimmed.replace(/\s+/g, ' ').replace(/["']/g, '');

    // Synthesize clean Topic title (extract first 4-7 words or format cleanly)
    let topic = cleanSentence
      .split(/[.!?\n]/)[0]
      .split(/\s+/)
      .slice(0, 6)
      .join(' ');
    
    // Capitalize topic words
    topic = topic
      .split(' ')
      .map((w) => (w.length > 2 ? w.charAt(0).toUpperCase() + w.slice(1) : w))
      .join(' ');

    if (!topic.endsWith('.')) topic = topic.replace(/[,;:]$/, '');

    // Synthesize concise summary
    const summary = cleanSentence.length > 140
      ? cleanSentence.slice(0, 137) + '...'
      : cleanSentence;

    // Synthesize Audience Pain Point & Hook Seed Angle
    let audiencePainPoint = 'Wasted effort and misallocated resources in solo execution.';
    let seedAngle = cleanSentence;

    if (category === 'CONTRARIAN_THESIS') {
      audiencePainPoint = 'Following generic startup consensus that destroys solopreneur leverage.';
      seedAngle = `Why conventional wisdom on ${topic.toLowerCase()} is completely backwards for solo founders.`;
    } else if (category === 'CASE_STUDY') {
      audiencePainPoint = 'Lack of transparent, verified metrics and real solo architectures.';
      seedAngle = `The exact numbers and teardown behind ${topic.toLowerCase()}: what actually moved the needle.`;
    } else if (category === 'AUDIENCE_FRICTION') {
      audiencePainPoint = 'Costly mistakes and fatigue from over-engineering without audience validation.';
      seedAngle = `The biggest trap with ${topic.toLowerCase()} and how solo builders can bypass it entirely.`;
    }

    return {
      id: `res_note_${Date.now()}`,
      pillarId,
      category,
      topic,
      summary,
      seedAngle,
      audiencePainPoint,
      isUserCreated: true,
      createdAt: new Date().toISOString(),
      rawNoteSource: trimmed,
    };
  }
}
