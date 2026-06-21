import type { Draft, ClarityLevel, CompletenessLevel, DefectType, ImageData } from '@/types';
import { formatDateTime } from '@/utils/date';
import { useRef, useEffect } from 'react';

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

interface MarkThumbnailProps {
  image: ImageData;
  index: number;
}

function MarkThumbnail({ image, index }: MarkThumbnailProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvasWidth = 140;
      const canvasHeight = 140;
      canvas.width = canvasWidth;
      canvas.height = canvasHeight;

      ctx.fillStyle = '#1f2937';
      ctx.fillRect(0, 0, canvasWidth, canvasHeight);

      const imgRatio = img.width / img.height;
      const canvasRatio = canvasWidth / canvasHeight;

      let drawWidth: number;
      let drawHeight: number;
      let offsetX: number;
      let offsetY: number;

      if (imgRatio > canvasRatio) {
        drawWidth = canvasWidth;
        drawHeight = canvasWidth / imgRatio;
        offsetX = 0;
        offsetY = (canvasHeight - drawHeight) / 2;
      } else {
        drawHeight = canvasHeight;
        drawWidth = canvasHeight * imgRatio;
        offsetX = (canvasWidth - drawWidth) / 2;
        offsetY = 0;
      }

      ctx.drawImage(img, offsetX, offsetY, drawWidth, drawHeight);

      image.marks.forEach((mark) => {
        const x = offsetX + (mark.x / 100) * drawWidth;
        const y = offsetY + (mark.y / 100) * drawHeight;
        const size = Math.max(8, (mark.size / Math.max(img.width, img.height)) * Math.max(drawWidth, drawHeight));

        if (mark.type === 'stain') {
          ctx.fillStyle = 'rgba(239, 68, 68, 0.5)';
          ctx.strokeStyle = '#ef4444';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(x, y, size / 2, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
        } else {
          ctx.fillStyle = 'rgba(59, 130, 246, 0.4)';
          ctx.strokeStyle = '#3b82f6';
          ctx.lineWidth = 2;
          ctx.fillRect(x - size / 2, y - size / 2, size, size);
          ctx.strokeRect(x - size / 2, y - size / 2, size, size);
        }
      });

      ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
      ctx.fillRect(4, 4, 28, 18);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 11px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(`${index + 1}`, 18, 13);

      if (image.marks.length > 0) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(canvasWidth - 52, canvasHeight - 20, 48, 16);
        ctx.fillStyle = image.marks.some(m => m.type === 'stain') ? '#ef4444' : '#3b82f6';
        ctx.font = 'bold 10px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(`${image.marks.length}处`, canvasWidth - 28, canvasHeight - 12);
      }
    };

    img.src = image.dataUrl;
  }, [image, index]);

  return (
    <div className="flex flex-col items-center gap-1.5">
      <canvas
        ref={canvasRef}
        className="border border-gray-300 rounded"
        style={{ width: 140, height: 140 }}
      />
      <div className="text-xs text-gray-500 truncate max-w-[140px]">
        {image.marks.length > 0 ? (
          <span className="flex items-center justify-center gap-1.5">
            {image.marks.filter(m => m.type === 'stain').length > 0 && (
              <span className="flex items-center gap-0.5">
                <span className="w-2 h-2 rounded-full bg-red-500"></span>
                {image.marks.filter(m => m.type === 'stain').length}
              </span>
            )}
            {image.marks.filter(m => m.type === 'shadow').length > 0 && (
              <span className="flex items-center gap-0.5">
                <span className="w-2 h-2 rounded bg-blue-500"></span>
                {image.marks.filter(m => m.type === 'shadow').length}
              </span>
            )}
          </span>
        ) : (
          <span className="text-gray-400">无标记</span>
        )}
      </div>
    </div>
  );
}

export function VerificationSheet({ draft }: VerificationSheetProps) {
  const { patientInfo, judgment, images } = draft;
  const isPass = judgment.conclusion === 'pass';
  const isFail = judgment.conclusion === 'fail';

  const totalMarks = images.reduce((sum, img) => sum + img.marks.length, 0);
  const stainCount = images.reduce((sum, img) => sum + img.marks.filter(m => m.type === 'stain').length, 0);
  const shadowCount = images.reduce((sum, img) => sum + img.marks.filter(m => m.type === 'shadow').length, 0);
  const imagesWithMarks = images.filter(img => img.marks.length > 0);

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
            min-height: 297mm;
            box-shadow: none !important;
            margin: 0 !important;
            padding: 15mm !important;
          }
          @page {
            size: A4;
            margin: 0;
          }
        }
      `}</style>
      <div className="verification-sheet bg-white shadow-lg p-8 mx-auto" style={{ width: '210mm', minHeight: '297mm' }}>
        <h1 className="text-2xl font-bold text-center text-gray-900 mb-2">
          胶片数字件质量核验单
        </h1>
        <div className="text-center text-sm text-gray-500 mb-6">
          编号：{draft.id.toUpperCase().slice(0, 12)}
        </div>

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
                <td className="border border-gray-300 px-3 py-2">{patientInfo.age ? `${patientInfo.age}岁` : '-'}</td>
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
                <td className="border border-gray-300 px-3 py-2 bg-gray-50 font-medium align-top">退回意见</td>
                <td className="border border-gray-300 px-3 py-2 min-h-16 leading-relaxed">{judgment.rejectionReason || '-'}</td>
              </tr>
              <tr>
                <td className="border border-gray-300 px-3 py-2 bg-gray-50 font-medium">结论</td>
                <td className={`border border-gray-300 px-3 py-2 font-bold text-lg ${isPass ? 'text-green-600' : isFail ? 'text-red-600' : 'text-gray-500'}`}>
                  {isPass ? '✓ 合格' : isFail ? '✗ 不合格' : '-'}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {totalMarks > 0 && (
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-3 border-b pb-2">
              标记概览
              <span className="ml-2 text-sm font-normal text-gray-500">
                （共 {images.length} 张图片，{imagesWithMarks.length} 张有标记，总计 {totalMarks} 处
                {stainCount > 0 && <span className="text-red-600">，污点 {stainCount} 处</span>}
                {shadowCount > 0 && <span className="text-blue-600">，阴影 {shadowCount} 处</span>}
                ）
              </span>
            </h2>
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex flex-wrap gap-4">
                {images.map((img, idx) => (
                  <MarkThumbnail key={img.id} image={img} index={idx} />
                ))}
              </div>
              {totalMarks > 0 && (
                <div className="mt-4 pt-3 border-t border-gray-200 flex items-center gap-6 text-sm">
                  <span className="text-gray-600 font-medium">图例说明：</span>
                  {stainCount > 0 && (
                    <span className="flex items-center gap-1.5">
                      <span className="inline-block w-4 h-4 rounded-full bg-red-500/50 border-2 border-red-500"></span>
                      <span className="text-gray-700">污点（{stainCount}处）</span>
                    </span>
                  )}
                  {shadowCount > 0 && (
                    <span className="flex items-center gap-1.5">
                      <span className="inline-block w-4 h-4 rounded bg-blue-500/40 border-2 border-blue-500"></span>
                      <span className="text-gray-700">阴影（{shadowCount}处）</span>
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {judgment.needsReview && (judgment.preliminaryReview || judgment.finalReview) && (
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-3 border-b pb-2">
              复核记录
            </h2>
            {judgment.isConsistent !== null && (
              <div className={`mb-4 p-3 rounded-lg text-center font-semibold ${
                judgment.isConsistent
                  ? 'bg-green-50 text-green-700 border border-green-200'
                  : 'bg-orange-50 text-orange-700 border border-orange-200'
              }`}>
                {judgment.isConsistent ? '✓ 初判与复核结论一致' : '⚠ 初判与复核结论不一致'}
              </div>
            )}
            <div className="grid grid-cols-2 gap-4">
              {judgment.preliminaryReview && (
                <div className="border border-blue-200 rounded-lg p-4">
                  <div className="font-semibold text-blue-700 mb-2 pb-2 border-b border-blue-100">初判</div>
                  <div className="space-y-1.5 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-500">初判人员</span>
                      <span className="font-medium">{judgment.preliminaryReview.reviewerName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">清晰度</span>
                      <span>{clarityLabels[judgment.preliminaryReview.clarity] || '-'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">完整性</span>
                      <span>{completenessLabels[judgment.preliminaryReview.completeness] || '-'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">结论</span>
                      <span className={judgment.preliminaryReview.conclusion === 'pass' ? 'text-green-600 font-semibold' : 'text-red-600 font-semibold'}>
                        {judgment.preliminaryReview.conclusion === 'pass' ? '合格' : '不合格'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">初判时间</span>
                      <span>{formatDateTime(judgment.preliminaryReview.reviewedAt)}</span>
                    </div>
                    {judgment.preliminaryReview.rejectionReason && (
                      <div className="pt-2 mt-2 border-t border-gray-200">
                        <div className="text-gray-500 mb-1">初判意见：</div>
                        <div className="text-gray-700 text-xs leading-relaxed">{judgment.preliminaryReview.rejectionReason}</div>
                      </div>
                    )}
                    <div className="mt-3 pt-2 border-t border-gray-200">
                      <span className="text-gray-400 text-xs">签字：_______________</span>
                    </div>
                  </div>
                </div>
              )}
              {judgment.finalReview && (
                <div className="border border-purple-200 rounded-lg p-4">
                  <div className="font-semibold text-purple-700 mb-2 pb-2 border-b border-purple-100">复核</div>
                  <div className="space-y-1.5 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-500">复核人员</span>
                      <span className="font-medium">{judgment.finalReview.reviewerName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">清晰度</span>
                      <span>{clarityLabels[judgment.finalReview.clarity] || '-'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">完整性</span>
                      <span>{completenessLabels[judgment.finalReview.completeness] || '-'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">结论</span>
                      <span className={judgment.finalReview.conclusion === 'pass' ? 'text-green-600 font-semibold' : 'text-red-600 font-semibold'}>
                        {judgment.finalReview.conclusion === 'pass' ? '合格' : '不合格'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">复核时间</span>
                      <span>{formatDateTime(judgment.finalReview.reviewedAt)}</span>
                    </div>
                    {judgment.finalReview.rejectionReason && (
                      <div className="pt-2 mt-2 border-t border-gray-200">
                        <div className="text-gray-500 mb-1">复核意见：</div>
                        <div className="text-gray-700 text-xs leading-relaxed">{judgment.finalReview.rejectionReason}</div>
                      </div>
                    )}
                    <div className="mt-3 pt-2 border-t border-gray-200">
                      <span className="text-gray-400 text-xs">签字：_______________</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        <div className="mt-12 flex justify-between items-center text-sm">
          <div>
            {judgment.needsReview ? (
              <>
                <span className="font-medium">最终审核：</span>
                <span className="ml-1">{judgment.finalReview?.reviewerName || judgment.preliminaryReview?.reviewerName || '-'}</span>
              </>
            ) : (
              <>
                <span className="font-medium">审核人员：</span>
                <span className="ml-1">{judgment.reviewerName || '-'}</span>
                {judgment.reviewerName && (
                  <span className="ml-4 text-gray-400">（签字：_______________）</span>
                )}
              </>
            )}
          </div>
          <div>
            <span className="font-medium">审核日期：</span>
            <span>{judgment.reviewedAt ? formatDateTime(judgment.reviewedAt) : '-'}</span>
          </div>
        </div>

        <div className="mt-8 pt-4 border-t border-gray-200 text-xs text-gray-400 text-center">
          本核验单由胶片数字件质量核查系统自动生成 · {formatDateTime(Date.now())}
        </div>
      </div>
    </>
  );
}
