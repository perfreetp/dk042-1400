import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDraftStore } from '@/store/useDraftStore';
import { Card } from '@/components/common/Card';
import { Button } from '@/components/common/Button';
import { Toast } from '@/components/common/Toast';
import { formatDateTime, formatDate } from '@/utils/date';
import type { Draft, DraftStatus, Conclusion } from '@/types';
import {
  FileText,
  Trash2,
  Edit,
  Eye,
  Clock,
  CheckCircle,
  AlertCircle,
  Search,
  Filter,
  Download,
  Calendar,
  Target,
  CheckSquare,
  Square,
  X,
  ChevronDown,
} from 'lucide-react';

type ConclusionFilter = 'all' | Conclusion;
type MarkFilter = 'all' | 'has_mark' | 'no_mark';

interface DraftExportRow {
  studyNo: string;
  patientName: string;
  gender: string;
  age: string;
  bodyPart: string;
  studyDate: string;
  imageCount: number;
  markCount: number;
  clarity: string;
  completeness: string;
  defectCount: number;
  defects: string;
  conclusion: string;
  rejectionReason: string;
  reviewerName: string;
  reviewedAt: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

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

const defectLabels: Record<string, string> = {
  stain: '污点',
  shadow: '阴影',
  artifact: '伪影',
  thickness: '层厚不均',
  position: '位置偏差',
};

const genderLabels: Record<string, string> = {
  male: '男',
  female: '女',
};

export function DraftPage() {
  const navigate = useNavigate();
  const { drafts, loadDrafts, deleteDraft, clearOldDrafts, getDraftCount, getIncompleteCount } = useDraftStore();

  const [statusFilter, setStatusFilter] = useState<DraftStatus | 'all'>('all');
  const [conclusionFilter, setConclusionFilter] = useState<ConclusionFilter>('all');
  const [markFilter, setMarkFilter] = useState<MarkFilter>('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showFilters, setShowFilters] = useState(true);
  const [toast, setToast] = useState({ message: '', type: 'info' as 'success' | 'error' | 'info', visible: false });

  useEffect(() => {
    loadDrafts();
  }, [loadDrafts]);

  const hasMarks = (draft: Draft) => draft.images.some(img => img.marks.length > 0);

  const filteredDrafts = drafts.filter((draft) => {
    if (statusFilter !== 'all' && draft.status !== statusFilter) return false;
    if (conclusionFilter !== 'all' && draft.judgment.conclusion !== conclusionFilter) return false;
    if (markFilter === 'has_mark' && !hasMarks(draft)) return false;
    if (markFilter === 'no_mark' && hasMarks(draft)) return false;

    if (dateFrom) {
      const draftDate = draft.patientInfo.studyDate || new Date(draft.createdAt).toISOString().split('T')[0];
      if (draftDate < dateFrom) return false;
    }
    if (dateTo) {
      const draftDate = draft.patientInfo.studyDate || new Date(draft.createdAt).toISOString().split('T')[0];
      if (draftDate > dateTo) return false;
    }

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

  const completedDrafts = filteredDrafts.filter(d => d.status === 'completed');
  const allSelected = filteredDrafts.length > 0 && filteredDrafts.every(d => selectedIds.has(d.id));

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredDrafts.map(d => d.id)));
    }
  };

  const toggleSelectOne = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const draftToExportRow = (draft: Draft): DraftExportRow => {
    const markCount = draft.images.reduce((sum, img) => sum + img.marks.length, 0);
    return {
      studyNo: draft.patientInfo.studyNo,
      patientName: draft.patientInfo.name,
      gender: genderLabels[draft.patientInfo.gender] || '',
      age: draft.patientInfo.age,
      bodyPart: draft.patientInfo.bodyPart,
      studyDate: draft.patientInfo.studyDate,
      imageCount: draft.images.length,
      markCount,
      clarity: clarityLabels[draft.judgment.clarity] || '',
      completeness: completenessLabels[draft.judgment.completeness] || '',
      defectCount: draft.judgment.defects.length,
      defects: draft.judgment.defects.map(d => defectLabels[d]).join('|'),
      conclusion: draft.judgment.conclusion === 'pass' ? '合格' : draft.judgment.conclusion === 'fail' ? '不合格' : '',
      rejectionReason: draft.judgment.rejectionReason,
      reviewerName: draft.judgment.reviewerName,
      reviewedAt: draft.judgment.reviewedAt ? formatDateTime(draft.judgment.reviewedAt) : '',
      status: draft.status === 'completed' ? '已完成' : '未完成',
      createdAt: formatDateTime(draft.createdAt),
      updatedAt: formatDateTime(draft.updatedAt),
    };
  };

  const exportToCSV = (draftsToExport: Draft[], filename: string) => {
    if (draftsToExport.length === 0) {
      showToast('没有可导出的数据', 'error');
      return;
    }

    const rows = draftsToExport.map(draftToExportRow);
    const headers: (keyof DraftExportRow)[] = [
      'studyNo', 'patientName', 'gender', 'age', 'bodyPart', 'studyDate',
      'imageCount', 'markCount', 'clarity', 'completeness',
      'defectCount', 'defects', 'conclusion', 'rejectionReason',
      'reviewerName', 'reviewedAt', 'status', 'createdAt', 'updatedAt'
    ];
    const headerLabels: Record<keyof DraftExportRow, string> = {
      studyNo: '检查号',
      patientName: '患者姓名',
      gender: '性别',
      age: '年龄',
      bodyPart: '检查部位',
      studyDate: '检查日期',
      imageCount: '图片数量',
      markCount: '标记数量',
      clarity: '清晰度',
      completeness: '完整性',
      defectCount: '缺陷项数',
      defects: '缺陷类型',
      conclusion: '审核结论',
      rejectionReason: '退回意见',
      reviewerName: '审核人员',
      reviewedAt: '审核时间',
      status: '核查状态',
      createdAt: '创建时间',
      updatedAt: '更新时间',
    };

    const escapeCSV = (value: string | number): string => {
      const str = String(value ?? '');
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    const csvLines = [
      headers.map(h => escapeCSV(headerLabels[h])).join(','),
      ...rows.map(row => headers.map(h => escapeCSV(row[h])).join(','))
    ];

    const csvContent = '\uFEFF' + csvLines.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${filename}_${formatDate(Date.now())}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    showToast(`已导出 ${draftsToExport.length} 条数据`, 'success');
  };

  const handleExportAll = () => {
    exportToCSV(completedDrafts, '质控核验汇总');
  };

  const handleExportSelected = () => {
    const selected = filteredDrafts.filter(d => selectedIds.has(d.id) && d.status === 'completed');
    if (selected.length === 0) {
      showToast('请先选择已完成的核验单', 'error');
      return;
    }
    exportToCSV(selected, '质控核验选择');
  };

  const handleDelete = (draftId: string) => {
    if (confirm('确定要删除这份草稿吗？此操作无法撤销。')) {
      const success = deleteDraft(draftId);
      if (success) {
        setSelectedIds(prev => {
          const next = new Set(prev);
          next.delete(draftId);
          return next;
        });
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
        setSelectedIds(new Set());
      } else {
        showToast('没有需要清理的旧草稿', 'info');
      }
    }
  };

  const handleResetFilters = () => {
    setStatusFilter('all');
    setConclusionFilter('all');
    setMarkFilter('all');
    setDateFrom('');
    setDateTo('');
    setSearchTerm('');
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

  const getMarkCount = (draft: Draft) => {
    return draft.images.reduce((sum, img) => sum + img.marks.length, 0);
  };

  const activeFilterCount = [
    statusFilter !== 'all',
    conclusionFilter !== 'all',
    markFilter !== 'all',
    !!dateFrom,
    !!dateTo,
  ].filter(Boolean).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-serif font-bold text-medical-800">草稿箱</h2>
          <p className="text-gray-500 text-sm mt-1">
            共 {getDraftCount()} 份草稿，{getIncompleteCount()} 份未完成，{getDraftCount() - getIncompleteCount()} 份已完成
          </p>
        </div>
        <div className="flex gap-2">
          {selectedIds.size > 0 && (
            <Button variant="success" onClick={handleExportSelected}>
              <Download size={16} className="mr-2" />
              导出选中 ({selectedIds.size})
            </Button>
          )}
          <Button variant="secondary" onClick={handleExportAll}>
            <Download size={16} className="mr-2" />
            导出全部已完成 ({completedDrafts.length})
          </Button>
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
        <div className="space-y-4">
          <div className="flex gap-4 items-center justify-between">
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
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="flex items-center gap-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <span>筛选</span>
                {activeFilterCount > 0 && (
                  <span className="bg-medical-600 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center">
                    {activeFilterCount}
                  </span>
                )}
                <ChevronDown size={16} className={`transition-transform ${showFilters ? 'rotate-180' : ''}`} />
              </button>
            </div>
          </div>

          {showFilters && (
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 pt-4 border-t border-gray-100">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">核查状态</label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as DraftStatus | 'all')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-medical-500 focus:border-transparent bg-white text-sm"
                >
                  <option value="all">全部状态</option>
                  <option value="incomplete">未完成</option>
                  <option value="completed">已完成</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">审核结论</label>
                <select
                  value={conclusionFilter}
                  onChange={(e) => setConclusionFilter(e.target.value as ConclusionFilter)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-medical-500 focus:border-transparent bg-white text-sm"
                >
                  <option value="all">全部结论</option>
                  <option value="pass">合格</option>
                  <option value="fail">不合格</option>
                  <option value="">未判定</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">图片标记</label>
                <select
                  value={markFilter}
                  onChange={(e) => setMarkFilter(e.target.value as MarkFilter)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-medical-500 focus:border-transparent bg-white text-sm"
                >
                  <option value="all">全部</option>
                  <option value="has_mark">有标记</option>
                  <option value="no_mark">无标记</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5 flex items-center gap-1">
                  <Calendar size={14} />
                  检查日期起
                </label>
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-medical-500 focus:border-transparent bg-white text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5 flex items-center gap-1">
                  <Calendar size={14} />
                  检查日期止
                </label>
                <div className="flex gap-2">
                  <input
                    type="date"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-medical-500 focus:border-transparent bg-white text-sm"
                  />
                  <button
                    onClick={handleResetFilters}
                    className="px-3 py-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                    title="重置筛选"
                  >
                    <X size={18} />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </Card>

      {filteredDrafts.length === 0 ? (
        <Card className="text-center py-12">
          <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center">
            <FileText size={40} className="text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-700 mb-2">暂无草稿</h3>
          <p className="text-gray-500 mb-4">
            {searchTerm || statusFilter !== 'all' || conclusionFilter !== 'all' || markFilter !== 'all' || dateFrom || dateTo
              ? '没有找到符合条件的草稿，请调整筛选条件'
              : '开始新建第一份核查吧'}
          </p>
          <div className="flex justify-center gap-2">
            {(searchTerm || statusFilter !== 'all' || conclusionFilter !== 'all' || markFilter !== 'all' || dateFrom || dateTo) && (
              <Button variant="secondary" onClick={handleResetFilters}>
                清除筛选
              </Button>
            )}
            <Button variant="primary" onClick={() => navigate('/')}>
              新建核查
            </Button>
          </div>
        </Card>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-500">
              显示 {filteredDrafts.length} 条结果
              {selectedIds.size > 0 && <span className="ml-2 text-medical-600">（已选中 {selectedIds.size} 条）</span>}
            </div>
            <button
              onClick={toggleSelectAll}
              className="flex items-center gap-1.5 text-sm text-gray-600 hover:text-medical-600 transition-colors"
            >
              {allSelected ? (
                <CheckSquare size={16} className="text-medical-600" />
              ) : (
                <Square size={16} />
              )}
              {allSelected ? '取消全选' : '全选当前结果'}
            </button>
          </div>

          {filteredDrafts.map((draft) => {
            const markCount = getMarkCount(draft);
            const isSelected = selectedIds.has(draft.id);

            return (
              <Card key={draft.id} className={`hover:shadow-lg transition-shadow ${isSelected ? 'ring-2 ring-medical-400' : ''}`}>
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4 flex-1">
                    <button
                      onClick={() => toggleSelectOne(draft.id)}
                      className="mt-2 flex-shrink-0 text-gray-400 hover:text-medical-600 transition-colors"
                    >
                      {isSelected ? <CheckSquare size={20} className="text-medical-600" /> : <Square size={20} />}
                    </button>

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

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-2 flex-wrap">
                        <h3 className="text-lg font-semibold text-gray-800">
                          {draft.patientInfo.name || '未命名患者'}
                        </h3>
                        {getStatusBadge(draft.status)}
                        {draft.judgment.conclusion && (
                          <span className="px-2.5 py-1 text-xs bg-gray-100 rounded-full">
                            {getConclusionLabel(draft.judgment.conclusion)}
                          </span>
                        )}
                        {markCount > 0 && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs bg-orange-50 text-orange-700 rounded-full">
                            <Target size={12} />
                            {markCount} 个标记
                          </span>
                        )}
                      </div>

                      <div className="grid grid-cols-2 lg:grid-cols-5 gap-x-6 gap-y-1.5 text-sm mb-2">
                        <div>
                          <span className="text-gray-500">检查号：</span>
                          <span className="text-gray-800">{draft.patientInfo.studyNo || '-'}</span>
                        </div>
                        <div>
                          <span className="text-gray-500">性别年龄：</span>
                          <span className="text-gray-800">
                            {genderLabels[draft.patientInfo.gender] || '-'}
                            {draft.patientInfo.age ? ` ${draft.patientInfo.age}岁` : ''}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-500">检查部位：</span>
                          <span className="text-gray-800">{draft.patientInfo.bodyPart || '-'}</span>
                        </div>
                        <div>
                          <span className="text-gray-500">检查日期：</span>
                          <span className="text-gray-800">{draft.patientInfo.studyDate || '-'}</span>
                        </div>
                        <div>
                          <span className="text-gray-500">图片数量：</span>
                          <span className="text-gray-800">{draft.images.length} 张</span>
                        </div>
                      </div>

                      {draft.judgment.defects.length > 0 && (
                        <div className="text-sm mb-2">
                          <span className="text-gray-500">缺陷：</span>
                          <span className="text-orange-600">
                            {draft.judgment.defects.map(d => defectLabels[d]).join('、')}
                          </span>
                        </div>
                      )}

                      <div className="flex items-center gap-6 text-xs text-gray-400 flex-wrap">
                        <span>创建：{formatDateTime(draft.createdAt)}</span>
                        <span>更新：{formatDateTime(draft.updatedAt)}</span>
                        {draft.judgment.reviewerName && (
                          <span>审核：{draft.judgment.reviewerName}</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2 ml-4 flex-shrink-0">
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
            );
          })}
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
