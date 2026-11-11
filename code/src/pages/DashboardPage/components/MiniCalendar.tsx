// 迷你使用日历（FR-C1）：近 14 天，有打卡的日子显示圆点，点击展开当日明细
import { useMemo, useState } from 'react';
import type { ICheckInRecord } from '@/data/routines';
import { addDays, getWeekdayMon1, toLocalDateStr, WEEKDAY_LABELS, parseLocalDate } from '@/lib/date';

interface MiniCalendarProps {
  checkIns: ICheckInRecord[];
}

export default function MiniCalendar({ checkIns }: MiniCalendarProps) {
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const { cells, rangeStart } = useMemo(() => {
    const today = new Date();
    const start = addDays(today, -13); // 近 14 天起点
    // 对齐到所在周的周一
    const monday = addDays(start, -(getWeekdayMon1(start) - 1));
    const list: { date: string; dayNum: number; active: boolean }[] = [];
    const cursor = new Date(monday);
    while (cursor.getTime() <= today.getTime()) {
      const dateStr = toLocalDateStr(cursor);
      list.push({ date: dateStr, dayNum: cursor.getDate(), active: dateStr >= toLocalDateStr(start) });
      cursor.setDate(cursor.getDate() + 1);
    }
    return { cells: list, rangeStart: toLocalDateStr(start) };
  }, []);

  /** 每个日期的打卡方案去重集合 */
  const routinesByDate = useMemo(() => {
    const map = new Map<string, ICheckInRecord[]>();
    for (const c of checkIns) {
      if (c.date < rangeStart) continue;
      const list = map.get(c.date) ?? [];
      list.push(c);
      map.set(c.date, list);
    }
    return map;
  }, [checkIns, rangeStart]);

  const dayRecords = selectedDate ? (routinesByDate.get(selectedDate) ?? []) : [];
  const monthLabel = selectedDate
    ? `${parseLocalDate(selectedDate).getMonth() + 1}月${parseLocalDate(selectedDate).getDate()}日`
    : '';

  return (
    <div className="space-y-3">
      <div>
        <div className="grid grid-cols-7 gap-1 mb-1">
          {WEEKDAY_LABELS.map((w) => (
            <div key={w} className="text-center text-[10px] text-muted-foreground py-0.5">
              {w}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {cells.map((cell) => {
            const records = routinesByDate.get(cell.date) ?? [];
            const routineIds = Array.from(new Set(records.map((r) => r.routineId)));
            const isSelected = selectedDate === cell.date;
            return (
              <button
                key={cell.date}
                disabled={!cell.active}
                onClick={() => setSelectedDate(cell.date)}
                className={`relative flex h-11 flex-col items-center justify-center rounded-md border text-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                  isSelected
                    ? 'border-primary bg-accent'
                    : cell.active
                      ? 'border-border bg-card hover:border-primary'
                      : 'border-transparent bg-transparent text-muted-foreground/50'
                }`}
              >
                <span className="tabular-nums leading-none">{cell.dayNum}</span>
                {routineIds.length > 0 && (
                  <span className="absolute bottom-1 flex items-center gap-0.5">
                    {routineIds.slice(0, 3).map((id) => (
                      <span key={id} className="size-1.5 rounded-full bg-primary" />
                    ))}
                    {routineIds.length > 3 && (
                      <span className="text-[8px] leading-none text-muted-foreground">
                        +{routineIds.length - 3}
                      </span>
                    )}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* 当日明细 */}
      <div className="rounded-lg bg-background border border-border/60 p-3 text-xs">
        {selectedDate ? (
          dayRecords.length > 0 ? (
            <div className="space-y-1.5">
              <div className="text-[11px] font-semibold text-accent-foreground">
                {monthLabel} · {dayRecords.length} 次打卡
              </div>
              {dayRecords.map((r) => (
                <div key={r.id} className="flex items-center justify-between gap-2">
                  <span className="truncate">
                    {r.routineIcon} {r.routineName}
                  </span>
                  <span className="shrink-0 text-muted-foreground tabular-nums">
                    {r.items.length} 件产品 · 合计 {r.items.reduce((s, it) => s + it.amount, 0)}%
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-muted-foreground">{monthLabel} 当日无记录</div>
          )
        ) : (
          <div className="text-muted-foreground">点击有圆点的日期查看当日打卡明细</div>
        )}
      </div>
    </div>
  );
}
