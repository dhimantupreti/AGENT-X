import { NextResponse } from 'next/server';
import { AgentOrchestrator } from '@/lib/orchestration/workflow';
import { XAIClientAdapter } from '@/lib/adapters/xai/client';
import { MockXClientAdapter } from '@/lib/adapters/x/mock';
import { BigQueryDataLayer } from '@/lib/gcp/bigquery';
import { PostDraft, PersonaConfig, CrisisState, TweetEvent } from '@/core/types';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { draft, persona, crisisState } = body as {
      draft: PostDraft;
      persona: PersonaConfig;
      crisisState: CrisisState;
    };

    if (!draft || !persona) {
      return NextResponse.json({ error: 'Missing draft or persona' }, { status: 400 });
    }

    const xaiAdapter = new XAIClientAdapter();
    const xAdapter = new MockXClientAdapter();

    const { draft: updatedDraft, result } = await AgentOrchestrator.publishDraftPipeline(
      { persona, crisisState, xaiAdapter, xAdapter },
      draft
    );

    // Stream telemetry to BigQuery Data Layer
    if (result.tweetId) {
      const tweetEvent: TweetEvent = {
        tweetId: result.tweetId,
        authorHandle: persona.handle,
        text: updatedDraft.content,
        pillarId: updatedDraft.pillarId,
        personaVersion: persona.version,
        draftId: updatedDraft.id,
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
      await BigQueryDataLayer.logTweetEvent(tweetEvent);
    }

    return NextResponse.json({ success: true, draft: updatedDraft, result });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Publish error';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
