import { create } from 'zustand';
import type { Draft, PatientInfo, ImageData, Mark, MarkType, Judgment, ClarityLevel, CompletenessLevel, HandoverNote, ReviewResult, FinalDecision, OperationLogEntry, OperationType } from '@/types';
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
  addHandoverNote: (content: string, authorName: string, isPending?: boolean) => void;
  updateHandoverNote: (noteId: string, updates: Partial<HandoverNote>) => void;
  removeHandoverNote: (noteId: string) => void;
  confirmHandoverNote: (noteId: string, confirmerName: string) => void;
  setPreliminaryReview: (result: ReviewResult) => void;
  setFinalReview: (result: ReviewResult) => void;
  clearFinalReview: () => void;
  getReviewProgress: () => number;
  setNeedsReview: (needs: boolean) => void;
  setFinalDecision: (decision: FinalDecision) => void;
  clearFinalDecision: () => void;
  addOperationLog: (type: OperationType, operatorName: string, description: string, toStatus?: Draft['status']) => void;
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
  preliminaryReview: null,
  finalReview: null,
  needsReview: false,
  isConsistent: null,
  finalDecision: null,
});

const debouncedAutoSave = (saveFn: () => boolean) => {
  if (autoSaveTimer) {
    clearTimeout(autoSaveTimer);
  }
  autoSaveTimer = setTimeout(() => {
    saveFn();
  }, AUTO_SAVE_DELAY);
};

const migrateDraft = (draft: any): Draft => {
  const j = draft.judgment || createEmptyJudgment();
  const migrated: Draft = {
    ...draft,
    status: draft.status === 'completed' ? 'completed' : (draft.status === 'pending_review' ? 'pending_review' : 'incomplete'),
    handoverNotes: Array.isArray(draft.handoverNotes) ? draft.handoverNotes : [],
    operationLogs: Array.isArray(draft.operationLogs) ? draft.operationLogs : [],
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
  return migrated;
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
      handoverNotes: [],
      operationLogs: [],
    };
    set({ currentDraft: newDraft, currentImageIndex: 0 });
    return newDraft;
  },

  loadDraft: async (id: string) => {
    set({ isLoading: true });
    try {
      const rawDraft = getDraft(id);
      if (rawDraft) {
        const draft = migrateDraft(rawDraft);
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
      const { judgment, images } = state.currentDraft;
      let conclusion: 'pass' | 'fail' | '' = '';
      let rejectionReason = '';

      const clarityLevel = judgment.clarity;
      const completenessLevel = judgment.completeness;
      const defectCount = judgment.defects.length;

      const totalMarks = images.reduce((sum, img) => sum + img.marks.length, 0);
      const stainCount = images.reduce((sum, img) => sum + img.marks.filter(m => m.type === 'stain').length, 0);
      const shadowCount = images.reduce((sum, img) => sum + img.marks.filter(m => m.type === 'shadow').length, 0);

      const defectLabels: Record<string, string> = {
        stain: '污点',
        shadow: '阴影',
        artifact: '伪影',
        thickness: '层厚不均',
        position: '位置偏差',
      };

      const clarityLabels: Record<string, string> = {
        clear: '清晰',
        moderate: '较清晰',
        blur: '模糊',
      };

      const completenessLabels: Record<string, string> = {
        complete: '完整',
        partial: '部分缺失',
        missing: '严重缺失',
      };

      const reasons: string[] = [];
      const suggestions: string[] = [];

      let failScore = 0;

      if (clarityLevel === 'blur') {
        failScore += 3;
        reasons.push('图像模糊，细节显示不清');
        suggestions.push('调整拍摄参数或重新对焦');
      } else if (clarityLevel === 'moderate') {
        failScore += 1;
        reasons.push('图像清晰度一般');
      }

      if (completenessLevel === 'missing') {
        failScore += 3;
        reasons.push('检查部位严重缺失');
        suggestions.push('重新摆位，确保检查部位完整');
      } else if (completenessLevel === 'partial') {
        failScore += 1;
        reasons.push('检查部位部分缺失');
        suggestions.push('注意拍摄范围');
      }

      if (defectCount >= 3) {
        failScore += 2;
        reasons.push(`缺陷项过多（${defectCount}项）`);
      } else if (defectCount >= 1) {
        failScore += defectCount * 0.5;
      }

      if (totalMarks >= 5) {
        failScore += 1;
      }

      judgment.defects.forEach((d) => {
        const label = defectLabels[d];
        if (label) {
          if (d === 'stain' && stainCount > 0) {
            reasons.push(`存在${stainCount}处污点`);
          } else if (d === 'shadow' && shadowCount > 0) {
            reasons.push(`存在${shadowCount}处阴影`);
          } else if (!reasons.some(r => r.includes(label))) {
            reasons.push(`存在${label}`);
          }
          if (d === 'artifact' && !suggestions.some(s => s.includes('伪影'))) {
            suggestions.push('检查设备并去除伪影来源');
          }
          if (d === 'thickness' && !suggestions.some(s => s.includes('层厚'))) {
            suggestions.push('调整扫描层厚参数');
          }
          if (d === 'position' && !suggestions.some(s => s.includes('摆位'))) {
            suggestions.push('重新摆位校正');
          }
        }
      });

      const clarityText = clarityLevel ? clarityLabels[clarityLevel] : '';
      const completenessText = completenessLevel ? completenessLabels[completenessLevel] : '';
      const basicDesc = `清晰度${clarityText}，完整性${completenessText}`;

      if (clarityLevel === 'clear' && completenessLevel === 'complete' && defectCount === 0 && totalMarks === 0) {
        conclusion = 'pass';
        rejectionReason = `图像质量良好：${basicDesc}，无明显缺陷，符合诊断要求。`;
      } else if (clarityLevel === 'clear' && completenessLevel === 'complete' && defectCount <= 1 && failScore < 2) {
        conclusion = 'pass';
        const defectDesc = defectCount > 0
          ? `，存在轻微问题：${judgment.defects.map(d => defectLabels[d]).join('、')}`
          : '';
        rejectionReason = `图像质量合格：${basicDesc}${defectDesc}，不影响诊断。`;
      } else if (clarityLevel === 'moderate' && completenessLevel === 'complete' && defectCount <= 1 && failScore < 2) {
        conclusion = 'pass';
        const defectDesc = defectCount > 0
          ? `，存在${judgment.defects.map(d => defectLabels[d]).join('、')}`
          : '';
        rejectionReason = `图像质量基本合格：${basicDesc}${defectDesc}，虽然清晰度一般但不影响诊断。`;
      } else if (clarityLevel === 'moderate' && completenessLevel === 'partial' && failScore < 3) {
        conclusion = 'fail';
        reasons.unshift('清晰度一般且检查部位不完整');
        suggestions.push('建议重拍，确保图像清晰完整');
      } else if (failScore >= 2) {
        conclusion = 'fail';
      } else if (clarityLevel && completenessLevel) {
        conclusion = defectCount >= 2 ? 'fail' : 'pass';
        if (conclusion === 'pass') {
          const defectDesc = defectCount > 0
            ? `，存在轻微问题：${judgment.defects.map(d => defectLabels[d]).join('、')}`
            : '';
          rejectionReason = `图像质量合格：${basicDesc}${defectDesc}，符合诊断要求。`;
        }
      }

      if (conclusion === 'fail' && rejectionReason === '') {
        const reasonText = reasons.length > 0 ? reasons.join('；') : '图像质量不符合标准';
        const suggestionText = suggestions.length > 0 ? `。建议：${suggestions.join('；')}` : '';
        rejectionReason = `${basicDesc}，${reasonText}${suggestionText}，建议重拍。`;
      }

      if (!clarityLevel || !completenessLevel) {
        const missing: string[] = [];
        if (!clarityLevel) missing.push('清晰度');
        if (!completenessLevel) missing.push('完整性');
        rejectionReason = `请先选择${missing.join('和')}后再生成结论。`;
        conclusion = '';
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

    const { judgment } = currentDraft;
    const needsReview = judgment.needsReview;
    const hasPreliminary = !!judgment.preliminaryReview;
    const hasFinal = !!judgment.finalReview;
    const isInconsistent = needsReview && hasPreliminary && hasFinal && judgment.isConsistent === false;
    const hasDecision = !!judgment.finalDecision;

    if (needsReview) {
      if (!hasPreliminary) {
        get().showToast('请先完成初判', 'error');
        return false;
      }
      if (!hasFinal) {
        get().showToast('请完成复核后再提交', 'error');
        return false;
      }
      if (isInconsistent && !hasDecision) {
        get().showToast('初判和复核不一致，请先记录最终裁定', 'error');
        return false;
      }
    } else {
      if (!judgment.clarity) {
        get().showToast('请选择清晰度', 'error');
        return false;
      }
      if (!judgment.completeness) {
        get().showToast('请选择完整性', 'error');
        return false;
      }
      if (!judgment.conclusion) {
        get().showToast('请先生成结论', 'error');
        return false;
      }
    }

    try {
      let newStatus: 'pending_review' | 'completed' = 'completed';
      if (needsReview) {
        if (hasPreliminary && !hasFinal) {
          newStatus = 'pending_review';
        } else if (isInconsistent && !hasDecision) {
          newStatus = 'pending_review';
        }
      }

      const updatedDraft: Draft = {
        ...currentDraft,
        status: newStatus,
        judgment: {
          ...currentDraft.judgment,
          reviewedAt: Date.now(),
        },
        updatedAt: Date.now(),
      };
      saveDraft(updatedDraft);
      set({ currentDraft: updatedDraft });
      if (newStatus === 'pending_review') {
        get().showToast('初判已提交，等待复核', 'info');
      } else {
        get().showToast('核查完成，已保存', 'success');
      }
      return true;
    } catch (error) {
      console.error('Failed to complete draft:', error);
      get().showToast('完成核查失败', 'error');
      return false;
    }
  },

  addHandoverNote: (content, authorName, isPending = true) => {
    set((state) => {
      if (!state.currentDraft) return state;
      const notes = state.currentDraft.handoverNotes || [];
      const newNote: HandoverNote = {
        id: generateId(),
        content,
        authorName,
        createdAt: Date.now(),
        isPending,
      };

      const logs = state.currentDraft.operationLogs || [];
      const newLog: OperationLogEntry = {
        id: generateId(),
        type: 'note_add',
        operatorName: authorName,
        timestamp: Date.now(),
        description: `新增交接备注${isPending ? '（待确认）' : ''}：${content.slice(0, 20)}${content.length > 20 ? '...' : ''}`,
      };

      const updatedDraft: Draft = {
        ...state.currentDraft,
        handoverNotes: [...notes, newNote],
        operationLogs: [newLog, ...logs],
        updatedAt: Date.now(),
      };
      debouncedAutoSave(() => get().saveCurrentDraft());
      return { currentDraft: updatedDraft };
    });
  },

  updateHandoverNote: (noteId, updates) => {
    set((state) => {
      if (!state.currentDraft) return state;
      const notes = state.currentDraft.handoverNotes || [];
      const handoverNotes = notes.map((note) =>
        note.id === noteId ? { ...note, ...updates } : note
      );
      const updatedDraft: Draft = {
        ...state.currentDraft,
        handoverNotes,
        updatedAt: Date.now(),
      };
      debouncedAutoSave(() => get().saveCurrentDraft());
      return { currentDraft: updatedDraft };
    });
  },

  removeHandoverNote: (noteId) => {
    set((state) => {
      if (!state.currentDraft) return state;
      const notes = state.currentDraft.handoverNotes || [];
      const handoverNotes = notes.filter(
        (note) => note.id !== noteId
      );
      const updatedDraft: Draft = {
        ...state.currentDraft,
        handoverNotes,
        updatedAt: Date.now(),
      };
      debouncedAutoSave(() => get().saveCurrentDraft());
      return { currentDraft: updatedDraft };
    });
  },

  confirmHandoverNote: (noteId, confirmerName) => {
    set((state) => {
      if (!state.currentDraft) return state;
      const notes = state.currentDraft.handoverNotes || [];
      let confirmedNote: HandoverNote | undefined;
      const handoverNotes = notes.map((note) =>
        note.id === noteId
          ? {
              ...note,
              isPending: false,
              confirmedByName: confirmerName,
              confirmedAt: Date.now(),
            }
          : note
      );
      confirmedNote = notes.find(n => n.id === noteId);

      const logs = state.currentDraft.operationLogs || [];
      const newLog: OperationLogEntry = {
        id: generateId(),
        type: 'note_confirm',
        operatorName: confirmerName,
        timestamp: Date.now(),
        description: `确认备注：${confirmedNote ? confirmedNote.content.slice(0, 20) + (confirmedNote.content.length > 20 ? '...' : '') : ''}`,
      };

      const updatedDraft: Draft = {
        ...state.currentDraft,
        handoverNotes,
        operationLogs: [newLog, ...logs],
        updatedAt: Date.now(),
      };
      debouncedAutoSave(() => get().saveCurrentDraft());
      return { currentDraft: updatedDraft };
    });
  },

  setPreliminaryReview: (result) => {
    set((state) => {
      if (!state.currentDraft) return state;
      const fromStatus = state.currentDraft.status;
      const newStatus: Draft['status'] = state.currentDraft.judgment.needsReview ? 'pending_review' : fromStatus;
      const updatedDraft: Draft = {
        ...state.currentDraft,
        status: newStatus,
        judgment: {
          ...state.currentDraft.judgment,
          preliminaryReview: result,
          clarity: result.clarity,
          completeness: result.completeness,
          defects: result.defects,
          rejectionReason: result.rejectionReason,
          conclusion: result.conclusion,
          reviewerName: result.reviewerName,
          reviewedAt: result.reviewedAt,
        },
        updatedAt: Date.now(),
      };
      debouncedAutoSave(() => get().saveCurrentDraft());

      if (state.currentDraft.judgment.needsReview) {
        const logs = state.currentDraft.operationLogs || [];
        const newLog: OperationLogEntry = {
          id: generateId(),
          type: 'preliminary_save',
          operatorName: result.reviewerName,
          timestamp: Date.now(),
          description: `初判保存，结论：${result.conclusion === 'pass' ? '合格' : result.conclusion === 'fail' ? '不合格' : '未判定'}，流转为待复核`,
          fromStatus,
          toStatus: newStatus,
        };
        updatedDraft.operationLogs = [newLog, ...logs];
      }

      return { currentDraft: updatedDraft };
    });
  },

  setFinalReview: (result) => {
    set((state) => {
      if (!state.currentDraft) return state;
      const isConsistent = state.currentDraft.judgment.preliminaryReview
        ? state.currentDraft.judgment.preliminaryReview.conclusion === result.conclusion
        : null;
      const needsDecision = isConsistent === false;
      const fromStatus = state.currentDraft.status;
      let newStatus: Draft['status'] = fromStatus;
      if (needsDecision) {
        newStatus = 'pending_review';
      } else if (isConsistent === true) {
        newStatus = 'completed';
      }

      const updatedDraft: Draft = {
        ...state.currentDraft,
        status: newStatus,
        judgment: {
          ...state.currentDraft.judgment,
          finalReview: result,
          clarity: result.clarity,
          completeness: result.completeness,
          defects: result.defects,
          rejectionReason: result.rejectionReason,
          conclusion: result.conclusion,
          reviewerName: result.reviewerName,
          reviewedAt: result.reviewedAt,
          isConsistent,
          finalDecision: needsDecision ? state.currentDraft.judgment.finalDecision : null,
        },
        updatedAt: Date.now(),
      };

      const logs = state.currentDraft.operationLogs || [];
      const newLog: OperationLogEntry = {
        id: generateId(),
        type: 'final_save',
        operatorName: result.reviewerName,
        timestamp: Date.now(),
        description: `复核保存，结论：${result.conclusion === 'pass' ? '合格' : result.conclusion === 'fail' ? '不合格' : '未判定'}，与初判${isConsistent === true ? '一致' : isConsistent === false ? '不一致' : '无法判断'}${newStatus === 'completed' ? '，核查完成' : newStatus === 'pending_review' ? '，待最终裁定' : ''}`,
        fromStatus,
        toStatus: newStatus,
      };
      updatedDraft.operationLogs = [newLog, ...logs];

      debouncedAutoSave(() => get().saveCurrentDraft());
      return { currentDraft: updatedDraft };
    });
  },

  clearFinalReview: () => {
    set((state) => {
      if (!state.currentDraft) return state;
      const preliminary = state.currentDraft.judgment.preliminaryReview;
      const updatedDraft: Draft = {
        ...state.currentDraft,
        status: preliminary ? 'pending_review' : 'incomplete',
        judgment: {
          ...state.currentDraft.judgment,
          finalReview: null,
          isConsistent: null,
          finalDecision: null,
          clarity: preliminary?.clarity || '',
          completeness: preliminary?.completeness || '',
          defects: preliminary?.defects || [],
          rejectionReason: preliminary?.rejectionReason || '',
          conclusion: preliminary?.conclusion || '',
          reviewerName: preliminary?.reviewerName || '',
          reviewedAt: preliminary?.reviewedAt || 0,
        },
        updatedAt: Date.now(),
      };
      debouncedAutoSave(() => get().saveCurrentDraft());
      return { currentDraft: updatedDraft };
    });
  },

  getReviewProgress: () => {
    const { currentDraft } = get();
    if (!currentDraft) return 0;

    const { patientInfo, images, judgment } = currentDraft;
    const needsReview = judgment.needsReview;
    const hasPreliminary = !!judgment.preliminaryReview;
    const hasFinal = !!judgment.finalReview;
    const isInconsistent = needsReview && hasPreliminary && hasFinal && judgment.isConsistent === false;
    const hasDecision = !!judgment.finalDecision;

    let totalSteps = 4;
    let completedSteps = 0;

    if (patientInfo.studyNo && patientInfo.name) {
      completedSteps++;
    }

    if (images.length > 0) {
      completedSteps++;
    }

    completedSteps++;

    if (needsReview) {
      totalSteps = 5;
      if (hasPreliminary && hasFinal) {
        if (isInconsistent) {
          if (hasDecision) {
            completedSteps += 2;
          } else {
            completedSteps += 1;
          }
        } else {
          completedSteps += 2;
        }
      } else if (hasPreliminary) {
        completedSteps += 0;
      }
    } else {
      if (judgment.clarity && judgment.completeness && judgment.conclusion) {
        completedSteps++;
      }
    }

    return Math.min(100, Math.round((completedSteps / totalSteps) * 100));
  },

  setNeedsReview: (needs) => {
    set((state) => {
      if (!state.currentDraft) return state;
      let newStatus = state.currentDraft.status;
      if (needs) {
        const hasPreliminary = !!state.currentDraft.judgment.preliminaryReview;
        const hasFinal = !!state.currentDraft.judgment.finalReview;
        if (hasPreliminary && !hasFinal && newStatus !== 'completed') {
          newStatus = 'pending_review';
        }
      } else {
        if (newStatus === 'pending_review') {
          newStatus = 'incomplete';
        }
      }
      const updatedDraft: Draft = {
        ...state.currentDraft,
        status: newStatus,
        judgment: {
          ...state.currentDraft.judgment,
          needsReview: needs,
        },
        updatedAt: Date.now(),
      };
      debouncedAutoSave(() => get().saveCurrentDraft());
      return { currentDraft: updatedDraft };
    });
  },

  setFinalDecision: (decision) => {
    set((state) => {
      if (!state.currentDraft) return state;
      const fromStatus = state.currentDraft.status;
      const newStatus: Draft['status'] = 'completed';
      const updatedDraft: Draft = {
        ...state.currentDraft,
        status: newStatus,
        judgment: {
          ...state.currentDraft.judgment,
          finalDecision: decision,
          conclusion: decision.finalConclusion,
        },
        updatedAt: Date.now(),
      };

      const logs = state.currentDraft.operationLogs || [];
      const newLog: OperationLogEntry = {
        id: generateId(),
        type: 'decision_save',
        operatorName: decision.deciderName,
        timestamp: Date.now(),
        description: `最终裁定：${decision.finalConclusion === 'pass' ? '合格' : decision.finalConclusion === 'fail' ? '不合格' : '未判定'}，裁定意见：${decision.decisionOpinion || '无'}，核查完成`,
        fromStatus,
        toStatus: newStatus,
      };
      updatedDraft.operationLogs = [newLog, ...logs];

      debouncedAutoSave(() => get().saveCurrentDraft());
      return { currentDraft: updatedDraft };
    });
  },

  clearFinalDecision: () => {
    set((state) => {
      if (!state.currentDraft) return state;
      const updatedDraft: Draft = {
        ...state.currentDraft,
        status: 'pending_review',
        judgment: {
          ...state.currentDraft.judgment,
          finalDecision: null,
        },
        updatedAt: Date.now(),
      };
      debouncedAutoSave(() => get().saveCurrentDraft());
      return { currentDraft: updatedDraft };
    });
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

  addOperationLog: (type, operatorName, description, toStatus) => {
    set((state) => {
      if (!state.currentDraft) return state;
      const fromStatus = state.currentDraft.status;
      const newLog: OperationLogEntry = {
        id: generateId(),
        type,
        operatorName,
        timestamp: Date.now(),
        description,
        fromStatus,
        toStatus: toStatus || fromStatus,
      };
      const logs = state.currentDraft.operationLogs || [];
      const updatedDraft: Draft = {
        ...state.currentDraft,
        operationLogs: [newLog, ...logs],
        updatedAt: Date.now(),
      };
      debouncedAutoSave(() => get().saveCurrentDraft());
      return { currentDraft: updatedDraft };
    });
  },
}));
