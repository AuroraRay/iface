// 护理方案 × 库存产品匹配工具（方案卡展示与打卡确认单共用）
import type { ISkincareProduct } from '@/data/products';
import type { IRoutineStep, ISkincareRoutine, RoutineStepType } from '@/data/routines';

/**
 * 在库存中查找与某个护理步骤匹配的产品
 * 匹配优先级：efficacies 包含 → category 匹配
 * 只返回非 used_up 的产品
 */
export function matchStepProducts(
  step: IRoutineStep,
  products: ISkincareProduct[],
): ISkincareProduct[] {
  const active = products.filter((p) => p.status !== 'used_up');

  const matched = active.filter((p) => {
    // 功效匹配优先
    if (step.matchEfficacies && step.matchEfficacies.length > 0) {
      if (p.efficacies?.some((e) => step.matchEfficacies!.includes(e))) return true;
    }
    // 分类匹配兜底
    if (step.matchCategories && step.matchCategories.length > 0) {
      if (step.matchCategories.includes(p.category)) return true;
    }
    return false;
  });

  // 优先显示已开封使用中的，其次未开封全新的
  matched.sort((a, b) => {
    const order: Record<ISkincareProduct['status'], number> = {
      opened_in_use: 0,
      opened_unused: 1,
      opened_paused: 2,
      unopened_sealed: 3,
      expired: 4,
      used_up: 5,
    };
    return order[a.status] - order[b.status];
  });

  return matched;
}

/** 步骤的解析结果：绑定产品 / 匹配产品 / 未绑定 */
export interface ResolvedStep {
  step: IRoutineStep;
  /** 步骤对应产品（绑定优先，预设方案按匹配兜底），可能为空 */
  product: ISkincareProduct | null;
  /** 该步骤是否有可关联产品 */
  matched: boolean;
}

/** 解析方案每个步骤对应的产品（卡片展示用） */
export function resolveRoutineSteps(
  routine: ISkincareRoutine,
  products: ISkincareProduct[],
): ResolvedStep[] {
  return routine.steps.map((step) => {
    if (step.productId) {
      // 自定义步骤：直接绑定产品；产品被删除则降级为未绑定
      const product = products.find((p) => p.id === step.productId) ?? null;
      return { step, product, matched: product !== null };
    }
    if (!routine.isPreset) {
      // 自定义方案未绑定产品的步骤：仅作提示
      return { step, product: null, matched: false };
    }
    // 预设方案：按功效/分类动态匹配
    const matched = matchStepProducts(step, products);
    return { step, product: matched[0] ?? null, matched: matched.length > 0 };
  });
}

/** 打卡确认单行：同产品多步骤合并、用量累加（FR-B1） */
export interface CheckInRow {
  product: ISkincareProduct;
  /** 预填用量（百分比），已按剩余量截断 */
  amount: number;
  /** 来源步骤名 */
  stepLabels: string[];
}

const DEFAULT_STEP_AMOUNT = 5;

/**
 * 解析方案的可打卡产品行：
 * - 步骤绑定产品 → 该产品（产品已删除则跳过）
 * - 预设步骤未绑定 → 按功效/分类匹配取第一个产品
 * - 自定义步骤未绑定 → 不出现在确认单（仅作提示）
 */
export function resolveCheckInRows(
  routine: ISkincareRoutine,
  products: ISkincareProduct[],
): CheckInRow[] {
  const map = new Map<string, CheckInRow>();
  for (const { step, product } of resolveRoutineSteps(routine, products)) {
    if (!product) continue;
    const add = step.defaultAmount ?? DEFAULT_STEP_AMOUNT;
    const existing = map.get(product.id);
    if (existing) {
      existing.amount = Math.min(100, existing.amount + add);
      existing.stepLabels.push(step.label);
    } else {
      map.set(product.id, {
        product,
        amount: Math.min(100, Math.max(1, add)),
        stepLabels: [step.label],
      });
    }
  }
  return Array.from(map.values());
}

/** 步骤类型通常对应的产品分类（用于绑定不一致时的轻提示） */
export const STEP_TYPE_CATEGORY_HINT: Partial<Record<RoutineStepType, ISkincareProduct['category'][]>> = {
  cleanser: ['cleanser'],
  toner: ['toner'],
  serum: ['serum'],
  ampoule: ['serum'],
  cream: ['cream'],
  sunscreen: ['sunscreen'],
  mask: ['mask'],
  body_care: ['body_care'],
};
