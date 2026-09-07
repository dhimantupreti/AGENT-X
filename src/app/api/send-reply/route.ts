import { NextResponse } from 'next/server';
import { AgentOrchestrator } from '@/lib/orchestration/workflow';
import { XAIClientAdapter } from '@/lib/adapters/xai/client';
import { MockXClientAdapter } from '@/lib/adapters/x/mock';
import { PersonaConfig, CrisisState, ReplyDraft } from '@/core/types';
import { bigQueryTelemetryProvider } from '@/lib/gcp/bigquery';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { replyDraft, persona, crisisState } = body as {
      replyDraft: ReplyDraft;
      persona: PersonaConfig;
      crisisState: CrisisState;
    };

    if (!replyDraft || !persona) {
      return NextResponse.json({ error: 'Missing replyDraft or persona' }, { status: 400 });
    }

    const xaiAdapter = new XAIClientAdapter();
    const xAdapter = new MockXClientAdapter();

    const { replyDraft: sentDraft, result } = await AgentOrchestrator.sendReplyPipeline(
      { persona, crisisState: crisisState || { isFrozen: false }, xaiAdapter, xAdapter },
      replyDraft
    );

    // Best-effort non-blocking telemetry logging on server
    if (result.tweetId) {
      await bigQueryTelemetryProvider.recordLifecycleEvent({
        eventId: `evt_reply_${Date.now()}`,
        draftId: sentDraft.id,
        authorHandle: persona.handle,
        eventType: 'PUBLISHED',
        format: 'SINGLE_TWEET',
        isHookSwapped: false,
        createdAt: new Date().toISOString(),
      }).catch(() => {});
    }

    return NextResponse.json({ success: true, replyDraft: sentDraft, result });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Reply dispatch error';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
