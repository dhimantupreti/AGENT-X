'use client';

import { useEffect, useRef, useCallback } from 'react';
import { NavTab } from '@/components/BottomNav';

export function useWorkspaceScroll(activeTab: NavTab, onTabChange: (tab: NavTab) => void) {
  const scrollPositionsRef = useRef<Record<NavTab, number>>({
    strategy: 0,
    drafts: 0,
    triage: 0,
    analytics: 0,
  });

  const handleTabChange = useCallback(
    (nextTab: NavTab) => {
      if (typeof window !== 'undefined') {
        scrollPositionsRef.current[activeTab] = window.scrollY;
      }
      onTabChange(nextTab);
    },
    [activeTab, onTabChange]
  );

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedY = scrollPositionsRef.current[activeTab] || 0;
      // Restore scroll coordinate on next render frame
      requestAnimationFrame(() => {
        window.scrollTo({
          top: savedY,
          behavior: 'instant' as ScrollBehavior,
        });
      });
    }
  }, [activeTab]);

  const getSavedScroll = useCallback(
    (tab: NavTab) => scrollPositionsRef.current[tab] || 0,
    []
  );

  return {
    handleTabChange,
    getSavedScroll,
  };
}
