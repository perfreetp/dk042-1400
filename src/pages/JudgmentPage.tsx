import { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useReviewStore } from '@/store/useReviewStore';
import { JudgmentForm } from '@/components/business/JudgmentForm';
import { Toast } from '@/components/common/Toast';

export function JudgmentPage() {
  const { draftId } = useParams<{ draftId: string }>();
  const { currentDraft, loadDraft, isLoading, toast, hideToast } = useReviewStore();

  useEffect(() => {
    if (draftId) {
      loadDraft(draftId);
    }
  }, [draftId, loadDraft]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-medical-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-500">加载中...</p>
        </div>
      </div>
    );
  }

  if (!currentDraft) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-500">未找到草稿，请先添加图片</p>
      </div>
    );
  }

  return (
    <div>
      <JudgmentForm />
      <Toast
        message={toast.message}
        type={toast.type}
        visible={toast.visible}
        onClose={hideToast}
      />
    </div>
  );
}
