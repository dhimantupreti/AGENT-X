'use client';

import React from 'react';
import { X, CheckCircle2, ShieldCheck, AlertOctagon, UserCheck, Bot } from 'lucide-react';

interface WorkflowGuideProps {
  isOpen: boolean;
  onClose: () => void;
}

export const WorkflowGuide: React.FC<WorkflowGuideProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  const steps = [
    {
      step: 1,
      name: 'Research',
      mode: 'Autonomous',
      type: 'bot',
      desc: 'Monitors solopreneur pain points, niche questions, and audience trends.',
    },
    {
      step: 2,
      name: 'Strategy',
      mode: 'Creator Defined',
      type: 'user',
      desc: 'Content pillar allocations (e.g. 45% Distribution, 35% Systems, 20% Mindset).',
    },
    {
      step: 3,
      name: 'Create',
      mode: 'Autonomous',
      type: 'bot',
      desc: 'Drafts high-signal single tweets and threads with virality hook scoring via Grok.',
    },
    {
      step: 4,
      name: 'Compliance',
      mode: 'Automated Policy Guard',
      type: 'shield',
      desc: 'Scans 280-char limits, banned phrases, hype claims, and crisis freeze status.',
    },
    {
      step: 5,
      name: 'Posting',
      mode: 'Human Approval Required',
      type: 'gate',
      desc: 'Drafts remain locked until explicitly approved by the creator before sending to X.',
    },
    {
      step: 6,
      name: 'Engagement',
      mode: 'Autonomous Triage • Approval to Send',
      type: 'gate',
      desc: 'Classifies mentions by sentiment and urgency. Reply proposals require creator sign-off.',
    },
    {
      step: 7,
      name: 'Crisis',
      mode: 'Creator Override Kill-Switch',
      type: 'crisis',
      desc: '1-tap emergency freeze instantly blocks all scheduled and automated publishing.',
    },
    {
      step: 8,
      name: 'Persona',
      mode: 'Creator Voice Moat',
      type: 'user',
      desc: 'Audience targeting, authoritative tone, style tags, and brand safety forbidden lists.',
    },
    {
      step: 9,
      name: 'Analytics',
      mode: 'Autonomous Interpretation',
      type: 'bot',
      desc: 'BigQuery partitioned telemetry tracking High-Intent Ratios (bookmarks & profile clicks).',
    },
    {
      step: 10,
      name: 'Evolution',
      mode: 'Autonomous Proposal • Approval Gate',
      type: 'gate',
      desc: 'Identifies winning hook patterns and audience fatigue; changes require creator approval.',
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm p-0 sm:p-4">
      <div className="glass-panel w-full max-w-md max-h-[85vh] flex flex-col rounded-t-3xl sm:rounded-3xl border border-white/10 p-5 bg-[#10121d] text-white animate-in slide-in-from-bottom-5 duration-200">
        <div className="flex items-center justify-between border-b border-white/10 pb-3 flex-shrink-0">
          <div>
            <h3 className="text-sm font-bold text-white">AGENTX 10-Step Product Workflow</h3>
            <p className="text-[11px] text-gray-400">Policy-Safe Operating Model & Approval Checkpoints</p>
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

        {/* 10-Step Scrollable List */}
        <div className="overflow-y-auto space-y-2 pr-1 flex-1">
          {steps.map((item) => (
            <div key={item.step} className="rounded-xl bg-black/30 p-3 border border-white/5 space-y-1">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white/10 text-[10px] font-bold text-cyan-400 font-mono">
                    {item.step}
                  </span>
                  <span className="text-xs font-bold text-white">{item.name}</span>
                </div>

                <span
                  className={`rounded-md px-2 py-0.5 text-[9px] font-bold ${
                    item.type === 'gate'
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                      : item.type === 'crisis'
                      ? 'bg-red-500/20 text-red-300 border border-red-500/30'
                      : item.type === 'shield'
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
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
