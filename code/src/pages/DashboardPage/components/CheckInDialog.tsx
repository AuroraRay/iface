// 打卡确认单（FR-B）：逐行勾选 + 5% 步进调量 + 合计，确认后由父级执行打卡
import { useEffect, useState } from 'react';
import { Minus, Plus, CalendarCheck } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { CATEGORY_LABELS } from '@/lib/constants';
import type { ISkincareRoutine } from '@/data/routines';
import type { ISkincareProduct } from '@/data/products';
import { resolveCheckInRows } from '@/lib/routine-match';
import { toLocalDateStr } from '@/lib/date';

interface CheckInRowState {
  productId: string;
  productName: string;
  categoryLabel: string;
  /** 当前剩余量 */
  qty: number;
  /** 本次用量（5% 步进，1~min(100, qty)） */
  amount: number;
  checked: boolean;
  /** 已用完 / 已过期行置灰且默认不勾选（FR-B1） */
  disabled: boolean;
}

interface CheckInDialogProps {
  routine: ISkincareRoutine | null;
  products: ISkincareProduct[];
  /** 该方案当日命中周排程（FR-D3 顶部提示） */
  scheduledToday: boolean;
  /** 确认打卡（父级执行 checkIn + toast 撤销） */
  onConfirm: (routine: ISkincareRoutine, items: { productId: string; productName: string; amount: number }[]) => void;
  onClose: () => void;
}

const clampAmount = (v: number, qty: number) => Math.max(1, Math.min(Math.min(100, qty), v));

export default function CheckInDialog({
  routine,
  products,
  scheduledToday,
  onConfirm,
  onClose,
}: CheckInDialogProps) {
  const [rows, setRows] = useState<CheckInRowState[]>([]);
  const [cappedId, setCappedId] = useState<string | null>(null);

  // 每次打开（方案变化）重建确认单行：默认用量预填，同产品多步骤已合并累加
  useEffect(() => {
    if (!routine) {
      setRows([]);
      return;
    }
    const next = resolveCheckInRows(routine, products).map((row) => {
      const qty = row.product.quantity || 0;
      // 已用完 / 已过期 → 置灰默认不勾选（FR-B1）
      const disabled = qty <= 0 || row.product.status === 'expired';
      return {
        productId: row.product.id,
        productName: row.product.name,
        categoryLabel: CATEGORY_LABELS[row.product.category] || row.product.category,
        qty,
        amount: disabled ? 0 : clampAmount(row.amount, qty),
        checked: !disabled,
        disabled,
      };
    });
    setRows(next);
    setCappedId(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [routine?.id]);

  const step = (productId: string, delta: number) => {
    setRows((prev) =>
      prev.map((r) => {
        if (r.productId !== productId || r.disabled) return r;
        const target = r.amount + delta;
        const next = clampAmount(target, r.qty);
        // 超出剩余量自动截断并高亮提示（FR-B2）
        if (delta > 0 && next < target) setCappedId(productId);
        else if (r.productId === productId) setCappedId(null);
        return { ...r, amount: next };
      }),
    );
  };

  const toggle = (productId: string, checked: boolean) => {
    setRows((prev) => prev.map((r) => (r.productId === productId ? { ...r, checked } : r)));
  };

  const selected = rows.filter((r) => r.checked && !r.disabled);
  const totalAmount = selected.reduce((s, r) => s + r.amount, 0);

  const handleConfirm = () => {
    if (!routine || selected.length === 0) return;
    onConfirm(
      routine,
      selected.map((r) => ({ productId: r.productId, productName: r.productName, amount: r.amount })),
    );
  };

  return (
    <Dialog open={!!routine} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span>{routine?.icon}</span>
            打卡 · {routine?.name}
          </DialogTitle>
          <DialogDescription>
            {toLocalDateStr()}（今天） · 取消勾选表示本次未使用，用量按 5% 调整
          </DialogDescription>
        </DialogHeader>

        {scheduledToday && (
          <div className="flex items-center gap-2 rounded-md bg-accent px-3 py-2 text-xs text-accent-foreground">
            <CalendarCheck className="size-3.5 shrink-0" />
            今日排程方案 · 按计划坚持打卡吧
          </div>
        )}

        <div className="max-h-[320px] overflow-y-auto -mx-1 px-1">
          {rows.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">
              方案内暂无可打卡的产品
            </div>
          ) : (
            rows.map((r) => (
              <div
                key={r.productId}
                className={`flex items-center gap-2.5 py-2.5 border-b border-border/60 last:border-b-0 ${
                  r.disabled ? 'opacity-45' : ''
                }`}
              >
                <Checkbox
                  checked={r.checked}
                  disabled={r.disabled}
                  onCheckedChange={(v) => toggle(r.productId, v === true)}
                  aria-label={`勾选 ${r.productName}`}
                />
                <div className="flex-1 min-w-0">
                  <div className="text-[13px] font-medium truncate">{r.productName}</div>
                  <div className="text-[11px] text-muted-foreground">
                    {r.categoryLabel} · 剩余 {r.qty}%
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Button
                    variant="outline"
                    size="icon"
                    className="size-6"
                    disabled={r.disabled}
                    onClick={() => step(r.productId, -5)}
                    aria-label="减少用量"
                  >
                    <Minus className="size-3" />
                  </Button>
                  <span
                    className={`w-11 text-center text-[13px] font-semibold tabular-nums ${
                      cappedId === r.productId ? 'text-warning' : ''
                    }`}
                  >
                    {r.amount}%
                  </span>
                  <Button
                    variant="outline"
                    size="icon"
                    className="size-6"
                    disabled={r.disabled}
                    onClick={() => step(r.productId, 5)}
                    aria-label="增加用量"
                  >
                    <Plus className="size-3" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>

        <DialogFooter className="flex items-center justify-between sm:justify-between gap-2">
          <span className="text-xs text-muted-foreground">
            本次将扣减 {selected.length} 件产品 · 合计 {totalAmount}%
          </span>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={onClose}>
              取消
            </Button>
            <Button size="sm" disabled={selected.length === 0} onClick={handleConfirm}>
              确认打卡
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
