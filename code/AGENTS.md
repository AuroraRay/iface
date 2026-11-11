# 个人护肤品存量管理系统 - 需求拆解文档

## 产品概述

- **产品类型**: 个人管理工具应用
- **场景类型**: <scene_type>prototype-app</scene_type>
- **目标用户**: 注重护肤、拥有多款护肤品、需要管理库存和保质期的个人用户
- **核心价值**: 帮助用户清晰掌握护肤品存量、分类与保质期，避免过期浪费，合理规划使用节奏
- **界面语言**: 中文
- **主题偏好**: 浅色
- **导航模式**: 路径导航
- **导航布局**: Sidebar（中后台/管理工具类应用范式，以 CRUD 和数据看板为主）

---

## 页面结构总览

> **说明**：围绕同一份库存数据 + 同一管理任务流，将核心功能收敛到 2 个一级页面 + 1 个概览区块，页面数精简、不做过度拆分。

| 页面名称 | 文件名 | 路由 | 页面类型 | 入口来源 |
|---------|-------|------|---------|---------|
| 库存概览 | `DashboardPage.tsx` | `/` | 一级 | 导航 |
| 库存管理 | `InventoryPage.tsx` | `/inventory` | 一级 | 导航 |

> **说明**：使用记录追踪作为库存管理页的抽屉/弹窗形式存在，不单独成页（同属库存管理任务流）；保质期提醒集成在概览 + 库存列表中，不单独成页。

---

## 页面布局建议

### 库存概览页（DashboardPage）
- **布局模式**: 上下分区 —— 顶部 KPI 卡片行 + 下方双栏（左图表 / 右提醒列表）
- **视觉重心**: 数据概览 + 保质期提醒（首屏突出即将过期产品，是用户最关心的信息）
- **结果承载区**: 图表区 + 即将过期列表；初始态为模拟数据直接展示（demo-mock）

### 库存管理页（InventoryPage）
- **布局模式**: 上下分区 —— 顶部筛选/搜索/新建栏 + 中部库存列表表格 + 底部分页
- **视觉重心**: 库存列表（核心操作区）
- **结果承载区**: 库存列表表格；初始态加载模拟数据，空态展示"暂无产品，点击添加"提示
- **次级承载区**: 点击产品行展开抽屉，展示使用记录时间轴 + 快速记录使用的表单

---

## 数据来源声明

| 数据/操作 | 来源类型 | 实现要求 | mock 兜底 |
|---|---|---|---|
| 护肤品库存列表 | demo-mock | `src/data/skincare.ts` 中定义 `MOCK_PRODUCTS` 数组，作为初始示例数据 | ✅ 本身就是 mock，含 12-15 条覆盖各分类的示例 |
| 库存数据持久化 | local-persist | localStorage key=`__app_skincare_inventory`，首次加载时合并 mock 初始数据，后续操作读写 localStorage | 无（首次访问自动用 mock 初始化） |
| 使用记录追踪 | local-persist | localStorage key=`__app_skincare_usage_logs`，与产品 id 关联，支持增删查 | 无（随 mock 产品附带 1-3 条历史使用记录） |
| 保质期提醒计算 | demo-mock | 前端根据 `expiryDate` 字段与当前日期计算剩余天数，分级（即将过期/已过期/正常） | ✅ 纯前端计算，基于 mock 数据 |
| 库存概览统计 | demo-mock | 前端基于库存列表聚合计算（总数、分类占比、过期数等） | ✅ 纯前端聚合 |
| 新增/编辑/删除产品 | local-persist | Dialog 表单提交后更新 localStorage 并刷新列表 | 无（操作成功后 toast 反馈） |
| 记录使用 | local-persist | 抽屉内快捷表单提交，新增使用记录并扣减存量 | 无（操作成功后 toast + 列表更新） |

---

## 导航配置

- **导航布局**: Sidebar（左侧侧边栏）
- **导航项**（仅一级页面）:
  | 导航文字 | 路由 | 图标 |
  |---------|------|------|
  | 库存概览 | `/` | LayoutDashboard |
  | 库存管理 | `/inventory` | Package |

---

## 功能列表

### 库存概览页（DashboardPage）

- **页面目标**: 一眼掌握护肤品库存全貌，重点关注保质期风险
- **功能点**:
  - **KPI 指标展示**: 展示产品总数、在用数量、即将过期数、已过期数 4 个核心指标卡片
  - **分类占比环形图**: 按洁面/水乳/精华/面霜/防晒等分类统计产品数量占比
  - **保质期提醒列表**: 按紧急程度排序展示即将过期（≤30天）和已过期产品，支持点击跳转至对应产品
  - **月度使用趋势图**: 展示最近 6 个月的使用记录数量趋势

### 库存管理页（InventoryPage）

- **页面目标**: 管理护肤品的增删改查、分类筛选、使用记录追踪
- **功能点**:

  - **分类筛选与搜索**: 顶部分类 Tab（全部/洁面/水乳/精华/面霜/防晒/其他）+ 关键词搜索框，快速定位产品
  - **库存列表展示**: 表格展示产品名称、分类、品牌、容量规格、剩余数量、开封日期、保质期、状态标签（正常/即将过期/已过期）
  - **新建产品**
    - 触发: 页面右上角 "添加产品" 按钮
    - 交互: 弹出 Dialog 表单，含产品名称、品牌、分类（Select）、容量规格（如 100ml）、数量、开封日期、保质期到期日、备注
    - 提交: `setProducts(prev => [...prev, newProduct])` + 写入 localStorage
    - 反馈: toast.success('添加成功') + 关闭 Dialog + 列表刷新
    - 数据契约: `ISkincareProduct` 含 id/name/brand/category/volume/quantity/openDate/expiryDate/note/status

  - **编辑与删除产品**
    - 触发: 表格行操作列 "编辑" / "删除" 按钮
    - 交互: 编辑弹出预填充表单的 Dialog；删除弹出确认 Dialog
    - 提交: 更新/移除对应记录并写入 localStorage
    - 反馈: toast.success('已更新' / '已删除') + 列表刷新
    - 数据契约: 同上

  - **记录使用**
    - 触发: 表格行 "记录使用" 按钮，打开右侧抽屉
    - 交互: 抽屉展示产品基本信息 + 快捷使用表单（使用量、使用日期、备注）+ 历史使用记录时间轴
    - 提交: 新增使用记录，扣减产品剩余数量，若数量归零自动标记为"用完"
    - 反馈: toast.success('已记录使用') + 列表数量更新 + 时间轴追加新记录
    - 数据契约: `IUsageLog` 含 id/productId/amount/usedAt/note

  - **保质期状态自动计算与标记**: 列表每行根据 `expiryDate` 与当前日期差值自动显示状态标签（绿色正常 / 橙色即将过期≤30天 / 红色已过期），支持按状态筛选

---

## 数据共享配置

| 存储键名 | 数据说明 | 使用页面 |
|---------|---------|---------|
| `__global_skincare_products` | 护肤品库存列表，类型为 `ISkincareProduct[]` | 库存概览页、库存管理页 |
| `__global_skincare_usage_logs` | 使用记录列表，类型为 `IUsageLog[]` | 库存概览页、库存管理页 |

```ts
interface ISkincareProduct {
  id: string;
  name: string;                 // 产品名称
  brand?: string;               // 品牌
  category: 'cleanser' | 'toner_lotion' | 'serum' | 'cream' | 'suncreen' | 'mask' | 'other'; // 分类
  volume: string;               // 容量规格，如 "100ml" / "50g"
  quantity: number;             // 剩余数量（按容量百分比或件数，统一用百分比 0-100 表示使用进度更直观，此处用剩余百分比 0-100）
  openDate: string;             // 开封日期 YYYY-MM-DD
  expiryDate: string;           // 保质期到期日 YYYY-MM-DD
  note?: string;                // 备注
  status: 'normal' | 'expiring_soon' | 'expired' | 'used_up'; // 状态
  source: 'mock' | 'user';      // 数据来源标记
}

interface IUsageLog {
  id: string;
  productId: string;            // 关联产品 id
  amount: number;               // 本次使用量（百分比，如 5 表示用掉 5%）
  usedAt: string;               // 使用日期 YYYY-MM-DD
  note?: string;                // 使用感受/备注
}

-------

<scene_type>prototype-app</scene_type>

# UI 设计指南

## 1. 设计推导依据

- **参考意图**: Free Direction —— 无参考材料，从护肤品管理的内容语义出发自主设计
- **核心情绪 / 应用类型**: 温柔克制的个人理护工具，帮助用户有序管理护肤品库存与使用节奏
- **独特记忆点**: 以"梳妆台整理"为视觉隐喻，用莫兰迪粉紫主色 + 分类色块 + 容量进度条，让库存管理像护肤仪式一样清爽治愈

## 2. Art Direction

- **方向名**: 柔粉梳妆极简
- **Design Style**: Soft Minimalist 柔和极简 + Rounded Geometry 圆润几何 —— 护肤品是日常疗愈物品，界面需温润不刺眼，圆角与低饱和粉紫调传递私人梳妆台上的从容感
- **DNA 参数**: 圆角 soft（rounded-lg/xl）/ 阴影 subtle（shadow-sm）/ 间距 standard（gap-4, p-6）/ 字体方向 柔和无衬线 / 装饰手法 分类色标签 + 容量进度条 + 极细分割线
- **应用类型**: Tool —— 左侧分类导航 + 右侧列表/详情，数据密度中等

## 3. Color System

**色彩关系**: 莫兰迪粉紫主色 + 同色系极浅粉反馈底 + 暖米白背景 + 深灰棕文字，整体低饱和、高明度差
**配色设计理由**: primary 用 dusty rose 传递护肤的温柔与女性化但不甜腻；bg 用暖米白模拟梳妆台台面；accent 用极浅粉承接 hover 与选中态；文字用深灰棕保证长时阅读不刺眼
**主色推导**: 从护肤品的"面霜质地、玫瑰精华、梳妆仪式"语义中提取粉紫色调，降低饱和度至 35% 左右以避免廉价感，同时保持足够识别度用于 CTA 与过期提醒
**使用比例**: 65% 中性 / 28% 辅助 / 7% primary；primary 仅用于主按钮、关键状态标签、过期高亮；accent 承担 hover、选中底、进度条背景

| 角色 | CSS 变量 | Tailwind Class | HSL 值 | 设计说明 |
|---|---|---|---|---|
| bg | `--background` | `bg-background` | hsl(30 40% 97%) | 暖米白页面背景，模拟梳妆台台面 |
| card | `--card` | `bg-card` | hsl(0 0% 100%) | 纯白卡片，承载产品列表与表单 |
| text | `--foreground` | `text-foreground` | hsl(25 15% 20%) | 深灰棕正文，柔和不刺眼 |
| textMuted | `--muted-foreground` | `text-muted-foreground` | hsl(25 10% 50%) | 浅灰棕辅助文字，用于说明与元信息 |
| primary | `--primary` | `bg-primary` / `text-primary` | hsl(340 35% 62%) | 莫兰迪 dusty rose，主交互与品牌锚点 |
| primaryForeground | `--primary-foreground` | `text-primary-foreground` | hsl(0 0% 100%) | 主色上的白色文字 |
| accent | `--accent` | `bg-accent` | hsl(340 40% 95%) | 极浅粉，hover/选中底、进度条背景 |
| accentForeground | `--accent-foreground` | `text-accent-foreground` | hsl(340 30% 40%) | accent 上的深粉文字与图标 |
| border | `--border` | `border-border` | hsl(30 15% 90%) | 暖灰边界，用于卡片、输入框与分割线 |

**语义色提示**: 
- 成功（充足/正常）: hsl(142 30% 92%) / hsl(142 25% 70%) / hsl(142 35% 32%) —— 低饱和鼠尾草绿，饱和度与 primary 对齐
- 警告（即将过期/存量低）: hsl(35 60% 90%) / hsl(35 55% 65%) / hsl(35 50% 35%) —— 暖琥珀，饱和度略高于 primary ±10%
- 危险（已过期）: hsl(0 40% 92%) / hsl(0 45% 70%) / hsl(0 40% 40%) —— 灰调砖红，饱和度与 primary 对齐，避免刺眼报警感
- 分类色（洁面/水乳/精华/面霜/防晒/其他）: 统一在 hsl 280°~340° 区间内以 20° 步长偏移，饱和度 30~40%，明度 80~85%，用作分类标签底色

## 4. 字体与节奏

- **font-display**: Noto Sans SC —— 标题与数据数字使用 500~600 weight，柔和有呼吸感
- **font-body**: Noto Sans SC —— 正文 400 weight，长列表清晰不累眼；数字用 tabular-nums 保持对齐
- **字号**: H1 text-2xl ~ text-3xl；H2 text-lg ~ text-xl；body text-sm ~ text-base；muted text-xs ~ text-sm
- **圆角**: 大（rounded-lg / rounded-xl）—— 呼应护肤品瓶身的圆润形态，传递温柔手感

## 5. 全局布局契约

- **Reference Layout Use**: 按需求结构推导
- **Page / Section Order**: 仪表盘概览 → 库存列表 → 分类筛选 → 产品详情/编辑 → 使用记录 → 保质期提醒
- **Standard Content Zone**: 后台型 `max-w-6xl` + `mx-auto`，兼顾概览卡片与列表密度
- **Shell / Frame Alignment**: 同宽 —— 内容容器与顶部导航/侧边栏共享同一 max-w 约束，左侧分类导航固定 200px
- **Padding & Rhythm**: `px-4 md:px-6 py-6 md:py-8`，卡片间距 gap-4，区块间距 gap-6，保持 4px/8px 倍数
- **Full-bleed Zones**: 顶部统计概览卡片组可全宽铺展，其余内容受 Standard Content Zone 约束
- **Local Narrowing**: 产品编辑表单、详情页正文可在容器内收窄至 `max-w-xl`
- **Overflow Strategy**: 库存列表表格、使用记录时间线在移动端使用 `overflow-x-auto`
- **Flexibility Boundary**: 允许移动端卡片内边距与列数调整；不允许改变主色、圆角系统、分类色逻辑与进度条样式

## 6. 视觉与动效

- **装饰**: 分类色圆标签 · 容量渐变进度条 · 极细分隔线
- **阴影/边界**: 轻 —— 卡片用 `shadow-sm`，hover 时 `shadow-md`，边界用 1px solid border
- **动效**: 克制 —— hover 背景色过渡 150ms，卡片入场淡入 200ms，进度条变化用 ease-out 300ms；无夸张弹动

## 7. 组件原则

- 按钮、输入框、下拉选择、卡片必须有 Default / Hover / Active / Focus-visible / Disabled 状态
- Primary 按钮承担"新增产品""确认使用"等主行动；Outline/Ghost 按钮用于筛选与次要操作
- 产品卡片包含：分类色标签、产品名、容量进度条、剩余量数字、保质期状态徽章
- 容量进度条使用 primary → primary-foreground 的同色系渐变，末端圆角
- 空状态与加载态延续暖米白 + 极浅粉的柔和语言，使用线性图标而非默认 shadcn 样式

## 8. Image Direction

- **Image Role**: 无强制图片需求，优先通过分类色标签、容量进度条和产品卡片排版建立视觉记忆点
- **Image Art Direction**: 无强制图片需求
- **Image Prompt Keywords**: 无
- **Image Avoidance**: 避免通用护肤品电商素材图、网红化妆品摆拍图、无意义瓶身堆叠图

## 9. Anti-patterns

- **Split personality**: 概览页用粉紫、列表页回默认蓝；全站共享 dusty rose 主色与暖米白基底
- **Phantom tokens**: 编造不存在的 CSS 变量；只使用已定义的 9 个基础 token + 语义色
- **Default SaaS drift**: 回到默认蓝按钮、通用卡片堆叠；用分类色、容量进度条、梳妆台暖白背景塑造专属感
- **Invisible interaction**: hover 有渐变但 focus-visible 丢失；每个可交互元素都有 `ring-2 ring-primary/30` 键盘焦点态
- **Mono-hue tyranny**: 主色铺满按钮、tab、icon、边框、图表；primary 只用于 CTA 与关键状态，其余交 accent 与分类色
- **Status color drift**: 过期警告用高饱和大红，与柔和整体脱节；语义色饱和度与 primary 对齐 ±15%，走灰调路线