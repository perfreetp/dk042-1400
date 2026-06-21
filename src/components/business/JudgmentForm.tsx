import { useState } from 'react';
import { useReviewStore } from '@/store/useReviewStore';
import { PRESET_PHRASES, type DefectType, type ClarityLevel, type CompletenessLevel, type ReviewResult } from '@/types';
import { Button } from '@/components/common/Button';
import { Card } from '@/components/common/Card';
import { Check, AlertCircle, ThumbsUp, ThumbsDown, Wand2, Save, Printer, ArrowLeft, FileText, UserCheck, Users, RefreshCw, ShieldCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';

const clarityOptions: { value: ClarityLevel; label: string; description: string }[] = [
  { value: 'clear', label: '清晰', description: '图像细节清晰，无模糊' },
  { value: 'moderate', label: '较清晰', description: '基本清晰，不影响诊断' },
  { value: 'blur', label: '模糊', description: '图像模糊，影响诊断' },
];

const completenessOptions: { value: CompletenessLevel; label: string; description: string }[] = [
  { value: 'complete', label: '完整', description: '检查部位完整显示' },
  { value: 'partial', label: '部分缺失', description: '部分区域未包含' },
  { value: 'missing', label: '严重缺失', description: '关键部位缺失' },
];

const defectOptions: { value: DefectType; label: string; icon: string }[] = [
  { value: 'stain', label: '污点', icon: '●' },
  { value: 'shadow', label: '阴影', icon: '■' },
  { value: 'artifact', label: '伪影', icon: '✕' },
  { value: 'thickness', label: '层厚不均', icon: '═' },
  { value: 'position', label: '位置偏差', icon: '⟷' },
];

interface ReviewFormState {
  clarity: ClarityLevel | '';
  completeness: CompletenessLevel | '';
  defects: DefectType[];
  rejectionReason: string;
  conclusion: 'pass' | 'fail' | '';
  reviewerName: string;
}

const createEmptyFormState = (): ReviewFormState => ({
  clarity: '',
  completeness: '',
  defects: [],
  rejectionReason: '',
  conclusion: '',
  reviewerName: '',
});

export function JudgmentForm() {
  const navigate = useNavigate();
  const {
    currentDraft,
    updateJudgment,
    autoGenerateConclusion,
    completeDraft,
    saveCurrentDraft,
    showToast,
    setNeedsReview,
    setPreliminaryReview,
    setFinalReview,
    clearFinalReview,
  } = useReviewStore();

  const [preliminaryForm, setPreliminaryForm] = useState<ReviewFormState>(createEmptyFormState());
  const [finalForm, setFinalForm] = useState<ReviewFormState>(createEmptyFormState());

  if (!currentDraft) return null;

  const { judgment, id: draftId } = currentDraft;
  const needsReview = judgment.needsReview;
  const hasPreliminary = !!judgment.preliminaryReview;
  const hasFinal = !!judgment.finalReview;

  const getConclusionLabel = (conclusion: string) => {
    if (conclusion === 'pass') return '合格';
    if (conclusion === 'fail') return '不合格';
    return '未判定';
  };

  const toggleNeedsReview = () => {
    if (hasPreliminary || hasFinal) {
      if (!confirm('切换模式将清除已有的初判/复核数据，确定继续吗？')) {
        return;
      }
    }
    setNeedsReview(!needsReview);
    updateJudgment({
      preliminaryReview: null,
      finalReview: null,
      isConsistent: null,
    });
    setPreliminaryForm(createEmptyFormState());
    setFinalForm(createEmptyFormState());
    showToast(needsReview ? '已切换为单人判定模式' : '已开启双人复核模式', 'info');
  };

  const updateForm = (form: 'preliminary' | 'final', updates: Partial<ReviewFormState>) => {
    if (form === 'preliminary') {
      setPreliminaryForm(prev => ({ ...prev, ...updates }));
    } else {
      setFinalForm(prev => ({ ...prev, ...updates }));
    }
  };

  const handleAutoGenerateForForm = (form: 'preliminary' | 'final') => {
    const formState = form === 'preliminary' ? preliminaryForm : finalForm;

    if (!formState.clarity || !formState.completeness) {
      showToast('请先选择清晰度和完整性', 'error');
      return;
    }

    const { clarity, completeness, defects } = formState;
    const images = currentDraft.images;

    let failScore = 0;
    const reasons: string[] = [];
    const suggestions: string[] = [];

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

    if (clarity === 'blur') {
      failScore += 3;
      reasons.push('图像模糊，细节显示不清');
      suggestions.push('调整拍摄参数或重新对焦');
    } else if (clarity === 'moderate') {
      failScore += 1;
      reasons.push('图像清晰度一般');
    }

    if (completeness === 'missing') {
      failScore += 3;
      reasons.push('检查部位严重缺失');
      suggestions.push('重新摆位，确保检查部位完整');
    } else if (completeness === 'partial') {
      failScore += 1;
      reasons.push('检查部位部分缺失');
      suggestions.push('注意拍摄范围');
    }

    const defectCount = defects.length;
    if (defectCount >= 3) {
      failScore += 2;
      reasons.push(`缺陷项过多（${defectCount}项）`);
    } else if (defectCount >= 1) {
      failScore += defectCount * 0.5;
    }

    if (totalMarks >= 5) {
      failScore += 1;
    }

    defects.forEach((d) => {
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

    const clarityText = clarityLabels[clarity];
    const completenessText = completenessLabels[completeness];
    const basicDesc = `清晰度${clarityText}，完整性${completenessText}`;

    let conclusion: 'pass' | 'fail' | '' = '';
    let rejectionReason = '';

    if (clarity === 'clear' && completeness === 'complete' && defectCount === 0 && totalMarks === 0) {
      conclusion = 'pass';
      rejectionReason = `图像质量良好：${basicDesc}，无明显缺陷，符合诊断要求。`;
    } else if (clarity === 'clear' && completeness === 'complete' && defectCount <= 1 && failScore < 2) {
      conclusion = 'pass';
      const defectDesc = defectCount > 0
        ? `，存在轻微问题：${defects.map(d => defectLabels[d]).join('、')}`
        : '';
      rejectionReason = `图像质量合格：${basicDesc}${defectDesc}，不影响诊断。`;
    } else if (clarity === 'moderate' && completeness === 'complete' && defectCount <= 1 && failScore < 2) {
      conclusion = 'pass';
      const defectDesc = defectCount > 0
        ? `，存在${defects.map(d => defectLabels[d]).join('、')}`
        : '';
      rejectionReason = `图像质量基本合格：${basicDesc}${defectDesc}，虽然清晰度一般但不影响诊断。`;
    } else if (clarity === 'moderate' && completeness === 'partial' && failScore < 3) {
      conclusion = 'fail';
      reasons.unshift('清晰度一般且检查部位不完整');
      suggestions.push('建议重拍，确保图像清晰完整');
    } else if (failScore >= 2) {
      conclusion = 'fail';
    } else if (clarity && completeness) {
      conclusion = defectCount >= 2 ? 'fail' : 'pass';
      if (conclusion === 'pass') {
        const defectDesc = defectCount > 0
          ? `，存在轻微问题：${defects.map(d => defectLabels[d]).join('、')}`
          : '';
        rejectionReason = `图像质量合格：${basicDesc}${defectDesc}，符合诊断要求。`;
      }
    }

    if (conclusion === 'fail' && rejectionReason === '') {
      const reasonText = reasons.length > 0 ? reasons.join('；') : '图像质量不符合标准';
      const suggestionText = suggestions.length > 0 ? `。建议：${suggestions.join('；')}` : '';
      rejectionReason = `${basicDesc}，${reasonText}${suggestionText}，建议重拍。`;
    }

    updateForm(form, { conclusion, rejectionReason });
    showToast(`已自动生成${form === 'preliminary' ? '初判' : '复核'}结论`, 'success');
  };

  const handleSavePreliminary = () => {
    if (!preliminaryForm.reviewerName.trim()) {
      showToast('请填写初判人员姓名', 'error');
      return;
    }
    if (!preliminaryForm.clarity || !preliminaryForm.completeness) {
      showToast('请选择清晰度和完整性', 'error');
      return;
    }
    if (!preliminaryForm.conclusion) {
      showToast('请先生成初判结论', 'error');
      return;
    }

    const result: ReviewResult = {
      ...preliminaryForm,
      reviewedAt: Date.now(),
    };
    setPreliminaryReview(result);
    showToast('初判已保存，请等待复核', 'success');
  };

  const handleSaveFinal = () => {
    if (!finalForm.reviewerName.trim()) {
      showToast('请填写复核人员姓名', 'error');
      return;
    }
    if (!finalForm.clarity || !finalForm.completeness) {
      showToast('请选择清晰度和完整性', 'error');
      return;
    }
    if (!finalForm.conclusion) {
      showToast('请先生成复核结论', 'error');
      return;
    }

    const result: ReviewResult = {
      ...finalForm,
      reviewedAt: Date.now(),
    };
    setFinalReview(result);
    showToast('复核已保存', 'success');
  };

  const handleClearFinal = () => {
    if (confirm('确定要清除复核数据吗？')) {
      clearFinalReview();
      setFinalForm(createEmptyFormState());
      showToast('复核数据已清除', 'info');
    }
  };

  const handleBack = () => {
    navigate(`/viewer/${draftId}`);
  };

  const handleSave = () => {
    saveCurrentDraft();
  };

  const handleComplete = () => {
    if (needsReview) {
      if (!hasPreliminary) {
        showToast('请先完成初判', 'error');
        return;
      }
      if (!hasFinal) {
        showToast('请完成复核后再提交', 'error');
        return;
      }
      if (!judgment.finalReview?.reviewerName.trim()) {
        showToast('请填写复核人员姓名', 'error');
        return;
      }
    } else {
      if (!judgment.reviewerName.trim()) {
        showToast('请填写审核人员姓名', 'error');
        return;
      }
      if (!judgment.clarity || !judgment.completeness || !judgment.conclusion) {
        showToast('请完成所有判定项', 'error');
        return;
      }
    }
    const success = completeDraft();
    if (success) {
      navigate(`/print/${draftId}`);
    }
  };

  const handlePrint = () => {
    navigate(`/print/${draftId}`);
  };

  const renderReviewSection = (
    form: 'preliminary' | 'final',
    title: string,
    icon: React.ReactNode,
    colorClass: string,
    isDisabled: boolean,
    formState: ReviewFormState,
    onSave: () => void,
    savedResult?: ReviewResult | null
  ) => (
    <div className={cn('border-2 rounded-xl overflow-hidden', isDisabled ? 'opacity-60' : '', colorClass)}>
      <div className={cn('px-4 py-3 flex items-center gap-3 text-white',
        form === 'preliminary' ? 'bg-blue-600' : 'bg-purple-600'
      )}>
        {icon}
        <div className="flex-1">
          <div className="font-semibold">{title}</div>
          {savedResult && (
            <div className="text-xs text-white/80">
              已由 {savedResult.reviewerName} 于 {new Date(savedResult.reviewedAt).toLocaleString('zh-CN')} 完成
            </div>
          )}
        </div>
        {savedResult && (
          <span className={cn(
            'px-2 py-1 rounded-full text-xs font-semibold',
            savedResult.conclusion === 'pass' ? 'bg-green-200 text-green-800' : 'bg-red-200 text-red-800'
          )}>
            {savedResult.conclusion === 'pass' ? '合格' : '不合格'}
          </span>
        )}
      </div>

      {savedResult ? (
        <div className="p-4 space-y-3 bg-gray-50">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">清晰度</span>
              <span className="font-medium">{clarityOptions.find(o => o.value === savedResult.clarity)?.label || '-'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">完整性</span>
              <span className="font-medium">{completenessOptions.find(o => o.value === savedResult.completeness)?.label || '-'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">缺陷项</span>
              <span className="font-medium">{savedResult.defects.length > 0 ? savedResult.defects.map(d => defectOptions.find(o => o.value === d)?.label).join('、') : '无'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">结论</span>
              <span className={cn('font-semibold', savedResult.conclusion === 'pass' ? 'text-green-600' : 'text-red-600')}>
                {getConclusionLabel(savedResult.conclusion)}
              </span>
            </div>
          </div>
          {savedResult.rejectionReason && (
            <div className="text-sm bg-white rounded-lg p-3 border">
              <div className="text-gray-500 mb-1">意见：</div>
              <div className="text-gray-700">{savedResult.rejectionReason}</div>
            </div>
          )}
        </div>
      ) : (
        <div className="p-4 space-y-4">
          <Card title="清晰度判定" subtitle="请选择图像的清晰程度">
            <div className="grid grid-cols-3 gap-4">
              {clarityOptions.map((option) => (
                <button
                  key={option.value}
                  onClick={() => !isDisabled && updateForm(form, { clarity: option.value })}
                  disabled={isDisabled}
                  className={cn(
                    'p-4 rounded-lg border-2 transition-all text-left',
                    formState.clarity === option.value
                      ? 'border-medical-600 bg-medical-50'
                      : 'border-gray-200 hover:border-gray-300',
                    isDisabled && 'cursor-not-allowed opacity-50'
                  )}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <div
                      className={cn(
                        'w-5 h-5 rounded-full border-2 flex items-center justify-center',
                        formState.clarity === option.value
                          ? 'border-medical-600 bg-medical-600'
                          : 'border-gray-300'
                      )}
                    >
                      {formState.clarity === option.value && <Check size={14} className="text-white" />}
                    </div>
                    <span className="font-medium text-gray-800">{option.label}</span>
                  </div>
                  <p className="text-sm text-gray-500 ml-7">{option.description}</p>
                </button>
              ))}
            </div>
          </Card>

          <Card title="完整性判定" subtitle="请选择检查部位的完整程度">
            <div className="grid grid-cols-3 gap-4">
              {completenessOptions.map((option) => (
                <button
                  key={option.value}
                  onClick={() => !isDisabled && updateForm(form, { completeness: option.value })}
                  disabled={isDisabled}
                  className={cn(
                    'p-4 rounded-lg border-2 transition-all text-left',
                    formState.completeness === option.value
                      ? 'border-medical-600 bg-medical-50'
                      : 'border-gray-200 hover:border-gray-300',
                    isDisabled && 'cursor-not-allowed opacity-50'
                  )}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <div
                      className={cn(
                        'w-5 h-5 rounded-full border-2 flex items-center justify-center',
                        formState.completeness === option.value
                          ? 'border-medical-600 bg-medical-600'
                          : 'border-gray-300'
                      )}
                    >
                      {formState.completeness === option.value && <Check size={14} className="text-white" />}
                    </div>
                    <span className="font-medium text-gray-800">{option.label}</span>
                  </div>
                  <p className="text-sm text-gray-500 ml-7">{option.description}</p>
                </button>
              ))}
            </div>
          </Card>

          <Card title="缺陷勾选" subtitle="选择图像中存在的缺陷（可多选）">
            <div className="grid grid-cols-5 gap-4">
              {defectOptions.map((option) => (
                <button
                  key={option.value}
                  onClick={() => !isDisabled && updateForm(form, {
                    defects: formState.defects.includes(option.value)
                      ? formState.defects.filter(d => d !== option.value)
                      : [...formState.defects, option.value]
                  })}
                  disabled={isDisabled}
                  className={cn(
                    'p-4 rounded-lg border-2 transition-all text-center',
                    formState.defects.includes(option.value)
                      ? 'border-orange-500 bg-orange-50'
                      : 'border-gray-200 hover:border-gray-300',
                    isDisabled && 'cursor-not-allowed opacity-50'
                  )}
                >
                  <div className="text-2xl mb-1">{option.icon}</div>
                  <div className="flex items-center justify-center gap-2">
                    <div
                      className={cn(
                        'w-4 h-4 rounded border-2 flex items-center justify-center',
                        formState.defects.includes(option.value)
                          ? 'border-orange-500 bg-orange-500'
                          : 'border-gray-300'
                      )}
                    >
                      {formState.defects.includes(option.value) && <Check size={10} className="text-white" />}
                    </div>
                    <span className="font-medium text-gray-800">{option.label}</span>
                  </div>
                </button>
              ))}
            </div>
          </Card>

          <Card title="退回意见" subtitle="填写具体的质量问题和建议">
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2">
                {PRESET_PHRASES.map((phrase, index) => (
                  <button
                    key={index}
                    onClick={() => !isDisabled && updateForm(form, { rejectionReason: phrase })}
                    disabled={isDisabled}
                    className={cn(
                      'px-3 py-1.5 text-sm bg-gray-100 hover:bg-medical-100 hover:text-medical-700 rounded-full transition-colors',
                      isDisabled && 'cursor-not-allowed opacity-50'
                    )}
                  >
                    {phrase}
                  </button>
                ))}
              </div>
              <textarea
                value={formState.rejectionReason}
                onChange={(e) => updateForm(form, { rejectionReason: e.target.value })}
                placeholder="请输入或选择上方快捷短语填写退回意见..."
                disabled={isDisabled}
                className={cn(
                  'w-full h-32 p-4 border border-gray-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-medical-500 focus:border-transparent',
                  isDisabled && 'bg-gray-100 cursor-not-allowed'
                )}
              />
            </div>
          </Card>

          <Card title="审核结论" subtitle="系统将根据以上判定自动生成结论，也可手动调整">
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <Button
                  variant={formState.conclusion === 'pass' ? 'success' : 'secondary'}
                  onClick={() => !isDisabled && updateForm(form, { conclusion: 'pass' })}
                  disabled={isDisabled}
                  className={formState.conclusion === 'pass' ? 'bg-green-500 hover:bg-green-600' : ''}
                >
                  <ThumbsUp size={16} className="mr-2" />
                  合格
                </Button>
                <Button
                  variant={formState.conclusion === 'fail' ? 'danger' : 'secondary'}
                  onClick={() => !isDisabled && updateForm(form, { conclusion: 'fail' })}
                  disabled={isDisabled}
                  className={formState.conclusion === 'fail' ? 'bg-red-500 hover:bg-red-600' : ''}
                >
                  <ThumbsDown size={16} className="mr-2" />
                  不合格
                </Button>
                <Button variant="outline" onClick={() => handleAutoGenerateForForm(form)} disabled={isDisabled}>
                  <Wand2 size={16} className="mr-2" />
                  自动生成结论
                </Button>
              </div>

              {formState.conclusion && (
                <div
                  className={cn(
                    'p-6 rounded-lg',
                    formState.conclusion === 'pass'
                      ? 'bg-green-50 border border-green-200'
                      : 'bg-red-50 border border-red-200'
                  )}
                >
                  <div className="flex items-center gap-3 mb-2">
                    {formState.conclusion === 'pass' ? (
                      <div className="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center">
                        <Check size={24} className="text-white" />
                      </div>
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-red-500 flex items-center justify-center">
                        <AlertCircle size={24} className="text-white" />
                      </div>
                    )}
                    <div>
                      <div
                        className={cn(
                          'text-2xl font-serif font-bold',
                          formState.conclusion === 'pass' ? 'text-green-700' : 'text-red-700'
                        )}
                      >
                        {getConclusionLabel(formState.conclusion)}
                      </div>
                      <div className="text-sm text-gray-500">
                        缺陷项：{formState.defects.length} 项
                      </div>
                    </div>
                  </div>
                  {formState.rejectionReason && (
                    <p
                      className={cn(
                        'mt-3',
                        formState.conclusion === 'pass' ? 'text-green-700' : 'text-red-700'
                      )}
                    >
                      {formState.rejectionReason}
                    </p>
                  )}
                </div>
              )}
            </div>
          </Card>

          <Card title={`${title}人员`}>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {title}人员姓名 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formState.reviewerName}
                  onChange={(e) => updateForm(form, { reviewerName: e.target.value })}
                  placeholder={`请输入${title}人员姓名`}
                  disabled={isDisabled}
                  className={cn(
                    'w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-medical-500 focus:border-transparent',
                    isDisabled && 'bg-gray-100 cursor-not-allowed'
                  )}
                />
              </div>
            </div>
          </Card>

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
            {form === 'final' && hasFinal && (
              <Button variant="outline" onClick={handleClearFinal}>
                <RefreshCw size={16} className="mr-2" />
                清除复核
              </Button>
            )}
            <Button variant="primary" onClick={onSave} disabled={isDisabled}>
              <Save size={16} className="mr-2" />
              保存{title}
            </Button>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-serif font-bold text-medical-800">质量判定</h2>
        <div className="flex gap-2">
          <Button
            variant={needsReview ? 'primary' : 'outline'}
            onClick={toggleNeedsReview}
            className={needsReview ? 'bg-purple-600 hover:bg-purple-700' : ''}
          >
            <Users size={16} className="mr-2" />
            {needsReview ? '双人复核模式' : '单人判定模式'}
          </Button>
          <Button variant="secondary" onClick={handleBack}>
            <ArrowLeft size={16} className="mr-2" />
            返回查看
          </Button>
          <Button variant="secondary" onClick={handleSave}>
            <Save size={16} className="mr-2" />
            保存草稿
          </Button>
          <Button variant="primary" onClick={handlePrint}>
            <Printer size={16} className="mr-2" />
            打印预览
          </Button>
        </div>
      </div>

      {needsReview ? (
        <div className="space-y-6">
          <div className="bg-purple-50 border border-purple-200 rounded-xl p-4 flex items-center gap-3">
            <ShieldCheck size={24} className="text-purple-600 flex-shrink-0" />
            <div>
              <div className="font-semibold text-purple-800">双人复核模式</div>
              <div className="text-sm text-purple-600">
                初判完成后，需由另一位人员进行复核。系统将自动比对两次结论是否一致。
              </div>
            </div>
            {judgment.isConsistent !== null && (
              <span className={cn(
                'ml-auto px-3 py-1.5 rounded-full text-sm font-semibold',
                judgment.isConsistent
                  ? 'bg-green-200 text-green-800'
                  : 'bg-orange-200 text-orange-800'
              )}>
                {judgment.isConsistent ? '✓ 两次结论一致' : '⚠ 两次结论不一致'}
              </span>
            )}
          </div>

          {renderReviewSection(
            'preliminary',
            '初判',
            <UserCheck size={20} />,
            'border-blue-200',
            false,
            preliminaryForm,
            handleSavePreliminary,
            judgment.preliminaryReview
          )}

          {renderReviewSection(
            'final',
            '复核',
            <ShieldCheck size={20} />,
            'border-purple-200',
            !hasPreliminary,
            finalForm,
            handleSaveFinal,
            judgment.finalReview
          )}
        </div>
      ) : (
        <div className="space-y-6">
          <Card title="清晰度判定" subtitle="请选择图像的清晰程度">
            <div className="grid grid-cols-3 gap-4">
              {clarityOptions.map((option) => (
                <button
                  key={option.value}
                  onClick={() => updateJudgment({ clarity: option.value })}
                  className={`p-4 rounded-lg border-2 transition-all text-left ${
                    judgment.clarity === option.value
                      ? 'border-medical-600 bg-medical-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <div
                      className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                        judgment.clarity === option.value
                          ? 'border-medical-600 bg-medical-600'
                          : 'border-gray-300'
                      }`}
                    >
                      {judgment.clarity === option.value && <Check size={14} className="text-white" />}
                    </div>
                    <span className="font-medium text-gray-800">{option.label}</span>
                  </div>
                  <p className="text-sm text-gray-500 ml-7">{option.description}</p>
                </button>
              ))}
            </div>
          </Card>

          <Card title="完整性判定" subtitle="请选择检查部位的完整程度">
            <div className="grid grid-cols-3 gap-4">
              {completenessOptions.map((option) => (
                <button
                  key={option.value}
                  onClick={() => updateJudgment({ completeness: option.value })}
                  className={`p-4 rounded-lg border-2 transition-all text-left ${
                    judgment.completeness === option.value
                      ? 'border-medical-600 bg-medical-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <div
                      className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                        judgment.completeness === option.value
                          ? 'border-medical-600 bg-medical-600'
                          : 'border-gray-300'
                      }`}
                    >
                      {judgment.completeness === option.value && <Check size={14} className="text-white" />}
                    </div>
                    <span className="font-medium text-gray-800">{option.label}</span>
                  </div>
                  <p className="text-sm text-gray-500 ml-7">{option.description}</p>
                </button>
              ))}
            </div>
          </Card>

          <Card title="缺陷勾选" subtitle="选择图像中存在的缺陷（可多选）">
            <div className="grid grid-cols-5 gap-4">
              {defectOptions.map((option) => (
                <button
                  key={option.value}
                  onClick={() => {
                    const currentDefects = judgment.defects || [];
                    const newDefects = currentDefects.includes(option.value)
                      ? currentDefects.filter((d) => d !== option.value)
                      : [...currentDefects, option.value];
                    updateJudgment({ defects: newDefects });
                  }}
                  className={`p-4 rounded-lg border-2 transition-all text-center ${
                    judgment.defects.includes(option.value)
                      ? 'border-orange-500 bg-orange-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="text-2xl mb-1">{option.icon}</div>
                  <div className="flex items-center justify-center gap-2">
                    <div
                      className={`w-4 h-4 rounded border-2 flex items-center justify-center ${
                        judgment.defects.includes(option.value)
                          ? 'border-orange-500 bg-orange-500'
                          : 'border-gray-300'
                      }`}
                    >
                      {judgment.defects.includes(option.value) && <Check size={10} className="text-white" />}
                    </div>
                    <span className="font-medium text-gray-800">{option.label}</span>
                  </div>
                </button>
              ))}
            </div>
          </Card>

          <Card title="退回意见" subtitle="填写具体的质量问题和建议">
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2">
                {PRESET_PHRASES.map((phrase, index) => (
                  <button
                    key={index}
                    onClick={() => updateJudgment({ rejectionReason: phrase })}
                    className="px-3 py-1.5 text-sm bg-gray-100 hover:bg-medical-100 hover:text-medical-700 rounded-full transition-colors"
                  >
                    {phrase}
                  </button>
                ))}
              </div>
              <textarea
                value={judgment.rejectionReason}
                onChange={(e) => updateJudgment({ rejectionReason: e.target.value })}
                placeholder="请输入或选择上方快捷短语填写退回意见..."
                className="w-full h-32 p-4 border border-gray-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-medical-500 focus:border-transparent"
              />
            </div>
          </Card>

          <Card title="审核结论" subtitle="系统将根据以上判定自动生成结论，也可手动调整">
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <Button
                  variant={judgment.conclusion === 'pass' ? 'success' : 'secondary'}
                  onClick={() => updateJudgment({ conclusion: 'pass' })}
                  className={judgment.conclusion === 'pass' ? 'bg-green-500 hover:bg-green-600' : ''}
                >
                  <ThumbsUp size={16} className="mr-2" />
                  合格
                </Button>
                <Button
                  variant={judgment.conclusion === 'fail' ? 'danger' : 'secondary'}
                  onClick={() => updateJudgment({ conclusion: 'fail' })}
                  className={judgment.conclusion === 'fail' ? 'bg-red-500 hover:bg-red-600' : ''}
                >
                  <ThumbsDown size={16} className="mr-2" />
                  不合格
                </Button>
                <Button variant="outline" onClick={() => { autoGenerateConclusion(); showToast('已自动生成结论', 'success'); }}>
                  <Wand2 size={16} className="mr-2" />
                  自动生成结论
                </Button>
              </div>

              {judgment.conclusion && (
                <div
                  className={`p-6 rounded-lg ${
                    judgment.conclusion === 'pass'
                      ? 'bg-green-50 border border-green-200'
                      : 'bg-red-50 border border-red-200'
                  }`}
                >
                  <div className="flex items-center gap-3 mb-2">
                    {judgment.conclusion === 'pass' ? (
                      <div className="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center">
                        <Check size={24} className="text-white" />
                      </div>
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-red-500 flex items-center justify-center">
                        <AlertCircle size={24} className="text-white" />
                      </div>
                    )}
                    <div>
                      <div
                        className={`text-2xl font-serif font-bold ${
                          judgment.conclusion === 'pass' ? 'text-green-700' : 'text-red-700'
                        }`}
                      >
                        {getConclusionLabel(judgment.conclusion)}
                      </div>
                      <div className="text-sm text-gray-500">
                        缺陷项：{judgment.defects.length} 项
                      </div>
                    </div>
                  </div>
                  {judgment.rejectionReason && (
                    <p
                      className={`mt-3 ${
                        judgment.conclusion === 'pass' ? 'text-green-700' : 'text-red-700'
                      }`}
                    >
                      {judgment.rejectionReason}
                    </p>
                  )}
                </div>
              )}
            </div>
          </Card>

          <Card title="审核人员">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  审核人员姓名 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={judgment.reviewerName}
                  onChange={(e) => updateJudgment({ reviewerName: e.target.value })}
                  placeholder="请输入审核人员姓名"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-medical-500 focus:border-transparent"
                />
              </div>
            </div>
          </Card>
        </div>
      )}

      <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
        <Button variant="secondary" onClick={handleSave}>
          <Save size={16} className="mr-2" />
          保存草稿
        </Button>
        <Button variant="primary" size="lg" onClick={handleComplete}>
          <FileText size={16} className="mr-2" />
          完成核查并打印
        </Button>
      </div>
    </div>
  );
}
