// 新建 / 编辑使用计划弹层（FR-D1）：月份 + 目标条目（≥1）+ 周排程（可选）
import { useEffect, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { IPlan, IPlanGoal, IPlanSchedule, PlanGoalType } from '@/data/plans';
import { effBaselineKey, prodBaselineKey } from '@/data/plans';
import type { ISkincareProduct } from '@/data/products';
import type { ISkincareRoutine } from '@/data/routines';
import { EFFICACY_OPTIONS } from '@/lib/constants';
import { toLocalMonthStr, WEEKDAY_LABELS } from '@/lib/date';

export interface PlanPayload {
  month: string;
  name?: string;
  goals: IPlanGoal[];
  schedules: IPlanSchedule[];
  baseline: Record<string, number>;
}

interface PlanFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** 编辑时传入，新建为 null */
  initialPlan: IPlan | null;
  products: ISkincareProduct[];
  allRoutines: ISkincareRoutine[];
  onSubmit: (payload: PlanPayload) => void;
}

const GOAL_TYPE_LABELS: Record<PlanGoalType, string> = {
  efficacy: '功效方向',
  product: '指定产品',
  routine: '指定方案',
};

interface GoalDraft extends IPlanGoal {}

export default function PlanFormDialog({
  open,
  onOpenChange,
  initialPlan,
  products,
  allRoutines,
  onSubmit,
}: PlanFormDialogProps) {
  const [month, setMonth] = useState('');
  const [name, setName] = useState('');
  const [goals, setGoals] = useState<GoalDraft[]>([]);
  const [schedules, setSchedules] = useState<IPlanSchedule[]>([]);

  // 打开时按编辑/新建初始化
  useEffect(() => {
    if (!open) return;
    setMonth(initialPlan?.month ?? toLocalMonthStr(new Date()));
    setName(initialPlan?.name ?? '');
    setGoals(
      initialPlan?.goals.length
        ? JSON.parse(JSON.stringify(initialPlan.goals))
        : [{ type: 'efficacy', target: '', label: '' }],
    );
    setSchedules(initialPlan?.schedules ? JSON.parse(JSON.stringify(initialPlan.schedules)) : []);
  }, [open, initialPlan]);

  const updateGoal = (idx: number, patch: Partial<IPlanGoal>) => {
    setGoals((prev) => prev.map((g, i) => (i === idx ? { ...g, ...patch } : g)));
  };

  const changeGoalType = (idx: number, type: PlanGoalType) => {
    setGoals((prev) => prev.map((g, i) => (i === idx ? { type, target: '', label: '' } : g)));
  };

  /** 目标切换时自动生成展示文案 */
  const changeGoalTarget = (idx: number, target: string) => {
    const goal = goals[idx];
    let label = target;
    if (goal.type === 'product') {
      label = products.find((p) => p.id === target)?.name ?? target;
    } else if (goal.type === 'routine') {
      const r = allRoutines.find((x) => x.id === target);
      label = r ? `${r.icon} ${r.name}` : target;
    }
    updateGoal(idx, { target, label });
  };

  const toggleWeekday = (scheduleIdx: number, weekday: number) => {
    setSchedules((prev) =>
      prev.map((s, i) => {
        if (i !== scheduleIdx) return s;
        const weekdays = s.weekdays.includes(weekday)
          ? s.weekdays.filter((w) => w !== weekday)
          : [...s.weekdays, weekday].sort((a, b) => a - b);
        return { ...s, weekdays };
      }),
    );
  };

  const canSubmit =
    month.trim() !== '' &&
    goals.length > 0 &&
    goals.every((g) => g.target !== '');

  /** 计算目标基线：创建时各目标产品的剩余量快照（FR-D2 进度分母） */
  const computeBaseline = (): Record<string, number> => {
    const baseline: Record<string, number> = {};
    for (const g of goals) {
      if (g.type === 'efficacy') {
        baseline[effBaselineKey(g.target)] = products
          .filter((p) => p.efficacies?.includes(g.target))
          .reduce((sum, p) => sum + (p.quantity || 0), 0);
      } else if (g.type === 'product') {
        const p = products.find((pp) => pp.id === g.target);
        baseline[prodBaselineKey(g.target)] = p ? p.quantity || 0 : 0;
      }
    }
    return baseline;
  };

  const handleSubmit = () => {
    if (!canSubmit) return;
    onSubmit({
      month: month.trim(),
      name: name.trim() || undefined,
      goals: goals.map((g) => ({ ...g })),
      schedules: schedules.filter((s) => s.routineId && s.weekdays.length > 0),
      baseline: computeBaseline(),
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{initialPlan ? '编辑计划' : '新建计划'}</DialogTitle>
          <DialogDescription>
            设定月度目标与周排程，进度将随打卡与使用记录自动刷新
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* 月份 + 名称 */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">计划月份</label>
              <Input type="month" value={month} onChange={(e) => setMonth(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">计划名称（可选）</label>
              <Input
                value={name}
                maxLength={20}
                placeholder="如：美白冲刺计划"
                onChange={(e) => setName(e.target.value)}
              />
            </div>
          </div>

          {/* 目标条目 */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-muted-foreground">目标条目（至少 1 条）</label>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs"
                onClick={() => setGoals((prev) => [...prev, { type: 'efficacy', target: '', label: '' }])}
              >
                <Plus className="size-3" />
                添加目标
              </Button>
            </div>
            {goals.map((goal, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <Select
                  value={goal.type}
                  onValueChange={(v) => changeGoalType(idx, v as PlanGoalType)}
                >
                  <SelectTrigger size="sm" className="w-[96px] shrink-0 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.entries(GOAL_TYPE_LABELS) as [PlanGoalType, string][]).map(
                      ([value, label]) => (
                        <SelectItem key={value} value={value} className="text-xs">
                          {label}
                        </SelectItem>
                      ),
                    )}
                  </SelectContent>
                </Select>
                <Select
                  value={goal.target}
                  onValueChange={(v) => changeGoalTarget(idx, v)}
                >
                  <SelectTrigger size="sm" className="flex-1 min-w-0 text-xs">
                    <SelectValue placeholder={goal.type === 'efficacy' ? '选择功效' : goal.type === 'product' ? '选择产品' : '选择方案'} />
                  </SelectTrigger>
                  <SelectContent>
                    {goal.type === 'efficacy' &&
                      EFFICACY_OPTIONS.map((e) => (
                        <SelectItem key={e} value={e} className="text-xs">
                          {e}
                        </SelectItem>
                      ))}
                    {goal.type === 'product' &&
                      products.map((p) => (
                        <SelectItem
                          key={p.id}
                          value={p.id}
                          disabled={p.status === 'used_up'}
                          className="text-xs"
                        >
                          {p.name}
                          {p.status === 'used_up' ? '（已用完）' : `（剩 ${p.quantity}%）`}
                        </SelectItem>
                      ))}
                    {goal.type === 'routine' &&
                      allRoutines.map((r) => (
                        <SelectItem key={r.id} value={r.id} className="text-xs">
                          {r.icon} {r.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-7 shrink-0 text-muted-foreground hover:text-destructive"
                  onClick={() => setGoals((prev) => prev.filter((_, i) => i !== idx))}
                  aria-label="删除目标"
                >
                  <Trash2 className="size-3.5" />
                </Button>
              </div>
            ))}
          </div>

          {/* 周排程 */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-muted-foreground">周排程（可选）</label>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs"
                disabled={schedules.length >= allRoutines.length}
                onClick={() =>
                  setSchedules((prev) =>
                    prev.some((s) => !s.routineId)
                      ? prev
                      : [...prev, { routineId: '', weekdays: [1, 3, 5] }],
                  )
                }
              >
                <Plus className="size-3" />
                添加排程
              </Button>
            </div>
            {schedules.length === 0 && (
              <p className="text-[11px] text-muted-foreground">
                排程用于打卡提醒口径与进度统计，不会自动执行扣减
              </p>
            )}
            {schedules.map((schedule, idx) => (
              <div key={idx} className="rounded-lg border border-border p-2 space-y-2">
                <div className="flex items-center gap-2">
                  <Select
                    value={schedule.routineId}
                    onValueChange={(v) =>
                      setSchedules((prev) =>
                        prev.map((s, i) => (i === idx ? { ...s, routineId: v } : s)),
                      )
                    }
                  >
                    <SelectTrigger size="sm" className="flex-1 min-w-0 text-xs">
                      <SelectValue placeholder="选择方案" />
                    </SelectTrigger>
                    <SelectContent>
                      {allRoutines.map((r) => (
                        <SelectItem key={r.id} value={r.id} className="text-xs">
                          {r.icon} {r.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-7 shrink-0 text-muted-foreground hover:text-destructive"
                    onClick={() => setSchedules((prev) => prev.filter((_, i) => i !== idx))}
                    aria-label="删除排程"
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </div>
                <div className="flex items-center gap-1">
                  {WEEKDAY_LABELS.map((label, i) => {
                    const weekday = i + 1;
                    const on = schedule.weekdays.includes(weekday);
                    return (
                      <button
                        key={weekday}
                        type="button"
                        onClick={() => toggleWeekday(idx, weekday)}
                        className={`min-w-7 rounded-full border px-2 py-0.5 text-[11px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                          on
                            ? 'border-primary bg-primary text-primary-foreground'
                            : 'border-border bg-card text-muted-foreground hover:bg-accent'
                        }`}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button size="sm" disabled={!canSubmit} onClick={handleSubmit}>
            {initialPlan ? '保存修改' : '创建计划'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
