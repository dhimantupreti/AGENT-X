import { PersonaConfig, EvolutionSignal } from '@/core/types';
import { personaConfigSchema } from '@/core/schemas';

export interface PersonaVersionRecord {
  version: number;
  config: PersonaConfig;
  signalId?: string;
  evolutionSummary: string;
  proposalSnapshot?: EvolutionSignal; // Audit snapshot rule: exact proposal payload & evidence snapshot
  timestamp: string;
}

export class SafeEvolutionManager {
  private versionHistory: Map<string, PersonaVersionRecord[]> = new Map();

  /**
   * Initialize history for a persona
   */
  public registerInitialPersona(persona: PersonaConfig): void {
    const list = this.versionHistory.get(persona.id) || [];
    if (list.length === 0) {
      list.push({
        version: persona.version,
        config: JSON.parse(JSON.stringify(persona)),
        evolutionSummary: 'Initial Baseline Persona',
        timestamp: persona.createdAt,
      });
      this.versionHistory.set(persona.id, list);
    }
  }

  /**
   * Apply a validated evolution signal to produce a safe new persona version
   */
  public applyEvolutionSignal(
    currentPersona: PersonaConfig,
    signal: EvolutionSignal
  ): { success: boolean; newPersona?: PersonaConfig; error?: string } {
    try {
      // Deep clone current persona
      const next: PersonaConfig = JSON.parse(JSON.stringify(currentPersona));
      next.version = currentPersona.version + 1;
      next.updatedAt = new Date().toISOString();

      const { field, proposedValue, rationale } = signal.proposedAdjustment;

      if (field === 'forbiddenPhrases') {
        const additions = Array.isArray(proposedValue) ? proposedValue : [proposedValue];
        next.tone.forbiddenPhrases = Array.from(
          new Set([...next.tone.forbiddenPhrases, ...additions])
        );
      } else if (field === 'tone') {
        const styleAdditions = Array.isArray(proposedValue) ? proposedValue : [proposedValue];
        next.tone.styleTags = Array.from(
          new Set([...next.tone.styleTags, ...styleAdditions])
        );
      } else if (field === 'pillars') {
        // Safe adjustment to pillar weights
        if (Array.isArray(proposedValue)) {
          for (const item of proposedValue) {
            if (typeof item === 'object' && item !== null && 'id' in item && 'weight' in item) {
              const target = next.pillars.find((p) => p.id === (item as { id: string; weight: number }).id);
              if (target) target.weight = Number((item as { id: string; weight: number }).weight);
            } else if (typeof item === 'string') {
              // Parse string format: "Pillar Name: 40%" or "pillar_id: 40%"
              const match = item.match(/^(.*?):\s*(\d+)%?$/);
              if (match) {
                const identifier = match[1].trim();
                const weight = parseInt(match[2], 10);
                const target = next.pillars.find(
                  (p) => p.name.toLowerCase() === identifier.toLowerCase() || p.id === identifier
                );
                if (target) target.weight = weight;
              }
            }
          }
          const totalWeight = next.pillars.reduce((sum, p) => sum + p.weight, 0);
          if (totalWeight !== 100) {
            throw new Error(`Pillar weights must sum strictly to 100% (currently ${totalWeight}%)`);
          }
        }
        next.evolutionNotes = `Evolution v${next.version}: Pillar weights updated via signal ${signal.type}. Rationale: ${rationale}`;
      }

      signal.approvedBy = 'CREATOR';
      signal.approvedAt = next.updatedAt;
      next.evolutionNotes = `Evolved to v${next.version} via Creator-Approved [${signal.type}]: ${rationale}`;

      // Enforce strict schema validation before committing change
      const validated = personaConfigSchema.parse(next);

      // Append to immutable history with exact proposal payload & evidence snapshot
      const list = this.versionHistory.get(currentPersona.id) || [];
      list.push({
        version: validated.version,
        config: validated,
        signalId: signal.id,
        evolutionSummary: next.evolutionNotes,
        proposalSnapshot: JSON.parse(JSON.stringify(signal)),
        timestamp: next.updatedAt,
      });
      this.versionHistory.set(currentPersona.id, list);

      return { success: true, newPersona: validated };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      return { success: false, error: `Safe evolution rejected by schema validator: ${message}` };
    }
  }

  /**
   * Safe rollback to any previous version
   */
  public rollbackToVersion(personaId: string, targetVersion: number): PersonaConfig | null {
    const history = this.versionHistory.get(personaId);
    if (!history) return null;

    const match = history.find((record) => record.version === targetVersion);
    if (!match) return null;

    return JSON.parse(JSON.stringify(match.config));
  }

  /**
   * Retrieve full audit history
   */
  public getHistory(personaId: string): PersonaVersionRecord[] {
    return this.versionHistory.get(personaId) || [];
  }
}
