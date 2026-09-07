'use client';

import React, { useState } from 'react';
import { ShieldCheck, ShieldAlert, CheckCircle2, Send, Trash2, ChevronDown, ChevronUp, Sparkles, Clock } from 'lucide-react';
import { PostDraft, PersonaConfig, CrisisState } from '@/core/types';

interface DraftCardProps {
  draft: PostDraft;
  persona: PersonaConfig;
  crisisState: CrisisState;
  onApprove: (id: string) => void;
  onPublish: (draft: PostDraft) => void;
  onReject: (id: string) => void;
}

export const DraftCard: React.FC<DraftCardProps> = ({
  draft,
  persona,
  crisisState,
  onApprove,
  onPublish,
  onReject,
}) => {
  const [threadExpanded, setThreadExpanded] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);

  const charCount = draft.content.length;
  const isOverLimit = charCount > 280;
  const compliance = draft.complianceReport;

  const handlePublishClick = async () => {
    setIsPublishing(true);
    try {
      await onPublish(draft);
    } finally {
      setIsPublishing(false);
    }
  };

  return (
    <div className="glass-panel relative flex flex-col rounded-2xl p-4 transition-all duration-200 hover:border-white/20">
      {/* Pillar & Workflow Stage Bar */}
      <div className="mb-3 flex items-center justify-between border-b border-white/5 pb-2.5">
        <div className="flex items-center gap-1.5">
          <span className="rounded-md bg-white/5 px-2 py-0.5 text-[11px] font-medium text-gray-300">
            {persona.pillars.find((p) => p.id === draft.pillarId)?.name || 'General Pillar'}
          </span>
          {draft.status === 'APPROVED' ? (
            <span className="rounded-md bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold text-emerald-300 border border-emerald-500/30">
              Posting: Approved
            </span>
          ) : draft.status === 'PUBLISHED' ? (
            <span className="rounded-md bg-blue-500/15 px-2 py-0.5 text-[10px] font-bold text-blue-300 border border-blue-500/30">
              Posting: Published
            </span>
          ) : (
            <span className="rounded-md bg-amber-500/15 px-2 py-0.5 text-[10px] font-bold text-amber-300 border border-amber-500/30">
              Posting: Requires Approval
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Estimated Hook Score */}
          {draft.estimatedHookScore && (
            <div className="flex items-center gap-1 rounded-md bg-cyan-500/10 px-2 py-0.5 text-[11px] font-semibold text-cyan-300 border border-cyan-500/20">
              <Sparkles className="h-3 w-3" />
              <span>Hook: {draft.estimatedHookScore}/100</span>
            </div>
          )}

          {/* Compliance Badge */}
          {compliance && (
            <div
              className={`flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-semibold border ${
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
        </div>
      </div>

      {/* Tweet Body Preview */}
      <div className="flex gap-3">
        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 text-sm font-bold text-white shadow-inner">
          {persona.displayName[0]}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 leading-none mb-1">
            <span className="text-sm font-bold text-white truncate">{persona.displayName}</span>
            <span className="text-xs text-gray-400">@{persona.handle}</span>
          </div>

          <p className="whitespace-pre-wrap text-sm leading-relaxed text-gray-200">
            {draft.content}
          </p>

          {/* Thread indicator & toggle */}
          {draft.thread && draft.thread.length > 0 && (
            <div className="mt-2.5">
              <button
                onClick={() => setThreadExpanded(!threadExpanded)}
                className="flex items-center gap-1 text-xs font-semibold text-cyan-400 hover:text-cyan-300"
              >
                <span>{draft.thread.length} more tweets in thread</span>
                {threadExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
              </button>

              {threadExpanded && (
                <div className="mt-2 space-y-2 border-l-2 border-cyan-500/30 pl-3">
                  {draft.thread.map((t, idx) => (
                    <div key={idx} className="rounded-lg bg-black/30 p-2.5 text-xs leading-relaxed text-gray-300">
                      <span className="font-semibold text-cyan-400 mb-1 block">Tweet {idx + 2}</span>
                      <p className="whitespace-pre-wrap">{t}</p>
                    </div>
                  ))}
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
          {draft.status !== 'APPROVED' && draft.status !== 'PUBLISHED' && (
            <button
              onClick={() => onApprove(draft.id)}
              disabled={crisisState.isFrozen || (compliance && !compliance.passed)}
              className="flex items-center gap-1.5 rounded-xl bg-emerald-500/20 border border-emerald-500/30 px-3 py-1.5 text-xs font-bold text-emerald-300 hover:bg-emerald-500/30 transition-all active:scale-95"
            >
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
              <span>Approve Draft</span>
            </button>
          )}

          {draft.status === 'APPROVED' && (
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

          {draft.status === 'PUBLISHED' && (
            <span className="rounded-lg bg-blue-500/10 px-2.5 py-1 text-xs font-semibold text-blue-300 border border-blue-500/20">
              Published on X
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
