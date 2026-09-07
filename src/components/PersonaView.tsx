'use client';

import React, { useState } from 'react';
import { Brain, ShieldCheck, History, Sliders, Tag, Sparkles, Compass, Lightbulb } from 'lucide-react';
import { PersonaConfig } from '@/core/types';

interface PersonaViewProps {
  persona: PersonaConfig;
  onUpdatePersona: (newPersona: PersonaConfig) => void;
}

type SubSection = 'all' | 'research' | 'strategy' | 'persona';

export const PersonaView: React.FC<PersonaViewProps> = ({ persona }) => {
  const [activeSub, setActiveSub] = useState<SubSection>('all');

  const researchTopics = [
    {
      angle: 'Solo Distribution Flywheels',
      summary: 'Audience fatigue around ad spend; bootstrapping organically via public case studies.',
      seedIdea: 'Why founders should build a customer problem library before touching code.',
    },
    {
      angle: 'Lean Engineering Moats',
      summary: 'High demand for minimal infrastructure setups that cost <$50/month with zero ops burden.',
      seedIdea: 'My exact tech stack for running 3 profitable micro-apps solo.',
    },
    {
      angle: 'Contrarian Mindsets',
      summary: 'Viral interest in challenging VC consensus and growth-at-all-costs narratives.',
      seedIdea: 'Stop checking analytics 14 times a day: focus on high-intent bookmarks.',
    },
  ];

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
          All Stages (1, 2, 8)
        </button>
        <button
          onClick={() => setActiveSub('research')}
          className={`rounded-xl px-3 py-1 text-xs font-semibold whitespace-nowrap transition-all ${
            activeSub === 'research'
              ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40'
              : 'bg-white/5 text-gray-400 hover:bg-white/10'
          }`}
        >
          Stage 1: Research
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
          onClick={() => setActiveSub('persona')}
          className={`rounded-xl px-3 py-1 text-xs font-semibold whitespace-nowrap transition-all ${
            activeSub === 'persona'
              ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40'
              : 'bg-white/5 text-gray-400 hover:bg-white/10'
          }`}
        >
          Stage 8: Persona
        </button>
      </div>

      {/* Stage 1: Research & Discovery */}
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
                    Stage 1: Research
                  </span>
                  <h3 className="text-xs font-bold text-white">Audience & Niche Intelligence</h3>
                </div>
                <p className="text-[10px] text-gray-400 mt-0.5">
                  Autonomous discovery • Solopreneur pain points & trending hooks
                </p>
              </div>
            </div>
            <span className="text-[10px] font-mono text-cyan-300 bg-cyan-500/10 px-2 py-0.5 rounded-full border border-cyan-500/20">
              Auto-Researched
            </span>
          </div>

          <div className="space-y-2.5">
            {researchTopics.map((topic, i) => (
              <div key={i} className="rounded-xl bg-black/20 p-3 border border-white/5 space-y-1">
                <div className="flex items-center gap-1.5 text-xs font-bold text-cyan-300">
                  <Lightbulb className="h-3.5 w-3.5 text-cyan-400" />
                  <span>{topic.angle}</span>
                </div>
                <p className="text-[11px] text-gray-400 leading-snug">{topic.summary}</p>
                <div className="rounded-lg bg-white/[0.02] p-2 mt-1.5 text-[11px] text-gray-300 border-l-2 border-cyan-400/40">
                  <span className="text-gray-400 text-[10px] block">Researched Hook Angle:</span>
                  "{topic.seedIdea}"
                </div>
              </div>
            ))}
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

      {/* Stage 8: Persona Profile & Tone */}
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
                    Stage 8: Persona
                  </span>
                  <h2 className="text-sm font-bold text-white">Creator Persona & Voice</h2>
                </div>
                <p className="text-[11px] text-gray-400 mt-0.5">Configured baseline for autonomous reasoning</p>
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
              <span>Forbidden Brand Words (Auto-Filtered)</span>
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
                <span className="text-[10px] text-gray-400">
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
    </div>
  );
};
