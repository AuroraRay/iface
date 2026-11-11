// 方案卡片：预设/自定义展示 + 打卡/复制/编辑/删除操作（FR-A2/A3、FR-B 入口、FR-D3 今日计划徽标）
import { useMemo, useState } from 'react';
import { Copy, Pencil, Trash2, ClipboardCheck, AlertCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { ROUTINE_STEP_LABELS, type ISkincareRoutine } from '@/data/routines';
import type { ISkincareProduct } from '@/data/products';
import { resolveRoutineSteps, resolveCheckInRows } from '@/lib/routine-match';

interface RoutineCardProps {
  routine: ISkincareRoutine;
  products: ISkincareProduct[];
  /** 当日命中周排程（FR-D3） */
  scheduledToday: boolean;
  onCheckIn: () => void;
  onCopy: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

export default function RoutineCard({
  routine,
  products,
  scheduledToday,
  onCheckIn,
  onCopy,
  onEdit,
  onDelete,
}: RoutineCardProps) {
  const [deleteOpen, setDeleteOpen] = useState(false);

  const resolved = useMemo(() => resolveRoutineSteps(routine, products), [routine, products]);
  const checkInRows = useMemo(() => resolveCheckInRows(routine, products), [routine, products]);

  const matchedCount = resolved.filter((r) => r.matched).length;
  const coverage = routine.steps.length
    ? Math.round((matchedCount / routine.steps.length) * 100)
    : 0;
  const coverageColor =
    coverage >= 80 ? 'bg-[#b8d4c8]' : coverage >= 40 ? 'bg-[#e8c59d]' : 'bg-[#d98c8c]';

  // FR-A 边界：方案内无可打卡产品（全部用完 / 无绑定无匹配）时打卡按钮置灰
  const canCheckIn = checkInRows.some((row) => row.product.quantity > 0);
  const disabledReason =
    checkInRows.length === 0 ? '方案内暂无可打卡的产品' : '方案内产品已用完';

  return (
    <div className="rounded-xl border border-border bg-card p-4 hover:shadow-sm transition-shadow">
      {/* 标题 + 操作 */}
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-lg leading-none">{routine.icon}</span>
            <h3 className="font-semibold text-sm">{routine.name}</h3>
            {routine.isPreset && (
              <Badge variant="secondary" className="text-[9px] px-1.5 py-0">
                系统
              </Badge>
            )}
            {scheduledToday && (
              <Badge className="text-[9px] px-1.5 py-0 bg-primary text-primary-foreground">
                今日计划
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-1.5 mt-1 flex-wrap">
            {routine.efficacy.map((e) => (
              <Badge key={e} variant="outline" className="text-[10px] px-1.5 py-0">
                {e}
              </Badge>
            ))}
            {routine.time !== 'both' && (
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                {routine.time === 'morning' ? '晨间' : routine.time === 'evening' ? '夜间' : '周护理'}
              </Badge>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {routine.isPreset ? (
            <Button
              variant="ghost"
              size="icon"
              className="size-7"
              title="复制为自定义方案"
              aria-label="复制为自定义方案"
              onClick={onCopy}
            >
              <Copy className="size-3.5" />
            </Button>
          ) : (
            <>
              <Button
                variant="ghost"
                size="icon"
                className="size-7"
                title="编辑方案"
                aria-label="编辑方案"
                onClick={onEdit}
              >
                <Pencil className="size-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="size-7 text-destructive hover:text-destructive"
                title="删除方案"
                aria-label="删除方案"
                onClick={() => setDeleteOpen(true)}
              >
                <Trash2 className="size-3.5" />
              </Button>
            </>
          )}
          <span title={canCheckIn ? undefined : disabledReason}>
            <Button size="sm" className="h-7 px-2.5 text-xs" disabled={!canCheckIn} onClick={onCheckIn}>
              <ClipboardCheck className="size-3.5" />
              打卡
            </Button>
          </span>
        </div>
      </div>

      {/* 匹配度 */}
      <div className="flex items-center justify-between text-[10px] text-muted-foreground mb-1">
        <span>{routine.isPreset ? '匹配度' : '产品绑定'}</span>
        <span className="tabular-nums">{coverage}%</span>
      </div>
      <div className="h-1.5 bg-border/40 rounded-full overflow-hidden mb-3">
        <div
          className={`h-full ${coverageColor} rounded-full transition-all`}
          style={{ width: `${coverage}%` }}
        />
      </div>

      {/* 步骤列表 */}
      <div className="space-y-2">
        {resolved.map(({ step, product, matched }, idx) => (
          <div key={idx} className="flex items-start gap-2 text-xs">
            <div
              className={`size-5 shrink-0 rounded-full flex items-center justify-center text-[10px] font-semibold ${
                matched
                  ? 'bg-primary/10 text-primary'
                  : 'bg-muted text-muted-foreground border border-dashed border-border'
              }`}
            >
              {idx + 1}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1">
                <span className="font-medium">{ROUTINE_STEP_LABELS[step.type]}</span>
                {step.defaultAmount != null && (
                  <span className="text-[10px] text-muted-foreground tabular-nums">
                    默认 {step.defaultAmount}%
                  </span>
                )}
              </div>
              {product ? (
                <div className="text-muted-foreground mt-0.5 truncate">
                  {product.name}
                  {product.quantity < 100 && (
                    <span className="ml-1 text-[10px]">（剩 {product.quantity}%）</span>
                  )}
                </div>
              ) : step.productId ? (
                <div className="text-[11px] text-destructive/80 mt-0.5 flex items-center gap-1">
                  <AlertCircle className="size-3" />
                  产品已删除，未绑定
                </div>
              ) : routine.isPreset ? (
                <div className="text-[11px] text-destructive/80 mt-0.5 flex items-center gap-1">
                  <AlertCircle className="size-3" />
                  暂无匹配产品
                </div>
              ) : (
                <div className="text-[11px] text-muted-foreground mt-0.5">未绑定产品 · 打卡时仅提示</div>
              )}
              {step.note && (
                <div className="text-[10px] text-muted-foreground mt-0.5 italic">{step.note}</div>
              )}
            </div>
          </div>
        ))}
        {routine.steps.length === 0 && (
          <div className="text-[11px] text-muted-foreground py-2 text-center">还没有步骤，去编辑方案添加</div>
        )}
      </div>

      {/* 删除二次确认（FR-A3：明示不影响产品与历史打卡） */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>删除「{routine.name}」？</AlertDialogTitle>
            <AlertDialogDescription>
              删除后方案卡将消失，但不会删除产品与历史打卡记录，日历中仍可查看过往打卡明细。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                setDeleteOpen(false);
                onDelete();
              }}
            >
              删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
