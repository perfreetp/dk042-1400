import { create } from 'zustand';
import type { Draft, Judgment } from '@/types';
import { getDrafts, deleteDraft as removeDraft, clearOldDrafts as cleanOld } from '@/utils/storage';

interface DraftState {
  drafts: Draft[];
  isLoading: boolean;
}

interface DraftActions {
  loadDrafts: () => void;
  deleteDraft: (id: string) => boolean;
  clearOldDrafts: (days?: number) => number;
  getDraftCount: () => number;
  getIncompleteCount: () => number;
  getPendingReviewCount: () => number;
}

type DraftStore = DraftState & DraftActions;

const initialState: DraftState = {
  drafts: [],
  isLoading: false,
};

const createEmptyJudgment = (): Judgment => ({
  clarity: '',
  completeness: '',
  defects: [],
  rejectionReason: '',
  conclusion: '',
  reviewerName: '',
  reviewedAt: 0,
  preliminaryReview: null,
  finalReview: null,
  needsReview: false,
  isConsistent: null,
  finalDecision: null,
});

const migrateDraft = (draft: any): Draft => {
  const j = draft.judgment || createEmptyJudgment();
  return {
    ...draft,
    status: draft.status === 'completed' ? 'completed' : (draft.status === 'pending_review' ? 'pending_review' : 'incomplete'),
    handoverNotes: Array.isArray(draft.handoverNotes) ? draft.handoverNotes : [],
    judgment: {
      ...createEmptyJudgment(),
      ...j,
      preliminaryReview: j.preliminaryReview || null,
      finalReview: j.finalReview || null,
      needsReview: j.needsReview || false,
      isConsistent: j.isConsistent !== undefined ? j.isConsistent : null,
      finalDecision: j.finalDecision || null,
    },
  };
};

export const useDraftStore = create<DraftStore>((set, get) => ({
  ...initialState,

  loadDrafts: () => {
    set({ isLoading: true });
    try {
      const rawDrafts = getDrafts();
      const migratedDrafts: Draft[] = rawDrafts.map(d => migrateDraft(d));
      const sortedDrafts = migratedDrafts.sort((a, b) => b.updatedAt - a.updatedAt);
      set({ drafts: sortedDrafts });
    } catch (error) {
      console.error('Failed to load drafts:', error);
    } finally {
      set({ isLoading: false });
    }
  },

  deleteDraft: (id: string) => {
    try {
      removeDraft(id);
      const drafts = get().drafts.filter((draft) => draft.id !== id);
      set({ drafts });
      return true;
    } catch (error) {
      console.error('Failed to delete draft:', error);
      return false;
    }
  },

  clearOldDrafts: (days = 30) => {
    try {
      const removedCount = cleanOld(days);
      if (removedCount > 0) {
        const drafts = get().drafts.filter((draft) => {
          const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
          return draft.updatedAt > cutoff;
        });
        set({ drafts });
      }
      return removedCount;
    } catch (error) {
      console.error('Failed to clear old drafts:', error);
      return 0;
    }
  },

  getDraftCount: () => {
    return get().drafts.length;
  },

  getIncompleteCount: () => {
    return get().drafts.filter((d) => d.status === 'incomplete').length;
  },

  getPendingReviewCount: () => {
    return get().drafts.filter((d) => d.status === 'pending_review').length;
  },
}));
