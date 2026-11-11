import { useMemo, useState, type ComponentType } from 'react';
import { useNavigate } from 'react-router-dom';
import ReactECharts from 'echarts-for-react';
import type { EChartsOption } from 'echarts';
import {
  Package,
  FlaskConical,
  AlertTriangle,
  Clock,
  ArrowRight,
  Gift,
  X,
  Sparkles,
  CalendarDays,
  Settings2,
} from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useInventory } from '@/hooks/use-inventory';
import { useRoutines } from '@/hooks/use-routines';
import { usePlans } from '@/hooks/use-plans';
import { CHART_COLORS } from '@/lib/chart-colors';
import { CATEGORY_LABELS, STATUS_LABELS, STATUS_BADGE_VARIANTS } from '@/lib/constants';
import type { ISkincareRoutine } from '@/data/routines';
import type { IPlan } from '@/data/plans';
import { toLocalMonthStr } from '@/lib/date';
import RoutineCard from './components/RoutineCard';
import CheckInDialog from './components/CheckInDialog';
import RoutineManagerDialog from './components/RoutineManagerDialog';
import PlanSection from './components/PlanSection';
import PlanFormDialog from './components/PlanFormDialog';
import MiniCalendar from './components/MiniCalendar';

function KpiCard({
  title,
  value,
  icon: Icon,
  trend,
  colorClass,
  iconColorClass,
}: {
  title: string;
  value: string | number;
  icon: ComponentType<{ className?: string }>;
  trend?: string;
  colorClass: string;
  iconColorClass?: string;
}) {
  return (
    <Card className="hover-elevate">
      <CardContent className="p-4 md:p-6">
        <div className="flex items-start justify-between gap-2">
          <div className="space-y-1 min-w-0">
            <p className="text-xs md:text-sm text-muted-foreground">{title}</p>
            <p className="text-2xl md:text-3xl font-bold tabular-nums tracking-tight">{value}</p>
            {trend && <p className="text-[11px] md:text-xs text-muted-foreground">{trend}</p>}
          </div>
          <div className={`size-9 md:size-10 rounded-lg ${colorClass} flex items-center justify-center shrink-0`}>
            <Icon className={`size-4 md:size-5 ${iconColorClass || 'text-primary-foreground'}`} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function getExpiryDays(expiryDate: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const expiry = new Date(expiryDate);
  expiry.setHours(0, 0, 0, 0);
  return Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

function getUrgencyLevel(days: number): 0 | 1 | 2 {
  if (days < 0) return 2;
  if (days <= 90) return 1;
  return 0;
}

const URGENCY_COLORS: Record<0 | 1 | 2, string> = {
  0: '#b8d4c8',
  1: '#e8c59d',
  2: '#d98c8c',
};

export default function DashboardPage() {
  const navigate = useNavigate();
  // 注意顺序：useInventory 需先于 useRoutines 初始化（打卡依赖其批量使用记录读写）
  const inv = useInventory();
  const { products, usageLogs } = inv;
  const routinesApi = useRoutines(inv);
  const plansApi = usePlans();

  const [selectedCategoryKey, setSelectedCategoryKey] = useState<string | null>(null);
  const [rightTab, setRightTab] = useState<'expiry' | 'stock' | 'calendar'>('expiry');

  // 弹层状态
  const [checkInRoutine, setCheckInRoutine] = useState<ISkincareRoutine | null>(null);
  const [managerOpen, setManagerOpen] = useState(false);
  const [managerInitialId, setManagerInitialId] = useState<string | null>(null);
  const [planFormOpen, setPlanFormOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<IPlan | null>(null);

  const categoryLabelToKey = useMemo(() => {
    const map: Record<string, string> = {};
    for (const [key, label] of Object.entries(CATEGORY_LABELS)) {
      map[label] = key;
    }
    return map;
  }, []);

  const stats = useMemo(() => {
    const total = products.length;
    const inUse = products.filter((p) => p.status === 'opened_in_use').length;
    const unopened = products.filter((p) => p.status === 'unopened_sealed').length;
    const expired = products.filter((p) => p.status === 'expired').length;
    return { total, inUse, unopened, expired };
  }, [products]);

  // 分类占比数据
  const categoryData = useMemo(() => {
    const map = new Map<string, number>();
    products.forEach((p) => {
      map.set(p.category, (map.get(p.category) || 0) + 1);
    });
    return Array.from(map.entries())
      .map(([key, value]) => ({
        key,
        name: CATEGORY_LABELS[key] || key,
        value,
      }))
      .sort((a, b) => b.value - a.value);
  }, [products]);

  const pieOption: EChartsOption = {
    tooltip: {
      trigger: 'item',
      formatter: (params) => {
        const p = params as { name: string; value: number; percent: number };
        return `${p.name}: ${p.value} 件 (${p.percent}%)<br/><span class="text-[10px] opacity-70">点击查看详情</span>`;
      },
    },
    legend: { type: 'scroll', bottom: 0 },
    series: [
      {
        type: 'pie',
        radius: ['50%', '70%'],
        center: ['50%', '45%'],
        avoidLabelOverlap: false,
        label: { show: false },
        emphasis: { label: { show: false }, scaleSize: 6 },
        selectedMode: 'single',
        selectedOffset: 8,
        data: categoryData.map((d) => ({ name: d.name, value: d.value })),
        color: CHART_COLORS,
      },
    ],
  };

  const pieEvents = useMemo(
    () => ({
      click: (params: { name: string }) => {
        const key = categoryLabelToKey[params.name];
        setSelectedCategoryKey((prev) => (prev === key ? null : key));
      },
    }),
    [categoryLabelToKey],
  );

  const filteredProducts = useMemo(() => {
    if (!selectedCategoryKey) return [];
    return products.filter((p) => p.category === selectedCategoryKey);
  }, [products, selectedCategoryKey]);

  // === 保质期条形图 ===
  const expiringProducts = useMemo(() => {
    return products
      .filter((p) => p.status !== 'used_up')
      .map((p) => ({ ...p, days: getExpiryDays(p.expiryDate) }))
      .sort((a, b) => a.days - b.days);
  }, [products]);

  const expiryBarOption: EChartsOption = useMemo(() => {
    const topN = expiringProducts.slice(0, 8);
    const maxDays = Math.max(1095, ...topN.map((p) => Math.max(0, p.days)));
    const names = topN.map((p) =>
      [p.brand, p.name].filter(Boolean).join(' · ').length > 22
        ? [p.brand, p.name].filter(Boolean).join(' · ').slice(0, 20) + '…'
        : [p.brand, p.name].filter(Boolean).join(' · '),
    );
    const values = topN.map((p) => Math.max(0, p.days));
    const colors = topN.map((p) => URGENCY_COLORS[getUrgencyLevel(p.days)]);

    return {
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        formatter: (params) => {
          const list = Array.isArray(params) ? params : [params];
          const p = list[0] as { dataIndex: number };
          const product = topN[p.dataIndex];
          const urgency = getUrgencyLevel(product.days);
          const urgencyText =
            urgency === 2 ? `已过期 ${Math.abs(product.days)} 天` : `还剩 ${product.days} 天`;
          return `<strong>${product.name}</strong><br/>${product.brand || ''} · ${product.volume}<br/>${urgencyText}`;
        },
      },
      grid: { left: '2%', right: '4%', top: 10, bottom: 10, containLabel: true },
      xAxis: { type: 'value', max: maxDays, show: false },
      yAxis: {
        type: 'category',
        data: names.reverse(),
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: { fontSize: 11, color: '#666', interval: 0 },
        inverse: true,
      },
      series: [
        {
          type: 'bar',
          data: values
            .reverse()
            .map((v, i) => ({
              value: v,
              itemStyle: { color: colors[colors.length - 1 - i], borderRadius: [0, 3, 3, 0] },
            })),
          barWidth: 14,
          label: {
            show: true,
            position: 'right',
            fontSize: 10,
            color: '#888',
            formatter: (p) => {
              const days = p.value as number;
              return days < 0 ? `过期 ${Math.abs(days)}d` : `${days}d`;
            },
          },
          showBackground: true,
          backgroundStyle: { color: 'rgba(0,0,0,0.04)', borderRadius: [0, 3, 3, 0] },
        },
      ],
    };
  }, [expiringProducts]);

  // === 存量概览（分类数量柱状图 + 剩余量分布饼图）===
  const stockBarOption: EChartsOption = useMemo(() => {
    const bars = categoryData.slice(0, 8).reverse();
    return {
      tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
      grid: { left: '2%', right: '4%', top: 10, bottom: 10, containLabel: true },
      xAxis: { type: 'value', show: false },
      yAxis: {
        type: 'category',
        data: bars.map((d) => d.name),
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: { fontSize: 11, color: '#666' },
      },
      series: [
        {
          type: 'bar',
          data: bars.map((d) => d.value),
          barWidth: 14,
          label: { show: true, position: 'right', fontSize: 10, color: '#888' },
          itemStyle: { borderRadius: [0, 3, 3, 0], color: CHART_COLORS[0] },
          showBackground: true,
          backgroundStyle: { color: 'rgba(0,0,0,0.04)', borderRadius: [0, 3, 3, 0] },
        },
      ],
    };
  }, [categoryData]);

  // 剩余量分布饼图：0-25% / 25-50% / 50-75% / 75-100%
  const stockDistOption: EChartsOption = useMemo(() => {
    const buckets = [
      { name: '接近用完 0-25%', range: [0, 25] },
      { name: '使用中 25-50%', range: [25, 50] },
      { name: '储备充足 50-75%', range: [50, 75] },
      { name: '全新 75-100%', range: [75, 101] },
    ];
    const data = buckets.map((b) => ({
      name: b.name,
      value: products.filter(
        (p) => p.status !== 'used_up' && p.quantity >= b.range[0] && p.quantity < b.range[1],
      ).length,
    }));

    return {
      tooltip: {
        trigger: 'item',
        formatter: (params) => {
          const p = params as { name: string; value: number; percent: number };
          return `${p.name}<br/>${p.value} 件 (${p.percent}%)`;
        },
      },
      legend: { show: false },
      series: [
        {
          type: 'pie',
          radius: ['40%', '65%'],
          center: ['50%', '50%'],
          label: { show: false },
          emphasis: { label: { show: false } },
          data,
          color: ['#d98c8c', '#e8c59d', '#c2d98c', '#b8d4c8'],
        },
      ],
    };
  }, [products]);

  // === 月度使用趋势 ===
  const monthlyTrend = useMemo(() => {
    const months: { label: string; total: number }[] = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const label = `${d.getMonth() + 1}月`;
      const yyyyMm = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const total = usageLogs
        .filter((l) => l.usedAt.startsWith(yyyyMm))
        .reduce((sum, l) => sum + l.amount, 0);
      months.push({ label, total });
    }
    return months;
  }, [usageLogs]);

  const lineOption: EChartsOption = {
    tooltip: {
      trigger: 'axis',
      formatter: (params) => {
        const list = Array.isArray(params) ? params : [params];
        const p = list[0] as { name: string; value: number };
        return `${p.name}<br/>使用量: ${p.value}%`;
      },
    },
    grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
    xAxis: { type: 'category', boundaryGap: false, data: monthlyTrend.map((m) => m.label) },
    yAxis: { type: 'value', name: '使用量(%)' },
    series: [
      {
        type: 'line',
        smooth: true,
        data: monthlyTrend.map((m) => m.total),
        areaStyle: { opacity: 0.2 },
        color: CHART_COLORS[0],
      },
    ],
  };

  // === 今日排程命中的方案（FR-D3：方案卡"今日计划"徽标 + 确认单提示） ===
  const scheduledTodayIds = useMemo(() => {
    const ids = new Set<string>();
    const todayMonth = toLocalMonthStr(new Date());
    const weekday = new Date().getDay() === 0 ? 7 : new Date().getDay();
    for (const plan of plansApi.activePlans) {
      if (plan.month !== todayMonth) continue;
      for (const s of plan.schedules) {
        if (s.weekdays.includes(weekday)) ids.add(s.routineId);
      }
    }
    return ids;
  }, [plansApi.activePlans]);

  // === 打卡确认 ===
  const handleCheckInConfirm = (
    routine: ISkincareRoutine,
    items: { productId: string; productName: string; amount: number }[],
  ) => {
    const record = routinesApi.checkIn(routine, items);
    setCheckInRoutine(null);
    toast.success(`已打卡 · ${routine.name}`, {
      action: {
        label: '撤销',
        onClick: () => {
          routinesApi.undoCheckIn(record);
          toast.success('已撤销打卡');
        },
      },
    });
  };

  // === 方案管理回调 ===
  const handleCreateRoutine = (payload: Parameters<typeof routinesApi.addRoutine>[0]) => {
    const created = routinesApi.addRoutine(payload);
    toast.success('方案已创建');
    return created;
  };

  const handleUpdateRoutine = (id: string, payload: Parameters<typeof routinesApi.updateRoutine>[1]) => {
    routinesApi.updateRoutine(id, payload);
    toast.success('方案已保存');
  };

  const handleCopyPreset = (routine: ISkincareRoutine) => {
    const copy = routinesApi.copyPreset(routine);
    toast.success('已复制为自定义方案，可直接编辑');
    return copy;
  };

  const handleDeleteRoutine = (id: string) => {
    routinesApi.deleteRoutine(id);
    toast.success('方案已删除，历史打卡记录已保留');
  };

  // === 计划回调 ===
  const handleCreatePlan = (payload: Parameters<typeof plansApi.addPlan>[0]) => {
    plansApi.addPlan(payload);
    setPlanFormOpen(false);
    toast.success('计划已创建');
  };

  const handleUpdatePlan = (payload: Parameters<typeof plansApi.updatePlan>[1]) => {
    if (editingPlan) plansApi.updatePlan(editingPlan.id, payload);
    setPlanFormOpen(false);
    setEditingPlan(null);
    toast.success('计划已更新');
  };

  const handleArchivePlan = (plan: IPlan) => {
    plansApi.archivePlan(plan.id);
    toast.success('计划已归档');
  };

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">库存概览</h1>
          <p className="text-sm text-muted-foreground mt-1">一眼掌握你的护肤品库存全貌</p>
        </div>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard title="产品总数" value={stats.total} icon={Package} trend="件护肤品" colorClass="bg-primary" />
        <KpiCard title="使用中" value={stats.inUse} icon={FlaskConical} trend="件正在使用" colorClass="bg-[#b8d4c8]" iconColorClass="text-white" />
        <KpiCard title="未开封全新" value={stats.unopened} icon={Gift} trend="件待开封" colorClass="bg-[#e8c59d]" iconColorClass="text-white" />
        <KpiCard title="已过期" value={stats.expired} icon={AlertTriangle} trend="件需处理" colorClass="bg-destructive" />
      </div>

      {/* 饼图 + Tabs 区 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 分类饼图（可点击） */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">分类占比</CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5">点击扇区查看该分类产品</p>
          </CardHeader>
          <CardContent className="space-y-3">
            <ReactECharts option={pieOption} onEvents={pieEvents} className="h-[240px] w-full" />
            {selectedCategoryKey && (
              <div className="border-t border-border/50 pt-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-muted-foreground">
                    {CATEGORY_LABELS[selectedCategoryKey]} · {filteredProducts.length} 件
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-5"
                    onClick={() => setSelectedCategoryKey(null)}
                  >
                    <X className="size-3" />
                  </Button>
                </div>
                <div className="max-h-[200px] overflow-y-auto space-y-1">
                  {filteredProducts.map((p) => (
                    <button
                      key={p.id}
                      className="w-full text-left px-2 py-1.5 rounded-md hover:bg-accent transition-colors flex items-center gap-2"
                      onClick={() => navigate('/inventory')}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-medium truncate">{p.name}</div>
                        <div className="text-[10px] text-muted-foreground truncate">
                          {p.brand} · {p.volume}
                        </div>
                      </div>
                      {p.isGift && (
                        <Badge variant="outline" className="shrink-0 text-[10px] px-1.5 py-0">赠</Badge>
                      )}
                      <Badge variant={STATUS_BADGE_VARIANTS[p.status]} className="shrink-0 text-[10px] px-1.5 py-0">
                        {STATUS_LABELS[p.status]}
                      </Badge>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* 保质期 / 存量 / 使用日历 Tabs - 占 2 列宽 */}
        <Tabs
          value={rightTab}
          onValueChange={(v) => setRightTab(v as 'expiry' | 'stock' | 'calendar')}
          className="lg:col-span-2 flex-col gap-0"
        >
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <TabsList>
                <TabsTrigger value="expiry" className="text-xs">
                  <Clock className="size-3" />
                  保质期进度
                </TabsTrigger>
                <TabsTrigger value="stock" className="text-xs">
                  <Package className="size-3" />
                  存量概览
                </TabsTrigger>
                <TabsTrigger value="calendar" className="text-xs">
                  <CalendarDays className="size-3" />
                  使用日历
                </TabsTrigger>
              </TabsList>
              <Button variant="ghost" size="sm" onClick={() => navigate('/inventory')} className="text-xs">
                查看全部
                <ArrowRight className="size-3 ml-1" />
              </Button>
            </CardHeader>
            <CardContent className="pt-2 space-y-4">
              <TabsContent value="expiry">
                <div className="flex items-center gap-3 mb-2">
                  <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                    <span className="inline-block size-2.5 rounded-sm" style={{ background: URGENCY_COLORS[0] }} />
                    安全
                    <span className="inline-block size-2.5 rounded-sm" style={{ background: URGENCY_COLORS[1] }} />
                    ≤90天
                    <span className="inline-block size-2.5 rounded-sm" style={{ background: URGENCY_COLORS[2] }} />
                    已过期
                  </div>
                </div>
                {expiringProducts.length === 0 ? (
                  <div className="py-12 text-center text-muted-foreground text-sm">🎉 没有即将过期或已过期的产品</div>
                ) : (
                  <ReactECharts option={expiryBarOption} className="h-[240px] w-full" />
                )}
              </TabsContent>

              <TabsContent value="stock">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="sm:col-span-2">
                    <p className="text-xs text-muted-foreground mb-2">分类存量（Top {Math.min(8, categoryData.length)}）</p>
                    <ReactECharts option={stockBarOption} className="h-[200px] w-full" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-2">剩余量分布</p>
                    <ReactECharts option={stockDistOption} className="h-[200px] w-full" />
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="calendar">
                <MiniCalendar checkIns={routinesApi.checkIns} />
              </TabsContent>
            </CardContent>
          </Card>
        </Tabs>
      </div>

      {/* 使用计划区块（位于护理方案上方，FR-D） */}
      <PlanSection
        activePlans={plansApi.activePlans}
        archivedPlans={plansApi.archivedPlans}
        products={products}
        usageLogs={usageLogs}
        checkIns={routinesApi.checkIns}
        allRoutines={routinesApi.allRoutines}
        onNew={() => {
          setEditingPlan(null);
          setPlanFormOpen(true);
        }}
        onEdit={(plan) => {
          setEditingPlan(plan);
          setPlanFormOpen(true);
        }}
        onArchive={handleArchivePlan}
      />

      {/* 护理方案区域 */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Sparkles className="size-4 text-primary" />
            护理方案
          </CardTitle>
          <div className="flex items-center gap-2">
            <span className="hidden sm:inline text-xs text-muted-foreground">
              预设按功效匹配库存 · 自定义可直接打卡
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setManagerInitialId(null);
                setManagerOpen(true);
              }}
            >
              <Settings2 className="size-3.5" />
              管理方案
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {routinesApi.allRoutines.map((routine) => (
              <RoutineCard
                key={routine.id}
                routine={routine}
                products={products}
                scheduledToday={scheduledTodayIds.has(routine.id)}
                onCheckIn={() => setCheckInRoutine(routine)}
                onCopy={() => handleCopyPreset(routine)}
                onEdit={() => {
                  setManagerInitialId(routine.id);
                  setManagerOpen(true);
                }}
                onDelete={() => handleDeleteRoutine(routine.id)}
              />
            ))}
          </div>
        </CardContent>
      </Card>

      {/* 使用趋势 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">月度使用趋势</CardTitle>
        </CardHeader>
        <CardContent>
          <ReactECharts option={lineOption} className="h-[300px] w-full" />
        </CardContent>
      </Card>

      {/* 打卡确认单 */}
      <CheckInDialog
        routine={checkInRoutine}
        products={products}
        scheduledToday={checkInRoutine ? scheduledTodayIds.has(checkInRoutine.id) : false}
        onConfirm={handleCheckInConfirm}
        onClose={() => setCheckInRoutine(null)}
      />

      {/* 管理方案弹层 */}
      <RoutineManagerDialog
        open={managerOpen}
        onOpenChange={setManagerOpen}
        allRoutines={routinesApi.allRoutines}
        products={products}
        initialSelectedId={managerInitialId}
        onCreate={handleCreateRoutine}
        onUpdate={handleUpdateRoutine}
        onCopyPreset={handleCopyPreset}
      />

      {/* 新建 / 编辑计划弹层 */}
      <PlanFormDialog
        open={planFormOpen}
        onOpenChange={(open) => {
          setPlanFormOpen(open);
          if (!open) setEditingPlan(null);
        }}
        initialPlan={editingPlan}
        products={products}
        allRoutines={routinesApi.allRoutines}
        onSubmit={(payload) =>
          editingPlan ? handleUpdatePlan(payload) : handleCreatePlan(payload)
        }
      />
    </div>
  );
}
