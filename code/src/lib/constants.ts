export const CATEGORY_LABELS: Record<string, string> = {
  cleanser: '洁面',
  toner: '爽肤水',
  serum: '精华',
  cream: '面霜',
  sunscreen: '防晒',
  mask: '面膜',
  makeup: '彩妆',
  lip_care: '唇部护理',
  hair_care: '护发',
  hair_body: '洗护',
  perfume: '香水',
  body_care: '身体护理',
  skincare_tool: '护肤工具',
  other: '其他',
};

export const STATUS_LABELS: Record<string, string> = {
  unopened_sealed: '未开封全新',
  opened_unused: '已开封未使用',
  opened_in_use: '已开封使用中',
  opened_paused: '已开封暂停使用',
  used_up: '已用完',
  expired: '已过期',
};

export const STATUS_BADGE_VARIANTS: Record<
  string,
  'default' | 'secondary' | 'outline' | 'destructive'
> = {
  unopened_sealed: 'secondary',
  opened_unused: 'outline',
  opened_in_use: 'default',
  opened_paused: 'secondary',
  used_up: 'outline',
  expired: 'destructive',
};

// 用于状态筛选的选项
export const STATUS_FILTER_OPTIONS = [
  { value: 'all', label: '全部' },
  { value: 'unopened_sealed', label: '未开封' },
  { value: 'opened_unused', label: '开封未用' },
  { value: 'opened_in_use', label: '使用中' },
  { value: 'opened_paused', label: '暂停使用' },
  { value: 'expired', label: '已过期' },
  { value: 'used_up', label: '已用完' },
];

/** 默认分类（系统内置，不可删除） */
export const DEFAULT_CATEGORY_OPTIONS = [
  { value: 'cleanser', label: '洁面' },
  { value: 'toner', label: '爽肤水' },
  { value: 'serum', label: '精华' },
  { value: 'cream', label: '面霜' },
  { value: 'sunscreen', label: '防晒' },
  { value: 'mask', label: '面膜' },
  { value: 'makeup', label: '彩妆' },
  { value: 'lip_care', label: '唇部护理' },
  { value: 'hair_care', label: '护发' },
  { value: 'hair_body', label: '洗护' },
  { value: 'perfume', label: '香水' },
  { value: 'body_care', label: '身体护理' },
  { value: 'skincare_tool', label: '护肤工具' },
  { value: 'other', label: '其他' },
] as const;

/** 分类选项（默认，兼容旧引用；运行时应使用 useCustomOptions().allCategoryOptions） */
export const CATEGORY_OPTIONS: { value: string; label: string }[] = [
  ...DEFAULT_CATEGORY_OPTIONS,
];

/** 默认功效标签（系统内置） */
export const DEFAULT_EFFICACY_OPTIONS = [
  '保湿',
  '补水',
  '抗老',
  '美白',
  '提亮',
  '淡斑',
  '控油',
  '祛痘',
  '舒缓',
  '修护',
  '抗氧化',
  '紧致',
  '收缩毛孔',
  '去角质',
  '防晒',
] as const;

/** 功效选项（默认值，兼容旧引用；运行时应使用 useCustomOptions().allEfficacyOptions） */
export const EFFICACY_OPTIONS: string[] = [...DEFAULT_EFFICACY_OPTIONS];

export type Efficacy = (typeof DEFAULT_EFFICACY_OPTIONS)[number];

/** 默认主要成分（系统内置） */
export const DEFAULT_INGREDIENT_OPTIONS = [
  '视黄醇',
  '视黄醛',
  '玻色因',
  '烟酰胺',
  '水杨酸',
  '果酸',
  '壬二酸',
  '维生素C',
  '玻尿酸',
  '泛醇',
  '神经酰胺',
  '胜肽',
  '熊果苷',
  '377',
  '油橄榄',
  '积雪草',
  '二裂酵母',
  '虾青素',
  '角鲨烷',
] as const;

/** 成分选项（默认值，兼容旧引用；运行时应使用 useCustomOptions().allIngredientOptions） */
export const INGREDIENT_OPTIONS: string[] = [...DEFAULT_INGREDIENT_OPTIONS];

export type Ingredient = (typeof DEFAULT_INGREDIENT_OPTIONS)[number];

// 标准成分名 → 常见别名 / 英文 / 俗称（识别时统一归一到标准名，如 A醇、Retinol → 视黄醇）
const INGREDIENT_ALIASES: Record<string, string[]> = {
  视黄醇: ['视黄醇', 'A醇', 'a醇', 'A 醇', '维A醇', '维a醇', 'Retinol', 'retinol', 'RETINOL'],
  视黄醛: ['视黄醛', 'A醛', 'a醛', 'Retinal', 'retinal'],
  玻色因: ['玻色因', '羟丙基四氢吡喃三醇', 'Pro-Xylane', 'proxylane', 'PRO-XYLANE'],
  烟酰胺: ['烟酰胺', '维生素B3', '维他命B3', 'Niacinamide', 'niacinamide', 'Nicotinamide'],
  水杨酸: ['水杨酸', 'BHA', 'bha'],
  果酸: ['果酸', 'AHA', 'aha', '甘醇酸', '乙醇酸', '乳酸', '杏仁酸'],
  壬二酸: ['壬二酸', '杜鹃花酸', 'Azelaic', 'azelaic'],
  维生素C: ['维生素C', '维他命C', 'VC', 'vc', '左旋C', '抗坏血酸', 'Ascorbic'],
  玻尿酸: ['玻尿酸', '透明质酸', '透明质酸钠', 'HA', 'ha', 'Hyaluronic', 'hyaluronic'],
  泛醇: ['泛醇', '维生素B5', '维他命B5', 'B5', 'b5', 'Panthenol', 'panthenol'],
  神经酰胺: ['神经酰胺', 'Ceramide', 'ceramide', 'CERAMIDE'],
  胜肽: ['胜肽', '多肽', '肽', 'Peptide', 'peptide'],
  熊果苷: ['熊果苷', 'Arbutin', 'arbutin'],
  '377': ['377', '苯乙基间苯二酚', '馨肤白', 'SymWhite'],
  油橄榄: ['油橄榄', '橄榄叶', 'Olive', 'olive'],
  积雪草: ['积雪草', '积雪草苷', 'Centella', 'centella', 'Cica', 'cica'],
  二裂酵母: ['二裂酵母', 'Bifida', 'bifida', '双歧酵母'],
  虾青素: ['虾青素', 'Astaxanthin', 'astaxanthin'],
  角鲨烷: ['角鲨烷', 'Squalane', 'squalane'],
};

// 从一段文本中提取主要成分，同义词统一归一为标准名（可命中多个）
export function matchIngredients(text: string): string[] {
  const hit: string[] = [];
  for (const standard of INGREDIENT_OPTIONS) {
    const aliases = INGREDIENT_ALIASES[standard] ?? [standard];
    if (aliases.some((alias) => text.includes(alias))) {
      hit.push(standard);
    }
  }
  return hit;
}
