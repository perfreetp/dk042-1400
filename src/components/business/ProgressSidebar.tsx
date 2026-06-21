import type { Draft } from '@/types';
import { User, Image, Target, CheckCircle, AlertCircle, Clock, ChevronRight, ChevronLeft } from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';

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

  const patientInfo = draft.patientInfo;
  const images = draft.images;
  const judgment = draft.judgment;

  const totalMarks = images.reduce((sum, img) => sum + img.marks.length, 0);
  const stainCount = images.reduce((sum, img) => sum + img.marks.filter(m => m.type === 'stain').length, 0);
  const shadowCount = images.reduce((sum, img) => sum + img.marks.filter(m => m.type === 'shadow').length, 0);

  const patientFilled = patientInfo.studyNo && patientInfo.name ? 2 : (patientInfo.studyNo || patientInfo.name ? 1 : 0);
  const hasImages = images.length > 0;
  const hasMarks = totalMarks > 0;
  const judgmentStarted = judgment.clarity || judgment.completeness || judgment.defects.length > 0;
  const judgmentCompleted = judgment.clarity && judgment.completeness && judgment.conclusion;

  const steps = [
    { key: 'patient', label: '患者信息', done: patientFilled >= 2, partial: patientFilled === 1, desc: patientFilled >= 2 ? '已填写' : patientFilled === 1 ? '部分填写' : '未填写' },
    { key: 'images', label: '上传图片', done: hasImages, desc: hasImages ? `${images.length} 张` : '未上传' },
    { key: 'marks', label: '标记问题', done: hasMarks, optional: true, desc: hasMarks ? `${totalMarks} 处标记` : '无标记' },
    { key: 'judgment', label: '质量判定', done: judgmentCompleted, partial: judgmentStarted && !judgmentCompleted, desc: judgmentCompleted ? (judgment.conclusion === 'pass' ? '合格' : '不合格') : judgmentStarted ? '进行中' : '未开始' },
  ];

  const completedSteps = steps.filter(s => s.done).length;
  const progressPercent = Math.round((completedSteps / steps.filter(s => !s.optional).length) * 100);

  return (
    <div
      className={cn(
        'fixed right-4 top-20 z-40 transition-all duration-300 ease-in-out',
        collapsed ? 'w-10' : 'w-72'
      )}
    >
      <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
        <div className="bg-medical-600 text-white px-4 py-3 flex items-center justify-between cursor-pointer"
          onClick={() => setCollapsed(!collapsed)}
        >
          {!collapsed && (
            <>
              <div>
                <div className="font-semibold text-sm">核查进度</div>
                <div className="text-xs text-white/80 mt-0.5">
                  {completedSteps}/{steps.filter(s => !s.optional).length} 步骤完成 · {progressPercent}%
                </div>
              </div>
            </>
          )}
          {collapsed && (
            <div className="w-full text-center">
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
            {!collapsed && (
              <div className="h-1.5 bg-gray-100">
                <div
                  className="h-full bg-medical-500 transition-all duration-500"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            )}

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

              {judgmentStarted && (
                <div className="bg-gray-50 rounded-lg p-3 text-sm">
                  <div className="font-medium text-gray-700 mb-2">判定状态</div>
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
