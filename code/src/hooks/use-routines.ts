// EXPORTS: useRoutines
// 自定义护理方案 CRUD + 一键打卡/撤销（FR-A / FR-B）
import { useEffect, useMemo, useState } from 'react';
import { scopedStorage, logger } from '@lark-apaas/client-toolkit-lite';
import type { ICheckInRecord, ISkincareRoutine } from '@/data/routines';
import { MOCK_ROUTINES } from '@/data/routines';
import type { IUsageLog } from '@/data/products';
import type { useInventory } from './use-inventory';
import { addDays, toLocalDateStr, toLocalDateTimeStr } from '@/lib/date';

const CUSTOM_ROUTINES_KEY = '__global_skincare_custom_routines';
const CHECKINS_KEY = '__global_skincare_checkins';

type Inventory = ReturnType<typeof useInventory>;

function safeParseJson<T>(str: string | null): T | null {
  if (!str) return null;
  try {
    return JSON.parse(str) as T;
  } catch (err) {
    logger.warn('Failed to parse storage JSON:', String(err));
    return null;
  }
}

function normalizeRoutine(raw: unknown): ISkincareRoutine | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  if (typeof r.id !== 'string' || !Array.isArray(r.steps)) return null;
  return {
    id: r.id,
    name: typeof r.name === 'string' ? r.name : '未命名方案',
    efficacy: Array.isArray(r.efficacy) ? r.efficacy.filter((x): x is string => typeof x === 'string') : [],
    time: (['morning', 'evening', 'both', 'weekly'].includes(r.time as string) ? r.time : 'both') as ISkincareRoutine['time'],
    steps: r.steps as ISkincareRoutine['steps'],
    icon: typeof r.icon === 'string' ? r.icon : '🧴',
    description: typeof r.description === 'string' ? r.description : undefined,
    isPreset: false,
    createdAt: typeof r.createdAt === 'string' ? r.createdAt : undefined,
  };
}

function normalizeCheckIn(raw: unknown): ICheckInRecord | null {
  if (!raw || typeof raw !== 'object') return null;
  const c = raw as Record<string, unknown>;
  if (typeof c.id !== 'string' || typeof c.date !== 'string' || !Array.isArray(c.items)) return null;
  return {
    id: c.id,
    routineId: typeof c.routineId === 'string' ? c.routineId : '',
    routineName: typeof c.routineName === 'string' ? c.routineName : '已删除方案',
    routineIcon: typeof c.routineIcon === 'string' ? c.routineIcon : '🧴',
    date: c.date,
    items: c.items as ICheckInRecord['items'],
    createdAt: typeof c.createdAt === 'string' ? c.createdAt : c.date,
  };
}

/**
 * mock 打卡种子：过去 7 天内 4 条，关联预设方案与真实 mock 产品。
 * 同时在 usage logs 中追加等额使用记录，保持 R1 统计口径一致。
 */
function buildMockCheckIns(): ICheckInRecord[] {
  const today = new Date();
  const mk = (
    daysAgo: number,
    routineId: string,
    routineName: string,
    routineIcon: string,
    items: [productId: string, productName: string, amount: number][],
  ): ICheckInRecord => ({
    id: `ck_seed_${daysAgo}_${routineId}`,
    routineId,
    routineName,
    routineIcon,
    date: toLocalDateStr(addDays(today, -daysAgo)),
    items: items.map(([productId, productName, amount]) => ({ productId, productName, amount })),
    createdAt: `${toLocalDateStr(addDays(today, -daysAgo))} 21:30`,
  });

  return [
    mk(1, 'r_whitening', '美白提亮方案', '✨', [
      ['p1', 'AWESS微晶水（干敏抗老精华水）', 10],
      ['p4', 'INGS集光抗皱精华乳套装（滋润版）', 5],
      ['p6', 'AWESS双钻松露抗皱紧致面霜', 8],
    ]),
    mk(2, 'r_moisturize', '补水保湿方案', '💧', [
      ['p3', 'AWESS B5保湿精华露', 5],
      ['p6', 'AWESS双钻松露抗皱紧致面霜', 5],
    ]),
    mk(4, 'r_sunprotect', '日间防护方案', '☀️', [
      ['p5', '英格诺纯物理防晒隔离霜', 5],
    ]),
    mk(6, 'r_whitening', '美白提亮方案', '✨', [
      ['p1', 'AWESS微晶水（干敏抗老精华水）', 10],
      ['p6', 'AWESS双钻松露抗皱紧致面霜', 8],
    ]),
  ];
}

/** 打卡生成使用记录的统一备注（撤销时用于精确匹配，格式与手动记录一致，见 R1） */
export function checkInLogNote(routineName: string): string {
  return `打卡 · ${routineName}`;
}

/**
 * 护理方案 hooks：自定义方案 + 打卡记录
 * @param inv 同一组件内先调用 useInventory() 后传入（依赖其批量使用记录读写）
 */
export function useRoutines(inv: Inventory) {
  const [customRoutines, setCustomRoutines] = useState<ISkincareRoutine[]>([]);
  const [checkIns, setCheckIns] = useState<ICheckInRecord[]>([]);
  const [loaded, setLoaded] = useState(false);

  // 初始加载：自定义方案 + 打卡记录（首次为空时写入 mock 打卡种子）
  useEffect(() => {
    try {
      const rawCustom = safeParseJson<unknown[]>(scopedStorage.getItem(CUSTOM_ROUTINES_KEY));
      if (Array.isArray(rawCustom)) {
        setCustomRoutines(rawCustom.map(normalizeRoutine).filter((r): r is ISkincareRoutine => r !== null));
      }

      const rawCheckins = safeParseJson<unknown[]>(scopedStorage.getItem(CHECKINS_KEY));
      if (Array.isArray(rawCheckins)) {
        setCheckIns(rawCheckins.map(normalizeCheckIn).filter((c): c is ICheckInRecord => c !== null));
      } else {
        const seeded = buildMockCheckIns();
        setCheckIns(seeded);
        // 立即落盘，防止 StrictMode 双执行导致重复种子
        scopedStorage.setItem(CHECKINS_KEY, JSON.stringify(seeded));
        // 同步追加等额使用记录（不重复扣减数量，mock 产品初始量已体现）
        inv.addUsageLogs(
          seeded.flatMap((r) =>
            r.items.map((it) => ({
              productId: it.productId,
              amount: it.amount,
              usedAt: r.date,
              note: checkInLogNote(r.routineName),
            })),
          ),
        );
      }
    } catch (err) {
      logger.error('Failed to load routines/checkins:', String(err));
    } finally {
      setLoaded(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 持久化自定义方案
  useEffect(() => {
    if (!loaded) return;
    try {
      scopedStorage.setItem(CUSTOM_ROUTINES_KEY, JSON.stringify(customRoutines));
    } catch (err) {
      logger.error('Failed to persist custom routines:', String(err));
    }
  }, [customRoutines, loaded]);

  // 持久化打卡记录
  useEffect(() => {
    if (!loaded) return;
    try {
      scopedStorage.setItem(CHECKINS_KEY, JSON.stringify(checkIns));
    } catch (err) {
      logger.error('Failed to persist checkins:', String(err));
    }
  }, [checkIns, loaded]);

  /** 预设置顶 + 自定义按创建时间倒序（FR-A 布局规则） */
  const allRoutines = useMemo(() => {
    const custom = [...customRoutines].sort((a, b) =>
      (b.createdAt || '').localeCompare(a.createdAt || ''),
    );
    return [...MOCK_ROUTINES, ...custom];
  }, [customRoutines]);

  const addRoutine = (
    routine: Omit<ISkincareRoutine, 'id' | 'isPreset' | 'createdAt'>,
  ): ISkincareRoutine => {
    const next: ISkincareRoutine = {
      ...routine,
      id: `r_custom_${Date.now()}`,
      isPreset: false,
      createdAt: toLocalDateTimeStr(new Date()),
    };
    setCustomRoutines((prev) => [next, ...prev]);
    return next;
  };

  const updateRoutine = (id: string, patch: Partial<ISkincareRoutine>) => {
    setCustomRoutines((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  };

  /** 删除自定义方案（不删历史打卡与使用记录，见 R4）；预设方案不可删除 */
  const deleteRoutine = (id: string) => {
    setCustomRoutines((prev) => prev.filter((r) => r.id !== id));
  };

  /** 复制预设为自定义（FR-A2）：深拷贝全部步骤与默认用量，名称 = 预设名 + 副本 */
  const copyPreset = (preset: ISkincareRoutine): ISkincareRoutine => {
    const copy: ISkincareRoutine = {
      ...JSON.parse(JSON.stringify(preset)),
      id: `r_custom_${Date.now()}`,
      name: `${preset.name}副本`,
      isPreset: false,
      createdAt: toLocalDateTimeStr(new Date()),
    };
    setCustomRoutines((prev) => [copy, ...prev]);
    return copy;
  };

  /**
   * 一键打卡（FR-B3）：
   * 逐产品生成使用记录 + 扣减数量（扣至 0 自动标记已用完）+ 写打卡记录
   * 返回打卡记录供撤销使用
   */
  const checkIn = (
    routine: Pick<ISkincareRoutine, 'id' | 'name' | 'icon'>,
    items: { productId: string; productName: string; amount: number }[],
  ): ICheckInRecord => {
    const now = new Date();
    const record: ICheckInRecord = {
      id: `ck_${now.getTime()}`,
      routineId: routine.id,
      routineName: routine.name,
      routineIcon: routine.icon,
      date: toLocalDateStr(now),
      items: items.map((it) => ({ ...it })),
      createdAt: toLocalDateTimeStr(now),
    };
    setCheckIns((prev) => [record, ...prev]);
    inv.addUsageLogs(
      items.map((it) => ({
        productId: it.productId,
        amount: it.amount,
        usedAt: record.date,
        note: checkInLogNote(routine.name),
      })),
    );
    return record;
  };

  /** 撤销打卡（FR-B4 / R3）：删打卡记录及其全部使用记录 + 按明细恢复数量 */
  const undoCheckIn = (record: ICheckInRecord) => {
    const note = checkInLogNote(record.routineName);
    const removed: IUsageLog[] = [];
    const usedIds = new Set<string>();
    for (const item of record.items) {
      const candidates = inv.usageLogs.filter(
        (l) =>
          !usedIds.has(l.id) &&
          l.usedAt === record.date &&
          l.productId === item.productId &&
          l.amount === item.amount,
      );
      const target = candidates.find((l) => l.note === note) ?? candidates[0];
      if (target) {
        usedIds.add(target.id);
        removed.push(target);
      }
    }
    inv.removeUsageLogs(removed);
    setCheckIns((prev) => prev.filter((c) => c.id !== record.id));
  };

  return {
    customRoutines,
    allRoutines,
    checkIns,
    loaded,
    addRoutine,
    updateRoutine,
    deleteRoutine,
    copyPreset,
    checkIn,
    undoCheckIn,
  };
}
