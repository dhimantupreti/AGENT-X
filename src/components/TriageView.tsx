'use client';

import React, { useState } from 'react';
import {
  Siren,
  ShieldAlert,
  ShieldCheck,
  MessageCircle,
  AlertTriangle,
  Check,
  Copy,
  Send,
  UserCheck,
  Sparkles,
  X,
  Shield,
  Clock,
  Edit3,
  RefreshCw,
} from 'lucide-react';
import { CrisisState, PersonaConfig, ReplyDraft, ReplyOption } from '@/core/types';
import { MentionTriageItem } from '@/lib/adapters/x/interface';
import { InFlightReplyRecovery } from '@/lib/storage/sessionRecovery';

interface TriageViewProps {
  persona: PersonaConfig;
  crisisState: CrisisState;
  onToggleCrisis: () => void;
  initialInFlightReply?: InFlightReplyRecovery;
  onInFlightReplyChange?: (reply: InFlightReplyRecovery) => void;
  onClearInFlightReply?: (reason?: 'DISCARD' | 'SENT') => void;
}

export const TriageView: React.FC<TriageViewProps> = ({
  persona,
  crisisState,
  onToggleCrisis,
  initialInFlightReply,
  onInFlightReplyChange,
  onClearInFlightReply,
}) => {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Inbound mentions (Mock X stream)
  const [mentions] = useState<MentionTriageItem[]>([
    {
      id: 'm1',
      authorHandle: 'indie_dev_dan',
      text: '@solobuilder What made you choose BigQuery over Postgres for your telemetry pipeline?',
      sentiment: 'POSITIVE',
      urgency: 'HIGH',
      recommendedAction: 'REPLY',
      receivedAt: '12m ago',
    },
    {
      id: 'm2',
      authorHandle: 'cynical_founder',
      text: '@solobuilder Most solopreneurs fail because they take generic advice from Twitter gurus.',
      sentiment: 'NEGATIVE',
      urgency: 'MEDIUM',
      recommendedAction: 'REPLY',
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

  // Phase 2E1: Reply Drafting & Dispatch States
  const [activeMention, setActiveMention] = useState<MentionTriageItem | null>(null);
  const [activeReplyDraft, setActiveReplyDraft] = useState<ReplyDraft | null>(null);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [isSending, setIsSending] = useState<boolean>(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [sentReplies, setSentReplies] = useState<
    Record<string, { tweetId: string; text: string; sentAt: string }>
  >({});

  const handleCopyText = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  /**
   * Open reply drawer and trigger generation of 2 tone-matched options
   */
  const handleOpenReplyDrawer = async (mention: MentionTriageItem) => {
    setActiveMention(mention);
    setActionError(null);
    setIsGenerating(true);
    setActiveReplyDraft(null);

    try {
      const res = await fetch('/api/generate-reply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mention, persona, crisisState }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to generate reply options');
      }

      setActiveReplyDraft(data.replyDraft);
      onInFlightReplyChange?.({
        mentionId: mention.id,
        selectedOptionId: data.replyDraft.selectedOptionId,
        customizedText: data.replyDraft.selectedText,
        updatedAt: Date.now(),
      });
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : 'Error drafting reply');
    } finally {
      setIsGenerating(false);
    }
  };

  /**
   * Restore in-flight reply drawer from recovered session
   */
  const handleOpenReplyDrawerWithRecovery = async (
    mention: MentionTriageItem,
    recovery: InFlightReplyRecovery
  ) => {
    setActiveMention(mention);
    setActionError(null);
    setIsGenerating(true);
    setActiveReplyDraft(null);

    try {
      const res = await fetch('/api/generate-reply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mention, persona, crisisState }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to generate reply options');
      }

      const baseDraft: ReplyDraft = data.replyDraft;
      const customizedText = recovery.customizedText || baseDraft.selectedText;
      const isOverLimit = customizedText.length > 280;
      const forbiddenList = persona.tone.forbiddenPhrases || [];
      const hasForbidden = forbiddenList.some((p) => new RegExp(`\\b${p}\\b`, 'i').test(customizedText));
      const passed = !isOverLimit && !hasForbidden && !crisisState.isFrozen;

      setActiveReplyDraft({
        ...baseDraft,
        selectedOptionId: recovery.selectedOptionId || baseDraft.selectedOptionId,
        selectedText: customizedText,
        status: passed ? 'DRAFT' : 'REJECTED',
        approvedAt: undefined,
        approvedBy: undefined,
      });
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : 'Error restoring reply');
    } finally {
      setIsGenerating(false);
    }
  };

  // Restore in-flight reply if recovered session exists
  React.useEffect(() => {
    if (initialInFlightReply && !activeMention && !isGenerating) {
      const match = mentions.find((m) => m.id === initialInFlightReply.mentionId);
      if (match) {
        handleOpenReplyDrawerWithRecovery(match, initialInFlightReply);
      }
    }
  }, [initialInFlightReply]);

  /**
   * Creator selects an option: updates selected text and resets approval
   */
  const handleSelectOption = (opt: ReplyOption) => {
    if (!activeReplyDraft || !activeMention) return;
    setActiveReplyDraft({
      ...activeReplyDraft,
      selectedOptionId: opt.id,
      selectedText: opt.text,
      complianceReport: opt.complianceReport,
      status: 'DRAFT',
      approvedAt: undefined,
      approvedBy: undefined,
    });
    onInFlightReplyChange?.({
      mentionId: activeMention.id,
      selectedOptionId: opt.id,
      customizedText: opt.text,
      updatedAt: Date.now(),
    });
    setActionError(null);
  };

  /**
   * Phase 2E1 Critical Guardrail: Editing text clears approval automatically
   * and enforces real-time compliance evaluation.
   */
  const handleTextChange = (text: string) => {
    if (!activeReplyDraft || !activeMention) return;

    // Real-time compliance pre-flight
    const isOverLimit = text.length > 280;
    const forbiddenList = persona.tone.forbiddenPhrases || [];
    const hasForbidden = forbiddenList.some((p) => new RegExp(`\\b${p}\\b`, 'i').test(text));

    const passed = !isOverLimit && !hasForbidden && !crisisState.isFrozen;

    setActiveReplyDraft({
      ...activeReplyDraft,
      selectedText: text,
      // STRICT GUARDRAIL: Wipe approval on edit
      status: passed ? 'DRAFT' : 'REJECTED',
      approvedAt: undefined,
      approvedBy: undefined,
      complianceReport: {
        passed,
        score: passed ? 100 : 0,
        violations: isOverLimit
          ? [
              {
                ruleId: 'CHAR_LIMIT_EXCEEDED',
                severity: 'CRITICAL',
                category: 'X_POLICY',
                message: `Reply exceeds 280 characters (${text.length} chars).`,
              },
            ]
          : hasForbidden
          ? [
              {
                ruleId: 'FORBIDDEN_PHRASE_DETECTED',
                severity: 'CRITICAL',
                category: 'BRAND_SAFETY',
                message: 'Banned persona phrase detected in reply.',
              },
            ]
          : [],
        checkedAt: new Date().toISOString(),
      },
    });
    onInFlightReplyChange?.({
      mentionId: activeMention.id,
      selectedOptionId: activeReplyDraft.selectedOptionId,
      customizedText: text,
      updatedAt: Date.now(),
    });
    setActionError(null);
  };

  /**
   * Creator explicit approval gate
   */
  const handleApproveReply = () => {
    if (!activeReplyDraft) return;
    if (crisisState.isFrozen) {
      setActionError('Cannot approve reply while Crisis Mode is active.');
      return;
    }
    if (!activeReplyDraft.complianceReport?.passed) {
      setActionError('Cannot approve reply: compliance violations must be resolved first.');
      return;
    }

    setActiveReplyDraft({
      ...activeReplyDraft,
      status: 'APPROVED',
      approvedAt: new Date().toISOString(),
      approvedBy: 'CREATOR',
    });
    setActionError(null);
  };

  /**
   * Dispatch reply via isolated MockXClientAdapter
   */
  const handleSendReply = async () => {
    if (!activeReplyDraft || !activeMention) return;
    if (activeReplyDraft.status !== 'APPROVED') {
      setActionError('Approval Gate: Explicit creator approval is required before sending.');
      return;
    }

    setIsSending(true);
    setActionError(null);

    try {
      const res = await fetch('/api/send-reply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ replyDraft: activeReplyDraft, persona, crisisState }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to dispatch reply');
      }

      setSentReplies((prev) => ({
        ...prev,
        [activeMention.id]: {
          tweetId: data.result.tweetId || 'mock_reply_sent',
          text: activeReplyDraft.selectedText,
          sentAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      }));

      onClearInFlightReply?.('SENT');

      // Close drawer after short delay
      setTimeout(() => {
        setActiveMention(null);
        setActiveReplyDraft(null);
      }, 500);
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : 'Failed to send reply');
    } finally {
      setIsSending(false);
    }
  };

  const formatToneLabel = (toneStyle: string) => {
    switch (toneStyle) {
      case 'DIRECT_INSIGHT':
        return 'Direct Insight';
      case 'CONVERSATIONAL_FOLLOWUP':
        return 'Conversational Follow-Up';
      case 'CONTRARIAN_REFRAME':
        return 'Contrarian Reframe';
      case 'DIPLOMATIC_BOUNDARY':
        return 'Diplomatic Boundary';
      default:
        return toneStyle.replace('_', ' ');
    }
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
                  Emergency Sentinel: Crisis Guardian
                </span>
                <h2 className="text-sm font-bold text-white">Emergency Kill-Switch</h2>
              </div>
              <p className="text-[11px] text-gray-400 mt-0.5">
                {crisisState.isFrozen
                  ? 'All automated publishing and reply workflows are strictly FROZEN.'
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
              <span>EMERGENCY FREEZE (Halt All Posts & Replies)</span>
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
                <h3 className="text-xs font-bold text-white">Inbound Mentions Triage & Replies</h3>
              </div>
              <p className="text-[10px] text-gray-400 mt-0.5">
                Autonomous classification • In-character reply drafting • 100% human approved
              </p>
            </div>
          </div>
          <span className="rounded-full bg-cyan-500/10 px-2 py-0.5 text-[10px] font-mono text-cyan-300">
            {mentions.length} Inbound
          </span>
        </div>

        <div className="space-y-3">
          {mentions.map((item) => {
            const sent = sentReplies[item.id];

            return (
              <div
                key={item.id}
                className={`rounded-xl p-3.5 border transition-all ${
                  sent
                    ? 'bg-emerald-950/15 border-emerald-500/30'
                    : 'bg-black/20 border-white/5 hover:border-white/10'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
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

                <p className="text-xs text-gray-200 mb-3">{item.text}</p>

                {/* Sent Confirmation vs Draft Action */}
                {sent ? (
                  <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/20 p-2.5 space-y-1.5">
                    <div className="flex items-center justify-between text-[10px] font-semibold text-emerald-400">
                      <span className="flex items-center gap-1">
                        <UserCheck className="h-3 w-3" />
                        <span>Authorized by Creator • Reply Sent (Mock)</span>
                      </span>
                      <span className="font-mono text-[9px] text-gray-400">{sent.sentAt}</span>
                    </div>
                    <p className="text-xs text-emerald-100/90 leading-relaxed">{sent.text}</p>
                  </div>
                ) : (
                  <div className="flex items-center justify-between pt-1 border-t border-white/5">
                    <span className="text-[10px] text-gray-400">
                      {item.recommendedAction === 'IGNORE'
                        ? 'Low signal / potential bot'
                        : 'High-intent interaction opportunity'}
                    </span>

                    <button
                      onClick={() => handleOpenReplyDrawer(item)}
                      disabled={crisisState.isFrozen}
                      className={`flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-bold transition-all active:scale-95 ${
                        crisisState.isFrozen
                          ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
                          : 'bg-gradient-to-r from-cyan-400 to-blue-500 text-black hover:brightness-110 shadow-sm shadow-cyan-500/20'
                      }`}
                    >
                      <Sparkles className="h-3 w-3" />
                      <span>Draft Reply</span>
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Phase 2E1: Mobile-First Interactive Reply Bottom Sheet Drawer */}
      {activeMention && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 backdrop-blur-sm animate-fadeIn">
          <div className="glass-panel w-full max-w-lg rounded-t-3xl border-t border-cyan-500/30 p-5 space-y-4 max-h-[85vh] overflow-y-auto shadow-2xl">
            {/* Drawer Header */}
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-cyan-500/20 text-cyan-400">
                  <Sparkles className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-white">In-Character Reply Drafter</h3>
                  <p className="text-[10px] text-gray-400">Replying to @{activeMention.authorHandle}</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setActiveMention(null);
                  setActiveReplyDraft(null);
                  onClearInFlightReply?.();
                }}
                className="rounded-full p-1 text-gray-400 hover:text-white hover:bg-white/10"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Inbound Mention Context */}
            <div className="rounded-xl bg-black/30 border border-white/5 p-3 space-y-1">
              <div className="flex items-center justify-between text-[10px] text-gray-400">
                <span className="font-semibold text-gray-300">Inbound Mention</span>
                <span>@{activeMention.authorHandle}</span>
              </div>
              <p className="text-xs text-gray-200 leading-relaxed italic">"{activeMention.text}"</p>
            </div>

            {/* Error Banner */}
            {actionError && (
              <div className="rounded-xl bg-red-500/10 border border-red-500/20 p-2.5 text-xs text-red-300 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 shrink-0 text-red-400" />
                <span>{actionError}</span>
              </div>
            )}

            {/* Loading State */}
            {isGenerating && (
              <div className="rounded-xl bg-cyan-950/20 border border-cyan-500/20 p-6 flex flex-col items-center justify-center gap-2 text-center">
                <RefreshCw className="h-5 w-5 animate-spin text-cyan-400" />
                <p className="text-xs text-cyan-200 font-medium">
                  Synthesizing 2 tone-matched variations in @{persona.handle}'s voice...
                </p>
                <p className="text-[10px] text-gray-400">Evaluating tone tags and anti-drift policy</p>
              </div>
            )}

            {/* Reply Options Selection & Editing */}
            {activeReplyDraft && !isGenerating && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400">
                    Select Tone Variation:
                  </span>
                  <span className="text-[10px] text-cyan-400 font-medium">Exactly 2 Options Generated</span>
                </div>

                {/* 2 Tone-Matched Options Cards */}
                <div className="grid grid-cols-1 gap-2.5">
                  {activeReplyDraft.options.map((opt) => {
                    const isSelected = activeReplyDraft.selectedOptionId === opt.id;
                    const passed = opt.complianceReport?.passed ?? true;

                    return (
                      <div
                        key={opt.id}
                        onClick={() => handleSelectOption(opt)}
                        className={`rounded-xl p-3 border cursor-pointer transition-all ${
                          isSelected
                            ? 'bg-cyan-950/30 border-cyan-400 ring-1 ring-cyan-400/40'
                            : 'bg-black/20 border-white/10 hover:border-white/20'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1.5">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] font-mono font-bold text-cyan-300 bg-cyan-500/10 px-1.5 py-0.5 rounded border border-cyan-500/20">
                              {formatToneLabel(opt.toneStyle)}
                            </span>
                            {isSelected && (
                              <span className="text-[9px] font-semibold text-cyan-400 bg-cyan-500/20 px-1.5 py-0.2 rounded">
                                Selected
                              </span>
                            )}
                          </div>
                          <span
                            className={`text-[9px] font-semibold flex items-center gap-1 px-1.5 py-0.2 rounded ${
                              passed ? 'text-emerald-400 bg-emerald-500/10' : 'text-red-400 bg-red-500/10'
                            }`}
                          >
                            <Shield className="h-2.5 w-2.5" />
                            {passed ? '100% Policy Clean' : 'Policy Warning'}
                          </span>
                        </div>

                        <p className="text-xs text-gray-100 leading-relaxed mb-1.5">{opt.text}</p>
                        <p className="text-[10px] text-gray-400">{opt.rationale}</p>
                      </div>
                    );
                  })}
                </div>

                {/* Inline Editable Text Area */}
                <div className="space-y-1 pt-1">
                  <div className="flex items-center justify-between text-[10px] text-gray-400">
                    <span className="font-semibold text-gray-300 flex items-center gap-1">
                      <Edit3 className="h-3 w-3" />
                      <span>Fine-Tune Reply Text (Auto-Rechecks Policy):</span>
                    </span>
                    <span
                      className={`font-mono text-[10px] ${
                        activeReplyDraft.selectedText.length > 280
                          ? 'text-red-400 font-bold'
                          : 'text-gray-400'
                      }`}
                    >
                      {activeReplyDraft.selectedText.length}/280 chars
                    </span>
                  </div>

                  <textarea
                    rows={3}
                    value={activeReplyDraft.selectedText}
                    onChange={(e) => handleTextChange(e.target.value)}
                    placeholder="Refine in-character reply..."
                    className="w-full rounded-xl bg-black/40 border border-white/10 p-2.5 text-xs text-white focus:outline-none focus:border-cyan-500 transition-all resize-none"
                  />

                  {/* Guardrail Callout: Editing wipes approval */}
                  {activeReplyDraft.status === 'DRAFT' && (
                    <p className="text-[9px] text-gray-500">
                      * Edits reset creator approval. Approval must be re-confirmed before sending.
                    </p>
                  )}
                </div>

                {/* Two-Step Approval & Send Action Bar */}
                <div className="pt-2 border-t border-white/10 flex items-center justify-between gap-3">
                  {/* Status Indicator */}
                  <div className="text-[10px]">
                    {activeReplyDraft.status === 'APPROVED' ? (
                      <span className="flex items-center gap-1 font-semibold text-emerald-400">
                        <Check className="h-3.5 w-3.5" />
                        <span>Ready to Send</span>
                      </span>
                    ) : (
                      <span className="text-gray-400">Awaiting Creator Approval</span>
                    )}
                  </div>

                  <div className="flex items-center gap-2 flex-wrap justify-end">
                    {/* Discard reply draft */}
                    <button
                      type="button"
                      onClick={() => {
                        setActiveMention(null);
                        setActiveReplyDraft(null);
                        onClearInFlightReply?.('DISCARD');
                      }}
                      className="rounded-xl bg-white/5 border border-white/10 px-2.5 py-2 text-xs font-semibold text-gray-400 hover:text-white hover:bg-white/10 transition-all"
                    >
                      Discard reply draft
                    </button>

                    {/* Step 1: Approve Button */}
                    <button
                      onClick={handleApproveReply}
                      disabled={
                        crisisState.isFrozen ||
                        !activeReplyDraft.complianceReport?.passed ||
                        activeReplyDraft.status === 'APPROVED'
                      }
                      className={`flex items-center gap-1 rounded-xl px-3 py-2 text-xs font-bold transition-all ${
                        activeReplyDraft.status === 'APPROVED'
                          ? 'bg-white/10 text-gray-400 cursor-default'
                          : crisisState.isFrozen || !activeReplyDraft.complianceReport?.passed
                          ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
                          : 'bg-gradient-to-r from-cyan-400 to-blue-500 text-black hover:brightness-110 active:scale-95'
                      }`}
                    >
                      <UserCheck className="h-3.5 w-3.5" />
                      <span>{activeReplyDraft.status === 'APPROVED' ? 'Approved' : 'Approve Reply'}</span>
                    </button>

                    {/* Step 2: Send (Mock) Button */}
                    <button
                      onClick={handleSendReply}
                      disabled={
                        crisisState.isFrozen ||
                        activeReplyDraft.status !== 'APPROVED' ||
                        isSending
                      }
                      className={`flex items-center gap-1 rounded-xl px-4 py-2 text-xs font-bold transition-all ${
                        activeReplyDraft.status !== 'APPROVED' || crisisState.isFrozen || isSending
                          ? 'bg-zinc-800 text-zinc-600 cursor-not-allowed'
                          : 'bg-gradient-to-r from-emerald-500 to-teal-500 text-black hover:brightness-110 active:scale-95 shadow-lg shadow-emerald-500/20'
                      }`}
                    >
                      <Send className="h-3.5 w-3.5" />
                      <span>{isSending ? 'Sending...' : 'Send (Mock)'}</span>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
