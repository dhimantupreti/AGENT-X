'use client';

import React, { useState } from 'react';
import { Header } from '@/components/Header';
import { BottomNav, NavTab } from '@/components/BottomNav';
import { DraftCard } from '@/components/DraftCard';
import { GenerateModal } from '@/components/GenerateModal';
import { PersonaView } from '@/components/PersonaView';
import { TriageView } from '@/components/TriageView';
import { AnalyticsView } from '@/components/AnalyticsView';
import { WorkflowGuide } from '@/components/WorkflowGuide';
import { INITIAL_PERSONA, INITIAL_DRAFTS, INITIAL_CRISIS_STATE } from '@/lib/state/seedData';
import { PersonaConfig, PostDraft, CrisisState } from '@/core/types';
import { Plus, Sparkles, AlertOctagon, CheckCircle2 } from 'lucide-react';

export default function Home() {
  const [activeTab, setActiveTab] = useState<NavTab>('strategy');
  const [persona, setPersona] = useState<PersonaConfig>(INITIAL_PERSONA);
  const [drafts, setDrafts] = useState<PostDraft[]>(INITIAL_DRAFTS);
  const [crisisState, setCrisisState] = useState<CrisisState>(INITIAL_CRISIS_STATE);
  const [isGenerateOpen, setIsGenerateOpen] = useState(false);
  const [isGuideOpen, setIsGuideOpen] = useState(false);
  const [bannerMessage, setBannerMessage] = useState<{ type: 'success' | 'warning'; text: string } | null>(null);

  const showNotification = (type: 'success' | 'warning', text: string) => {
    setBannerMessage({ type, text });
    setTimeout(() => setBannerMessage(null), 3500);
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
    showNotification('success', 'Draft authorized! It is now unlocked for publishing to X.');
  };

  const handleRejectDraft = (id: string) => {
    setDrafts((prev) => prev.filter((d) => d.id !== id));
    showNotification('warning', 'Draft removed from queue.');
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

      setDrafts((prev) =>
        prev.map((d) => (d.id === draft.id ? data.draft : d))
      );
      showNotification('success', `Published to X! (ID: ${data.result.tweetId})`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error publishing draft';
      showNotification('warning', msg);
    }
  };

  const handleGenerateDraft = async (
    pillarId: string,
    options: { topic?: string; format: 'SINGLE_TWEET' | 'THREAD' }
  ) => {
    try {
      const res = await fetch('/api/generate-draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ persona, crisisState, pillarId, options }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to generate draft');
      }

      if (data.draft) {
        setDrafts((prev) => [data.draft, ...prev]);
        showNotification('success', 'Stage 3 & 4 complete: Draft created and awaiting your approval.');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Generation failed';
      showNotification('warning', msg);
    }
  };

  const handlePersonaEvolved = (newPersona: PersonaConfig) => {
    setPersona(newPersona);
    showNotification('success', `Stage 10 Complete: Persona safely evolved to v${newPersona.version}!`);
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
        {/* Crisis Active Alert Box */}
        {crisisState.isFrozen && (
          <div className="mb-4 rounded-2xl bg-red-950/50 border border-red-500/40 p-3.5 flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-red-500/20 text-red-400 flex-shrink-0">
              <AlertOctagon className="h-5 w-5" />
            </div>
            <div className="text-xs">
              <div className="font-bold text-red-200">Crisis Mode Active (Stage 7)</div>
              <div className="text-red-300/80 mt-0.5">All scheduled and autonomous publishing queues are strictly paused.</div>
            </div>
          </div>
        )}

        {/* Tab 1: Strategy Hub (Stages 1, 2, 8: Research, Strategy, Persona) */}
        {activeTab === 'strategy' && (
          <PersonaView persona={persona} onUpdatePersona={setPersona} />
        )}

        {/* Tab 2: Posting Queue (Stages 3, 4, 5: Create, Compliance, Posting Gate) */}
        {activeTab === 'drafts' && (
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
                onClick={() => setIsGenerateOpen(true)}
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
                  Click 'New Draft' to trigger Stage 3 autonomous drafting. Generated drafts will pass Stage 4 compliance and await your approval here.
                </p>
                <button
                  onClick={() => setIsGenerateOpen(true)}
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
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab 3: Radar Hub (Stages 6, 7: Engagement Triage & Crisis Guardian) */}
        {activeTab === 'triage' && (
          <TriageView crisisState={crisisState} onToggleCrisis={handleToggleCrisis} />
        )}

        {/* Tab 4: Signals Hub (Stages 9, 10: BigQuery Analytics & Safe Evolution) */}
        {activeTab === 'analytics' && (
          <AnalyticsView persona={persona} onPersonaEvolved={handlePersonaEvolved} />
        )}
      </main>

      {/* Autonomous Grok Generation Drawer */}
      <GenerateModal
        isOpen={isGenerateOpen}
        onClose={() => setIsGenerateOpen(false)}
        persona={persona}
        onGenerate={handleGenerateDraft}
      />

      {/* 10-Step Workflow Guide Modal */}
      <WorkflowGuide
        isOpen={isGuideOpen}
        onClose={() => setIsGuideOpen(false)}
      />

      {/* Mobile Bottom Dock */}
      <BottomNav
        activeTab={activeTab}
        onTabChange={setActiveTab}
        pendingDraftCount={pendingCount}
        crisisActive={crisisState.isFrozen}
      />
    </div>
  );
}
