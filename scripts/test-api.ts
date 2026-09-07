async function testLiveApi() {
  const persona = {
    id: 'p1',
    userId: 'u1',
    version: 1,
    handle: 'solobuilder',
    displayName: 'Alex Rivers',
    bio: 'Solo Founder',
    niche: 'Micro-SaaS',
    targetAudience: 'Solo builders',
    tone: {
      primary: 'authoritative',
      styleTags: ['concise'],
      forbiddenPhrases: ['game-changer'],
    },
    pillars: [
      {
        id: 'pillar_scale',
        name: 'Revenue',
        weight: 50,
        description: 'Distribution',
        sampleHooks: ['Hook 1'],
      },
    ],
    createdAt: '2026-08-01T00:00:00Z',
    updatedAt: '2026-08-01T00:00:00Z',
  };

  const crisisState = { isFrozen: false };

  console.log('Testing live API routes on http://localhost:3000...');

  // 1. Generate Draft
  const genRes = await fetch('http://localhost:3000/api/generate-draft', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ persona, crisisState, pillarId: 'pillar_scale' }),
  });
  const genData = await genRes.json();
  console.log('✓ /api/generate-draft response:', genRes.status, genData.success ? 'Success' : genData.error);
  if (genData.draft) {
    console.log('  Generated Hook:', genData.draft.content.substring(0, 70) + '...');
    console.log('  Compliance score:', genData.draft.complianceReport.score);
  }

  // 2. Publish Draft Gate Test
  if (genData.draft) {
    // 2a. Unapproved publish attempt must be blocked
    const unapprovedRes = await fetch('http://localhost:3000/api/publish-draft', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ draft: genData.draft, persona, crisisState }),
    });
    const unapprovedData = await unapprovedRes.json();
    console.log('✓ Unapproved publish blocked as expected:', unapprovedRes.status === 400, unapprovedData.error);

    // 2b. Approved publish succeeds
    const approvedDraft = {
      ...genData.draft,
      status: 'APPROVED',
      approvedBy: 'CREATOR',
      approvedAt: new Date().toISOString(),
    };

    const pubRes = await fetch('http://localhost:3000/api/publish-draft', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ draft: approvedDraft, persona, crisisState }),
    });
    const pubData = await pubRes.json();
    console.log('✓ /api/publish-draft approved response:', pubRes.status, pubData.success ? 'Success' : pubData.error);
    console.log('  Tweet ID:', pubData.result?.tweetId);
  }

  // 3. Apply Safe Evolution
  const evoRes = await fetch('http://localhost:3000/api/evolution/apply', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      persona,
      signal: {
        id: 'sig_api_1',
        type: 'HIGH_PERFORMING_HOOK',
        confidence: 0.96,
        evidence: { tweetIds: ['seed_tw_1'], metricComparison: '3.5x bookmarks' },
        proposedAdjustment: {
          field: 'tone',
          currentValue: ['concise'],
          proposedValue: ['contrarian-inversion'],
          rationale: 'Contrarian hooks drive higher engagement.',
        },
        status: 'PENDING_APPROVAL',
        createdAt: new Date().toISOString(),
      },
    }),
  });
  const evoData = await evoRes.json();
  console.log('✓ /api/evolution/apply response:', evoRes.status, evoData.success ? 'Success' : evoData.error);
  console.log('  New persona version:', evoData.newPersona?.version);
}

testLiveApi().catch(console.error);
