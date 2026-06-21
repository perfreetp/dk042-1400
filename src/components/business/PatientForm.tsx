import { useReviewStore } from '@/store/useReviewStore';
import type { PatientInfo } from '@/types';

type FieldKey = keyof PatientInfo;

export function PatientForm() {
  const patientInfo = useReviewStore((state) => state.currentDraft?.patientInfo);
  const updatePatientInfo = useReviewStore((state) => state.updatePatientInfo);

  if (!patientInfo) return null;

  const handleChange = (key: FieldKey, value: string) => {
    updatePatientInfo({ [key]: value });
  };

  const fields: { label: string; key: FieldKey; type?: string; colSpan?: number }[] = [
    { label: '检查号', key: 'studyNo' },
    { label: '姓名', key: 'name' },
    { label: '年龄', key: 'age' },
    { label: '检查部位', key: 'bodyPart' },
    { label: '检查日期', key: 'studyDate', type: 'date' },
    { label: '检查时间', key: 'studyTime', type: 'time' },
  ];

  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <h3 className="text-lg font-semibold text-gray-800 mb-4">患者信息</h3>
      <div className="grid grid-cols-2 gap-4">
        {fields.map((field) => (
          <div key={field.key} className={field.colSpan === 2 ? 'col-span-2' : ''}>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {field.label}
            </label>
            <input
              type={field.type || 'text'}
              value={patientInfo[field.key]}
              onChange={(e) => handleChange(field.key, e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
            />
          </div>
        ))}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">性别</label>
          <div className="flex items-center gap-6 h-10">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="gender"
                value="male"
                checked={patientInfo.gender === 'male'}
                onChange={(e) => handleChange('gender', e.target.value)}
                className="w-4 h-4 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">男</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="gender"
                value="female"
                checked={patientInfo.gender === 'female'}
                onChange={(e) => handleChange('gender', e.target.value)}
                className="w-4 h-4 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">女</span>
            </label>
          </div>
        </div>
      </div>
    </div>
  );
}
