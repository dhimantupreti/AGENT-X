'use client';

import React, { useState } from 'react';
import { X, Sparkles, Loader2, ListTree, MessageSquare } from 'lucide-react';
import { PersonaConfig, ContentPillar } from '@/core/types';

interface GenerateModalProps {
  isOpen: boolean;
  onClose: () => void;
  persona: PersonaConfig;
  onGenerate: (pillarId: string, options: { topic?: string; format: 'SINGLE_TWEET' | 'THREAD' }) => Promise<void>;
}

export const GenerateModal: React.FC<GenerateModalProps> = ({
  isOpen,
  onClose,
  persona,
  onGenerate,
}) => {
  const [selectedPillarId, setSelectedPillarId] = useState<string>(persona.pillars[0]?.id || '');
  const [format, setFormat] = useState<'SINGLE_TWEET' | 'THREAD'>('SINGLE_TWEET');
  const [customAngle, setCustomAngle] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await onGenerate(selectedPillarId, {
        topic: customAngle.trim() || undefined,
        format,
      });
      onClose();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm p-0 sm:p-4">
      <div className="glass-panel w-full max-w-md rounded-t-3xl sm:rounded-3xl border border-white/10 p-5 bg-[#10121d] text-white animate-in slide-in-from-bottom-5 duration-200">
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-cyan-500/20 text-cyan-400">
              <Sparkles className="h-4 w-4" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-400 bg-cyan-500/10 px-1.5 py-0.5 rounded border border-cyan-500/20">
                  Stage 3: Create
                </span>
                <h3 className="text-sm font-bold">Autonomous Grok Drafter</h3>
              </div>
              <p className="text-[10px] text-gray-400 mt-0.5">
                Drafts will require your approval before publishing
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-1 text-gray-400 hover:bg-white/10 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
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
                    <div className="text-[11px] text-gray-400 mt-0.5 line-clamp-1">{pillar.description}</div>
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
                <span>Thread (3-5 Tweets)</span>
              </button>
            </div>
          </div>

          {/* Custom Angle / Seed prompt */}
          <div>
            <label className="block text-xs font-semibold text-gray-300 mb-1.5">
              Specific Angle or Lesson (Optional)
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
                <span>Synthesizing with Grok...</span>
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4 text-black" />
                <span>Synthesize Draft (Awaiting Approval)</span>
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};
