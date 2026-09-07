import { NextResponse } from 'next/server';
import { IdeaIngestionEngine } from '@/lib/research/ingestion';
import { PersonaConfig, ResearchCategory } from '@/core/types';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { rawText, persona, overrideCategory } = body as {
      rawText: string;
      persona: PersonaConfig;
      overrideCategory?: ResearchCategory;
    };

    if (!rawText || typeof rawText !== 'string' || rawText.trim().length < 10) {
      return NextResponse.json(
        { error: 'Note must be at least 10 characters long to refine into an angle.' },
        { status: 400 }
      );
    }

    if (!persona || !persona.pillars || persona.pillars.length === 0) {
      return NextResponse.json(
        { error: 'Valid persona with content pillars is required for ingestion.' },
        { status: 400 }
      );
    }

    const item = IdeaIngestionEngine.refineNote(rawText, persona, overrideCategory);

    return NextResponse.json({ success: true, item });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to ingest note';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
