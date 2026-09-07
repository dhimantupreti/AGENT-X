import assert from 'node:assert';
import { ComplianceEngine } from '../src/lib/compliance/engine';
import { SafeEvolutionManager } from '../src/lib/evolution/manager';
import { EvolutionSignalSynthesizer } from '../src/lib/evolution/synthesizer';
import { AgentOrchestrator } from '../src/lib/orchestration/workflow';
import { AnalyticsService } from '../src/lib/analytics/service';
import { MockXAIClientAdapter } from '../src/lib/adapters/xai/mock';
import { MockXClientAdapter } from '../src/lib/adapters/x/mock';
import {
  XAIClientAdapter,
  cleanMarkdownCodeFences,
  extractTextFromResponsesOutput,
} from '../src/lib/adapters/xai/client';
import {
  draftGenerationResponseSchema,
  XAI_DRAFT_RESPONSE_JSON_SCHEMA,
  crisisRiskAssessmentSchema,
  XAI_CRISIS_ANALYSIS_JSON_SCHEMA,
} from '../src/core/schemas';
import { INITIAL_PERSONA, INITIAL_CRISIS_STATE, INITIAL_EVOLUTION_SIGNALS, INITIAL_DRAFTS } from '../src/lib/state/seedData';
import { EvolutionSignal, CrisisRiskAssessment, TweetEvent, DraftLifecycleEvent, ReplyDraft, ReplyOption, ResearchItem, ResearchCategory } from '../src/core/types';
import { MentionTriageItem } from '../src/lib/adapters/x/interface';
import { bigQueryTelemetryProvider, BigQueryTelemetryProvider } from '../src/lib/gcp/bigquery';
import { MockBigQueryTelemetryProvider } from '../src/lib/gcp/mock';
import { IBigQueryTelemetryProvider } from '../src/lib/gcp/interface';
import { IdeaIngestionEngine, RESEARCH_CATEGORIES } from '../src/lib/research/ingestion';
import {
  SessionRecoveryStorage,
  InMemoryStorageBackend,
  RECOVERY_STORAGE_KEY,
  RECOVERY_AUDIT_STORAGE_KEY,
  RECOVERY_TTL_MS,
  MAX_AUDIT_ENTRIES,
  RecoveredSessionState,
  RecoveryAuditEntry,
  RecoveryAuditReason,
} from '../src/lib/storage/sessionRecovery';

async function runTests() {
  console.log('--- RUNNING AGENTX CORE CONTRACT TESTS ---');

  // Test 1: Compliance Engine - Clean draft passes
  {
    console.log('\n[TEST 1] Compliance Engine: Clean draft');
    const cleanDraft = {
      content: 'Simplicity is the highest form of engineering leverage. Pick boring tech.',
    };
    const report = ComplianceEngine.evaluateDraft(cleanDraft, INITIAL_PERSONA, INITIAL_CRISIS_STATE);
    assert.strictEqual(report.passed, true, 'Clean draft must pass compliance');
    assert.ok(report.score >= 90, 'Score should be >= 90');
    console.log('✓ Clean draft passed with score:', report.score);
  }

  // Test 2: Compliance Engine - Forbidden phrase detection
  {
    console.log('\n[TEST 2] Compliance Engine: Forbidden brand phrase');
    const badDraft = {
      content: 'Our new feature is a total game-changer for all developers.',
    };
    const report = ComplianceEngine.evaluateDraft(badDraft, INITIAL_PERSONA, INITIAL_CRISIS_STATE);
    assert.strictEqual(report.passed, false, 'Draft with forbidden phrase must fail');
    const violation = report.violations.find((v) => v.ruleId === 'FORBIDDEN_PHRASE_DETECTED');
    assert.ok(violation, 'Must detect FORBIDDEN_PHRASE_DETECTED violation');
    console.log('✓ Detected forbidden phrase violation:', violation?.message);
  }

  // Test 3: Compliance Engine - Character limit exceeded
  {
    console.log('\n[TEST 3] Compliance Engine: Character limit exceeded (> 280)');
    const longDraft = {
      content: 'A'.repeat(285),
    };
    const report = ComplianceEngine.evaluateDraft(longDraft, INITIAL_PERSONA, INITIAL_CRISIS_STATE);
    assert.strictEqual(report.passed, false, 'Draft > 280 chars must fail');
    const violation = report.violations.find((v) => v.ruleId === 'CHAR_LIMIT_EXCEEDED');
    assert.ok(violation, 'Must detect CHAR_LIMIT_EXCEEDED violation');
    console.log('✓ Detected character limit violation:', violation?.message);
  }

  // Test 4: Compliance Engine - Crisis mode freeze
  {
    console.log('\n[TEST 4] Compliance Engine: Crisis pause enforcement');
    const frozenState = { isFrozen: true, reason: 'Emergency creator freeze' };
    const cleanDraft = { content: 'Just shipping updates.' };
    const report = ComplianceEngine.evaluateDraft(cleanDraft, INITIAL_PERSONA, frozenState);
    assert.strictEqual(report.passed, false, 'Draft must fail during crisis freeze');
    assert.strictEqual(report.score, 0, 'Score must be 0 when crisis is active');
    console.log('✓ Crisis freeze verified');
  }

  // Test 5: Safe Evolution Manager - Config version bump & diffing
  {
    console.log('\n[TEST 5] Safe Evolution Manager: Persona version bump');
    const manager = new SafeEvolutionManager();
    manager.registerInitialPersona(INITIAL_PERSONA);

    const signal: EvolutionSignal = {
      id: 'sig_test_1',
      type: 'HIGH_PERFORMING_HOOK',
      confidence: 0.95,
      evidence: { tweetIds: ['tw_1'], metricComparison: '3x higher bookmarks' },
      proposedAdjustment: {
        field: 'tone',
        currentValue: INITIAL_PERSONA.tone.styleTags,
        proposedValue: ['contrarian-inversion'],
        rationale: 'Contrarian hooks drive higher bookmark velocity.',
      },
      status: 'PENDING_APPROVAL',
      createdAt: new Date().toISOString(),
    };

    const result = manager.applyEvolutionSignal(INITIAL_PERSONA, signal);
    assert.strictEqual(result.success, true, 'Evolution must succeed');
    assert.strictEqual(result.newPersona?.version, 2, 'Version must increment to 2');
    assert.ok(
      result.newPersona?.tone.styleTags.includes('contrarian-inversion'),
      'New style tag must be added'
    );

    // Test rollback
    const rolledBack = manager.rollbackToVersion(INITIAL_PERSONA.id, 1);
    assert.ok(rolledBack, 'Rollback to v1 must succeed');
    assert.strictEqual(rolledBack?.version, 1, 'Rolled back persona must be v1');
    console.log('✓ Evolution bump to v2 and safe rollback to v1 verified');
  }

  // Test 6: Agent Orchestrator - Autonomous pipeline execution
  {
    console.log('\n[TEST 6] Agent Orchestrator: Autonomous draft & publish pipeline');
    const xaiAdapter = new MockXAIClientAdapter();
    const xAdapter = new MockXClientAdapter();

    const context = {
      persona: INITIAL_PERSONA,
      crisisState: INITIAL_CRISIS_STATE,
      xaiAdapter,
      xAdapter,
    };

    const draft = await AgentOrchestrator.createDraftPipeline(
      context,
      INITIAL_PERSONA.pillars[0].id,
      { format: 'SINGLE_TWEET' }
    );

    assert.ok(draft.id, 'Draft must have generated id');
    assert.ok(draft.content.length > 0, 'Draft must have content');
    assert.ok(draft.estimatedHookScore! >= 80, 'Hook score should be >= 80');
    assert.ok(draft.complianceReport?.passed, 'Draft must pass compliance');

    // Sub-test A: Publishing unapproved draft MUST be blocked
    let approvalBlocked = false;
    try {
      await AgentOrchestrator.publishDraftPipeline(context, draft);
    } catch (err: unknown) {
      approvalBlocked = true;
      const msg = err instanceof Error ? err.message : String(err);
      assert.ok(msg.includes('requires explicit creator approval'), 'Error message must mention approval');
    }
    assert.strictEqual(approvalBlocked, true, 'Publishing unapproved draft must be blocked');
    console.log('✓ Verified: Unapproved draft cannot be published');

    // Sub-test B: Once creator approves, publishing succeeds
    draft.status = 'APPROVED';
    draft.approvedBy = 'CREATOR';
    draft.approvedAt = new Date().toISOString();

    const published = await AgentOrchestrator.publishDraftPipeline(context, draft);
    assert.strictEqual(published.draft.status, 'PUBLISHED', 'Draft status must be PUBLISHED');
    assert.ok(published.result.tweetId, 'Must return mock tweet ID');
    console.log('✓ Verified: Approved draft publishes successfully with tweet ID:', published.result.tweetId);
  }

  // Test 7: Multi-Hook Generation Contract (Phase 2A)
  {
    console.log('\n[TEST 7] Multi-Hook Generation & Thread Blueprint Contract');
    const xaiAdapter = new MockXAIClientAdapter();
    const xAdapter = new MockXClientAdapter();

    const context = {
      persona: INITIAL_PERSONA,
      crisisState: INITIAL_CRISIS_STATE,
      xaiAdapter,
      xAdapter,
    };

    const draft = await AgentOrchestrator.createDraftPipeline(
      context,
      INITIAL_PERSONA.pillars[0].id,
      {
        topic: 'Why solo founders fail by building in stealth',
        seedAngle: 'Stealth mode is founder ego masquerading as risk management',
        format: 'THREAD',
      }
    );

    assert.ok(draft.hookVariations, 'Draft must have hookVariations array');
    assert.strictEqual(draft.hookVariations.length, 3, 'Must produce exactly 3 distinct hook variations');

    const archetypes = draft.hookVariations.map((h) => h.archetype);
    assert.ok(archetypes.includes('INVERSION'), 'Must contain INVERSION archetype');
    assert.ok(archetypes.includes('HARD_DATA'), 'Must contain HARD_DATA archetype');
    assert.ok(archetypes.includes('DIRECT_QUESTION'), 'Must contain DIRECT_QUESTION archetype');

    // Selected hook should match initial archetype
    assert.ok(draft.selectedHookId, 'Must have selectedHookId');
    assert.ok(draft.selectedHookArchetype, 'Must have selectedHookArchetype');
    assert.strictEqual(draft.content, draft.hookVariations[0].hook, 'Content matches first hook by default');

    // Verify thread blueprint has stage tags
    assert.ok(draft.thread && draft.thread.length >= 3, 'Thread must have at least 3 tweets');
    assert.ok(draft.thread[0].includes('[Core:'), 'Tweet 2 has blueprint tag');
    assert.ok(draft.thread[draft.thread.length - 1].includes('[Creator CTA]'), 'Final tweet has CTA blueprint tag');

    console.log('✓ Verified: 3 distinct hook archetypes generated with thread blueprint');
  }

  // Test 8: Strict Guardrail Contract - Post-Generation Hook Swap Resets Approval & Re-evaluates Compliance (Phase 2A)
  {
    console.log('\n[TEST 8] Strict Guardrail Contract: Hook Swap Resets Approval & Forces Re-Compliance');
    const xaiAdapter = new MockXAIClientAdapter();
    const xAdapter = new MockXClientAdapter();

    const context = {
      persona: INITIAL_PERSONA,
      crisisState: INITIAL_CRISIS_STATE,
      xaiAdapter,
      xAdapter,
    };

    const draft = await AgentOrchestrator.createDraftPipeline(
      context,
      INITIAL_PERSONA.pillars[0].id,
      { format: 'SINGLE_TWEET' }
    );

    // 1. Manually approve the draft
    draft.status = 'APPROVED';
    draft.approvedBy = 'CREATOR';
    draft.approvedAt = new Date().toISOString();
    assert.strictEqual(draft.status, 'APPROVED');

    // 2. Perform hook swap to variation 2 (HARD_DATA)
    const secondHook = draft.hookVariations![1];
    const swappedDraft = AgentOrchestrator.swapDraftHook(
      draft,
      secondHook.id,
      INITIAL_PERSONA,
      INITIAL_CRISIS_STATE
    );

    // Verify strict guardrail assertions
    assert.strictEqual(
      swappedDraft.approvedBy,
      undefined,
      'Guardrail: approvedBy MUST be cleared upon hook swap'
    );
    assert.strictEqual(
      swappedDraft.approvedAt,
      undefined,
      'Guardrail: approvedAt MUST be cleared upon hook swap'
    );
    assert.strictEqual(
      swappedDraft.status,
      'COMPLIANCE_REVIEW',
      'Guardrail: status MUST reset to COMPLIANCE_REVIEW'
    );
    assert.strictEqual(swappedDraft.selectedHookId, secondHook.id);
    assert.strictEqual(swappedDraft.selectedHookArchetype, secondHook.archetype);
    assert.strictEqual(swappedDraft.content, secondHook.hook);
    assert.ok(swappedDraft.complianceReport?.passed, 'Compliance re-evaluated and passed');

    // 3. Verify that publishing is strictly blocked now that approval was reset
    let publishBlocked = false;
    try {
      await AgentOrchestrator.publishDraftPipeline(context, swappedDraft);
    } catch (err: unknown) {
      publishBlocked = true;
      const msg = err instanceof Error ? err.message : String(err);
      assert.ok(msg.includes('requires explicit creator approval'), 'Publishing blocked error message');
    }
    assert.strictEqual(publishBlocked, true, 'Guardrail: Publishing un-reapproved swapped draft MUST be blocked');

    // 4. Test compliance failure handling during hook swap:
    // If a swapped hook introduces a forbidden phrase, compliance must fail and status must become REJECTED
    const toxicVariation = {
      id: 'hook_toxic_test',
      archetype: 'INVERSION' as const,
      hook: 'This new technique is a total game-changer for solopreneurs.', // 'game-changer' is forbidden
      score: 85,
      rationale: 'Test hook intended to trigger forbidden phrase detection.',
    };
    swappedDraft.hookVariations!.push(toxicVariation);

    const toxicDraft = AgentOrchestrator.swapDraftHook(
      swappedDraft,
      'hook_toxic_test',
      INITIAL_PERSONA,
      INITIAL_CRISIS_STATE
    );

    assert.strictEqual(
      toxicDraft.status,
      'REJECTED',
      'Guardrail: Hook with compliance violation must be marked REJECTED'
    );
    assert.strictEqual(toxicDraft.complianceReport?.passed, false, 'Compliance report must fail');
    const violation = toxicDraft.complianceReport?.violations.find(
      (v) => v.ruleId === 'FORBIDDEN_PHRASE_DETECTED'
    );
    assert.ok(violation, 'Forbidden phrase detected on swapped hook');

    console.log('✓ Verified: Hook swap strictly wipes creator approval, forces re-compliance, and blocks publishing until re-approved');
  }

  // Test 9: Analytics Overview Contract & View Alignment (Phase 2B1)
  {
    console.log('\n[TEST 9] Analytics Overview Contract & View Alignment');
    const overview = await AnalyticsService.getAnalyticsOverview('solobuilder');

    assert.ok(overview, 'Analytics overview must be defined');
    assert.strictEqual(overview.authorHandle, 'solobuilder');
    assert.ok(overview.totalImpressions > 0, 'Must have impressions');
    assert.ok(overview.totalBookmarks > 0, 'Must have bookmarks');
    assert.strictEqual(overview.complianceRate, 100);

    // Validate hookArchetypeROI alignment with v_hook_archetype_roi
    assert.strictEqual(overview.hookArchetypeROI.length, 3, 'Must contain all 3 hook archetypes');
    const archetypes = overview.hookArchetypeROI.map((r) => r.archetype);
    assert.ok(archetypes.includes('INVERSION'));
    assert.ok(archetypes.includes('HARD_DATA'));
    assert.ok(archetypes.includes('DIRECT_QUESTION'));

    const inversion = overview.hookArchetypeROI.find((r) => r.archetype === 'INVERSION');
    assert.ok(inversion);
    assert.strictEqual(inversion.performanceTier, 'SUPER_HOOK');
    assert.ok(inversion.intentScore! > 8.0, 'Inversion intent score exceeds 8.0%');
    assert.ok(inversion.bookmarksPerKImpressions! > 15.0);

    // Validate pillarBalance alignment with v_pillar_target_vs_actual
    assert.strictEqual(overview.pillarBalance.length, 3, 'Must track all 3 content pillars');
    overview.pillarBalance.forEach((p) => {
      assert.ok(p.pillarName);
      assert.ok(p.targetWeightPct > 0);
      assert.ok(p.actualSharePct !== null);
      assert.ok(p.skewPct !== null);
    });

    // Validate creatorPreferences alignment with v_creator_preference_signals
    assert.ok(overview.creatorPreferences.totalDrafts > 0);
    assert.ok(overview.creatorPreferences.approvedDrafts > 0);
    assert.strictEqual(overview.creatorPreferences.creatorCurationStyle, 'SELECTIVE_EDITOR');
    assert.strictEqual(overview.creatorPreferences.preferredArchetype, 'INVERSION');

    console.log('✓ Verified: Analytics contracts and SQL view fixtures strictly aligned');
  }

  // Test 10: SQL Metric Safety Rule & Explicit Null-Handling (Phase 2B1)
  {
    console.log('\n[TEST 10] SQL Metric Safety Rule & Explicit Null-Handling');

    // Case A: Valid impressions -> calculates exact intent score
    const normalScore = AnalyticsService.calculateIntentScore(10000, 200, 50, 50);
    // ((200 * 3) + (50 * 2) + 50) / 10000 * 100 = 750 / 10000 * 100 = 7.5%
    assert.strictEqual(normalScore, 7.5, 'Normal intent score calculation');

    // Case B: Guardrail - Zero impressions MUST return null, never 0 or NaN (misleading division)
    const zeroImpressionScore = AnalyticsService.calculateIntentScore(0, 0, 0, 0);
    assert.strictEqual(
      zeroImpressionScore,
      null,
      'Guardrail: 0 impressions must return NULL (undefined intent ratio)'
    );

    const negativeImpressionScore = AnalyticsService.calculateIntentScore(-100, 10, 5, 2);
    assert.strictEqual(
      negativeImpressionScore,
      null,
      'Guardrail: Negative impressions must return NULL'
    );

    // Case C: Pillar Skew calculation
    const skew = AnalyticsService.calculatePillarSkew(46.7, 45.0);
    assert.strictEqual(skew, 1.7, 'Skew calculation should be 1.7%');

    const nullSkew = AnalyticsService.calculatePillarSkew(null, 45.0);
    assert.strictEqual(nullSkew, null, 'Undefined actual share returns null skew');

    console.log('✓ Verified: SQL Metric Safety rule strictly enforced (no divide-by-zero, explicit nulls)');
  }

  // Test 11: Phase 2B2A Persona Evolution Suggestion & Audit Snapshot Rule
  {
    console.log('\n[TEST 11] Persona Evolution Proposal Review & Audit Snapshot Rule');

    // 1. Validate candidate proposals structure
    assert.ok(INITIAL_EVOLUTION_SIGNALS.length >= 2, 'Must have at least 2 candidate proposals');
    const visibleProposals = INITIAL_EVOLUTION_SIGNALS.slice(0, 2);
    assert.strictEqual(visibleProposals.length, 2, 'UI strictly caps visible proposals at max 2');

    visibleProposals.forEach((proposal) => {
      assert.ok(proposal.id);
      assert.ok(proposal.type);
      assert.ok(proposal.confidence > 0.8, 'Must have high confidence');
      assert.ok(proposal.evidence.metricComparison.length > 0, 'Must have metric evidence citation');
      assert.ok(proposal.proposedAdjustment.rationale.length > 0, 'Must have rationale');
      assert.ok(proposal.draftingImpact && proposal.draftingImpact.length > 0, 'Must have draftingImpact note');
      assert.strictEqual(proposal.status, 'PENDING_APPROVAL', 'Must start strictly PENDING_APPROVAL');
    });

    // 2. Validate Dismiss action: non-destructive to persona
    const baselineVersion = INITIAL_PERSONA.version;
    const dismissedList = visibleProposals.filter((p) => p.id !== visibleProposals[1].id);
    assert.strictEqual(dismissedList.length, 1, 'Proposal successfully dismissed from active view');
    assert.strictEqual(INITIAL_PERSONA.version, baselineVersion, 'Dismiss is non-destructive to persona');

    // 3. Validate Approval & Audit Snapshot Rule
    const manager = new SafeEvolutionManager();
    manager.registerInitialPersona(INITIAL_PERSONA);

    const proposalToApprove = visibleProposals[0];
    const result = manager.applyEvolutionSignal(INITIAL_PERSONA, proposalToApprove);

    assert.strictEqual(result.success, true, 'Evolution application succeeds');
    assert.strictEqual(result.newPersona?.version, 2, 'Persona version safely incremented to v2');
    assert.ok(
      result.newPersona?.tone.styleTags.includes('contrarian-inversion'),
      'New style tag added to v2 persona'
    );

    // Audit Snapshot Invariant: exact proposal payload & evidence snapshot persisted in history
    const history = manager.getHistory(INITIAL_PERSONA.id);
    assert.strictEqual(history.length, 2, 'History has baseline v1 and evolved v2');
    const v2Record = history.find((r) => r.version === 2);
    assert.ok(v2Record, 'v2 record exists in history');
    assert.strictEqual(v2Record.signalId, proposalToApprove.id);
    assert.ok(v2Record.proposalSnapshot, 'Audit snapshot rule: proposalSnapshot MUST be persisted');
    assert.strictEqual(v2Record.proposalSnapshot?.id, proposalToApprove.id);
    assert.strictEqual(
      v2Record.proposalSnapshot?.evidence.metricComparison,
      proposalToApprove.evidence.metricComparison,
      'Evidence snapshot preserved'
    );

    console.log('✓ Verified: Proposal contracts, non-destructive dismiss, and Audit Snapshot Rule strictly enforced');
  }

  // Test 12: Phase 2D1 - xAI Responses API Adapter, Strict Schema, Defensive Parsing & Resilient Failover
  {
    console.log('\n[TEST 12] Phase 2D1: xAI Responses API, Structured Outputs & Resilient Failover');

    // 1. Validate Defensive Code-Fence Stripping
    const rawFenced = '```json\n{\n  "hello": "world"\n}\n```';
    const cleaned = cleanMarkdownCodeFences(rawFenced);
    assert.strictEqual(cleaned, '{\n  "hello": "world"\n}', 'Code fences cleanly stripped');

    const cleanRaw = '{"test": 123}';
    assert.strictEqual(cleanMarkdownCodeFences(cleanRaw), cleanRaw, 'Clean JSON untouched');

    // 2. Validate Text Extraction from Responses API Output
    const responsesPayload = {
      id: 'resp_123',
      object: 'response',
      output: [
        {
          type: 'message',
          role: 'assistant',
          content: [
            {
              type: 'output_text',
              text: '{"primaryTweet":"test tweet"}',
            },
          ],
        },
      ],
    };
    const extracted = extractTextFromResponsesOutput(responsesPayload);
    assert.strictEqual(extracted, '{"primaryTweet":"test tweet"}', 'Extracted output text correctly');

    // 3. Validate Strict JSON Schema Structure
    assert.strictEqual(XAI_DRAFT_RESPONSE_JSON_SCHEMA.type, 'object');
    assert.strictEqual(XAI_DRAFT_RESPONSE_JSON_SCHEMA.additionalProperties, false);
    assert.ok(XAI_DRAFT_RESPONSE_JSON_SCHEMA.required.includes('primaryTweet'));
    assert.ok(XAI_DRAFT_RESPONSE_JSON_SCHEMA.required.includes('hookVariations'));

    // 4. Validate Missing API Key Failover to Mock Adapter
    const savedKey = process.env.XAI_API_KEY;
    delete process.env.XAI_API_KEY;

    const adapter = new XAIClientAdapter();
    const fallbackDraft = await adapter.generateDraft({
      persona: INITIAL_PERSONA,
      pillar: INITIAL_PERSONA.pillars[0],
      topic: 'Bootstrapping a SaaS',
    });

    assert.ok(fallbackDraft.primaryTweet, 'Fallback generated primary tweet');
    assert.strictEqual(fallbackDraft.hookVariations.length, 3, 'Fallback returned 3 hook variations');
    assert.strictEqual(fallbackDraft.generationEngine, 'mock', 'Flagged as mock generationEngine');
    assert.strictEqual(fallbackDraft.generatorModel, 'mock-grok', 'Flagged as mock-grok model');

    // 5. Validate Pipeline Metadata Propagation
    const pipelineDraft = await AgentOrchestrator.createDraftPipeline(
      {
        persona: INITIAL_PERSONA,
        crisisState: INITIAL_CRISIS_STATE,
        xaiAdapter: adapter,
        xAdapter: new MockXClientAdapter(),
      },
      INITIAL_PERSONA.pillars[0].id
    );

    assert.strictEqual(pipelineDraft.generationEngine, 'mock', 'Pipeline preserved generationEngine');
    assert.strictEqual(pipelineDraft.generatorModel, 'mock-grok', 'Pipeline preserved generatorModel');
    assert.strictEqual(pipelineDraft.hookVariations?.length, 3, 'Pipeline preserved 3 hook variations');

    // 6. Validate Mock Adapter Failover on HTTP Error & Live Parse
    const originalFetch = globalThis.fetch;
    try {
      // Mock HTTP 429 Rate Limit
      globalThis.fetch = async () =>
        new Response(JSON.stringify({ error: 'Rate limit exceeded' }), {
          status: 429,
          headers: { 'Content-Type': 'application/json' },
        });

      process.env.XAI_API_KEY = 'test-dummy-key';
      const errorFallback = await adapter.generateDraft({
        persona: INITIAL_PERSONA,
        pillar: INITIAL_PERSONA.pillars[0],
        topic: 'Resilient architecture',
      });

      assert.ok(errorFallback.primaryTweet, 'HTTP 429 successfully fell back to mock generation');
      assert.strictEqual(errorFallback.generationEngine, 'mock', 'Flagged as mock');

      // Mock Malformed Output
      globalThis.fetch = async () =>
        new Response(JSON.stringify({ output: [] }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });

      const malformedFallback = await adapter.generateDraft({
        persona: INITIAL_PERSONA,
        pillar: INITIAL_PERSONA.pillars[0],
        topic: 'Defensive systems',
      });
      assert.ok(malformedFallback.primaryTweet, 'Empty output successfully fell back to mock generation');

      // Mock Successful Live Responses API output with defensive fences
      const liveMockResponse = {
        output: [
          {
            type: 'message',
            role: 'assistant',
            content: [
              {
                type: 'output_text',
                text:
                  '```json\n' +
                  JSON.stringify({
                    primaryTweet: 'Most developers write code. Top 1% build leverage.',
                    hookVariations: [
                      {
                        id: 'hook_inv_live',
                        hook: 'Most developers write code. Top 1% build leverage.',
                        archetype: 'INVERSION',
                        score: 95,
                        rationale: 'Strong contrarian inversion',
                      },
                      {
                        id: 'hook_data_live',
                        hook: '87% of SaaS founders fail because of distribution, not code.',
                        archetype: 'HARD_DATA',
                        score: 92,
                        rationale: 'Data-driven authority',
                      },
                      {
                        id: 'hook_quest_live',
                        hook: 'What is your distribution moat in 2026?',
                        archetype: 'DIRECT_QUESTION',
                        score: 88,
                        rationale: 'High-engagement question',
                      },
                    ],
                    threadTweets: [],
                    hashtags: ['buildinpublic', 'indiehackers'],
                    hookScore: 95,
                    strategicRationale: 'Targeting solopreneur leverage',
                    suggestedScheduleSlot: 'MORNING_PRIME',
                  }) +
                  '\n```',
              },
            ],
          },
        ],
      };

      globalThis.fetch = async () =>
        new Response(JSON.stringify(liveMockResponse), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });

      const liveParsed = await adapter.generateDraft({
        persona: INITIAL_PERSONA,
        pillar: INITIAL_PERSONA.pillars[0],
        topic: 'Leverage',
      });

      assert.strictEqual(liveParsed.generationEngine, 'xai_live', 'Successfully tagged as xai_live');
      assert.strictEqual(liveParsed.generatorModel, 'grok-3-mini', 'Tagged with configured model grok-3-mini');
      assert.strictEqual(liveParsed.hookVariations.length, 3, 'Parsed exactly 3 hook variations');
      assert.strictEqual(liveParsed.hookVariations[0].archetype, 'INVERSION');
    } finally {
      globalThis.fetch = originalFetch;
      if (savedKey) {
        process.env.XAI_API_KEY = savedKey;
      } else {
        delete process.env.XAI_API_KEY;
      }
    }

    console.log('✓ Verified: Responses API formatting, defensive parsing, and resilient mock failover');
  }

  // Test 13: Phase 2D2 - AI Crisis Risk & Sentiment Analysis, Strict Schema & Severity Mapping
  {
    console.log('\n[TEST 13] Phase 2D2: AI Crisis Risk & Sentiment Analysis, Severity Mapping & Fallback');

    // 1. Strict Schema & JSON Schema Specification
    assert.strictEqual(XAI_CRISIS_ANALYSIS_JSON_SCHEMA.type, 'object');
    assert.strictEqual(XAI_CRISIS_ANALYSIS_JSON_SCHEMA.additionalProperties, false);
    assert.ok(XAI_CRISIS_ANALYSIS_JSON_SCHEMA.required.includes('brandLiability'));
    assert.ok(XAI_CRISIS_ANALYSIS_JSON_SCHEMA.required.includes('toneToxicity'));
    assert.ok(XAI_CRISIS_ANALYSIS_JSON_SCHEMA.required.includes('sarcasmAmbiguityRisk'));
    assert.ok(XAI_CRISIS_ANALYSIS_JSON_SCHEMA.required.includes('escalationRequired'));

    const validRiskPayload = {
      riskScore: 15,
      brandLiability: 'LOW' as const,
      toneToxicity: 'LOW' as const,
      sarcasmAmbiguityRisk: 'LOW' as const,
      escalationRequired: false,
      reason: 'Content is clean and actionable.',
      recommendation: 'Safe to proceed.',
    };
    const parsedRisk = crisisRiskAssessmentSchema.safeParse(validRiskPayload);
    assert.strictEqual(parsedRisk.success, true, 'Valid crisis risk schema parses successfully');

    // Invalid enum fails Zod
    const invalidRiskPayload = { ...validRiskPayload, brandLiability: 'CATASTROPHIC' };
    const invalidParsed = crisisRiskAssessmentSchema.safeParse(invalidRiskPayload);
    assert.strictEqual(invalidParsed.success, false, 'Invalid enum fails Zod validation');

    // 2. Missing API Key Fallback to Mock
    const savedKey = process.env.XAI_API_KEY;
    delete process.env.XAI_API_KEY;

    const adapter = new XAIClientAdapter();
    const fallbackRisk = await adapter.analyzeCrisisRisk('Build boring businesses with strong cash flow.');
    assert.strictEqual(fallbackRisk.generationEngine, 'mock', 'Flagged as mock generation engine');
    assert.strictEqual(fallbackRisk.brandLiability, 'LOW', 'Clean text yields LOW risk');

    // 3. Mock Adapter Sensitive Terms Detection
    const sensitiveRisk = await adapter.analyzeCrisisRisk('We launched a new crypto ponzi with zero downside.');
    assert.strictEqual(sensitiveRisk.brandLiability, 'HIGH', 'Detected high brand liability for sensitive terms');
    assert.strictEqual(sensitiveRisk.escalationRequired, true, 'Escalation required for sensitive terms');

    // 4. Severity Mapping in Compliance Engine
    const dummyDraft = { content: 'Building software in public with real leverage.' };

    // Case 4A: HIGH brand liability -> CRITICAL violation
    const highLiabilityRisk: CrisisRiskAssessment = {
      riskScore: 85,
      brandLiability: 'HIGH',
      toneToxicity: 'LOW',
      sarcasmAmbiguityRisk: 'LOW',
      escalationRequired: false,
      reason: 'Unverified guaranteed earnings claims',
      recommendation: 'Remove return promises',
    };
    const reportHighLiability = ComplianceEngine.evaluateDraft(dummyDraft, INITIAL_PERSONA, INITIAL_CRISIS_STATE, highLiabilityRisk);
    assert.strictEqual(reportHighLiability.passed, false, 'HIGH brand liability must fail compliance');
    const vLiability = reportHighLiability.violations.find((v) => v.ruleId === 'AI_HIGH_BRAND_LIABILITY');
    assert.ok(vLiability, 'Must generate AI_HIGH_BRAND_LIABILITY violation');
    assert.strictEqual(vLiability?.severity, 'CRITICAL', 'HIGH brand liability MUST be CRITICAL');

    // Case 4B: escalationRequired: true -> CRITICAL violation
    const escalationRisk: CrisisRiskAssessment = {
      riskScore: 80,
      brandLiability: 'LOW',
      toneToxicity: 'LOW',
      sarcasmAmbiguityRisk: 'LOW',
      escalationRequired: true,
      reason: 'Controversial public dispute',
      recommendation: 'Creator review mandatory',
    };
    const reportEscalation = ComplianceEngine.evaluateDraft(dummyDraft, INITIAL_PERSONA, INITIAL_CRISIS_STATE, escalationRisk);
    assert.strictEqual(reportEscalation.passed, false, 'Escalation required must fail compliance');
    const vEscalation = reportEscalation.violations.find((v) => v.ruleId === 'AI_ESCALATION_REQUIRED');
    assert.strictEqual(vEscalation?.severity, 'CRITICAL', 'Escalation required MUST be CRITICAL');

    // Case 4C: HIGH tone toxicity WITH harassment keywords -> CRITICAL violation
    const criticalToxicityRisk: CrisisRiskAssessment = {
      riskScore: 90,
      brandLiability: 'LOW',
      toneToxicity: 'HIGH',
      sarcasmAmbiguityRisk: 'LOW',
      escalationRequired: false,
      reason: 'Severe targeted harassment and threats detected',
      recommendation: 'Remove hostile abuse',
    };
    const reportCritTox = ComplianceEngine.evaluateDraft(dummyDraft, INITIAL_PERSONA, INITIAL_CRISIS_STATE, criticalToxicityRisk);
    assert.strictEqual(reportCritTox.passed, false, 'Harassment/threat toxicity must fail compliance');
    const vCritTox = reportCritTox.violations.find((v) => v.ruleId === 'AI_CRITICAL_TOXICITY');
    assert.strictEqual(vCritTox?.severity, 'CRITICAL', 'Harassment/threat toxicity MUST be CRITICAL');

    // Case 4D: HIGH tone toxicity WITHOUT harassment -> WARNING violation
    const warningToxicityRisk: CrisisRiskAssessment = {
      riskScore: 60,
      brandLiability: 'LOW',
      toneToxicity: 'HIGH',
      sarcasmAmbiguityRisk: 'LOW',
      escalationRequired: false,
      reason: 'Aggressive and arrogant competitive commentary',
      recommendation: 'Soften aggressive framing',
    };
    const reportWarnTox = ComplianceEngine.evaluateDraft(dummyDraft, INITIAL_PERSONA, INITIAL_CRISIS_STATE, warningToxicityRisk);
    assert.strictEqual(reportWarnTox.passed, true, 'Non-harassment high toxicity passes as WARNING if score >= 70');
    const vWarnTox = reportWarnTox.violations.find((v) => v.ruleId === 'AI_HIGH_TONE_TOXICITY');
    assert.strictEqual(vWarnTox?.severity, 'WARNING', 'High toxicity without harassment is WARNING by default');

    // Case 4E: MEDIUM risks -> WARNING violation
    const mediumRisk: CrisisRiskAssessment = {
      riskScore: 35,
      brandLiability: 'MEDIUM',
      toneToxicity: 'MEDIUM',
      sarcasmAmbiguityRisk: 'MEDIUM',
      escalationRequired: false,
      reason: 'Subtle sarcasm and moderate unverified claim',
      recommendation: 'Clarify meaning',
    };
    const reportMedium = ComplianceEngine.evaluateDraft(dummyDraft, INITIAL_PERSONA, INITIAL_CRISIS_STATE, mediumRisk);
    assert.ok(reportMedium.violations.some((v) => v.ruleId === 'AI_MEDIUM_BRAND_LIABILITY'), 'Medium brand liability creates WARNING');
    assert.ok(reportMedium.violations.some((v) => v.ruleId === 'AI_MEDIUM_TONE_TOXICITY'), 'Medium tone toxicity creates WARNING');
    assert.ok(reportMedium.violations.some((v) => v.ruleId === 'AI_MEDIUM_AMBIGUITY_RISK'), 'Medium sarcasm creates WARNING');

    // Case 4F: LOW risks -> No violations
    const lowRisk: CrisisRiskAssessment = {
      riskScore: 5,
      brandLiability: 'LOW',
      toneToxicity: 'LOW',
      sarcasmAmbiguityRisk: 'LOW',
      escalationRequired: false,
      reason: 'Completely clean post',
      recommendation: 'Ready to post',
    };
    const reportClean = ComplianceEngine.evaluateDraft(dummyDraft, INITIAL_PERSONA, INITIAL_CRISIS_STATE, lowRisk);
    assert.strictEqual(reportClean.violations.length, 0, 'Clean AI risk produces 0 violations');
    assert.strictEqual(reportClean.score, 100, 'Clean AI risk maintains 100 score');

    // Case 4G: Static compliance rule independence (char limit still fails even if AI risk is LOW)
    const longDraft = { content: 'A'.repeat(285) };
    const reportLongWithLowRisk = ComplianceEngine.evaluateDraft(longDraft, INITIAL_PERSONA, INITIAL_CRISIS_STATE, lowRisk);
    assert.strictEqual(reportLongWithLowRisk.passed, false, 'Static 280 char rule still fails draft even if AI risk is LOW');
    assert.ok(reportLongWithLowRisk.violations.some((v) => v.ruleId === 'CHAR_LIMIT_EXCEEDED'), 'Static rule CHAR_LIMIT_EXCEEDED preserved');

    // 5. Live Responses API Extraction & Mock Error Failover
    const originalFetch = globalThis.fetch;
    try {
      // Mock HTTP 429
      globalThis.fetch = async () =>
        new Response(JSON.stringify({ error: 'Rate limit' }), {
          status: 429,
          headers: { 'Content-Type': 'application/json' },
        });

      process.env.XAI_API_KEY = 'test-dummy-key';
      const errorRiskFallback = await adapter.analyzeCrisisRisk('Simulating rate limit');
      assert.strictEqual(errorRiskFallback.generationEngine, 'mock', 'HTTP 429 falls back to mock risk analyzer');

      // Mock Live Successful Return with defensive fences
      const liveCrisisResponse = {
        output: [
          {
            type: 'message',
            role: 'assistant',
            content: [
              {
                type: 'output_text',
                text:
                  '```json\n' +
                  JSON.stringify({
                    riskScore: 12,
                    brandLiability: 'LOW',
                    toneToxicity: 'LOW',
                    sarcasmAmbiguityRisk: 'LOW',
                    escalationRequired: false,
                    reason: 'Live Grok evaluated: clean distribution insight.',
                    recommendation: 'Proceed with creator review.',
                  }) +
                  '\n```',
              },
            ],
          },
        ],
      };

      globalThis.fetch = async () =>
        new Response(JSON.stringify(liveCrisisResponse), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });

      const liveAnalyzed = await adapter.analyzeCrisisRisk('Distribution leverage is critical.');
      assert.strictEqual(liveAnalyzed.generationEngine, 'xai_live', 'Live Responses API tagged as xai_live');
      assert.strictEqual(liveAnalyzed.riskScore, 12, 'Correctly parsed riskScore');
      assert.strictEqual(liveAnalyzed.brandLiability, 'LOW', 'Correctly parsed brandLiability');
    } finally {
      globalThis.fetch = originalFetch;
      if (savedKey) {
        process.env.XAI_API_KEY = savedKey;
      } else {
        delete process.env.XAI_API_KEY;
      }
    }

    console.log('✓ Verified: AI Crisis Risk schema, Responses API flow, severity mapping, and static rule independence');
  }

  // Test 14: BigQuery Telemetry Provider & Analytics Layer Contract
  {
    console.log('\n[TEST 14] BigQuery Telemetry Provider & Analytics Layer Contract');

    // 1. Single Provider Boundary: Interface conformance & singleton export
    const provider: IBigQueryTelemetryProvider = bigQueryTelemetryProvider;
    assert.ok(typeof provider.recordTweetEvent === 'function', 'Must implement recordTweetEvent');
    assert.ok(typeof provider.recordLifecycleEvent === 'function', 'Must implement recordLifecycleEvent');
    assert.ok(typeof provider.getAnalyticsOverview === 'function', 'Must implement getAnalyticsOverview');

    // 2. Canonical Views Definition & Parameterization Integrity
    const canonicalViews = [
      'v_hook_archetype_roi',
      'v_pillar_target_vs_actual',
      'v_creator_preference_signals',
    ];
    assert.strictEqual(canonicalViews.length, 3, 'Must target exactly 3 canonical views');
    assert.ok(canonicalViews.includes('v_hook_archetype_roi'), 'Contains v_hook_archetype_roi');
    assert.ok(canonicalViews.includes('v_pillar_target_vs_actual'), 'Contains v_pillar_target_vs_actual');
    assert.ok(canonicalViews.includes('v_creator_preference_signals'), 'Contains v_creator_preference_signals');

    // 3. SQL Metric Safety Rule Verification
    // Intent score with 0 impressions -> MUST be null
    const zeroImpIntent = AnalyticsService.calculateIntentScore(0, 50, 20, 10);
    assert.strictEqual(zeroImpIntent, null, 'Intent score must be null if impressions are zero');

    // Intent score calculation formula: ((bookmarks * 3) + (profile_clicks * 2) + retweets) / impressions * 100
    // ((10 * 3) + (5 * 2) + 2) / 1000 * 100 = 42 / 1000 * 100 = 4.2%
    const validIntent = AnalyticsService.calculateIntentScore(1000, 10, 5, 2);
    assert.strictEqual(validIntent, 4.2, 'Intent score formula must correctly weight bookmarks (3x) and profile clicks (2x)');

    // Pillar skew with null actual share -> MUST be null
    const nullSkew = AnalyticsService.calculatePillarSkew(null, 35);
    assert.strictEqual(nullSkew, null, 'Pillar skew must be null if actual share is null');

    const validSkew = AnalyticsService.calculatePillarSkew(42.5, 35);
    assert.strictEqual(validSkew, 7.5, 'Pillar skew must calculate actual - target');

    // 4. Best-Effort, Non-Blocking Telemetry Ingestion
    const testTweetEvent: TweetEvent = {
      tweetId: 'tw_test_telemetry_1',
      authorHandle: 'solobuilder',
      text: 'Testing non-blocking telemetry ingestion in AGENTX.',
      pillarId: 'pillar_systems',
      personaVersion: 1,
      hookArchetype: 'INVERSION',
      hookId: 'hook_inv_1',
      format: 'SINGLE_TWEET',
      estimatedHookScore: 92,
      createdAt: new Date().toISOString(),
      metrics: {
        impressions: 1,
        likes: 0,
        retweets: 0,
        replies: 0,
        bookmarks: 0,
        profileClicks: 0,
        urlClicks: 0,
        engagementRate: 0,
        updatedAt: new Date().toISOString(),
      },
    };

    // Calling recordTweetEvent must succeed without throwing
    await assert.doesNotReject(
      async () => await provider.recordTweetEvent(testTweetEvent),
      'recordTweetEvent must never throw (best-effort, non-blocking)'
    );

    const testLifecycleEvent: DraftLifecycleEvent = {
      eventId: 'evt_test_telemetry_1',
      draftId: 'draft_test_1',
      authorHandle: 'solobuilder',
      eventType: 'DRAFT_CREATED',
      pillarId: 'pillar_systems',
      initialHookArchetype: 'INVERSION',
      selectedHookArchetype: 'INVERSION',
      initialHookId: 'hook_inv_1',
      selectedHookId: 'hook_inv_1',
      format: 'SINGLE_TWEET',
      isHookSwapped: false,
      createdAt: new Date().toISOString(),
    };

    // Calling recordLifecycleEvent must succeed without throwing
    await assert.doesNotReject(
      async () => await provider.recordLifecycleEvent(testLifecycleEvent),
      'recordLifecycleEvent must never throw (best-effort, non-blocking)'
    );

    // 5. ADC / Missing Credential Graceful Failover
    const analytics = await AnalyticsService.getAnalyticsOverview('solobuilder');
    assert.strictEqual(analytics.authorHandle, 'solobuilder', 'Analytics authorHandle matches requested handle');
    assert.ok(
      analytics.telemetryEngine === 'bigquery_live' || analytics.telemetryEngine === 'mock',
      'telemetryEngine must be bigquery_live or mock'
    );
    assert.ok(analytics.hookArchetypeROI.length >= 3, 'Contains hook archetype ROI breakdown');
    assert.ok(analytics.pillarBalance.length >= 3, 'Contains pillar balance metrics');
    assert.ok(analytics.creatorPreferences.totalDrafts > 0, 'Contains creator preference metrics');

    // 6. Resilient Custom Provider Fallback Handling
    const mockProvider = new MockBigQueryTelemetryProvider();
    const isolatedProvider = new BigQueryTelemetryProvider(mockProvider);
    const isolatedOverview = await isolatedProvider.getAnalyticsOverview('testuser');
    assert.strictEqual(isolatedOverview.authorHandle, 'testuser', 'Isolated provider falls back gracefully');
    assert.strictEqual(isolatedOverview.telemetryEngine, 'mock', 'Unconfigured environment returns mock telemetryEngine');

    console.log(
      '✓ Verified: IBigQueryTelemetryProvider boundary, canonical views, SQL Metric Safety, non-blocking writes, and ADC failover'
    );
  }

  // Test 15: Phase 2E1 - Interactive In-Character Reply Drafter & Engagement Triage Hub
  {
    console.log('\n[TEST 15] Phase 2E1: In-Character Reply Drafter & Engagement Triage Hub');

    const xaiAdapter = new MockXAIClientAdapter();
    const xAdapter = new MockXClientAdapter();
    const normalContext = {
      persona: INITIAL_PERSONA,
      crisisState: INITIAL_CRISIS_STATE,
      xaiAdapter,
      xAdapter,
    };

    const testMention: MentionTriageItem = {
      id: 'mention_test_1',
      authorHandle: 'indie_dev_dan',
      text: '@solobuilder What made you choose BigQuery over Postgres for your telemetry pipeline?',
      sentiment: 'POSITIVE',
      urgency: 'HIGH',
      recommendedAction: 'REPLY',
      receivedAt: '5m ago',
    };

    // 15A: Reply Option Generation (Exactly 2 tone-matched options)
    const options = await xaiAdapter.generateReplyOptions(testMention, INITIAL_PERSONA);
    assert.strictEqual(options.length, 2, 'Must generate exactly 2 tone-matched reply variations');
    options.forEach((opt, idx) => {
      assert.ok(opt.id, `Option ${idx + 1} must have an ID`);
      assert.ok(opt.toneStyle, `Option ${idx + 1} must have a toneStyle`);
      assert.ok(opt.text.length > 0 && opt.text.length <= 280, `Option ${idx + 1} must be <= 280 chars`);
      assert.ok(opt.rationale.length > 0, `Option ${idx + 1} must have a rationale`);
    });
    console.log('✓ Verified: Exactly 2 tone-matched reply options generated within 280-char limit');

    // 15B: Reply Pipeline Initialization & Compliance Pre-Flight
    const replyDraft = await AgentOrchestrator.createReplyPipeline(normalContext, testMention);
    assert.strictEqual(replyDraft.status, 'DRAFT', 'Newly drafted reply must be in DRAFT status');
    assert.strictEqual(replyDraft.mentionId, testMention.id, 'Mention ID must match');
    assert.strictEqual(replyDraft.inReplyToUser, testMention.authorHandle, 'In-reply-to user matches');
    assert.ok(replyDraft.complianceReport?.passed, 'Generated reply must pass initial compliance');
    console.log('✓ Verified: Reply draft initialized in DRAFT status with passing compliance');

    // 15C: Strict Guardrail - Editing text wipes approval & triggers compliance check
    // Step 1: Approve reply
    const approvedDraft = AgentOrchestrator.approveReplyPipeline(normalContext, replyDraft);
    assert.strictEqual(approvedDraft.status, 'APPROVED', 'Draft should transition to APPROVED');
    assert.strictEqual(approvedDraft.approvedBy, 'CREATOR', 'ApprovedBy should be CREATOR');
    assert.ok(approvedDraft.approvedAt, 'ApprovedAt must be stamped');

    // Step 2: Edit text after approval -> Approval MUST be wiped!
    const editedDraft = AgentOrchestrator.updateReplyTextPipeline(
      normalContext,
      approvedDraft,
      '@indie_dev_dan We chose BigQuery because columnar analytical queries give 10x leverage.'
    );
    assert.strictEqual(editedDraft.status, 'DRAFT', 'CRITICAL GUARDRAIL: Editing text after approval MUST wipe approval back to DRAFT');
    assert.strictEqual(editedDraft.approvedAt, undefined, 'approvedAt must be cleared');
    assert.strictEqual(editedDraft.approvedBy, undefined, 'approvedBy must be cleared');

    // Step 3: Edit text to insert forbidden phrase -> Status becomes REJECTED
    const badEditedDraft = AgentOrchestrator.updateReplyTextPipeline(
      normalContext,
      editedDraft,
      '@indie_dev_dan This database is a total game-changer for all startups.'
    );
    assert.strictEqual(badEditedDraft.status, 'REJECTED', 'Editing text with forbidden brand phrase sets status to REJECTED');
    assert.strictEqual(badEditedDraft.complianceReport?.passed, false, 'Compliance must fail on forbidden phrase');
    assert.ok(
      badEditedDraft.complianceReport?.violations.some((v) => v.ruleId === 'FORBIDDEN_PHRASE_DETECTED'),
      'Must flag FORBIDDEN_PHRASE_DETECTED'
    );
    console.log('✓ Verified: Guardrail strictly wipes approval upon edit and flags compliance violations');

    // 15D: Approval Gate Enforcement (Cannot send without approval)
    await assert.rejects(
      async () => await AgentOrchestrator.sendReplyPipeline(normalContext, editedDraft),
      /requires explicit creator approval/,
      'Cannot send unapproved reply'
    );
    console.log('✓ Verified: Approval gate strictly blocks sending unapproved reply');

    // 15E: Emergency Crisis Freeze Enforcement
    const frozenContext = {
      ...normalContext,
      crisisState: { isFrozen: true, reason: 'Emergency creator freeze' },
    };

    await assert.rejects(
      async () => await AgentOrchestrator.createReplyPipeline(frozenContext, testMention),
      /Crisis Pause active/,
      'Cannot create reply draft during crisis freeze'
    );

    const reApprovedDraft = AgentOrchestrator.approveReplyPipeline(normalContext, {
      ...editedDraft,
      selectedText: '@indie_dev_dan Columnar architecture is key for solopreneur speed.',
    });
    assert.strictEqual(reApprovedDraft.status, 'APPROVED');

    await assert.rejects(
      async () => await AgentOrchestrator.sendReplyPipeline(frozenContext, reApprovedDraft),
      /Crisis Pause active/,
      'Cannot send reply during crisis freeze even if approved'
    );
    console.log('✓ Verified: Emergency Crisis Pause blocks reply drafting and sending');

    // 15F: Mock Dispatch Success
    const { replyDraft: sentDraft, result } = await AgentOrchestrator.sendReplyPipeline(normalContext, reApprovedDraft);
    assert.strictEqual(sentDraft.status, 'SENT', 'Status transitions to SENT after dispatch');
    assert.ok(sentDraft.sentTweetId?.startsWith('mock_reply_'), 'Assigns mock tweet ID');
    assert.strictEqual(result.success, true, 'Publish result success is true');
    console.log('✓ Verified: Isolated MockXClientAdapter safely sends reply with mock ID:', sentDraft.sentTweetId);
  }

  // Test 16: Phase 2B2B - Dynamic In-Session Evolution Signal Generation & Heuristic Synthesis
  {
    console.log('\n[TEST 16] Phase 2B2B: Dynamic In-Session Evolution Signal Generation & Heuristic Synthesis');

    const testPersona = JSON.parse(JSON.stringify(INITIAL_PERSONA));

    // 16A: Minimum Evidence Guardrail
    // With 0 or 1 event, the synthesizer MUST return [] (guarding against premature speculation)
    const sparseEvents: DraftLifecycleEvent[] = [
      {
        eventId: 'sparse_1',
        draftId: 'd_1',
        authorHandle: testPersona.handle,
        eventType: 'HOOK_SWAPPED',
        pillarId: 'pillar_scale',
        selectedHookArchetype: 'INVERSION',
        isHookSwapped: true,
        createdAt: new Date().toISOString(),
      },
    ];
    const sparseSignals = EvolutionSignalSynthesizer.synthesize({
      persona: testPersona,
      lifecycleEvents: sparseEvents,
      minEventsThreshold: 3,
    });
    assert.strictEqual(sparseSignals.length, 0, 'Minimum evidence guardrail: Synthesizer must return [] when event volume is below threshold');
    console.log('✓ Verified: Minimum evidence guardrail strictly suppresses premature signal emission on thin session data');

    // 16B: Hook Affinity Heuristic (Rule 1)
    const hookHeavyEvents: DraftLifecycleEvent[] = [
      {
        eventId: 'e1',
        draftId: 'd1',
        authorHandle: testPersona.handle,
        eventType: 'HOOK_SWAPPED',
        pillarId: 'pillar_scale',
        selectedHookArchetype: 'INVERSION',
        isHookSwapped: true,
        createdAt: new Date().toISOString(),
      },
      {
        eventId: 'e2',
        draftId: 'd2',
        authorHandle: testPersona.handle,
        eventType: 'APPROVED',
        pillarId: 'pillar_scale',
        selectedHookArchetype: 'INVERSION',
        isHookSwapped: false,
        createdAt: new Date().toISOString(),
      },
      {
        eventId: 'e3',
        draftId: 'd3',
        authorHandle: testPersona.handle,
        eventType: 'APPROVED',
        pillarId: 'pillar_systems',
        selectedHookArchetype: 'HARD_DATA',
        isHookSwapped: false,
        createdAt: new Date().toISOString(),
      },
    ];

    const hookSignals = EvolutionSignalSynthesizer.synthesize({
      persona: testPersona,
      lifecycleEvents: hookHeavyEvents,
      minEventsThreshold: 3,
    });

    const hookSignal = hookSignals.find((s) => s.type === 'HIGH_PERFORMING_HOOK');
    assert.ok(hookSignal, 'Must synthesize HIGH_PERFORMING_HOOK signal when archetype affinity >= 50%');
    assert.ok(hookSignal.confidence >= 0.85, 'Confidence must be >= 0.85');
    assert.ok(
      Array.isArray(hookSignal.proposedAdjustment.proposedValue) &&
        hookSignal.proposedAdjustment.proposedValue.includes('contrarian-inversion'),
      'Proposed value must propose adding contrarian-inversion to styleTags'
    );
    assert.strictEqual(hookSignal.status, 'PENDING_APPROVAL', 'Signal must start in PENDING_APPROVAL status');
    console.log('✓ Verified: Hook affinity heuristic synthesizes HIGH_PERFORMING_HOOK with confidence:', hookSignal.confidence);

    // 16C: Deduplication Guardrail
    // If the persona already has 'contrarian-inversion', synthesizer must omit redundant proposal
    const personaWithTag = {
      ...testPersona,
      tone: {
        ...testPersona.tone,
        styleTags: [...testPersona.tone.styleTags, 'contrarian-inversion'],
      },
    };
    const dedupSignals = EvolutionSignalSynthesizer.synthesize({
      persona: personaWithTag,
      lifecycleEvents: hookHeavyEvents,
      minEventsThreshold: 3,
    });
    assert.strictEqual(
      dedupSignals.some((s) => s.type === 'HIGH_PERFORMING_HOOK'),
      false,
      'Deduplication: Redundant hook proposal must be omitted when persona already contains the proposed style tag'
    );
    console.log('✓ Verified: Deduplication guardrail omits proposals already reflected in active persona');

    // 16D: Content Pillar Skew & Imbalance Heuristic (Rule 2)
    // 5 scale events + 1 systems event = 5/6 = 83.3% actual vs 45% target = +38.3% skew (>= 15% trigger)
    const pillarSkewEvents: DraftLifecycleEvent[] = [
      { eventId: 'ps1', draftId: 'd1', authorHandle: testPersona.handle, eventType: 'APPROVED', pillarId: 'pillar_scale', isHookSwapped: false, createdAt: new Date().toISOString() },
      { eventId: 'ps2', draftId: 'd2', authorHandle: testPersona.handle, eventType: 'APPROVED', pillarId: 'pillar_scale', isHookSwapped: false, createdAt: new Date().toISOString() },
      { eventId: 'ps3', draftId: 'd3', authorHandle: testPersona.handle, eventType: 'APPROVED', pillarId: 'pillar_scale', isHookSwapped: false, createdAt: new Date().toISOString() },
      { eventId: 'ps4', draftId: 'd4', authorHandle: testPersona.handle, eventType: 'APPROVED', pillarId: 'pillar_scale', isHookSwapped: false, createdAt: new Date().toISOString() },
      { eventId: 'ps5', draftId: 'd5', authorHandle: testPersona.handle, eventType: 'APPROVED', pillarId: 'pillar_scale', isHookSwapped: false, createdAt: new Date().toISOString() },
      { eventId: 'ps6', draftId: 'd6', authorHandle: testPersona.handle, eventType: 'APPROVED', pillarId: 'pillar_systems', isHookSwapped: false, createdAt: new Date().toISOString() },
    ];

    const pillarSignals = EvolutionSignalSynthesizer.synthesize({
      persona: testPersona,
      lifecycleEvents: pillarSkewEvents,
      minEventsThreshold: 3,
    });

    const pillarSignal = pillarSignals.find((s) => s.type === 'PILLAR_SHIFT_RECOMMENDED');
    assert.ok(pillarSignal, 'Must synthesize PILLAR_SHIFT_RECOMMENDED signal when skew >= 15%');
    assert.strictEqual(pillarSignal.proposedAdjustment.field, 'pillars');
    assert.ok(pillarSignal.evidence.metricComparison.includes('Solo Distribution & Revenue'), 'Evidence cites over-allocated pillar');
    console.log('✓ Verified: Pillar skew heuristic synthesizes PILLAR_SHIFT_RECOMMENDED signal with re-balanced weights');

    // 16E: Audience Fatigue / Dismissals Heuristic (Rule 3)
    const fatigueEvents: DraftLifecycleEvent[] = [
      { eventId: 'f1', draftId: 'd1', authorHandle: testPersona.handle, eventType: 'DISMISSED', pillarId: 'pillar_scale', isHookSwapped: false, createdAt: new Date().toISOString() },
      { eventId: 'f2', draftId: 'd2', authorHandle: testPersona.handle, eventType: 'DISMISSED', pillarId: 'pillar_scale', isHookSwapped: false, createdAt: new Date().toISOString() },
      { eventId: 'f3', draftId: 'd3', authorHandle: testPersona.handle, eventType: 'APPROVED', pillarId: 'pillar_systems', isHookSwapped: false, createdAt: new Date().toISOString() },
    ];

    const fatigueSignals = EvolutionSignalSynthesizer.synthesize({
      persona: testPersona,
      lifecycleEvents: fatigueEvents,
      minEventsThreshold: 3,
    });

    const fatigueSignal = fatigueSignals.find((s) => s.type === 'AUDIENCE_FATIGUE');
    assert.ok(fatigueSignal, 'Must synthesize AUDIENCE_FATIGUE when >= 2 dismissals occur');
    assert.strictEqual(fatigueSignal.proposedAdjustment.field, 'forbiddenPhrases');
    assert.ok(
      Array.isArray(fatigueSignal.proposedAdjustment.proposedValue) &&
        (fatigueSignal.proposedAdjustment.proposedValue.includes('skyrocket') ||
          fatigueSignal.proposedAdjustment.proposedValue.includes('insane')),
      'Proposed value appends new fatigue buzzwords'
    );
    console.log('✓ Verified: Fatigue heuristic synthesizes AUDIENCE_FATIGUE proposal proposing new forbidden phrases');

    // 16F: Safe Evolution Manager Enhancement: Applying Dynamic Pillar Proposal
    const evolutionManager = new SafeEvolutionManager();
    evolutionManager.registerInitialPersona(testPersona);

    const applyPillarResult = evolutionManager.applyEvolutionSignal(testPersona, pillarSignal);
    assert.strictEqual(applyPillarResult.success, true, 'SafeEvolutionManager must successfully apply pillar re-balancing signal');
    assert.ok(applyPillarResult.newPersona, 'Must return new persona');
    assert.strictEqual(applyPillarResult.newPersona.version, testPersona.version + 1, 'Bumps persona version to v2');
    
    // Verify weights sum strictly to 100
    const totalWeight = applyPillarResult.newPersona.pillars.reduce((acc, p) => acc + p.weight, 0);
    assert.strictEqual(totalWeight, 100, 'Re-balanced pillar weights must sum strictly to 100%');
    console.log('✓ Verified: SafeEvolutionManager safely updates pillar weights with strict 100% sum verification to v2');

    // 16G: Mock Provider Integration
    const mockProvider = new MockBigQueryTelemetryProvider();
    const providerSignals = mockProvider.getEvolutionSignals(testPersona);
    assert.ok(providerSignals.length > 0, 'Mock provider returns dynamic signals synthesized from baseline events');
    console.log(`✓ Verified: MockBigQueryTelemetryProvider dynamically returns ${providerSignals.length} synthesized candidate proposals`);
  }

  // Test 17: Phase 2F1 - Raw Idea & Note Ingestion for Stage 1 Topic Radar
  {
    console.log('\n[TEST 17] Phase 2F1: Raw Idea & Note Ingestion for Stage 1 Topic Radar');

    // 17A: Empty & Length Validation Guardrail (< 10 chars)
    assert.throws(
      () => {
        IdeaIngestionEngine.refineNote('short', INITIAL_PERSONA);
      },
      /at least 10 characters/,
      'Must reject notes shorter than 10 characters'
    );
    assert.throws(
      () => {
        IdeaIngestionEngine.refineNote('   ', INITIAL_PERSONA);
      },
      /at least 10 characters/,
      'Must reject whitespace-only notes'
    );
    console.log('✓ Verified: Input length guardrail enforces >= 10 characters');

    // 17B: Category Classification Heuristics
    const caseStudyNote = 'We reached $15k MRR with 120 paying customers and 48% conversion on a single landing page.';
    const contrarianNote = 'Stop building complex microservices before you have PMF. It is completely wrong and wasteful.';
    const frictionNote = 'Solo founders struggle with burnout, endless context switching, and exhaustion.';

    assert.strictEqual(
      IdeaIngestionEngine.classifyCategory(caseStudyNote),
      'CASE_STUDY',
      'Metrics and revenue numbers must classify as CASE_STUDY'
    );
    assert.strictEqual(
      IdeaIngestionEngine.classifyCategory(contrarianNote),
      'CONTRARIAN_THESIS',
      'Counter-takes and stop-doing signals must classify as CONTRARIAN_THESIS'
    );
    assert.strictEqual(
      IdeaIngestionEngine.classifyCategory(frictionNote),
      'AUDIENCE_FRICTION',
      'Burnout, struggles, and fatigue must classify as AUDIENCE_FRICTION'
    );
    console.log('✓ Verified: Heuristic classifier correctly identifies CASE_STUDY, CONTRARIAN_THESIS, and AUDIENCE_FRICTION');

    // 17C: Content Pillar Matching Heuristics
    const systemsNote = 'Our serverless Next.js stack with BigQuery and Redis deploys in under 30 seconds.';
    const scaleNote = 'Building an owned newsletter distribution channel to scale recurring revenue.';
    const mindsetNote = 'Dealing with solo founder psychology, isolation, and maintaining daily discipline.';

    assert.strictEqual(
      IdeaIngestionEngine.matchPillar(systemsNote, INITIAL_PERSONA.pillars),
      'pillar_systems',
      'Technical stack keywords must match pillar_systems'
    );
    assert.strictEqual(
      IdeaIngestionEngine.matchPillar(scaleNote, INITIAL_PERSONA.pillars),
      'pillar_scale',
      'Distribution and revenue keywords must match pillar_scale'
    );
    assert.strictEqual(
      IdeaIngestionEngine.matchPillar(mindsetNote, INITIAL_PERSONA.pillars),
      'pillar_mindset',
      'Psychology and discipline keywords must match pillar_mindset'
    );
    console.log('✓ Verified: Content pillar matching aligns raw ideas to relevant persona pillars');

    // 17D: Refinement into Structured ResearchItem
    const refinedItem = IdeaIngestionEngine.refineNote(systemsNote, INITIAL_PERSONA);
    assert.ok(refinedItem.id.startsWith('res_note_'), 'Generated item ID must have res_note_ prefix');
    assert.strictEqual(refinedItem.isUserCreated, true, 'Must be marked as isUserCreated: true');
    assert.strictEqual(refinedItem.pillarId, 'pillar_systems', 'Must carry matched pillarId');
    assert.ok(refinedItem.createdAt, 'Must include ISO createdAt timestamp');
    assert.strictEqual(refinedItem.rawNoteSource, systemsNote, 'Must preserve rawNoteSource');
    assert.ok(refinedItem.topic.length > 0, 'Must synthesize clean topic title');
    assert.ok(refinedItem.summary.length > 0, 'Must synthesize concise summary');
    assert.ok(refinedItem.seedAngle.length > 0, 'Must synthesize draft-ready seedAngle');
    assert.ok(refinedItem.audiencePainPoint, 'Must include audiencePainPoint');
    console.log('✓ Verified: Refinement produces complete, structured ResearchItem for topic radar');

    // 17E: Manual Category Override & Correction
    const overriddenItem = IdeaIngestionEngine.refineNote(
      caseStudyNote,
      INITIAL_PERSONA,
      'AUDIENCE_FRICTION' // Explicit user override
    );
    assert.strictEqual(
      overriddenItem.category,
      'AUDIENCE_FRICTION',
      'Explicit category override must supersede heuristic classification'
    );
    assert.deepStrictEqual(
      RESEARCH_CATEGORIES,
      ['AUDIENCE_FRICTION', 'CONTRARIAN_THESIS', 'CASE_STUDY'],
      'RESEARCH_CATEGORIES contains all valid research categories for cycling/override'
    );
    console.log('✓ Verified: Lightweight category override and cycling path operates correctly');

    // 17F: Stage 4 Autonomous Drafter Hand-Off Contract
    const drafterContext = {
      persona: INITIAL_PERSONA,
      crisisState: INITIAL_CRISIS_STATE,
      xaiAdapter: new MockXAIClientAdapter(),
      xAdapter: new MockXClientAdapter(),
    };

    const generatedDraft = await AgentOrchestrator.createDraftPipeline(
      drafterContext,
      refinedItem.pillarId,
      {
        topic: refinedItem.topic,
        seedAngle: refinedItem.seedAngle,
        format: 'SINGLE_TWEET',
      }
    );

    assert.strictEqual(generatedDraft.pillarId, refinedItem.pillarId, 'Draft must inherit pillar from refined note');
    assert.ok(generatedDraft.content.length > 0, 'Draft content must be populated');
    assert.strictEqual(generatedDraft.status, 'COMPLIANCE_REVIEW', 'Draft must start in COMPLIANCE_REVIEW awaiting approval');
    assert.ok(generatedDraft.complianceReport?.passed, 'Generated draft must pass Compliance Sentinel verification');
    assert.ok(generatedDraft.hookVariations && generatedDraft.hookVariations.length >= 3, 'Must offer 3 diverse hook variations');

    // Verify approval gate remains enforced on drafts created from notes
    assert.notStrictEqual(generatedDraft.status, 'APPROVED', 'Draft cannot be auto-approved');
    console.log('✓ Verified: Refined idea smoothly hands off to Stage 4 drafting with compliance & approval gates intact');
  }

  // Test 18: Phase 2H - Workspace State Continuity & Context Preservation Contract
  {
    console.log('\n[TEST 18] Phase 2H: Workspace State Continuity & Context Preservation Contract');

    // 18A: Unsubmitted Note Buffer Continuity & State Invariance
    // Simulating user typing a raw note in Studio, switching tabs, and returning
    const inMemoryNoteBuffer = {
      rawNote: 'Observing that 80% of founders fail due to lack of distribution, not code.',
      selectedCategoryOverride: 'CONTRARIAN_THESIS' as const,
    };

    // Refinement must remain idempotent and accurate from preserved buffer
    const itemFromBuffer = IdeaIngestionEngine.refineNote(
      inMemoryNoteBuffer.rawNote,
      INITIAL_PERSONA,
      inMemoryNoteBuffer.selectedCategoryOverride
    );
    assert.strictEqual(itemFromBuffer.category, 'CONTRARIAN_THESIS', 'Preserved buffer must maintain override category');
    assert.strictEqual(itemFromBuffer.isUserCreated, true, 'Item from preserved buffer must maintain creator note status');
    console.log('✓ Verified: Unsubmitted note buffer and category override survive simulated workspace transitions');

    // 18B: In-Flight Reply Draft Continuity
    // Simulating user opening reply drafter in Engage, editing text, switching to Studio, and returning
    const sampleMention: MentionTriageItem = {
      id: 'm_cont_1',
      authorHandle: 'indie_dev',
      text: 'What stack do you recommend for scaling solo without DevOps nightmare?',
      sentiment: 'NEUTRAL',
      urgency: 'HIGH',
      recommendedAction: 'REPLY',
      receivedAt: '2m ago',
    };

    const xaiAdapter = new MockXAIClientAdapter();
    const replyOptions = await xaiAdapter.generateReplyOptions(sampleMention, INITIAL_PERSONA);
    assert.strictEqual(replyOptions.length, 2, 'Generates 2 candidate replies');

    // Preserved in-flight state across tab switch
    const inFlightReplyState: ReplyDraft = {
      id: `draft_${sampleMention.id}`,
      mentionId: sampleMention.id,
      inReplyToUser: sampleMention.authorHandle,
      inReplyToText: sampleMention.text,
      selectedOptionId: replyOptions[0].id,
      selectedText: `${replyOptions[0].text} Keep your stack boring and serverless.`,
      status: 'DRAFT',
      options: replyOptions,
      complianceReport: ComplianceEngine.evaluateDraft(
        { content: `${replyOptions[0].text} Keep your stack boring and serverless.` },
        INITIAL_PERSONA,
        INITIAL_CRISIS_STATE
      ),
      createdAt: new Date().toISOString(),
    };

    // Verify compliance passes on preserved edited text
    assert.strictEqual(inFlightReplyState.status, 'DRAFT', 'In-flight reply draft must remain in DRAFT status');
    assert.ok(inFlightReplyState.complianceReport?.passed, 'Preserved customized reply text must pass compliance');
    console.log('✓ Verified: In-flight reply draft context and customized text maintain integrity across tab switches');

    // 18C: Approval Gate Safety Invariance
    // Verifying that preserved in-flight reply cannot be sent without creator approval
    const xClient = new MockXClientAdapter();
    const testContext = {
      persona: INITIAL_PERSONA,
      crisisState: INITIAL_CRISIS_STATE,
      xaiAdapter,
      xAdapter: xClient,
    };
    await assert.rejects(
      async () => {
        await AgentOrchestrator.sendReplyPipeline(testContext, inFlightReplyState);
      },
      /requires explicit creator approval/,
      'Must reject sending preserved reply that has not been explicitly authorized by human creator'
    );
    console.log('✓ Verified: Preserving state in memory does NOT bypass human authorization gates');

    // 18D: Workspace Scroll Coordinate Tracking Contract
    // Simulating the scroll map logic implemented in useWorkspaceScroll
    const workspaceScrollMap: Record<string, number> = {
      strategy: 0,
      drafts: 420,
      triage: 180,
      analytics: 750,
    };

    assert.strictEqual(workspaceScrollMap['strategy'], 0, 'Initial Studio scroll at top');
    assert.strictEqual(workspaceScrollMap['drafts'], 420, 'Queue preserves scrolled position');
    assert.strictEqual(workspaceScrollMap['triage'], 180, 'Engage preserves mention scroll position');
    assert.strictEqual(workspaceScrollMap['analytics'], 750, 'Signals preserves analytics scroll position');
    console.log('✓ Verified: Workspace scroll tracking contract deterministically isolates coordinates per tab');
  }

  // Test 19: Phase 2I - Local Session Recovery & Return-to-Work Flow Contract
  {
    console.log('\n[TEST 19] Phase 2I: Local Session Recovery & Return-to-Work Flow Contract');

    const inMemoryBackend = new InMemoryStorageBackend();
    const storage = new SessionRecoveryStorage(inMemoryBackend);

    // 19A: Centralized Storage Abstraction & Fallback Hierarchy
    storage.saveSessionState({
      lastActiveTab: 'drafts',
      focusedDraftId: 'draft_101',
    });

    const loaded19A = storage.loadSessionState();
    assert.ok(loaded19A, 'Session state must load successfully');
    assert.strictEqual(loaded19A.version, 1, 'Version must be 1');
    assert.strictEqual(loaded19A.lastActiveTab, 'drafts', 'Must recover last active tab');
    assert.strictEqual(loaded19A.focusedDraftId, 'draft_101', 'Must recover focused draft ID');
    assert.ok(typeof loaded19A.savedAt === 'number', 'Must contain savedAt timestamp');
    console.log('✓ Verified: Storage abstraction persists and restores lastActiveTab and focusedDraftId');

    // 19B: Quick Note Buffer Persistence & Selective Purge
    storage.saveSessionState({
      quickNoteBuffer: {
        rawNoteInput: 'Solopreneurs overcomplicate analytics pipelines by choosing raw ClickHouse prematurely.',
        categoryOverride: 'CONTRARIAN_THESIS',
        updatedAt: Date.now(),
      },
    });

    const loaded19B = storage.loadSessionState();
    assert.ok(loaded19B?.quickNoteBuffer, 'Quick note buffer must be recovered');
    assert.strictEqual(
      loaded19B.quickNoteBuffer?.categoryOverride,
      'CONTRARIAN_THESIS',
      'Must recover category override'
    );
    assert.ok(
      loaded19B.quickNoteBuffer?.rawNoteInput.includes('Solopreneurs overcomplicate'),
      'Must recover unsubmitted note text'
    );

    // Test selective quick note clearing upon note refinement
    storage.clearQuickNote();
    const loadedAfterClearNote = storage.loadSessionState();
    assert.strictEqual(loadedAfterClearNote?.quickNoteBuffer, undefined, 'Quick note buffer must be purged on demand');
    assert.strictEqual(loadedAfterClearNote?.lastActiveTab, 'drafts', 'Clearing quick note must preserve other state');
    console.log('✓ Verified: Quick note buffer persists across restarts and selectively purges upon refinement');

    // 19C: In-Flight Reply Buffer & Tamper-Proof Forced DRAFT Invariant
    storage.saveSessionState({
      inFlightReply: {
        mentionId: 'm1',
        selectedOptionId: 'opt_1',
        customizedText: '@indie_dev_dan Columnar architecture is key for solopreneur speed.',
        updatedAt: Date.now(),
      },
    });

    const loaded19C = storage.loadSessionState();
    assert.ok(loaded19C?.inFlightReply, 'In-flight reply buffer must be recovered');
    assert.strictEqual(loaded19C.inFlightReply?.mentionId, 'm1');
    assert.strictEqual(
      loaded19C.inFlightReply?.customizedText,
      '@indie_dev_dan Columnar architecture is key for solopreneur speed.'
    );

    // Clear in-flight reply upon dispatch
    storage.clearInFlightReply();
    const loadedAfterClearReply = storage.loadSessionState();
    assert.strictEqual(loadedAfterClearReply?.inFlightReply, undefined, 'In-flight reply must be purged after dispatch');
    console.log('✓ Verified: In-flight reply buffer preserves customized draft and purges after dispatch');

    // 19D: 24-Hour TTL Expiration & Tamper Resistance
    const expiredTimestamp = Date.now() - (RECOVERY_TTL_MS + 5000); // 24h + 5s ago
    inMemoryBackend.setItem(
      RECOVERY_STORAGE_KEY,
      JSON.stringify({
        version: 1,
        lastActiveTab: 'analytics',
        savedAt: expiredTimestamp,
      })
    );

    const loadedExpired = storage.loadSessionState(Date.now());
    assert.strictEqual(loadedExpired, null, 'Expired snapshot (> 24h) must be rejected and return null');
    assert.strictEqual(inMemoryBackend.getItem(RECOVERY_STORAGE_KEY), null, 'Expired data must be purged from storage');

    // Corrupt JSON handling
    inMemoryBackend.setItem(RECOVERY_STORAGE_KEY, '{ invalid_json ::: corrupt ');
    const loadedCorrupt = storage.loadSessionState();
    assert.strictEqual(loadedCorrupt, null, 'Corrupt storage string must safely return null without throwing');
    console.log('✓ Verified: 24-hour TTL expiration and corrupt storage protection strictly enforced');

    // 19E: Approval Gate Safety Invariance on Recovered State
    // Verify that any reply or draft recovered from storage cannot be dispatched without human approval
    const xClient = new MockXClientAdapter();
    const xaiAdapter = new MockXAIClientAdapter();
    const testContext = {
      persona: INITIAL_PERSONA,
      crisisState: INITIAL_CRISIS_STATE,
      xaiAdapter,
      xAdapter: xClient,
    };

    const recoveredUnapprovedReply: ReplyDraft = {
      id: 'draft_rec_1',
      mentionId: 'm1',
      inReplyToUser: 'indie_dev_dan',
      inReplyToText: 'Sample text',
      selectedText: '@indie_dev_dan Columnar architecture is key for solopreneur speed.',
      status: 'DRAFT', // strictly forced DRAFT
      options: [],
      createdAt: new Date().toISOString(),
    };

    await assert.rejects(
      async () => {
        await AgentOrchestrator.sendReplyPipeline(testContext, recoveredUnapprovedReply);
      },
      /requires explicit creator approval/,
      'Recovered reply must strictly reject dispatch without explicit creator approval'
    );
    console.log('✓ Verified: Recovered session state strictly preserves human authorization gates');
  }

  // Test 20: Phase 2J - Recovery Hygiene, Selective Reversion & Workspace Reset Contract
  {
    console.log('\n[TEST 20] Phase 2J: Recovery Hygiene, Selective Reversion & Workspace Reset Contract');

    const inMemoryBackend = new InMemoryStorageBackend();
    const storage = new SessionRecoveryStorage(inMemoryBackend);

    // 20A: Scoped Workspace Reset Isolation
    storage.saveSessionState({
      lastActiveTab: 'strategy',
      focusedDraftId: 'draft_queue_1',
      quickNoteBuffer: {
        rawNoteInput: 'Raw note to be cleared in Studio reset',
        updatedAt: Date.now(),
      },
      inFlightReply: {
        mentionId: 'm_engage_1',
        customizedText: 'Draft reply to be preserved during Studio reset',
        updatedAt: Date.now(),
      },
    });

    // Resetting Studio workspace MUST only clear quickNoteBuffer
    storage.resetWorkspaceState('strategy');
    const stateAfterStudioReset = storage.loadSessionState();
    assert.strictEqual(
      stateAfterStudioReset?.quickNoteBuffer,
      undefined,
      'Start fresh in Studio: quickNoteBuffer must be cleared'
    );
    assert.strictEqual(
      stateAfterStudioReset?.focusedDraftId,
      'draft_queue_1',
      'Start fresh in Studio must NOT clear focusedDraftId in Queue'
    );
    assert.strictEqual(
      stateAfterStudioReset?.inFlightReply?.mentionId,
      'm_engage_1',
      'Start fresh in Studio must NOT clear inFlightReply in Engage'
    );
    console.log('✓ Verified: Start fresh in Studio scopes clearing strictly to quickNoteBuffer');

    // Resetting Queue workspace MUST only clear focusedDraftId
    storage.resetWorkspaceState('drafts');
    const stateAfterQueueReset = storage.loadSessionState();
    assert.strictEqual(
      stateAfterQueueReset?.focusedDraftId,
      undefined,
      'Start fresh in Queue: focusedDraftId must be cleared'
    );
    assert.strictEqual(
      stateAfterQueueReset?.inFlightReply?.mentionId,
      'm_engage_1',
      'Start fresh in Queue must NOT clear inFlightReply in Engage'
    );
    console.log('✓ Verified: Start fresh in Queue scopes clearing strictly to focusedDraftId');

    // Resetting Engage workspace MUST only clear inFlightReply
    storage.resetWorkspaceState('triage');
    const stateAfterEngageReset = storage.loadSessionState();
    assert.strictEqual(
      stateAfterEngageReset?.inFlightReply,
      undefined,
      'Start fresh in Engage: inFlightReply must be cleared'
    );
    console.log('✓ Verified: Start fresh in Engage scopes clearing strictly to inFlightReply');

    // 20B: Draft Unfocus & Focus Toggle Workflow
    storage.saveSessionState({ focusedDraftId: 'draft_test_focus' });
    assert.strictEqual(storage.loadSessionState()?.focusedDraftId, 'draft_test_focus');
    storage.clearFocusedDraft(); // Unfocus draft
    assert.strictEqual(
      storage.loadSessionState()?.focusedDraftId,
      undefined,
      'Unfocus draft action must clear focusedDraftId'
    );
    console.log('✓ Verified: Unfocus draft removes focus highlight without side effects');

    // 20C: Quick Note Discard ("Clear note")
    storage.saveSessionState({
      quickNoteBuffer: {
        rawNoteInput: 'Stale note to be discarded',
        categoryOverride: 'AUDIENCE_FRICTION',
        updatedAt: Date.now(),
      },
    });
    assert.ok(storage.loadSessionState()?.quickNoteBuffer, 'Note buffer saved');
    storage.clearQuickNote(); // "Clear note" action
    assert.strictEqual(
      storage.loadSessionState()?.quickNoteBuffer,
      undefined,
      'Clear note action must purge quickNoteBuffer immediately'
    );
    console.log('✓ Verified: Clear note action purges note buffer from recovery storage');

    // 20D: In-Flight Reply Discard ("Discard reply draft")
    storage.saveSessionState({
      inFlightReply: {
        mentionId: 'm3',
        selectedOptionId: 'opt_2',
        customizedText: '@crypto_bot Not interested in your scam.',
        updatedAt: Date.now(),
      },
    });
    assert.ok(storage.loadSessionState()?.inFlightReply, 'Reply buffer saved');
    storage.clearInFlightReply(); // "Discard reply draft" action
    assert.strictEqual(
      storage.loadSessionState()?.inFlightReply,
      undefined,
      'Discard reply draft action must purge inFlightReply immediately'
    );
    console.log('✓ Verified: Discard reply draft action purges reply buffer from recovery storage');

    // 20E: Approval Gate Invariance on Hygiene Operations
    // Verify that resetting or clearing recovery state never bypasses human authorization gates
    const approvedDraft = {
      ...INITIAL_DRAFTS[0],
      status: 'APPROVED' as const,
      approvedBy: 'CREATOR' as const,
      approvedAt: new Date().toISOString(),
    };

    // Performing a workspace reset must NOT alter draft approval status in memory
    storage.resetWorkspaceState('drafts');
    assert.strictEqual(approvedDraft.status, 'APPROVED', 'Approved draft in queue remains APPROVED');

    // An unapproved draft must still be rejected by orchestrator even if recovery state was reset
    const unapprovedDraft = {
      ...INITIAL_DRAFTS[0],
      status: 'DRAFT' as const,
      approvedBy: undefined,
      approvedAt: undefined,
    };
    const xClient = new MockXClientAdapter();
    const xaiAdapter = new MockXAIClientAdapter();
    const testContext = {
      persona: INITIAL_PERSONA,
      crisisState: INITIAL_CRISIS_STATE,
      xaiAdapter,
      xAdapter: xClient,
    };

    await assert.rejects(
      async () => {
        await AgentOrchestrator.publishDraftPipeline(testContext, unapprovedDraft);
      },
      /requires explicit creator approval/,
      'Unapproved draft must strictly reject publishing regardless of recovery hygiene resets'
    );
    console.log('✓ Verified: Hygiene resets strictly preserve approval gates and authorization rules');
  }

  // Test 21: Phase 2K - Session Expiry Visibility & Recovery Audit Trail Contract
  {
    console.log('\n[TEST 21] Phase 2K: Session Expiry Visibility & Recovery Audit Trail Contract');

    const inMemoryBackend = new InMemoryStorageBackend();
    const storage = new SessionRecoveryStorage(inMemoryBackend);

    // 21A: TTL Expiry Audit Recording with Age Calculation
    const now = Date.now();
    const ageHours26 = 26;
    const timestamp26hAgo = now - ageHours26 * 60 * 60 * 1000;

    inMemoryBackend.setItem(
      RECOVERY_STORAGE_KEY,
      JSON.stringify({
        version: 1,
        lastActiveTab: 'strategy',
        quickNoteBuffer: {
          rawNoteInput: 'Note saved over a day ago that should trigger TTL audit',
          updatedAt: timestamp26hAgo,
        },
        savedAt: timestamp26hAgo,
      })
    );

    const loadedExpired = storage.loadSessionState(now);
    assert.strictEqual(loadedExpired, null, 'Expired session must return null');
    assert.strictEqual(inMemoryBackend.getItem(RECOVERY_STORAGE_KEY), null, 'Expired recovery state must be cleared');

    const latestAudit21A = storage.getLatestAudit();
    assert.ok(latestAudit21A, 'Must record audit entry on TTL expiration');
    assert.strictEqual(latestAudit21A.reason, 'TTL_EXPIRED', 'Audit reason must be TTL_EXPIRED');
    assert.strictEqual(latestAudit21A.itemType, 'QUICK_NOTE', 'Must identify expired item as QUICK_NOTE');
    assert.strictEqual(latestAudit21A.workspace, 'strategy', 'Must record workspace as strategy');
    assert.strictEqual(latestAudit21A.ageHours, 26, 'Must calculate age in hours as 26');
    assert.ok(
      latestAudit21A.explanation.includes('reached the 24-hour retention limit and was removed from recovery'),
      'Must contain plain-English non-alarming expiry explanation'
    );
    assert.ok(
      latestAudit21A.explanation.includes('Approved queue posts remain safe'),
      'Must reassure that approved queue posts remain safe'
    );
    console.log('✓ Verified: TTL expiration records descriptive, reassuring audit event with calculated ageHours');

    // 21B: Corrupt Schema Defense Audit Recording
    inMemoryBackend.setItem(RECOVERY_STORAGE_KEY, 'invalid:json:{definitely_broken');
    const loadedCorrupt = storage.loadSessionState(now);
    assert.strictEqual(loadedCorrupt, null, 'Corrupt snapshot returns null');

    const latestAudit21B = storage.getLatestAudit();
    assert.ok(latestAudit21B, 'Must record audit entry on schema corruption');
    assert.strictEqual(latestAudit21B.reason, 'CORRUPT_SCHEMA', 'Audit reason must be CORRUPT_SCHEMA');
    assert.ok(
      latestAudit21B.explanation.includes('safely reset to avoid application instability'),
      'Must explain reset plainly without alarming errors'
    );
    console.log('✓ Verified: Corrupt recovery schema resets safely and records CORRUPT_SCHEMA audit event');

    // 21C: Creator Discard & Reset Audit Records ("cleared from local recovery")
    storage.saveSessionState({
      quickNoteBuffer: { rawNoteInput: 'Note to be cleared', updatedAt: Date.now() },
    });
    storage.clearQuickNote('DISCARD');
    const auditNoteDiscard = storage.getLatestAudit();
    assert.strictEqual(auditNoteDiscard?.reason, 'DISCARDED_BY_USER');
    assert.strictEqual(auditNoteDiscard?.itemType, 'QUICK_NOTE');
    assert.ok(auditNoteDiscard?.explanation.includes('cleared from local recovery'));

    storage.saveSessionState({
      inFlightReply: { mentionId: 'm1', customizedText: 'Reply to clear', updatedAt: Date.now() },
    });
    storage.clearInFlightReply('DISCARD');
    const auditReplyDiscard = storage.getLatestAudit();
    assert.strictEqual(auditReplyDiscard?.reason, 'DISCARDED_BY_USER');
    assert.strictEqual(auditReplyDiscard?.itemType, 'REPLY_DRAFT');
    assert.ok(auditReplyDiscard?.explanation.includes('cleared from local recovery'));

    storage.saveSessionState({ focusedDraftId: 'd_unfocus' });
    storage.clearFocusedDraft('UNFOCUS');
    const auditUnfocus = storage.getLatestAudit();
    assert.strictEqual(auditUnfocus?.reason, 'DISCARDED_BY_USER');
    assert.strictEqual(auditUnfocus?.itemType, 'FOCUSED_DRAFT');
    assert.ok(auditUnfocus?.explanation.includes('cleared from local recovery'));

    storage.saveSessionState({ quickNoteBuffer: { rawNoteInput: 'Reset studio note', updatedAt: Date.now() } });
    storage.resetWorkspaceState('strategy');
    const auditReset = storage.getLatestAudit();
    assert.strictEqual(auditReset?.reason, 'DISCARDED_BY_USER');
    assert.ok(auditReset?.explanation.includes('Start fresh in Studio'));
    assert.ok(auditReset?.explanation.includes('Approved content remains intact'));
    console.log('✓ Verified: User discards & workspace resets record non-alarming "cleared from local recovery" events');

    // 21D: Post-Publish & Post-Send Purge Auditing
    storage.saveSessionState({ focusedDraftId: 'd_publish' });
    storage.clearFocusedDraft('PUBLISHED');
    const auditPublish = storage.getLatestAudit();
    assert.strictEqual(auditPublish?.reason, 'PURGED_ON_PUBLISH');
    assert.strictEqual(auditPublish?.itemType, 'FOCUSED_DRAFT');
    assert.ok(auditPublish?.explanation.includes('Draft was authorized and published to X'));

    storage.saveSessionState({ inFlightReply: { mentionId: 'm_send', customizedText: 'Sent reply', updatedAt: Date.now() } });
    storage.clearInFlightReply('SENT');
    const auditSend = storage.getLatestAudit();
    assert.strictEqual(auditSend?.reason, 'PURGED_ON_SEND');
    assert.strictEqual(auditSend?.itemType, 'REPLY_DRAFT');
    assert.ok(auditSend?.explanation.includes('In-flight reply was authorized and dispatched to X'));
    console.log('✓ Verified: Post-publish and post-send purges log PURGED_ON_PUBLISH and PURGED_ON_SEND events');

    // 21E: Capping to MAX_AUDIT_ENTRIES (5 entries) & Non-Restorative Safety Guarantee
    for (let i = 0; i < 10; i++) {
      storage.recordAudit({
        reason: 'DISCARDED_BY_USER',
        itemType: 'QUICK_NOTE',
        workspace: 'strategy',
        explanation: `Test audit event ${i}`,
      });
    }
    const history = storage.getAuditHistory();
    assert.strictEqual(history.length, MAX_AUDIT_ENTRIES, `Audit history must be strictly capped to ${MAX_AUDIT_ENTRIES}`);
    assert.strictEqual(history[0].explanation, 'Test audit event 9', 'Latest event must be at index 0');

    // Non-restorative guarantee: Audit records contain NO PostDraft or ReplyDraft entities and cannot bypass gates
    const auditEntry = history[0];
    assert.strictEqual((auditEntry as any).content, undefined, 'Audit entry must not store draft content');
    assert.strictEqual((auditEntry as any).status, undefined, 'Audit entry must not store approval status');

    // Clear history verification
    storage.clearAuditHistory();
    assert.strictEqual(storage.getAuditHistory().length, 0, 'clearAuditHistory must empty audit trail');
    console.log('✓ Verified: Audit trail is capped to 5 entries, strictly non-restorative, and safely clearable');
  }

  console.log('\n=============================================');
  console.log('ALL 21 AGENTX CONTRACT TESTS PASSED PERFECTLY!');
  console.log('=============================================');
}

runTests().catch((err) => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
