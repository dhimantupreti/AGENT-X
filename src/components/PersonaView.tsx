import React, { useState } from 'react';
import { Brain, ShieldCheck, History, Sliders, Tag, Sparkles, Compass, Lightbulb, PenTool } from 'lucide-react';
import { PersonaConfig, ResearchItem, ResearchCategory } from '@/core/types';
import { INITIAL_RESEARCH_ITEMS } from '@/lib/state/seedData';
import { IdeaIngestionEngine, RESEARCH_CATEGORIES } from '@/lib/research/ingestion';

interface PersonaViewProps {
  persona: PersonaConfig;
  onUpdatePersona: (newPersona: PersonaConfig) => void;
  onDraftFromResearch?: (item: ResearchItem) => void;
  researchItems?: ResearchItem[];
  onAddResearchItem?: (item: ResearchItem) => void;
  initialQuickNote?: { rawNoteInput: string; categoryOverride?: ResearchCategory };
  onQuickNoteChange?: (rawNoteInput: string, categoryOverride?: ResearchCategory) => void;
  onClearQuickNote?: () => void;
}

type SubSection = 'all' | 'persona' | 'strategy' | 'research';

export const PersonaView: React.FC<PersonaViewProps> = ({
  persona,
  onDraftFromResearch,
  researchItems = INITIAL_RESEARCH_ITEMS,
  onAddResearchItem,
  initialQuickNote,
  onQuickNoteChange,
  onClearQuickNote,
}) => {
  const [activeSub, setActiveSub] = useState<SubSection>('all');
  const [localItems, setLocalItems] = useState<ResearchItem[]>(researchItems);
  const [rawNoteInput, setRawNoteInput] = useState(initialQuickNote?.rawNoteInput || '');
  const [selectedCategoryOverride, setSelectedCategoryOverride] = useState<ResearchCategory | undefined>(
    initialQuickNote?.categoryOverride
  );
  const [isIngesting, setIsIngesting] = useState(false);
  const [ingestError, setIngestError] = useState<string | null>(null);

  // Sync if parent updates researchItems
  React.useEffect(() => {
    setLocalItems(researchItems);
  }, [researchItems]);

  // Sync when initialQuickNote hydrates on client
  React.useEffect(() => {
    if (initialQuickNote) {
      if (initialQuickNote.rawNoteInput && !rawNoteInput) {
        setRawNoteInput(initialQuickNote.rawNoteInput);
      }
      if (initialQuickNote.categoryOverride && !selectedCategoryOverride) {
        setSelectedCategoryOverride(initialQuickNote.categoryOverride);
      }
    }
  }, [initialQuickNote]);

  const handleNoteInputChange = (val: string) => {
    setRawNoteInput(val);
    onQuickNoteChange?.(val, selectedCategoryOverride);
  };

  const handleCategoryOverrideToggle = (cat: ResearchCategory) => {
    const nextCat = selectedCategoryOverride === cat ? undefined : cat;
    setSelectedCategoryOverride(nextCat);
    onQuickNoteChange?.(rawNoteInput, nextCat);
  };

  const handleClearNote = () => {
    setRawNoteInput('');
    setSelectedCategoryOverride(undefined);
    setIngestError(null);
    onClearQuickNote?.();
  };

  const handleIngestNote = async () => {
    const trimmed = rawNoteInput.trim();
    if (trimmed.length < 10) {
      setIngestError('Note must be at least 10 characters to extract meaningful angles.');
      return;
    }
    setIngestError(null);
    setIsIngesting(true);

    try {
      const refined = IdeaIngestionEngine.refineNote(trimmed, persona, selectedCategoryOverride);
      setLocalItems((prev) => [refined, ...prev]);
      onAddResearchItem?.(refined);
      setRawNoteInput('');
      setSelectedCategoryOverride(undefined);
      onClearQuickNote?.();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to refine note';
      setIngestError(msg);
    } finally {
      setIsIngesting(false);
    }
  };

  const handleCycleCategory = (itemId: string) => {
    setLocalItems((prev) =>
      prev.map((item) => {
        if (item.id !== itemId) return item;
        const currentIdx = RESEARCH_CATEGORIES.indexOf(item.category);
        const nextCategory = RESEARCH_CATEGORIES[(currentIdx + 1) % RESEARCH_CATEGORIES.length];
        return {
          ...item,
          category: nextCategory,
        };
      })
    );
  };

  return (
    <div className="space-y-4 pb-20">
      {/* Stage Filter Pills */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
        <button
          onClick={() => setActiveSub('all')}
          className={`rounded-xl px-3 py-1 text-xs font-semibold whitespace-nowrap transition-all ${
            activeSub === 'all'
              ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40'
              : 'bg-white/5 text-gray-400 hover:bg-white/10'
          }`}
        >
          All Stages (1, 2, 3)
        </button>
        <button
          onClick={() => setActiveSub('persona')}
          className={`rounded-xl px-3 py-1 text-xs font-semibold whitespace-nowrap transition-all ${
            activeSub === 'persona'
              ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40'
              : 'bg-white/5 text-gray-400 hover:bg-white/10'
          }`}
        >
          Stage 1: Persona
        </button>
        <button
          onClick={() => setActiveSub('strategy')}
          className={`rounded-xl px-3 py-1 text-xs font-semibold whitespace-nowrap transition-all ${
            activeSub === 'strategy'
              ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40'
              : 'bg-white/5 text-gray-400 hover:bg-white/10'
          }`}
        >
          Stage 2: Strategy
        </button>
        <button
          onClick={() => setActiveSub('research')}
          className={`rounded-xl px-3 py-1 text-xs font-semibold whitespace-nowrap transition-all ${
            activeSub === 'research'
              ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40'
              : 'bg-white/5 text-gray-400 hover:bg-white/10'
          }`}
        >
          Stage 3: Radar
        </button>
      </div>

      {/* Stage 1: Persona Profile & Tone */}
      {(activeSub === 'all' || activeSub === 'persona') && (
        <div className="glass-panel rounded-2xl p-4">
          <div className="flex items-center justify-between border-b border-white/5 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-500/20 text-purple-400">
                <Brain className="h-5 w-5" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-purple-400 bg-purple-500/10 px-1.5 py-0.5 rounded border border-purple-500/20">
                    Stage 1: Persona
                  </span>
                  <h2 className="text-sm font-bold text-white">Creator Persona & Voice Moat</h2>
                </div>
                <p className="text-[11px] text-gray-400 mt-0.5">Configured identity, tone, style tags, and brand safety bounds</p>
              </div>
            </div>
            <span className="rounded-full bg-cyan-500/10 px-2.5 py-1 text-xs font-bold text-cyan-300 border border-cyan-500/30">
              v{persona.version} Active
            </span>
          </div>

          <div className="mt-3 space-y-2 text-xs">
            <div className="flex justify-between py-1 border-b border-white/5">
              <span className="text-gray-400">X Handle</span>
              <span className="font-semibold text-white">@{persona.handle}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-white/5">
              <span className="text-gray-400">Niche</span>
              <span className="font-semibold text-white">{persona.niche}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-white/5">
              <span className="text-gray-400">Target Audience</span>
              <span className="font-semibold text-white text-right max-w-[200px] truncate">{persona.targetAudience}</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-gray-400">Primary Tone</span>
              <span className="capitalize font-semibold text-cyan-400">{persona.tone.primary}</span>
            </div>
          </div>

          {/* Style Tags */}
          <div className="mt-3">
            <div className="text-[11px] font-semibold text-gray-400 mb-1.5 flex items-center gap-1">
              <Tag className="h-3 w-3" />
              <span>Tone Qualifiers & Style Moats</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {persona.tone.styleTags.map((tag, idx) => (
                <span
                  key={idx}
                  className="rounded-lg bg-white/5 px-2 py-1 text-[10px] font-medium text-gray-300 border border-white/10"
                >
                  #{tag}
                </span>
              ))}
            </div>
          </div>

          {/* Brand Safety Forbidden Phrases */}
          <div className="mt-3 rounded-xl bg-red-950/20 border border-red-500/20 p-3">
            <div className="text-[11px] font-semibold text-red-300 mb-1 flex items-center gap-1">
              <ShieldCheck className="h-3 w-3 text-red-400" />
              <span>Forbidden Brand Words (Auto-Filtered by Compliance Sentinel)</span>
            </div>
            <div className="flex flex-wrap gap-1.5 mt-1.5">
              {persona.tone.forbiddenPhrases.map((phrase, idx) => (
                <span
                  key={idx}
                  className="rounded-md bg-red-500/10 px-2 py-0.5 text-[10px] font-mono text-red-300 border border-red-500/20"
                >
                  "{phrase}"
                </span>
              ))}
            </div>
          </div>

          {/* Safe Evolution Audit Trail */}
          <div className="mt-4 pt-3 border-t border-white/5">
            <div className="flex items-center gap-2 mb-2">
              <History className="h-3.5 w-3.5 text-purple-400" />
              <h4 className="text-xs font-bold text-white">Persona Version History</h4>
            </div>

            <div className="rounded-xl bg-purple-500/10 border border-purple-500/20 p-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white">v{persona.version} Baseline</span>
                <span className="text-[10px] text-gray-400" suppressHydrationWarning>
                  {new Date(persona.updatedAt).toLocaleDateString()}
                </span>
              </div>
              <p className="text-[11px] text-purple-200 mt-1">
                {persona.evolutionNotes || 'Baseline configuration'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Stage 2: Strategy & Content Pillars */}
      {(activeSub === 'all' || activeSub === 'strategy') && (
        <div className="glass-panel rounded-2xl p-4">
          <div className="flex items-center justify-between mb-3 border-b border-white/5 pb-3">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-500/20 text-blue-400">
                <Sliders className="h-4 w-4" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-blue-400 bg-blue-500/10 px-1.5 py-0.5 rounded border border-blue-500/20">
                    Stage 2: Strategy
                  </span>
                  <h3 className="text-xs font-bold text-white">Content Pillars Allocation</h3>
                </div>
                <p className="text-[10px] text-gray-400 mt-0.5">
                  Creator strategy • Governs autonomous drafting distribution
                </p>
              </div>
            </div>
            <span className="text-[10px] font-mono text-blue-300 bg-blue-500/10 px-2 py-0.5 rounded-full border border-blue-500/20">
              Total: 100%
            </span>
          </div>

          <div className="space-y-3">
            {persona.pillars.map((pillar) => (
              <div key={pillar.id} className="rounded-xl bg-black/20 p-3 border border-white/5">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-semibold text-white">{pillar.name}</span>
                  <span className="text-xs font-mono font-bold text-cyan-400">{pillar.weight}%</span>
                </div>
                <p className="text-[11px] text-gray-400 leading-snug mb-2">{pillar.description}</p>
                <div className="h-1.5 w-full rounded-full bg-white/10 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-cyan-400 to-blue-500 rounded-full"
                    style={{ width: `${pillar.weight}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Stage 3: Topic Radar & Discovery */}
      {(activeSub === 'all' || activeSub === 'research') && (
        <div className="glass-panel rounded-2xl p-4">
          <div className="flex items-center justify-between border-b border-white/5 pb-3 mb-3">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-cyan-500/20 text-cyan-400">
                <Compass className="h-4 w-4" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-400 bg-cyan-500/10 px-1.5 py-0.5 rounded border border-cyan-500/20">
                    Stage 3: Radar
                  </span>
                  <h3 className="text-xs font-bold text-white">Audience & Niche Intelligence</h3>
                </div>
                <p className="text-[10px] text-gray-400 mt-0.5">
                  Autonomous discovery • Solopreneur pain points & raw idea ingestion
                </p>
              </div>
            </div>
            <span className="text-[10px] font-mono text-cyan-300 bg-cyan-500/10 px-2 py-0.5 rounded-full border border-cyan-500/20">
              Auto-Researched
            </span>
          </div>

          {/* Quick Note Ingestion Bar (Phase 2F1) */}
          <div className="mb-3.5 rounded-xl bg-cyan-950/20 border border-cyan-500/30 p-3.5 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-bold text-cyan-300">
                <PenTool className="h-3.5 w-3.5 text-cyan-400" />
                <span>Quick Note / Raw Idea Ingestion</span>
              </div>
              <span className="text-[10px] text-cyan-400/80 font-mono">Stage 3 Ingestion</span>
            </div>

            <textarea
              value={rawNoteInput}
              onChange={(e) => handleNoteInputChange(e.target.value)}
              placeholder="Paste a rough observation, conversation, metric milestone, or contrarian thought..."
              rows={2}
              className="w-full rounded-xl bg-black/40 border border-white/10 p-2.5 text-xs text-gray-200 placeholder-gray-500 focus:border-cyan-500 focus:outline-none resize-none"
            />

            {/* Optional lightweight category correction pills */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-0.5">
              <div className="flex items-center gap-1 text-[10px]">
                <span className="text-gray-400 mr-1 text-[10px]">Category Override:</span>
                {RESEARCH_CATEGORIES.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => handleCategoryOverrideToggle(cat)}
                    className={`rounded-md px-1.5 py-0.5 text-[9px] font-semibold transition-all ${
                      selectedCategoryOverride === cat
                        ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/50'
                        : 'bg-white/5 text-gray-400 border border-white/5 hover:text-gray-200'
                    }`}
                  >
                    {cat === 'AUDIENCE_FRICTION' ? 'Friction' : cat === 'CASE_STUDY' ? 'Case Study' : 'Contrarian'}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-1.5">
                {rawNoteInput.length > 0 && (
                  <button
                    type="button"
                    onClick={handleClearNote}
                    className="rounded-lg bg-white/5 border border-white/10 px-2.5 py-1 text-xs font-semibold text-gray-400 hover:text-white hover:bg-white/10 transition-all"
                  >
                    Clear note
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleIngestNote}
                  disabled={isIngesting || rawNoteInput.trim().length < 10}
                  className="flex items-center gap-1 rounded-lg bg-gradient-to-r from-cyan-400 to-blue-500 px-3 py-1 text-xs font-bold text-black shadow-md shadow-cyan-500/20 hover:brightness-110 active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <Sparkles className="h-3 w-3" />
                  <span>{isIngesting ? 'Refining...' : 'Refine into Seed Angle'}</span>
                </button>
              </div>
            </div>
            {ingestError && (
              <p className="text-[10px] text-rose-400 font-medium">{ingestError}</p>
            )}
          </div>

          <div className="space-y-3">
            {localItems.map((item) => (
              <div
                key={item.id}
                className={`rounded-xl p-3.5 border space-y-2 transition-all ${
                  item.isUserCreated
                    ? 'bg-cyan-950/20 border-cyan-500/30'
                    : 'bg-black/20 border-white/5'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-cyan-300">
                    <Lightbulb className="h-3.5 w-3.5 text-cyan-400" />
                    <span>{item.topic}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {item.isUserCreated && (
                      <span className="rounded-md px-1.5 py-0.2 text-[8px] font-bold uppercase tracking-wider bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                        Creator Note
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => handleCycleCategory(item.id)}
                      title="Tap to cycle category"
                      className={`rounded-md px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider transition-all hover:scale-105 active:scale-95 ${
                        item.category === 'AUDIENCE_FRICTION'
                          ? 'bg-rose-500/10 text-rose-300 border border-rose-500/20 hover:bg-rose-500/20'
                          : item.category === 'CASE_STUDY'
                          ? 'bg-blue-500/10 text-blue-300 border border-blue-500/20 hover:bg-blue-500/20'
                          : 'bg-purple-500/10 text-purple-300 border border-purple-500/20 hover:bg-purple-500/20'
                      }`}
                    >
                      {item.category.replace('_', ' ')}
                    </button>
                  </div>
                </div>

                <p className="text-[11px] text-gray-300 leading-snug">{item.summary}</p>

                {item.audiencePainPoint && (
                  <div className="text-[10px] text-gray-400 flex items-center gap-1">
                    <span className="font-semibold text-gray-300">Pain Point:</span>
                    <span>{item.audiencePainPoint}</span>
                  </div>
                )}

                <div className="rounded-lg bg-white/[0.02] p-2 text-[11px] text-gray-300 border-l-2 border-cyan-400/40">
                  <span className="text-gray-400 text-[10px] block">Researched Hook Angle:</span>
                  "{item.seedAngle}"
                </div>

                <div className="flex items-center justify-between pt-1 border-t border-white/5">
                  <span className="text-[10px] text-gray-400">
                    Pillar: {persona.pillars.find((p) => p.id === item.pillarId)?.name || 'General'}
                  </span>
                  <button
                    onClick={() => onDraftFromResearch?.(item)}
                    className="flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-cyan-400 to-blue-500 px-2.5 py-1 text-xs font-bold text-black hover:brightness-110 active:scale-95 transition-all shadow-sm shadow-cyan-500/20"
                  >
                    <Sparkles className="h-3 w-3" />
                    <span>Draft from Research</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
