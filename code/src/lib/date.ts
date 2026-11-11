// 本地日期工具（共享规则 R6：打卡日期、日历展示、计划月份一律本地日期，禁止 toISOString）

/** Date → 本地 YYYY-MM-DD */
export function toLocalDateStr(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Date → 本地 YYYY-MM */
export function toLocalMonthStr(d: Date = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

/** Date → 本地 YYYY-MM-DD HH:mm */
export function toLocalDateTimeStr(d: Date = new Date()): string {
  const h = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');
  return `${toLocalDateStr(d)} ${h}:${min}`;
}

/** 解析 YYYY-MM-DD 为本地 Date（避免 UTC 解析偏移） */
export function parseLocalDate(s: string): Date {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y || 2000, (m || 1) - 1, d || 1);
}

export function addDays(d: Date, days: number): Date {
  const nd = new Date(d);
  nd.setDate(nd.getDate() + days);
  nd.setHours(0, 0, 0, 0);
  return nd;
}

/** 星期序号，周一=1 … 周日=7 */
export function getWeekdayMon1(d: Date): number {
  return d.getDay() === 0 ? 7 : d.getDay();
}

export const WEEKDAY_LABELS = ['一', '二', '三', '四', '五', '六', '日'];

/** 某月天数（month0 = 0-11） */
export function getDaysInMonth(year: number, month0: number): number {
  return new Date(year, month0 + 1, 0).getDate();
}
