# 护肤品存量管理系统

个人护肤品库存与保质期管理工具，基于 React 19 + TypeScript + Tailwind CSS v4 构建。

## 环境要求

| 工具 | 版本要求 |
| ---- | -------- |
| Node.js | ≥ 18（推荐 20+） |
| npm | ≥ 9 |

## 依赖安装

```powershell
npm.cmd install
```

## 启动命令

| 命令 | 说明 |
| ---- | ---- |
| `npm.cmd run dev` | 启动开发服务器（默认 http://localhost:8080/） |
| `npm.cmd run build` | 类型检查 + 生产构建，产物输出到 `dist/` |
| `npm.cmd run preview` | 预览构建产物 |
| `npm.cmd run typecheck` | 仅执行 TypeScript 类型检查 |
| `npm.cmd run lint` | ESLint 代码检查 |

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

| 内容类型     | 放置位置                            |
| ------------ | ----------------------------------- |
| 新页面       | `src/pages/<PageName>/<PageName>.tsx` |
| 页面专属组件 | `src/pages/<PageName>/components/`  |
| 自定义 Hooks | `src/hooks/`                        |
| 工具函数     | `src/lib/`                          |
| 静态数据文件 | `shared/static/data/`               |
| 静态图片     | `shared/static/images/`             |

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

| 键 | 类型 | 说明 |
| -- | ---- | ---- |
| `__global_skincare_products` | `ISkincareProduct[]` | 库存列表 |
| `__global_skincare_usage_logs` | `IUsageLog[]` | 使用记录 |

## 主题变量

主题色定义在 `src/index.css`，通过 `:root` CSS 变量 + `@theme inline` 注册到 Tailwind。

| 用途     | Tailwind 类                   | CSS 变量                  | HSL 值 |
| -------- | ----------------------------- | ------------------------- | ------ |
| 页面背景 | `bg-background`               | `--background`            | hsl(30 40% 97%) |
| 卡片背景 | `bg-card`                     | `--card`                  | hsl(0 0% 100%) |
| 主文本   | `text-foreground`             | `--foreground`            | hsl(25 15% 20%) |
| 次要文本 | `text-muted-foreground`       | `--muted-foreground`      | hsl(25 10% 50%) |
| 主色     | `bg-primary` / `text-primary` | `--primary`               | hsl(340 35% 62%) |
| 强调色   | `bg-accent`                   | `--accent`                | hsl(340 40% 95%) |
| 边框     | `border-border`               | `--border`                | hsl(30 15% 90%) |

## 禁止修改的文件

| 文件 | 原因 |
| ---- | ---- |
| `src/index.tsx` | Provider 层级 + 样式引入，由模板管理 |
| `src/components/ui/*` | shadcn/ui 内置组件，版本锁定 |
