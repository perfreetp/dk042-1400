import type { Draft } from '@/types';
import { User, Image, Target, CheckCircle, AlertCircle, Clock, ChevronRight, ChevronLeft, FileCheck, MessageSquareWarning } from 'lucide-react';
import { useState, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { useReviewStore } from '@/store/useReviewStore';

interface ProgressSidebarProps {
  draft: Draft;
}

const genderLabels: Record<string, string> = {
  male: '男',
  female: '女',
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

export function ProgressSidebar({ draft }: ProgressSidebarProps) {
  const [collapsed, setCollapsed] = useState(false);
  const getReviewProgress = useReviewStore(state => state.getReviewProgress);

  const patientInfo = draft.patientInfo;
  const images = draft.images;
  const judgment = draft.judgment;
  const handoverNotes = draft.handoverNotes || [];

  const totalMarks = images.reduce((sum, img) => sum + img.marks.length, 0);
  const stainCount = images.reduce((sum, img) => sum + img.marks.filter(m => m.type === 'stain').length, 0);
  const shadowCount = images.reduce((sum, img) => sum + img.marks.filter(m => m.type === 'shadow').length, 0);

  const pendingNoteCount = handoverNotes.filter(n => n.isPending).length;

  const patientFilled = patientInfo.studyNo && patientInfo.name ? 2 : (patientInfo.studyNo || patientInfo.name ? 1 : 0);
  const hasImages = images.length > 0;
  const hasMarks = totalMarks > 0;
  const judgmentStarted = judgment.clarity || judgment.completeness || judgment.defects.length > 0;
  const singleJudgmentDone = !!(judgment.clarity && judgment.completeness && judgment.conclusion);
  const hasPreliminaryReview = !!judgment.preliminaryReview;
  const hasFinalReview = !!judgment.finalReview;
  const needsReview = judgment.needsReview;
  const hasFinalDecision = !!judgment.finalDecision;
  const isInconsistent = needsReview && hasPreliminaryReview && hasFinalReview && judgment.isConsistent === false;

  let judgmentCompleted = false;
  if (needsReview) {
    if (isInconsistent) {
      judgmentCompleted = hasFinalDecision;
    } else {
      judgmentCompleted = hasFinalReview;
    }
  } else {
    judgmentCompleted = singleJudgmentDone;
  }

  const needsPendingDecision = isInconsistent && !hasFinalDecision;

  const steps = useMemo(() => {
    const baseSteps = [
      { key: 'patient', label: '患者信息', done: patientFilled >= 2, partial: patientFilled === 1, desc: patientFilled >= 2 ? '已填写' : patientFilled === 1 ? '部分填写' : '未填写' },
      { key: 'images', label: '上传图片', done: hasImages, desc: hasImages ? `${images.length} 张` : '未上传' },
      { key: 'marks', label: '标记问题', done: hasMarks, optional: true, desc: hasMarks ? `${totalMarks} 处标记` : '无标记' },
    ];

    if (needsReview) {
      baseSteps.push(
        { key: 'preliminary', label: '初判', done: hasPreliminaryReview, desc: hasPreliminaryReview ? (judgment.preliminaryReview?.conclusion === 'pass' ? '初判合格' : '初判不合格') : '未开始' },
        { key: 'final', label: '复核', done: hasFinalReview && (!isInconsistent || hasFinalDecision), partial: (hasPreliminaryReview && !hasFinalReview) || needsPendingDecision, desc: hasFinalReview ? (judgment.finalReview?.conclusion === 'pass' ? '复核合格' : '复核不合格') : hasPreliminaryReview ? '待复核' : '未开始' }
      );
      if (isInconsistent) {
        baseSteps.push({
          key: 'decision',
          label: '最终裁定',
          done: hasFinalDecision,
          partial: hasFinalReview && !hasFinalDecision,
          desc: hasFinalDecision ? `已裁定：${judgment.finalDecision?.finalConclusion === 'pass' ? '合格' : '不合格'}` : '待裁定',
        });
      }
    } else {
      baseSteps.push(
        { key: 'judgment', label: '质量判定', done: judgmentCompleted, partial: judgmentStarted && !judgmentCompleted, desc: judgmentCompleted ? (judgment.conclusion === 'pass' ? '合格' : '不合格') : judgmentStarted ? '进行中' : '未开始' }
      );
    }

    return baseSteps;
  }, [patientFilled, hasImages, hasMarks, totalMarks, images.length, needsReview, hasPreliminaryReview, hasFinalReview, singleJudgmentDone, judgmentStarted, judgment, isInconsistent, hasFinalDecision, needsPendingDecision, judgmentCompleted]);

  const progressPercent = useMemo(() => getReviewProgress(), [draft, getReviewProgress]);
  const completedSteps = steps.filter(s => s.done).length;
  const requiredSteps = steps.filter(s => !s.optional).length;

  return (
    <div
      className={cn(
        'fixed right-4 top-20 z-40 transition-all duration-300 ease-in-out',
        collapsed ? 'w-10' : 'w-72'
      )}
    >
      <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
        <div className={cn(
          "px-4 py-3 flex items-center justify-between cursor-pointer transition-colors",
          needsPendingDecision
            ? "bg-red-600 text-white"
            : !judgmentCompleted && needsReview && !hasFinalReview
              ? "bg-orange-600 text-white"
              : !judgmentCompleted
                ? "bg-yellow-600 text-white"
                : "bg-medical-600 text-white"
        )}
          onClick={() => setCollapsed(!collapsed)}
        >
          {!collapsed && (
            <>
              <div className="flex-1">
                <div className="font-semibold text-sm flex items-center gap-2">
                  核查进度
                  {pendingNoteCount > 0 && (
                    <span className="bg-white/25 text-white text-xs px-1.5 py-0.5 rounded-full flex items-center gap-1">
                      <MessageSquareWarning size={10} />
                      {pendingNoteCount}
                    </span>
                  )}
                </div>
                <div className="text-xs text-white/80 mt-0.5">
                  {completedSteps}/{requiredSteps} 步骤完成 · {progressPercent}%
                  {!judgmentCompleted && (
                    <span className="ml-2 text-white font-medium">
                      {needsPendingDecision ? '· 待最终裁定' :
                       needsReview && !hasPreliminaryReview ? '· 待初判' :
                       needsReview && !hasFinalReview ? '· 待复核' : '· 未完成判定'}
                    </span>
                  )}
                </div>
              </div>
            </>
          )}
          {collapsed && (
            <div className="w-full text-center">
              {pendingNoteCount > 0 && (
                <div className="text-xs bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center mx-auto mb-1">
                  {pendingNoteCount}
                </div>
              )}
              <div className="text-xs font-medium">进度</div>
              <div className="text-lg font-bold">{progressPercent}%</div>
            </div>
          )}
          {collapsed ? (
            <ChevronLeft size={18} className="flex-shrink-0" />
          ) : (
            <ChevronRight size={18} className="flex-shrink-0" />
          )}
        </div>

        {!collapsed && (
          <>
            <div className="h-1.5 bg-gray-100">
              <div
                className={cn(
                  "h-full transition-all duration-500",
                  needsPendingDecision
                    ? "bg-red-500"
                    : !judgmentCompleted && needsReview && !hasFinalReview
                      ? "bg-orange-500"
                      : !judgmentCompleted
                        ? "bg-yellow-500"
                        : "bg-medical-500"
                )}
                style={{ width: `${progressPercent}%` }}
              />
            </div>

            <div className="p-4 space-y-4">
              <div className="bg-gray-50 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-2">
                  <User size={14} className="text-medical-600" />
                  <span className="text-xs font-medium text-gray-700">患者信息</span>
                </div>
                <div className="space-y-1.5 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500">检查号</span>
                    <span className={cn('font-medium', patientInfo.studyNo ? 'text-gray-900' : 'text-gray-400')}>
                      {patientInfo.studyNo || '未填写'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">姓名</span>
                    <span className={cn('font-medium', patientInfo.name ? 'text-gray-900' : 'text-gray-400')}>
                      {patientInfo.name || '未填写'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">性别/年龄</span>
                    <span className="font-medium text-gray-900">
                      {patientInfo.gender ? genderLabels[patientInfo.gender] : '-'}
                      {patientInfo.age ? ` / ${patientInfo.age}岁` : ''}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">检查部位</span>
                    <span className={cn('font-medium', patientInfo.bodyPart ? 'text-gray-900' : 'text-gray-400')}>
                      {patientInfo.bodyPart || '未填写'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                {steps.map((step) => (
                  <div key={step.key} className="flex items-start gap-3">
                    <div className="flex-shrink-0 mt-0.5">
                      {step.done ? (
                        <div className="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center">
                          <CheckCircle size={12} className="text-white" />
                        </div>
                      ) : step.partial ? (
                        <div className="w-5 h-5 rounded-full bg-yellow-500 flex items-center justify-center">
                          <Clock size={12} className="text-white" />
                        </div>
                      ) : (
                        <div className="w-5 h-5 rounded-full border-2 border-gray-300 flex items-center justify-center">
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1">
                        <span className={cn('text-sm font-medium', step.done ? 'text-gray-900' : step.partial ? 'text-yellow-700' : 'text-gray-500')}>
                          {step.label}
                        </span>
                        {step.optional && (
                          <span className="text-xs text-gray-400">(可选)</span>
                        )}
                      </div>
                      <div className={cn('text-xs mt-0.5', step.done ? 'text-green-600' : step.partial ? 'text-yellow-600' : 'text-gray-400')}>
                        {step.desc}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-gray-100">
                <div className="bg-blue-50 rounded-lg p-2.5 text-center">
                  <Image size={16} className="text-blue-600 mx-auto mb-1" />
                  <div className="text-lg font-bold text-blue-700">{images.length}</div>
                  <div className="text-xs text-blue-600">图片数</div>
                </div>
                <div className="bg-orange-50 rounded-lg p-2.5 text-center">
                  <Target size={16} className="text-orange-600 mx-auto mb-1" />
                  <div className="text-lg font-bold text-orange-700">{totalMarks}</div>
                  <div className="text-xs text-orange-600">标记数</div>
                </div>
              </div>

              {(stainCount > 0 || shadowCount > 0) && (
                <div className="flex gap-2 text-xs">
                  {stainCount > 0 && (
                    <span className="flex items-center gap-1 bg-red-50 text-red-700 px-2 py-1 rounded">
                      <span className="w-2 h-2 rounded-full bg-red-500"></span>
                      污点 {stainCount}
                    </span>
                  )}
                  {shadowCount > 0 && (
                    <span className="flex items-center gap-1 bg-blue-50 text-blue-700 px-2 py-1 rounded">
                      <span className="w-2 h-2 rounded bg-blue-500"></span>
                      阴影 {shadowCount}
                    </span>
                  )}
                </div>
              )}

              {pendingNoteCount > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <MessageSquareWarning size={14} className="text-red-600" />
                    <span className="text-xs font-semibold text-red-700">
                      待确认事项 ({pendingNoteCount}条)
                    </span>
                  </div>
                  <div className="text-xs text-red-600">
                    {handoverNotes.filter(n => n.isPending).slice(0, 2).map(n => (
                      <div key={n.id} className="truncate">· {n.content}</div>
                    ))}
                    {pendingNoteCount > 2 && (
                      <div className="text-red-400">...还有 {pendingNoteCount - 2} 条</div>
                    )}
                  </div>
                </div>
              )}

              {(judgmentStarted || hasPreliminaryReview) && (
                <div className="bg-gray-50 rounded-lg p-3 text-sm">
                  <div className="font-medium text-gray-700 mb-2 flex items-center gap-2">
                    <FileCheck size={14} />
                    判定状态
                  </div>
                  {needsReview ? (
                    <div className="space-y-2 text-xs">
                      {judgment.preliminaryReview && (
                        <div className="bg-white rounded p-2 border border-gray-200">
                          <div className="font-semibold text-blue-700 mb-1">初判 · {judgment.preliminaryReview.reviewerName}</div>
                          <div className="space-y-0.5 text-gray-600">
                            <div className="flex justify-between">
                              <span>清晰度/完整性</span>
                              <span className="font-medium">
                                {clarityLabels[judgment.preliminaryReview.clarity] || '-'}/{completenessLabels[judgment.preliminaryReview.completeness] || '-'}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span>结论</span>
                              <span className={cn(
                                'font-semibold',
                                judgment.preliminaryReview.conclusion === 'pass' ? 'text-green-600' : 'text-red-600'
                              )}>
                                {judgment.preliminaryReview.conclusion === 'pass' ? '合格' : '不合格'}
                              </span>
                            </div>
                          </div>
                        </div>
                      )}
                      {judgment.finalReview && (
                        <div className={cn(
                          "rounded p-2 border",
                          judgment.isConsistent ? 'bg-green-50 border-green-200' : 'bg-orange-50 border-orange-200'
                        )}>
                          <div className="font-semibold text-purple-700 mb-1 flex items-center gap-1">
                            复核 · {judgment.finalReview.reviewerName}
                            {judgment.isConsistent !== null && (
                              <span className={cn(
                                "text-xs ml-auto px-1.5 py-0.5 rounded",
                                judgment.isConsistent ? 'bg-green-200 text-green-800' : 'bg-orange-200 text-orange-800'
                              )}>
                                {judgment.isConsistent ? '一致' : '不一致'}
                              </span>
                            )}
                          </div>
                          <div className="space-y-0.5 text-gray-600">
                            <div className="flex justify-between">
                              <span>清晰度/完整性</span>
                              <span className="font-medium">
                                {clarityLabels[judgment.finalReview.clarity] || '-'}/{completenessLabels[judgment.finalReview.completeness] || '-'}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span>结论</span>
                              <span className={cn(
                                'font-semibold',
                                judgment.finalReview.conclusion === 'pass' ? 'text-green-600' : 'text-red-600'
                              )}>
                                {judgment.finalReview.conclusion === 'pass' ? '合格' : '不合格'}
                              </span>
                            </div>
                          </div>
                        </div>
                      )}
                      {judgment.finalDecision && (
                        <div className="rounded p-2 border border-purple-200 bg-purple-50">
                          <div className="font-semibold text-purple-800 mb-1">
                            最终裁定 · {judgment.finalDecision.deciderName}
                          </div>
                          <div className="space-y-0.5 text-gray-600">
                            <div className="text-xs">
                              裁定意见：{judgment.finalDecision.decisionOpinion}
                            </div>
                            <div className="flex justify-between pt-1">
                              <span>最终结论</span>
                              <span className={cn(
                                'font-semibold',
                                judgment.finalDecision.finalConclusion === 'pass' ? 'text-green-700' : 'text-red-700'
                              )}>
                                {judgment.finalDecision.finalConclusion === 'pass' ? '合格' : '不合格'}
                              </span>
                            </div>
                          </div>
                        </div>
                      )}
                      {!hasPreliminaryReview && (
                        <div className="text-center text-gray-400 py-2">尚未开始初判</div>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-1 text-xs">
                      <div className="flex justify-between">
                        <span className="text-gray-500">清晰度</span>
                        <span className="font-medium text-gray-800">
                          {judgment.clarity ? clarityLabels[judgment.clarity] : '未选择'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">完整性</span>
                        <span className="font-medium text-gray-800">
                          {judgment.completeness ? completenessLabels[judgment.completeness] : '未选择'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">缺陷</span>
                        <span className="font-medium text-gray-800">
                          {judgment.defects.length > 0 ? `${judgment.defects.length} 项` : '无'}
                        </span>
                      </div>
                      {judgment.conclusion && (
                        <div className={cn(
                          'mt-2 pt-2 border-t border-gray-200 flex items-center justify-center gap-1.5 py-1 rounded font-semibold',
                          judgment.conclusion === 'pass' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                        )}>
                          {judgment.conclusion === 'pass' ? (
                            <CheckCircle size={14} />
                          ) : (
                            <AlertCircle size={14} />
                          )}
                          {judgment.conclusion === 'pass' ? '合格' : '不合格'}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              <div className="pt-2 border-t border-gray-100 text-xs text-gray-400 space-y-0.5">
                <div>创建时间：{new Date(draft.createdAt).toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}</div>
                <div>更新时间：{new Date(draft.updatedAt).toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}</div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
