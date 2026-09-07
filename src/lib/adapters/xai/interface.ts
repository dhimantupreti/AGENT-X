import { PersonaConfig, ContentPillar } from '@/core/types';
import { DraftGenerationResponse } from '@/core/schemas';

export interface GenerateDraftRequest {
  persona: PersonaConfig;
  pillar: ContentPillar;
  topic?: string;
  seedAngle?: string;
  format?: 'SINGLE_TWEET' | 'THREAD';
}

export interface IXAIClientAdapter {
  generateDraft(request: GenerateDraftRequest): Promise<DraftGenerationResponse>;
  analyzeCrisisRisk(text: string): Promise<{ riskScore: number; reason: string; recommendation: string }>;
}
