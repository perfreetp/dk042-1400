import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useReviewStore } from '@/store/useReviewStore';
import { VerificationSheet } from '@/components/business/VerificationSheet';
import { Button } from '@/components/common/Button';
import { Card } from '@/components/common/Card';
import { Printer, ArrowLeft, Edit, Home, Download } from 'lucide-react';

export function PrintPreviewPage() {
  const { draftId } = useParams<{ draftId: string }>();
  const navigate = useNavigate();
  const { currentDraft, loadDraft, isLoading, completeDraft } = useReviewStore();
  const [isPrinting, setIsPrinting] = useState(false);

  useEffect(() => {
    if (draftId) {
      loadDraft(draftId);
    }
  }, [draftId, loadDraft]);

  const handlePrint = () => {
    setIsPrinting(true);
    setTimeout(() => {
      window.print();
      setIsPrinting(false);
    }, 100);
  };

  const handleBack = () => {
    if (currentDraft?.status === 'incomplete') {
      navigate(`/judgment/${draftId}`);
    } else {
      navigate('/drafts');
    }
  };

  const handleEdit = () => {
    navigate(`/viewer/${draftId}`);
  };

  const handleHome = () => {
    navigate('/');
  };

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
        <p className="text-gray-500">未找到草稿</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="no-print flex items-center justify-between bg-white p-4 rounded-lg shadow-sm sticky top-0 z-10">
        <div className="flex items-center gap-2">
          <Button variant="secondary" onClick={handleBack}>
            <ArrowLeft size={16} className="mr-2" />
            返回
          </Button>
          <h2 className="text-xl font-serif font-bold text-medical-800 ml-2">
            打印预览
          </h2>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={handleEdit}>
            <Edit size={16} className="mr-2" />
            返回编辑
          </Button>
          <Button variant="primary" onClick={handlePrint} loading={isPrinting}>
            <Printer size={16} className="mr-2" />
            打印核验单
          </Button>
          <Button variant="outline" onClick={handleHome}>
            <Home size={16} className="mr-2" />
            返回首页
          </Button>
        </div>
      </div>

      <Card className="no-print">
        <div className="flex items-center gap-4 p-4 bg-medical-50 rounded-lg">
          <div className="w-12 h-12 rounded-full bg-medical-600 flex items-center justify-center">
            <Printer size={24} className="text-white" />
          </div>
          <div className="flex-1">
            <h3 className="font-medium text-medical-800">打印提示</h3>
            <p className="text-sm text-medical-600">
              请确认打印机已连接，建议使用A4纸张进行打印。打印时将自动隐藏工具栏和导航栏。
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="primary" onClick={handlePrint} loading={isPrinting}>
              <Download size={16} className="mr-2" />
              下载PDF（通过打印对话框）
            </Button>
          </div>
        </div>
      </Card>

      <div className="print-area">
        <VerificationSheet draft={currentDraft} />
      </div>

      <div className="no-print flex justify-center gap-4 pt-4 pb-8">
        <Button variant="secondary" size="lg" onClick={handleBack}>
          <ArrowLeft size={18} className="mr-2" />
          返回编辑
        </Button>
        <Button variant="primary" size="lg" onClick={handlePrint} loading={isPrinting}>
          <Printer size={18} className="mr-2" />
          打印核验单
        </Button>
      </div>
    </div>
  );
}
