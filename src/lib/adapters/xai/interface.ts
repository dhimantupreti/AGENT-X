import { PersonaConfig, ContentPillar, CrisisRiskAssessment, ReplyOption } from '@/core/types';
import { DraftGenerationResponse } from '@/core/schemas';
import { MentionTriageItem } from '@/lib/adapters/x/interface';

export interface GenerateDraftRequest {
  persona: PersonaConfig;
  pillar: ContentPillar;
  topic?: string;
  seedAngle?: string;
  seedResearchId?: string;
  format?: 'SINGLE_TWEET' | 'THREAD';
}

export interface IXAIClientAdapter {
  generateDraft(request: GenerateDraftRequest): Promise<DraftGenerationResponse>;
  analyzeCrisisRisk(text: string, persona?: PersonaConfig): Promise<CrisisRiskAssessment>;
  generateReplyOptions(mention: MentionTriageItem, persona: PersonaConfig): Promise<ReplyOption[]>;
}
