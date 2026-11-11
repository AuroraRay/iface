import { useState, useMemo, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import {
  Plus,
  Trash2,
  Upload,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  ListChecks,
  Calculator,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useInventory } from '@/hooks/use-inventory';
import { useCustomOptions } from '@/hooks/use-custom-options';
import { matchIngredients } from '@/lib/constants';
import type { ISkincareProduct } from '@/data/products';

type VolumeUnit = 'ml' | 'g' | 'pcs' | 'set';
type PackUnit = '瓶' | '支' | '盒' | '片' | '袋' | '个';

const UNIT_LABEL: Record<VolumeUnit, string> = {
  ml: 'ml',
  g: 'g',
  pcs: '件',
  set: '套',
};

const PACK_OPTIONS: PackUnit[] = ['瓶', '支', '盒', '片', '袋', '个'];

interface BatchRow {
  key: string;
  /** 是否勾选纳入本次录入（保存 / 分摊仅针对勾选项） */
  selected: boolean;
  name: string;
  brand: string;
  category: ISkincareProduct['category'];
  /** 单瓶/单支规格容量数字，如 300 */
  perVolume: number;
  volumeUnit: VolumeUnit;
  /** 包装单位：瓶 / 支 / 盒 …… */
  packUnit: PackUnit;
  purchaseCount: number;
  /** 参考价 / 划线价（可选，用于合并支付时按标价占比分摊） */
  listPrice: number;
  /** 实付金额（分摊结果写入这里） */
  purchasePrice: number;
  purchaseDate: string;
  expiryDate: string;
  purpose: string;
  /** 功效标签（可多选叠加） */
  efficacies: string[];
  /** 主要成分（标准名，可多个） */
  ingredients: string[];
  isGift: boolean;
  isOpened: boolean;
  isPaused: boolean;
}

// 文本中的中文品类关键词 → 系统品类枚举（本地规则匹配，不调用 AI）
const CATEGORY_KEYWORD_MAP: { keys: string[]; value: ISkincareProduct['category'] }[] = [
  { keys: ['洁面', '洗面奶', '氨基酸洁'], value: 'cleanser' },
  { keys: ['爽肤', '化妆水', '精华水', '平衡水', '水乳', '微晶水', '节律水'], value: 'toner' },
  { keys: ['精华液', '精华乳', '精华露', '精华', '安瓶'], value: 'serum' },
  { keys: ['眼霜', '面霜', '乳霜', '面油'], value: 'cream' },
  { keys: ['防晒', '隔离'], value: 'sunscreen' },
  { keys: ['面膜', '膜粉'], value: 'mask' },
  {
    keys: ['口红', '唇釉', '唇泥', '粉底', '粉底液', '气垫', 'BB霜', 'bb霜', 'CC霜', 'cc霜', '散粉', '蜜粉', '定妆粉', '粉饼', '眼影', '睫毛膏', '眼线', '眉笔', '眉粉', '腮紅', '腮红', '遮瑕', '高光', '修容', '彩妆'],
    value: 'makeup',
  },
  { keys: ['唇冻', '唇膏', '唇膜', '唇部'], value: 'lip_care' },
  { keys: ['护发', '精油', '发膜'], value: 'hair_care' },
  { keys: ['洗发', '洗头', '沐浴', '洗澡'], value: 'hair_body' },
  { keys: ['香水', '香氛', '留香'], value: 'perfume' },
  { keys: ['身体乳', '身体', '护手'], value: 'body_care' },
  { keys: ['工具', '仪器', '刷', '美容仪'], value: 'skincare_tool' },
];

function detectCategory(text: string): ISkincareProduct['category'] {
  const hit = CATEGORY_KEYWORD_MAP.find((g) => g.keys.some((k) => text.includes(k)));
  return hit ? hit.value : 'other';
}

// 常见品牌关键词，命中即回填，识别不到留空
const BRAND_KEYWORDS: { keys: string[]; value: string }[] = [
  { keys: ['AWESS', 'awess'], value: 'AWESS' },
  { keys: ['英树', 'INGS', 'ings'], value: '英树 INGS' },
  { keys: ['英格诺'], value: '英格诺' },
  { keys: ['娴俪美诗', 'celimax', 'Celimax'], value: '娴俪美诗 celimax' },
];

function detectBrand(text: string): string {
  const hit = BRAND_KEYWORDS.find((b) => b.keys.some((k) => text.includes(k)));
  return hit ? hit.value : '';
}

// 功效关键词 → 标签（可叠加命中多个，如“视黄醇紧致美白”→ 抗老+紧致+美白）
const EFFICACY_KEYWORD_MAP: { keys: string[]; value: string }[] = [
  { value: '抗老', keys: ['抗老', '抗皱', '抗衰', '玻色因', '视黄醇', 'A醇', '紧至', '逆龄'] },
  { value: '美白', keys: ['美白', '焕白', '净白'] },
  { value: '提亮', keys: ['提亮', '透亮', '焕亮', '嫩肤', '光泽'] },
  { value: '淡斑', keys: ['淡斑', '祛斑', '色斑'] },
  { value: '保湿', keys: ['保湿', '滋润', '锁水'] },
  { value: '补水', keys: ['补水'] },
  { value: '控油', keys: ['控油', '清爽', '油痘'] },
  { value: '祛痘', keys: ['祛痘', '净痘', '痘痘', '痘肌', '闭口'] },
  { value: '舒缓', keys: ['舒缓', '镇静', '敏红', '敏感'] },
  { value: '修护', keys: ['修护', '修复', 'B5', '屏障'] },
  { value: '抗氧化', keys: ['抗氧化', '抗氧', '抗糖'] },
  { value: '紧致', keys: ['紧致', '紧实'] },
  { value: '收缩毛孔', keys: ['毛孔'] },
  { value: '去角质', keys: ['去角质', '焕肤', '微针'] },
  { value: '防晒', keys: ['防晒', 'SPF', '隔离'] },
];

function detectEfficacies(text: string): string[] {
  return EFFICACY_KEYWORD_MAP.filter((g) => g.keys.some((k) => text.includes(k))).map(
    (g) => g.value,
  );
}

const pad2 = (n: string) => n.padStart(2, '0');

// 本地分词解析：从一段订单文字里抽取一行产品（纯前端正则，不依赖 AI）
function parseLine(rawLine: string): Omit<BatchRow, 'key' | 'selected'> | null {
  const line = rawLine.trim();
  if (line.length < 2) return null;

  const noises: string[] = [];

  // 规格容量 + 单位
  let perVolume = 0;
  let volumeUnit: VolumeUnit = 'ml';
  const cap = line.match(/(\d+(?:\.\d+)?)\s*(ml|ML|毫升|g|G|克|片|颗|枚)/);
  if (cap) {
    perVolume = parseFloat(cap[1]);
    const u = cap[2];
    if (/g|G|克/.test(u)) volumeUnit = 'g';
    else if (/片|颗|枚/.test(u)) volumeUnit = 'pcs';
    else volumeUnit = 'ml';
    noises.push(cap[0]);
  }

  // 数量：×N / xN / N瓶装
  let purchaseCount = 1;
  let packUnit: PackUnit | undefined;
  const mult = line.match(/[×xX*＊]\s*(\d+)\s*(瓶|支|盒|片|袋|个|颗|枚)?/);
  if (mult) {
    purchaseCount = parseInt(mult[1], 10) || 1;
    noises.push(mult[0]);
    if (mult[2]) packUnit = normalizePack(mult[2]);
  }
  const packN = line.match(/(\d+)\s*(瓶|支|盒|片|袋|个|颗|枚)(?:装)?/);
  if (packN) {
    if (!mult) purchaseCount = parseInt(packN[1], 10) || 1;
    packUnit = packUnit ?? normalizePack(packN[2]);
    noises.push(packN[0]);
  }
  if (!packUnit) {
    const found = PACK_OPTIONS.find((p) => line.includes(p));
    packUnit = found ?? (volumeUnit === 'pcs' ? '片' : '瓶');
  }

  // 参考价 / 划线价（可选，作为按标价分摊的权重）
  let listPrice = 0;
  const listMatch = line.match(/(?:原价|标价|吊牌价?|划线价?|日常价|建议零售价|零售价|单价)\s*[¥￥]?\s*(\d+(?:\.\d+)?)/);
  if (listMatch) {
    listPrice = parseFloat(listMatch[1]) || 0;
    noises.push(listMatch[0]);
  }

  // 实付/到手价格
  let purchasePrice = 0;
  const price =
    line.match(/(?:实付|到手|券后|合计|总价|成交价|售价|¥|￥|\$)\s*(\d+(?:\.\d+)?)/) ??
    line.match(/(\d+(?:\.\d+)?)\s*元/);
  if (price) {
    purchasePrice = parseFloat(price[1]) || 0;
    noises.push(price[0]);
  }

  // 购买日期
  let purchaseDate = '';
  const d = line.match(/(20\d{2})\s*[-/年.]\s*(\d{1,2})\s*[-/月.]\s*(\d{1,2})\s*日?/);
  if (d) {
    purchaseDate = `${d[1]}-${pad2(d[2])}-${pad2(d[3])}`;
    noises.push(d[0]);
  }

  const isGift = /赠|小样|中样|试用|gift/i.test(line);
  const isOpened = /已开封|在用|已使用|正在用/.test(line);
  const category = detectCategory(line);
  const brand = detectBrand(line);
  const efficacies = detectEfficacies(line);
  const ingredients = matchIngredients(line);

  // 名称：去掉规格/数量/价格/日期/方括号等噪声后的主文本
  let name = line;
  noises.forEach((n) => {
    name = name.split(n).join(' ');
  });
  name = name
    .replace(/\[.*?\]/g, ' ')
    .replace(/【.*?】/g, ' ')
    .replace(/赠品?|小样|中样|试用装?|已开封|在用/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (name.length < 2) name = line.replace(/\s+/g, ' ').trim().slice(0, 30);
  if (name.length > 40) name = name.slice(0, 40);

  // 一行里既没有规格数字也没有可识别名称，则视为无效碎片
  if (perVolume <= 0 && name.length < 2) return null;

  return {
    name,
    brand,
    category,
    perVolume,
    volumeUnit,
    packUnit,
    purchaseCount,
    listPrice,
    purchasePrice,
    purchaseDate,
    expiryDate: '',
    purpose: '',
    efficacies,
    ingredients,
    isGift,
    isOpened,
    isPaused: false,
  };
}

function normalizePack(raw: string): PackUnit {
  if (raw === '颗' || raw === '枚') return '片';
  return (PACK_OPTIONS as string[]).includes(raw) ? (raw as PackUnit) : '瓶';
}

// 把整段粘贴文本切成多行并逐行解析
function parseOrderText(text: string): Omit<BatchRow, 'key' | 'selected'>[] {
  const segments = text
    .split(/[\n\r;；▲•|｜]+/)
    .map((s) => s.trim())
    .filter((s) => s.length >= 2);
  const result: Omit<BatchRow, 'key' | 'selected'>[] = [];
  const seen = new Set<string>();
  for (const seg of segments) {
    const parsed = parseLine(seg);
    if (!parsed) continue;
    const fingerprint = `${parsed.name}|${parsed.perVolume}|${parsed.purchaseCount}`;
    if (seen.has(fingerprint)) continue;
    seen.add(fingerprint);
    result.push(parsed);
  }
  return result;
}

function createEmptyRow(index: number): BatchRow {
  return {
    key: `row_${Date.now()}_${index}_${Math.random().toString(36).slice(2, 7)}`,
    selected: true,
    name: '',
    brand: '',
    category: 'toner',
    perVolume: 0,
    volumeUnit: 'ml',
    packUnit: '瓶',
    purchaseCount: 1,
    listPrice: 0,
    purchasePrice: 0,
    purchaseDate: '2026-10-25',
    expiryDate: '2029-10-25',
    purpose: '',
    efficacies: [],
    ingredients: [],
    isGift: false,
    isOpened: false,
    isPaused: false,
  };
}

// 总容量 = 规格容量 × 数量（仅 ml / g 参与，件/套为 0）
function totalOf(r: BatchRow): number {
  if (r.volumeUnit !== 'ml' && r.volumeUnit !== 'g') return 0;
  return Math.round(r.perVolume * r.purchaseCount * 100) / 100;
}

// 规格展示串：300ml/瓶，或 300ml×2瓶
function formatVolume(r: BatchRow): string {
  if (r.perVolume <= 0) return '';
  const unit = UNIT_LABEL[r.volumeUnit];
  if (r.volumeUnit === 'set') return `${r.perVolume}套`;
  if (r.volumeUnit === 'pcs') return `${r.perVolume}${r.packUnit}`;
  return r.purchaseCount === 1
    ? `${r.perVolume}${unit}/${r.packUnit}`
    : `${r.perVolume}${unit}×${r.purchaseCount}${r.packUnit}`;
}

export default function BatchImportPage() {
  const navigate = useNavigate();
  const { batchAddProducts } = useInventory();
  const { allCategoryOptions, allEfficacyOptions, allIngredientOptions } = useCustomOptions();

  const [rows, setRows] = useState<BatchRow[]>(() => [
    createEmptyRow(0),
    createEmptyRow(1),
    createEmptyRow(2),
    createEmptyRow(3),
    createEmptyRow(4),
  ]);
  const [parseText, setParseText] = useState('');
  const [mergedAmount, setMergedAmount] = useState('');
  // 分摊方式：listPrice=按参考价占比（最贴近真实折扣）；volume=按总容量；average=平均分摊
  const [allocMode, setAllocMode] = useState<'listPrice' | 'volume' | 'average'>('listPrice');

  // 本地分词识别（同步，无需联网 / AI）
  const handleLocalParse = () => {
    const text = parseText.trim();
    if (!text) {
      toast.error('请先粘贴订单或交易快照文字');
      return;
    }
    const parsed = parseOrderText(text);
    if (parsed.length === 0) {
      toast.error('未能识别出产品，请按每行一条补充规格（如 300ml×2瓶）后重试');
      return;
    }
    const newRows: BatchRow[] = parsed.map((p, i) => ({
      ...createEmptyRow(rows.length + i),
      ...p,
    }));
    setRows((prev) => {
      const kept = prev.filter((r) => r.name.trim() || r.perVolume > 0);
      return [...kept, ...newRows];
    });
    setParseText('');
    toast.success(`本地识别出 ${parsed.length} 个产品，请核对后保存，识别不到的字段可手动补填`);
  };

  const updateRow = (key: string, patch: Partial<BatchRow>) => {
    setRows((prev) => prev.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  };

  const addRow = () => {
    setRows((prev) => [...prev, createEmptyRow(prev.length)]);
  };

  const removeRow = (key: string) => {
    setRows((prev) => (prev.length <= 1 ? prev : prev.filter((r) => r.key !== key)));
  };

  const addTemplateRows = () => {
    const templates: Partial<BatchRow>[] = [
      { brand: 'AWESS', category: 'toner', perVolume: 300, volumeUnit: 'ml', packUnit: '瓶', purchaseCount: 1, purchasePrice: 0, purpose: '' },
      { brand: '英树 INGS', category: 'serum', perVolume: 60, volumeUnit: 'ml', packUnit: '瓶', purchaseCount: 1, purchasePrice: 0, purpose: '' },
      { brand: 'AWESS', category: 'cream', perVolume: 50, volumeUnit: 'g', packUnit: '瓶', purchaseCount: 1, purchasePrice: 0, purpose: '' },
      { brand: '英树 INGS', category: 'sunscreen', perVolume: 50, volumeUnit: 'ml', packUnit: '支', purchaseCount: 1, purchasePrice: 0, purpose: '' },
      { brand: '英树 INGS', category: 'perfume', perVolume: 50, volumeUnit: 'ml', packUnit: '瓶', purchaseCount: 1, purchasePrice: 0, purpose: '' },
    ];
    const newRows = templates.map((tpl, i) => ({
      ...createEmptyRow(rows.length + i),
      ...tpl,
    }));
    setRows((prev) => [...prev, ...newRows]);
    toast.success('已添加 5 条模板行');
  };

  const allSelected = rows.length > 0 && rows.every((r) => r.selected);

  const toggleSelectAll = (checked: boolean) => {
    setRows((prev) => prev.map((r) => ({ ...r, selected: checked })));
  };

  const validCount = useMemo(
    () => rows.filter((r) => r.selected && r.name.trim() && r.perVolume > 0).length,
    [rows],
  );
  const emptyCount = useMemo(
    () => rows.filter((r) => r.selected && !(r.name.trim() && r.perVolume > 0)).length,
    [rows],
  );

  // 合并支付：根据所选方式确定参与分摊的行（仅勾选、非赠品）
  const allocTargets = useMemo(() => {
    const base = rows.filter((r) => r.selected && !r.isGift);
    if (allocMode === 'listPrice') return base.filter((r) => r.listPrice > 0);
    if (allocMode === 'volume') return base.filter((r) => totalOf(r) > 0);
    return base;
  }, [rows, allocMode]);

  // 每行权重与总权重
  const weightOf = (r: BatchRow) =>
    allocMode === 'volume' ? totalOf(r) : allocMode === 'listPrice' ? r.listPrice : 1;
  const totalWeight = useMemo(
    () => Math.round(allocTargets.reduce((s, r) => s + weightOf(r), 0) * 100) / 100,
    [allocTargets, allocMode],
  );
  // 当前参与行的实付合计（分摊后应等于输入总额）
  const allocatedSum = useMemo(
    () => Math.round(allocTargets.reduce((sum, r) => sum + r.purchasePrice, 0) * 100) / 100,
    [allocTargets],
  );
  const allocModeHint = {
    listPrice: '按每行参考价（划线价）占比分摊，最贴近实际折扣，需先在“参考价”列填各产品原价',
    volume: '按每行总容量（ml/g）占比分摊，适合同类同单位产品',
    average: '总额在参与产品间平均分摊，每件实付相同',
  } as const;

  // 把一笔合并支付总额按所选方式分摊到参与行的实付金额（末行补差，保证合计=总额）
  const handleAllocate = () => {
    const amount = Math.round((parseFloat(mergedAmount) || 0) * 100) / 100;
    if (!amount || amount <= 0) {
      toast.error('请输入有效的合并支付总额');
      return;
    }
    if (allocTargets.length === 0 || totalWeight <= 0) {
      toast.error(
        allocMode === 'listPrice'
          ? '当前没有可分摊的产品：请先在“参考价”列填写各产品原价（或改用平均分摊）'
          : allocMode === 'volume'
            ? '当前没有可分摊的产品：需要 ml/g 规格且非赠品（或改用平均分摊）'
            : '暂无可分摊的产品，请先勾选至少一个非赠品产品',
      );
      return;
    }
    const targetKeys = new Set(allocTargets.map((r) => r.key));
    let allocated = 0;
    setRows((prev) =>
      prev.map((r) => {
        if (!targetKeys.has(r.key)) return r;
        const isLast = allocTargets.findIndex((x) => x.key === r.key) === allocTargets.length - 1;
        if (isLast) {
          const rest = Math.round((amount - allocated) * 100) / 100;
          return { ...r, purchasePrice: rest };
        }
        const share = Math.round((amount * weightOf(r)) / totalWeight * 100) / 100;
        allocated += share;
        return { ...r, purchasePrice: share };
      }),
    );
    toast.success(`已${allocMode === 'average' ? '平均' : '按比例'}把 ${amount} 元分摊到 ${allocTargets.length} 个产品，见“实付金额”列`);
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const validRows = rows.filter((r) => r.selected && r.name.trim() && r.perVolume > 0);
    if (validRows.length === 0) {
      toast.error('请至少填写一条有效产品信息');
      return;
    }

    const payload = validRows.map((r) => {
      const totalVolumeMl = totalOf(r);
      const unitPrice =
        totalVolumeMl > 0 && r.purchasePrice > 0
          ? Math.round((r.purchasePrice / totalVolumeMl) * 100) / 100
          : 0;
      return {
        name: r.name.trim(),
        brand: r.brand.trim() || undefined,
        category: r.category,
        volume: formatVolume(r),
        totalVolumeMl,
        volumeUnit: r.volumeUnit,
        purchaseCount: r.purchaseCount,
        quantity: 100,
        purchasePrice: r.purchasePrice,
        unitPrice,
        purchaseDate: r.purchaseDate,
        openDate: r.purchaseDate,
        expiryDate: r.expiryDate,
        purpose: r.purpose.trim() || undefined,
        efficacies: r.efficacies.length > 0 ? r.efficacies : undefined,
        ingredients: r.ingredients.length > 0 ? r.ingredients : undefined,
        note: r.isGift ? '赠品' : undefined,
        isGift: r.isGift,
        isOpened: r.isOpened,
        isPaused: r.isPaused,
      };
    });

    const count = batchAddProducts(payload);
    toast.success(`成功录入 ${count} 条产品`);
    navigate('/inventory');
  };

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
            <ArrowLeft className="size-4 mr-1" />
            返回
          </Button>
          <div>
            <h1 className="text-2xl font-bold">批量录入</h1>
            <p className="text-sm text-muted-foreground mt-1">
              一次填写多条护肤品信息，快速导入库存
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="gap-1.5">
            <CheckCircle2 className="size-3 text-success" />
            已填写 {validCount} 条
          </Badge>
          {emptyCount > 0 && (
            <Badge variant="secondary" className="gap-1.5">
              <AlertCircle className="size-3" />
              待填写 {emptyCount} 条
            </Badge>
          )}
        </div>
      </div>

      {/* 本地分词识别录入（不调用 AI） */}
      <Card className="border-primary/30 bg-accent/30">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <ListChecks className="size-4 text-primary" />
            文字快速识别
            <Badge variant="secondary" className="ml-1 text-[11px] font-normal">
              本地分词 · 无需 AI
            </Badge>
          </CardTitle>
          <CardDescription>
            粘贴电商订单 / 交易快照文字（建议每行一条），本地按规则直接识别规格、数量、单位、品类、价格、日期与赠品标记并填入表格；识别不到的字段留空，可手动补填。全程在本机完成，不会调用 AI 或联网。
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Textarea
            value={parseText}
            onChange={(e) => setParseText(e.target.value)}
            placeholder={'示例（每行一条）：\nAWESS微晶水 300ml×2瓶 实付139元 2026-10-25\n英树纯物理防晒隔离霜 50ml×2支 139元\n英树唇冻 4g×2支 赠品'}
            rows={4}
            className="resize-y bg-background"
          />
          <div className="flex items-center gap-2">
            <Button onClick={handleLocalParse} disabled={!parseText.trim()}>
              <ListChecks className="size-4 mr-2" />
              识别并填入表格
            </Button>
            <span className="text-xs text-muted-foreground">
              支持识别 300ml / 50g / ×2瓶 / N支 / 原价·实付金额 / 日期 / 赠品 / 功效 / 主要成分（A醇、Retinol 等自动归一）
            </span>
          </div>
        </CardContent>
      </Card>

      {/* 合并支付分摊 */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Calculator className="size-4 text-primary" />
            合并支付分摊
          </CardTitle>
          <CardDescription>
            多件商品合并支付一笔总额时，先选分摊方式，再输入总额点“一键分摊”，结果会写入每行“实付金额”（最后一行自动补差，保证合计正好等于总额）。赠品不参与。
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-1.5">
            {(
              [
                { value: 'listPrice', label: '按参考价占比' },
                { value: 'volume', label: '按容量占比' },
                { value: 'average', label: '平均分摊' },
              ] as const
            ).map((m) => (
              <button
                key={m.value}
                type="button"
                onClick={() => setAllocMode(m.value)}
                aria-pressed={allocMode === m.value}
                className={`rounded-full border px-3 py-1 text-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 ${allocMode === m.value
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'border-border bg-background text-muted-foreground hover:text-foreground'
                  }`}
              >
                {m.label}
              </button>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">{allocModeHint[allocMode]}</p>
          <div className="flex flex-wrap items-end gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="merged-amount" className="text-xs text-muted-foreground">
                合并支付总额（元）
              </Label>
              <Input
                id="merged-amount"
                type="number"
                step="0.01"
                min={0}
                value={mergedAmount}
                onChange={(e) => setMergedAmount(e.target.value)}
                placeholder="如：765"
                className="h-9 w-40 text-sm tabular-nums"
              />
            </div>
            <Button type="button" onClick={handleAllocate} disabled={!mergedAmount.trim()}>
              <Calculator className="size-4 mr-2" />
              一键分摊
            </Button>
            <div className="text-xs text-muted-foreground pb-2">
              参与 <span className="text-foreground font-medium">{allocTargets.length}</span> 个产品 ·
              {allocMode === 'average'
                ? '每件均分' : allocMode === 'volume'
                  ? <>总容量 <span className="text-foreground font-medium tabular-nums">{totalWeight}</span> ml/g</>
                  : <>参考价合计 <span className="text-foreground font-medium tabular-nums">{totalWeight}</span> 元</>}
              {' · '}分摊后实付合计 <span className="text-foreground font-medium tabular-nums">{allocatedSum}</span> 元
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 快捷操作 */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">快捷操作</CardTitle>
          <CardDescription>快速添加模板行，或手动新增空白行</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button variant="secondary" onClick={addTemplateRows}>
            <Sparkles className="size-4 mr-2" />
            插入常用模板（5 条）
          </Button>
          <Button variant="outline" onClick={addRow}>
            <Plus className="size-4 mr-2" />
            新增一行
          </Button>
        </CardContent>
      </Card>

      {/* 批量录入表格 */}
      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Upload className="size-4 text-primary" />
              批量录入表格
            </CardTitle>
            <CardDescription>
              每行一条产品记录，勾选最前面的方框才会纳入本次录入；名称和规格容量为必填项；填规格数字、单位与数量后，总容量自动计算（= 规格 × 数量）；粘贴文字会自动识别功效与主要成分（如 A醇/Retinol 归一为视黄醇）。
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="w-full overflow-x-auto touch-pan-x">
              <table className="w-full min-w-[1420px] border-collapse">
                <thead>
                  <tr className="bg-muted/40 text-xs text-muted-foreground">
                    <th className="text-center font-medium px-2 py-2.5 w-10">
                      <div className="flex justify-center">
                        <Checkbox
                          checked={allSelected}
                          onCheckedChange={(v) => toggleSelectAll(v === true)}
                          aria-label="全选 / 取消全选"
                        />
                      </div>
                    </th>
                    <th className="text-left font-medium px-2 py-2.5 w-10">#</th>
                    <th className="text-left font-medium px-3 py-2.5 min-w-[180px]">
                      产品名称 <span className="text-destructive">*</span>
                    </th>
                    <th className="text-left font-medium px-3 py-2.5 min-w-[120px]">品牌</th>
                    <th className="text-left font-medium px-3 py-2.5 min-w-[110px]">品类</th>
                    <th className="text-left font-medium px-3 py-2.5 min-w-[120px]">
                      规格容量 <span className="text-destructive">*</span>
                    </th>
                    <th className="text-left font-medium px-3 py-2.5 w-20">单位</th>
                    <th className="text-left font-medium px-3 py-2.5 w-20">包装</th>
                    <th className="text-left font-medium px-3 py-2.5 w-16">数量</th>
                    <th className="text-left font-medium px-3 py-2.5 w-24">总容量</th>
                    <th className="text-left font-medium px-3 py-2.5 w-24">参考价</th>
                    <th className="text-left font-medium px-3 py-2.5 w-20">实付金额</th>
                    <th className="text-left font-medium px-3 py-2.5 w-28">购买日期</th>
                    <th className="text-left font-medium px-3 py-2.5 w-28">到期日</th>
                    <th className="text-left font-medium px-3 py-2.5 min-w-[160px]">功效/成分</th>
                    <th className="text-center font-medium px-3 py-2.5 w-16">开封</th>
                    <th className="text-center font-medium px-3 py-2.5 w-16">暂停</th>
                    <th className="text-center font-medium px-3 py-2.5 w-16">赠品</th>
                    <th className="text-center font-medium px-3 py-2.5 w-12">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, idx) => {
                    const total = totalOf(row);
                    return (
                      <tr
                        key={row.key}
                        className={`border-t border-border/40 hover:bg-muted/20 transition-colors ${row.selected ? '' : 'opacity-45'
                          }`}
                      >
                        <td className="px-3 py-2 text-center">
                          <div className="flex justify-center">
                            <Checkbox
                              checked={row.selected}
                              onCheckedChange={(v) =>
                                updateRow(row.key, { selected: v === true })
                              }
                              aria-label={`是否录入第 ${idx + 1} 行`}
                            />
                          </div>
                        </td>
                        <td className="px-3 py-2 text-xs text-muted-foreground tabular-nums">
                          {idx + 1}
                        </td>
                        <td className="px-2 py-2">
                          <Input
                            size={1}
                            value={row.name}
                            onChange={(e) => updateRow(row.key, { name: e.target.value })}
                            placeholder="如：平衡水"
                            className="h-9 text-sm"
                          />
                        </td>
                        <td className="px-2 py-2">
                          <Input
                            size={1}
                            value={row.brand}
                            onChange={(e) => updateRow(row.key, { brand: e.target.value })}
                            placeholder="品牌"
                            className="h-9 text-sm"
                          />
                        </td>
                        <td className="px-2 py-2">
                          <Select
                            value={row.category}
                            onValueChange={(v) =>
                              updateRow(row.key, {
                                category: v as ISkincareProduct['category'],
                              })
                            }
                          >
                            <SelectTrigger className="h-9 text-sm">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {allCategoryOptions.map((opt) => (
                                <SelectItem key={opt.value} value={opt.value}>
                                  {opt.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </td>
                        <td className="px-2 py-2">
                          <Input
                            size={1}
                            type="number"
                            min={0}
                            value={row.perVolume || ''}
                            onChange={(e) =>
                              updateRow(row.key, { perVolume: Number(e.target.value) || 0 })
                            }
                            placeholder="如：300"
                            className="h-9 text-sm tabular-nums"
                          />
                        </td>
                        <td className="px-2 py-2">
                          <Select
                            value={row.volumeUnit}
                            onValueChange={(v) =>
                              updateRow(row.key, { volumeUnit: v as VolumeUnit })
                            }
                          >
                            <SelectTrigger className="h-9 text-sm">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="ml">ml</SelectItem>
                              <SelectItem value="g">g</SelectItem>
                              <SelectItem value="pcs">件</SelectItem>
                              <SelectItem value="set">套</SelectItem>
                            </SelectContent>
                          </Select>
                        </td>
                        <td className="px-2 py-2">
                          <Select
                            value={row.packUnit}
                            onValueChange={(v) =>
                              updateRow(row.key, { packUnit: v as PackUnit })
                            }
                          >
                            <SelectTrigger className="h-9 text-sm">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {PACK_OPTIONS.map((p) => (
                                <SelectItem key={p} value={p}>
                                  {p}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </td>
                        <td className="px-2 py-2">
                          <Input
                            size={1}
                            type="number"
                            min={1}
                            value={row.purchaseCount}
                            onChange={(e) =>
                              updateRow(row.key, {
                                purchaseCount: Number(e.target.value) || 1,
                              })
                            }
                            className="h-9 text-sm tabular-nums w-16"
                          />
                        </td>
                        <td className="px-3 py-2">
                          <div className="px-1 text-sm tabular-nums text-muted-foreground">
                            {total > 0 ? (
                              <>
                                <span className="text-foreground font-medium">{total}</span>
                                <span className="ml-0.5">{UNIT_LABEL[row.volumeUnit]}</span>
                              </>
                            ) : (
                              <span>—</span>
                            )}
                          </div>
                        </td>
                        <td className="px-2 py-2">
                          <Input
                            size={1}
                            type="number"
                            step="0.01"
                            min={0}
                            value={row.listPrice || ''}
                            onChange={(e) =>
                              updateRow(row.key, {
                                listPrice: Number(e.target.value) || 0,
                              })
                            }
                            placeholder="原价"
                            className="h-9 text-sm tabular-nums text-muted-foreground"
                          />
                        </td>
                        <td className="px-2 py-2">
                          <Input
                            size={1}
                            type="number"
                            step="0.01"
                            min={0}
                            placeholder="选填"
                            value={row.purchasePrice || ''}
                            onChange={(e) =>
                              updateRow(row.key, {
                                purchasePrice: Number(e.target.value) || 0,
                              })
                            }
                            className="h-9 text-sm tabular-nums"
                          />
                        </td>
                        <td className="px-2 py-2">
                          <Input
                            size={1}
                            type="date"
                            value={row.purchaseDate}
                            onChange={(e) =>
                              updateRow(row.key, { purchaseDate: e.target.value })
                            }
                            className="h-9 text-sm"
                          />
                        </td>
                        <td className="px-2 py-2">
                          <Input
                            size={1}
                            type="date"
                            value={row.expiryDate}
                            onChange={(e) =>
                              updateRow(row.key, { expiryDate: e.target.value })
                            }
                            className="h-9 text-sm"
                          />
                        </td>
                        <td className="px-2 py-2">
                          <div className="flex flex-wrap items-center gap-1 min-w-[150px]">
                            {row.efficacies.slice(0, 2).map((ef) => (
                              <span
                                key={ef}
                                className="rounded-full bg-accent px-1.5 py-0.5 text-[10px] text-accent-foreground"
                              >
                                {ef}
                              </span>
                            ))}
                            {row.efficacies.length > 2 && (
                              <span className="text-[10px] text-muted-foreground">
                                +{row.efficacies.length - 2}
                              </span>
                            )}
                            {row.ingredients.slice(0, 1).map((ig) => (
                              <span
                                key={ig}
                                className="rounded-full border border-border bg-secondary px-1.5 py-0.5 text-[10px] text-secondary-foreground"
                              >
                                {ig}
                                {row.ingredients.length > 1 ? ` +${row.ingredients.length - 1}` : ''}
                              </span>
                            ))}
                            <Popover>
                              <PopoverTrigger asChild>
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  className="h-6 px-2 text-[11px] shrink-0"
                                >
                                  {row.efficacies.length + row.ingredients.length > 0 ? '改标签' : '+功效/成分'}
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent align="start" className="w-52 p-3">
                                <div className="space-y-2">
                                  <div className="text-xs font-medium text-foreground">功效（可叠加）</div>
                                  <div className="flex flex-col gap-1 max-h-52 overflow-y-auto">
                                    {allEfficacyOptions.map((ef) => {
                                      const checked = row.efficacies.includes(ef);
                                      return (
                                        <label
                                          key={ef}
                                          className="flex items-center gap-2 rounded-md px-1.5 py-1 text-xs cursor-pointer hover:bg-accent"
                                        >
                                          <Checkbox
                                            checked={checked}
                                            onCheckedChange={(v) =>
                                              updateRow(row.key, {
                                                efficacies:
                                                  v === true
                                                    ? [...row.efficacies, ef]
                                                    : row.efficacies.filter((x) => x !== ef),
                                              })
                                            }
                                          />
                                          {ef}
                                        </label>
                                      );
                                    })}
                                  </div>
                                  <div className="space-y-1">
                                    <div className="text-xs font-medium text-foreground">主要成分（可多选，A醇/Retinol 已归一）</div>
                                    <div className="flex flex-col gap-1 max-h-44 overflow-y-auto">
                                      {allIngredientOptions.map((ig) => {
                                        const checked = row.ingredients.includes(ig);
                                        return (
                                          <label
                                            key={ig}
                                            className="flex items-center gap-2 rounded-md px-1.5 py-1 text-xs cursor-pointer hover:bg-accent"
                                          >
                                            <Checkbox
                                              checked={checked}
                                              onCheckedChange={(v) =>
                                                updateRow(row.key, {
                                                  ingredients:
                                                    v === true
                                                      ? [...row.ingredients, ig]
                                                      : row.ingredients.filter((x) => x !== ig),
                                                })
                                              }
                                            />
                                            {ig}
                                          </label>
                                        );
                                      })}
                                    </div>
                                  </div>
                                  <div className="space-y-1">
                                    <div className="text-xs font-medium text-foreground">用途说明</div>
                                    <Textarea
                                      value={row.purpose}
                                      onChange={(e) =>
                                        updateRow(row.key, { purpose: e.target.value })
                                      }
                                      placeholder="使用场景、感受等"
                                      rows={2}
                                      className="text-xs"
                                    />
                                  </div>
                                </div>
                              </PopoverContent>
                            </Popover>
                          </div>
                        </td>
                        <td className="px-2 py-2 text-center">
                          <div className="flex justify-center">
                            <Switch
                              checked={row.isOpened}
                              onCheckedChange={(v) =>
                                updateRow(row.key, {
                                  isOpened: v,
                                  isPaused: v ? row.isPaused : false,
                                })
                              }
                            />
                          </div>
                        </td>
                        <td className="px-2 py-2 text-center">
                          <div className="flex justify-center">
                            <Switch
                              checked={row.isPaused}
                              onCheckedChange={(v) => updateRow(row.key, { isPaused: v })}
                              disabled={!row.isOpened}
                            />
                          </div>
                        </td>
                        <td className="px-2 py-2 text-center">
                          <div className="flex justify-center">
                            <Switch
                              checked={row.isGift}
                              onCheckedChange={(v) => updateRow(row.key, { isGift: v })}
                            />
                          </div>
                        </td>
                        <td className="px-2 py-2 text-center">
                          <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            onClick={() => removeRow(row.key)}
                            disabled={rows.length <= 1}
                            className="h-8 w-8 text-muted-foreground hover:text-destructive"
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* 底部操作栏 */}
        <div className="sticky bottom-0 z-30 mt-4 -mx-4 px-4 md:-mx-6 md:px-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-lg border border-border/60 bg-background/95 p-3 shadow-sm backdrop-blur-md">
            <div className="text-xs sm:text-sm text-muted-foreground">
              共 {rows.length} 行，其中 <span className="font-medium text-foreground">{validCount}</span> 条有效记录将被保存
            </div>
            <div className="flex items-center gap-2">
              <Button type="button" variant="outline" onClick={() => navigate('/inventory')} className="flex-1 sm:flex-none">
                取消
              </Button>
              <Button type="submit" disabled={validCount === 0} className="flex-1 sm:flex-none">
                <Upload className="size-4 mr-2" />
                批量保存
              </Button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
