'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { NavTab } from '@/components/BottomNav';
import { ResearchCategory } from '@/core/types';
import {
  sessionRecoveryStorage,
  RecoveredSessionState,
  QuickNoteRecovery,
  InFlightReplyRecovery,
  RecoveryAuditEntry,
} from '@/lib/storage/sessionRecovery';

export function useSessionRecovery() {
  const [isHydrated, setIsHydrated] = useState(false);
  const [recoveredSession, setRecoveredSession] = useState<RecoveredSessionState | null>(null);
  const [isBannerVisible, setIsBannerVisible] = useState(false);
  const [latestAudit, setLatestAudit] = useState<RecoveryAuditEntry | null>(null);
  const [auditHistory, setAuditHistory] = useState<RecoveryAuditEntry[]>([]);
  const [isAuditNoticeVisible, setIsAuditNoticeVisible] = useState(false);

  // Debounce ref for quick note typing
  const quickNoteDebounceRef = useRef<NodeJS.Timeout | null>(null);

  const refreshAudit = useCallback(() => {
    const latest = sessionRecoveryStorage.getLatestAudit();
    const history = sessionRecoveryStorage.getAuditHistory();
    setLatestAudit(latest);
    setAuditHistory(history);
  }, []);

  useEffect(() => {
    // Client-side only read after mount to prevent hydration mismatch
    const state = sessionRecoveryStorage.loadSessionState();
    const latest = sessionRecoveryStorage.getLatestAudit();
    const history = sessionRecoveryStorage.getAuditHistory();
    setLatestAudit(latest);
    setAuditHistory(history);

    if (state) {
      setRecoveredSession(state);
      // Show recovery banner if we recovered non-trivial state (e.g. non-default tab, focused draft, or active buffer)
      if (
        state.lastActiveTab !== 'strategy' ||
        state.focusedDraftId ||
        (state.quickNoteBuffer && state.quickNoteBuffer.rawNoteInput.trim().length > 0) ||
        state.inFlightReply
      ) {
        setIsBannerVisible(true);
      }
    } else if (latest && (latest.reason === 'TTL_EXPIRED' || latest.reason === 'CORRUPT_SCHEMA')) {
      // If no recovery snapshot was restored because it expired or was corrupt, show persistent informational notice
      setIsAuditNoticeVisible(true);
    }
    setIsHydrated(true);
  }, []);

  const dismissBanner = useCallback(() => {
    setIsBannerVisible(false);
  }, []);

  const dismissAuditNotice = useCallback(() => {
    setIsAuditNoticeVisible(false);
  }, []);

  const clearAuditTrail = useCallback(() => {
    sessionRecoveryStorage.clearAuditHistory();
    setLatestAudit(null);
    setAuditHistory([]);
    setIsAuditNoticeVisible(false);
  }, []);

  const saveActiveTab = useCallback((tab: NavTab) => {
    sessionRecoveryStorage.saveSessionState({ lastActiveTab: tab });
  }, []);

  const saveFocusedDraft = useCallback((draftId?: string) => {
    sessionRecoveryStorage.saveSessionState({ focusedDraftId: draftId });
  }, []);

  const saveQuickNoteBuffer = useCallback((rawNoteInput: string, categoryOverride?: ResearchCategory) => {
    if (quickNoteDebounceRef.current) {
      clearTimeout(quickNoteDebounceRef.current);
    }
    quickNoteDebounceRef.current = setTimeout(() => {
      if (rawNoteInput.trim().length === 0) {
        sessionRecoveryStorage.clearQuickNote();
        refreshAudit();
      } else {
        const noteRecovery: QuickNoteRecovery = {
          rawNoteInput,
          categoryOverride,
          updatedAt: Date.now(),
        };
        sessionRecoveryStorage.saveSessionState({ quickNoteBuffer: noteRecovery });
      }
    }, 250);
  }, [refreshAudit]);

  const clearQuickNoteBuffer = useCallback(() => {
    if (quickNoteDebounceRef.current) {
      clearTimeout(quickNoteDebounceRef.current);
    }
    sessionRecoveryStorage.clearQuickNote('DISCARD');
    refreshAudit();
  }, [refreshAudit]);

  const saveInFlightReply = useCallback((reply: InFlightReplyRecovery) => {
    sessionRecoveryStorage.saveSessionState({ inFlightReply: reply });
  }, []);

  const clearInFlightReply = useCallback((reason: 'DISCARD' | 'SENT' = 'DISCARD') => {
    sessionRecoveryStorage.clearInFlightReply(reason);
    setRecoveredSession((prev) => (prev ? { ...prev, inFlightReply: undefined } : null));
    refreshAudit();
  }, [refreshAudit]);

  const unfocusDraft = useCallback((reason: 'UNFOCUS' | 'PUBLISHED' = 'UNFOCUS') => {
    sessionRecoveryStorage.clearFocusedDraft(reason);
    setRecoveredSession((prev) => (prev ? { ...prev, focusedDraftId: undefined } : null));
    refreshAudit();
  }, [refreshAudit]);

  const resetWorkspace = useCallback((tab: NavTab) => {
    sessionRecoveryStorage.resetWorkspaceState(tab);
    setRecoveredSession((prev) => {
      if (!prev) return null;
      const updated = { ...prev };
      if (tab === 'strategy') delete updated.quickNoteBuffer;
      if (tab === 'drafts') delete updated.focusedDraftId;
      if (tab === 'triage') delete updated.inFlightReply;
      return updated;
    });
    refreshAudit();
  }, [refreshAudit]);

  const clearRecovery = useCallback(() => {
    sessionRecoveryStorage.clearSessionState();
    setRecoveredSession(null);
    setIsBannerVisible(false);
  }, []);

  return {
    isHydrated,
    recoveredSession,
    isBannerVisible,
    dismissBanner,
    latestAudit,
    auditHistory,
    isAuditNoticeVisible,
    dismissAuditNotice,
    clearAuditTrail,
    refreshAudit,
    saveActiveTab,
    saveFocusedDraft,
    unfocusDraft,
    resetWorkspace,
    saveQuickNoteBuffer,
    clearQuickNoteBuffer,
    saveInFlightReply,
    clearInFlightReply,
    clearRecovery,
  };
}
