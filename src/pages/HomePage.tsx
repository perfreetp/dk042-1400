import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { DropZone } from '@/components/business/DropZone';
import { useReviewStore } from '@/store/useReviewStore';
import { useDraftStore } from '@/store/useDraftStore';
import { Card } from '@/components/common/Card';
import { Button } from '@/components/common/Button';
import { formatDateTime } from '@/utils/date';
import { FileText, Plus, Clock, CheckCircle, AlertCircle, FileImage, ShieldCheck } from 'lucide-react';

export function HomePage() {
  const navigate = useNavigate();
  const { createNewDraft, addImage, currentDraft, showToast } = useReviewStore();
  const { drafts, loadDrafts, getIncompleteCount, getDraftCount, getPendingReviewCount } = useDraftStore();

  useEffect(() => {
    loadDrafts();
  }, [loadDrafts]);

  const handleFilesSelected = async (files: File[]) => {
    if (files.length === 0) return;

    const draft = currentDraft || createNewDraft();
    
    for (const file of files) {
      await addImage(file);
    }
    
    showToast(`已添加 ${files.length} 张图片`, 'success');
    navigate(`/viewer/${draft.id}`);
  };

  const handleNewReview = () => {
    const draft = createNewDraft();
    navigate(`/viewer/${draft.id}`);
  };

  const handleContinueDraft = (draftId: string) => {
    navigate(`/viewer/${draftId}`);
  };

  const incompleteCount = getIncompleteCount();
  const totalCount = getDraftCount();
  const pendingReviewCount = getPendingReviewCount();
  const recentDrafts = drafts.slice(0, 5);

  const getStatusBadge = (status: string) => {
    if (status === 'completed') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs bg-green-100 text-green-700 rounded-full">
          <CheckCircle size={12} />
          已完成
        </span>
      );
    }
    if (status === 'pending_review') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs bg-orange-100 text-orange-700 rounded-full">
          <ShieldCheck size={12} />
          待复核
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs bg-yellow-100 text-yellow-700 rounded-full">
        <Clock size={12} />
        未完成
      </span>
    );
  };

  const getConclusionLabel = (conclusion: string) => {
    if (conclusion === 'pass') return <span className="text-green-600 font-medium">合格</span>;
    if (conclusion === 'fail') return <span className="text-red-600 font-medium">不合格</span>;
    return <span className="text-gray-400">未判定</span>;
  };

  return (
    <div className="space-y-8">
      <div className="text-center py-8">
        <h1 className="text-4xl font-serif font-bold text-medical-800 mb-3">
          胶片数字件质量核查系统
        </h1>
        <p className="text-gray-600 text-lg max-w-2xl mx-auto">
          面向夜班值班医生、轮转技师和质控老师的轻量级质控工具，无需登录，打开即用
        </p>
      </div>

      <div className="grid grid-cols-4 gap-6">
        <Card className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-medical-100 flex items-center justify-center">
            <FileImage size={32} className="text-medical-600" />
          </div>
          <div className="text-3xl font-bold text-medical-800">{totalCount}</div>
          <div className="text-gray-500">总核查数</div>
        </Card>
        <Card className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-orange-100 flex items-center justify-center">
            <ShieldCheck size={32} className="text-orange-600" />
          </div>
          <div className="text-3xl font-bold text-orange-600">{pendingReviewCount}</div>
          <div className="text-gray-500">待复核</div>
        </Card>
        <Card className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-yellow-100 flex items-center justify-center">
            <Clock size={32} className="text-yellow-600" />
          </div>
          <div className="text-3xl font-bold text-yellow-600">{incompleteCount}</div>
          <div className="text-gray-500">未完成草稿</div>
        </Card>
        <Card className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-100 flex items-center justify-center">
            <CheckCircle size={32} className="text-green-600" />
          </div>
          <div className="text-3xl font-bold text-green-600">
            {totalCount - incompleteCount - pendingReviewCount}
          </div>
          <div className="text-gray-500">已完成核查</div>
        </Card>
      </div>

      <DropZone onFilesSelected={handleFilesSelected} multiple={true} />

      <div className="flex justify-center">
        <Button variant="primary" size="lg" onClick={handleNewReview}>
          <Plus size={20} className="mr-2" />
          新建核查
        </Button>
      </div>

      {recentDrafts.length > 0 && (
        <Card
          title="最近草稿"
          subtitle="继续处理未完成的核查，或查看已完成的记录"
          footer={
            <div className="flex justify-end">
              <Button variant="outline" size="sm" onClick={() => navigate('/drafts')}>
                查看全部草稿
              </Button>
            </div>
          }
        >
          <div className="space-y-3">
            {recentDrafts.map((draft) => {
              const statusRingClass =
                draft.status === 'pending_review' ? 'border-l-4 border-l-orange-500' :
                draft.status === 'incomplete' ? 'border-l-4 border-l-yellow-500' :
                draft.status === 'completed' ? 'border-l-4 border-l-green-500' : '';

              return (
                <div
                  key={draft.id}
                  className={`flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-medical-50 transition-colors cursor-pointer group ${statusRingClass}`}
                  onClick={() => handleContinueDraft(draft.id)}
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-lg bg-medical-100 flex items-center justify-center">
                      <FileText size={24} className="text-medical-600" />
                    </div>
                    <div>
                      <div className="font-medium text-gray-800">
                        {draft.patientInfo.name || '未命名患者'}
                      </div>
                      <div className="text-sm text-gray-500">
                        {draft.patientInfo.studyNo || '无检查号'} · {draft.patientInfo.bodyPart || '未填写部位'}
                      </div>
                      <div className="text-xs text-gray-400 mt-1">
                        {formatDateTime(draft.updatedAt)} · {draft.images.length} 张图片
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    {draft.judgment.conclusion && getConclusionLabel(draft.judgment.conclusion)}
                    {getStatusBadge(draft.status)}
                    <Button
                      variant="secondary"
                      size="sm"
                      className="opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleContinueDraft(draft.id);
                      }}
                    >
                      {draft.status === 'incomplete' ? '继续' : draft.status === 'pending_review' ? '审核' : '查看'}
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      <Card title="使用说明">
        <div className="grid grid-cols-4 gap-6">
          <div className="text-center">
            <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-medical-100 flex items-center justify-center text-medical-600 font-bold">
              1
            </div>
            <h3 className="font-medium text-gray-800 mb-1">拖入图片</h3>
            <p className="text-sm text-gray-500">将胶片图片拖入上方区域，或点击选择文件</p>
          </div>
          <div className="text-center">
            <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-medical-100 flex items-center justify-center text-medical-600 font-bold">
              2
            </div>
            <h3 className="font-medium text-gray-800 mb-1">查看标记</h3>
            <p className="text-sm text-gray-500">使用放大镜查看细节，标记污点和阴影</p>
          </div>
          <div className="text-center">
            <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-medical-100 flex items-center justify-center text-medical-600 font-bold">
              3
            </div>
            <h3 className="font-medium text-gray-800 mb-1">质量判定</h3>
            <p className="text-sm text-gray-500">勾选清晰度、完整性，填写退回意见</p>
          </div>
          <div className="text-center">
            <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-medical-100 flex items-center justify-center text-medical-600 font-bold">
              4
            </div>
            <h3 className="font-medium text-gray-800 mb-1">生成结论</h3>
            <p className="text-sm text-gray-500">自动生成合格/不合格结论，打印核验单</p>
          </div>
        </div>
      </Card>
    </div>
  );
}
