'use client';

import React, { useState, Activity } from 'react';
import { Header } from '@/components/Header';
import { BottomNav, NavTab } from '@/components/BottomNav';
import { DraftCard } from '@/components/DraftCard';
import { GenerateModal } from '@/components/GenerateModal';
import { PersonaView } from '@/components/PersonaView';
import { TriageView } from '@/components/TriageView';
import { AnalyticsView } from '@/components/AnalyticsView';
import { WorkflowGuide } from '@/components/WorkflowGuide';
import { RecoveryAuditModal } from '@/components/RecoveryAuditModal';
import { INITIAL_PERSONA, INITIAL_DRAFTS, INITIAL_CRISIS_STATE, INITIAL_LIFECYCLE_EVENTS, INITIAL_RESEARCH_ITEMS } from '@/lib/state/seedData';
import { PersonaConfig, PostDraft, CrisisState, ResearchItem, DraftLifecycleEvent } from '@/core/types';
import { AgentOrchestrator } from '@/lib/orchestration/workflow';
import { useWorkspaceScroll } from '@/lib/hooks/useWorkspaceScroll';
import { useSessionRecovery } from '@/lib/hooks/useSessionRecovery';
import { Plus, Sparkles, AlertOctagon, CheckCircle2, Info } from 'lucide-react';

export default function Home() {
  const [activeTab, setActiveTab] = useState<NavTab>('strategy');
  const { handleTabChange } = useWorkspaceScroll(activeTab, setActiveTab);
  const {
    isHydrated,
    recoveredSession,
    isBannerVisible,
    dismissBanner,
    latestAudit,
    auditHistory,
    isAuditNoticeVisible,
    dismissAuditNotice,
    clearAuditTrail,
    saveActiveTab,
    saveFocusedDraft,
    unfocusDraft,
    resetWorkspace,
    saveQuickNoteBuffer,
    clearQuickNoteBuffer,
    saveInFlightReply,
    clearInFlightReply,
  } = useSessionRecovery();

  const [focusedDraftId, setFocusedDraftId] = useState<string | undefined>(undefined);
  const [persona, setPersona] = useState<PersonaConfig>(INITIAL_PERSONA);
  const [drafts, setDrafts] = useState<PostDraft[]>(INITIAL_DRAFTS);
  const [lifecycleEvents, setLifecycleEvents] = useState<DraftLifecycleEvent[]>(INITIAL_LIFECYCLE_EVENTS);
  const [crisisState, setCrisisState] = useState<CrisisState>(INITIAL_CRISIS_STATE);
  const [researchItems, setResearchItems] = useState<ResearchItem[]>(INITIAL_RESEARCH_ITEMS);
  const [isGenerateOpen, setIsGenerateOpen] = useState(false);
  const [isGuideOpen, setIsGuideOpen] = useState(false);
  const [isAuditModalOpen, setIsAuditModalOpen] = useState(false);
  const [selectedResearchSeed, setSelectedResearchSeed] = useState<ResearchItem | null>(null);
  const [bannerMessage, setBannerMessage] = useState<{ type: 'success' | 'warning'; text: string } | null>(null);

  // Restore recovered session state post-mount without SSR mismatch
  React.useEffect(() => {
    if (recoveredSession) {
      if (recoveredSession.lastActiveTab && recoveredSession.lastActiveTab !== 'strategy') {
        setActiveTab(recoveredSession.lastActiveTab);
      }
      if (recoveredSession.focusedDraftId) {
        setFocusedDraftId(recoveredSession.focusedDraftId);
      }
    }
  }, [recoveredSession]);

  const handleNavTabChange = (nextTab: NavTab) => {
    handleTabChange(nextTab);
    saveActiveTab(nextTab);
  };

  const handleFocusDraft = (draftId: string) => {
    setFocusedDraftId(draftId);
    saveFocusedDraft(draftId);
  };

  const handleUnfocusDraft = () => {
    setFocusedDraftId(undefined);
    unfocusDraft();
    showNotification('success', 'Draft focus cleared.');
  };

  const handleStartFreshCurrentWorkspace = () => {
    resetWorkspace(activeTab);
    if (activeTab === 'drafts') {
      setFocusedDraftId(undefined);
    }
    const workspaceName =
      activeTab === 'strategy'
        ? 'Studio'
        : activeTab === 'drafts'
        ? 'Queue'
        : activeTab === 'triage'
        ? 'Engage'
        : 'Signals';
    showNotification('success', `Clean state restored: Start fresh in ${workspaceName} complete.`);
  };

  const showNotification = (type: 'success' | 'warning', text: string) => {
    setBannerMessage({ type, text });
    setTimeout(() => setBannerMessage(null), 4000);
  };

  const handleToggleCrisis = () => {
    const nextFrozen = !crisisState.isFrozen;
    setCrisisState({
      isFrozen: nextFrozen,
      reason: nextFrozen ? 'Manual Creator Kill-Switch Triggered' : undefined,
      activatedAt: nextFrozen ? new Date().toISOString() : undefined,
      activatedBy: 'MANUAL_USER',
    });

    if (nextFrozen) {
      showNotification('warning', 'CRISIS PAUSE ACTIVATED: All publishing halted.');
    } else {
      showNotification('success', 'Radar Normal: Publishing controls restored.');
    }
  };

  const handleApproveDraft = (id: string) => {
    const target = drafts.find((d) => d.id === id);
    setDrafts((prev) =>
      prev.map((d) =>
        d.id === id
          ? {
              ...d,
              status: 'APPROVED',
              approvedBy: 'CREATOR',
              approvedAt: new Date().toISOString(),
            }
          : d
      )
    );
    if (target) {
      setLifecycleEvents((prev) => [
        ...prev,
        {
          eventId: `evt_app_${Date.now()}`,
          draftId: id,
          authorHandle: persona.handle,
          eventType: 'APPROVED',
          pillarId: target.pillarId,
          selectedHookArchetype: target.selectedHookArchetype,
          isHookSwapped: false,
          createdAt: new Date().toISOString(),
        },
      ]);
    }
    showNotification('success', 'Draft authorized! It is now unlocked for publishing to X.');
  };

  const handleRejectDraft = (id: string) => {
    const target = drafts.find((d) => d.id === id);
    setDrafts((prev) => prev.filter((d) => d.id !== id));
    if (target) {
      if (focusedDraftId === id) {
        setFocusedDraftId(undefined);
        saveFocusedDraft(undefined);
      }
      setLifecycleEvents((prev) => [
        ...prev,
        {
          eventId: `evt_dsm_${Date.now()}`,
          draftId: id,
          authorHandle: persona.handle,
          eventType: 'DISMISSED',
          pillarId: target.pillarId,
          selectedHookArchetype: target.selectedHookArchetype,
          isHookSwapped: false,
          createdAt: new Date().toISOString(),
        },
      ]);
    }
    showNotification('warning', 'Draft removed from queue.');
  };

  const handleSwapHook = (draftId: string, newHookId: string) => {
    const target = drafts.find((d) => d.id === draftId);
    setDrafts((prev) =>
      prev.map((d) => {
        if (d.id !== draftId) return d;
        const wasApproved = d.status === 'APPROVED';
        const updated = AgentOrchestrator.swapDraftHook(d, newHookId, persona, crisisState);

        if (wasApproved) {
          showNotification(
            'warning',
            'Hook swapped: Previous approval revoked. Re-approval required before publishing.'
          );
        } else {
          showNotification(
            'success',
            `Hook switched to ${updated.selectedHookArchetype || 'new variation'}. Compliance verified.`
          );
        }
        return updated;
      })
    );

    if (target) {
      const newVar = target.hookVariations?.find((h) => h.id === newHookId);
      setLifecycleEvents((prev) => [
        ...prev,
        {
          eventId: `evt_swap_${Date.now()}`,
          draftId,
          authorHandle: persona.handle,
          eventType: 'HOOK_SWAPPED',
          pillarId: target.pillarId,
          initialHookArchetype: target.selectedHookArchetype,
          selectedHookArchetype: newVar?.archetype || target.selectedHookArchetype,
          isHookSwapped: true,
          createdAt: new Date().toISOString(),
        },
      ]);
    }
  };

  const handlePublishDraft = async (draft: PostDraft) => {
    if (draft.status !== 'APPROVED') {
      showNotification('warning', 'Action blocked: Draft must be approved before publishing.');
      return;
    }

    try {
      const res = await fetch('/api/publish-draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ draft, persona, crisisState }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to publish draft');
      }

      if (focusedDraftId === draft.id) {
        setFocusedDraftId(undefined);
        unfocusDraft('PUBLISHED');
      }

      setDrafts((prev) =>
        prev.map((d) => (d.id === draft.id ? data.draft : d))
      );
      setLifecycleEvents((prev) => [
        ...prev,
        {
          eventId: `evt_pub_${Date.now()}`,
          draftId: draft.id,
          authorHandle: persona.handle,
          eventType: 'PUBLISHED',
          pillarId: draft.pillarId,
          selectedHookArchetype: draft.selectedHookArchetype,
          isHookSwapped: false,
          createdAt: new Date().toISOString(),
        },
      ]);
      showNotification('success', `Published to X! (ID: ${data.result.tweetId})`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error publishing draft';
      showNotification('warning', msg);
    }
  };

  const handleDraftFromResearch = (item: ResearchItem) => {
    setSelectedResearchSeed(item);
    setIsGenerateOpen(true);
  };

  const handlePersonaEvolved = (newPersona: PersonaConfig) => {
    setPersona(newPersona);
    showNotification('success', `Stage 8 Complete: Persona safely evolved to v${newPersona.version}!`);
  };

  const pendingCount = drafts.filter((d) => d.status !== 'APPROVED' && d.status !== 'PUBLISHED').length;

  return (
    <div className="min-h-screen bg-[#090a0f] text-gray-100 flex flex-col justify-between selection:bg-cyan-500 selection:text-black">
      {/* Fixed Sticky Header with Workflow Guide Trigger */}
      <Header
        persona={persona}
        crisisState={crisisState}
        onToggleCrisis={handleToggleCrisis}
        onOpenGuide={() => setIsGuideOpen(true)}
      />

      {/* Temporary Toast Banner */}
      {bannerMessage && (
        <div className="fixed top-16 left-0 right-0 z-50 px-4 pointer-events-none">
          <div
            className={`mx-auto max-w-md rounded-2xl p-3 shadow-2xl flex items-center gap-2 text-xs font-semibold backdrop-blur-xl border ${
              bannerMessage.type === 'success'
                ? 'bg-emerald-950/90 border-emerald-500/40 text-emerald-200 shadow-emerald-500/10'
                : 'bg-red-950/90 border-red-500/40 text-red-200 shadow-red-500/10'
            }`}
          >
            {bannerMessage.type === 'success' ? (
              <CheckCircle2 className="h-4 w-4 text-emerald-400 flex-shrink-0" />
            ) : (
              <AlertOctagon className="h-4 w-4 text-red-400 flex-shrink-0" />
            )}
            <span>{bannerMessage.text}</span>
          </div>
        </div>
      )}

      {/* Main Content Area (Mobile Viewport) */}
      <main className="mx-auto w-full max-w-md flex-1 px-4 pt-4">
        {/* Persistent Dismissible Informational Banner for Expired/Skipped Recovery */}
        {isAuditNoticeVisible && latestAudit && (
          <div className="mb-3 rounded-xl bg-amber-950/40 border border-amber-500/40 p-3 text-xs text-amber-200 shadow-md backdrop-blur-md space-y-2">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 truncate">
                <Info className="h-4 w-4 text-amber-400 shrink-0" />
                <span className="truncate">
                  {latestAudit.reason === 'TTL_EXPIRED'
                    ? 'Previous draft/note was removed from recovery (24h limit reached)'
                    : latestAudit.reason === 'CORRUPT_SCHEMA'
                    ? 'Local recovery data was reset to maintain stability'
                    : 'Previous session state was cleared from recovery'}
                </span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsAuditModalOpen(true)}
                  className="text-[10px] font-semibold text-amber-300 underline hover:text-white transition-all"
                >
                  Why?
                </button>
                <button
                  type="button"
                  onClick={dismissAuditNotice}
                  className="text-[10px] font-semibold text-gray-400 hover:text-white px-2 py-0.5 rounded hover:bg-white/10 transition-all"
                >
                  Dismiss
                </button>
              </div>
            </div>
            <div className="text-[11px] text-amber-300/80 leading-snug">
              Approved queue posts and publishing safeguards remain unaffected.
            </div>
          </div>
        )}

        {/* Lightweight Resume Session Banner */}
        {isBannerVisible && recoveredSession && (
          <div className="mb-3 rounded-xl bg-cyan-950/40 border border-cyan-500/40 p-3 text-xs text-cyan-200 shadow-md backdrop-blur-md space-y-2">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 truncate">
                <span className="flex h-2 w-2 rounded-full bg-cyan-400 animate-pulse shrink-0" />
                <span className="truncate">
                  Resumed session in{' '}
                  <strong className="text-white capitalize">
                    {activeTab === 'strategy'
                      ? 'Studio'
                      : activeTab === 'drafts'
                      ? 'Queue'
                      : activeTab === 'triage'
                      ? 'Engage'
                      : 'Signals'}
                  </strong>
                  {focusedDraftId ? ' • Draft focused' : ''}
                </span>
              </div>
              <button
                type="button"
                onClick={dismissBanner}
                className="text-[10px] font-semibold text-gray-400 hover:text-white px-2 py-0.5 rounded hover:bg-white/10 transition-all shrink-0"
              >
                Dismiss
              </button>
            </div>

            {/* Hygiene Actions Row: Spatially separated from Dismiss */}
            <div className="flex items-center gap-2 pt-1.5 border-t border-white/5 flex-wrap">
              {focusedDraftId && (
                <button
                  type="button"
                  onClick={handleUnfocusDraft}
                  className="rounded-lg bg-cyan-500/15 border border-cyan-500/30 px-2.5 py-1 text-[10px] font-semibold text-cyan-300 hover:bg-cyan-500/25 active:scale-95 transition-all"
                >
                  Unfocus draft
                </button>
              )}
              <button
                type="button"
                onClick={handleStartFreshCurrentWorkspace}
                className="rounded-lg bg-white/5 border border-white/10 px-2.5 py-1 text-[10px] font-semibold text-gray-300 hover:text-white hover:bg-white/10 active:scale-95 transition-all"
              >
                Start fresh in{' '}
                {activeTab === 'strategy'
                  ? 'Studio'
                  : activeTab === 'drafts'
                  ? 'Queue'
                  : activeTab === 'triage'
                  ? 'Engage'
                  : 'Signals'}
              </button>
              <button
                type="button"
                onClick={() => setIsAuditModalOpen(true)}
                className="rounded-lg bg-white/5 border border-white/10 px-2.5 py-1 text-[10px] font-semibold text-gray-400 hover:text-white hover:bg-white/10 active:scale-95 transition-all"
              >
                Audit Trail
              </button>
            </div>
          </div>
        )}

        {/* Crisis Active Alert Box */}
        {crisisState.isFrozen && (
          <div className="mb-4 rounded-2xl bg-red-950/50 border border-red-500/40 p-3.5 flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-red-500/20 text-red-400 flex-shrink-0">
              <AlertOctagon className="h-5 w-5" />
            </div>
            <div className="text-xs">
              <div className="font-bold text-red-200">Crisis Mode Active (Emergency Sentinel)</div>
              <div className="text-red-300/80 mt-0.5">All scheduled and autonomous publishing queues are strictly paused.</div>
            </div>
          </div>
        )}

        {/* Tab 1: Studio Hub (Stages 1, 2, 3: Persona, Strategy, Radar) */}
        <Activity mode={activeTab === 'strategy' ? 'visible' : 'hidden'}>
          <div className={activeTab === 'strategy' ? 'block' : 'hidden'} id="workspace-studio">
            <PersonaView
              persona={persona}
              onUpdatePersona={setPersona}
              onDraftFromResearch={handleDraftFromResearch}
              researchItems={researchItems}
              onAddResearchItem={(item) => setResearchItems((prev) => [item, ...prev])}
              initialQuickNote={recoveredSession?.quickNoteBuffer}
              onQuickNoteChange={saveQuickNoteBuffer}
              onClearQuickNote={clearQuickNoteBuffer}
            />
          </div>
        </Activity>

        {/* Tab 2: Queue Hub (Stages 4, 5: Drafter, Posting Gate) */}
        <Activity mode={activeTab === 'drafts' ? 'visible' : 'hidden'}>
          <div className={activeTab === 'drafts' ? 'block' : 'hidden'} id="workspace-queue">
            <div className="space-y-4 pb-24">
              {/* Top Bar with Trigger Drafter Button */}
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">
                      Stage 5: Posting Gate
                    </span>
                    <h1 className="text-base font-black tracking-tight text-white">Review Queue</h1>
                  </div>
                  <p className="text-[11px] text-gray-400 mt-0.5">
                    Autonomous drafting complete • Human approval required to publish
                  </p>
                </div>

                <button
                  onClick={() => {
                    setSelectedResearchSeed(null);
                    setIsGenerateOpen(true);
                  }}
                  className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-cyan-400 to-blue-500 px-3 py-1.5 text-xs font-bold text-black shadow-md shadow-cyan-500/20 hover:brightness-110 active:scale-95 transition-all"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>New Draft</span>
                </button>
              </div>

              {/* List of Drafts */}
              {drafts.length === 0 ? (
                <div className="glass-panel rounded-2xl p-8 text-center mt-6">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-white/5 text-gray-400 mb-3">
                    <Sparkles className="h-6 w-6 text-cyan-400" />
                  </div>
                  <h3 className="text-sm font-bold text-white">No pending drafts</h3>
                  <p className="text-xs text-gray-400 mt-1 max-w-xs mx-auto">
                    Click 'New Draft' to trigger Stage 4 autonomous drafting. Generated drafts will pass automated compliance and await your Stage 5 approval here.
                  </p>
                  <button
                    onClick={() => {
                      setSelectedResearchSeed(null);
                      setIsGenerateOpen(true);
                    }}
                    className="mt-4 rounded-xl bg-white/10 px-4 py-2 text-xs font-semibold text-white hover:bg-white/20 transition-all"
                  >
                    Generate First Post
                  </button>
                </div>
              ) : (
                <div className="space-y-3.5">
                  {drafts.map((draft) => (
                    <DraftCard
                      key={draft.id}
                      draft={draft}
                      persona={persona}
                      crisisState={crisisState}
                      onApprove={handleApproveDraft}
                      onPublish={handlePublishDraft}
                      onReject={handleRejectDraft}
                      onSwapHook={handleSwapHook}
                      isFocused={focusedDraftId === draft.id}
                      onFocus={handleFocusDraft}
                      onUnfocus={handleUnfocusDraft}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        </Activity>

        {/* Tab 3: Engage Hub (Stage 6: Engagement Triage & Replies, Crisis Sentinel) */}
        <Activity mode={activeTab === 'triage' ? 'visible' : 'hidden'}>
          <div className={activeTab === 'triage' ? 'block' : 'hidden'} id="workspace-engage">
            <TriageView
              persona={persona}
              crisisState={crisisState}
              onToggleCrisis={handleToggleCrisis}
              initialInFlightReply={recoveredSession?.inFlightReply}
              onInFlightReplyChange={saveInFlightReply}
              onClearInFlightReply={clearInFlightReply}
            />
          </div>
        </Activity>

        {/* Tab 4: Signals Hub (Stages 7, 8: Telemetry & Evolution) */}
        <Activity mode={activeTab === 'analytics' ? 'visible' : 'hidden'}>
          <div className={activeTab === 'analytics' ? 'block' : 'hidden'} id="workspace-signals">
            <AnalyticsView
              persona={persona}
              onPersonaEvolved={handlePersonaEvolved}
              lifecycleEvents={lifecycleEvents}
              drafts={drafts}
            />
          </div>
        </Activity>
      </main>

      {/* Autonomous Grok Generation Drawer */}
      <GenerateModal
        isOpen={isGenerateOpen}
        onClose={() => {
          setIsGenerateOpen(false);
          setSelectedResearchSeed(null);
        }}
        persona={persona}
        crisisState={crisisState}
        seedResearch={selectedResearchSeed}
        onClearSeed={() => setSelectedResearchSeed(null)}
        onCommitDraft={(newDraft) => {
          setDrafts((prev) => [newDraft, ...prev]);
          setLifecycleEvents((prev) => [
            ...prev,
            {
              eventId: `evt_gen_${Date.now()}`,
              draftId: newDraft.id,
              authorHandle: persona.handle,
              eventType: 'DRAFT_CREATED',
              pillarId: newDraft.pillarId,
              selectedHookArchetype: newDraft.selectedHookArchetype,
              isHookSwapped: false,
              createdAt: new Date().toISOString(),
            },
          ]);
          setIsGenerateOpen(false);
          setSelectedResearchSeed(null);
          showNotification('success', 'Stage 4 complete: Draft created and awaiting your Stage 5 approval.');
        }}
      />

      {/* 8-Stage Workflow Guide Modal */}
      <WorkflowGuide
        isOpen={isGuideOpen}
        onClose={() => setIsGuideOpen(false)}
      />

      {/* Lightweight Recovery Audit Trail Modal */}
      <RecoveryAuditModal
        isOpen={isAuditModalOpen}
        onClose={() => setIsAuditModalOpen(false)}
        auditHistory={auditHistory}
        onClearHistory={clearAuditTrail}
      />

      {/* Mobile Bottom Dock */}
      <BottomNav
        activeTab={activeTab}
        onTabChange={handleNavTabChange}
        pendingDraftCount={pendingCount}
        crisisActive={crisisState.isFrozen}
      />
    </div>
  );
}
