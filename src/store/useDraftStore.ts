import { create } from 'zustand';
import type { Draft } from '@/types';
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
}

type DraftStore = DraftState & DraftActions;

const initialState: DraftState = {
  drafts: [],
  isLoading: false,
};

export const useDraftStore = create<DraftStore>((set, get) => ({
  ...initialState,

  loadDrafts: () => {
    set({ isLoading: true });
    try {
      const drafts = getDrafts();
      const sortedDrafts = drafts.sort((a, b) => b.updatedAt - a.updatedAt);
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
}));
