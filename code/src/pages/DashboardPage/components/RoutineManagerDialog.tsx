// 管理方案弹层（FR-A）：左侧方案列表（预设置顶）+ 右侧步骤编辑器
import { useEffect, useState } from 'react';
import { ChevronDown, ChevronUp, Plus, Trash2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  ROUTINE_EMOJIS,
  ROUTINE_STEP_LABELS,
  type IRoutineStep,
  type ISkincareRoutine,
  type RoutineStepType,
} from '@/data/routines';
import type { ISkincareProduct } from '@/data/products';
import { CATEGORY_LABELS } from '@/lib/constants';
import { STEP_TYPE_CATEGORY_HINT } from '@/lib/routine-match';

/** 编辑草稿（id 为 null 表示新建中） */
interface RoutineDraft {
  id: string | null;
  name: string;
  icon: string;
  steps: IRoutineStep[];
}

export interface RoutinePayload {
  name: string;
  icon: string;
  steps: IRoutineStep[];
}

interface RoutineManagerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  allRoutines: ISkincareRoutine[];
  products: ISkincareProduct[];
  /** 从方案卡"编辑"进入时定位的方案 */
  initialSelectedId?: string | null;
  onCreate: (payload: RoutinePayload) => ISkincareRoutine;
  onUpdate: (id: string, payload: RoutinePayload) => void;
  onCopyPreset: (routine: ISkincareRoutine) => ISkincareRoutine;
}

const blankDraft = (): RoutineDraft => ({
  id: null,
  name: '',
  icon: '🧴',
  steps: [{ type: 'cleanser', label: '洁面', defaultAmount: 5 }],
});

export default function RoutineManagerDialog({
  open,
  onOpenChange,
  allRoutines,
  products,
  initialSelectedId,
  onCreate,
  onUpdate,
  onCopyPreset,
}: RoutineManagerDialogProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draft, setDraft] = useState<RoutineDraft | null>(null);

  const syncDraft = (id: string | null) => {
    const routine = id ? allRoutines.find((r) => r.id === id) : undefined;
    if (routine && !routine.isPreset) {
      setDraft({
        id: routine.id,
        name: routine.name,
        icon: routine.icon,
        steps: JSON.parse(JSON.stringify(routine.steps)),
      });
    } else {
      // 预设方案 → 只读视图；未选中 → 空态
      setDraft(null);
    }
  };

  // 打开时定位：优先外部传入 id，否则第一个方案
  useEffect(() => {
    if (!open) return;
    const id = initialSelectedId ?? allRoutines[0]?.id ?? null;
    setSelectedId(id);
    syncDraft(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initialSelectedId]);

  const select = (id: string) => {
    setSelectedId(id);
    syncDraft(id);
  };

  const startCreate = () => {
    setSelectedId(null);
    setDraft(blankDraft());
  };

  const selected = allRoutines.find((r) => r.id === selectedId) ?? null;

  const updateStep = (idx: number, patch: Partial<IRoutineStep>) => {
    setDraft((d) =>
      d ? { ...d, steps: d.steps.map((s, i) => (i === idx ? { ...s, ...patch } : s)) } : d,
    );
  };

  const moveStep = (idx: number, dir: -1 | 1) => {
    setDraft((d) => {
      if (!d) return d;
      const next = [...d.steps];
      const target = idx + dir;
      if (target < 0 || target >= next.length) return d;
      [next[idx], next[target]] = [next[target], next[idx]];
      return { ...d, steps: next };
    });
  };

  const removeStep = (idx: number) => {
    setDraft((d) => (d ? { ...d, steps: d.steps.filter((_, i) => i !== idx) } : d));
  };

  const addStep = () => {
    setDraft((d) =>
      d
        ? {
            ...d,
            steps: [...d.steps, { type: 'toner', label: '爽肤水', defaultAmount: 5 }],
          }
        : d,
    );
  };

  const stepAmount = (idx: number, delta: number) => {
    setDraft((d) =>
      d
        ? {
            ...d,
            steps: d.steps.map((s, i) =>
              i === idx
                ? { ...s, defaultAmount: Math.max(1, Math.min(100, (s.defaultAmount ?? 5) + delta)) }
                : s,
            ),
          }
        : d,
    );
  };

  const handleSave = () => {
    if (!draft || !draft.name.trim()) return;
    const payload: RoutinePayload = { name: draft.name.trim(), icon: draft.icon, steps: draft.steps };
    if (draft.id) {
      onUpdate(draft.id, payload);
    } else {
      const created = onCreate(payload);
      setSelectedId(created.id);
      setDraft({ ...draft, id: created.id });
    }
  };

  /** 步骤类型与绑定产品分类不一致 → 仅提示不阻断（FR-A1） */
  const categoryMismatch = (step: IRoutineStep) => {
    if (!step.productId) return false;
    const product = products.find((p) => p.id === step.productId);
    const hint = STEP_TYPE_CATEGORY_HINT[step.type];
    return !!product && !!hint && !hint.includes(product.category);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>管理方案</DialogTitle>
          <DialogDescription>
            预设方案不可修改，可复制后编辑；自定义方案可自由调整步骤与绑定产品
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 sm:grid-cols-[190px_1fr] gap-4 max-h-[60vh]">
          {/* 左：方案列表 */}
          <div className="flex flex-col gap-1 overflow-y-auto sm:border-r sm:border-border sm:pr-3">
            {allRoutines.map((r) => (
              <button
                key={r.id}
                onClick={() => select(r.id)}
                className={`flex items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs transition-colors hover:bg-accent/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                  selectedId === r.id ? 'bg-accent text-accent-foreground' : ''
                }`}
              >
                <span className="text-sm leading-none">{r.icon}</span>
                <span className="flex-1 truncate">{r.name}</span>
                {r.isPreset && (
                  <Badge variant="secondary" className="text-[9px] px-1 py-0 shrink-0">
                    系统
                  </Badge>
                )}
              </button>
            ))}
            <Button variant="outline" size="sm" className="mt-2 w-full" onClick={startCreate}>
              <Plus className="size-3.5" />
              新建方案
            </Button>
          </div>

          {/* 右：编辑器 / 只读视图 */}
          <div className="overflow-y-auto pr-1">
            {/* 预设只读视图 */}
            {selected?.isPreset && !draft && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <span className="text-xl leading-none">{selected.icon}</span>
                  <h4 className="text-sm font-semibold">{selected.name}</h4>
                  <Badge variant="secondary" className="text-[9px] px-1.5 py-0">
                    系统
                  </Badge>
                </div>
                <div className="rounded-md bg-accent px-3 py-2 text-xs text-accent-foreground">
                  预设方案不可直接修改，复制为自定义方案后即可编辑步骤与绑定产品。
                </div>
                <div className="space-y-1.5">
                  {selected.steps.map((s, i) => (
                    <div key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                      <span className="mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full bg-muted text-[9px] font-semibold text-foreground">
                        {i + 1}
                      </span>
                      <div>
                        <span className="font-medium text-foreground">{s.label}</span>
                        {s.defaultAmount != null && <span className="ml-1">默认 {s.defaultAmount}%</span>}
                        {s.note && <div className="text-[10px] italic">{s.note}</div>}
                      </div>
                    </div>
                  ))}
                </div>
                <Button
                  size="sm"
                  onClick={() => {
                    const copy = onCopyPreset(selected);
                    setSelectedId(copy.id);
                    syncDraft(copy.id);
                  }}
                >
                  复制为自定义方案
                </Button>
              </div>
            )}

            {/* 未选中 */}
            {!selected?.isPreset && !draft && (
              <div className="flex h-full min-h-[200px] items-center justify-center text-sm text-muted-foreground">
                选择左侧方案查看详情，或新建自定义方案
              </div>
            )}

            {/* 新建 / 编辑自定义 */}
            {draft && (
              <div className="space-y-3">
                <div className="flex items-start gap-2">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        size="icon"
                        className="size-9 shrink-0 text-lg"
                        title="选择图标"
                      >
                        {draft.icon}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-64 p-2" align="start">
                      <div className="grid grid-cols-8 gap-1">
                        {ROUTINE_EMOJIS.map((e) => (
                          <button
                            key={e}
                            type="button"
                            onClick={() => setDraft((d) => (d ? { ...d, icon: e } : d))}
                            className={`flex size-7 items-center justify-center rounded-md text-base transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                              draft.icon === e ? 'bg-accent ring-1 ring-primary' : ''
                            }`}
                          >
                            {e}
                          </button>
                        ))}
                      </div>
                    </PopoverContent>
                  </Popover>
                  <Input
                    value={draft.name}
                    maxLength={20}
                    placeholder="方案名称（必填，≤20字）"
                    onChange={(e) => setDraft((d) => (d ? { ...d, name: e.target.value } : d))}
                  />
                </div>

                {/* 步骤编辑器 */}
                <div className="space-y-2">
                  {draft.steps.map((step, idx) => {
                    const bound = step.productId
                      ? products.find((p) => p.id === step.productId)
                      : undefined;
                    return (
                      <div key={idx} className="rounded-lg border border-border p-2 space-y-2">
                        <div className="flex items-center gap-1.5">
                          <div className="flex flex-col">
                            <button
                              type="button"
                              disabled={idx === 0}
                              onClick={() => moveStep(idx, -1)}
                              className="flex h-3.5 w-5 items-center justify-center rounded-sm text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground disabled:opacity-30 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                              aria-label="上移"
                            >
                              <ChevronUp className="size-3" />
                            </button>
                            <button
                              type="button"
                              disabled={idx === draft.steps.length - 1}
                              onClick={() => moveStep(idx, 1)}
                              className="flex h-3.5 w-5 items-center justify-center rounded-sm text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground disabled:opacity-30 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                              aria-label="下移"
                            >
                              <ChevronDown className="size-3" />
                            </button>
                          </div>
                          <Select
                            value={step.type}
                            onValueChange={(v) =>
                              updateStep(idx, {
                                type: v as RoutineStepType,
                                label: ROUTINE_STEP_LABELS[v as RoutineStepType],
                              })
                            }
                          >
                            <SelectTrigger size="sm" className="w-[96px] shrink-0 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {(Object.entries(ROUTINE_STEP_LABELS) as [RoutineStepType, string][]).map(
                                ([value, label]) => (
                                  <SelectItem key={value} value={value} className="text-xs">
                                    {label}
                                  </SelectItem>
                                ),
                              )}
                            </SelectContent>
                          </Select>
                          <Select
                            value={step.productId ?? ''}
                            onValueChange={(v) => updateStep(idx, { productId: v || undefined })}
                          >
                            <SelectTrigger size="sm" className="flex-1 min-w-0 text-xs">
                              <SelectValue placeholder="不绑定产品" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="" className="text-xs">
                                不绑定产品
                              </SelectItem>
                              {Object.keys(CATEGORY_LABELS).map((cat) => {
                                const group = products.filter((p) => p.category === cat);
                                if (group.length === 0) return null;
                                return (
                                  <SelectGroup key={cat}>
                                    <SelectLabel>{CATEGORY_LABELS[cat]}</SelectLabel>
                                    {group.map((p) => (
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
                                  </SelectGroup>
                                );
                              })}
                            </SelectContent>
                          </Select>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-7 shrink-0 text-muted-foreground hover:text-destructive"
                            onClick={() => removeStep(idx)}
                            aria-label="删除步骤"
                          >
                            <Trash2 className="size-3.5" />
                          </Button>
                        </div>
                        <div className="flex items-center gap-2 pl-6">
                          <span className="text-[11px] text-muted-foreground shrink-0">默认用量</span>
                          <Button
                            variant="outline"
                            size="icon"
                            className="size-5"
                            onClick={() => stepAmount(idx, -5)}
                            aria-label="减少默认用量"
                          >
                            <span className="text-xs leading-none">−</span>
                          </Button>
                          <span className="w-9 text-center text-xs font-semibold tabular-nums">
                            {step.defaultAmount ?? 5}%
                          </span>
                          <Button
                            variant="outline"
                            size="icon"
                            className="size-5"
                            onClick={() => stepAmount(idx, 5)}
                            aria-label="增加默认用量"
                          >
                            <Plus className="size-3" />
                          </Button>
                          {bound && categoryMismatch(step) && (
                            <span className="text-[10px] text-warning">
                              步骤类型与「{CATEGORY_LABELS[bound.category]}」分类不一致，请确认
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                  {draft.steps.length === 0 && (
                    <div className="rounded-md border border-dashed border-border py-4 text-center text-xs text-muted-foreground">
                      还没有步骤，点击下方添加
                    </div>
                  )}
                  <Button variant="outline" size="sm" onClick={addStep}>
                    <Plus className="size-3.5" />
                    添加步骤
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="items-center">
          {draft && (
            <>
              <span className="mr-auto text-[11px] text-muted-foreground sm:mr-auto">
                {draft.id ? '修改将立即保存到自定义方案' : '保存后可在概览页直接打卡'}
              </span>
              <Button variant="ghost" size="sm" onClick={() => syncDraft(selectedId)}>
                取消
              </Button>
              <Button size="sm" disabled={!draft.name.trim()} onClick={handleSave}>
                {draft.id ? '保存修改' : '创建方案'}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
