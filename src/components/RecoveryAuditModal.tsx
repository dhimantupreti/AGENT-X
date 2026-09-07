'use client';

import React from 'react';
import { X, Shield, Clock, Info, CheckCircle, Trash2 } from 'lucide-react';
import { RecoveryAuditEntry } from '@/lib/storage/sessionRecovery';

interface RecoveryAuditModalProps {
  isOpen: boolean;
  onClose: () => void;
  auditHistory: RecoveryAuditEntry[];
  onClearHistory: () => void;
}

export const RecoveryAuditModal: React.FC<RecoveryAuditModalProps> = ({
  isOpen,
  onClose,
  auditHistory,
  onClearHistory,
}) => {
  if (!isOpen) return null;

  const formatTimestamp = (ts: number): string => {
    const diffMs = Date.now() - ts;
    const diffMins = Math.floor(diffMs / (60 * 1000));
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    return new Date(ts).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  const getReasonConfig = (reason: RecoveryAuditEntry['reason']) => {
    switch (reason) {
      case 'TTL_EXPIRED':
        return {
          label: '24h Limit Reached',
          bg: 'bg-amber-500/15 border-amber-500/30 text-amber-300',
        };
      case 'CORRUPT_SCHEMA':
        return {
          label: 'Data Reset',
          bg: 'bg-orange-500/15 border-orange-500/30 text-orange-300',
        };
      case 'DISCARDED_BY_USER':
        return {
          label: 'Cleared by Creator',
          bg: 'bg-cyan-500/15 border-cyan-500/30 text-cyan-300',
        };
      case 'PURGED_ON_PUBLISH':
        return {
          label: 'Published to X',
          bg: 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300',
        };
      case 'PURGED_ON_SEND':
        return {
          label: 'Sent to X',
          bg: 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300',
        };
      default:
        return {
          label: 'Logged Event',
          bg: 'bg-gray-500/15 border-gray-500/30 text-gray-300',
        };
    }
  };

  const formatItemType = (type: RecoveryAuditEntry['itemType']): string => {
    switch (type) {
      case 'QUICK_NOTE':
        return 'Quick Note';
      case 'REPLY_DRAFT':
        return 'Reply Draft';
      case 'FOCUSED_DRAFT':
        return 'Draft Focus';
      case 'FULL_SESSION':
        return 'Session Snapshot';
    }
  };

  const formatWorkspace = (ws: string): string => {
    switch (ws) {
      case 'strategy':
        return 'Studio';
      case 'drafts':
        return 'Queue';
      case 'triage':
        return 'Engage';
      case 'analytics':
        return 'Signals';
      default:
        return ws;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="w-full max-w-md rounded-2xl bg-[#0f111a] border border-white/10 shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
        role="dialog"
        aria-modal="true"
        aria-labelledby="audit-modal-title"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10 bg-white/[0.02]">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              <Clock className="h-4 w-4" />
            </div>
            <div>
              <h2 id="audit-modal-title" className="text-sm font-bold text-white tracking-tight">
                Recovery Audit Trail
              </h2>
              <p className="text-[11px] text-gray-400">
                Browser-local record of recent recovery events
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
            aria-label="Close modal"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-3">
          {auditHistory.length === 0 ? (
            <div className="rounded-xl border border-white/5 bg-white/[0.02] p-6 text-center">
              <CheckCircle className="h-8 w-8 text-cyan-400/60 mx-auto mb-2" />
              <div className="text-xs font-semibold text-gray-200">No Recovery Audit Events</div>
              <p className="text-[11px] text-gray-400 mt-1 max-w-xs mx-auto">
                No drafts, notes, or replies have been expired or cleared during this session.
              </p>
            </div>
          ) : (
            auditHistory.slice(0, 5).map((entry) => {
              const reasonConfig = getReasonConfig(entry.reason);
              return (
                <div
                  key={entry.id}
                  className="rounded-xl border border-white/10 bg-white/[0.02] p-3.5 space-y-2 transition-all hover:bg-white/[0.04]"
                >
                  {/* Top line: Badge, Workspace/Type, and Timestamp */}
                  <div className="flex items-center justify-between gap-2 flex-wrap text-[10px]">
                    <div className="flex items-center gap-1.5">
                      <span className={`px-2 py-0.5 rounded-full font-semibold border ${reasonConfig.bg}`}>
                        {reasonConfig.label}
                      </span>
                      <span className="px-1.5 py-0.5 rounded bg-white/5 text-gray-300 font-medium">
                        {formatWorkspace(entry.workspace)} • {formatItemType(entry.itemType)}
                      </span>
                    </div>
                    <span className="text-gray-400 flex items-center gap-1 font-mono">
                      {formatTimestamp(entry.timestamp)}
                    </span>
                  </div>

                  {/* Explanation text */}
                  <p className="text-xs text-gray-300 leading-relaxed">
                    {entry.explanation}
                  </p>
                </div>
              );
            })
          )}

          {/* Read-Only Safety Disclaimer */}
          <div className="rounded-xl bg-cyan-950/20 border border-cyan-500/20 p-3 flex items-start gap-2.5 mt-4">
            <Shield className="h-4 w-4 text-cyan-400 shrink-0 mt-0.5" />
            <div className="text-[11px] text-cyan-200/90 leading-relaxed">
              <strong>Non-Restorative Log:</strong> Audit records are strictly read-only and browser-local. They cannot recreate unapproved drafts or alter your publishing queue.
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between px-5 py-3 border-t border-white/10 bg-white/[0.02]">
          {auditHistory.length > 0 ? (
            <button
              type="button"
              onClick={onClearHistory}
              className="flex items-center gap-1.5 text-[11px] font-semibold text-gray-400 hover:text-red-300 px-2 py-1 rounded hover:bg-red-500/10 transition-colors"
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span>Clear Log</span>
            </button>
          ) : (
            <div />
          )}

          <button
            type="button"
            onClick={onClose}
            className="rounded-xl bg-white/10 hover:bg-white/20 px-4 py-1.5 text-xs font-semibold text-white transition-all active:scale-95"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
