import { NextResponse } from 'next/server';
import { AgentOrchestrator } from '@/lib/orchestration/workflow';
import { XAIClientAdapter } from '@/lib/adapters/xai/client';
import { MockXClientAdapter } from '@/lib/adapters/x/mock';
import { PersonaConfig, CrisisState } from '@/core/types';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { persona, crisisState, pillarId, options } = body as {
      persona: PersonaConfig;
      crisisState: CrisisState;
      pillarId: string;
      options?: { topic?: string; format?: 'SINGLE_TWEET' | 'THREAD' };
    };

    if (!persona || !pillarId) {
      return NextResponse.json({ error: 'Missing persona or pillarId' }, { status: 400 });
    }

    const xaiAdapter = new XAIClientAdapter();
    const xAdapter = new MockXClientAdapter();

    const draft = await AgentOrchestrator.createDraftPipeline(
      { persona, crisisState, xaiAdapter, xAdapter },
      pillarId,
      options
    );

    return NextResponse.json({ success: true, draft });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown drafting error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
