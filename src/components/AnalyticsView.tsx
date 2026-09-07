'use client';

import React, { useState, useEffect } from 'react';
import {
  BarChart3,
  Bookmark,
  Eye,
  TrendingUp,
  Sparkles,
  ArrowUpRight,
  Database,
  Shield,
  UserCheck,
  Layers,
  Sliders,
  Sparkle,
  Trash2,
  Plus,
  Compass,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import {
  PersonaConfig,
  EvolutionSignal,
  AnalyticsOverview,
  HookArchetypeROI,
  PillarBalanceMetric,
  DraftLifecycleEvent,
  PostDraft,
} from '@/core/types';
import { INITIAL_ANALYTICS_OVERVIEW, INITIAL_EVOLUTION_SIGNALS } from '@/lib/state/seedData';
import { EvolutionSignalSynthesizer } from '@/lib/evolution/synthesizer';

interface AnalyticsViewProps {
  persona: PersonaConfig;
  onPersonaEvolved: (newPersona: PersonaConfig) => void;
  analytics?: AnalyticsOverview;
  lifecycleEvents?: DraftLifecycleEvent[];
  drafts?: PostDraft[];
}

export const AnalyticsView: React.FC<AnalyticsViewProps> = ({
  persona,
  onPersonaEvolved,
  analytics = INITIAL_ANALYTICS_OVERVIEW,
  lifecycleEvents = [],
  drafts = [],
}) => {
  const [applyingSignalId, setApplyingSignalId] = useState<string | null>(null);
  const [activeAnalytics, setActiveAnalytics] = useState<AnalyticsOverview>(analytics);
  const [dismissedSignalIds, setDismissedSignalIds] = useState<string[]>([]);
  const [appliedSignalIds, setAppliedSignalIds] = useState<string[]>([]);

  useEffect(() => {
    setActiveAnalytics(analytics);
  }, [analytics]);

  useEffect(() => {
    let isMounted = true;
    async function fetchFreshAnalytics() {
      try {
        const res = await fetch(`/api/analytics?handle=${encodeURIComponent(persona.handle)}`);
        if (res.ok) {
          const json = await res.json();
          if (isMounted && json.analytics) {
            setActiveAnalytics(json.analytics);
          }
        }
      } catch {
        // Silently fall back to existing data
      }
    }
    fetchFreshAnalytics();
    return () => {
      isMounted = false;
    };
  }, [persona.handle]);

  // Phase 2B2B: Dynamically synthesize candidate signals from in-session lifecycle events
  const dynamicSignals = React.useMemo(() => {
    if (!lifecycleEvents || lifecycleEvents.length === 0) {
      return INITIAL_EVOLUTION_SIGNALS;
    }
    const synthesized = EvolutionSignalSynthesizer.synthesize({
      persona,
      lifecycleEvents,
      drafts,
      analyticsOverview: activeAnalytics,
    });
    return synthesized.length > 0 ? synthesized : INITIAL_EVOLUTION_SIGNALS;
  }, [persona, lifecycleEvents, drafts, activeAnalytics]);

  const handleDismissSignal = (signalId: string) => {
    // Non-destructive to persona state: hides the proposal from the active session queue
    setDismissedSignalIds((prev) => [...prev, signalId]);
  };

  const handleApplySignal = async (signal: EvolutionSignal) => {
    setApplyingSignalId(signal.id);
    try {
      const res = await fetch('/api/evolution/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ persona, signal }),
      });

      const data = await res.json();
      if (data.success && data.newPersona) {
        onPersonaEvolved(data.newPersona);
        setAppliedSignalIds((prev) => [...prev, signal.id]);
      }
    } finally {
      setApplyingSignalId(null);
    }
  };

  const getArchetypeLabel = (archetype: string) => {
    switch (archetype) {
      case 'INVERSION':
        return 'Contrarian Inversion';
      case 'HARD_DATA':
        return 'Hard Data Metric';
      case 'DIRECT_QUESTION':
        return 'Direct Question';
      default:
        return archetype;
    }
  };

  // Filter out dismissed signals and track applied state
  const activeSignals = dynamicSignals
    .filter((s) => !dismissedSignalIds.includes(s.id))
    .map((s) => (appliedSignalIds.includes(s.id) ? { ...s, status: 'APPLIED' as const, approvedBy: 'CREATOR' } : s));

  // Strictly enforce active proposals cap of maximum 2 visible cards at mobile UI layer
  const visibleSignals = activeSignals.slice(0, 2);

  return (
    <div className="space-y-4 pb-20">
      {/* Workflow Stage 7: Performance Telemetry (Read-Only) */}
      <div className="glass-panel rounded-2xl p-4 space-y-4">
        {/* Header Bar */}
        <div className="flex items-center justify-between border-b border-white/5 pb-3">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-500/20 text-blue-400">
              <BarChart3 className="h-4 w-4" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-blue-400 bg-blue-500/10 px-1.5 py-0.5 rounded border border-blue-500/20">
                  Stage 7: Telemetry
                </span>
                <h2 className="text-xs font-bold text-white">BigQuery Performance Telemetry</h2>
              </div>
              <p className="text-[10px] text-gray-400 mt-0.5">
                {activeAnalytics.period} • Modeled via Google Cloud Data Agent Kit
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            {activeAnalytics.telemetryEngine === 'bigquery_live' ? (
              <span className="flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-mono text-emerald-400 border border-emerald-500/20">
                <Database className="h-3 w-3 text-emerald-400" />
                <span>BigQuery: Live (ADC)</span>
              </span>
            ) : (
              <span className="flex items-center gap-1 rounded-full bg-zinc-500/10 px-2 py-0.5 text-[10px] font-mono text-zinc-400 border border-zinc-500/20">
                <Database className="h-3 w-3 text-zinc-400" />
                <span>BigQuery: Mock Fixtures</span>
              </span>
            )}
            <span className="flex items-center gap-1 rounded-full bg-blue-500/10 px-2 py-0.5 text-[10px] font-mono text-blue-300 border border-blue-500/20">
              <Layers className="h-3 w-3 text-blue-400" />
              <span>Partitioned Views</span>
            </span>
          </div>
        </div>

        {/* 4 Core Summary Metric Tiles */}
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl bg-black/20 p-3 border border-white/5">
            <div className="flex items-center justify-between text-gray-400 mb-1">
              <span className="text-xs font-medium">Solopreneur Intent</span>
              <ArrowUpRight className="h-3.5 w-3.5 text-cyan-400" />
            </div>
            <div className="text-2xl font-black text-white">
              {activeAnalytics.overallIntentScore !== null ? `${activeAnalytics.overallIntentScore}%` : 'N/A'}
            </div>
            <p className="text-[10px] text-emerald-400 mt-1 flex items-center gap-1 font-semibold">
              <TrendingUp className="h-3 w-3" /> +2.3% vs peer average
            </p>
          </div>

          <div className="rounded-xl bg-black/20 p-3 border border-white/5">
            <div className="flex items-center justify-between text-gray-400 mb-1">
              <span className="text-xs font-medium">Total Bookmarks</span>
              <Bookmark className="h-3.5 w-3.5 text-purple-400" />
            </div>
            <div className="text-2xl font-black text-white">
              {activeAnalytics.totalBookmarks.toLocaleString()}
            </div>
            <p className="text-[10px] text-gray-400 mt-1">High retention conversion</p>
          </div>

          <div className="rounded-xl bg-black/20 p-3 border border-white/5">
            <div className="flex items-center justify-between text-gray-400 mb-1">
              <span className="text-xs font-medium">Impressions</span>
              <Eye className="h-3.5 w-3.5 text-blue-400" />
            </div>
            <div className="text-2xl font-black text-white">
              {(activeAnalytics.totalImpressions / 1000).toFixed(1)}k
            </div>
            <p className="text-[10px] text-emerald-400 mt-1 font-semibold">+18% this month</p>
          </div>

          <div className="rounded-xl bg-black/20 p-3 border border-white/5">
            <div className="flex items-center justify-between text-gray-400 mb-1">
              <span className="text-xs font-medium">Policy Compliance</span>
              <Shield className="h-3.5 w-3.5 text-emerald-400" />
            </div>
            <div className="text-2xl font-black text-white">{activeAnalytics.complianceRate}%</div>
            <p className="text-[10px] text-gray-400 mt-1">0 policy penalties</p>
          </div>
        </div>

        {/* Hook Archetype ROI Breakdown (v_hook_archetype_roi) */}
        <div className="rounded-xl bg-black/30 border border-white/10 p-3 space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs font-bold text-white">
              <Sparkle className="h-3.5 w-3.5 text-cyan-400" />
              <span>Hook Archetype Attribution</span>
            </div>
            <span className="text-[9px] font-mono text-cyan-300 bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/20">
              v_hook_archetype_roi
            </span>
          </div>

          <div className="space-y-2">
            {activeAnalytics.hookArchetypeROI.map((roi: HookArchetypeROI) => {
              const isSuper = roi.performanceTier === 'SUPER_HOOK';
              return (
                <div
                  key={roi.archetype}
                  className={`rounded-xl p-2.5 border transition-all ${
                    isSuper
                      ? 'border-purple-500/30 bg-purple-950/20'
                      : 'border-white/5 bg-white/[0.02]'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold text-white">
                        {getArchetypeLabel(roi.archetype)}
                      </span>
                      <span
                        className={`rounded px-1.5 py-0.2 text-[9px] font-semibold border ${
                          isSuper
                            ? 'bg-purple-500/20 text-purple-300 border-purple-500/30'
                            : 'bg-white/10 text-gray-300 border-white/20'
                        }`}
                      >
                        {roi.performanceTier.replace('_', ' ')}
                      </span>
                    </div>
                    <span className="font-mono text-xs font-bold text-cyan-300">
                      {roi.intentScore !== null ? `${roi.intentScore}% Intent` : 'No Impressions'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-[10px] text-gray-400 pt-1 border-t border-white/5">
                    <span>
                      {roi.bookmarksPerKImpressions !== null
                        ? `${roi.bookmarksPerKImpressions} bookmarks/1k`
                        : '—'}
                    </span>
                    <span>{roi.totalPosts} posts published</span>
                    <span>{roi.totalBookmarks} bookmarks</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Content Pillar Balance (v_pillar_target_vs_actual) */}
        <div className="rounded-xl bg-black/30 border border-white/10 p-3 space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs font-bold text-white">
              <Sliders className="h-3.5 w-3.5 text-blue-400" />
              <span>Pillar Target vs. Actual Share</span>
            </div>
            <span className="text-[9px] font-mono text-blue-300 bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20">
              v_pillar_target_vs_actual
            </span>
          </div>

          <div className="space-y-2.5">
            {activeAnalytics.pillarBalance.map((p: PillarBalanceMetric) => {
              const actual = p.actualSharePct ?? 0;
              const target = p.targetWeightPct;
              const skew = p.skewPct ?? 0;
              const isBalanced = Math.abs(skew) <= 5.0;

              return (
                <div key={p.pillarId} className="space-y-1">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-medium text-gray-200 truncate max-w-[200px]">
                      {p.pillarName}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono text-gray-300">
                        {actual.toFixed(1)}% <span className="text-gray-500">/ {target}%</span>
                      </span>
                      <span
                        className={`text-[9px] font-semibold px-1 py-0.2 rounded ${
                          isBalanced
                            ? 'text-emerald-400 bg-emerald-500/10'
                            : skew > 0
                            ? 'text-amber-400 bg-amber-500/10'
                            : 'text-rose-400 bg-rose-500/10'
                        }`}
                      >
                        {skew > 0 ? `+${skew}%` : `${skew}%`}
                      </span>
                    </div>
                  </div>

                  <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden flex">
                    <div
                      className="bg-blue-500 h-full rounded-full transition-all"
                      style={{ width: `${Math.min(100, actual)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Creator Editorial Preferences (v_creator_preference_signals) */}
        <div className="rounded-xl bg-white/[0.02] border border-white/10 p-2.5 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-purple-500/20 text-purple-400">
              <Layers className="h-3.5 w-3.5" />
            </div>
            <div>
              <div className="font-semibold text-white">Creator Editorial Style</div>
              <div className="text-[10px] text-gray-400">
                Hook swap rate: {activeAnalytics.creatorPreferences.hookSwapRatePct}% • {activeAnalytics.creatorPreferences.creatorCurationStyle.replace('_', ' ')}
              </div>
            </div>
          </div>
          <span className="text-[10px] font-mono text-purple-300 bg-purple-500/10 px-2 py-0.5 rounded border border-purple-500/20">
            Preferred: {getArchetypeLabel(activeAnalytics.creatorPreferences.preferredArchetype || 'INVERSION')}
          </span>
        </div>
      </div>

      {/* Workflow Stage 8: Safe Evolution Proposals (Phase 2B2A: Before/After Diff & Approval Review) */}
      <div className="glass-panel rounded-2xl p-4 space-y-4">
        <div className="flex items-center justify-between border-b border-white/5 pb-3">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-purple-500/20 text-purple-400">
              <Sparkles className="h-4 w-4" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-purple-400 bg-purple-500/10 px-1.5 py-0.5 rounded border border-purple-500/20">
                  Stage 8: Evolution
                </span>
                <h3 className="text-xs font-bold text-white">Candidate Evolution Proposals</h3>
              </div>
              <p className="text-[10px] text-gray-400 mt-0.5">
                Review proposed config diffs • Human approval required to evolve persona
              </p>
            </div>
          </div>
          <span className="text-[10px] text-purple-300 bg-purple-500/10 px-2 py-0.5 rounded-full border border-purple-500/20 font-mono">
            {visibleSignals.filter((s) => s.status !== 'APPLIED').length} Pending (Max 2)
          </span>
        </div>

        {visibleSignals.length === 0 ? (
          <div className="rounded-xl bg-black/20 border border-white/5 p-6 text-center text-gray-400">
            <CheckCircle2 className="h-6 w-6 text-emerald-400 mx-auto mb-2" />
            <p className="text-xs font-medium text-white">No Pending Proposals</p>
            <p className="text-[11px] text-gray-400 mt-0.5">
              Persona is operating on approved baseline configuration v{persona.version}.
            </p>
          </div>
        ) : (
          <div className="space-y-3.5">
            {visibleSignals.map((signal) => {
              const isApplied = signal.status === 'APPLIED';
              const currentArr = Array.isArray(signal.proposedAdjustment.currentValue)
                ? signal.proposedAdjustment.currentValue
                : [String(signal.proposedAdjustment.currentValue)];
              const proposedArr = Array.isArray(signal.proposedAdjustment.proposedValue)
                ? signal.proposedAdjustment.proposedValue
                : [String(signal.proposedAdjustment.proposedValue)];

              // Find newly added items for green diff highlight
              const addedItems = proposedArr.filter((item) => !currentArr.includes(item));

              return (
                <div
                  key={signal.id}
                  className={`rounded-xl p-3.5 border transition-all space-y-3 ${
                    isApplied
                      ? 'border-emerald-500/30 bg-emerald-950/10'
                      : 'border-white/10 bg-black/30 hover:border-white/20'
                  }`}
                >
                  {/* Proposal Header */}
                  <div className="flex items-center justify-between">
                    <span className="rounded-md bg-purple-500/15 px-2 py-0.5 text-[10px] font-bold text-purple-300 border border-purple-500/30 uppercase tracking-wider">
                      {signal.type.replace(/_/g, ' ')}
                    </span>
                    <div className="flex items-center gap-1.5 text-[10px] text-gray-400 font-mono">
                      <span>Confidence: {Math.round(signal.confidence * 100)}%</span>
                      <span>•</span>
                      <span>{signal.createdAt}</span>
                    </div>
                  </div>

                  {/* Evidence Citation */}
                  <div className="rounded-lg bg-white/[0.02] border border-white/5 p-2.5 flex items-start gap-2">
                    <TrendingUp className="h-4 w-4 text-cyan-400 flex-shrink-0 mt-0.5" />
                    <div className="text-xs text-gray-200 leading-snug">
                      <span className="font-semibold text-cyan-300 block text-[10px] uppercase tracking-wider mb-0.5">
                        BigQuery Metric Evidence:
                      </span>
                      {signal.evidence.metricComparison}
                    </div>
                  </div>

                  {/* Before / After Diff Inspector */}
                  <div className="rounded-lg bg-black/40 border border-white/10 p-3 space-y-2">
                    <div className="flex items-center justify-between text-[11px] font-bold text-gray-300">
                      <span>Config Diff: persona.tone.{signal.proposedAdjustment.field}</span>
                      <span className="text-[10px] text-gray-500 font-mono">Preview</span>
                    </div>

                    {/* Current State (Red strike / muted) */}
                    <div className="text-[11px] rounded bg-red-950/20 border border-red-500/20 p-2 text-gray-300 space-y-1">
                      <div className="flex items-center gap-1 text-[10px] font-bold text-red-400">
                        <span>Current Baseline (v{persona.version}):</span>
                      </div>
                      <div className="flex flex-wrap gap-1 font-mono text-[10px]">
                        {currentArr.map((val, idx) => (
                          <span
                            key={idx}
                            className="bg-white/5 border border-white/10 px-1.5 py-0.2 rounded text-gray-300"
                          >
                            {val}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Proposed State (Green addition) */}
                    <div className="text-[11px] rounded bg-emerald-950/20 border border-emerald-500/20 p-2 text-gray-300 space-y-1">
                      <div className="flex items-center gap-1 text-[10px] font-bold text-emerald-400">
                        <Plus className="h-3 w-3 stroke-[3]" />
                        <span>Proposed Additions:</span>
                      </div>
                      <div className="flex flex-wrap gap-1 font-mono text-[10px]">
                        {addedItems.map((val, idx) => (
                          <span
                            key={idx}
                            className="bg-emerald-500/20 border border-emerald-500/40 px-1.5 py-0.2 rounded text-emerald-300 font-bold"
                          >
                            + {val}
                          </span>
                        ))}
                      </div>
                    </div>

                    <p className="text-[11px] text-gray-400 italic pt-0.5">
                      "{signal.proposedAdjustment.rationale}"
                    </p>
                  </div>

                  {/* Drafting Impact Note */}
                  {signal.draftingImpact && (
                    <div className="rounded-lg bg-blue-950/20 border border-blue-500/20 p-2.5 flex items-start gap-2 text-xs text-blue-200">
                      <Compass className="h-4 w-4 text-blue-400 flex-shrink-0 mt-0.5" />
                      <div>
                        <span className="font-semibold text-blue-300 block text-[10px] uppercase tracking-wider">
                          Future Drafting Impact:
                        </span>
                        <span className="text-[11px] leading-snug">{signal.draftingImpact}</span>
                      </div>
                    </div>
                  )}

                  {/* Actions Bar */}
                  <div className="flex items-center justify-between pt-2 border-t border-white/5">
                    {isApplied ? (
                      <span className="flex items-center gap-1 text-xs font-semibold text-emerald-400">
                        <UserCheck className="h-4 w-4" />
                        <span>Approved by Creator • Evolved to v{persona.version}</span>
                      </span>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={() => handleDismissSignal(signal.id)}
                          className="flex items-center gap-1 rounded-xl px-3 py-1.5 text-xs font-medium text-gray-400 hover:bg-white/5 hover:text-red-400 transition-colors"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          <span>Dismiss</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleApplySignal(signal)}
                          disabled={applyingSignalId === signal.id}
                          className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-purple-500 to-indigo-600 px-3.5 py-2 text-xs font-bold text-white shadow-md shadow-purple-500/20 hover:brightness-110 active:scale-95 transition-all disabled:opacity-50"
                        >
                          <Sparkles className="h-3.5 w-3.5" />
                          <span>{applyingSignalId === signal.id ? 'Applying...' : 'Approve & Evolve Persona'}</span>
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
