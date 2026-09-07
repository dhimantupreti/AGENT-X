'use client';

import React, { useState } from 'react';
import { BarChart3, Bookmark, Eye, TrendingUp, Sparkles, CheckCircle2, ArrowUpRight, Database, Shield, UserCheck } from 'lucide-react';
import { PersonaConfig, EvolutionSignal } from '@/core/types';

interface AnalyticsViewProps {
  persona: PersonaConfig;
  onPersonaEvolved: (newPersona: PersonaConfig) => void;
}

export const AnalyticsView: React.FC<AnalyticsViewProps> = ({ persona, onPersonaEvolved }) => {
  const [applyingSignalId, setApplyingSignalId] = useState<string | null>(null);

  const [signals, setSignals] = useState<EvolutionSignal[]>([
    {
      id: 'sig_1',
      type: 'HIGH_PERFORMING_HOOK',
      confidence: 0.94,
      evidence: {
        tweetIds: ['seed_tw_1'],
        metricComparison: 'Bookmarks are 3.2x higher on posts using "Contrarian Inversion" hooks.',
      },
      proposedAdjustment: {
        field: 'tone',
        currentValue: persona.tone.styleTags,
        proposedValue: [...persona.tone.styleTags, 'contrarian-inversion', 'leverage-focused'],
        rationale: 'Double down on high-intent bookmark generation for solopreneur audience.',
      },
      status: 'PENDING_APPROVAL',
      createdAt: 'Today',
    },
    {
      id: 'sig_2',
      type: 'AUDIENCE_FATIGUE',
      confidence: 0.89,
      evidence: {
        tweetIds: ['seed_tw_2'],
        metricComparison: 'Buzzwords like "insane" or "skyrocket" experienced 40% higher negative triage sentiment.',
      },
      proposedAdjustment: {
        field: 'forbiddenPhrases',
        currentValue: persona.tone.forbiddenPhrases,
        proposedValue: ['insane', 'skyrocket'],
        rationale: 'Expand brand safety forbidden list to protect authentic solopreneur voice.',
      },
      status: 'PENDING_APPROVAL',
      createdAt: 'Yesterday',
    },
  ]);

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
        setSignals((prev) =>
          prev.map((s) => (s.id === signal.id ? { ...s, status: 'APPLIED', approvedBy: 'CREATOR' } : s))
        );
      }
    } finally {
      setApplyingSignalId(null);
    }
  };

  return (
    <div className="space-y-4 pb-20">
      {/* Workflow Stage 9: Analytics & Telemetry */}
      <div className="glass-panel rounded-2xl p-4">
        <div className="flex items-center justify-between border-b border-white/5 pb-3 mb-3">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-500/20 text-blue-400">
              <BarChart3 className="h-4 w-4" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-blue-400 bg-blue-500/10 px-1.5 py-0.5 rounded border border-blue-500/20">
                  Stage 9: Analytics
                </span>
                <h2 className="text-xs font-bold text-white">BigQuery Performance Telemetry</h2>
              </div>
              <p className="text-[10px] text-gray-400 mt-0.5">
                Autonomous interpretation • Modeled via Google Cloud Data Agent Kit
              </p>
            </div>
          </div>
          <span className="flex items-center gap-1 rounded-full bg-blue-500/10 px-2.5 py-0.5 text-[10px] font-mono text-blue-300 border border-blue-500/20">
            <Database className="h-3 w-3" />
            <span>Partitioned Log</span>
          </span>
        </div>

        {/* Metric Cards Grid */}
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl bg-black/20 p-3 border border-white/5">
            <div className="flex items-center justify-between text-gray-400 mb-1">
              <span className="text-xs font-medium">Solopreneur Intent</span>
              <ArrowUpRight className="h-3.5 w-3.5 text-cyan-400" />
            </div>
            <div className="text-2xl font-black text-white">8.4%</div>
            <p className="text-[10px] text-emerald-400 mt-1 flex items-center gap-1 font-semibold">
              <TrendingUp className="h-3 w-3" /> +2.3% vs peer average
            </p>
          </div>

          <div className="rounded-xl bg-black/20 p-3 border border-white/5">
            <div className="flex items-center justify-between text-gray-400 mb-1">
              <span className="text-xs font-medium">Total Bookmarks</span>
              <Bookmark className="h-3.5 w-3.5 text-purple-400" />
            </div>
            <div className="text-2xl font-black text-white">1,452</div>
            <p className="text-[10px] text-gray-400 mt-1">High retention conversion</p>
          </div>

          <div className="rounded-xl bg-black/20 p-3 border border-white/5">
            <div className="flex items-center justify-between text-gray-400 mb-1">
              <span className="text-xs font-medium">Impressions</span>
              <Eye className="h-3.5 w-3.5 text-blue-400" />
            </div>
            <div className="text-2xl font-black text-white">77.6k</div>
            <p className="text-[10px] text-emerald-400 mt-1 font-semibold">+18% this week</p>
          </div>

          <div className="rounded-xl bg-black/20 p-3 border border-white/5">
            <div className="flex items-center justify-between text-gray-400 mb-1">
              <span className="text-xs font-medium">Policy Compliance</span>
              <Shield className="h-3.5 w-3.5 text-emerald-400" />
            </div>
            <div className="text-2xl font-black text-white">100%</div>
            <p className="text-[10px] text-gray-400 mt-1">0 policy penalties</p>
          </div>
        </div>
      </div>

      {/* Workflow Stage 10: Evolution Proposals */}
      <div className="glass-panel rounded-2xl p-4">
        <div className="flex items-center justify-between border-b border-white/5 pb-3 mb-3">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-purple-500/20 text-purple-400">
              <Sparkles className="h-4 w-4" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-purple-400 bg-purple-500/10 px-1.5 py-0.5 rounded border border-purple-500/20">
                  Stage 10: Evolution
                </span>
                <h3 className="text-xs font-bold text-white">Safe Evolution Proposals</h3>
              </div>
              <p className="text-[10px] text-gray-400 mt-0.5">
                Autonomous proposal generation • Human approval required to apply diff
              </p>
            </div>
          </div>
          <span className="text-[10px] text-purple-300 bg-purple-500/10 px-2 py-0.5 rounded-full border border-purple-500/20">
            Approval Gate
          </span>
        </div>

        <div className="space-y-3">
          {signals.map((signal) => (
            <div key={signal.id} className="rounded-xl bg-black/20 p-3.5 border border-white/5 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="rounded-md bg-purple-500/10 px-2 py-0.5 text-[10px] font-bold text-purple-300 border border-purple-500/20">
                  {signal.type}
                </span>
                <span className="text-[10px] text-gray-400 font-mono">
                  Confidence: {Math.round(signal.confidence * 100)}%
                </span>
              </div>

              <p className="text-xs text-gray-200">{signal.evidence.metricComparison}</p>

              <div className="rounded-lg bg-white/[0.03] p-2.5 text-[11px] text-gray-300 border-l-2 border-purple-400/40">
                <span className="font-semibold text-white block mb-0.5">Proposed Config Diff:</span>
                <p className="text-gray-400">{signal.proposedAdjustment.rationale}</p>
                <div className="mt-1 font-mono text-[10px] text-purple-300">
                  Field: tone.{signal.proposedAdjustment.field}
                </div>
              </div>

              <div className="flex items-center justify-between pt-1 border-t border-white/5">
                <span className="text-[10px] text-gray-400">
                  {signal.status === 'APPLIED' ? 'Committed to config' : 'Approval Gate: Awaiting Creator'}
                </span>
                {signal.status === 'APPLIED' ? (
                  <span className="flex items-center gap-1 text-[11px] font-semibold text-emerald-400">
                    <UserCheck className="h-3.5 w-3.5" />
                    <span>Approved & Applied to v{persona.version}</span>
                  </span>
                ) : (
                  <button
                    onClick={() => handleApplySignal(signal)}
                    disabled={applyingSignalId === signal.id}
                    className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-purple-500 to-indigo-600 px-3 py-1.5 text-xs font-bold text-white hover:brightness-110 active:scale-95 transition-all shadow-md shadow-purple-500/20"
                  >
                    <Sparkles className="h-3 w-3" />
                    <span>{applyingSignalId === signal.id ? 'Applying...' : 'Approve & Evolve Persona'}</span>
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
