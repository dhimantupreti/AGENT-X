import { PersonaConfig, PostDraft, CrisisState } from '@/core/types';

export const INITIAL_PERSONA: PersonaConfig = {
  id: 'persona_solo_1',
  userId: 'user_1',
  version: 1,
  handle: 'solobuilder',
  displayName: 'Alex Rivers | Solo Founder',
  bio: 'Building profitable micro-SaaS products in public. Writing about audience leverage, systems over goals, and solo engineering.',
  niche: 'Micro-SaaS & Solopreneurship',
  targetAudience: 'Early-stage bootstrapped founders, indie hackers, and solo software engineers',
  tone: {
    primary: 'authoritative',
    styleTags: ['concise', 'no-fluff', 'contrarian-inversion', 'data-backed'],
    forbiddenPhrases: ['game-changer', 'unprecedented', 'delve into', 'unlock the potential'],
  },
  pillars: [
    {
      id: 'pillar_scale',
      name: 'Solo Distribution & Revenue',
      weight: 45,
      description: 'Tactical breakdowns on getting first 1,000 customers without paid ads or marketing teams.',
      sampleHooks: [
        'Most founders think you need a team to hit $20k MRR.',
        'The distribution playbook that brought 5,000 users in 30 days.',
      ],
    },
    {
      id: 'pillar_systems',
      name: 'Engineering Systems for One',
      weight: 35,
      description: 'How to automate deployment, customer support, and QA as a single developer.',
      sampleHooks: [
        'My exact tech stack for running 3 profitable apps solo.',
        'Why I chose boring tech over the latest JavaScript framework.',
      ],
    },
    {
      id: 'pillar_mindset',
      name: 'Contrarian Lessons & Mindset',
      weight: 20,
      description: 'Challenging venture-backed narratives with bootstrapped reality.',
      sampleHooks: [
        'Stop checking analytics 14 times a day.',
        'The uncomfortable truth about product-market fit.',
      ],
    },
  ],
  createdAt: '2026-08-01T00:00:00.000Z',
  updatedAt: '2026-08-01T00:00:00.000Z',
  evolutionNotes: 'Baseline v1 Persona configured for Solopreneur audience.',
};

export const INITIAL_CRISIS_STATE: CrisisState = {
  isFrozen: false,
};

export const INITIAL_DRAFTS: PostDraft[] = [
  {
    id: 'draft_seed_01',
    pillarId: 'pillar_scale',
    content: `Most solo founders obsess over building features when they should be obsessing over distribution velocity.\n\nCode without an audience is just a personal diary.\n\n3 tactics to build distribution before writing your first line of code:`,
    thread: [
      `1. Curate a specific problem library:\nSpend 2 weeks answering questions in niche communities. The recurring friction points become your landing page headlines.`,
      `2. Ship public case studies:\nBreak down competitors' product flaws respectfully with metrics. Position yourself as the subject-matter authority.`,
      `3. Build in public with receipts:\nShare real MRR graphs and churn reasons. Vulnerability converts lurkers into brand advocates.`,
    ],
    hashtags: ['buildinpublic', 'saas'],
    status: 'COMPLIANCE_REVIEW',
    estimatedHookScore: 94,
    complianceReport: {
      passed: true,
      score: 98,
      violations: [],
      checkedAt: new Date().toISOString(),
    },
    suggestedScheduleTime: 'Tomorrow, 8:45 AM (Peak Engagement)',
    createdAt: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
    updatedAt: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
  },
  {
    id: 'draft_seed_02',
    pillarId: 'pillar_systems',
    content: `The solo founder tech stack that generates $18k/month with $45/month server costs:\n\n• Next.js + Tailwind (frontend)\n• Postgres on Cloud SQL (data)\n• BigQuery (analytics & telemetry)\n• Background workers for async jobs\n\nSimplicity is the only real leverage.`,
    hashtags: ['solofounder', 'indiehackers'],
    status: 'APPROVED',
    estimatedHookScore: 89,
    complianceReport: {
      passed: true,
      score: 95,
      violations: [],
      checkedAt: new Date().toISOString(),
    },
    suggestedScheduleTime: 'Today, 5:30 PM',
    createdAt: new Date(Date.now() - 1000 * 60 * 90).toISOString(),
    updatedAt: new Date(Date.now() - 1000 * 60 * 10).toISOString(),
  },
];
