// 使用计划区块（FR-D）：进行中计划卡（目标进度 + 排程命中率）+ 新建/编辑/归档 + 历史计划折叠区
import { useMemo, useState } from 'react';
import { CalendarCheck, ChevronDown, History, Pencil, Plus } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
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
import type { IPlan, IPlanGoal } from '@/data/plans';
import { effBaselineKey, prodBaselineKey } from '@/data/plans';
import type { ICheckInRecord, ISkincareRoutine } from '@/data/routines';
import type { IUsageLog } from '@/data/products';
import type { ISkincareProduct } from '@/data/products';
import { getDaysInMonth, toLocalDateStr, toLocalMonthStr, WEEKDAY_LABELS } from '@/lib/date';

/** 目标进度（FR-D2）：功效/产品 = 当月使用 ÷ baseline（≤100%）；方案 = 当月打卡次数 */
function computeGoalProgress(
  goal: IPlanGoal,
  plan: IPlan,
  products: ISkincareProduct[],
  usageLogs: IUsageLog[],
  checkIns: ICheckInRecord[],
): { pct: number | null; usage: number } {
  if (goal.type === 'routine') {
    const count = checkIns.filter(
      (c) => c.routineId === goal.target && c.date.startsWith(plan.month),
    ).length;
    return { pct: null, usage: count };
  }
  let usage = 0;
  let base = 0;
  if (goal.type === 'efficacy') {
    const idSet = new Set(
      products.filter((p) => p.efficacies?.includes(goal.target)).map((p) => p.id),
    );
    usage = usageLogs
      .filter((l) => l.usedAt.startsWith(plan.month) && idSet.has(l.productId))
      .reduce((sum, l) => sum + l.amount, 0);
    base = plan.baseline[effBaselineKey(goal.target)] ?? 0;
  } else {
    usage = usageLogs
      .filter((l) => l.usedAt.startsWith(plan.month) && l.productId === goal.target)
      .reduce((sum, l) => sum + l.amount, 0);
    base = plan.baseline[prodBaselineKey(goal.target)] ?? 0;
  }
  const pct = base > 0 ? Math.min(100, Math.round((usage / base) * 100)) : 0;
  return { pct, usage };
}

/** 排程命中率（FR-D4）：分母 = 本月已过排程日数（含今天） */
function computeScheduleHit(plan: IPlan, checkIns: ICheckInRecord[]): { hit: number; total: number } {
  const [y, m] = plan.month.split('-').map(Number);
  if (!y || !m) return { hit: 0, total: 0 };
  const daysInMonth = getDaysInMonth(y, m - 1);
  const monthStr = plan.month;
  // 已过天数：过去月 = 整月；当前月 = 截至今天；未来月 = 0
  const today = new Date();
  const todayMonth = toLocalMonthStr(today);
  const lastDay =
    plan.month < todayMonth ? daysInMonth : plan.month === todayMonth ? today.getDate() : 0;

  let hit = 0;
  let total = 0;
  for (let d = 1; d <= lastDay; d++) {
    const weekday = new Date(y, m - 1, d).getDay();
    const weekdayMon1 = weekday === 0 ? 7 : weekday;
    const dateStr = `${monthStr}-${String(d).padStart(2, '0')}`;
    for (const s of plan.schedules) {
      if (!s.weekdays.includes(weekdayMon1)) continue;
      total += 1;
      if (checkIns.some((c) => c.routineId === s.routineId && c.date === dateStr)) hit += 1;
    }
  }
  return { hit, total };
}

/** 星期数组 → "周一 / 周三 / 周五" */
function formatWeekdays(weekdays: number[]): string {
  return [...weekdays]
    .sort((a, b) => a - b)
    .map((w) => `周${WEEKDAY_LABELS[w - 1] ?? w}`)
    .join(' / ');
}

interface PlanCardProps {
  plan: IPlan;
  products: ISkincareProduct[];
  usageLogs: IUsageLog[];
  checkIns: ICheckInRecord[];
  allRoutines: ISkincareRoutine[];
  onEdit: () => void;
  onArchive: () => void;
}

function PlanCard({ plan, products, usageLogs, checkIns, allRoutines, onEdit, onArchive }: PlanCardProps) {
  const [archiveOpen, setArchiveOpen] = useState(false);
  const todayMonth = toLocalMonthStr(new Date());
  const isOutdated = plan.month < todayMonth;
  const todayWeekday = (() => {
    const d = new Date().getDay();
    return d === 0 ? 7 : d;
  })();

  const scheduleHit = useMemo(() => computeScheduleHit(plan, checkIns), [plan, checkIns]);
  const monthCheckinCount = useMemo(
    () => checkIns.filter((c) => c.date.startsWith(plan.month)).length,
    [checkIns, plan.month],
  );

  return (
    <div className="rounded-xl border border-border bg-card p-4 space-y-3 hover:shadow-sm transition-shadow">
      {/* 月份 + 状态 */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="font-semibold text-sm tabular-nums">
              {plan.month.replace('-', ' · ')}
            </span>
            {plan.name && <span className="font-semibold text-sm">{plan.name}</span>}
          </div>
          <div className="flex items-center gap-1.5 mt-1 flex-wrap">
            <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-accent text-accent-foreground border-transparent">
              进行中
            </Badge>
            {isOutdated && (
              <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-warning border-warning/40">
                已过期月度 · 建议归档
              </Badge>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <Button variant="ghost" size="icon" className="size-7" title="编辑计划" aria-label="编辑计划" onClick={onEdit}>
            <Pencil className="size-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="size-7 text-muted-foreground hover:text-destructive"
            title="归档计划"
            aria-label="归档计划"
            onClick={() => setArchiveOpen(true)}
          >
            <History className="size-3.5" />
          </Button>
        </div>
      </div>

      {/* 目标条目 + 进度 */}
      <div className="space-y-2">
        {plan.goals.length === 0 && (
          <p className="text-[11px] text-muted-foreground">未设置目标，打卡后将在此显示进度</p>
        )}
        {plan.goals.map((goal, idx) => {
          const { pct, usage } = computeGoalProgress(goal, plan, products, usageLogs, checkIns);
          return (
            <div key={idx}>
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="truncate">
                  <span className="text-muted-foreground mr-1">
                    {goal.type === 'efficacy' ? '功效' : goal.type === 'product' ? '产品' : '方案'}·
                  </span>
                  {goal.label || goal.target}
                </span>
                <span className="shrink-0 tabular-nums text-muted-foreground">
                  {pct === null ? `已打卡 ${usage} 次` : `${pct}%`}
                </span>
              </div>
              {pct !== null && <Progress value={pct} className="h-1.5" />}
            </div>
          );
        })}
      </div>

      {/* 排程 */}
      <div className="border-t border-border/60 pt-2 space-y-1">
        <div className="flex items-center justify-between text-[11px] text-muted-foreground">
          <span>排程命中 {scheduleHit.hit} / {scheduleHit.total} 天</span>
          <span className="tabular-nums">本月已打卡 {monthCheckinCount} 次</span>
        </div>
        {plan.schedules.length === 0 ? (
          <p className="text-[11px] text-muted-foreground">未设置周排程</p>
        ) : (
          plan.schedules.map((s, idx) => {
            const routine = allRoutines.find((r) => r.id === s.routineId);
            const hitToday =
              plan.month === todayMonth && s.weekdays.includes(todayWeekday);
            return (
              <div key={idx} className="flex items-center gap-1.5 text-xs">
                {hitToday && (
                  <Badge className="text-[9px] px-1.5 py-0 bg-primary text-primary-foreground shrink-0">
                    今日计划
                  </Badge>
                )}
                <span className="truncate text-muted-foreground">
                  {routine ? `${routine.icon} ${routine.name}` : '已删除方案'} · {formatWeekdays(s.weekdays)}
                </span>
              </div>
            );
          })
        )}
      </div>

      {/* 归档确认（FR-D5） */}
      <AlertDialog open={archiveOpen} onOpenChange={setArchiveOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>归档「{plan.name || plan.month}」？</AlertDialogTitle>
            <AlertDialogDescription>
              归档后计划转为只读并移入历史计划区，进度快照保留，不可再编辑。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setArchiveOpen(false);
                onArchive();
              }}
            >
              确认归档
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

interface PlanSectionProps {
  activePlans: IPlan[];
  archivedPlans: IPlan[];
  products: ISkincareProduct[];
  usageLogs: IUsageLog[];
  checkIns: ICheckInRecord[];
  allRoutines: ISkincareRoutine[];
  onNew: () => void;
  onEdit: (plan: IPlan) => void;
  onArchive: (plan: IPlan) => void;
}

export default function PlanSection({
  activePlans,
  archivedPlans,
  products,
  usageLogs,
  checkIns,
  allRoutines,
  onNew,
  onEdit,
  onArchive,
}: PlanSectionProps) {
  const [historyOpen, setHistoryOpen] = useState(false);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base flex items-center gap-2">
          <CalendarCheck className="size-4 text-primary" />
          使用计划
        </CardTitle>
        <Button size="sm" onClick={onNew}>
          <Plus className="size-3.5" />
          新建计划
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {activePlans.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border py-8 text-center text-sm text-muted-foreground">
            暂无进行中的计划，点击右上角"新建计划"设定本月目标
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {activePlans.map((plan) => (
              <PlanCard
                key={plan.id}
                plan={plan}
                products={products}
                usageLogs={usageLogs}
                checkIns={checkIns}
                allRoutines={allRoutines}
                onEdit={() => onEdit(plan)}
                onArchive={() => onArchive(plan)}
              />
            ))}
          </div>
        )}

        {/* 历史计划折叠区（FR-D5） */}
        {archivedPlans.length > 0 && (
          <Collapsible open={historyOpen} onOpenChange={setHistoryOpen}>
            <CollapsibleTrigger asChild>
              <button className="flex items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm">
                <ChevronDown className={`size-3.5 transition-transform ${historyOpen ? 'rotate-180' : ''}`} />
                历史计划（{archivedPlans.length}）
              </button>
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {archivedPlans.map((plan) => (
                  <div
                    key={plan.id}
                    className="rounded-lg border border-border/70 bg-background/60 p-3 space-y-1.5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold">
                        {plan.month} {plan.name}
                      </span>
                      <Badge variant="secondary" className="text-[9px] px-1.5 py-0">
                        已归档
                      </Badge>
                    </div>
                    {plan.goals.map((goal, idx) => {
                      const { pct, usage } = computeGoalProgress(goal, plan, products, usageLogs, checkIns);
                      return (
                        <div key={idx} className="flex items-center justify-between text-[11px] text-muted-foreground">
                          <span className="truncate">{goal.label || goal.target}</span>
                          <span className="tabular-nums shrink-0">
                            {pct === null ? `打卡 ${usage} 次` : `${pct}%`}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            </CollapsibleContent>
          </Collapsible>
        )}
      </CardContent>
    </Card>
  );
}
