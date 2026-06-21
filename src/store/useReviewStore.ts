import { create } from 'zustand';
import type { Draft, PatientInfo, ImageData, Mark, MarkType, Judgment, ClarityLevel, CompletenessLevel } from '@/types';
import { fileToDataUrl, getImageDimensions } from '@/utils/image';
import { generateId, saveDraft, getDraft } from '@/utils/storage';
import { getCurrentDateTime } from '@/utils/date';

interface Toast {
  message: string;
  type: 'success' | 'error' | 'info';
  visible: boolean;
}

interface ReviewState {
  currentDraft: Draft | null;
  currentImageIndex: number;
  isLoading: boolean;
  toast: Toast;
}

interface ReviewActions {
  createNewDraft: () => Draft;
  loadDraft: (id: string) => Promise<boolean>;
  updatePatientInfo: (info: Partial<PatientInfo>) => void;
  addImage: (file: File) => Promise<void>;
  removeImage: (imageId: string) => void;
  setCurrentImageIndex: (index: number) => void;
  rotateCurrentImage: (degrees: number) => void;
  addMark: (type: MarkType, x: number, y: number, size?: number) => void;
  removeMark: (markId: string) => void;
  clearMarks: () => void;
  updateJudgment: (data: Partial<Judgment>) => void;
  autoGenerateConclusion: () => void;
  saveCurrentDraft: () => boolean;
  completeDraft: () => boolean;
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
  hideToast: () => void;
}

type ReviewStore = ReviewState & ReviewActions;

const AUTO_SAVE_DELAY = 3000;
let autoSaveTimer: ReturnType<typeof setTimeout> | null = null;

const initialState: ReviewState = {
  currentDraft: null,
  currentImageIndex: 0,
  isLoading: false,
  toast: {
    message: '',
    type: 'info',
    visible: false,
  },
};

const createEmptyPatientInfo = (): PatientInfo => {
  const { date, time } = getCurrentDateTime();
  return {
    studyNo: '',
    name: '',
    gender: '',
    age: '',
    bodyPart: '',
    studyDate: date,
    studyTime: time,
  };
};

const createEmptyJudgment = (): Judgment => ({
  clarity: '',
  completeness: '',
  defects: [],
  rejectionReason: '',
  conclusion: '',
  reviewerName: '',
  reviewedAt: 0,
});

const debouncedAutoSave = (saveFn: () => boolean) => {
  if (autoSaveTimer) {
    clearTimeout(autoSaveTimer);
  }
  autoSaveTimer = setTimeout(() => {
    saveFn();
  }, AUTO_SAVE_DELAY);
};

export const useReviewStore = create<ReviewStore>((set, get) => ({
  ...initialState,

  createNewDraft: () => {
    const now = Date.now();
    const newDraft: Draft = {
      id: generateId(),
      createdAt: now,
      updatedAt: now,
      status: 'incomplete',
      patientInfo: createEmptyPatientInfo(),
      images: [],
      currentImageIndex: 0,
      judgment: createEmptyJudgment(),
    };
    set({ currentDraft: newDraft, currentImageIndex: 0 });
    return newDraft;
  },

  loadDraft: async (id: string) => {
    set({ isLoading: true });
    try {
      const draft = getDraft(id);
      if (draft) {
        set({ currentDraft: draft, currentImageIndex: draft.currentImageIndex || 0 });
        return true;
      }
      get().showToast('草稿不存在', 'error');
      return false;
    } catch (error) {
      console.error('Failed to load draft:', error);
      get().showToast('加载草稿失败', 'error');
      return false;
    } finally {
      set({ isLoading: false });
    }
  },

  updatePatientInfo: (info) => {
    set((state) => {
      if (!state.currentDraft) return state;
      const updatedDraft: Draft = {
        ...state.currentDraft,
        patientInfo: {
          ...state.currentDraft.patientInfo,
          ...info,
        },
        updatedAt: Date.now(),
      };
      debouncedAutoSave(() => get().saveCurrentDraft());
      return { currentDraft: updatedDraft };
    });
  },

  addImage: async (file) => {
    set({ isLoading: true });
    try {
      const dataUrl = await fileToDataUrl(file);
      const { width, height } = await getImageDimensions(dataUrl);
      const newImage: ImageData = {
        id: generateId(),
        name: file.name,
        type: file.type,
        size: file.size,
        dataUrl,
        width,
        height,
        rotation: 0,
        scale: 1,
        marks: [],
      };
      set((state) => {
        if (!state.currentDraft) return state;
        const updatedDraft: Draft = {
          ...state.currentDraft,
          images: [...state.currentDraft.images, newImage],
          updatedAt: Date.now(),
        };
        debouncedAutoSave(() => get().saveCurrentDraft());
        return { currentDraft: updatedDraft };
      });
      get().showToast('图片添加成功', 'success');
    } catch (error) {
      console.error('Failed to add image:', error);
      get().showToast('添加图片失败', 'error');
    } finally {
      set({ isLoading: false });
    }
  },

  removeImage: (imageId) => {
    set((state) => {
      if (!state.currentDraft) return state;
      const images = state.currentDraft.images.filter((img) => img.id !== imageId);
      const newIndex = state.currentImageIndex >= images.length
        ? Math.max(0, images.length - 1)
        : state.currentImageIndex;
      const updatedDraft: Draft = {
        ...state.currentDraft,
        images,
        currentImageIndex: newIndex,
        updatedAt: Date.now(),
      };
      debouncedAutoSave(() => get().saveCurrentDraft());
      return { currentDraft: updatedDraft, currentImageIndex: newIndex };
    });
  },

  setCurrentImageIndex: (index) => {
    set((state) => {
      if (!state.currentDraft || index < 0 || index >= state.currentDraft.images.length) return state;
      const updatedDraft: Draft = {
        ...state.currentDraft,
        currentImageIndex: index,
      };
      return { currentDraft: updatedDraft, currentImageIndex: index };
    });
  },

  rotateCurrentImage: (degrees) => {
    set((state) => {
      if (!state.currentDraft || state.currentDraft.images.length === 0) return state;
      const images = state.currentDraft.images.map((img, idx) => {
        if (idx === state.currentImageIndex) {
          return {
            ...img,
            rotation: (img.rotation + degrees + 360) % 360,
          };
        }
        return img;
      });
      const updatedDraft: Draft = {
        ...state.currentDraft,
        images,
        updatedAt: Date.now(),
      };
      debouncedAutoSave(() => get().saveCurrentDraft());
      return { currentDraft: updatedDraft };
    });
  },

  addMark: (type, x, y, size = 24) => {
    set((state) => {
      if (!state.currentDraft || state.currentDraft.images.length === 0) return state;
      const newMark: Mark = {
        id: generateId(),
        type,
        x,
        y,
        size,
        createdAt: Date.now(),
      };
      const images = state.currentDraft.images.map((img, idx) => {
        if (idx === state.currentImageIndex) {
          return {
            ...img,
            marks: [...img.marks, newMark],
          };
        }
        return img;
      });
      const updatedDraft: Draft = {
        ...state.currentDraft,
        images,
        updatedAt: Date.now(),
      };
      debouncedAutoSave(() => get().saveCurrentDraft());
      return { currentDraft: updatedDraft };
    });
  },

  removeMark: (markId) => {
    set((state) => {
      if (!state.currentDraft || state.currentDraft.images.length === 0) return state;
      const images = state.currentDraft.images.map((img, idx) => {
        if (idx === state.currentImageIndex) {
          return {
            ...img,
            marks: img.marks.filter((m) => m.id !== markId),
          };
        }
        return img;
      });
      const updatedDraft: Draft = {
        ...state.currentDraft,
        images,
        updatedAt: Date.now(),
      };
      debouncedAutoSave(() => get().saveCurrentDraft());
      return { currentDraft: updatedDraft };
    });
  },

  clearMarks: () => {
    set((state) => {
      if (!state.currentDraft || state.currentDraft.images.length === 0) return state;
      const images = state.currentDraft.images.map((img, idx) => {
        if (idx === state.currentImageIndex) {
          return {
            ...img,
            marks: [],
          };
        }
        return img;
      });
      const updatedDraft: Draft = {
        ...state.currentDraft,
        images,
        updatedAt: Date.now(),
      };
      debouncedAutoSave(() => get().saveCurrentDraft());
      return { currentDraft: updatedDraft };
    });
  },

  updateJudgment: (data) => {
    set((state) => {
      if (!state.currentDraft) return state;
      const updatedDraft: Draft = {
        ...state.currentDraft,
        judgment: {
          ...state.currentDraft.judgment,
          ...data,
        },
        updatedAt: Date.now(),
      };
      debouncedAutoSave(() => get().saveCurrentDraft());
      return { currentDraft: updatedDraft };
    });
  },

  autoGenerateConclusion: () => {
    set((state) => {
      if (!state.currentDraft) return state;
      const judgment = state.currentDraft.judgment;
      let conclusion: 'pass' | 'fail' | '' = '';
      let rejectionReason = '';

      const isBlur = judgment.clarity === 'blur';
      const isMissing = judgment.completeness === 'missing';
      const hasManyDefects = judgment.defects.length >= 3;

      const reasons: string[] = [];
      
      if (isBlur) {
        reasons.push('图像模糊');
      }
      if (isMissing) {
        reasons.push('图像严重缺失');
      }
      if (hasManyDefects) {
        reasons.push('缺陷项过多');
      }

      if (isBlur || isMissing || hasManyDefects) {
        conclusion = 'fail';
        const defectLabels: Record<string, string> = {
          stain: '存在污点',
          shadow: '存在阴影',
          artifact: '存在伪影',
          thickness: '层厚不均',
          position: '位置偏差',
        };
        judgment.defects.forEach((d) => {
          const label = defectLabels[d];
          if (label && !reasons.includes(label)) {
            reasons.push(label);
          }
        });
        rejectionReason = reasons.join('；') + '，建议重拍。';
      } else if (judgment.clarity === 'clear' && judgment.completeness === 'complete' && judgment.defects.length === 0) {
        conclusion = 'pass';
        rejectionReason = '图像质量良好，符合诊断要求。';
      }

      const updatedDraft: Draft = {
        ...state.currentDraft,
        judgment: {
          ...judgment,
          conclusion,
          rejectionReason: rejectionReason || judgment.rejectionReason,
          reviewedAt: Date.now(),
        },
        updatedAt: Date.now(),
      };
      debouncedAutoSave(() => get().saveCurrentDraft());
      return { currentDraft: updatedDraft };
    });
  },

  saveCurrentDraft: () => {
    const { currentDraft } = get();
    if (!currentDraft) return false;

    try {
      saveDraft(currentDraft);
      get().showToast('已自动保存', 'success');
      return true;
    } catch (error) {
      console.error('Failed to save draft:', error);
      return false;
    }
  },

  completeDraft: () => {
    const { currentDraft } = get();
    if (!currentDraft) return false;

    if (currentDraft.images.length === 0) {
      get().showToast('请先添加图片', 'error');
      return false;
    }
    if (!currentDraft.judgment.clarity) {
      get().showToast('请选择清晰度', 'error');
      return false;
    }
    if (!currentDraft.judgment.completeness) {
      get().showToast('请选择完整性', 'error');
      return false;
    }
    if (!currentDraft.judgment.conclusion) {
      get().showToast('请先生成结论', 'error');
      return false;
    }

    try {
      const updatedDraft: Draft = {
        ...currentDraft,
        status: 'completed',
        judgment: {
          ...currentDraft.judgment,
          reviewedAt: Date.now(),
        },
        updatedAt: Date.now(),
      };
      saveDraft(updatedDraft);
      set({ currentDraft: updatedDraft });
      get().showToast('核查完成，已保存', 'success');
      return true;
    } catch (error) {
      console.error('Failed to complete draft:', error);
      get().showToast('完成核查失败', 'error');
      return false;
    }
  },

  showToast: (message, type = 'info') => {
    set({ toast: { message, type, visible: true } });
    setTimeout(() => {
      get().hideToast();
    }, 3000);
  },

  hideToast: () => {
    set((state) => ({ toast: { ...state.toast, visible: false } }));
  },
}));
