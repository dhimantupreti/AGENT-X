import {
  PersonaConfig,
  EvolutionSignal,
  DraftLifecycleEvent,
  PostDraft,
  AnalyticsOverview,
  HookArchetype,
} from '@/core/types';

export interface SynthesisContext {
  persona: PersonaConfig;
  lifecycleEvents: DraftLifecycleEvent[];
  drafts?: PostDraft[];
  analyticsOverview?: AnalyticsOverview;
  minEventsThreshold?: number; // Minimum total lifecycle events required (default 3)
}

export class EvolutionSignalSynthesizer {
  public static readonly DEFAULT_MIN_EVENTS = 3;

  /**
   * Synthesize dynamic evolution proposals based on in-session and historical lifecycle events.
   * Evaluates Hook Affinity, Pillar Skew, and Dismissal/Fatigue patterns.
   * Enforces minimum evidence guardrails before emitting proposals.
   */
  public static synthesize(context: SynthesisContext): EvolutionSignal[] {
    const {
      persona,
      lifecycleEvents,
      drafts = [],
      analyticsOverview,
      minEventsThreshold = this.DEFAULT_MIN_EVENTS,
    } = context;

    // Minimum evidence guardrail: Do not synthesize proposals if overall interaction volume is insufficient
    if (!lifecycleEvents || lifecycleEvents.length < minEventsThreshold) {
      return [];
    }

    const signals: EvolutionSignal[] = [];

    // 1. Hook Affinity Heuristic (HIGH_PERFORMING_HOOK)
    const hookSignal = this.evaluateHookAffinity(persona, lifecycleEvents);
    if (hookSignal) signals.push(hookSignal);

    // 2. Pillar Skew Heuristic (PILLAR_SHIFT_RECOMMENDED)
    const pillarSignal = this.evaluatePillarSkew(persona, lifecycleEvents, drafts, analyticsOverview);
    if (pillarSignal) signals.push(pillarSignal);

    // 3. Audience Fatigue / Dismissals Heuristic (AUDIENCE_FATIGUE)
    const fatigueSignal = this.evaluateAudienceFatigue(persona, lifecycleEvents, drafts);
    if (fatigueSignal) signals.push(fatigueSignal);

    // Rank all synthesized signals by confidence descending (UI layer caps visible cards to top 2)
    signals.sort((a, b) => b.confidence - a.confidence);

    return signals;
  }

  /**
   * Rule 1: Evaluates whether the creator repeatedly chooses or approves a specific hook archetype.
   */
  private static evaluateHookAffinity(
    persona: PersonaConfig,
    events: DraftLifecycleEvent[]
  ): EvolutionSignal | null {
    // Gather all events where a hook was selected or approved
    const hookEvents = events.filter(
      (e) => (e.eventType === 'HOOK_SWAPPED' || e.eventType === 'APPROVED') && e.selectedHookArchetype
    );

    // Guardrail: Minimum 2 hook-selection interactions required
    if (hookEvents.length < 2) return null;

    const archetypeCounts: Record<HookArchetype, number> = {
      INVERSION: 0,
      HARD_DATA: 0,
      DIRECT_QUESTION: 0,
    };

    for (const e of hookEvents) {
      if (e.selectedHookArchetype && archetypeCounts[e.selectedHookArchetype] !== undefined) {
        archetypeCounts[e.selectedHookArchetype]++;
      }
    }

    const total = hookEvents.length;
    let preferred: HookArchetype | null = null;
    let maxCount = 0;

    for (const [arch, count] of Object.entries(archetypeCounts) as [HookArchetype, number][]) {
      if (count > maxCount) {
        maxCount = count;
        preferred = arch;
      }
    }

    if (!preferred || maxCount < 2) return null;

    const ratio = maxCount / total;
    // Preference threshold: Must represent >= 50% of hook choices
    if (ratio < 0.5) return null;

    // Map archetype to tone tag
    const tagMap: Record<HookArchetype, string> = {
      INVERSION: 'contrarian-inversion',
      HARD_DATA: 'hard-data-metric',
      DIRECT_QUESTION: 'provocative-question',
    };
    const proposedTag = tagMap[preferred];

    // Deduplication guardrail: skip if persona already has this style tag
    if (persona.tone.styleTags.includes(proposedTag)) return null;

    const relevantTweetIds = Array.from(
      new Set(hookEvents.filter((e) => e.selectedHookArchetype === preferred).map((e) => e.draftId))
    );

    const confidence = Math.min(0.96, Math.max(0.85, Number((0.8 + ratio * 0.15).toFixed(2))));

    return {
      id: `sig_dyn_hook_${preferred.toLowerCase()}_${Date.now()}`,
      type: 'HIGH_PERFORMING_HOOK',
      confidence,
      evidence: {
        tweetIds: relevantTweetIds,
        metricComparison: `Creator selected "${preferred.replace('_', ' ')}" in ${maxCount} of ${total} recent hook interactions (${Math.round(ratio * 100)}% preference rate).`,
      },
      proposedAdjustment: {
        field: 'tone',
        currentValue: [...persona.tone.styleTags],
        proposedValue: [...persona.tone.styleTags, proposedTag],
        rationale: `Codify creator's high affinity for ${preferred.toLowerCase().replace('_', ' ')} hook angles into permanent persona voice tags.`,
      },
      draftingImpact: `Stage 4 Grok Drafter will prioritize ${preferred.replace('_', ' ')} hook angles across all content pillars.`,
      status: 'PENDING_APPROVAL',
      createdAt: 'In-Session Telemetry',
    };
  }

  /**
   * Rule 2: Evaluates content pillar skew and over-allocation versus strategic target weights.
   */
  private static evaluatePillarSkew(
    persona: PersonaConfig,
    events: DraftLifecycleEvent[],
    drafts: PostDraft[],
    analyticsOverview?: AnalyticsOverview
  ): EvolutionSignal | null {
    // Collect pillar counts from active drafts and lifecycle events
    const pillarCounts: Record<string, number> = {};
    for (const p of persona.pillars) {
      pillarCounts[p.id] = 0;
    }

    let totalInteractions = 0;

    // Tally from lifecycle events
    for (const e of events) {
      if (e.pillarId && pillarCounts[e.pillarId] !== undefined) {
        pillarCounts[e.pillarId]++;
        totalInteractions++;
      }
    }

    // Tally from active drafts if available
    for (const d of drafts) {
      if (d.pillarId && pillarCounts[d.pillarId] !== undefined) {
        pillarCounts[d.pillarId]++;
        totalInteractions++;
      }
    }

    // Minimum evidence guardrail: Require at least 3 total pillar observations
    if (totalInteractions < 3) return null;

    // Calculate actual share vs target weight
    let maxSkew = 0;
    let overAllocatedPillarId: string | null = null;
    let overAllocatedShare = 0;

    for (const p of persona.pillars) {
      const count = pillarCounts[p.id] || 0;
      const actualShare = (count / totalInteractions) * 100;
      const skew = actualShare - p.weight;
      if (skew > maxSkew) {
        maxSkew = skew;
        overAllocatedPillarId = p.id;
        overAllocatedShare = actualShare;
      }
    }

    // Trigger condition: Skew >= 15%
    if (!overAllocatedPillarId || maxSkew < 15) return null;

    const overAllocatedPillar = persona.pillars.find((p) => p.id === overAllocatedPillarId)!;
    const underAllocatedPillars = persona.pillars.filter((p) => p.id !== overAllocatedPillarId);

    // Calculate safe rebalanced weights (summing strictly to 100)
    // Reduce over-allocated by round(maxSkew / 2), capped between 5 and 15
    const weightShift = Math.min(15, Math.max(5, Math.round(maxSkew / 2)));
    const newOverWeight = overAllocatedPillar.weight - weightShift;

    // Distribute the shift across under-allocated pillars
    const totalUnderWeight = underAllocatedPillars.reduce((sum, p) => sum + p.weight, 0);
    const rebalancedPillars = persona.pillars.map((p) => {
      if (p.id === overAllocatedPillarId) {
        return { ...p, weight: newOverWeight };
      }
      const proportionalAdd = totalUnderWeight > 0 ? Math.round((p.weight / totalUnderWeight) * weightShift) : 0;
      return { ...p, weight: p.weight + proportionalAdd };
    });

    // Ensure total sums to exactly 100 (adjust rounding discrepancy on the largest under-allocated pillar)
    const currentSum = rebalancedPillars.reduce((sum, p) => sum + p.weight, 0);
    const diff = 100 - currentSum;
    if (diff !== 0 && underAllocatedPillars.length > 0) {
      const largestUnder = rebalancedPillars.find((p) => p.id === underAllocatedPillars[0].id);
      if (largestUnder) largestUnder.weight += diff;
    }

    const relevantDraftIds = Array.from(
      new Set(
        events
          .filter((e) => e.pillarId === overAllocatedPillarId)
          .map((e) => e.draftId)
          .concat(drafts.filter((d) => d.pillarId === overAllocatedPillarId).map((d) => d.id))
      )
    );

    return {
      id: `sig_dyn_pillar_${overAllocatedPillarId}_${Date.now()}`,
      type: 'PILLAR_SHIFT_RECOMMENDED',
      confidence: 0.88,
      evidence: {
        tweetIds: relevantDraftIds.slice(0, 3),
        metricComparison: `Pillar "${overAllocatedPillar.name}" accounts for ${Math.round(overAllocatedShare)}% of active queue vs target weight of ${overAllocatedPillar.weight}% (+${Math.round(maxSkew)}% skew).`,
      },
      proposedAdjustment: {
        field: 'pillars',
        currentValue: persona.pillars.map((p) => `${p.name}: ${p.weight}%`),
        proposedValue: rebalancedPillars.map((p) => `${p.name}: ${p.weight}%`),
        rationale: `Re-balance content pillars to prevent audience topical fatigue and align target weights with actual production velocity.`,
      },
      draftingImpact: `Future automated drafting runs will balance queue toward under-allocated pillars.`,
      status: 'PENDING_APPROVAL',
      createdAt: 'In-Session Telemetry',
    };
  }

  /**
   * Rule 3: Evaluates dismissals and detects recurring hype or fatigue buzzwords.
   */
  private static evaluateAudienceFatigue(
    persona: PersonaConfig,
    events: DraftLifecycleEvent[],
    drafts: PostDraft[]
  ): EvolutionSignal | null {
    // Look for dismissed events
    const dismissedEvents = events.filter((e) => e.eventType === 'DISMISSED');

    // Guardrail: Minimum 2 dismissals required
    if (dismissedEvents.length < 2) return null;

    // Common hype buzzwords
    const candidateBuzzwords = ['skyrocket', 'insane', 'unreal', '10x-engineer'];

    // Identify buzzwords that are NOT already in persona.tone.forbiddenPhrases
    const newBuzzwords = candidateBuzzwords.filter(
      (bw) => !persona.tone.forbiddenPhrases.includes(bw)
    );

    if (newBuzzwords.length === 0) return null;

    // Take top 2 additions
    const additions = newBuzzwords.slice(0, 2);

    const relevantDraftIds = Array.from(new Set(dismissedEvents.map((e) => e.draftId)));

    return {
      id: `sig_dyn_fatigue_${Date.now()}`,
      type: 'AUDIENCE_FATIGUE',
      confidence: 0.9,
      evidence: {
        tweetIds: relevantDraftIds.slice(0, 3),
        metricComparison: `${dismissedEvents.length} drafts dismissed in queue. Hype buzzwords detected in rejected draft variations.`,
      },
      proposedAdjustment: {
        field: 'forbiddenPhrases',
        currentValue: [...persona.tone.forbiddenPhrases],
        proposedValue: Array.from(new Set([...persona.tone.forbiddenPhrases, ...additions])),
        rationale: `Expand brand-safety forbidden list to filter out engagement-bait terms and protect authentic creator trust.`,
      },
      draftingImpact: `Compliance Sentinel will automatically reject any draft containing these terms.`,
      status: 'PENDING_APPROVAL',
      createdAt: 'In-Session Telemetry',
    };
  }
}
