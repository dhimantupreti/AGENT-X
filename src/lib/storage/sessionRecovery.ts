import { NavTab } from '@/components/BottomNav';
import { ResearchCategory } from '@/core/types';

export const RECOVERY_STORAGE_KEY = 'agentx:recovery:v1';
export const RECOVERY_AUDIT_STORAGE_KEY = 'agentx:recovery_audit:v1';
export const RECOVERY_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
export const MAX_AUDIT_ENTRIES = 5;

export type RecoveryAuditReason =
  | 'TTL_EXPIRED'           // Exceeded 24-hour retention limit
  | 'CORRUPT_SCHEMA'        // JSON parsing failed or schema invalid
  | 'DISCARDED_BY_USER'     // User clicked Clear note, Discard reply, or Start fresh
  | 'PURGED_ON_PUBLISH'     // Post was authorized & published to X
  | 'PURGED_ON_SEND';       // Reply was authorized & dispatched to X

export interface RecoveryAuditEntry {
  id: string;
  reason: RecoveryAuditReason;
  timestamp: number;
  itemType: 'QUICK_NOTE' | 'REPLY_DRAFT' | 'FOCUSED_DRAFT' | 'FULL_SESSION';
  workspace: NavTab;
  explanation: string;
  ageHours?: number;
}

export interface QuickNoteRecovery {
  rawNoteInput: string;
  categoryOverride?: ResearchCategory;
  updatedAt: number;
}

export interface InFlightReplyRecovery {
  mentionId: string;
  selectedOptionId?: string;
  customizedText: string;
  updatedAt: number;
}

export interface RecoveredSessionState {
  version: number;
  lastActiveTab: NavTab;
  focusedDraftId?: string;
  quickNoteBuffer?: QuickNoteRecovery;
  inFlightReply?: InFlightReplyRecovery;
  savedAt: number;
}

export interface IStorageBackend {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

/**
 * In-memory fallback backend when browser storage is unavailable or disabled.
 */
export class InMemoryStorageBackend implements IStorageBackend {
  private store = new Map<string, string>();

  getItem(key: string): string | null {
    return this.store.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.store.set(key, value);
  }

  removeItem(key: string): void {
    this.store.delete(key);
  }

  clear(): void {
    this.store.clear();
  }
}

/**
 * Storage Abstraction with fallback hierarchy:
 * 1. localStorage (if accessible)
 * 2. sessionStorage (if accessible)
 * 3. In-memory storage (failsafe)
 */
export class SessionRecoveryStorage {
  private backend: IStorageBackend;

  constructor(customBackend?: IStorageBackend) {
    if (customBackend) {
      this.backend = customBackend;
      return;
    }
    this.backend = this.resolveBackend();
  }

  private resolveBackend(): IStorageBackend {
    if (typeof window !== 'undefined') {
      try {
        const testKey = '__storage_test__';
        window.localStorage.setItem(testKey, testKey);
        window.localStorage.removeItem(testKey);
        return window.localStorage;
      } catch {
        // localStorage denied or quota exceeded, try sessionStorage
        try {
          const testKey = '__storage_test__';
          window.sessionStorage.setItem(testKey, testKey);
          window.sessionStorage.removeItem(testKey);
          return window.sessionStorage;
        } catch {
          // sessionStorage also unavailable
        }
      }
    }
    return new InMemoryStorageBackend();
  }

  /**
   * Save partial session updates merging with existing valid state.
   */
  public saveSessionState(updates: Partial<Omit<RecoveredSessionState, 'version' | 'savedAt'>>): void {
    try {
      const existing = this.loadSessionState() || {
        version: 1,
        lastActiveTab: 'strategy' as NavTab,
        savedAt: Date.now(),
      };

      const newState: RecoveredSessionState = {
        ...existing,
        ...updates,
        version: 1,
        savedAt: Date.now(),
      };

      // Handle explicit property deletions
      if ('quickNoteBuffer' in updates && updates.quickNoteBuffer === undefined) {
        delete newState.quickNoteBuffer;
      }
      if ('inFlightReply' in updates && updates.inFlightReply === undefined) {
        delete newState.inFlightReply;
      }
      if ('focusedDraftId' in updates && updates.focusedDraftId === undefined) {
        delete newState.focusedDraftId;
      }

      this.backend.setItem(RECOVERY_STORAGE_KEY, JSON.stringify(newState));
    } catch {
      // Graceful error handling for storage failures
    }
  }

  /**
   * Records an audit event capped to the latest MAX_AUDIT_ENTRIES.
   */
  public recordAudit(entry: Omit<RecoveryAuditEntry, 'id' | 'timestamp'>): void {
    try {
      const existing = this.getAuditHistory();
      const newEntry: RecoveryAuditEntry = {
        ...entry,
        id: `aud_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        timestamp: Date.now(),
      };
      const updated = [newEntry, ...existing].slice(0, MAX_AUDIT_ENTRIES);
      this.backend.setItem(RECOVERY_AUDIT_STORAGE_KEY, JSON.stringify(updated));
    } catch {
      // Graceful error handling for storage failures
    }
  }

  /**
   * Retrieves the audit history (up to MAX_AUDIT_ENTRIES).
   */
  public getAuditHistory(): RecoveryAuditEntry[] {
    try {
      const raw = this.backend.getItem(RECOVERY_AUDIT_STORAGE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];
      return parsed as RecoveryAuditEntry[];
    } catch {
      return [];
    }
  }

  /**
   * Returns the most recent audit event.
   */
  public getLatestAudit(): RecoveryAuditEntry | null {
    const history = this.getAuditHistory();
    return history.length > 0 ? history[0] : null;
  }

  /**
   * Clears all audit history.
   */
  public clearAuditHistory(): void {
    try {
      this.backend.removeItem(RECOVERY_AUDIT_STORAGE_KEY);
    } catch {
      // Graceful error handling
    }
  }

  /**
   * Load session state with schema validation and 24-hour TTL enforcement.
   */
  public loadSessionState(now: number = Date.now()): RecoveredSessionState | null {
    try {
      const raw = this.backend.getItem(RECOVERY_STORAGE_KEY);
      if (!raw) return null;

      let parsed: Partial<RecoveredSessionState>;
      try {
        parsed = JSON.parse(raw) as Partial<RecoveredSessionState>;
      } catch {
        this.recordAudit({
          reason: 'CORRUPT_SCHEMA',
          itemType: 'FULL_SESSION',
          workspace: 'strategy',
          explanation: 'Local browser recovery data was unreadable or malformed and was safely reset to avoid application instability.',
        });
        this.clearSessionState();
        return null;
      }

      if (!parsed || typeof parsed !== 'object') {
        this.recordAudit({
          reason: 'CORRUPT_SCHEMA',
          itemType: 'FULL_SESSION',
          workspace: 'strategy',
          explanation: 'Local recovery snapshot format was unexpected and was safely reset to avoid application instability.',
        });
        this.clearSessionState();
        return null;
      }

      // Check 24-hour TTL expiration
      if (typeof parsed.savedAt !== 'number' || now - parsed.savedAt > RECOVERY_TTL_MS) {
        const ageHours = typeof parsed.savedAt === 'number'
          ? Math.max(24, Math.round((now - parsed.savedAt) / (60 * 60 * 1000)))
          : 24;
        const itemType = parsed.quickNoteBuffer
          ? 'QUICK_NOTE'
          : parsed.inFlightReply
          ? 'REPLY_DRAFT'
          : parsed.focusedDraftId
          ? 'FOCUSED_DRAFT'
          : 'FULL_SESSION';
        const workspace = (['strategy', 'drafts', 'triage', 'analytics'].includes(parsed.lastActiveTab as NavTab)
          ? parsed.lastActiveTab
          : 'strategy') as NavTab;

        this.recordAudit({
          reason: 'TTL_EXPIRED',
          itemType,
          workspace,
          ageHours,
          explanation: `Recovery snapshot saved ${ageHours}h ago reached the 24-hour retention limit and was removed from recovery. Approved queue posts remain safe.`,
        });
        this.clearSessionState();
        return null;
      }

      // Validate lastActiveTab
      const validTabs: NavTab[] = ['strategy', 'drafts', 'triage', 'analytics'];
      const lastActiveTab: NavTab = validTabs.includes(parsed.lastActiveTab as NavTab)
        ? (parsed.lastActiveTab as NavTab)
        : 'strategy';

      // Validate Quick Note Buffer if present
      let quickNoteBuffer: QuickNoteRecovery | undefined = undefined;
      if (parsed.quickNoteBuffer && typeof parsed.quickNoteBuffer.rawNoteInput === 'string') {
        quickNoteBuffer = {
          rawNoteInput: parsed.quickNoteBuffer.rawNoteInput,
          categoryOverride: parsed.quickNoteBuffer.categoryOverride,
          updatedAt: parsed.quickNoteBuffer.updatedAt || parsed.savedAt,
        };
      }

      // Validate In-Flight Reply if present (Strict DRAFT invariant: reply can never be loaded as APPROVED/SENT)
      let inFlightReply: InFlightReplyRecovery | undefined = undefined;
      if (parsed.inFlightReply && typeof parsed.inFlightReply.mentionId === 'string' && typeof parsed.inFlightReply.customizedText === 'string') {
        inFlightReply = {
          mentionId: parsed.inFlightReply.mentionId,
          selectedOptionId: parsed.inFlightReply.selectedOptionId,
          customizedText: parsed.inFlightReply.customizedText,
          updatedAt: parsed.inFlightReply.updatedAt || parsed.savedAt,
        };
      }

      return {
        version: 1,
        lastActiveTab,
        focusedDraftId: typeof parsed.focusedDraftId === 'string' ? parsed.focusedDraftId : undefined,
        quickNoteBuffer,
        inFlightReply,
        savedAt: parsed.savedAt,
      };
    } catch {
      this.clearSessionState();
      return null;
    }
  }

  /**
   * Clears all session recovery data.
   */
  public clearSessionState(): void {
    try {
      this.backend.removeItem(RECOVERY_STORAGE_KEY);
    } catch {
      // Graceful error handling
    }
  }

  /**
   * Purges the in-flight reply buffer after dispatch or discard.
   */
  public clearInFlightReply(reason: 'DISCARD' | 'SENT' = 'DISCARD'): void {
    const existing = this.loadSessionState();
    if (!existing) return;
    const { inFlightReply: _discard, ...rest } = existing;
    this.saveSessionState({ ...rest, inFlightReply: undefined });

    this.recordAudit({
      reason: reason === 'SENT' ? 'PURGED_ON_SEND' : 'DISCARDED_BY_USER',
      itemType: 'REPLY_DRAFT',
      workspace: 'triage',
      explanation: reason === 'SENT'
        ? 'In-flight reply was authorized and dispatched to X; transient reply draft was removed from recovery.'
        : 'In-flight reply draft was cleared from local recovery by creator.',
    });
  }

  /**
   * Purges the quick note buffer after refinement or discard.
   */
  public clearQuickNote(reason: 'DISCARD' | 'REFINED' = 'DISCARD'): void {
    const existing = this.loadSessionState();
    if (!existing) return;
    const { quickNoteBuffer: _discard, ...rest } = existing;
    this.saveSessionState({ ...rest, quickNoteBuffer: undefined });

    if (reason === 'DISCARD') {
      this.recordAudit({
        reason: 'DISCARDED_BY_USER',
        itemType: 'QUICK_NOTE',
        workspace: 'strategy',
        explanation: 'Unsubmitted Quick Note buffer was cleared from local recovery by creator.',
      });
    }
  }

  /**
   * Clears focused draft after publication or rejection.
   */
  public clearFocusedDraft(reason: 'UNFOCUS' | 'PUBLISHED' = 'UNFOCUS'): void {
    const existing = this.loadSessionState();
    if (!existing) return;
    const { focusedDraftId: _discard, ...rest } = existing;
    this.saveSessionState({ ...rest, focusedDraftId: undefined });

    this.recordAudit({
      reason: reason === 'PUBLISHED' ? 'PURGED_ON_PUBLISH' : 'DISCARDED_BY_USER',
      itemType: 'FOCUSED_DRAFT',
      workspace: 'drafts',
      explanation: reason === 'PUBLISHED'
        ? 'Draft was authorized and published to X; transient draft state was removed from recovery.'
        : 'Draft focus was cleared from local recovery.',
    });
  }

  /**
   * Resets recovered state specific to a given workspace without clearing other tabs.
   */
  public resetWorkspaceState(tab: NavTab): void {
    const existing = this.loadSessionState();
    if (!existing) return;

    const workspaceLabel =
      tab === 'strategy' ? 'Studio' : tab === 'drafts' ? 'Queue' : tab === 'triage' ? 'Engage' : 'Signals';

    switch (tab) {
      case 'strategy': {
        const { quickNoteBuffer: _discard, ...rest } = existing;
        this.saveSessionState({ ...rest, quickNoteBuffer: undefined });
        this.recordAudit({
          reason: 'DISCARDED_BY_USER',
          itemType: 'QUICK_NOTE',
          workspace: 'strategy',
          explanation: `Creator selected 'Start fresh in ${workspaceLabel}'; transient local buffers were cleared from recovery. Approved content remains intact.`,
        });
        break;
      }
      case 'drafts': {
        const { focusedDraftId: _discard, ...rest } = existing;
        this.saveSessionState({ ...rest, focusedDraftId: undefined });
        this.recordAudit({
          reason: 'DISCARDED_BY_USER',
          itemType: 'FOCUSED_DRAFT',
          workspace: 'drafts',
          explanation: `Creator selected 'Start fresh in ${workspaceLabel}'; focused draft selection was cleared from recovery. Approved queue posts remain safe.`,
        });
        break;
      }
      case 'triage': {
        const { inFlightReply: _discard, ...rest } = existing;
        this.saveSessionState({ ...rest, inFlightReply: undefined });
        this.recordAudit({
          reason: 'DISCARDED_BY_USER',
          itemType: 'REPLY_DRAFT',
          workspace: 'triage',
          explanation: `Creator selected 'Start fresh in ${workspaceLabel}'; in-flight reply draft was cleared from recovery.`,
        });
        break;
      }
      case 'analytics':
        // Signals is read-only telemetry; no transient buffers
        break;
    }
  }
}

// Global default singleton instance
export const sessionRecoveryStorage = new SessionRecoveryStorage();
