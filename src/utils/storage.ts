import type { Draft, HandoverConfirmation } from '@/types';
import { STORAGE_KEYS } from '@/types';

const DRAFTS_KEY = STORAGE_KEYS.DRAFTS;
const HANDOVER_KEY = STORAGE_KEYS.HANDOVER_CONFIRMATIONS;

export function getDrafts(): Draft[] {
  try {
    const data = localStorage.getItem(DRAFTS_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

export function saveDrafts(drafts: Draft[]): void {
  localStorage.setItem(DRAFTS_KEY, JSON.stringify(drafts));
}

export function getDraft(id: string): Draft | undefined {
  const drafts = getDrafts();
  return drafts.find((draft) => draft.id === id);
}

export function saveDraft(draft: Draft): void {
  const drafts = getDrafts();
  const index = drafts.findIndex((d) => d.id === draft.id);
  draft.updatedAt = Date.now();
  if (index >= 0) {
    drafts[index] = draft;
  } else {
    drafts.unshift(draft);
  }
  saveDrafts(drafts);
}

export function deleteDraft(id: string): void {
  const drafts = getDrafts();
  const filtered = drafts.filter((draft) => draft.id !== id);
  saveDrafts(filtered);
}

export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 8);
}

export function clearOldDrafts(days: number = 30): number {
  const drafts = getDrafts();
  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
  const filtered = drafts.filter((draft) => draft.updatedAt > cutoff);
  const removedCount = drafts.length - filtered.length;
  saveDrafts(filtered);
  return removedCount;
}

export function getHandoverConfirmations(): HandoverConfirmation[] {
  try {
    const data = localStorage.getItem(HANDOVER_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

export function saveHandoverConfirmation(confirmation: HandoverConfirmation): void {
  const confirmations = getHandoverConfirmations();
  confirmations.unshift(confirmation);
  localStorage.setItem(HANDOVER_KEY, JSON.stringify(confirmations));
}

export function getHandoverConfirmationForShift(shift: string, date: string): HandoverConfirmation | undefined {
  const confirmations = getHandoverConfirmations();
  return confirmations.find(c => c.shift === shift && c.handoverDate === date);
}
