'use client';

import React from 'react';
import { ShieldAlert, ShieldCheck, Zap, Layers } from 'lucide-react';
import { PersonaConfig, CrisisState } from '@/core/types';

interface HeaderProps {
  persona: PersonaConfig;
  crisisState: CrisisState;
  onToggleCrisis: () => void;
  onOpenGuide: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  persona,
  crisisState,
  onToggleCrisis,
  onOpenGuide,
}) => {
  return (
    <header className="sticky top-0 z-30 w-full border-b border-white/10 bg-[#090a0f]/80 backdrop-blur-xl px-4 py-2.5">
      <div className="mx-auto flex max-w-md items-center justify-between">
        {/* Brand & Version */}
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-cyan-500 via-blue-600 to-purple-600 shadow-md shadow-cyan-500/20">
            <Zap className="h-5 w-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-base font-bold tracking-tight text-white">AGENTX</span>
              <span className="rounded-full bg-blue-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-blue-400 border border-blue-500/20">
                v{persona.version}
              </span>
            </div>
            <p className="text-xs text-gray-400">@{persona.handle}</p>
          </div>
        </div>

        {/* Workflow Guide & Crisis Status Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={onOpenGuide}
            className="flex items-center gap-1 rounded-full bg-white/5 border border-white/10 px-2.5 py-1 text-[10px] font-semibold text-gray-300 hover:bg-white/10 hover:text-white transition-all"
            title="Inspect 10-step product workflow and approval gates"
          >
            <Layers className="h-3 w-3 text-cyan-400" />
            <span>Workflow (10)</span>
          </button>

          <button
            onClick={onToggleCrisis}
            className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium transition-all ${
              crisisState.isFrozen
                ? 'crisis-pulse border border-red-500/50 bg-red-500/20 text-red-300 hover:bg-red-500/30'
                : 'border border-emerald-500/20 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20'
            }`}
            title={crisisState.isFrozen ? 'Click to deactivate Crisis Pause' : 'Click to activate Emergency Pause'}
          >
            {crisisState.isFrozen ? (
              <>
                <ShieldAlert className="h-3.5 w-3.5 text-red-400" />
                <span>PAUSED</span>
              </>
            ) : (
              <>
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
                <span>LIVE</span>
              </>
            )}
          </button>
        </div>
      </div>
    </header>
  );
};
