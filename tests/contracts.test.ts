import assert from 'node:assert';
import { ComplianceEngine } from '../src/lib/compliance/engine';
import { SafeEvolutionManager } from '../src/lib/evolution/manager';
import { AgentOrchestrator } from '../src/lib/orchestration/workflow';
import { MockXAIClientAdapter } from '../src/lib/adapters/xai/mock';
import { MockXClientAdapter } from '../src/lib/adapters/x/mock';
import { INITIAL_PERSONA, INITIAL_CRISIS_STATE } from '../src/lib/state/seedData';
import { EvolutionSignal } from '../src/core/types';

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

  console.log('\n=============================================');
  console.log('ALL 6 AGENTX CONTRACT TESTS PASSED PERFECTLY!');
  console.log('=============================================');
}

runTests().catch((err) => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
