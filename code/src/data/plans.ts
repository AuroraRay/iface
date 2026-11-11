// EXPORTS: IPlan, IPlanGoal, IPlanSchedule, PlanGoalType, MOCK_PLANS, effBaselineKey, prodBaselineKey
// 使用计划数据模型（FR-D）

export type PlanGoalType = 'efficacy' | 'product' | 'routine';

/** 目标条目：功效方向 / 指定产品 / 指定方案 */
export interface IPlanGoal {
  type: PlanGoalType;
  /** 功效标签 / 产品 id / 方案 id */
  target: string;
  /** 展示文案 */
  label: string;
}

/** 周排程：方案 + 生效星期（周一=1 … 周日=7），仅作标识与统计口径，不自动执行 */
export interface IPlanSchedule {
  routineId: string;
  weekdays: number[];
}

/** 使用计划（每个计划绑定唯一月份，跨月不自动续期） */
export interface IPlan {
  id: string;
  /** 计划月份 YYYY-MM */
  month: string;
  name?: string;
  goals: IPlanGoal[];
  schedules: IPlanSchedule[];
  status: 'active' | 'archived';
  /** 创建时间（本地 YYYY-MM-DD HH:mm） */
  createdAt: string;
  /**
   * 创建时各目标的剩余量快照（FR-D2 进度分母）：
   * - 功效目标 key = eff:{target} → 匹配产品剩余量合计
   * - 产品目标 key = prod:{productId} → 该产品创建时剩余量
   */
  baseline: Record<string, number>;
}

export const effBaselineKey = (target: string) => `eff:${target}`;
export const prodBaselineKey = (productId: string) => `prod:${productId}`;

/** mock 初始计划（首次加载时写入）：2026-11 美白冲刺计划，baseline 按产品数量硬编码 */
export const MOCK_PLANS: IPlan[] = [
  {
    id: 'plan_whitening_202611',
    month: '2026-11',
    name: '美白冲刺计划',
    goals: [{ type: 'efficacy', target: '美白', label: '美白' }],
    schedules: [{ routineId: 'r_whitening', weekdays: [1, 3, 5] }],
    status: 'active',
    createdAt: '2026-11-01 09:00',
    baseline: { 'eff:美白': 100 },
  },
];
