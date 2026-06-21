import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDraftStore } from '@/store/useDraftStore';
import { Card } from '@/components/common/Card';
import { Button } from '@/components/common/Button';
import { Toast } from '@/components/common/Toast';
import { formatDateTime, formatDate } from '@/utils/date';
import type { Draft, DraftStatus, Conclusion, ShiftType } from '@/types';
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
  Sun,
  Moon,
  BarChart3,
  MessageSquareWarning,
  ShieldAlert,
  ClipboardList,
  UserX,
  ArrowRight,
  ChevronRight,
  Gavel,
  ShieldCheck,
  Users,
} from 'lucide-react';

type ConclusionFilter = 'all' | Conclusion;
type MarkFilter = 'all' | 'has_mark' | 'no_mark';
type ShiftFilter = 'all' | ShiftType;

const getShiftType = (timestamp: number): ShiftType => {
  const hour = new Date(timestamp).getHours();
  return hour >= 8 && hour < 18 ? 'day' : 'night';
};

const isToday = (timestamp: number): boolean => {
  const today = new Date();
  const date = new Date(timestamp);
  return today.getFullYear() === date.getFullYear() &&
         today.getMonth() === date.getMonth() &&
         today.getDate() === date.getDate();
};

interface ShiftStats {
  total: number;
  completed: number;
  pendingReview: number;
  incomplete: number;
  pass: number;
  fail: number;
  pendingNotes: number;
  pendingReviewList: Draft[];
  incompleteList: Draft[];
  completedList: Draft[];
  pendingNoteList: Draft[];
  allDrafts: Draft[];
}

interface ShiftHandoverDetailProps {
  shift: ShiftType;
  stats: ShiftStats;
  getNextStep: (d: Draft) => string;
  getStatusText: (d: Draft) => string;
  onOpenDraft: (id: string) => void;
}

function ShiftHandoverDetail({ shift, stats, getNextStep, getStatusText, onOpenDraft }: ShiftHandoverDetailProps) {
  const genderLabels: Record<string, string> = { male: '男', female: '女' };
  const shiftName = shift === 'day' ? '白班' : '夜班';

  type ListType = 'pendingReview' | 'incomplete' | 'pendingNote';
  const getItemsForDraft = (draft: Draft, listType: ListType): { value: string; color: string }[] => {
    switch (listType) {
      case 'pendingReview':
        return [
          { value: getStatusText(draft), color: 'text-orange-600' },
          { value: getNextStep(draft), color: 'text-orange-500' },
        ];
      case 'incomplete':
        return [
          { value: getStatusText(draft), color: 'text-yellow-600' },
          { value: getNextStep(draft), color: 'text-yellow-500' },
        ];
      case 'pendingNote':
        return [
          { value: `待确认${(draft.handoverNotes?.filter(n => n.isPending).length || 0)}条`, color: 'text-red-600' },
          { value: getStatusText(draft), color: 'text-red-500' },
        ];
    }
  };

  const DraftCardList = ({ title, icon, list, emptyText, badgeColor, listType }: {
    title: string; icon: React.ReactNode; list: Draft[]; emptyText: string; badgeColor: string; listType: ListType
  }) => (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className={`px-4 py-3 bg-gradient-to-r from-gray-50 to-white border-b border-gray-100 flex items-center justify-between`}>
        <div className="flex items-center gap-2">
          {icon}
          <span className="font-semibold text-gray-800">{title}</span>
        </div>
        <span className={`text-xs px-2 py-0.5 rounded-full ${badgeColor}`}>
          {list.length} 条
        </span>
      </div>
      <div className="divide-y divide-gray-100 max-h-72 overflow-y-auto">
        {list.length === 0 ? (
          <div className="p-6 text-center text-gray-400 text-sm flex items-center justify-center gap-2">
            <CheckCircle size={16} className="text-green-500" />
            {emptyText}
          </div>
        ) : (
          list.map(draft => {
            const draftItems = getItemsForDraft(draft, listType);
            return (
              <div
                key={draft.id}
                onClick={() => onOpenDraft(draft.id)}
                className="px-4 py-3 hover:bg-gray-50 cursor-pointer transition-colors"
              >
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2 min-w-0">
                    <FileText size={14} className="text-gray-400 flex-shrink-0" />
                    <span className="font-medium text-gray-800 truncate">
                      {draft.patientInfo.name || '未命名患者'}
                    </span>
                    <span className="text-gray-400 text-xs truncate">
                      ({draft.patientInfo.studyNo || '无检查号'})
                    </span>
                  </div>
                  <ChevronRight size={14} className="text-gray-400 flex-shrink-0" />
                </div>
                <div className="flex items-center justify-between text-xs ml-5">
                  <span className="text-gray-500">
                    {draft.patientInfo.bodyPart || '未填写部位'}
                    {draft.patientInfo.gender ? ` · ${genderLabels[draft.patientInfo.gender]}` : ''}
                    {draft.patientInfo.age ? ` · ${draft.patientInfo.age}岁` : ''}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs ml-5 mt-1.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    {draftItems.map((item, idx) => (
                      <span key={idx} className={`inline-flex items-center gap-0.5 ${item.color}`}>
                        {item.value}
                      </span>
                    ))}
                  </div>
                  <span className="text-gray-400 ml-auto">
                    {new Date(draft.updatedAt).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between px-1">
        <div className="text-sm font-medium text-gray-600">
          {shiftName}交班清单 · 按状态分类 · 点击条目直接打开
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
        <DraftCardList
          title="待复核清单"
          icon={<ShieldAlert size={16} className="text-orange-600" />}
          list={stats.pendingReviewList}
          emptyText="✓ 暂无待复核项"
          badgeColor="bg-orange-100 text-orange-700"
          listType="pendingReview"
        />
        <DraftCardList
          title="未完成清单"
          icon={<ClipboardList size={16} className="text-yellow-600" />}
          list={stats.incompleteList}
          emptyText="✓ 暂无未完成项"
          badgeColor="bg-yellow-100 text-yellow-700"
          listType="incomplete"
        />
        <DraftCardList
          title="待确认备注清单"
          icon={<MessageSquareWarning size={16} className="text-red-600" />}
          list={stats.pendingNoteList}
          emptyText="✓ 暂无待确认备注"
          badgeColor="bg-red-100 text-red-700"
          listType="pendingNote"
        />
      </div>
    </div>
  );
}

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
  nextStep: string;
  pendingNotes: string;
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
  const { drafts, loadDrafts, deleteDraft, clearOldDrafts, getDraftCount, getIncompleteCount, getPendingReviewCount } = useDraftStore();

  const [statusFilter, setStatusFilter] = useState<DraftStatus | 'all'>('all');
  const [conclusionFilter, setConclusionFilter] = useState<ConclusionFilter>('all');
  const [markFilter, setMarkFilter] = useState<MarkFilter>('all');
  const [shiftFilter, setShiftFilter] = useState<ShiftFilter>('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showFilters, setShowFilters] = useState(true);
  const [showShiftSummary, setShowShiftSummary] = useState(true);
  const [activeShiftDetail, setActiveShiftDetail] = useState<ShiftType | null>(null);
  const [toast, setToast] = useState({ message: '', type: 'info' as 'success' | 'error' | 'info', visible: false });

  useEffect(() => {
    loadDrafts();
  }, [loadDrafts]);

  const hasMarks = (draft: Draft) => draft.images.some(img => img.marks.length > 0);

  const getNextStep = (draft: Draft): string => {
    const j = draft.judgment;
    const notes = draft.handoverNotes || [];
    const pendingNotes = notes.filter(n => n.isPending).length;

    if (j.needsReview) {
      const hasP = !!j.preliminaryReview;
      const hasF = !!j.finalReview;
      const isIncon = hasP && hasF && j.isConsistent === false;
      const hasDec = !!j.finalDecision;

      if (!hasP) return '待初判';
      if (!hasF) return '待复核';
      if (isIncon && !hasDec) return '待最终裁定';
      if (pendingNotes > 0) return `有${pendingNotes}条待确认备注`;
      return '已完成';
    } else {
      if (!j.clarity || !j.completeness) return '待填写清晰度/完整性';
      if (!j.conclusion) return '待生成结论';
      if (pendingNotes > 0) return `有${pendingNotes}条待确认备注`;
      return '已完成';
    }
  };

  const getStatusText = (draft: Draft): string => {
    if (draft.status === 'completed') return '已完成';
    if (draft.status === 'pending_review') return '待复核';
    return '未完成';
  };

  const shiftSummary = useMemo(() => {
    const todayDrafts = drafts.filter(d => isToday(d.createdAt) || isToday(d.updatedAt));

    const dayShift = todayDrafts.filter(d => {
      const time = d.updatedAt || d.createdAt;
      return isToday(time) && getShiftType(time) === 'day';
    });

    const nightShift = todayDrafts.filter(d => {
      const time = d.updatedAt || d.createdAt;
      return isToday(time) && getShiftType(time) === 'night';
    });

    const getShiftStats = (shiftDrafts: Draft[]) => {
      const pendingReviewList = shiftDrafts.filter(d => d.status === 'pending_review');
      const incompleteList = shiftDrafts.filter(d => d.status === 'incomplete');
      const completedList = shiftDrafts.filter(d => d.status === 'completed');
      const pendingNoteList = shiftDrafts.filter(d => {
        const notes = d.handoverNotes || [];
        return notes.some(n => n.isPending);
      });

      return {
        total: shiftDrafts.length,
        completed: completedList.length,
        pendingReview: pendingReviewList.length,
        incomplete: incompleteList.length,
        pass: shiftDrafts.filter(d => d.judgment.conclusion === 'pass').length,
        fail: shiftDrafts.filter(d => d.judgment.conclusion === 'fail').length,
        pendingNotes: pendingNoteList.length,
        pendingReviewList,
        incompleteList,
        completedList,
        pendingNoteList,
        allDrafts: shiftDrafts,
      };
    };

    return {
      day: getShiftStats(dayShift),
      night: getShiftStats(nightShift),
    };
  }, [drafts]);

  const filteredDrafts = drafts.filter((draft) => {
    if (statusFilter !== 'all' && draft.status !== statusFilter) return false;
    if (conclusionFilter !== 'all' && draft.judgment.conclusion !== conclusionFilter) return false;
    if (markFilter === 'has_mark' && !hasMarks(draft)) return false;
    if (markFilter === 'no_mark' && hasMarks(draft)) return false;

    if (shiftFilter !== 'all') {
      const time = draft.updatedAt || draft.createdAt;
      if (!isToday(time)) return false;
      if (getShiftType(time) !== shiftFilter) return false;
    }

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
    const pendingNoteCount = (draft.handoverNotes || []).filter(n => n.isPending).length;
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
      conclusion: draft.judgment.conclusion === 'pass' ? '合格' : draft.judgment.conclusion === 'fail' ? '不合格' : '未判定',
      rejectionReason: draft.judgment.rejectionReason,
      reviewerName: draft.judgment.reviewerName,
      reviewedAt: draft.judgment.reviewedAt ? formatDateTime(draft.judgment.reviewedAt) : '',
      status: getStatusText(draft),
      nextStep: getNextStep(draft),
      pendingNotes: pendingNoteCount > 0 ? `${pendingNoteCount}条待确认` : '',
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
      'status', 'nextStep', 'pendingNotes',
      'studyNo', 'patientName', 'gender', 'age', 'bodyPart', 'studyDate',
      'imageCount', 'markCount', 'clarity', 'completeness',
      'defectCount', 'defects', 'conclusion', 'rejectionReason',
      'reviewerName', 'reviewedAt', 'createdAt', 'updatedAt'
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
      nextStep: '下一步提示',
      pendingNotes: '交接备注',
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
    setShiftFilter('all');
    setDateFrom('');
    setDateTo('');
    setSearchTerm('');
  };

  const handleExportShift = (shift: ShiftType) => {
    const shiftDrafts = drafts.filter(d => {
      const time = d.updatedAt || d.createdAt;
      if (!isToday(time)) return false;
      if (getShiftType(time) !== shift) return false;
      return true;
    });
    const shiftName = shift === 'day' ? '白班' : '夜班';
    exportToCSV(shiftDrafts, `今日${shiftName}交班汇总表`);
  };

  const handleFilterByShift = (shift: ShiftFilter) => {
    setShiftFilter(shift);
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

  const getStatusBadge = (status: string, draft?: Draft) => {
    if (status === 'completed') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs bg-green-100 text-green-700 rounded-full">
          <CheckCircle size={12} />
          已完成
        </span>
      );
    }
    if (status === 'pending_review') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs bg-orange-100 text-orange-700 rounded-full">
          <ShieldCheck size={12} />
          待复核
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
    shiftFilter !== 'all',
    !!dateFrom,
    !!dateTo,
  ].filter(Boolean).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-serif font-bold text-medical-800">草稿箱 · 交班工作台</h2>
          <p className="text-gray-500 text-sm mt-1">
            共 {getDraftCount()} 份草稿，
            <span className="text-yellow-600 font-medium">{getIncompleteCount()}</span> 份未完成，
            <span className="text-orange-600 font-medium">{getPendingReviewCount()}</span> 份待复核，
            <span className="text-green-600 font-medium">{getDraftCount() - getIncompleteCount() - getPendingReviewCount()}</span> 份已完成
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

      <Card className="overflow-hidden">
        <div
          className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-medical-50 to-blue-50 cursor-pointer hover:from-medical-100 hover:to-blue-100 transition-colors"
          onClick={() => setShowShiftSummary(!showShiftSummary)}
        >
          <div className="flex items-center gap-3">
            <BarChart3 size={20} className="text-medical-600" />
            <span className="font-semibold text-medical-800">今日班次汇总</span>
            <span className="text-xs text-gray-500">
              {new Date().toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' })}
            </span>
          </div>
          <ChevronDown size={18} className={`text-gray-500 transition-transform ${showShiftSummary ? 'rotate-180' : ''}`} />
        </div>

        {showShiftSummary && (
          <div className="p-4 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className={`rounded-xl border-2 p-4 transition-all ${
                activeShiftDetail === 'day' ? 'border-amber-500 bg-amber-50 shadow-md' :
                shiftFilter === 'day' ? 'border-amber-400 bg-amber-50' : 'border-gray-200 bg-white hover:border-amber-300'
              }`}>
                <div className="flex items-center justify-between mb-3 cursor-pointer"
                  onClick={() => setActiveShiftDetail(activeShiftDetail === 'day' ? null : 'day')}
                >
                  <div className="flex items-center gap-2">
                    <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
                      <Sun size={20} className="text-amber-600" />
                    </div>
                    <div>
                      <div className="font-semibold text-gray-800">白班</div>
                      <div className="text-xs text-gray-500">08:00 - 18:00 · 点击展开交班清单</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant={shiftSummary.day.total > 0 ? 'success' : 'outline'}
                      onClick={(e) => { e.stopPropagation(); handleExportShift('day'); }}
                      disabled={shiftSummary.day.total === 0}
                    >
                      <Download size={14} className="mr-1" />
                      导出交班表
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={(e) => { e.stopPropagation(); handleFilterByShift(shiftFilter === 'day' ? 'all' : 'day'); }}
                    >
                      {shiftFilter === 'day' ? '显示全部' : '筛选白班'}
                    </Button>
                  </div>
                </div>
                <div className="grid grid-cols-5 gap-2 text-center">
                  <div className="bg-gray-50 rounded-lg p-2">
                    <div className="text-xl font-bold text-gray-800">{shiftSummary.day.total}</div>
                    <div className="text-xs text-gray-500">总计</div>
                  </div>
                  <div className="bg-green-50 rounded-lg p-2">
                    <div className="text-xl font-bold text-green-600">{shiftSummary.day.completed}</div>
                    <div className="text-xs text-gray-500">已完成</div>
                  </div>
                  <div className="bg-orange-50 rounded-lg p-2">
                    <div className="text-xl font-bold text-orange-600">{shiftSummary.day.pendingReview}</div>
                    <div className="text-xs text-gray-500">待复核</div>
                  </div>
                  <div className="bg-yellow-50 rounded-lg p-2">
                    <div className="text-xl font-bold text-yellow-600">{shiftSummary.day.incomplete}</div>
                    <div className="text-xs text-gray-500">未完成</div>
                  </div>
                  <div className="grid grid-cols-2 gap-1">
                    <div className="bg-green-50 rounded-lg p-1.5">
                      <div className="text-sm font-bold text-green-600">{shiftSummary.day.pass}</div>
                      <div className="text-[10px] text-gray-500">合格</div>
                    </div>
                    <div className="bg-red-50 rounded-lg p-1.5">
                      <div className="text-sm font-bold text-red-600">{shiftSummary.day.fail}</div>
                      <div className="text-[10px] text-gray-500">不合格</div>
                    </div>
                  </div>
                </div>
                {shiftSummary.day.pendingNotes > 0 && (
                  <div className="mt-2 text-xs text-red-600 bg-red-50 px-2 py-1 rounded flex items-center gap-1">
                    <MessageSquareWarning size={12} />
                    有 {shiftSummary.day.pendingNotes} 条待确认交接备注
                  </div>
                )}
              </div>

              <div className={`rounded-xl border-2 p-4 transition-all ${
                activeShiftDetail === 'night' ? 'border-indigo-500 bg-indigo-50 shadow-md' :
                shiftFilter === 'night' ? 'border-indigo-400 bg-indigo-50' : 'border-gray-200 bg-white hover:border-indigo-300'
              }`}>
                <div className="flex items-center justify-between mb-3 cursor-pointer"
                  onClick={() => setActiveShiftDetail(activeShiftDetail === 'night' ? null : 'night')}
                >
                  <div className="flex items-center gap-2">
                    <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center">
                      <Moon size={20} className="text-indigo-600" />
                    </div>
                    <div>
                      <div className="font-semibold text-gray-800">夜班</div>
                      <div className="text-xs text-gray-500">18:00 - 次日08:00 · 点击展开交班清单</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant={shiftSummary.night.total > 0 ? 'success' : 'outline'}
                      onClick={(e) => { e.stopPropagation(); handleExportShift('night'); }}
                      disabled={shiftSummary.night.total === 0}
                    >
                      <Download size={14} className="mr-1" />
                      导出交班表
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={(e) => { e.stopPropagation(); handleFilterByShift(shiftFilter === 'night' ? 'all' : 'night'); }}
                    >
                      {shiftFilter === 'night' ? '显示全部' : '筛选夜班'}
                    </Button>
                  </div>
                </div>
                <div className="grid grid-cols-5 gap-2 text-center">
                  <div className="bg-gray-50 rounded-lg p-2">
                    <div className="text-xl font-bold text-gray-800">{shiftSummary.night.total}</div>
                    <div className="text-xs text-gray-500">总计</div>
                  </div>
                  <div className="bg-green-50 rounded-lg p-2">
                    <div className="text-xl font-bold text-green-600">{shiftSummary.night.completed}</div>
                    <div className="text-xs text-gray-500">已完成</div>
                  </div>
                  <div className="bg-orange-50 rounded-lg p-2">
                    <div className="text-xl font-bold text-orange-600">{shiftSummary.night.pendingReview}</div>
                    <div className="text-xs text-gray-500">待复核</div>
                  </div>
                  <div className="bg-yellow-50 rounded-lg p-2">
                    <div className="text-xl font-bold text-yellow-600">{shiftSummary.night.incomplete}</div>
                    <div className="text-xs text-gray-500">未完成</div>
                  </div>
                  <div className="grid grid-cols-2 gap-1">
                    <div className="bg-green-50 rounded-lg p-1.5">
                      <div className="text-sm font-bold text-green-600">{shiftSummary.night.pass}</div>
                      <div className="text-[10px] text-gray-500">合格</div>
                    </div>
                    <div className="bg-red-50 rounded-lg p-1.5">
                      <div className="text-sm font-bold text-red-600">{shiftSummary.night.fail}</div>
                      <div className="text-[10px] text-gray-500">不合格</div>
                    </div>
                  </div>
                </div>
                {shiftSummary.night.pendingNotes > 0 && (
                  <div className="mt-2 text-xs text-red-600 bg-red-50 px-2 py-1 rounded flex items-center gap-1">
                    <MessageSquareWarning size={12} />
                    有 {shiftSummary.night.pendingNotes} 条待确认交接备注
                  </div>
                )}
              </div>
            </div>

            {activeShiftDetail && (
              <div className="border-t border-gray-200 pt-4 space-y-4">
                <ShiftHandoverDetail
                  shift={activeShiftDetail}
                  stats={activeShiftDetail === 'day' ? shiftSummary.day : shiftSummary.night}
                  getNextStep={getNextStep}
                  getStatusText={getStatusText}
                  onOpenDraft={(id) => navigate(`/viewer/${id}`)}
                />
              </div>
            )}
          </div>
        )}
      </Card>

      {shiftFilter !== 'all' && (
        <div className="flex items-center justify-between bg-blue-50 border border-blue-200 rounded-lg px-4 py-2">
          <div className="flex items-center gap-2 text-blue-700">
            {shiftFilter === 'day' ? <Sun size={16} /> : <Moon size={16} />}
            <span className="text-sm font-medium">
              当前筛选：今日{shiftFilter === 'day' ? '白班' : '夜班'} · 显示 {filteredDrafts.length} 条
            </span>
          </div>
          <Button size="sm" variant="outline" onClick={() => setShiftFilter('all')}>
            清除筛选
          </Button>
        </div>
      )}

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
            <div className="grid grid-cols-2 lg:grid-cols-6 gap-4 pt-4 border-t border-gray-100">
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
                  <Sun size={14} />
                  今日班次
                </label>
                <select
                  value={shiftFilter}
                  onChange={(e) => setShiftFilter(e.target.value as ShiftFilter)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-medical-500 focus:border-transparent bg-white text-sm"
                >
                  <option value="all">全部班次</option>
                  <option value="day">白班 (08:00-18:00)</option>
                  <option value="night">夜班 (18:00-08:00)</option>
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
            {searchTerm || statusFilter !== 'all' || conclusionFilter !== 'all' || markFilter !== 'all' || shiftFilter !== 'all' || dateFrom || dateTo
              ? '没有找到符合条件的草稿，请调整筛选条件'
              : '开始新建第一份核查吧'}
          </p>
          <div className="flex justify-center gap-2">
            {(searchTerm || statusFilter !== 'all' || conclusionFilter !== 'all' || markFilter !== 'all' || shiftFilter !== 'all' || dateFrom || dateTo) && (
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
            const pendingNoteCount = (draft.handoverNotes || []).filter(n => n.isPending).length;

            const statusRingClass =
              draft.status === 'pending_review' ? 'border-l-4 border-l-orange-500 border border-orange-200' :
              draft.status === 'incomplete' ? 'border-l-4 border-l-yellow-500 border border-yellow-200' :
              draft.status === 'completed' ? 'border-l-4 border-l-green-500 border border-green-200' : '';

            return (
              <Card key={draft.id} className={`hover:shadow-lg transition-shadow ${statusRingClass} ${isSelected ? 'ring-2 ring-medical-400' : ''}`}>
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
                        {getStatusBadge(draft.status, draft)}
                        {pendingNoteCount > 0 && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs bg-red-100 text-red-700 rounded-full">
                            <MessageSquareWarning size={12} />
                            {pendingNoteCount}条待确认
                          </span>
                        )}
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
                      {draft.status !== 'completed' && (
                        <div className="text-xs mb-2 text-gray-600 flex items-center gap-1.5">
                          <ArrowRight size={12} className="text-blue-500" />
                          <span>下一步：<span className="font-medium text-gray-800">{getNextStep(draft)}</span></span>
                        </div>
                      )}

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
                    ) : draft.status === 'pending_review' ? (
                      <Button variant="primary" size="sm" onClick={() => handleContinue(draft.id)}>
                        <ShieldCheck size={14} className="mr-1.5" />
                        继续审核
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
