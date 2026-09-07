'use client';

import React from 'react';
import { PenTool, Brain, Siren, BarChart3 } from 'lucide-react';

export type NavTab = 'drafts' | 'strategy' | 'triage' | 'analytics';

interface BottomNavProps {
  activeTab: NavTab;
  onTabChange: (tab: NavTab) => void;
  pendingDraftCount: number;
  crisisActive: boolean;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  activeTab,
  onTabChange,
  pendingDraftCount,
  crisisActive,
}) => {
  const navItems: {
    id: NavTab;
    label: string;
    stageHint: string;
    icon: React.FC<{ className?: string }>;
    badge?: number | boolean;
  }[] = [
    {
      id: 'strategy',
      label: 'Studio',
      stageHint: '1, 2, 3',
      icon: Brain,
    },
    {
      id: 'drafts',
      label: 'Queue',
      stageHint: '4, 5',
      icon: PenTool,
      badge: pendingDraftCount,
    },
    {
      id: 'triage',
      label: 'Engage',
      stageHint: '6',
      icon: Siren,
      badge: crisisActive,
    },
    {
      id: 'analytics',
      label: 'Signals',
      stageHint: '7, 8',
      icon: BarChart3,
    },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-white/10 bg-[#0c0e17]/95 backdrop-blur-xl pb-safe">
      <div className="mx-auto flex max-w-md items-center justify-around px-2 py-1.5">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className={`relative flex flex-col items-center gap-0.5 rounded-xl px-3 py-1 transition-all ${
                isActive
                  ? 'text-cyan-400 bg-white/5 font-semibold'
                  : 'text-gray-400 hover:text-gray-200 hover:bg-white/[0.02]'
              }`}
            >
              <div className="relative">
                <Icon className={`h-4.5 w-4.5 transition-transform ${isActive ? 'scale-110' : ''}`} />
                {typeof item.badge === 'number' && item.badge > 0 && (
                  <span className="absolute -right-2 -top-1.5 flex h-3.5 min-w-[14px] items-center justify-center rounded-full bg-amber-500 px-1 text-[8px] font-bold text-black" title="Drafts requiring creator approval">
                    {item.badge}
                  </span>
                )}
                {typeof item.badge === 'boolean' && item.badge && (
                  <span className="absolute -right-1 -top-1 flex h-2 w-2 rounded-full bg-red-500 ring-2 ring-black" />
                )}
              </div>
              <span className="text-[11px] tracking-tight">{item.label}</span>
              <span className="text-[8px] text-gray-500 font-mono tracking-tighter">[{item.stageHint}]</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
