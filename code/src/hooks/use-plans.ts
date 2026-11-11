// EXPORTS: usePlans
// 使用计划 CRUD + 归档（FR-D）
import { useEffect, useState } from 'react';
import { scopedStorage, logger } from '@lark-apaas/client-toolkit-lite';
import type { IPlan } from '@/data/plans';
import { MOCK_PLANS } from '@/data/plans';
import { toLocalDateTimeStr } from '@/lib/date';

const PLANS_KEY = '__global_skincare_plans';

function safeParseJson<T>(str: string | null): T | null {
  if (!str) return null;
  try {
    return JSON.parse(str) as T;
  } catch (err) {
    logger.warn('Failed to parse storage JSON:', String(err));
    return null;
  }
}

function normalizePlan(raw: unknown): IPlan | null {
  if (!raw || typeof raw !== 'object') return null;
  const p = raw as Record<string, unknown>;
  if (typeof p.id !== 'string' || typeof p.month !== 'string') return null;
  return {
    id: p.id,
    month: p.month,
    name: typeof p.name === 'string' ? p.name : undefined,
    goals: Array.isArray(p.goals) ? (p.goals as IPlan['goals']) : [],
    schedules: Array.isArray(p.schedules) ? (p.schedules as IPlan['schedules']) : [],
    status: p.status === 'archived' ? 'archived' : 'active',
    createdAt: typeof p.createdAt === 'string' ? p.createdAt : '',
    baseline: p.baseline && typeof p.baseline === 'object' ? (p.baseline as Record<string, number>) : {},
  };
}

/** 使用计划 hooks：首次加载为空时写入 mock 计划（美白冲刺计划） */
export function usePlans() {
  const [plans, setPlans] = useState<IPlan[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      const raw = safeParseJson<unknown[]>(scopedStorage.getItem(PLANS_KEY));
      if (Array.isArray(raw)) {
        setPlans(raw.map(normalizePlan).filter((p): p is IPlan => p !== null));
      } else {
        setPlans(MOCK_PLANS);
        // 立即落盘，防止 StrictMode 双执行导致重复种子
        scopedStorage.setItem(PLANS_KEY, JSON.stringify(MOCK_PLANS));
      }
    } catch (err) {
      logger.error('Failed to load plans:', String(err));
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    if (!loaded) return;
    try {
      scopedStorage.setItem(PLANS_KEY, JSON.stringify(plans));
    } catch (err) {
      logger.error('Failed to persist plans:', String(err));
    }
  }, [plans, loaded]);

  const addPlan = (plan: Omit<IPlan, 'id' | 'status' | 'createdAt'>): IPlan => {
    const next: IPlan = {
      ...plan,
      id: `plan_${Date.now()}`,
      status: 'active',
      createdAt: toLocalDateTimeStr(new Date()),
    };
    setPlans((prev) => [next, ...prev]);
    return next;
  };

  const updatePlan = (id: string, patch: Partial<IPlan>) => {
    setPlans((prev) => prev.map((p) => (p.id === id ? { ...p, ...patch } : p)));
  };

  /** 归档计划（FR-D5）：归档后只读，保留进度快照 */
  const archivePlan = (id: string) => {
    updatePlan(id, { status: 'archived' });
  };

  return {
    plans,
    activePlans: plans.filter((p) => p.status === 'active'),
    archivedPlans: plans.filter((p) => p.status === 'archived'),
    loaded,
    addPlan,
    updatePlan,
    archivePlan,
  };
}
