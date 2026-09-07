'use client';

import React, { useState, useEffect } from 'react';
import { X, Sparkles, Loader2, ListTree, MessageSquare, Check, ArrowLeft, Lightbulb, Zap } from 'lucide-react';
import { PersonaConfig, ContentPillar, ResearchItem, PostDraft, HookVariation, CrisisState } from '@/core/types';
import { AgentOrchestrator } from '@/lib/orchestration/workflow';

interface GenerateModalProps {
  isOpen: boolean;
  onClose: () => void;
  persona: PersonaConfig;
  crisisState: CrisisState;
  seedResearch?: ResearchItem | null;
  onClearSeed?: () => void;
  onCommitDraft: (draft: PostDraft) => void;
}

export const GenerateModal: React.FC<GenerateModalProps> = ({
  isOpen,
  onClose,
  persona,
  crisisState,
  seedResearch,
  onClearSeed,
  onCommitDraft,
}) => {
  const [selectedPillarId, setSelectedPillarId] = useState<string>(
    seedResearch?.pillarId || persona.pillars[0]?.id || ''
  );
  const [format, setFormat] = useState<'SINGLE_TWEET' | 'THREAD'>('SINGLE_TWEET');
  const [customAngle, setCustomAngle] = useState(seedResearch?.seedAngle || '');
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<'SETUP' | 'HOOK_SELECTION'>('SETUP');
  const [generatedDraft, setGeneratedDraft] = useState<PostDraft | null>(null);
  const [selectedHookId, setSelectedHookId] = useState<string>('');

  // Synchronize when seedResearch changes
  useEffect(() => {
    if (seedResearch) {
      setSelectedPillarId(seedResearch.pillarId);
      setCustomAngle(seedResearch.seedAngle);
    } else {
      setSelectedPillarId(persona.pillars[0]?.id || '');
      setCustomAngle('');
    }
    setStep('SETUP');
    setGeneratedDraft(null);
  }, [seedResearch, persona.pillars]);

  if (!isOpen) return null;

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch('/api/generate-draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          persona,
          crisisState,
          pillarId: selectedPillarId,
          options: {
            topic: customAngle.trim() || undefined,
            seedAngle: customAngle.trim() || undefined,
            format,
          },
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to generate draft');
      }

      if (data.draft) {
        const draft = data.draft as PostDraft;
        setGeneratedDraft(draft);
        const initialHookId = draft.selectedHookId || draft.hookVariations?.[0]?.id || '';
        setSelectedHookId(initialHookId);
        setStep('HOOK_SELECTION');
      }
    } catch (err: unknown) {
      console.error('Error generating draft:', err);
      alert(err instanceof Error ? err.message : 'Draft generation failed');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectHook = (hookId: string) => {
    setSelectedHookId(hookId);
  };

  const handleCommit = () => {
    if (!generatedDraft) return;

    // Apply the chosen hook to the draft before committing
    let finalDraft = generatedDraft;
    if (selectedHookId && selectedHookId !== generatedDraft.selectedHookId) {
      try {
        finalDraft = AgentOrchestrator.swapDraftHook(generatedDraft, selectedHookId, persona, crisisState);
      } catch (err) {
        console.error('Error swapping hook on commit:', err);
      }
    }

    onCommitDraft(finalDraft);
    setStep('SETUP');
    setGeneratedDraft(null);
  };

  const getArchetypeBadge = (archetype: string) => {
    switch (archetype) {
      case 'INVERSION':
        return {
          label: 'Contrarian Inversion',
          classes: 'bg-purple-500/10 text-purple-300 border-purple-500/30',
        };
      case 'HARD_DATA':
        return {
          label: 'Hard Data Metric',
          classes: 'bg-cyan-500/10 text-cyan-300 border-cyan-500/30',
        };
      case 'DIRECT_QUESTION':
        return {
          label: 'Direct Question',
          classes: 'bg-amber-500/10 text-amber-300 border-amber-500/30',
        };
      default:
        return {
          label: archetype,
          classes: 'bg-white/10 text-gray-300 border-white/20',
        };
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm p-0 sm:p-4">
      <div className="glass-panel w-full max-w-md max-h-[90vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl border border-white/10 p-5 bg-[#10121d] text-white animate-in slide-in-from-bottom-5 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-cyan-500/20 text-cyan-400">
              <Sparkles className="h-4 w-4" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-400 bg-cyan-500/10 px-1.5 py-0.5 rounded border border-cyan-500/20">
                  {step === 'SETUP' ? 'Stage 4: Autonomous Drafter' : 'Hook Lab: Archetype Selection'}
                </span>
                <h3 className="text-sm font-bold">
                  {step === 'SETUP' ? 'Autonomous Grok Drafter' : 'Pick Your Lead Hook'}
                </h3>
              </div>
              <p className="text-[10px] text-gray-400 mt-0.5">
                {step === 'SETUP'
                  ? 'Grok generates 3 hook variations for your review'
                  : 'Select your preferred angle before placing in Review Queue'}
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              setStep('SETUP');
              setGeneratedDraft(null);
              onClose();
            }}
            className="rounded-full p-1 text-gray-400 hover:bg-white/10 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* STEP 1: SETUP / GENERATION */}
        {step === 'SETUP' && (
          <form onSubmit={handleGenerate} className="mt-4 space-y-4">
            {/* Research Seed Alert if active */}
            {seedResearch && (
              <div className="rounded-xl bg-cyan-950/40 border border-cyan-500/30 p-2.5 flex items-start justify-between gap-2">
                <div className="flex items-start gap-2">
                  <Lightbulb className="h-4 w-4 text-cyan-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[9px] font-bold uppercase tracking-wider text-cyan-300 bg-cyan-500/20 px-1.5 py-0.2 rounded border border-cyan-500/30">
                        Seeded from Research
                      </span>
                      <span className="text-xs font-semibold text-white truncate max-w-[180px]">
                        {seedResearch.topic}
                      </span>
                    </div>
                    <p className="text-[10px] text-cyan-200/80 mt-0.5 line-clamp-1">
                      {seedResearch.audiencePainPoint || seedResearch.summary}
                    </p>
                  </div>
                </div>
                {onClearSeed && (
                  <button
                    type="button"
                    onClick={onClearSeed}
                    className="text-gray-400 hover:text-white p-1"
                    title="Clear research seed"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            )}

            {/* Pillar Selection */}
            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                Select Strategic Pillar
              </label>
              <div className="grid grid-cols-1 gap-2">
                {persona.pillars.map((pillar: ContentPillar) => (
                  <button
                    type="button"
                    key={pillar.id}
                    onClick={() => setSelectedPillarId(pillar.id)}
                    className={`flex items-start justify-between rounded-xl p-3 text-left transition-all border ${
                      selectedPillarId === pillar.id
                        ? 'border-cyan-400/50 bg-cyan-500/10 text-white'
                        : 'border-white/5 bg-white/[0.02] text-gray-400 hover:bg-white/5'
                    }`}
                  >
                    <div>
                      <div className="text-xs font-bold text-gray-200">{pillar.name}</div>
                      <div className="text-[11px] text-gray-400 mt-0.5 line-clamp-1">
                        {pillar.description}
                      </div>
                    </div>
                    <span className="rounded bg-white/10 px-1.5 py-0.5 text-[10px] font-mono text-cyan-300">
                      {pillar.weight}%
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Format Toggle */}
            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                Output Format
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setFormat('SINGLE_TWEET')}
                  className={`flex items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-semibold border ${
                    format === 'SINGLE_TWEET'
                      ? 'border-cyan-400/50 bg-cyan-500/15 text-cyan-300'
                      : 'border-white/5 bg-white/[0.02] text-gray-400 hover:bg-white/5'
                  }`}
                >
                  <MessageSquare className="h-3.5 w-3.5" />
                  <span>Single Tweet</span>
                </button>

                <button
                  type="button"
                  onClick={() => setFormat('THREAD')}
                  className={`flex items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-semibold border ${
                    format === 'THREAD'
                      ? 'border-cyan-400/50 bg-cyan-500/15 text-cyan-300'
                      : 'border-white/5 bg-white/[0.02] text-gray-400 hover:bg-white/5'
                  }`}
                >
                  <ListTree className="h-3.5 w-3.5" />
                  <span>Thread Blueprint</span>
                </button>
              </div>
            </div>

            {/* Custom Angle / Seed prompt */}
            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                Specific Angle, Data Point, or Lesson
              </label>
              <textarea
                rows={2}
                value={customAngle}
                onChange={(e) => setCustomAngle(e.target.value)}
                placeholder="e.g. How we decreased churn by 20% by doing onboarding calls..."
                className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-xs text-white placeholder-gray-500 focus:border-cyan-400 focus:outline-none"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-600 py-3 text-sm font-bold text-black shadow-lg shadow-cyan-500/20 hover:brightness-110 active:scale-95 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin text-black" />
                  <span>Synthesizing Multi-Hooks with Grok...</span>
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 text-black" />
                  <span>Generate Multi-Hook Draft</span>
                </>
              )}
            </button>
          </form>
        )}

        {/* STEP 2: CREATOR HOOK SELECTION */}
        {step === 'HOOK_SELECTION' && generatedDraft && (
          <div className="mt-4 space-y-4">
            <div className="rounded-xl bg-white/[0.02] border border-white/10 p-3">
              <div className="flex items-center justify-between text-xs text-gray-400 mb-2">
                <span>Generated Variations: 3 Archetypes</span>
                <span className="text-[10px] text-cyan-400 font-medium">Select 1 to lead</span>
              </div>

              {/* 3 Hook Variations List */}
              <div className="space-y-2.5">
                {generatedDraft.hookVariations?.map((h: HookVariation) => {
                  const badge = getArchetypeBadge(h.archetype);
                  const isSelected = selectedHookId === h.id;

                  return (
                    <div
                      key={h.id}
                      onClick={() => handleSelectHook(h.id)}
                      className={`cursor-pointer rounded-xl p-3 border transition-all ${
                        isSelected
                          ? 'border-cyan-400/80 bg-cyan-500/10 shadow-md shadow-cyan-500/10'
                          : 'border-white/10 bg-black/30 hover:border-white/20'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`rounded-md px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider border ${badge.classes}`}
                          >
                            {badge.label}
                          </span>
                          <span className="rounded bg-white/10 px-1.5 py-0.5 text-[10px] font-mono text-cyan-300">
                            Score: {h.score}/100
                          </span>
                        </div>
                        <div
                          className={`flex h-4 w-4 items-center justify-center rounded-full border ${
                            isSelected
                              ? 'border-cyan-400 bg-cyan-400 text-black'
                              : 'border-gray-500 bg-transparent'
                          }`}
                        >
                          {isSelected && <Check className="h-3 w-3 stroke-[3]" />}
                        </div>
                      </div>
                      <p className="text-xs text-gray-200 leading-relaxed font-sans">{h.hook}</p>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Thread Blueprint summary if format was thread */}
            {generatedDraft.thread && generatedDraft.thread.length > 0 && (
              <div className="rounded-xl bg-purple-950/20 border border-purple-500/30 p-2.5 text-[11px] text-purple-200">
                <div className="flex items-center gap-1.5 font-bold mb-1 text-purple-300">
                  <ListTree className="h-3.5 w-3.5" />
                  <span>Thread Blueprint Outline:</span>
                </div>
                <div className="space-y-1 pl-1 text-[10px] text-gray-300">
                  <div>• Tweet 1: Selected Hook & Contrarian Core Stance</div>
                  <div>• Tweets 2-{generatedDraft.thread.length}: Systematic Step-by-Step Evidence</div>
                  <div>• Tweet {generatedDraft.thread.length + 1}: Creator Action Call & Bookmark Prompt</div>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex items-center gap-2 pt-2 border-t border-white/10">
              <button
                type="button"
                onClick={() => setStep('SETUP')}
                className="flex items-center gap-1 rounded-xl px-3 py-2 text-xs font-semibold text-gray-400 hover:bg-white/10 hover:text-white transition-all"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                <span>Adjust</span>
              </button>

              <button
                type="button"
                onClick={handleCommit}
                className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-400 to-blue-500 py-2.5 text-xs font-bold text-black shadow-md shadow-cyan-500/20 hover:brightness-110 active:scale-95 transition-all"
              >
                <Zap className="h-3.5 w-3.5 text-black" />
                <span>Commit to Review Queue</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
