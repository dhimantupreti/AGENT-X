import { NextResponse } from 'next/server';
import { AgentOrchestrator } from '@/lib/orchestration/workflow';
import { XAIClientAdapter } from '@/lib/adapters/xai/client';
import { MockXClientAdapter } from '@/lib/adapters/x/mock';
import { bigQueryTelemetryProvider } from '@/lib/gcp/bigquery';
import { PersonaConfig, CrisisState, DraftLifecycleEvent } from '@/core/types';

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

    // Best-effort, non-blocking draft lifecycle telemetry to BigQuery
    const lifecycleEvent: DraftLifecycleEvent = {
      eventId: `evt_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
      draftId: draft.id,
      authorHandle: persona.handle,
      eventType: 'DRAFT_CREATED',
      pillarId: draft.pillarId,
      initialHookArchetype: draft.selectedHookArchetype,
      selectedHookArchetype: draft.selectedHookArchetype,
      initialHookId: draft.selectedHookId,
      selectedHookId: draft.selectedHookId,
      format: draft.thread && draft.thread.length > 0 ? 'THREAD' : 'SINGLE_TWEET',
      isHookSwapped: false,
      createdAt: new Date().toISOString(),
    };
    await bigQueryTelemetryProvider.recordLifecycleEvent(lifecycleEvent);

    return NextResponse.json({ success: true, draft });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown drafting error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
