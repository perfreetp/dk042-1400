import type { Draft, ClarityLevel, CompletenessLevel, DefectType } from '@/types';
import { formatDateTime } from '@/utils/date';

interface VerificationSheetProps {
  draft: Draft;
}

const clarityLabels: Record<ClarityLevel | '', string> = {
  '': '',
  clear: '清晰',
  moderate: '较清晰',
  blur: '模糊',
};

const completenessLabels: Record<CompletenessLevel | '', string> = {
  '': '',
  complete: '完整',
  partial: '部分缺失',
  missing: '严重缺失',
};

const defectLabels: Record<DefectType, string> = {
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

export function VerificationSheet({ draft }: VerificationSheetProps) {
  const { patientInfo, judgment } = draft;
  const isPass = judgment.conclusion === 'pass';
  const isFail = judgment.conclusion === 'fail';

  return (
    <>
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .verification-sheet,
          .verification-sheet * {
            visibility: visible;
          }
          .verification-sheet {
            position: absolute;
            left: 0;
            top: 0;
            width: 210mm;
            height: 297mm;
            box-shadow: none !important;
            margin: 0 !important;
            padding: 20mm !important;
          }
          @page {
            size: A4;
            margin: 0;
          }
        }
      `}</style>
      <div className="verification-sheet bg-white shadow-lg p-8 mx-auto" style={{ width: '210mm', minHeight: '297mm' }}>
        <h1 className="text-2xl font-bold text-center text-gray-900 mb-8">
          胶片数字件质量核验单
        </h1>

        <div className="mb-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-3 border-b pb-2">
            患者信息
          </h2>
          <table className="w-full border-collapse text-sm">
            <tbody>
              <tr>
                <td className="border border-gray-300 px-3 py-2 bg-gray-50 font-medium w-24">检查号</td>
                <td className="border border-gray-300 px-3 py-2">{patientInfo.studyNo || '-'}</td>
                <td className="border border-gray-300 px-3 py-2 bg-gray-50 font-medium w-24">姓名</td>
                <td className="border border-gray-300 px-3 py-2">{patientInfo.name || '-'}</td>
              </tr>
              <tr>
                <td className="border border-gray-300 px-3 py-2 bg-gray-50 font-medium">性别</td>
                <td className="border border-gray-300 px-3 py-2">{genderLabels[patientInfo.gender] || '-'}</td>
                <td className="border border-gray-300 px-3 py-2 bg-gray-50 font-medium">年龄</td>
                <td className="border border-gray-300 px-3 py-2">{patientInfo.age || '-'}</td>
              </tr>
              <tr>
                <td className="border border-gray-300 px-3 py-2 bg-gray-50 font-medium">检查部位</td>
                <td className="border border-gray-300 px-3 py-2">{patientInfo.bodyPart || '-'}</td>
                <td className="border border-gray-300 px-3 py-2 bg-gray-50 font-medium">检查日期</td>
                <td className="border border-gray-300 px-3 py-2">{patientInfo.studyDate || '-'}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="mb-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-3 border-b pb-2">
            判定结果
          </h2>
          <table className="w-full border-collapse text-sm">
            <tbody>
              <tr>
                <td className="border border-gray-300 px-3 py-2 bg-gray-50 font-medium w-24">清晰度</td>
                <td className="border border-gray-300 px-3 py-2">{clarityLabels[judgment.clarity] || '-'}</td>
              </tr>
              <tr>
                <td className="border border-gray-300 px-3 py-2 bg-gray-50 font-medium">完整性</td>
                <td className="border border-gray-300 px-3 py-2">{completenessLabels[judgment.completeness] || '-'}</td>
              </tr>
              <tr>
                <td className="border border-gray-300 px-3 py-2 bg-gray-50 font-medium">缺陷项</td>
                <td className="border border-gray-300 px-3 py-2">
                  {judgment.defects.length > 0
                    ? judgment.defects.map((d) => defectLabels[d]).join('、')
                    : '无'}
                </td>
              </tr>
              <tr>
                <td className="border border-gray-300 px-3 py-2 bg-gray-50 font-medium">退回意见</td>
                <td className="border border-gray-300 px-3 py-2 min-h-16">{judgment.rejectionReason || '-'}</td>
              </tr>
              <tr>
                <td className="border border-gray-300 px-3 py-2 bg-gray-50 font-medium">结论</td>
                <td className={`border border-gray-300 px-3 py-2 font-semibold ${isPass ? 'text-green-600' : isFail ? 'text-red-600' : 'text-gray-500'}`}>
                  {isPass ? '合格' : isFail ? '不合格' : '-'}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="mt-12 flex justify-between items-center text-sm">
          <div>
            <span className="font-medium">审核人员：</span>
            <span>{judgment.reviewerName || '-'}</span>
          </div>
          <div>
            <span className="font-medium">审核日期：</span>
            <span>{judgment.reviewedAt ? formatDateTime(judgment.reviewedAt) : '-'}</span>
          </div>
        </div>
      </div>
    </>
  );
}
