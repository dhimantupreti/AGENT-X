'use client';

import React from 'react';
import { X, ShieldCheck, Siren } from 'lucide-react';

interface WorkflowGuideProps {
  isOpen: boolean;
  onClose: () => void;
}

export const WorkflowGuide: React.FC<WorkflowGuideProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  const steps = [
    {
      step: 1,
      workspace: 'Studio',
      name: 'Persona & Voice Moat',
      mode: 'Creator Voice Moat',
      type: 'user',
      desc: 'Audience targeting, authoritative tone, style tags, and brand safety forbidden lists.',
    },
    {
      step: 2,
      workspace: 'Studio',
      name: 'Content Strategy',
      mode: 'Creator Defined',
      type: 'user',
      desc: 'Strategic content pillar weight distributions (e.g. 45% Scale, 35% Systems, 20% Mindset).',
    },
    {
      step: 3,
      workspace: 'Studio',
      name: 'Topic Radar & Quick Notes',
      mode: 'Autonomous + Ingestion',
      type: 'bot',
      desc: 'Monitors solopreneur pain points, niche questions, and refines raw notes into seed angles.',
    },
    {
      step: 4,
      workspace: 'Queue',
      name: 'Autonomous Drafter & Hook Lab',
      mode: 'Autonomous + Hook Lab',
      type: 'bot',
      desc: 'Drafts high-signal tweets/threads with 3 distinct virality hook archetypes via Grok.',
    },
    {
      step: 5,
      workspace: 'Queue',
      name: 'Posting Gate',
      mode: 'Human Approval Required',
      type: 'gate',
      desc: 'Drafts remain locked until explicitly approved by the creator before publishing to X.',
    },
    {
      step: 6,
      workspace: 'Engage',
      name: 'Engagement Triage & Replies',
      mode: 'Autonomous Triage • Approval to Send',
      type: 'gate',
      desc: 'Classifies inbound mentions and drafts tone-matched replies requiring creator sign-off.',
    },
    {
      step: 7,
      workspace: 'Signals',
      name: 'Performance Telemetry',
      mode: 'Autonomous Insights',
      type: 'bot',
      desc: 'BigQuery partitioned telemetry tracking High-Intent Ratios (bookmarks & profile clicks).',
    },
    {
      step: 8,
      workspace: 'Signals',
      name: 'Persona Self-Evolution',
      mode: 'Autonomous Proposal • Approval Gate',
      type: 'gate',
      desc: 'Synthesizes winning hook patterns and pillar balance; mutations require creator approval.',
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm p-0 sm:p-4">
      <div className="glass-panel w-full max-w-md max-h-[85vh] flex flex-col rounded-t-3xl sm:rounded-3xl border border-white/10 p-5 bg-[#10121d] text-white animate-in slide-in-from-bottom-5 duration-200">
        <div className="flex items-center justify-between border-b border-white/10 pb-3 flex-shrink-0">
          <div>
            <h3 className="text-sm font-bold text-white">AGENTX 8-Stage Creator Operating Flow</h3>
            <p className="text-[11px] text-gray-400">Policy-Safe Workspaces & Approval Checkpoints</p>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-1 text-gray-400 hover:bg-white/10 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Operating Model Summary Banner */}
        <div className="my-3 rounded-xl bg-blue-950/40 border border-blue-500/30 p-2.5 text-xs text-blue-200 flex-shrink-0">
          <span className="font-bold block text-blue-100">Policy-Safe Operating Principle:</span>
          Autonomous by default for research, drafting, scoring, and proposals. <span className="font-semibold text-white underline">Human approval required</span> for publishing, sending replies, applying evolutions, and crisis overrides.
        </div>

        {/* Global Sentinels Card */}
        <div className="mb-3 rounded-xl bg-black/40 border border-white/10 p-3 space-y-2 flex-shrink-0">
          <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
            Always-On Global System Sentinels
          </span>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="rounded-lg bg-emerald-950/30 border border-emerald-500/30 p-2 space-y-1">
              <div className="flex items-center gap-1.5 font-bold text-emerald-300 text-[11px]">
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
                <span>Compliance Sentinel</span>
              </div>
              <p className="text-[10px] text-gray-400 leading-tight">
                Automated check for 280 chars, forbidden phrases, hype terms, and freeze status.
              </p>
            </div>
            <div className="rounded-lg bg-red-950/30 border border-red-500/30 p-2 space-y-1">
              <div className="flex items-center gap-1.5 font-bold text-red-300 text-[11px]">
                <Siren className="h-3.5 w-3.5 text-red-400" />
                <span>Crisis Guardian</span>
              </div>
              <p className="text-[10px] text-gray-400 leading-tight">
                1-tap emergency kill-switch instantly halting all publishing and replies.
              </p>
            </div>
          </div>
        </div>

        {/* 8-Stage Scrollable List */}
        <div className="overflow-y-auto space-y-2 pr-1 flex-1">
          {steps.map((item) => (
            <div key={item.step} className="rounded-xl bg-black/30 p-3 border border-white/5 space-y-1">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white/10 text-[10px] font-bold text-cyan-400 font-mono">
                    {item.step}
                  </span>
                  <div>
                    <span className="text-xs font-bold text-white block">{item.name}</span>
                    <span className="text-[9px] text-gray-500 font-mono">Workspace: {item.workspace}</span>
                  </div>
                </div>

                <span
                  className={`rounded-md px-2 py-0.5 text-[9px] font-bold ${
                    item.type === 'gate'
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                      : item.type === 'user'
                      ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                      : 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                  }`}
                >
                  {item.mode}
                </span>
              </div>
              <p className="text-[11px] text-gray-400 leading-snug pl-7">{item.desc}</p>
            </div>
          ))}
        </div>

        <button
          onClick={onClose}
          className="mt-4 w-full rounded-xl bg-white/10 py-2 text-xs font-bold text-white hover:bg-white/20 transition-all flex-shrink-0"
        >
          Close Workflow Guide
        </button>
      </div>
    </div>
  );
};
