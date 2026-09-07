import { IXAIClientAdapter, GenerateDraftRequest } from './interface';
import {
  DraftGenerationResponse,
  draftGenerationResponseSchema,
  XAI_DRAFT_RESPONSE_JSON_SCHEMA,
  crisisRiskAssessmentSchema,
  XAI_CRISIS_ANALYSIS_JSON_SCHEMA,
} from '@/core/schemas';
import { CrisisRiskAssessment, PersonaConfig, ReplyOption } from '@/core/types';
import { MentionTriageItem } from '@/lib/adapters/x/interface';
import { MockXAIClientAdapter } from './mock';
import { getAppConfig } from '@/lib/config';

/**
 * Defensive sanitizer to extract JSON string from markdown code fences if present.
 */
export function cleanMarkdownCodeFences(raw: string): string {
  const trimmed = raw.trim();
  const fencedMatch = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  if (fencedMatch && fencedMatch[1]) {
    return fencedMatch[1].trim();
  }
  const innerMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (innerMatch && innerMatch[1]) {
    return innerMatch[1].trim();
  }
  return trimmed;
}

/**
 * Extract output text from xAI /v1/responses format or standard payload shapes.
 */
export function extractTextFromResponsesOutput(data: any): string | null {
  if (!data) return null;
  if (typeof data.output_text === 'string' && data.output_text.trim()) {
    return data.output_text;
  }
  if (Array.isArray(data.output)) {
    for (const item of data.output) {
      if (item?.type === 'message' || item?.role === 'assistant') {
        if (Array.isArray(item.content)) {
          for (const part of item.content) {
            if (typeof part?.text === 'string' && part.text.trim()) {
              return part.text;
            }
            if (typeof part === 'string' && part.trim()) {
              return part;
            }
          }
        } else if (typeof item.content === 'string' && item.content.trim()) {
          return item.content;
        }
      }
    }
  }
  if (Array.isArray(data.choices) && data.choices[0]?.message?.content) {
    return data.choices[0].message.content;
  }
  return null;
}

export class XAIClientAdapter implements IXAIClientAdapter {
  private mockFallback = new MockXAIClientAdapter();

  async generateDraft(request: GenerateDraftRequest): Promise<DraftGenerationResponse> {
    const config = getAppConfig();

    if (!config.XAI_API_KEY) {
      return this.mockFallback.generateDraft(request);
    }

    const systemPrompt = `You are AGENTX, an elite AI social media strategist and ghostwriter for solopreneurs on X (Twitter).
Creator Persona:
- Handle: @${request.persona.handle}
- Niche: ${request.persona.niche}
- Audience: ${request.persona.targetAudience}
- Tone: ${request.persona.tone.primary} (Styles: ${request.persona.tone.styleTags.join(', ')})
- Forbidden Phrases: ${request.persona.tone.forbiddenPhrases.join(', ') || 'None'}

Target Pillar:
- Pillar: ${request.pillar.name}
- Goal: ${request.pillar.description}

Formatting Rules:
1. Every tweet must be <= 280 characters.
2. Hook must be arresting, contrarian, or immediately actionable. No generic greetings ("Hey X!").
3. Always generate 3 distinct opening hook variations (INVERSION, HARD_DATA, DIRECT_QUESTION).
4. For threads, structure into clear stages: Hook -> Core Steps/Problem -> Creator Takeaway CTA.
5. Adhere strictly to the requested JSON schema.`;

    const seedContext = request.seedAngle ? ` Seed angle: "${request.seedAngle}".` : '';
    const userPrompt = `Generate a ${request.format === 'THREAD' ? 'thread (3-5 tweets with blueprint stages)' : 'single tweet'} about: ${
      request.topic || request.pillar.sampleHooks[0] || 'A hard-learned lesson from building solo'
    }.${seedContext}`;

    const timeoutMs = config.XAI_TIMEOUT_MS || 8000;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(`${config.XAI_BASE_URL}/responses`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${config.XAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: config.XAI_MODEL || 'grok-3-mini',
          instructions: systemPrompt,
          input: userPrompt,
          text: {
            format: {
              type: 'json_schema',
              name: 'draft_generation_response',
              strict: true,
              schema: XAI_DRAFT_RESPONSE_JSON_SCHEMA,
            },
          },
          temperature: 0.7,
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => '');
        console.warn(`[xAI] HTTP ${response.status} from /v1/responses: ${errorText}. Falling back to mock generator.`);
        return this.mockFallback.generateDraft(request);
      }

      const data = await response.json();
      const rawContent = extractTextFromResponsesOutput(data);

      if (!rawContent) {
        console.warn('[xAI] No content extracted from /v1/responses output. Falling back to mock generator.');
        return this.mockFallback.generateDraft(request);
      }

      // Primary parse: direct JSON parse
      let parsedJson: unknown;
      try {
        parsedJson = JSON.parse(rawContent);
      } catch {
        // Defensive backup path: clean markdown code fences if model enclosed JSON
        try {
          const cleaned = cleanMarkdownCodeFences(rawContent);
          parsedJson = JSON.parse(cleaned);
        } catch (parseErr) {
          console.warn('[xAI] Malformed JSON in model response even after defensive sanitizing:', parseErr);
          return this.mockFallback.generateDraft(request);
        }
      }

      const validated = draftGenerationResponseSchema.safeParse(parsedJson);
      if (!validated.success) {
        console.warn('[xAI] Model output failed strict schema validation:', validated.error.format());
        return this.mockFallback.generateDraft(request);
      }

      return {
        ...validated.data,
        generationEngine: 'xai_live',
        generatorModel: config.XAI_MODEL || 'grok-3-mini',
      };
    } catch (err: any) {
      if (err?.name === 'AbortError') {
        console.warn(`[xAI] Draft generation request timed out after ${timeoutMs}ms. Falling back to mock generator.`);
      } else {
        console.warn('[xAI] Error during live generation call, falling back to mock adapter:', err);
      }
      return this.mockFallback.generateDraft(request);
    } finally {
      clearTimeout(timeoutId);
    }
  }

  async analyzeCrisisRisk(text: string, persona?: PersonaConfig): Promise<CrisisRiskAssessment> {
    const config = getAppConfig();

    if (!config.XAI_API_KEY) {
      return this.mockFallback.analyzeCrisisRisk(text, persona);
    }

    const systemPrompt = `You are AGENTX Brand Safety & Policy Sentinel. You analyze social media content for solopreneurs on X (Twitter).
Evaluate the content for 4 core risk dimensions:
1. Brand Liability: Legal exposure, guarantees, unsubstantiated claims, trademark/reputation hazards.
2. Tone Toxicity: Harassment, aggression, hate speech, inflammatory drama, or explicit abuse.
3. Sarcasm & Ambiguity: Satire that could mislead, confusing irony, deceptive framing.
4. Escalation: Extreme controversy, policy violation, or brand damage requiring mandatory human review before posting.

Adhere strictly to the requested JSON schema.`;

    const userPrompt = `Analyze the following content:\n\nContent:\n"${text}"\n\nCreator Persona Context:\n- Handle: @${persona?.handle || 'creator'}\n- Primary Tone: ${persona?.tone.primary || 'conversational'}\n- Forbidden Phrases: ${persona?.tone.forbiddenPhrases.join(', ') || 'None'}`;

    const timeoutMs = config.XAI_TIMEOUT_MS || 8000;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(`${config.XAI_BASE_URL}/responses`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${config.XAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: config.XAI_MODEL || 'grok-3-mini',
          instructions: systemPrompt,
          input: userPrompt,
          text: {
            format: {
              type: 'json_schema',
              name: 'crisis_risk_assessment',
              strict: true,
              schema: XAI_CRISIS_ANALYSIS_JSON_SCHEMA,
            },
          },
          temperature: 0.2,
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => '');
        console.warn(`[xAI] HTTP ${response.status} from /v1/responses (crisis analysis): ${errorText}. Falling back to mock risk analyzer.`);
        return this.mockFallback.analyzeCrisisRisk(text, persona);
      }

      const data = await response.json();
      const rawContent = extractTextFromResponsesOutput(data);

      if (!rawContent) {
        console.warn('[xAI] No content extracted from crisis analysis response. Falling back to mock risk analyzer.');
        return this.mockFallback.analyzeCrisisRisk(text, persona);
      }

      // Primary parse
      let parsedJson: unknown;
      try {
        parsedJson = JSON.parse(rawContent);
      } catch {
        // Defensive backup path: strip markdown code fences
        try {
          const cleaned = cleanMarkdownCodeFences(rawContent);
          parsedJson = JSON.parse(cleaned);
        } catch (parseErr) {
          console.warn('[xAI] Malformed JSON in crisis response even after defensive sanitizing:', parseErr);
          return this.mockFallback.analyzeCrisisRisk(text, persona);
        }
      }

      const validated = crisisRiskAssessmentSchema.safeParse(parsedJson);
      if (!validated.success) {
        console.warn('[xAI] Crisis analysis output failed strict schema validation:', validated.error.format());
        return this.mockFallback.analyzeCrisisRisk(text, persona);
      }

      return {
        ...validated.data,
        generationEngine: 'xai_live',
        assessedAt: new Date().toISOString(),
      };
    } catch (err: any) {
      if (err?.name === 'AbortError') {
        console.warn(`[xAI] Crisis analysis request timed out after ${timeoutMs}ms. Falling back to mock risk analyzer.`);
      } else {
        console.warn('[xAI] Error during live crisis analysis call, falling back to mock risk adapter:', err);
      }
      return this.mockFallback.analyzeCrisisRisk(text, persona);
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * Phase 2E1: Generate tone-matched reply options.
   * Completely mock-backed by default to guarantee zero-credential safety.
   */
  async generateReplyOptions(mention: MentionTriageItem, persona: PersonaConfig): Promise<ReplyOption[]> {
    return this.mockFallback.generateReplyOptions(mention, persona);
  }
}
