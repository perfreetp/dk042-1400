import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDraftStore } from '@/store/useDraftStore';
import { Card } from '@/components/common/Card';
import { Button } from '@/components/common/Button';
import { Toast } from '@/components/common/Toast';
import { formatDateTime } from '@/utils/date';
import { FileText, Trash2, Edit, Eye, Clock, CheckCircle, AlertCircle, Search, Filter } from 'lucide-react';
import type { Draft, DraftStatus } from '@/types';

export function DraftPage() {
  const navigate = useNavigate();
  const { drafts, loadDrafts, deleteDraft, clearOldDrafts, getDraftCount, getIncompleteCount } = useDraftStore();
  
  const [filter, setFilter] = useState<DraftStatus | 'all'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [toast, setToast] = useState({ message: '', type: 'info' as 'success' | 'error' | 'info', visible: false });

  useEffect(() => {
    loadDrafts();
  }, [loadDrafts]);

  const filteredDrafts = drafts.filter((draft) => {
    if (filter !== 'all' && draft.status !== filter) return false;
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      return (
        draft.patientInfo.name.toLowerCase().includes(term) ||
        draft.patientInfo.studyNo.toLowerCase().includes(term) ||
        draft.patientInfo.bodyPart.toLowerCase().includes(term)
      );
    }
    return true;
  });

  const handleDelete = (draftId: string) => {
    if (confirm('确定要删除这份草稿吗？此操作无法撤销。')) {
      const success = deleteDraft(draftId);
      if (success) {
        showToast('删除成功', 'success');
      } else {
        showToast('删除失败', 'error');
      }
    }
  };

  const handleClearOld = () => {
    if (confirm('确定要删除30天前的所有草稿吗？此操作无法撤销。')) {
      const count = clearOldDrafts(30);
      if (count > 0) {
        showToast(`已清理 ${count} 份旧草稿`, 'success');
      } else {
        showToast('没有需要清理的旧草稿', 'info');
      }
    }
  };

  const handleContinue = (draftId: string) => {
    navigate(`/viewer/${draftId}`);
  };

  const handleView = (draftId: string) => {
    navigate(`/print/${draftId}`);
  };

  const showToast = (message: string, type: 'success' | 'error' | 'info') => {
    setToast({ message, type, visible: true });
    setTimeout(() => setToast((prev) => ({ ...prev, visible: false })), 3000);
  };

  const getStatusBadge = (status: string) => {
    if (status === 'completed') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs bg-green-100 text-green-700 rounded-full">
          <CheckCircle size={12} />
          已完成
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs bg-yellow-100 text-yellow-700 rounded-full">
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

  const getDefectCount = (draft: Draft) => {
    return draft.images.reduce((sum, img) => sum + img.marks.length, 0);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-serif font-bold text-medical-800">草稿箱</h2>
          <p className="text-gray-500 text-sm mt-1">
            共 {getDraftCount()} 份草稿，{getIncompleteCount()} 份未完成
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={handleClearOld}>
            <Trash2 size={16} className="mr-2" />
            清理30天前
          </Button>
          <Button variant="primary" onClick={() => navigate('/')}>
            新建核查
          </Button>
        </div>
      </div>

      <Card>
        <div className="flex gap-4 items-center">
          <div className="relative flex-1">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="搜索患者姓名、检查号、检查部位..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-medical-500 focus:border-transparent"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter size={18} className="text-gray-400" />
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value as DraftStatus | 'all')}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-medical-500 focus:border-transparent bg-white"
            >
              <option value="all">全部状态</option>
              <option value="incomplete">未完成</option>
              <option value="completed">已完成</option>
            </select>
          </div>
        </div>
      </Card>

      {filteredDrafts.length === 0 ? (
        <Card className="text-center py-12">
          <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center">
            <FileText size={40} className="text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-700 mb-2">暂无草稿</h3>
          <p className="text-gray-500 mb-4">
            {searchTerm || filter !== 'all' ? '没有找到符合条件的草稿' : '开始新建第一份核查吧'}
          </p>
          <Button variant="primary" onClick={() => navigate('/')}>
            新建核查
          </Button>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredDrafts.map((draft) => (
            <Card key={draft.id} className="hover:shadow-lg transition-shadow">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-4 flex-1">
                  <div className="w-20 h-20 rounded-lg bg-medical-50 border border-medical-100 flex items-center justify-center flex-shrink-0 overflow-hidden">
                    {draft.images.length > 0 ? (
                      <img
                        src={draft.images[0].dataUrl}
                        alt={draft.patientInfo.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <FileText size={28} className="text-medical-400" />
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold text-gray-800">
                        {draft.patientInfo.name || '未命名患者'}
                      </h3>
                      {getStatusBadge(draft.status)}
                      {draft.judgment.conclusion && (
                        <span className="px-2.5 py-1 text-xs bg-gray-100 rounded-full">
                          {getConclusionLabel(draft.judgment.conclusion)}
                        </span>
                      )}
                    </div>
                    <div className="grid grid-cols-4 gap-4 text-sm mb-3">
                      <div>
                        <span className="text-gray-500">检查号：</span>
                        <span className="text-gray-800">{draft.patientInfo.studyNo || '-'}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">性别年龄：</span>
                        <span className="text-gray-800">
                          {draft.patientInfo.gender === 'male' ? '男' : draft.patientInfo.gender === 'female' ? '女' : '-'}
                          {draft.patientInfo.age ? ` ${draft.patientInfo.age}岁` : ''}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-500">检查部位：</span>
                        <span className="text-gray-800">{draft.patientInfo.bodyPart || '-'}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">图片数量：</span>
                        <span className="text-gray-800">{draft.images.length} 张</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-6 text-xs text-gray-400">
                      <span>创建：{formatDateTime(draft.createdAt)}</span>
                      <span>更新：{formatDateTime(draft.updatedAt)}</span>
                      {getDefectCount(draft) > 0 && (
                        <span className="flex items-center gap-1">
                          <AlertCircle size={12} className="text-orange-500" />
                          {getDefectCount(draft)} 个标记
                        </span>
                      )}
                      {draft.judgment.defects.length > 0 && (
                        <span className="text-orange-500">
                          {draft.judgment.defects.length} 项缺陷
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex gap-2 ml-4">
                  {draft.status === 'incomplete' ? (
                    <Button variant="primary" size="sm" onClick={() => handleContinue(draft.id)}>
                      <Edit size={14} className="mr-1.5" />
                      继续编辑
                    </Button>
                  ) : (
                    <Button variant="primary" size="sm" onClick={() => handleView(draft.id)}>
                      <Eye size={14} className="mr-1.5" />
                      查看核验单
                    </Button>
                  )}
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => handleDelete(draft.id)}
                    className="bg-white text-red-500 border border-red-200 hover:bg-red-50 hover:text-red-600"
                  >
                    <Trash2 size={14} className="mr-1.5" />
                    删除
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Toast
        message={toast.message}
        type={toast.type}
        visible={toast.visible}
        onClose={() => setToast((prev) => ({ ...prev, visible: false }))}
      />
    </div>
  );
}
