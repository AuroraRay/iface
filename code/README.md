# 护肤品存量管理系统
推送
git config --global http.proxy http://127.0.0.1:7890

个人护肤品库存与保质期管理工具，基于 React 19 + TypeScript + Tailwind CSS v4 构建。

## 环境要求

| 工具    | 版本要求         |
| ------- | ---------------- |
| Node.js | ≥ 18（推荐 20+） |
| npm     | ≥ 9              |

## 依赖安装

```powershell
npm.cmd install
```

## 启动命令

| 命令                    | 说明                                          |
| ----------------------- | --------------------------------------------- |
| `npm.cmd run dev`       | 启动开发服务器（默认 http://localhost:8080/） |
| `npm.cmd run build`     | 类型检查 + 生产构建，产物输出到 `dist/`       |
| `npm.cmd run preview`   | 预览构建产物                                  |
| `npm.cmd run typecheck` | 仅执行 TypeScript 类型检查                    |
| `npm.cmd run lint`      | ESLint 代码检查                               |

---

## 技术栈

- 前端: React 19 + TypeScript
- 样式: Tailwind CSS v4
- UI 组件: shadcn/ui（Radix UI 基础）
- 图标: lucide-react
- 图表: echarts-for-react
- 动画: framer-motion
- 路由: react-router-dom v7
- 表单: react-hook-form + zod
- 日期: date-fns + react-day-picker
- 构建: Vite 8
- 数据持久化: localStorage

## 目录结构

```
src/
├── index.tsx            # 入口（勿修改）
├── app.tsx              # 路由配置（仅在 <Routes> 内增删 <Route>）
├── index.css            # 全局样式 + 主题变量
├── tailwind-theme.css   # Tailwind 主题扩展
├── components/          # 基础 UI 组件（禁止存放业务组件）
│   ├── AppSidebar.tsx   # 侧边栏导航
│   ├── Layout.tsx       # 全局布局容器
│   └── ui/              # shadcn/ui 内置组件（勿修改）
├── pages/               # 页面模块
│   ├── DashboardPage/   # 库存概览页（首页）
│   ├── InventoryPage/   # 库存管理页（增删改查 + 使用记录）
│   ├── BatchImportPage/ # 批量录入页
│   ├── ExamplePage/     # 示例页
│   └── NotFoundPage/    # 404 页
├── data/                # Mock 数据
│   ├── skincare.ts      # 护肤品产品数据
│   └── ...
├── hooks/               # 自定义 Hooks
│   ├── use-inventory.ts # 库存操作（增删改查 + localStorage 持久化）
│   └── use-mobile.ts
├── lib/                 # 工具函数（cn() 等）
└── components/          # 布局组件

shared/
└── static/              # 静态资源
```

## 路由配置

- `/` → DashboardPage（库存概览）
- `/inventory` → InventoryPage（库存管理）

## 文件放置规则

| 内容类型     | 放置位置                              |
| ------------ | ------------------------------------- |
| 新页面       | `src/pages/<PageName>/<PageName>.tsx` |
| 页面专属组件 | `src/pages/<PageName>/components/`    |
| 自定义 Hooks | `src/hooks/`                          |
| 工具函数     | `src/lib/`                            |
| 静态数据文件 | `shared/static/data/`                 |
| 静态图片     | `shared/static/images/`               |

## 导入路径

```typescript
// @/ 别名 → src/
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";

// @shared/ 别名 → shared/
import configData from "@shared/static/config.json";
```

## 数据模型

### 产品（ISkincareProduct）

```ts
interface ISkincareProduct {
  id: string;
  name: string;
  brand?: string;
  category: 'cleanser' | 'toner_lotion' | 'serum' | 'cream' | 'suncreen' | 'mask' | 'other';
  volume: string;           // 如 "100ml"
  quantity: number;         // 剩余百分比 0-100
  openDate: string;         // YYYY-MM-DD
  expiryDate: string;       // YYYY-MM-DD
  note?: string;
  status: 'normal' | 'expiring_soon' | 'expired' | 'used_up';
  source: 'mock' | 'user';
}
```

### 使用记录（IUsageLog）

```ts
interface IUsageLog {
  id: string;
  productId: string;
  amount: number;           // 使用量（百分比）
  usedAt: string;           // YYYY-MM-DD
  note?: string;
}
```

### localStorage 键名

| 键                             | 类型                 | 说明     |
| ------------------------------ | -------------------- | -------- |
| `__global_skincare_products`   | `ISkincareProduct[]` | 库存列表 |
| `__global_skincare_usage_logs` | `IUsageLog[]`        | 使用记录 |

## 主题变量

主题色定义在 `src/index.css`，通过 `:root` CSS 变量 + `@theme inline` 注册到 Tailwind。

| 用途     | Tailwind 类                   | CSS 变量             | HSL 值           |
| -------- | ----------------------------- | -------------------- | ---------------- |
| 页面背景 | `bg-background`               | `--background`       | hsl(30 40% 97%)  |
| 卡片背景 | `bg-card`                     | `--card`             | hsl(0 0% 100%)   |
| 主文本   | `text-foreground`             | `--foreground`       | hsl(25 15% 20%)  |
| 次要文本 | `text-muted-foreground`       | `--muted-foreground` | hsl(25 10% 50%)  |
| 主色     | `bg-primary` / `text-primary` | `--primary`          | hsl(340 35% 62%) |
| 强调色   | `bg-accent`                   | `--accent`           | hsl(340 40% 95%) |
| 边框     | `border-border`               | `--border`           | hsl(30 15% 90%)  |

## 禁止修改的文件

| 文件                  | 原因                                 |
| --------------------- | ------------------------------------ |
| `src/index.tsx`       | Provider 层级 + 样式引入，由模板管理 |
| `src/components/ui/*` | shadcn/ui 内置组件，版本锁定         |

---

## 文档格式选择：为什么 PRD 用 HTML

项目里 `docs/PRD-护理方案打卡与使用计划.html` 用了自包含 HTML 作为交付格式，而不是 Markdown / Word / PDF。这里把几种格式的优劣势摆出来，方便后续选择。

### 四种常见格式横向对比

| 维度 | HTML（自包含） | Markdown | Word / DOCX | PDF |
|------|---------------|----------|-------------|-----|
| **可交互性** | ✅ 能写内嵌 Demo、弹窗、进度条、Tab 切换——PRD 里的打卡确认单、迷你日历、计划卡都是真能点的 | ❌ 纯静态文本，无法表达"点击后出现什么" | ⚠️ Word 有 ActiveX 控件但没人用 | ❌ 完全静态 |
| **视觉表达力** | ✅ 自己写 CSS，想做什么版式都行；天然支持配色、间距、分组 callout | ❌ 只有标题、列表、表格、代码块；粗陋的等宽代码块显得"技术味"重 | ✅ 排版强，但要打开 Word 才看得到样式 | ⚠️ 视觉保留完整，但编辑痛苦 |
| **离线可打开** | ✅ 单文件，双击浏览器直接开，不依赖任何服务 | ⚠️ 要看样式渲染（GitHub / VS Code / 编辑器预览） | ❌ 需要 Word 或 WPS | ✅ 单文件离线可读 |
| **版本控制友好** | ⚠️ 大段 CSS + 行内样式让 diff 噪声大 | ✅ 纯文本 diff 清晰，天然对 Git 友好 | ❌ 二进制，Git diff 基本不可读 | ❌ 二进制，无法 Git 审查 |
| **协作编辑** | ❌ 直接改 HTML 成本高，容易写错标签 | ✅ 人人能写，冲突少 | ✅ Word 自带协作模式 | ❌ 只读，协作困难 |
| **跨端一致性** | ✅ 浏览器即标准渲染环境 | ⚠️ 不同预览器（GitHub / VS Code / Obsidian）表格和 callout 长得不一样 | ❌ Word vs WPS vs Pages 差异大 | ✅ PDF 渲染一致 |
| **自动生成 / 导出** | ⚠️ 需要模板或手写 | ✅ Pandoc 等工具链成熟，可一键转 HTML / PDF / DOCX | ⚠️ 编程生成 DOCX 麻烦 | ⚠️ 生成 PDF 需要额外引擎 |
| **代码和文档的距离** | ✅ 和源码同仓库，`docs/` 下一眼可见 | ✅ 同上 | ❌ Word 文件通常游离在项目外 | ❌ 同上 |

### 我们为什么选 HTML

**核心原因只有一条**：PRD 需要把"交互行为意图"直接展示给评审者，而不是让评审者脑补。

这版 PRD 里有四个内嵌演示：

| 演示 | 表达的意图 |
|------|-----------|
| FR-B 打卡确认单 | "点打卡后弹窗出来长这样，行有复选框、有 ±5% 步进器，底部实时汇总" |
| FR-C 迷你日历 | "有打卡的日期显圆点，点击切高亮、右侧面板更新明细" |
| FR-D 计划卡周排程 | "星期一三五排程点一下就切换，命中今日时徽标变色" |
| toast + 撤销 | "toast 会弹出含撤销入口，4 秒后自动消失" |

这些东西如果只写 Markdown：

> "确认单弹窗逐行列出产品，每行有复选框和用量步进器……底部汇总……toast 弹出撤销入口……"

评审者脑子里得脑补弹层长什么样、步进器在哪里、撤销按钮长什么样。而 HTML 里直接就能点，评审过程不会卡在"你说的那个按钮到底在哪"上。

### HTML 的代价

1. **写起来繁琐**：每页 PRD 都要自己写 CSS，不能一键出。这次走了 `prd-authoring` skill 帮我生成，手动写的话至少慢 3 倍。
2. **Git diff 噪声大**：后续改 PRD 时，改三行内容可能导致 diff 里 20 行 CSS 也跟着跳。如果 PRD 会频繁迭代，建议"一次写好就尽量不改"，或者生成时把样式抽到外部 CSS 文件（目前是内联在同一个 `<style>` 块里，还算可控）。
3. **不是所有人会改**：队友如果没 HTML 基础，想在 PRD 里补几行得找你。

### 什么时候该换 Markdown

- PRD 不需要交互演示（比如纯 API 设计、纯数据模型说明）
- 预计多人协作改 PRD，频繁冲突
- 内容量大、超过 20 页——HTML 手写会崩溃，不如 Markdown + Pandoc 转 HTML 自动排版
- 公司规范就是 Markdown，不想搞特殊

### 什么时候该换 PDF / Word

- 需要发给公司外、非技术背景的甲方或管理层审阅，且对方只接受标准办公文档
- 需要签字、盖章、走审批流

### 结论

这次用 HTML 是**场景合适**：PRD 里四个功能（打卡确认单、迷你日历、周排程联动、toast 撤销）都是"不点一下不知道你在说什么"的交互。代价是写起来费点劲，但评审效率至少提了 50%。如果以后 PRD 内容变纯文档化了，就换回 Markdown——Markdown 的 diff 干净、人人能写、和 Git 天生合得来。
