import { NextResponse } from 'next/server';
import { AgentOrchestrator } from '@/lib/orchestration/workflow';
import { XAIClientAdapter } from '@/lib/adapters/xai/client';
import { MockXClientAdapter } from '@/lib/adapters/x/mock';
import { PersonaConfig, CrisisState } from '@/core/types';
import { MentionTriageItem } from '@/lib/adapters/x/interface';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { mention, persona, crisisState } = body as {
      mention: MentionTriageItem;
      persona: PersonaConfig;
      crisisState: CrisisState;
    };

    if (!mention || !persona) {
      return NextResponse.json({ error: 'Missing mention or persona parameter' }, { status: 400 });
    }

    const xaiAdapter = new XAIClientAdapter();
    const xAdapter = new MockXClientAdapter();

    const replyDraft = await AgentOrchestrator.createReplyPipeline(
      { persona, crisisState: crisisState || { isFrozen: false }, xaiAdapter, xAdapter },
      mention
    );

    return NextResponse.json({ success: true, replyDraft });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Reply generation error';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
