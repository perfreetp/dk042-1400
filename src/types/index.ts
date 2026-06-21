/**
 * 患者信息
 */
export interface PatientInfo {
  /** 检查号 */
  studyNo: string;
  /** 姓名 */
  name: string;
  /** 性别 */
  gender: 'male' | 'female' | '';
  /** 年龄 */
  age: string;
  /** 检查部位 */
  bodyPart: string;
  /** 检查日期 */
  studyDate: string;
  /** 检查时间 */
  studyTime: string;
}

/**
 * 标记类型
 */
export type MarkType = 'stain' | 'shadow';

/**
 * 图像标记
 */
export interface Mark {
  /** 标记唯一标识 */
  id: string;
  /** 标记类型 */
  type: MarkType;
  /** X轴百分比坐标 (0-100) */
  x: number;
  /** Y轴百分比坐标 (0-100) */
  y: number;
  /** 标记大小（像素） */
  size: number;
  /** 创建时间戳 */
  createdAt: number;
}

/**
 * 清晰度等级
 * - clear: 清晰
 * - moderate: 较清晰
 * - blur: 模糊
 */
export type ClarityLevel = 'clear' | 'moderate' | 'blur';

/**
 * 完整性等级
 * - complete: 完整
 * - partial: 部分缺失
 * - missing: 严重缺失
 */
export type CompletenessLevel = 'complete' | 'partial' | 'missing';

/**
 * 缺陷类型
 * - stain: 污点
 * - shadow: 阴影
 * - artifact: 伪影
 * - thickness: 层厚不均
 * - position: 位置偏差
 */
export type DefectType = 'stain' | 'shadow' | 'artifact' | 'thickness' | 'position';

/**
 * 评审结论
 * - pass: 合格
 * - fail: 不合格
 * - '': 未判定
 */
export type Conclusion = 'pass' | 'fail' | '';

/**
 * 评审判断
 */
export interface Judgment {
  /** 清晰度 */
  clarity: ClarityLevel | '';
  /** 完整性 */
  completeness: CompletenessLevel | '';
  /** 缺陷类型数组 */
  defects: DefectType[];
  /** 退回意见 */
  rejectionReason: string;
  /** 评审结论 */
  conclusion: Conclusion;
  /** 评审人姓名 */
  reviewerName: string;
  /** 评审时间戳 */
  reviewedAt: number;
}

/**
 * 图像数据
 */
export interface ImageData {
  /** 图像唯一标识 */
  id: string;
  /** 图像名称 */
  name: string;
  /** 图像类型 */
  type: string;
  /** 图像大小（字节） */
  size: number;
  /** 图像数据URL */
  dataUrl: string;
  /** 图像宽度 */
  width: number;
  /** 图像高度 */
  height: number;
  /** 旋转角度 (0/90/180/270) */
  rotation: number;
  /** 缩放比例 */
  scale: number;
  /** 标记数组 */
  marks: Mark[];
}

/**
 * 草稿状态
 * - incomplete: 未完成
 * - completed: 已完成
 */
export type DraftStatus = 'incomplete' | 'completed';

/**
 * 草稿数据
 */
export interface Draft {
  /** 草稿唯一标识 */
  id: string;
  /** 创建时间戳 */
  createdAt: number;
  /** 更新时间戳 */
  updatedAt: number;
  /** 草稿状态 */
  status: DraftStatus;
  /** 患者信息 */
  patientInfo: PatientInfo;
  /** 图像数据数组 */
  images: ImageData[];
  /** 当前显示图像索引 */
  currentImageIndex: number;
  /** 评审判断 */
  judgment: Judgment;
}

/**
 * 预设快捷短语
 */
export const PRESET_PHRASES: string[] = [
  '图像模糊，建议重拍',
  '存在伪影，影响诊断',
  '位置不正，需重新摆位',
  '层厚不均，建议调整参数',
  '图像存在污点，影响观察',
  '检查部位不完整，部分缺失',
  '有明显阴影，需重新拍摄',
  '图像质量良好，符合诊断要求',
  '细节显示不清，建议重拍',
  '不符合质量标准，予以退回'
];

/**
 * 本地存储键名常量
 */
export const STORAGE_KEYS = {
  /** 草稿列表 */
  DRAFTS: 'qc_review_drafts',
  /** 当前草稿ID */
  CURRENT_DRAFT_ID: 'qc_current_draft_id',
} as const;

/**
 * 存储键类型
 */
export type StorageKey = typeof STORAGE_KEYS[keyof typeof STORAGE_KEYS];
