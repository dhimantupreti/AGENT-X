import { IXAIClientAdapter, GenerateDraftRequest } from './interface';
import { DraftGenerationResponse, draftGenerationResponseSchema } from '@/core/schemas';
import { MockXAIClientAdapter } from './mock';
import { getAppConfig } from '@/lib/config';

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
3. Output MUST be valid JSON matching the following schema:
{
  "primaryTweet": "string (<= 280 chars)",
  "threadTweets": ["string", "string"],
  "hashtags": ["tag1", "tag2"],
  "hookScore": number (0-100),
  "strategicRationale": "string",
  "suggestedScheduleSlot": "MORNING_PRIME" | "AFTERNOON_PEAK" | "EVENING_INSIGHT"
}`;

    const userPrompt = `Generate a ${request.format === 'THREAD' ? 'thread (3-5 tweets)' : 'single tweet'} about: ${
      request.topic || request.pillar.sampleHooks[0] || 'A hard-learned lesson from building solo'
    }. Return ONLY the JSON object.`;

    try {
      const response = await fetch(`${config.XAI_BASE_URL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${config.XAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: config.XAI_MODEL,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
          temperature: 0.7,
          response_format: { type: 'json_object' },
        }),
      });

      if (!response.ok) {
        console.warn(`x.ai API returned status ${response.status}. Using mock fallback.`);
        return this.mockFallback.generateDraft(request);
      }

      const data = await response.json();
      const rawContent = data.choices?.[0]?.message?.content;
      if (!rawContent) {
        return this.mockFallback.generateDraft(request);
      }

      const parsedJson = JSON.parse(rawContent);
      return draftGenerationResponseSchema.parse(parsedJson);
    } catch (err) {
      console.warn('Error during x.ai generation call, falling back to mock adapter:', err);
      return this.mockFallback.generateDraft(request);
    }
  }

  async analyzeCrisisRisk(text: string): Promise<{ riskScore: number; reason: string; recommendation: string }> {
    return this.mockFallback.analyzeCrisisRisk(text);
  }
}
