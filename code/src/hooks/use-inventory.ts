import { useState, useEffect } from 'react';
import { scopedStorage } from '@lark-apaas/client-toolkit-lite';
import { logger } from '@lark-apaas/client-toolkit-lite';
import type { ISkincareProduct, IUsageLog } from '@/data/products';
import { MOCK_PRODUCTS, MOCK_USAGE_LOGS } from '@/data/products';

const PRODUCTS_KEY = '__global_skincare_products';
const USAGE_LOGS_KEY = '__global_skincare_usage_logs';
const SCHEMA_VERSION_KEY = '__global_skincare_schema_version';
const CURRENT_SCHEMA_VERSION = 6; // v6: 新增可多选的“主要成分”字段

function getDaysUntilExpiry(expiryDate: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const expiry = new Date(expiryDate);
  expiry.setHours(0, 0, 0, 0);
  return Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

/**
 * 状态计算（优先级从高到低）：
 * 1. 数量为 0 → 已用完
 * 2. 已过期 → 已过期
 * 3. 未开封 → 未开封全新
 * 4. 已开封 + 暂停使用 → 已开封暂停使用
 * 5. 开封但剩余 100% → 已开封未使用
 * 6. 开封且剩余 < 100% → 已开封使用中
 */
function computeStatus(product: ISkincareProduct): ISkincareProduct['status'] {
  if (product.quantity <= 0) return 'used_up';
  const days = getDaysUntilExpiry(product.expiryDate);
  if (days < 0) return 'expired';
  if (!product.isOpened) return 'unopened_sealed';
  if (product.isPaused) return 'opened_paused';
  if (product.quantity >= 100) return 'opened_unused';
  return 'opened_in_use';
}

// 字段兜底：旧版本数据缺少字段时补默认值，防止渲染崩溃
function normalizeProduct(raw: unknown): ISkincareProduct | null {
  if (!raw || typeof raw !== 'object') return null;
  const p = raw as Record<string, unknown>;
  const id = typeof p.id === 'string' ? p.id : `migrated_${Date.now()}`;
  const name = typeof p.name === 'string' ? p.name : '未命名产品';
  const category = (typeof p.category === 'string' ? p.category : 'other') as ISkincareProduct['category'];
  const volume = typeof p.volume === 'string' ? p.volume : '';
  const totalVolumeMl = typeof p.totalVolumeMl === 'number' ? p.totalVolumeMl : 0;
  const volumeUnit = (typeof p.volumeUnit === 'string' ? p.volumeUnit : 'ml') as ISkincareProduct['volumeUnit'];
  const purchaseCount = typeof p.purchaseCount === 'number' ? p.purchaseCount : 1;
  const quantity = typeof p.quantity === 'number' ? Math.max(0, Math.min(100, p.quantity)) : 100;
  const purchasePrice = typeof p.purchasePrice === 'number' ? p.purchasePrice : 0;
  const unitPrice = typeof p.unitPrice === 'number' ? p.unitPrice : 0;
  const purchaseDate = typeof p.purchaseDate === 'string' ? p.purchaseDate : '2026-10-25';
  const openDate = typeof p.openDate === 'string' ? p.openDate : purchaseDate;
  const expiryDate = typeof p.expiryDate === 'string' ? p.expiryDate : '2029-10-25';
  const purpose = typeof p.purpose === 'string' ? p.purpose : undefined;
  const efficacies = Array.isArray(p.efficacies)
    ? p.efficacies.filter((x): x is string => typeof x === 'string')
    : undefined;
  const ingredients = Array.isArray(p.ingredients)
    ? p.ingredients.filter((x): x is string => typeof x === 'string')
    : undefined;
  const note = typeof p.note === 'string' ? p.note : undefined;
  const isGift = typeof p.isGift === 'boolean' ? p.isGift : false;
  // isOpened：迁移旧数据。v2 旧版 status='normal' 且 quantity<100 → 默认已开封；否则默认未开封
  const isOpened =
    typeof p.isOpened === 'boolean'
      ? p.isOpened
      : (p.status === 'normal' && typeof p.quantity === 'number' && p.quantity < 100) ||
        p.status === 'expiring_soon';
  // isPaused：迁移旧数据。v3 之前没有暂停状态，默认 false
  const isPaused = typeof p.isPaused === 'boolean' ? p.isPaused : false;
  const source = (typeof p.source === 'string' ? p.source : 'user') as 'mock' | 'user';

  const product: ISkincareProduct = {
    id,
    name,
    brand: typeof p.brand === 'string' ? p.brand : undefined,
    category,
    volume,
    totalVolumeMl,
    volumeUnit,
    purchaseCount,
    quantity,
    purchasePrice,
    unitPrice,
    purchaseDate,
    openDate,
    expiryDate,
    purpose,
    efficacies,
    ingredients,
    note,
    isGift,
    isOpened,
    isPaused,
    status: 'unopened_sealed', // 占位，后面 computeStatus 重算
    source,
  };
  product.status = computeStatus(product);
  return product;
}

function normalizeUsageLog(raw: unknown): IUsageLog | null {
  if (!raw || typeof raw !== 'object') return null;
  const l = raw as Record<string, unknown>;
  const id = typeof l.id === 'string' ? l.id : `u_migrated_${Date.now()}`;
  const productId = typeof l.productId === 'string' ? l.productId : '';
  const amount = typeof l.amount === 'number' ? l.amount : 0;
  const usedAt = typeof l.usedAt === 'string' ? l.usedAt : new Date().toISOString().slice(0, 10);
  const note = typeof l.note === 'string' ? l.note : undefined;
  return { id, productId, amount, usedAt, note };
}

function safeParseJson<T>(str: string | null): T | null {
  if (!str) return null;
  try {
    return JSON.parse(str) as T;
  } catch (err) {
    logger.warn('Failed to parse storage JSON:', String(err));
    return null;
  }
}

export function useInventory() {
  const [products, setProducts] = useState<ISkincareProduct[]>([]);
  const [usageLogs, setUsageLogs] = useState<IUsageLog[]>([]);
  const [loaded, setLoaded] = useState(false);

  // 初始加载：带版本校验 + 数据迁移 + 兜底
  useEffect(() => {
    try {
      const storedVersion = scopedStorage.getItem(SCHEMA_VERSION_KEY);
      const version = storedVersion ? Number(storedVersion) || 0 : 0;

      // 版本不匹配 → 重置为最新 mock 数据（数据结构升级时刷新）
      const shouldReset = version !== CURRENT_SCHEMA_VERSION;

      let loadedProducts: ISkincareProduct[] = [];
      let loadedLogs: IUsageLog[] = [];

      if (shouldReset) {
        loadedProducts = MOCK_PRODUCTS.map((p) => ({ ...p, status: computeStatus(p) }));
        loadedLogs = MOCK_USAGE_LOGS;
        logger.info(`Inventory schema v${version} → v${CURRENT_SCHEMA_VERSION}, reset to mock data`);
      } else {
        const rawProducts = safeParseJson<unknown[]>(scopedStorage.getItem(PRODUCTS_KEY));
        if (Array.isArray(rawProducts)) {
          const normalized = rawProducts
            .map(normalizeProduct)
            .filter((p): p is ISkincareProduct => p !== null);
          loadedProducts = normalized;
        } else {
          loadedProducts = MOCK_PRODUCTS.map((p) => ({ ...p, status: computeStatus(p) }));
        }

        const rawLogs = safeParseJson<unknown[]>(scopedStorage.getItem(USAGE_LOGS_KEY));
        if (Array.isArray(rawLogs)) {
          loadedLogs = rawLogs
            .map(normalizeUsageLog)
            .filter((l): l is IUsageLog => l !== null);
        } else {
          loadedLogs = MOCK_USAGE_LOGS;
        }
      }

      setProducts(loadedProducts);
      setUsageLogs(loadedLogs);
      scopedStorage.setItem(SCHEMA_VERSION_KEY, String(CURRENT_SCHEMA_VERSION));
    } catch (err) {
      logger.error('Failed to load inventory:', String(err));
      // 兜底：任何异常都回落到 mock，不白屏
      setProducts(MOCK_PRODUCTS.map((p) => ({ ...p, status: computeStatus(p) })));
      setUsageLogs(MOCK_USAGE_LOGS);
    } finally {
      setLoaded(true);
    }
  }, []);

  // 持久化 products
  useEffect(() => {
    if (!loaded) return;
    try {
      scopedStorage.setItem(PRODUCTS_KEY, JSON.stringify(products));
    } catch (err) {
      logger.error('Failed to persist products:', String(err));
    }
  }, [products, loaded]);

  // 持久化 usageLogs
  useEffect(() => {
    if (!loaded) return;
    try {
      scopedStorage.setItem(USAGE_LOGS_KEY, JSON.stringify(usageLogs));
    } catch (err) {
      logger.error('Failed to persist usageLogs:', String(err));
    }
  }, [usageLogs, loaded]);

  const addProduct = (product: Omit<ISkincareProduct, 'id' | 'status' | 'source'>) => {
    const newProduct: ISkincareProduct = {
      ...product,
      id: `p_${Date.now()}`,
      status: 'unopened_sealed',
      source: 'user',
    };
    newProduct.status = computeStatus(newProduct);
    setProducts((prev) => [...prev, newProduct]);
  };

  const batchAddProducts = (
    products: Omit<ISkincareProduct, 'id' | 'status' | 'source'>[],
  ): number => {
    if (!Array.isArray(products) || products.length === 0) return 0;
    const now = Date.now();
    const newProducts: ISkincareProduct[] = products
      .map((p, i) => {
        const normalized = normalizeProduct({ ...p, id: `batch_${now}_${i}` });
        if (!normalized) return null;
        return normalized;
      })
      .filter((p): p is ISkincareProduct => p !== null);
    setProducts((prev) => [...prev, ...newProducts]);
    return newProducts.length;
  };

  const updateProduct = (id: string, patch: Partial<ISkincareProduct>) => {
    setProducts((prev) =>
      prev.map((p) => {
        if (p.id !== id) return p;
        const updated = { ...p, ...patch };
        updated.status = computeStatus(updated);
        return updated;
      }),
    );
  };

  const deleteProduct = (id: string) => {
    setProducts((prev) => prev.filter((p) => p.id !== id));
    setUsageLogs((prev) => prev.filter((l) => l.productId !== id));
  };

  const addUsageLog = (log: Omit<IUsageLog, 'id'>) => {
    if (!log?.productId) return;
    const amount = Math.max(0, log.amount || 0);
    const newLog: IUsageLog = {
      ...log,
      id: `u_${Date.now()}`,
      amount,
    };
    setUsageLogs((prev) => [newLog, ...prev]);

    // 扣减数量 + 自动标记为已开封
    setProducts((prev) =>
      prev.map((p) => {
        if (p.id !== log.productId) return p;
        const newQty = Math.max(0, (p.quantity || 0) - amount);
        const updated = { ...p, quantity: newQty, isOpened: true };
        updated.status = computeStatus(updated);
        return updated;
      }),
    );
  };

  const getUsageLogsByProduct = (productId: string): IUsageLog[] => {
    try {
      return usageLogs
        .filter((l) => l && l.productId === productId)
        .sort((a, b) => (b.usedAt || '').localeCompare(a.usedAt || ''));
    } catch {
      return [];
    }
  };

  /**
   * 批量新增使用记录并逐产品聚合扣减（打卡场景使用，格式与手动记使用一致，见 R1）
   * 返回实际生成的记录（含 id）
   */
  const addUsageLogs = (logs: Omit<IUsageLog, 'id'>[]): IUsageLog[] => {
    if (!Array.isArray(logs) || logs.length === 0) return [];
    const base = Date.now();
    const newLogs: IUsageLog[] = logs.map((l, i) => ({
      ...l,
      id: `u_${base}_${i}`,
      amount: Math.max(0, l.amount || 0),
    }));
    setUsageLogs((prev) => [...newLogs, ...prev]);

    // 按产品聚合扣减数量，扣至 0 自动标记已用完（R2）
    const dec = new Map<string, number>();
    newLogs.forEach((l) => dec.set(l.productId, (dec.get(l.productId) || 0) + l.amount));
    setProducts((prev) =>
      prev.map((p) => {
        const d = dec.get(p.id);
        if (!d) return p;
        const updated = { ...p, quantity: Math.max(0, (p.quantity || 0) - d), isOpened: true };
        updated.status = computeStatus(updated);
        return updated;
      }),
    );
    return newLogs;
  };

  /**
   * 批量删除使用记录并按明细等额恢复数量（撤销打卡用，R2/R3）
   * 恢复后沿用现有状态机重算
   */
  const removeUsageLogs = (logs: IUsageLog[]) => {
    if (!Array.isArray(logs) || logs.length === 0) return;
    const ids = new Set(logs.map((l) => l.id));
    setUsageLogs((prev) => prev.filter((l) => !ids.has(l.id)));

    const inc = new Map<string, number>();
    logs.forEach((l) => inc.set(l.productId, (inc.get(l.productId) || 0) + l.amount));
    setProducts((prev) =>
      prev.map((p) => {
        const v = inc.get(p.id);
        if (!v) return p;
        const updated = { ...p, quantity: Math.min(100, (p.quantity || 0) + v) };
        updated.status = computeStatus(updated);
        return updated;
      }),
    );
  };

  return {
    products,
    usageLogs,
    loaded,
    addProduct,
    batchAddProducts,
    updateProduct,
    deleteProduct,
    addUsageLog,
    addUsageLogs,
    removeUsageLogs,
    getUsageLogsByProduct,
    getDaysUntilExpiry,
  };
}
