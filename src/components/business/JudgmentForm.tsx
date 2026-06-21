import { useReviewStore } from '@/store/useReviewStore';
import { PRESET_PHRASES, type DefectType, type ClarityLevel, type CompletenessLevel } from '@/types';
import { Button } from '@/components/common/Button';
import { Card } from '@/components/common/Card';
import { Check, AlertCircle, ThumbsUp, ThumbsDown, Wand2, Save, Printer, ArrowLeft, FileText } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

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

export function JudgmentForm() {
  const navigate = useNavigate();
  const { currentDraft, updateJudgment, autoGenerateConclusion, completeDraft, saveCurrentDraft, showToast } = useReviewStore();

  if (!currentDraft) return null;

  const { judgment, id: draftId } = currentDraft;

  const handleClarityChange = (value: ClarityLevel) => {
    updateJudgment({ clarity: value });
  };

  const handleCompletenessChange = (value: CompletenessLevel) => {
    updateJudgment({ completeness: value });
  };

  const handleDefectToggle = (value: DefectType) => {
    const currentDefects = judgment.defects || [];
    const newDefects = currentDefects.includes(value)
      ? currentDefects.filter((d) => d !== value)
      : [...currentDefects, value];
    updateJudgment({ defects: newDefects });
  };

  const handleReasonChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    updateJudgment({ rejectionReason: e.target.value });
  };

  const handlePhraseClick = (phrase: string) => {
    updateJudgment({ rejectionReason: phrase });
  };

  const handleConclusionChange = (value: 'pass' | 'fail') => {
    updateJudgment({ conclusion: value });
  };

  const handleReviewerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    updateJudgment({ reviewerName: e.target.value });
  };

  const handleAutoGenerate = () => {
    autoGenerateConclusion();
    showToast('已自动生成结论', 'success');
  };

  const handleSave = () => {
    saveCurrentDraft();
  };

  const handleComplete = () => {
    if (!judgment.reviewerName.trim()) {
      showToast('请填写审核人员姓名', 'error');
      return;
    }
    const success = completeDraft();
    if (success) {
      navigate(`/print/${draftId}`);
    }
  };

  const handleBack = () => {
    navigate(`/viewer/${draftId}`);
  };

  const handlePrint = () => {
    navigate(`/print/${draftId}`);
  };

  const getConclusionLabel = (conclusion: string) => {
    if (conclusion === 'pass') return '合格';
    if (conclusion === 'fail') return '不合格';
    return '未判定';
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-serif font-bold text-medical-800">质量判定</h2>
        <div className="flex gap-2">
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

      <Card title="清晰度判定" subtitle="请选择图像的清晰程度">
        <div className="grid grid-cols-3 gap-4">
          {clarityOptions.map((option) => (
            <button
              key={option.value}
              onClick={() => handleClarityChange(option.value)}
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
                  {judgment.clarity === option.value && (
                    <Check size={14} className="text-white" />
                  )}
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
              onClick={() => handleCompletenessChange(option.value)}
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
                  {judgment.completeness === option.value && (
                    <Check size={14} className="text-white" />
                  )}
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
              onClick={() => handleDefectToggle(option.value)}
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
                  {judgment.defects.includes(option.value) && (
                    <Check size={10} className="text-white" />
                  )}
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
                onClick={() => handlePhraseClick(phrase)}
                className="px-3 py-1.5 text-sm bg-gray-100 hover:bg-medical-100 hover:text-medical-700 rounded-full transition-colors"
              >
                {phrase}
              </button>
            ))}
          </div>
          <textarea
            value={judgment.rejectionReason}
            onChange={handleReasonChange}
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
              onClick={() => handleConclusionChange('pass')}
              className={judgment.conclusion === 'pass' ? 'bg-green-500 hover:bg-green-600' : ''}
            >
              <ThumbsUp size={16} className="mr-2" />
              合格
            </Button>
            <Button
              variant={judgment.conclusion === 'fail' ? 'danger' : 'secondary'}
              onClick={() => handleConclusionChange('fail')}
              className={judgment.conclusion === 'fail' ? 'bg-red-500 hover:bg-red-600' : ''}
            >
              <ThumbsDown size={16} className="mr-2" />
              不合格
            </Button>
            <Button variant="outline" onClick={handleAutoGenerate}>
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
              onChange={handleReviewerChange}
              placeholder="请输入审核人员姓名"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-medical-500 focus:border-transparent"
            />
          </div>
        </div>
      </Card>

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
