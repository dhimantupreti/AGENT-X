import { NextResponse } from 'next/server';
import { SafeEvolutionManager } from '@/lib/evolution/manager';
import { PersonaConfig, EvolutionSignal } from '@/core/types';

const evolutionManager = new SafeEvolutionManager();

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { persona, signal } = body as {
      persona: PersonaConfig;
      signal: EvolutionSignal;
    };

    if (!persona || !signal) {
      return NextResponse.json({ error: 'Missing persona or signal' }, { status: 400 });
    }

    evolutionManager.registerInitialPersona(persona);
    const result = evolutionManager.applyEvolutionSignal(persona, signal);

    if (!result.success || !result.newPersona) {
      return NextResponse.json({ error: result.error || 'Evolution failed' }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      newPersona: result.newPersona,
      history: evolutionManager.getHistory(persona.id),
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Evolution error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
