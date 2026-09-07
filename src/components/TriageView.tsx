'use client';

import React, { useState } from 'react';
import { Siren, ShieldAlert, ShieldCheck, MessageCircle, AlertTriangle, Check, Copy, Send, UserCheck } from 'lucide-react';
import { CrisisState } from '@/core/types';
import { MentionTriageItem } from '@/lib/adapters/x/interface';

interface TriageViewProps {
  crisisState: CrisisState;
  onToggleCrisis: () => void;
}

export const TriageView: React.FC<TriageViewProps> = ({ crisisState, onToggleCrisis }) => {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [approvedReplies, setApprovedReplies] = useState<Record<string, boolean>>({});

  const [mentions] = useState<MentionTriageItem[]>([
    {
      id: 'm1',
      authorHandle: 'indie_dev_dan',
      text: '@solobuilder What made you choose BigQuery over Postgres for your telemetry pipeline?',
      sentiment: 'POSITIVE',
      urgency: 'HIGH',
      recommendedAction: 'REPLY',
      suggestedReply:
        'Postgres is incredible for OLTP, but BigQuery handles partitioning by date, columnar aggregation for virality hooks, and ML views effortlessly at scale.',
      receivedAt: '12m ago',
    },
    {
      id: 'm2',
      authorHandle: 'cynical_founder',
      text: '@solobuilder Most solopreneurs fail because they take generic advice from Twitter gurus.',
      sentiment: 'NEGATIVE',
      urgency: 'MEDIUM',
      recommendedAction: 'REPLY',
      suggestedReply:
        '100% agreed. That is why I share raw numbers, churn post-mortems, and exact systems instead of platitudes.',
      receivedAt: '48m ago',
    },
    {
      id: 'm3',
      authorHandle: 'crypto_giveaway_bot',
      text: 'CLAIM FREE 500 SOL NOW AT link.xyz/airdrop #crypto',
      sentiment: 'ATTACK',
      urgency: 'LOW',
      recommendedAction: 'IGNORE',
      receivedAt: '2h ago',
    },
  ]);

  const handleCopyReply = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleApproveReply = (id: string) => {
    setApprovedReplies((prev) => ({ ...prev, [id]: true }));
  };

  return (
    <div className="space-y-4 pb-20">
      {/* Workflow Stage 7: Crisis Guardian */}
      <div
        className={`glass-panel rounded-2xl p-4 transition-all duration-300 border ${
          crisisState.isFrozen
            ? 'crisis-pulse border-red-500/60 bg-red-950/40'
            : 'border-white/10 hover:border-white/20'
        }`}
      >
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2.5">
            <div
              className={`flex h-10 w-10 items-center justify-center rounded-xl ${
                crisisState.isFrozen ? 'bg-red-500/20 text-red-400' : 'bg-emerald-500/20 text-emerald-400'
              }`}
            >
              <Siren className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-red-400 bg-red-500/10 px-1.5 py-0.5 rounded border border-red-500/20">
                  Stage 7: Crisis
                </span>
                <h2 className="text-sm font-bold text-white">Emergency Kill-Switch</h2>
              </div>
              <p className="text-[11px] text-gray-400 mt-0.5">
                {crisisState.isFrozen
                  ? 'All automated and scheduled publishing is strictly FROZEN.'
                  : 'Radar online. Creator manual override required to halt operations.'}
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={onToggleCrisis}
          className={`flex w-full items-center justify-center gap-2 rounded-xl py-3 text-xs font-bold uppercase tracking-wider transition-all active:scale-98 shadow-md ${
            crisisState.isFrozen
              ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-black shadow-emerald-500/20'
              : 'bg-gradient-to-r from-red-600 to-rose-700 text-white shadow-red-600/30'
          }`}
        >
          {crisisState.isFrozen ? (
            <>
              <ShieldCheck className="h-4 w-4" />
              <span>Deactivate Freeze & Restore Normal Operations</span>
            </>
          ) : (
            <>
              <ShieldAlert className="h-4 w-4" />
              <span>EMERGENCY FREEZE (Halt All Scheduled Posts)</span>
            </>
          )}
        </button>
      </div>

      {/* Workflow Stage 6: Engagement Triage */}
      <div className="glass-panel rounded-2xl p-4">
        <div className="flex items-center justify-between border-b border-white/5 pb-3 mb-3">
          <div className="flex items-center gap-2">
            <MessageCircle className="h-4 w-4 text-cyan-400" />
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-400 bg-cyan-500/10 px-1.5 py-0.5 rounded border border-cyan-500/20">
                  Stage 6: Engagement
                </span>
                <h3 className="text-xs font-bold text-white">Inbound Mentions Triage</h3>
              </div>
              <p className="text-[10px] text-gray-400 mt-0.5">
                Autonomous classification • Human approval required to send replies
              </p>
            </div>
          </div>
          <span className="rounded-full bg-cyan-500/10 px-2 py-0.5 text-[10px] font-mono text-cyan-300">
            {mentions.length} Incoming
          </span>
        </div>

        <div className="space-y-3">
          {mentions.map((item) => {
            const isApproved = approvedReplies[item.id];

            return (
              <div key={item.id} className="rounded-xl bg-black/20 p-3.5 border border-white/5 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-white">@{item.authorHandle}</span>
                    <span className="text-[10px] text-gray-400">· {item.receivedAt}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span
                      className={`rounded-md px-1.5 py-0.5 text-[9px] font-bold ${
                        item.sentiment === 'POSITIVE'
                          ? 'bg-emerald-500/10 text-emerald-300'
                          : item.sentiment === 'NEGATIVE'
                          ? 'bg-amber-500/10 text-amber-300'
                          : 'bg-red-500/10 text-red-300'
                      }`}
                    >
                      {item.sentiment}
                    </span>
                    {item.urgency === 'HIGH' && (
                      <span className="rounded-md bg-red-500/20 px-1.5 py-0.5 text-[9px] font-bold text-red-300 flex items-center gap-0.5">
                        <AlertTriangle className="h-2.5 w-2.5" />
                        HIGH
                      </span>
                    )}
                  </div>
                </div>

                <p className="text-xs text-gray-200">{item.text}</p>

                {item.suggestedReply && (
                  <div className="rounded-lg bg-cyan-950/25 border border-cyan-500/20 p-3 mt-2">
                    <div className="flex items-center justify-between text-[10px] font-semibold text-cyan-400 mb-1.5">
                      <span>Autonomous Reply Proposal (Grok):</span>
                      <button
                        onClick={() => handleCopyReply(item.id, item.suggestedReply!)}
                        className="flex items-center gap-1 text-gray-300 hover:text-white"
                      >
                        {copiedId === item.id ? (
                          <>
                            <Check className="h-3 w-3 text-emerald-400" />
                            <span className="text-emerald-400">Copied</span>
                          </>
                        ) : (
                          <>
                            <Copy className="h-3 w-3" />
                            <span>Copy</span>
                          </>
                        )}
                      </button>
                    </div>
                    <p className="text-xs text-cyan-100 leading-relaxed mb-2.5">{item.suggestedReply}</p>

                    {/* Human Approval Gate for Reply */}
                    <div className="flex items-center justify-between border-t border-cyan-500/20 pt-2">
                      <span className="text-[10px] text-gray-400">
                        {isApproved ? 'Authorized by Creator' : 'Approval Gate: Required before sending'}
                      </span>

                      {isApproved ? (
                        <div className="flex items-center gap-1 text-xs font-semibold text-emerald-400">
                          <UserCheck className="h-3.5 w-3.5" />
                          <span>Reply Sent to X</span>
                        </div>
                      ) : (
                        <button
                          onClick={() => handleApproveReply(item.id)}
                          disabled={crisisState.isFrozen}
                          className={`flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-bold text-black transition-all ${
                            crisisState.isFrozen
                              ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                              : 'bg-gradient-to-r from-cyan-400 to-blue-500 hover:brightness-110 active:scale-95'
                          }`}
                        >
                          <Send className="h-3 w-3" />
                          <span>Approve & Send</span>
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
