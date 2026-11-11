// EXPORTS: ISkincareRoutine, IRoutineStep, ICheckInRecord, MOCK_ROUTINES, ROUTINE_EMOJIS
import type { ISkincareProduct } from './products';

/** 护肤步骤类型（使用顺序） */
export type RoutineStepType =
  | 'cleanser'      // 洁面
  | 'toner'         // 爽肤水 / 化妆水
  | 'serum'         // 精华
  | 'ampoule'       // 安瓶 / 浓缩精华
  | 'eye_care'      // 眼周护理
  | 'cream'         // 面霜 / 乳液
  | 'oil'           // 护肤油
  | 'sunscreen'     // 防晒（日间最后一步）
  | 'mask'          // 面膜（周护理）
  | 'body_care';    // 身体护理

/** 单个护理步骤 */
export interface IRoutineStep {
  type: RoutineStepType;
  /** 步骤中文名 */
  label: string;
  /** 功效标签，用于匹配产品（任一命中即可） */
  matchEfficacies?: string[];
  /** 分类 key，用于兜底匹配 */
  matchCategories?: ISkincareProduct['category'][];
  /** 绑定的库存产品 id（自定义步骤直接绑定，0~1 个） */
  productId?: string;
  /** 默认用量（百分比 1-100，5 步进），打卡确认单的预填扣减量 */
  defaultAmount?: number;
  /** 备注说明，例如"早晚都用" */
  note?: string;
}

/** 一套完整护理方案 */
export interface ISkincareRoutine {
  id: string;
  /** 方案名称，如"美白提亮方案" */
  name: string;
  /** 功效标签，如 ["美白", "提亮"] */
  efficacy: string[];
  /** 适用时段 */
  time: 'morning' | 'evening' | 'both' | 'weekly';
  /** 步骤（按使用顺序） */
  steps: IRoutineStep[];
  /** emoji 图标 */
  icon: string;
  /** 简短描述 */
  description?: string;
  /** 是否为系统预设（预设不可删除/改步骤，可复制为自定义） */
  isPreset: boolean;
  /** 创建时间（本地 YYYY-MM-DD HH:mm），预设方案无 */
  createdAt?: string;
}

/** 打卡明细项（产品快照 + 实扣用量） */
export interface ICheckInItem {
  productId: string;
  /** 产品名快照（防产品删除后悬空引用） */
  productName: string;
  /** 实扣用量（百分比） */
  amount: number;
}

/** 一次打卡记录（关联 N 条等额使用记录，见 R1） */
export interface ICheckInRecord {
  id: string;
  routineId: string;
  /** 方案名快照（方案删除后历史打卡仍可展示，见 R4） */
  routineName: string;
  routineIcon: string;
  /** 打卡日期（本地 YYYY-MM-DD） */
  date: string;
  items: ICheckInItem[];
  /** 创建时间（本地 YYYY-MM-DD HH:mm） */
  createdAt: string;
}

export const ROUTINE_STEP_LABELS: Record<RoutineStepType, string> = {
  cleanser: '洁面',
  toner: '爽肤水',
  serum: '精华',
  ampoule: '安瓶',
  eye_care: '眼周护理',
  cream: '面霜',
  oil: '护肤油',
  sunscreen: '防晒',
  mask: '面膜',
  body_care: '身体护理',
};

/**
 * 预设护理方案模板
 * 设计思路：基于 efficacy + category 双维度匹配产品
 * - matchEfficacies 优先：产品 efficacies 里包含这些功效之一就命中
 * - matchCategories 兜底：按产品分类匹配（比如"洁面"类别）
 */
export const MOCK_ROUTINES: ISkincareRoutine[] = [
  {
    id: 'r_whitening',
    name: '美白提亮方案',
    efficacy: ['美白', '提亮', '淡斑'],
    time: 'both',
    icon: '✨',
    description: '烟酰胺 / 377 / 维C 等成分组合，日夜坚持提亮肤色',
    isPreset: true,
    steps: [
      { type: 'cleanser', label: '洁面', matchCategories: ['cleanser'], defaultAmount: 5, note: '温和清洁，避免过度去角质' },
      { type: 'toner', label: '爽肤水', matchCategories: ['toner'], defaultAmount: 10, note: '二次清洁 + 打底' },
      { type: 'serum', label: '美白精华', matchEfficacies: ['美白', '提亮', '淡斑'], matchCategories: ['serum'], defaultAmount: 5 },
      { type: 'cream', label: '美白面霜', matchEfficacies: ['美白', '提亮'], matchCategories: ['cream'], defaultAmount: 8 },
      { type: 'sunscreen', label: '防晒（日间）', matchCategories: ['sunscreen'], defaultAmount: 5, note: '日间最后一步，夜间可跳过' },
    ],
  },
  {
    id: 'r_moisturize',
    name: '补水保湿方案',
    efficacy: ['保湿', '补水', '修护'],
    time: 'both',
    icon: '💧',
    description: '玻尿酸 + B5 + 神经酰胺，干敏肌急救',
    isPreset: true,
    steps: [
      { type: 'cleanser', label: '洁面', matchCategories: ['cleanser'], defaultAmount: 5, note: '氨基酸温和款' },
      { type: 'toner', label: '保湿水', matchEfficacies: ['保湿', '补水'], matchCategories: ['toner'], defaultAmount: 10 },
      { type: 'serum', label: '保湿精华', matchEfficacies: ['保湿', '补水', '修护'], matchCategories: ['serum'], defaultAmount: 5 },
      { type: 'cream', label: '保湿面霜', matchEfficacies: ['保湿', '修护'], matchCategories: ['cream'], defaultAmount: 8 },
    ],
  },
  {
    id: 'r_antiaging',
    name: '抗老紧致方案',
    efficacy: ['抗老', '紧致', '抗氧化'],
    time: 'evening',
    icon: '🌙',
    description: '玻色因 / 视黄醇 / 胜肽，夜间修复抗皱',
    isPreset: true,
    steps: [
      { type: 'cleanser', label: '洁面', matchCategories: ['cleanser'], defaultAmount: 5 },
      { type: 'toner', label: '爽肤水', matchCategories: ['toner'], defaultAmount: 10 },
      { type: 'serum', label: '抗老精华', matchEfficacies: ['抗老', '紧致', '抗氧化'], matchCategories: ['serum'], defaultAmount: 5 },
      { type: 'cream', label: '抗老面霜', matchEfficacies: ['抗老', '紧致', '修护'], matchCategories: ['cream'], defaultAmount: 8 },
    ],
  },
  {
    id: 'r_oildrop',
    name: '油痘平衡方案',
    efficacy: ['控油', '祛痘', '舒缓'],
    time: 'both',
    icon: '🌿',
    description: '油橄榄 + 水杨酸 + 皮傲宁，平衡菌群收毛孔',
    isPreset: true,
    steps: [
      { type: 'cleanser', label: '洁面', matchCategories: ['cleanser'], defaultAmount: 5, note: '晨间可皂基 / 晚间氨基酸' },
      { type: 'toner', label: '平衡水', matchEfficacies: ['控油', '舒缓'], matchCategories: ['toner'], defaultAmount: 10 },
      { type: 'serum', label: '祛痘精华', matchEfficacies: ['祛痘', '控油', '舒缓'], matchCategories: ['serum'], defaultAmount: 5 },
      { type: 'cream', label: '清爽面霜', matchEfficacies: ['控油'], matchCategories: ['cream'], defaultAmount: 5 },
    ],
  },
  {
    id: 'r_sunprotect',
    name: '日间防护方案',
    efficacy: ['防晒'],
    time: 'morning',
    icon: '☀️',
    description: '晨间快速 routine：打底 + 防晒 + 可选彩妆',
    isPreset: true,
    steps: [
      { type: 'cleanser', label: '洁面', matchCategories: ['cleanser'], defaultAmount: 5 },
      { type: 'toner', label: '爽肤水', matchCategories: ['toner'], defaultAmount: 10 },
      { type: 'serum', label: '日间精华（可选）', matchCategories: ['serum'], defaultAmount: 5, note: '轻薄不搓泥款' },
      { type: 'sunscreen', label: '防晒', matchCategories: ['sunscreen'], defaultAmount: 5 },
    ],
  },
];

/** 方案图标 emoji 候选（FR-A1 图标选择器） */
export const ROUTINE_EMOJIS = [
  '🧴', '✨', '💧', '🌙', '🌿', '☀️', '🌸', '🪷',
  '🍃', '🫧', '🧼', '💆', '🌟', '❄️', '🎀', '🧖',
] as const;
