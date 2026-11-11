import { useState, useMemo, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  Plus,
  Edit,
  Trash2,
  Clock,
  X,
  FlaskConical,
  Filter,
  Gift,
  Wallet,
  ListPlus,
  Check,
  Pencil,
  Tag,
} from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableHeader,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from '@/components/ui/dialog';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Switch } from '@/components/ui/switch';
import { useInventory } from '@/hooks/use-inventory';
import { useCustomOptions } from '@/hooks/use-custom-options';

import {
  CATEGORY_LABELS,
  STATUS_LABELS,
  STATUS_BADGE_VARIANTS,
  DEFAULT_CATEGORY_OPTIONS,
} from '@/lib/constants';
import type { ISkincareProduct, IUsageLog } from '@/data/products';

function getExpiryDays(expiryDate: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const expiry = new Date(expiryDate);
  expiry.setHours(0, 0, 0, 0);
  return Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

// 格式化单价显示
function formatUnitPrice(product: ISkincareProduct): string {
  if (!product || !product.unitPrice || product.unitPrice <= 0) return '-';
  const unit = product.volumeUnit === 'g' ? 'g' : 'ml';
  return `¥${product.unitPrice.toFixed(2)}/${unit}`;
}

export default function InventoryPage() {
  const navigate = useNavigate();
  const {
    products,
    addProduct,
    updateProduct,
    deleteProduct,
    addUsageLog,
    getUsageLogsByProduct,
  } = useInventory();

  // 动态选项（分类/功效/成分）
  const {
    allCategoryOptions,
    addCategory,
    removeCategory,
    customCategories,
    allEfficacyOptions,
    addEfficacy,
    removeEfficacy,
    customEfficacies,
    allIngredientOptions,
    addIngredient,
    removeIngredient,
    customIngredients,
  } = useCustomOptions();

  const [category, setCategory] = useState('all');
  const [status, setStatus] = useState('all');
  const [giftFilter, setGiftFilter] = useState('all'); // all / regular / gift
  const [keyword, setKeyword] = useState('');

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [sheetOpen, setSheetOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // 行内编辑模式的 product id（null 表示无行在编辑）
  const [inlineEditingId, setInlineEditingId] = useState<string | null>(null);
  // 行内编辑的临时数据副本
  const [inlineDraft, setInlineDraft] = useState<Partial<ISkincareProduct> | null>(null);

  // 新增分类弹窗
  const [addCategoryOpen, setAddCategoryOpen] = useState(false);
  const [addCategoryValue, setAddCategoryValue] = useState('');

  // 表单状态
  const [formData, setFormData] = useState({
    name: '',
    brand: '',
    category: 'toner' as ISkincareProduct['category'],
    volume: '',
    totalVolumeMl: 0,
    volumeUnit: 'ml' as ISkincareProduct['volumeUnit'],
    purchaseCount: 1,
    quantity: 100,
    purchasePrice: 0,
    unitPrice: 0,
    purchaseDate: '2026-10-25',
    openDate: '2026-10-25',
    expiryDate: '2029-10-25',
    purpose: '',
    efficacies: [] as string[],
    ingredients: [] as string[],
    note: '',
    isGift: false,
    isOpened: false,
    isPaused: false,
  });
  const [usageAmount, setUsageAmount] = useState(5);
  const [usageDate, setUsageDate] = useState(new Date().toISOString().slice(0, 10));
  const [usageNote, setUsageNote] = useState('');

  const filtered = useMemo(() => {
    return products.filter((p) => {
      if (category !== 'all' && p.category !== category) return false;
      if (status !== 'all' && p.status !== status) return false;
      if (giftFilter === 'regular' && p.isGift) return false;
      if (giftFilter === 'gift' && !p.isGift) return false;
      if (keyword) {
        const kw = keyword.toLowerCase();
        if (
          !p.name.toLowerCase().includes(kw) &&
          !(p.brand || '').toLowerCase().includes(kw) &&
          !(p.purpose || '').toLowerCase().includes(kw) &&
          !(p.efficacies || []).some((ef) => ef.toLowerCase().includes(kw)) &&
          !(p.ingredients || []).some((ig) => ig.toLowerCase().includes(kw))
        ) {
          return false;
        }
      }
      return true;
    });
  }, [products, category, status, giftFilter, keyword]);

  const selectedProduct = selectedId
    ? products.find((p) => p.id === selectedId) || null
    : null;
  const productUsageLogs = selectedId ? getUsageLogsByProduct(selectedId) : [];

  const resetForm = () => {
    setFormData({
      name: '',
      brand: '',
      category: 'toner',
      volume: '',
      totalVolumeMl: 0,
      volumeUnit: 'ml',
      purchaseCount: 1,
      quantity: 100,
      purchasePrice: 0,
      unitPrice: 0,
      purchaseDate: '2026-10-25',
      openDate: '2026-10-25',
      expiryDate: '2029-10-25',
      purpose: '',
      note: '',
      efficacies: [],
      ingredients: [],
      isGift: false,
      isOpened: false,
      isPaused: false,
    });
  };

  const handleAddClick = () => {
    resetForm();
    setDialogOpen(true);
  };

  const handleEditClick = (product: ISkincareProduct) => {
    setFormData({
      name: product.name,
      brand: product.brand || '',
      category: product.category,
      volume: product.volume,
      totalVolumeMl: product.totalVolumeMl,
      volumeUnit: product.volumeUnit,
      purchaseCount: product.purchaseCount,
      quantity: product.quantity,
      purchasePrice: product.purchasePrice,
      unitPrice: product.unitPrice,
      purchaseDate: product.purchaseDate,
      openDate: product.openDate,
      expiryDate: product.expiryDate,
      purpose: product.purpose || '',
      note: product.note || '',
      efficacies: product.efficacies || [],
      ingredients: product.ingredients || [],
      isGift: product.isGift,
      isOpened: product.isOpened,
      isPaused: product.isPaused,
    });
    setEditingId(product.id);
    setDialogOpen(true);
  };

  // 功效多选切换（可叠加）
  const toggleEfficacy = (ef: string) => {
    setFormData((prev) => ({
      ...prev,
      efficacies: prev.efficacies.includes(ef)
        ? prev.efficacies.filter((x) => x !== ef)
        : [...prev.efficacies, ef],
    }));
  };

  // 主要成分多选切换
  const toggleIngredient = (ig: string) => {
    setFormData((prev) => ({
      ...prev,
      ingredients: prev.ingredients.includes(ig)
        ? prev.ingredients.filter((x) => x !== ig)
        : [...prev.ingredients, ig],
    }));
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.volume || !formData.openDate || !formData.expiryDate) {
      toast.error('请填写完整信息');
      return;
    }

    // 自动计算单价
    let unitPrice = formData.unitPrice;
    if (formData.totalVolumeMl > 0 && formData.purchasePrice > 0) {
      unitPrice = Math.round((formData.purchasePrice / formData.totalVolumeMl) * 1000) / 1000;
    }

    const payload = { ...formData, unitPrice };

    if (editingId) {
      updateProduct(editingId, payload);
      toast.success('已更新');
    } else {
      addProduct(payload);
      toast.success('添加成功');
    }
    setDialogOpen(false);
    resetForm();
  };

  const handleDeleteConfirm = () => {
    if (deletingId) {
      deleteProduct(deletingId);
      toast.success('已删除');
    }
    setDeleteOpen(false);
    setDeletingId(null);
  };

  const handleRecordUsage = (e: FormEvent) => {
    e.preventDefault();
    if (!selectedId || !selectedProduct) return;
    if (usageAmount <= 0 || usageAmount > selectedProduct.quantity) {
      toast.error('使用量不合理');
      return;
    }

    addUsageLog({
      productId: selectedId,
      amount: usageAmount,
      usedAt: usageDate,
      note: usageNote,
    });

    toast.success('已记录使用');
    setUsageNote('');
    setUsageAmount(5);
  };

  const openUsageSheet = (product: ISkincareProduct) => {
    setSelectedId(product.id);
    setUsageAmount(5);
    setUsageDate(new Date().toISOString().slice(0, 10));
    setUsageNote('');
    setSheetOpen(true);
  };

  // ============ 行内编辑 ============
  const startInlineEdit = (product: ISkincareProduct) => {
    setInlineEditingId(product.id);
    setInlineDraft({ ...product });
  };

  const saveInlineEdit = () => {
    if (!inlineEditingId || !inlineDraft) return;
    const p = products.find((x) => x.id === inlineEditingId);
    if (!p) return;
    const merged = { ...p, ...inlineDraft };
    updateProduct(inlineEditingId, merged);
    toast.success('已保存');
    setInlineEditingId(null);
    setInlineDraft(null);
  };

  const cancelInlineEdit = () => {
    setInlineEditingId(null);
    setInlineDraft(null);
  };

  // ============ 新增分类 ============
  const handleAddCategory = () => {
    const ok = addCategory(addCategoryValue);
    if (ok) {
      toast.success(`已添加分类：${addCategoryValue}`);
      setAddCategoryValue('');
      setAddCategoryOpen(false);
    } else {
      toast.error('分类已存在或名称无效');
    }
  };

  // ============ Dialog 内动态新增功效/成分 ============
  const [newEfficacyInput, setNewEfficacyInput] = useState('');
  const [newIngredientInput, setNewIngredientInput] = useState('');

  const handleAddNewEfficacy = () => {
    const ok = addEfficacy(newEfficacyInput);
    if (ok) {
      // 自动勾选新添加的功效
      setFormData((prev) => ({
        ...prev,
        efficacies: [...prev.efficacies, newEfficacyInput.trim()],
      }));
      toast.success(`已添加功效：${newEfficacyInput}`);
      setNewEfficacyInput('');
    } else {
      toast.error('功效已存在或名称无效');
    }
  };

  const handleAddNewIngredient = () => {
    const ok = addIngredient(newIngredientInput);
    if (ok) {
      setFormData((prev) => ({
        ...prev,
        ingredients: [...prev.ingredients, newIngredientInput.trim()],
      }));
      toast.success(`已添加成分：${newIngredientInput}`);
      setNewIngredientInput('');
    } else {
      toast.error('成分已存在或名称无效');
    }
  };

  // ============ 分类 label 查找（支持动态自定义） ============
  const getCategoryLabel = (value: string): string => {
    const match = allCategoryOptions.find((o) => o.value === value);
    return match?.label ?? CATEGORY_LABELS[value] ?? value;
  };

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">库存管理</h1>
          <p className="text-sm text-muted-foreground mt-1">
            管理你的护肤品，记录使用，追踪保质期
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => navigate('/batch-import')}>
            <ListPlus className="size-4 mr-2" />
            批量录入
          </Button>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={handleAddClick}>
                <Plus className="size-4 mr-2" />
                添加产品
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[560px] max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingId ? '编辑产品' : '添加产品'}</DialogTitle>
                <DialogDescription>
                  填写产品信息，系统将自动计算保质期状态和单价
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">产品名称 *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="如：油橄榄节律平衡水"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="brand">品牌</Label>
                    <Input
                      id="brand"
                      value={formData.brand}
                      onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                      placeholder="如：英树 INGS"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>分类 *</Label>
                    <Select
                      value={formData.category}
                      onValueChange={(v) =>
                        setFormData({
                          ...formData,
                          category: v as ISkincareProduct['category'],
                        })
                      }
                    >
                      <SelectTrigger>
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
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="volume">容量规格 *</Label>
                    <Input
                      id="volume"
                      value={formData.volume}
                      onChange={(e) => setFormData({ ...formData, volume: e.target.value })}
                      placeholder="如：300ml×2瓶"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="totalVolumeMl">总容量 (ml/g)</Label>
                    <Input
                      id="totalVolumeMl"
                      type="number"
                      min={0}
                      value={formData.totalVolumeMl}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          totalVolumeMl: Number(e.target.value),
                        })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>容量单位</Label>
                    <Select
                      value={formData.volumeUnit}
                      onValueChange={(v) =>
                        setFormData({
                          ...formData,
                          volumeUnit: v as ISkincareProduct['volumeUnit'],
                        })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ml">ml</SelectItem>
                        <SelectItem value="g">g</SelectItem>
                        <SelectItem value="pcs">片/颗/件</SelectItem>
                        <SelectItem value="set">套/盒</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="purchaseCount">购买数量 (件)</Label>
                    <Input
                      id="purchaseCount"
                      type="number"
                      min={1}
                      value={formData.purchaseCount}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          purchaseCount: Number(e.target.value),
                        })
                      }
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="purchasePrice">
                      {formData.isGift ? '标注价值 (元)' : '实付金额 (元)'}
                    </Label>
                    <Input
                      id="purchasePrice"
                      type="number"
                      step="0.01"
                      min={0}
                      value={formData.purchasePrice}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          purchasePrice: Number(e.target.value),
                        })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>每{formData.volumeUnit === 'g' ? 'g' : 'ml'}单价（自动计算）</Label>
                    <div className="h-10 px-3 rounded-md border border-input bg-muted/30 flex items-center text-sm text-muted-foreground">
                      {formData.totalVolumeMl > 0 && formData.purchasePrice > 0
                        ? `¥${(formData.purchasePrice / formData.totalVolumeMl).toFixed(2)}`
                        : '—'}
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="purchaseDate">购买日期</Label>
                    <Input
                      id="purchaseDate"
                      type="date"
                      value={formData.purchaseDate}
                      onChange={(e) =>
                        setFormData({ ...formData, purchaseDate: e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="quantity">剩余数量 (%)</Label>
                    <Input
                      id="quantity"
                      type="number"
                      min={0}
                      max={100}
                      value={formData.quantity}
                      onChange={(e) =>
                        setFormData({ ...formData, quantity: Number(e.target.value) })
                      }
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="openDate">开封日期 *</Label>
                    <Input
                      id="openDate"
                      type="date"
                      value={formData.openDate}
                      onChange={(e) => setFormData({ ...formData, openDate: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="expiryDate">保质期到期日 *</Label>
                    <Input
                      id="expiryDate"
                      type="date"
                      value={formData.expiryDate}
                      onChange={(e) =>
                        setFormData({ ...formData, expiryDate: e.target.value })
                      }
                    />
                  </div>
                </div>
                <div className="flex items-center gap-3 py-2">
                  <Switch
                    id="isOpened"
                    checked={formData.isOpened}
                    onCheckedChange={(v) => {
                      setFormData({ ...formData, isOpened: v, isPaused: v ? formData.isPaused : false });
                    }}
                  />
                  <Label htmlFor="isOpened" className="cursor-pointer">
                    已开封
                  </Label>
                </div>
                <div className="flex items-center gap-3 py-2">
                  <Switch
                    id="isPaused"
                    checked={formData.isPaused}
                    onCheckedChange={(v) => setFormData({ ...formData, isPaused: v })}
                    disabled={!formData.isOpened}
                  />
                  <Label
                    htmlFor="isPaused"
                    className={!formData.isOpened ? 'cursor-not-allowed text-muted-foreground' : 'cursor-pointer'}
                  >
                    暂停使用
                  </Label>
                </div>
                <div className="flex items-center gap-3 py-2">
                  <Switch
                    id="isGift"
                    checked={formData.isGift}
                    onCheckedChange={(v) => setFormData({ ...formData, isGift: v })}
                  />
                  <Label htmlFor="isGift" className="cursor-pointer">
                    赠品/中样
                  </Label>
                </div>
                <div className="space-y-2">
                  <Label>功效（可多选叠加）</Label>
                  <div className="flex flex-wrap gap-1.5">
                    {allEfficacyOptions.map((ef) => {
                      const active = formData.efficacies.includes(ef);
                      return (
                        <button
                          key={ef}
                          type="button"
                          onClick={() => toggleEfficacy(ef)}
                          aria-pressed={active}
                          className={`rounded-full border px-3 py-1 text-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 ${active
                            ? 'border-primary bg-primary text-primary-foreground'
                            : 'border-border bg-background text-muted-foreground hover:border-primary/40 hover:text-foreground'
                            }`}
                        >
                          {ef}
                        </button>
                      );
                    })}
                  </div>
                  <div className="flex gap-2 pt-1">
                    <Input
                      size={1}
                      value={newEfficacyInput}
                      onChange={(e) => setNewEfficacyInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddNewEfficacy();
                        }
                      }}
                      placeholder="输入自定义功效，回车添加"
                      className="h-8 text-xs"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-8 text-xs"
                      onClick={handleAddNewEfficacy}
                    >
                      <Plus className="size-3 mr-1" />
                      新增
                    </Button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>主要成分（可多选，支持 A醇/Retinol 等别名）</Label>
                  <div className="flex flex-wrap gap-1.5">
                    {allIngredientOptions.map((ig) => {
                      const active = formData.ingredients.includes(ig);
                      return (
                        <button
                          key={ig}
                          type="button"
                          onClick={() => toggleIngredient(ig)}
                          aria-pressed={active}
                          className={`rounded-full border px-3 py-1 text-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 ${active
                            ? 'border-secondary-foreground bg-secondary text-secondary-foreground'
                            : 'border-border bg-background text-muted-foreground hover:border-secondary-foreground/40 hover:text-foreground'
                            }`}
                        >
                          {ig}
                        </button>
                      );
                    })}
                  </div>
                  <div className="flex gap-2 pt-1">
                    <Input
                      size={1}
                      value={newIngredientInput}
                      onChange={(e) => setNewIngredientInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddNewIngredient();
                        }
                      }}
                      placeholder="输入自定义成分，回车添加"
                      className="h-8 text-xs"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-8 text-xs"
                      onClick={handleAddNewIngredient}
                    >
                      <Plus className="size-3 mr-1" />
                      新增
                    </Button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="purpose">用途描述</Label>
                  <Textarea
                    id="purpose"
                    value={formData.purpose}
                    onChange={(e) => setFormData({ ...formData, purpose: e.target.value })}
                    placeholder="产品功效、使用场景等"
                    rows={2}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="note">备注</Label>
                  <Textarea
                    id="note"
                    value={formData.note}
                    onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                    placeholder="使用感受、注意事项等"
                    rows={2}
                  />
                </div>
                <DialogFooter>
                  <DialogClose asChild>
                    <Button type="button" variant="secondary">
                      取消
                    </Button>
                  </DialogClose>
                  <Button type="submit">{editingId ? '保存' : '添加'}</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* 筛选区 */}
      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="flex flex-wrap items-center gap-3">
            <Tabs
              value={category}
              onValueChange={setCategory}
              className="flex-1 min-w-0"
            >
              <TabsList className="flex flex-wrap h-auto">
                <TabsTrigger value="all">全部</TabsTrigger>
                {allCategoryOptions.map((opt) => (
                  <TabsTrigger key={opt.value} value={opt.value}>
                    {opt.label}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
            <Dialog open={addCategoryOpen} onOpenChange={setAddCategoryOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="shrink-0">
                  <Tag className="size-4 mr-1" />
                  管理分类
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>分类管理</DialogTitle>
                  <DialogDescription>
                    新增你自己的产品分类，系统默认分类不可删除
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="flex gap-2">
                    <Input
                      value={addCategoryValue}
                      onChange={(e) => setAddCategoryValue(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleAddCategory();
                      }}
                      placeholder="输入新分类名，如：眼部护理"
                    />
                    <Button onClick={handleAddCategory}>
                      <Plus className="size-4 mr-1" />
                      添加
                    </Button>
                  </div>
                  {customCategories.length > 0 && (
                    <div className="space-y-2">
                      <div className="text-xs font-medium text-muted-foreground">
                        我的自定义分类
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {customCategories.map((label) => (
                          <div
                            key={label}
                            className="inline-flex items-center gap-1 rounded-full border border-border bg-accent/50 px-2.5 py-1 text-xs"
                          >
                            {label}
                            <button
                              type="button"
                              className="text-muted-foreground hover:text-destructive"
                              onClick={() => {
                                removeCategory(label);
                                toast.success('已删除自定义分类');
                              }}
                              aria-label={`删除分类 ${label}`}
                            >
                              <X className="size-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  <div className="space-y-2">
                    <div className="text-xs font-medium text-muted-foreground">
                      系统默认分类（不可删除）
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {DEFAULT_CATEGORY_OPTIONS.map((opt) => (
                        <span
                          key={opt.value}
                          className="rounded-full border border-border/60 px-2.5 py-1 text-xs text-muted-foreground"
                        >
                          {opt.label}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <DialogClose asChild>
                    <Button type="button" variant="secondary">
                      关闭
                    </Button>
                  </DialogClose>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 shrink-0">
              <Filter className="size-4 text-muted-foreground" />
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="状态筛选" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部状态</SelectItem>
                  <SelectItem value="unopened_sealed">未开封全新</SelectItem>
                  <SelectItem value="opened_unused">已开封未使用</SelectItem>
                  <SelectItem value="opened_in_use">已开封使用中</SelectItem>
                  <SelectItem value="opened_paused">已开封暂停使用</SelectItem>
                  <SelectItem value="expired">已过期</SelectItem>
                  <SelectItem value="used_up">已用完</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Gift className="size-4 text-muted-foreground" />
              <Select value={giftFilter} onValueChange={setGiftFilter}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="赠品筛选" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">正装+赠品</SelectItem>
                  <SelectItem value="regular">仅正装</SelectItem>
                  <SelectItem value="gift">仅赠品/中样</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="relative w-full md:w-64 shrink-0 ml-auto">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="search"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                placeholder="搜索名称/品牌/用途"
                className="bg-background pl-9"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 列表表格 */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">
            产品列表
            <span className="text-sm font-normal text-muted-foreground ml-2">
              共 {filtered.length} 件
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {filtered.length === 0 ? (
            <div className="py-16 text-center">
              <FlaskConical className="size-12 mx-auto text-muted-foreground/40 mb-3" />
              <p className="text-muted-foreground">暂无匹配的产品</p>
              <Button variant="secondary" size="sm" className="mt-4" onClick={handleAddClick}>
                <Plus className="size-4 mr-2" />
                添加产品
              </Button>
            </div>
          ) : (
            <>
              {/* 桌面端：表格视图 */}
              <div className="w-full overflow-x-auto hidden md:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="whitespace-nowrap">产品名称</TableHead>
                      <TableHead className="whitespace-nowrap">分类</TableHead>
                      <TableHead className="whitespace-nowrap">品牌</TableHead>
                      <TableHead className="whitespace-nowrap">容量规格</TableHead>
                      <TableHead className="whitespace-nowrap">实付/单价</TableHead>
                      <TableHead className="whitespace-nowrap min-w-[160px]">剩余量</TableHead>
                      <TableHead className="whitespace-nowrap">保质期</TableHead>
                      <TableHead className="whitespace-nowrap">状态</TableHead>
                      <TableHead className="whitespace-nowrap text-right">操作</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map((p) => {
                      const days = getExpiryDays(p.expiryDate);
                      const isEditing = inlineEditingId === p.id;
                      const draft = (isEditing && inlineDraft) || null;

                      return (
                        <TableRow key={p.id} className={isEditing ? 'bg-accent/30' : ''}>
                          {isEditing && draft ? (
                            // ============ 行内编辑模式 ============
                            <>
                              <TableCell className="p-2">
                                <Input
                                  size={1}
                                  value={draft.name || ''}
                                  onChange={(e) =>
                                    setInlineDraft((d) => d && { ...d, name: e.target.value })
                                  }
                                  className="h-8 text-sm"
                                />
                              </TableCell>
                              <TableCell className="p-2">
                                <Select
                                  value={draft.category || 'other'}
                                  onValueChange={(v) =>
                                    setInlineDraft((d) => d && { ...d, category: v as any })
                                  }
                                >
                                  <SelectTrigger className="h-8 text-sm">
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
                              </TableCell>
                              <TableCell className="p-2">
                                <Input
                                  size={1}
                                  value={draft.brand || ''}
                                  onChange={(e) =>
                                    setInlineDraft((d) => d && { ...d, brand: e.target.value })
                                  }
                                  className="h-8 text-sm"
                                />
                              </TableCell>
                              <TableCell className="p-2">
                                <Input
                                  size={1}
                                  value={draft.volume || ''}
                                  onChange={(e) =>
                                    setInlineDraft((d) => d && { ...d, volume: e.target.value })
                                  }
                                  className="h-8 text-sm"
                                  placeholder="如：300ml×2瓶"
                                />
                              </TableCell>
                              <TableCell className="p-2">
                                <Input
                                  size={1}
                                  type="number"
                                  step="0.01"
                                  min={0}
                                  value={draft.purchasePrice || 0}
                                  onChange={(e) =>
                                    setInlineDraft((d) => d && { ...d, purchasePrice: Number(e.target.value) })
                                  }
                                  className="h-8 text-sm tabular-nums w-24"
                                />
                              </TableCell>
                              <TableCell className="p-2">
                                <div className="flex items-center gap-2">
                                  <Input
                                    size={1}
                                    type="number"
                                    min={0}
                                    max={100}
                                    value={draft.quantity || 0}
                                    onChange={(e) =>
                                      setInlineDraft((d) => d && { ...d, quantity: Number(e.target.value) })
                                    }
                                    className="h-8 text-sm tabular-nums w-20"
                                  />
                                  <span className="text-xs text-muted-foreground">%</span>
                                </div>
                              </TableCell>
                              <TableCell className="p-2">
                                <Input
                                  size={1}
                                  type="date"
                                  value={draft.expiryDate || ''}
                                  onChange={(e) =>
                                    setInlineDraft((d) => d && { ...d, expiryDate: e.target.value })
                                  }
                                  className="h-8 text-sm"
                                />
                              </TableCell>
                              <TableCell className="p-2">
                                <div className="text-xs text-muted-foreground">
                                  {STATUS_LABELS[p.status]}
                                </div>
                              </TableCell>
                              <TableCell className="text-right whitespace-nowrap p-2">
                                <div className="flex items-center justify-end gap-1">
                                  <Button size="sm" className="h-8 px-2" onClick={saveInlineEdit}>
                                    <Check className="size-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 px-2 text-muted-foreground"
                                    onClick={cancelInlineEdit}
                                  >
                                    <X className="size-4" />
                                  </Button>
                                </div>
                              </TableCell>
                            </>
                          ) : (
                            // ============ 查看模式（原有逻辑） ============
                            <>
                              <TableCell className="font-medium">
                                <div className="flex items-center gap-2 min-w-0">
                                  <span className="block max-w-[200px] truncate">
                                    {p.name}
                                  </span>
                                  {p.isGift && (
                                    <Badge
                                      variant="secondary"
                                      className="shrink-0 text-[10px] px-1.5 py-0 h-5"
                                    >
                                      赠品
                                    </Badge>
                                  )}
                                </div>
                                {p.purpose && (
                                  <div className="text-xs text-muted-foreground mt-1 max-w-[240px] truncate">
                                    {p.purpose}
                                  </div>
                                )}
                                {p.efficacies && p.efficacies.length > 0 && (
                                  <div className="flex flex-wrap gap-1 mt-1.5">
                                    {p.efficacies.slice(0, 3).map((ef) => (
                                      <span
                                        key={ef}
                                        className="rounded-full bg-accent px-1.5 py-0.5 text-[10px] text-accent-foreground"
                                      >
                                        {ef}
                                      </span>
                                    ))}
                                    {p.efficacies.length > 3 && (
                                      <span className="text-[10px] leading-5 text-muted-foreground">
                                        +{p.efficacies.length - 3}
                                      </span>
                                    )}
                                  </div>
                                )}
                              </TableCell>
                              <TableCell>
                                <Badge variant="outline">
                                  {getCategoryLabel(p.category)}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <span className="block max-w-[120px] truncate">
                                  {p.brand || '-'}
                                </span>
                              </TableCell>
                              <TableCell className="whitespace-nowrap text-sm">
                                {p.volume}
                                {p.purchaseCount > 1 && (
                                  <div className="text-xs text-muted-foreground">
                                    ×{p.purchaseCount}件
                                  </div>
                                )}
                              </TableCell>
                              <TableCell>
                                <div className="text-sm font-medium tabular-nums">
                                  ¥{(p.purchasePrice || 0).toFixed(2)}
                                </div>
                                <div className="text-xs text-muted-foreground tabular-nums">
                                  {formatUnitPrice(p)}
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-2 min-w-[140px]">
                                  <Progress value={p.quantity} className="h-2 flex-1" />
                                  <span className="text-xs text-muted-foreground tabular-nums w-10 text-right shrink-0">
                                    {p.quantity}%
                                  </span>
                                </div>
                              </TableCell>
                              <TableCell className="whitespace-nowrap">
                                <div>{p.expiryDate}</div>
                                <div className="text-xs text-muted-foreground">
                                  {p.status === 'expired'
                                    ? `已过期 ${Math.abs(days)} 天`
                                    : `还剩 ${days} 天`}
                                </div>
                              </TableCell>
                              <TableCell>
                                <Badge variant={STATUS_BADGE_VARIANTS[p.status]}>
                                  {STATUS_LABELS[p.status]}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-right whitespace-nowrap">
                                <div className="flex items-center justify-end gap-1">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 px-2"
                                    onClick={() => openUsageSheet(p)}
                                  >
                                    <Clock className="size-4 mr-1" />
                                    记录使用
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 px-2 text-primary"
                                    onClick={() => startInlineEdit(p)}
                                  >
                                    <Pencil className="size-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 px-2"
                                    onClick={() => handleEditClick(p)}
                                  >
                                    <Edit className="size-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 px-2 text-destructive hover:text-destructive"
                                    onClick={() => {
                                      setDeletingId(p.id);
                                      setDeleteOpen(true);
                                    }}
                                  >
                                    <Trash2 className="size-4" />
                                  </Button>
                                </div>
                              </TableCell>
                            </>
                          )}
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>

              {/* 移动端：卡片视图 */}
              <div className="md:hidden divide-y divide-border/50">
                {filtered.map((p) => {
                  const days = getExpiryDays(p.expiryDate);
                  const isEditing = inlineEditingId === p.id;
                  const draft = (isEditing && inlineDraft) || null;
                  return (
                    <div key={p.id} className={`p-4 ${isEditing ? 'bg-accent/30' : ''}`}>
                      {isEditing && draft ? (
                        // 行内编辑（卡片内）
                        <div className="space-y-3">
                          <Input
                            value={draft.name || ''}
                            onChange={(e) => setInlineDraft((d) => d && { ...d, name: e.target.value })}
                            placeholder="产品名称"
                            className="h-9"
                          />
                          <div className="grid grid-cols-2 gap-2">
                            <Select
                              value={draft.category || 'other'}
                              onValueChange={(v) => setInlineDraft((d) => d && { ...d, category: v as any })}
                            >
                              <SelectTrigger className="h-9 text-sm">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {allCategoryOptions.map((opt) => (
                                  <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <Input
                              value={draft.brand || ''}
                              onChange={(e) => setInlineDraft((d) => d && { ...d, brand: e.target.value })}
                              placeholder="品牌"
                              className="h-9"
                            />
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <Input
                              value={draft.volume || ''}
                              onChange={(e) => setInlineDraft((d) => d && { ...d, volume: e.target.value })}
                              placeholder="容量规格"
                              className="h-9 text-sm"
                            />
                            <Input
                              type="number"
                              step="0.01"
                              min={0}
                              value={draft.purchasePrice || 0}
                              onChange={(e) => setInlineDraft((d) => d && { ...d, purchasePrice: Number(e.target.value) })}
                              placeholder="实付金额"
                              className="h-9 text-sm tabular-nums"
                            />
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <div className="flex items-center gap-2">
                              <Input
                                type="number"
                                min={0}
                                max={100}
                                value={draft.quantity || 0}
                                onChange={(e) => setInlineDraft((d) => d && { ...d, quantity: Number(e.target.value) })}
                                className="h-9 text-sm tabular-nums"
                              />
                              <span className="text-xs text-muted-foreground">%</span>
                            </div>
                            <Input
                              type="date"
                              value={draft.expiryDate || ''}
                              onChange={(e) => setInlineDraft((d) => d && { ...d, expiryDate: e.target.value })}
                              className="h-9 text-sm"
                            />
                          </div>
                          <div className="flex gap-2 pt-1">
                            <Button size="sm" className="flex-1" onClick={saveInlineEdit}>
                              <Check className="size-4 mr-1" />保存
                            </Button>
                            <Button variant="ghost" size="sm" className="flex-1" onClick={cancelInlineEdit}>
                              <X className="size-4 mr-1" />取消
                            </Button>
                          </div>
                        </div>
                      ) : (
                        // 查看模式
                        <div className="space-y-2.5">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="font-medium text-sm">{p.name}</span>
                                {p.isGift && (
                                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4">赠品</Badge>
                                )}
                              </div>
                              {p.purpose && (
                                <div className="text-xs text-muted-foreground mt-0.5 truncate">{p.purpose}</div>
                              )}
                            </div>
                            <Badge variant={STATUS_BADGE_VARIANTS[p.status]} className="shrink-0">
                              {STATUS_LABELS[p.status]}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
                            <Badge variant="outline" className="text-[11px]">{getCategoryLabel(p.category)}</Badge>
                            {p.brand && <span>{p.brand}</span>}
                            <span>·</span>
                            <span>{p.volume}</span>
                          </div>
                          {p.efficacies && p.efficacies.length > 0 && (
                            <div className="flex flex-wrap gap-1">
                              {p.efficacies.slice(0, 4).map((ef) => (
                                <span key={ef} className="rounded-full bg-accent px-1.5 py-0.5 text-[10px] text-accent-foreground">{ef}</span>
                              ))}
                            </div>
                          )}
                          <div className="flex items-center gap-2">
                            <Progress value={p.quantity} className="h-2 flex-1" />
                            <span className="text-xs text-muted-foreground tabular-nums w-10 text-right shrink-0">{p.quantity}%</span>
                          </div>
                          <div className="flex items-center justify-between text-xs text-muted-foreground">
                            <span className="tabular-nums">¥{(p.purchasePrice || 0).toFixed(2)} · {formatUnitPrice(p)}</span>
                            <span>{p.status === 'expired' ? `已过期 ${Math.abs(days)} 天` : `还剩 ${days} 天`}</span>
                          </div>
                          <div className="flex items-center gap-1 pt-1">
                            <Button variant="outline" size="sm" className="h-8 flex-1 text-xs" onClick={() => openUsageSheet(p)}>
                              <Clock className="size-3.5 mr-1" />记录使用
                            </Button>
                            <Button variant="outline" size="sm" className="h-8 px-2 text-primary" onClick={() => startInlineEdit(p)}>
                              <Pencil className="size-4" />
                            </Button>
                            <Button variant="outline" size="sm" className="h-8 px-2" onClick={() => handleEditClick(p)}>
                              <Edit className="size-4" />
                            </Button>
                            <Button variant="ghost" size="sm" className="h-8 px-2 text-destructive hover:text-destructive" onClick={() => { setDeletingId(p.id); setDeleteOpen(true); }}>
                              <Trash2 className="size-4" />
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* 使用记录抽屉 */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="w-full sm:max-w-md overflow-y-auto">
          <SheetHeader>
            <SheetTitle>使用记录</SheetTitle>
            <SheetDescription>记录使用并查看历史</SheetDescription>
          </SheetHeader>

          {selectedProduct && (
            <div className="mt-6 space-y-6">
              {/* 产品信息 */}
              <div className="flex items-start gap-3 p-4 rounded-lg bg-muted/40">
                <div className="size-12 shrink-0 rounded-lg bg-primary/10 flex items-center justify-center">
                  <FlaskConical className="size-6 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate flex items-center gap-2">
                    <span className="truncate">{selectedProduct.name}</span>
                    {selectedProduct.isGift && (
                      <Badge variant="secondary" className="shrink-0 text-[10px] px-1.5 py-0 h-5">
                        赠品
                      </Badge>
                    )}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {selectedProduct.brand} · {selectedProduct.volume}
                  </div>
                  <div className="flex items-center gap-3 mt-2 text-xs">
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <Wallet className="size-3" />
                      <span className="tabular-nums">¥{(selectedProduct.purchasePrice || 0).toFixed(2)}</span>
                    </div>
                    <div className="text-muted-foreground tabular-nums">
                      {formatUnitPrice(selectedProduct)}
                    </div>
                  </div>
                  <div className="mt-3">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs text-muted-foreground">剩余</span>
                      <span className="text-xs font-medium tabular-nums">
                        {selectedProduct.quantity}%
                      </span>
                    </div>
                    <Progress value={selectedProduct.quantity} className="h-2" />
                  </div>
                </div>
              </div>

              {/* 功效标签 */}
              {selectedProduct.efficacies && selectedProduct.efficacies.length > 0 && (
                <div className="space-y-1">
                  <div className="text-xs font-medium text-foreground">功效</div>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedProduct.efficacies.map((ef) => (
                      <span
                        key={ef}
                        className="rounded-full bg-accent px-2.5 py-0.5 text-xs text-accent-foreground"
                      >
                        {ef}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* 主要成分 */}
              {selectedProduct.ingredients && selectedProduct.ingredients.length > 0 && (
                <div className="space-y-1">
                  <div className="text-xs font-medium text-foreground">主要成分</div>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedProduct.ingredients.map((ig) => (
                      <span
                        key={ig}
                        className="rounded-full border border-border bg-secondary px-2.5 py-0.5 text-xs text-secondary-foreground"
                      >
                        {ig}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* 用途描述 */}
              {selectedProduct.purpose && (
                <div className="p-3 rounded-lg border border-border/50 text-sm text-muted-foreground">
                  <div className="text-xs font-medium text-foreground mb-1">用途</div>
                  {selectedProduct.purpose}
                </div>
              )}

              {/* 快速记录 */}
              <form onSubmit={handleRecordUsage} className="space-y-3">
                <h3 className="font-medium text-sm">快速记录使用</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="usage-amount">使用量 (%)</Label>
                    <Input
                      id="usage-amount"
                      type="number"
                      min={1}
                      max={selectedProduct.quantity}
                      value={usageAmount}
                      onChange={(e) => setUsageAmount(Number(e.target.value))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="usage-date">使用日期</Label>
                    <Input
                      id="usage-date"
                      type="date"
                      value={usageDate}
                      onChange={(e) => setUsageDate(e.target.value)}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="usage-note">备注</Label>
                  <Textarea
                    id="usage-note"
                    value={usageNote}
                    onChange={(e) => setUsageNote(e.target.value)}
                    placeholder="使用感受、搭配等"
                    rows={2}
                  />
                </div>
                <Button
                  type="submit"
                  className="w-full"
                  disabled={selectedProduct.quantity <= 0}
                >
                  <Clock className="size-4 mr-2" />
                  记录使用
                </Button>
              </form>

              {/* 历史记录 */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-medium text-sm">历史记录</h3>
                  <span className="text-xs text-muted-foreground">
                    共 {productUsageLogs.length} 条
                  </span>
                </div>
                {productUsageLogs.length === 0 ? (
                  <div className="py-8 text-center text-sm text-muted-foreground">
                    暂无使用记录
                  </div>
                ) : (
                  <div className="relative">
                    <div className="absolute left-[11px] top-2 bottom-2 w-px bg-border" />
                    <div className="space-y-4">
                      {productUsageLogs.map((log) => (
                        <UsageTimelineItem key={log.id} log={log} />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* 删除确认 */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除</AlertDialogTitle>
            <AlertDialogDescription>
              删除后将同时移除该产品的所有使用记录，此操作不可恢复。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              确认删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function UsageTimelineItem({ log }: { log: IUsageLog }) {
  return (
    <div className="relative flex gap-3 pl-7">
      <div className="absolute left-0 top-1.5 size-[9px] rounded-full bg-primary border-2 border-background" />
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <span className="text-sm font-medium">使用 {log.amount}%</span>
          <span className="text-xs text-muted-foreground shrink-0">{log.usedAt}</span>
        </div>
        {log.note && (
          <p className="text-xs text-muted-foreground mt-1">{log.note}</p>
        )}
      </div>
    </div>
  );
}
