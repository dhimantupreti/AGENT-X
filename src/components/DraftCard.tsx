'use client';

import React, { useState } from 'react';
import {
  ShieldCheck,
  ShieldAlert,
  CheckCircle2,
  Send,
  Trash2,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Clock,
  Layers,
  AlertTriangle,
  Check,
} from 'lucide-react';
import { PostDraft, PersonaConfig, CrisisState, HookVariation } from '@/core/types';

interface DraftCardProps {
  draft: PostDraft;
  persona: PersonaConfig;
  crisisState: CrisisState;
  onApprove: (id: string) => void;
  onPublish: (draft: PostDraft) => void;
  onReject: (id: string) => void;
  onSwapHook?: (draftId: string, newHookId: string) => void;
  isFocused?: boolean;
  onFocus?: (draftId: string) => void;
  onUnfocus?: (draftId: string) => void;
}

export const DraftCard: React.FC<DraftCardProps> = ({
  draft,
  persona,
  crisisState,
  onApprove,
  onPublish,
  onReject,
  onSwapHook,
  isFocused = false,
  onFocus,
  onUnfocus,
}) => {
  const [threadExpanded, setThreadExpanded] = useState(false);
  const [hooksExpanded, setHooksExpanded] = useState(isFocused);
  const [riskDrawerOpen, setRiskDrawerOpen] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);

  // Sync hooksExpanded if focused status changes
  React.useEffect(() => {
    if (isFocused) {
      setHooksExpanded(true);
    } else {
      setHooksExpanded(false);
    }
  }, [isFocused]);

  const charCount = draft.content.length;
  const isOverLimit = charCount > 280;
  const compliance = draft.complianceReport;
  const aiRisk = draft.aiRiskAssessment || compliance?.aiRiskAssessment;

  const handlePublishClick = async () => {
    setIsPublishing(true);
    try {
      await onPublish(draft);
    } finally {
      setIsPublishing(false);
    }
  };

  const getArchetypeLabel = (archetype?: string) => {
    switch (archetype) {
      case 'INVERSION':
        return 'Contrarian Inversion';
      case 'HARD_DATA':
        return 'Hard Data Metric';
      case 'DIRECT_QUESTION':
        return 'Direct Question';
      default:
        return archetype || 'Standard';
    }
  };

  const isApproved = draft.status === 'APPROVED';
  const isPublished = draft.status === 'PUBLISHED';

  return (
    <div
      onClick={() => {
        if (isFocused) {
          onUnfocus?.(draft.id);
        } else {
          onFocus?.(draft.id);
        }
      }}
      id={`draft-${draft.id}`}
      className={`glass-panel relative flex flex-col rounded-2xl p-4 transition-all duration-200 hover:border-white/20 cursor-pointer ${
        isFocused ? 'ring-2 ring-cyan-400/60 bg-cyan-950/15 border-cyan-500/40 shadow-lg shadow-cyan-950/40' : ''
      }`}
    >
      {/* Pillar & Workflow Stage Bar */}
      <div className="mb-3 flex items-center justify-between border-b border-white/5 pb-2.5">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="rounded-md bg-white/5 px-2 py-0.5 text-[11px] font-medium text-gray-300">
            {persona.pillars.find((p) => p.id === draft.pillarId)?.name || 'General Pillar'}
          </span>
          {isFocused && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onUnfocus?.(draft.id);
              }}
              className="rounded-md bg-cyan-500/20 px-1.5 py-0.5 text-[10px] font-bold text-cyan-300 border border-cyan-500/40 flex items-center gap-1 hover:bg-cyan-500/30 transition-all"
              title="Click to unfocus draft"
            >
              <span>⚡ Focused</span>
              <span className="text-[9px] font-normal text-cyan-400 underline ml-0.5">Unfocus draft</span>
            </button>
          )}
          {draft.generationEngine === 'xai_live' ? (
            <span className="rounded-md bg-indigo-500/15 px-2 py-0.5 text-[10px] font-bold text-indigo-300 border border-indigo-500/30 flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-indigo-400 animate-pulse" />
              Grok Live {draft.generatorModel ? `(${draft.generatorModel})` : ''}
            </span>
          ) : (
            <span className="rounded-md bg-zinc-500/15 px-2 py-0.5 text-[10px] font-bold text-zinc-400 border border-zinc-500/30">
              Grok Mock
            </span>
          )}
          {isApproved ? (
            <span className="rounded-md bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold text-emerald-300 border border-emerald-500/30">
              Posting: Approved
            </span>
          ) : isPublished ? (
            <span className="rounded-md bg-blue-500/15 px-2 py-0.5 text-[10px] font-bold text-blue-300 border border-blue-500/30">
              Posting: Published
            </span>
          ) : (
            <span className="rounded-md bg-amber-500/15 px-2 py-0.5 text-[10px] font-bold text-amber-300 border border-amber-500/30">
              Posting: Requires Approval
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          {/* Estimated Hook Score & Archetype */}
          {draft.estimatedHookScore && (
            <div className="flex items-center gap-1 rounded-md bg-cyan-500/10 px-2 py-0.5 text-[10px] font-semibold text-cyan-300 border border-cyan-500/20">
              <Sparkles className="h-3 w-3" />
              <span>
                {draft.selectedHookArchetype ? getArchetypeLabel(draft.selectedHookArchetype) : 'Hook'}:{' '}
                {draft.estimatedHookScore}/100
              </span>
            </div>
          )}

          {/* Compliance Badge */}
          {compliance && (
            <div
              className={`flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-semibold border ${
                compliance.passed
                  ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20'
                  : 'bg-red-500/10 text-red-300 border-red-500/20'
              }`}
            >
              {compliance.passed ? (
                <ShieldCheck className="h-3 w-3 text-emerald-400" />
              ) : (
                <ShieldAlert className="h-3 w-3 text-red-400" />
              )}
              <span>Compliance: {compliance.score}%</span>
            </div>
          )}

          {/* Compact Mobile AI Risk Pill */}
          {aiRisk && (
            <button
              type="button"
              onClick={() => setRiskDrawerOpen(!riskDrawerOpen)}
              className={`flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-semibold border transition-all cursor-pointer ${
                aiRisk.riskScore >= 70
                  ? 'bg-red-500/10 text-red-300 border-red-500/20 hover:bg-red-500/20'
                  : aiRisk.riskScore >= 30
                  ? 'bg-amber-500/10 text-amber-300 border-amber-500/20 hover:bg-amber-500/20'
                  : 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20 hover:bg-emerald-500/20'
              }`}
              title="Click to view 4-dimension brand safety breakdown"
            >
              <ShieldAlert className="h-3 w-3" />
              <span>AI Risk: {aiRisk.riskScore}%</span>
              <ChevronDown className={`h-2.5 w-2.5 transition-transform duration-200 ${riskDrawerOpen ? 'rotate-180' : ''}`} />
            </button>
          )}
        </div>
      </div>

      {/* Collapsible Mobile AI Risk Breakdown Drawer */}
      {riskDrawerOpen && aiRisk && (
        <div className="mb-3 rounded-xl border border-white/10 bg-black/40 p-3 text-xs space-y-2.5 transition-all animate-in fade-in duration-200">
          <div className="flex items-center justify-between border-b border-white/5 pb-2">
            <div className="flex items-center gap-1.5">
              <ShieldCheck className="h-3.5 w-3.5 text-indigo-400" />
              <span className="font-semibold text-white">AI Brand Safety Sentinel</span>
            </div>
            <span className="text-[10px] text-gray-400">
              Engine: {aiRisk.generationEngine === 'xai_live' ? 'Live xAI' : 'Mock Sentinel'}
            </span>
          </div>

          {/* 4-Dimension Grid */}
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-lg bg-white/[0.02] border border-white/5 p-2 flex flex-col justify-between">
              <span className="text-[10px] text-gray-400">Brand Liability</span>
              <span className={`text-[11px] font-bold mt-0.5 ${
                aiRisk.brandLiability === 'HIGH'
                  ? 'text-red-400'
                  : aiRisk.brandLiability === 'MEDIUM'
                  ? 'text-amber-400'
                  : 'text-emerald-400'
              }`}>
                {aiRisk.brandLiability}
              </span>
            </div>

            <div className="rounded-lg bg-white/[0.02] border border-white/5 p-2 flex flex-col justify-between">
              <span className="text-[10px] text-gray-400">Tone Toxicity</span>
              <span className={`text-[11px] font-bold mt-0.5 ${
                aiRisk.toneToxicity === 'HIGH'
                  ? 'text-red-400'
                  : aiRisk.toneToxicity === 'MEDIUM'
                  ? 'text-amber-400'
                  : 'text-emerald-400'
              }`}>
                {aiRisk.toneToxicity}
              </span>
            </div>

            <div className="rounded-lg bg-white/[0.02] border border-white/5 p-2 flex flex-col justify-between">
              <span className="text-[10px] text-gray-400">Sarcasm & Ambiguity</span>
              <span className={`text-[11px] font-bold mt-0.5 ${
                aiRisk.sarcasmAmbiguityRisk === 'HIGH'
                  ? 'text-red-400'
                  : aiRisk.sarcasmAmbiguityRisk === 'MEDIUM'
                  ? 'text-amber-400'
                  : 'text-emerald-400'
              }`}>
                {aiRisk.sarcasmAmbiguityRisk}
              </span>
            </div>

            <div className="rounded-lg bg-white/[0.02] border border-white/5 p-2 flex flex-col justify-between">
              <span className="text-[10px] text-gray-400">Escalation Status</span>
              <span className={`text-[11px] font-bold mt-0.5 ${
                aiRisk.escalationRequired ? 'text-red-400' : 'text-emerald-400'
              }`}>
                {aiRisk.escalationRequired ? 'ACTION REQUIRED' : 'CLEAR'}
              </span>
            </div>
          </div>

          {/* Analysis Reason & Actionable Guidance */}
          <div className="space-y-1 pt-1 border-t border-white/5 text-[11px]">
            <p className="text-gray-300">
              <strong className="text-gray-400">Analysis:</strong> {aiRisk.reason}
            </p>
            {aiRisk.recommendation && (
              <p className="text-indigo-300">
                <strong className="text-indigo-400">Guidance:</strong> {aiRisk.recommendation}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Tweet Body Preview */}
      <div className="flex gap-3">
        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 text-sm font-bold text-white shadow-inner">
          {persona.displayName[0]}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 leading-none mb-1">
            <span className="text-sm font-bold text-white truncate">{persona.displayName}</span>
            <span className="text-xs text-gray-400">@{persona.handle}</span>
            {draft.thread && draft.thread.length > 0 && (
              <span className="ml-auto text-[9px] font-semibold uppercase tracking-wider text-purple-300 bg-purple-500/10 px-1.5 py-0.2 rounded border border-purple-500/20">
                Tweet 1: Lead Hook
              </span>
            )}
          </div>

          <p className="whitespace-pre-wrap text-sm leading-relaxed text-gray-200 font-sans">
            {draft.content}
          </p>

          {/* Multi-Hook Swapping Section (Phase 2A Guardrail-Enforced) */}
          {draft.hookVariations && draft.hookVariations.length > 1 && !isPublished && (
            <div className="mt-3 rounded-xl bg-black/30 border border-white/10 p-2.5">
              <button
                type="button"
                onClick={() => setHooksExpanded(!hooksExpanded)}
                className="flex w-full items-center justify-between text-xs font-semibold text-cyan-400 hover:text-cyan-300"
              >
                <div className="flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5" />
                  <span>Hook Variations ({draft.hookVariations.length} Archetypes)</span>
                </div>
                {hooksExpanded ? (
                  <ChevronUp className="h-3.5 w-3.5" />
                ) : (
                  <ChevronDown className="h-3.5 w-3.5" />
                )}
              </button>

              {hooksExpanded && (
                <div className="mt-2 space-y-2 border-t border-white/5 pt-2">
                  {isApproved && (
                    <div className="rounded-lg bg-amber-500/10 border border-amber-500/30 p-2 text-[11px] text-amber-200 flex items-start gap-1.5">
                      <AlertTriangle className="h-3.5 w-3.5 text-amber-400 flex-shrink-0 mt-0.5" />
                      <span>
                        <strong>Guardrail Active:</strong> Swapping hooks will immediately reset creator approval
                        and trigger compliance revalidation before publishing.
                      </span>
                    </div>
                  )}

                  <div className="space-y-1.5">
                    {draft.hookVariations.map((h: HookVariation) => {
                      const isSelected = draft.selectedHookId === h.id;
                      return (
                        <div
                          key={h.id}
                          onClick={() => {
                            if (!isSelected && onSwapHook) {
                              onSwapHook(draft.id, h.id);
                            }
                          }}
                          className={`rounded-lg p-2 text-xs border transition-all ${
                            isSelected
                              ? 'border-cyan-400/80 bg-cyan-500/15 text-white'
                              : 'border-white/5 bg-white/[0.02] text-gray-300 hover:bg-white/5 cursor-pointer'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center gap-1.5">
                              <span className="font-semibold text-cyan-300 text-[10px]">
                                {getArchetypeLabel(h.archetype)}
                              </span>
                              <span className="text-[10px] text-gray-400">Score: {h.score}/100</span>
                            </div>
                            {isSelected ? (
                              <span className="flex items-center gap-1 text-[10px] font-bold text-cyan-300">
                                <Check className="h-3 w-3 stroke-[3]" />
                                Active
                              </span>
                            ) : (
                              <span className="text-[10px] text-gray-400 hover:text-white underline">
                                Switch Hook
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] leading-snug line-clamp-2 text-gray-200">{h.hook}</p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Thread Blueprint & Toggle */}
          {draft.thread && draft.thread.length > 0 && (
            <div className="mt-2.5">
              <button
                onClick={() => setThreadExpanded(!threadExpanded)}
                className="flex items-center gap-1 text-xs font-semibold text-purple-400 hover:text-purple-300"
              >
                <Layers className="h-3.5 w-3.5" />
                <span>Thread Blueprint ({draft.thread.length} more tweets)</span>
                {threadExpanded ? (
                  <ChevronUp className="h-3.5 w-3.5" />
                ) : (
                  <ChevronDown className="h-3.5 w-3.5" />
                )}
              </button>

              {threadExpanded && (
                <div className="mt-2 space-y-2 border-l-2 border-purple-500/30 pl-3">
                  {draft.thread.map((t, idx) => {
                    const isLast = idx === (draft.thread?.length || 0) - 1;
                    const stageLabel = isLast
                      ? 'Action Call & Bookmark'
                      : `Core Step ${idx + 1}`;

                    return (
                      <div
                        key={idx}
                        className="rounded-lg bg-black/30 p-2.5 text-xs leading-relaxed text-gray-300 border border-white/5"
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-semibold text-purple-300">Tweet {idx + 2}</span>
                          <span className="rounded bg-purple-500/10 px-1.5 py-0.2 text-[9px] font-semibold text-purple-300 border border-purple-500/20">
                            {stageLabel}
                          </span>
                        </div>
                        <p className="whitespace-pre-wrap">{t}</p>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Character limit & schedule metadata */}
          <div className="mt-3 flex items-center justify-between text-[11px] text-gray-400">
            <div className="flex items-center gap-1">
              <Clock className="h-3 w-3 text-gray-400" />
              <span>{draft.suggestedScheduleTime || 'Slot: Morning Peak'}</span>
            </div>
            <span className={`font-mono ${isOverLimit ? 'text-red-400 font-bold' : 'text-gray-400'}`}>
              {charCount}/280
            </span>
          </div>

          {/* Compliance Violations Warning if any */}
          {compliance && !compliance.passed && (
            <div className="mt-3 rounded-lg bg-red-950/40 border border-red-500/30 p-2 text-xs text-red-200">
              <div className="font-semibold mb-1 flex items-center gap-1">
                <ShieldAlert className="h-3.5 w-3.5 text-red-400" />
                <span>Policy Violation Detected:</span>
              </div>
              <ul className="list-disc pl-4 space-y-0.5">
                {compliance.violations.map((v, i) => (
                  <li key={i}>{v.message}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>

      {/* Action Buttons & Approval Gate */}
      <div className="mt-4 flex items-center justify-between gap-2 border-t border-white/5 pt-3">
        <button
          onClick={() => onReject(draft.id)}
          className="flex items-center gap-1 rounded-xl px-2.5 py-1.5 text-xs font-medium text-gray-400 hover:bg-white/5 hover:text-red-400 transition-colors"
        >
          <Trash2 className="h-3.5 w-3.5" />
          <span>Dismiss</span>
        </button>

        <div className="flex items-center gap-2">
          {!isApproved && !isPublished && (
            <button
              onClick={() => onApprove(draft.id)}
              disabled={crisisState.isFrozen || (compliance && !compliance.passed)}
              className="flex items-center gap-1.5 rounded-xl bg-emerald-500/20 border border-emerald-500/30 px-3 py-1.5 text-xs font-bold text-emerald-300 hover:bg-emerald-500/30 transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
              <span>Approve Draft</span>
            </button>
          )}

          {isApproved && (
            <div className="flex items-center gap-2">
              <span className="flex items-center gap-1 rounded-lg bg-emerald-500/10 px-2 py-1 text-[10px] font-semibold text-emerald-300 border border-emerald-500/20">
                <CheckCircle2 className="h-3 w-3 text-emerald-400" />
                <span>Approved by Creator</span>
              </span>

              <button
                onClick={handlePublishClick}
                disabled={isPublishing || crisisState.isFrozen || (compliance && !compliance.passed)}
                className={`flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-semibold text-black transition-all ${
                  crisisState.isFrozen || (compliance && !compliance.passed)
                    ? 'bg-gray-600 text-gray-400 cursor-not-allowed opacity-50'
                    : 'bg-gradient-to-r from-cyan-400 to-blue-500 hover:brightness-110 shadow-sm shadow-cyan-500/20 active:scale-95'
                }`}
              >
                <Send className="h-3.5 w-3.5" />
                <span>{isPublishing ? 'Publishing...' : 'Publish to X'}</span>
              </button>
            </div>
          )}

          {isPublished && (
            <span className="rounded-lg bg-blue-500/10 px-2.5 py-1 text-xs font-semibold text-blue-300 border border-blue-500/20">
              Published on X
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
