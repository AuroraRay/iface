// 使用日历完整页（FR-C2 / FR-C3）：整月视图 + 月度统计条 + 当日打卡明细与撤销
import { useMemo, useState } from 'react';
import { CalendarDays, ChevronLeft, ChevronRight, Undo2 } from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import { useInventory } from '@/hooks/use-inventory';
import { useRoutines } from '@/hooks/use-routines';
import type { ICheckInRecord } from '@/data/routines';
import {
  getDaysInMonth,
  getWeekdayMon1,
  toLocalDateStr,
  toLocalMonthStr,
  WEEKDAY_LABELS,
} from '@/lib/date';

interface CalendarCell {
  date: string;
  dayNum: number;
  /** 是否属于当前展示月份（前后补位为 false） */
  inMonth: boolean;
  /** 是否为未来日期（不可点击） */
  isFuture: boolean;
}

export default function CalendarPage() {
  const inv = useInventory();
  const routinesApi = useRoutines(inv);

  // 当前展示月份（offset 相对本月）
  const [monthOffset, setMonthOffset] = useState(0);
  const [selectedDate, setSelectedDate] = useState<string>(() => toLocalDateStr(new Date()));
  const [undoTarget, setUndoTarget] = useState<ICheckInRecord | null>(null);

  const today = toLocalDateStr(new Date());
  const viewDate = useMemo(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth() + monthOffset, 1);
  }, [monthOffset]);

  const viewYear = viewDate.getFullYear();
  const viewMonth0 = viewDate.getMonth();
  const viewMonthStr = toLocalMonthStr(viewDate);
  const daysInMonth = getDaysInMonth(viewYear, viewMonth0);

  // 月历格子：周一起始，前后补位到整周
  const cells = useMemo<CalendarCell[]>(() => {
    const firstWeekday = getWeekdayMon1(new Date(viewYear, viewMonth0, 1)); // 1-7
    const leading = firstWeekday - 1;
    const list: CalendarCell[] = [];

    // 前置补位（上月末）
    for (let i = leading; i > 0; i--) {
      const d = new Date(viewYear, viewMonth0, 1 - i);
      list.push({
        date: toLocalDateStr(d),
        dayNum: d.getDate(),
        inMonth: false,
        isFuture: toLocalDateStr(d) > today,
      });
    }
    // 本月
    for (let d = 1; d <= daysInMonth; d++) {
      const cur = new Date(viewYear, viewMonth0, d);
      const dateStr = toLocalDateStr(cur);
      list.push({
        date: dateStr,
        dayNum: d,
        inMonth: true,
        isFuture: dateStr > today,
      });
    }
    // 后置补位到整周
    const trailing = (7 - (list.length % 7)) % 7;
    for (let i = 1; i <= trailing; i++) {
      const d = new Date(viewYear, viewMonth0, daysInMonth + i);
      list.push({
        date: toLocalDateStr(d),
        dayNum: d.getDate(),
        inMonth: false,
        isFuture: toLocalDateStr(d) > today,
      });
    }
    return list;
  }, [viewYear, viewMonth0, daysInMonth, today]);

  // 本月打卡记录按日期分组
  const recordsByDate = useMemo(() => {
    const map = new Map<string, ICheckInRecord[]>();
    for (const c of routinesApi.checkIns) {
      if (!c.date.startsWith(viewMonthStr)) continue;
      const list = map.get(c.date) ?? [];
      list.push(c);
      map.set(c.date, list);
    }
    return map;
  }, [routinesApi.checkIns, viewMonthStr]);

  // 月度统计（FR-C2 顶部统计条）
  const stats = useMemo(() => {
    const monthRecords = routinesApi.checkIns.filter((c) => c.date.startsWith(viewMonthStr));
    const daysWithCheckIn = new Set(monthRecords.map((c) => c.date)).size;
    const countByRoutine = new Map<string, number>();
    for (const c of monthRecords) {
      const key = `${c.routineIcon} ${c.routineName}`;
      countByRoutine.set(key, (countByRoutine.get(key) ?? 0) + 1);
    }
    let topRoutine = '—';
    let topCount = 0;
    for (const [name, count] of countByRoutine) {
      if (count > topCount) {
        topCount = count;
        topRoutine = name;
      }
    }
    return {
      daysWithCheckIn,
      totalDays: daysInMonth,
      totalCheckins: monthRecords.length,
      topRoutine,
      topCount,
    };
  }, [routinesApi.checkIns, viewMonthStr, daysInMonth]);

  const detailRecords = recordsByDate.get(selectedDate) ?? [];
  const selectedLabel = (() => {
    const [y, m, d] = selectedDate.split('-').map(Number);
    return `${y}年${m}月${d}日`;
  })();

  const handleUndo = (record: ICheckInRecord) => {
    routinesApi.undoCheckIn(record);
    setUndoTarget(null);
    toast.success('已撤销打卡');
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">使用日历</h1>
        <p className="text-sm text-muted-foreground mt-1">
          查看每天的护理打卡记录，坚持护肤一目了然
        </p>
      </div>

      {/* 月度统计条 */}
      <div className="grid grid-cols-3 gap-3 md:gap-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">打卡天数</p>
            <p className="text-xl md:text-2xl font-bold tabular-nums mt-1">
              {stats.daysWithCheckIn}
              <span className="text-sm font-normal text-muted-foreground"> / {stats.totalDays} 天</span>
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">打卡次数</p>
            <p className="text-xl md:text-2xl font-bold tabular-nums mt-1">
              {stats.totalCheckins}
              <span className="text-sm font-normal text-muted-foreground"> 次</span>
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">最常用方案</p>
            <p className="text-sm md:text-base font-semibold mt-1 truncate" title={stats.topRoutine}>
              {stats.topRoutine}
              {stats.topCount > 0 && (
                <span className="text-xs font-normal text-muted-foreground">（{stats.topCount} 次）</span>
              )}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 月历 */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <CalendarDays className="size-4 text-primary" />
              <span className="tabular-nums">
                {viewYear} 年 {viewMonth0 + 1} 月
              </span>
            </CardTitle>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="size-7"
                aria-label="上个月"
                onClick={() => {
                  setMonthOffset((v) => v - 1);
                }}
              >
                <ChevronLeft className="size-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="text-xs h-7"
                onClick={() => {
                  setMonthOffset(0);
                  setSelectedDate(today);
                }}
              >
                今天
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="size-7"
                aria-label="下个月"
                onClick={() => {
                  setMonthOffset((v) => v + 1);
                }}
              >
                <ChevronRight className="size-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {stats.totalCheckins === 0 ? (
              <div className="rounded-lg border border-dashed border-border py-14 text-center text-sm text-muted-foreground">
                本月还没有打卡记录，去概览页试试一键打卡
              </div>
            ) : null}

            <div className="grid grid-cols-7 gap-1.5 mt-1">
              {WEEKDAY_LABELS.map((w) => (
                <div key={w} className="text-center text-[11px] text-muted-foreground py-1">
                  周{w}
                </div>
              ))}
              {cells.map((cell) => {
                const records = recordsByDate.get(cell.date) ?? [];
                const isSelected = selectedDate === cell.date;
                const isToday = cell.date === today;
                return (
                  <button
                    key={cell.date}
                    type="button"
                    disabled={cell.isFuture}
                    onClick={() => setSelectedDate(cell.date)}
                    className={`relative flex h-14 md:h-16 flex-col items-center justify-center rounded-lg border text-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 ${
                      isSelected
                        ? 'border-primary bg-accent'
                        : isToday
                          ? 'border-primary/60 bg-card'
                          : 'border-border bg-card hover:border-primary'
                    } ${!cell.inMonth ? 'opacity-40' : ''} ${
                      cell.isFuture ? 'cursor-not-allowed text-muted-foreground/40' : ''
                    }`}
                  >
                    <span className="tabular-nums leading-none">{cell.dayNum}</span>
                    {records.length > 0 && (
                      <span className="absolute bottom-1.5 flex items-center gap-0.5">
                        {records.slice(0, 3).map((r) => (
                          <span key={r.id} className="size-1.5 rounded-full bg-primary" />
                        ))}
                        {records.length > 3 && (
                          <span className="text-[8px] leading-none text-muted-foreground">
                            +{records.length - 3}
                          </span>
                        )}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            <div className="mt-4 flex items-center gap-3 text-[11px] text-muted-foreground">
              <span className="flex items-center gap-1">
                <span className="size-1.5 rounded-full bg-primary" />
                当日有打卡
              </span>
              <span className="flex items-center gap-1">
                <span className="size-2.5 rounded-sm border border-primary/60" />
                今天
              </span>
              <span>未来日期不可选择</span>
            </div>
          </CardContent>
        </Card>

        {/* 当日明细面板（移动端在下方） */}
        <Card className="lg:h-full">
          <CardHeader>
            <CardTitle className="text-base tabular-nums">{selectedLabel}</CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5">
              {detailRecords.length > 0 ? `${detailRecords.length} 次打卡` : '当日无打卡记录'}
            </p>
          </CardHeader>
          <CardContent className="space-y-3">
            {detailRecords.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border py-10 text-center text-xs text-muted-foreground">
                当日无记录
              </div>
            ) : (
              detailRecords.map((record) => {
                const canUndo = record.date === today;
                const totalAmount = record.items.reduce((s, it) => s + it.amount, 0);
                return (
                  <div key={record.id} className="rounded-lg border border-border bg-background/60 p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="text-sm font-semibold truncate">
                          {record.routineIcon} {record.routineName}
                        </div>
                        <div className="text-[11px] text-muted-foreground tabular-nums mt-0.5">
                          {record.createdAt}
                        </div>
                      </div>
                      {canUndo && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 px-1.5 text-[11px] text-muted-foreground hover:text-destructive shrink-0"
                          onClick={() => setUndoTarget(record)}
                        >
                          <Undo2 className="size-3" />
                          撤销
                        </Button>
                      )}
                    </div>

                    <div className="mt-2 space-y-1 border-t border-border/60 pt-2">
                      {record.items.map((it, idx) => (
                        <div key={idx} className="flex items-center justify-between text-[11px]">
                          <span className="truncate text-muted-foreground">{it.productName}</span>
                          <span className="shrink-0 tabular-nums ml-2">-{it.amount}%</span>
                        </div>
                      ))}
                    </div>
                    <div className="mt-1.5 flex items-center justify-between text-[11px]">
                      <Badge variant="secondary" className="text-[9px] px-1.5 py-0">
                        {record.items.length} 件产品
                      </Badge>
                      <span className="text-muted-foreground tabular-nums">合计 {totalAmount}%</span>
                    </div>
                  </div>
                );
              })
            )}

            {detailRecords.length > 0 && (
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                打卡记录不可编辑，仅当日记录可撤销；撤销会同时恢复产品剩余量。
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* 撤销二次确认（FR-B4 / R3） */}
      <AlertDialog open={undoTarget !== null} onOpenChange={(open) => !open && setUndoTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>撤销「{undoTarget?.routineName}」本次打卡？</AlertDialogTitle>
            <AlertDialogDescription>
              将删除该打卡记录及其使用记录，并按明细恢复产品剩余量。此操作不可再次回退。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (undoTarget) handleUndo(undoTarget);
              }}
            >
              确认撤销
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
