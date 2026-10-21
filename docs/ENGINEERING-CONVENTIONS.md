# ANI BOSS Console 工程约定

本文档统一维护工程目录与命名、路由适配、组件 Props 与类型组织、公共适配层、浏览器兼容、全局类型和验证规则；UI 实现与 API 对接细则由各自规范维护。

## 项目与命名

- 仓库根目录已经代表 BOSS 应用范围，源码目录、路由、文件名、组件名及其他代码标识按业务语义命名，不得重复添加 `boss`、`Boss` 等域名前缀。
- 用户可见的产品名、品牌和菜单文案按产品原型保留，不受代码标识命名规则限制。

## 目录职责

- `src/routes/`：TanStack Router 薄入口，负责路由参数、路由级上下文及 loader/beforeLoad 等路由编排；具体职责遵循[路由组织](#路由组织)。
- `src/components/<scope>/`：按页面范围组织的业务组件、领域模型、Provider 与组件业务逻辑；Provider 负责提供 store 实例和管理其生命周期。
- `src/hooks/`：集中放置自定义 React Hook 及其直接依赖的 Context；Provider 组件仍按页面范围放在 `src/components/<scope>/`，并从 Hook 模块引用对应 Context。
- `src/stores/`：按业务领域组织的 Zustand 客户端共享状态、操作及所属类型。简单领域使用独立文件，复杂领域使用目录按业务职责拆分；需要实例隔离的状态导出 store 工厂，由 Provider 创建实例。独立事件发布订阅使用 mitt，随所属领域组织；不另建自制事件总线。
- `src/api/`：按业务资源组织的 API 请求函数、静态类型与 Axios 公共请求基础设施。
- `src/components/common/`：跨页面、跨领域复用的公共组件；目录统一从 `@/components/common` 导入。
- `src/layouts/`：应用级布局、认证中心、顶部导航、侧边栏和页面出口，使用 `src/layouts/<LayoutName>/index.tsx`；布局专用组件与私有样式随所属布局维护。
- `src/styles/`：全局样式；组件私有样式应与组件同目录，不进入全局样式目录。
- `src/routeTree.gen.ts`：TanStack Router 自动生成文件，不进行手工修改。
- `docs/`：工程、UI 与 API 对接规范，不保存接口契约或产品原型副本。

项目不使用 `src/pages/` 或 `src/features/` 承载新代码；已有遗留目录应在相关功能调整时迁移，不新增依赖。确需新增顶层目录时应先重构现有功能归属并更新本文档，不在多处重复记录。

### 废弃接口组织

新增或调整迁移领域时，新旧接口按以下格式组织；旧接口在迁移完成前保留：

```text
src/api/<domain>/
  index.ts               # 新接口公开入口
  types.ts               # 新接口类型
  legacy.ts              # 旧接口统一公开入口
  types-legacy.ts        # 保留的旧接口类型
  <resource>-legacy.ts   # 旧资源请求模块，按需拆分，由 legacy.ts 汇总导出
```

- 少量旧请求可以直接实现在 `legacy.ts`；旧资源较多时拆入 `<resource>-legacy.ts`，不增加 `index-legacy.ts`、`legacy/index.ts` 或额外的 `index/legacy` 层级。
- 新调用从 `@/api/<domain>` 导入，旧调用及旧类型从 `@/api/<domain>/legacy` 导入；调用方不得绕过该入口直接依赖资源级 `-legacy` 文件，新 `index.ts` 不转导出旧接口或旧接口命名空间。
- 旧功能保留边界和迁移标记遵循 [API 对接流程](./API-INTEGRATION.md#迁移标记与保留边界)。

## 路由组织

- 业务 URL 均落位于 `src/routes/`，业务页面使用 `<page-name>/index.tsx`。
- route component 是路由适配层：通过当前 `Route` 的 `useParams`、`useSearch` 或 loader 数据读取并整理路由输入，再以普通 props 传给 `src/components/<scope>/` 下的页面组件；领域页面不应仅为读取 path/search 而依赖 route 对象或 `getRouteApi`。
- 路由适配函数使用具名函数或等价的清晰写法，不强制箭头函数语法；没有路由输入时也只组合页面组件，不将查询、业务状态或完整页面 JSX 保留在 route 文件中。
- 不存在真实父子关系的模块直接放在路由根层级，并使用连字符连接语义，例如 `tenants-billing/index.tsx`。
- 只有模块自身的 index、详情或其他真实子路由放入对应模块目录；动态参数使用 `$param.tsx`。
- 有子路由的父 route 使用 `Outlet`，不得以薄 route 文件转发独立 pages 组件。
- 路由 UI 依赖 TanStack Router Vite 插件的 `autoCodeSplitting` 自动拆分，默认不新增 `.lazy.tsx` 或手工动态导入。

## 组件组织

- 页面组件以 `Page` 结尾；业务名称的单复数按页面语义确定：列表页使用复数资源名（如 `TenantsPage`、`UsersPage`），详情页等使用对应业务语义（如 `TenantDetailPage`）。页面名称不额外添加 `Management`，目录名与导出名保持一致。

- 组件使用 `src/components/<scope>/<ComponentName>/index.tsx`，不得在 scope 根目录平铺组件实现。
- 子组件使用 `<ComponentName>/<SubComponentName>/index.tsx`。
- 组件私有样式使用同目录的 `index.css`、`index.less`、`index.module.css` 或 `index.module.less`。
- 跨页面、跨领域复用的通用组件统一放在 `src/components/common/<ComponentName>/index.tsx`；业务组件放在对应 page scope。
- 新建或改造的业务模态框统一放在 `src/components/<scope>/<ComponentName>Modal/index.tsx`，目录名与导出名保持一致；组件边界、挂载方式和复用接口遵循 [UI 开发约定](./UI-CONVENTIONS.md)。

## 关联规范

- UI 组件、页面组织、样式、交互反馈、请求状态展示和组件拆分统一遵循 [UI 开发约定](./UI-CONVENTIONS.md)，本文件不重复维护 UI 细则。
- API 模块、类型、请求层、幂等、SSE、预签名上传及页面接入统一遵循 [API 对接流程](./API-INTEGRATION.md)，本文件不重复维护 API 细则。

## 公共适配与类型

- 时间解析、校验与展示统一使用 `date-fns`，并先封装在 `src/lib` 公共适配层；业务组件、页面和领域 API 不得直接调用 `date-fns` 或原生日期格式化。
- `src` 下的全局类型、环境类型和第三方模块增强声明统一维护在 `src/vite-env.d.ts`，不得新增 `src/types` 或其他分散的 `.d.ts` 文件；领域类型仍跟随所属 API、组件或功能模块维护。

### 组件 Props 与表单类型

- 新增或调整组件时，Props、表单值与组件私有类型直接在所属组件或页面的实现文件中声明，不单独抽取到 `types.ts`。Props 类型使用 `<ComponentName>Props` 命名，例如 `ComputePresetEditModalProps`，不在组件参数中使用匿名对象类型。
- 类型默认仅在本文件内使用，只有其他文件实际需要引用时才添加 `export`，调用方通过 `import type` 引用，不为私有类型添加多余的导出或转导出。常量、初始值和辅助函数按职责放在组件实现或独立的 `constants.ts`、`utils.ts` 等实现文件中。
- 表单值类型按业务或操作命名为 `<BusinessOrAction>FormValues`，例如 `ComputePresetEditFormValues`，不得使用 `CreateValues` 等缺少业务含义的名称。表单实体独立声明实际字段，不通过继承、交叉、`Pick` 或 `Omit` 等方式从整个接口提交类型派生；提交时显式组装接口参数，处理单位转换及自动生成字段。
- 表单实体独立不代表字段类型重复定义。单个字段已有对应的领域类型、枚举或联合类型时必须直接引用，不复制其枚举值，也不为复用单字段类型而关联整个提交实体。

## 异步调用与返回值

- 不为普通方法调用、事件回调或 Promise 调用机械添加 `void` 前缀；仅在确需强制丢弃返回值或满足明确接口约束时使用。
- 需要等待完成的异步操作使用 `await` 或返回 Promise；不等待的操作应有明确的错误处理归属。`void` 不会处理 Promise 拒绝，不得用它代替错误处理。

## 浏览器能力与兼容性

### 基本原则

- 普通 DOM 渲染和事件 API 可以按需使用；受安全上下文、权限、浏览器策略或实现差异影响的能力必须通过 `src/lib` 适配层接入，业务组件、页面、Hook、Store 和 API 模块不得各自实现兼容分支。
- 不得仅依据 TypeScript DOM 类型存在就假定运行时可用。新增原生 Web API 前必须核对项目浏览器基线、是否要求 HTTPS/localhost、是否需要用户授权，以及缺失、拒绝或被浏览器拦截时的行为。
- 优先使用项目已经选定的开源库；没有合适库时，在 `src/lib` 提供最小公共实现。适配层必须包含能力检测、明确的失败语义、必要的资源清理，以及不改变业务数据语义的降级路径。
- 不为“清零原生 API”机械包装基础 DOM 操作。仅当 API 存在兼容性、安全上下文、权限、资源生命周期或浏览器策略风险时集中适配。

### 已有统一入口

| 能力 | 必须使用 | 禁止在业务代码中直接使用 |
|------|----------|--------------------------|
| 外部链接 | `src/lib/browser.ts` 的 `openExternalUrl`；异步获取地址时先在点击事件中调用 `reserveExternalWindow`，失败或取消时关闭预留窗口 | 未校验协议的 `window.open`、遗漏 `noopener noreferrer` |

其他浏览器能力新增使用点时，先检索本项目已有适配器；没有统一入口时，按上述原则在 `src/lib` 提供适配，不将其他项目的模块路径或依赖视为本项目已有能力。

### 能力检测与降级

- `matchMedia`、`ResizeObserver`、`IntersectionObserver`、通知、媒体设备、文件选择器等可选能力必须在调用前检测。仅用于视觉增强时应无功能损失地关闭增强；承载核心流程时应提供可操作的错误反馈。
- WebSocket、Streams、编码器和取消能力等无法由普通 polyfill 完整替代的底层能力，应结合项目浏览器基线判断。新增使用点仍须处理构造失败、权限/协议不满足和资源释放，不得让异常逃逸为白屏。
- 新增公共适配器时应在本章节补充统一入口和禁止写法；评审时搜索对应原生 API，确认业务代码没有绕过适配层。

## 导入

- 源码使用 `@/` 指向 `src/`。
- 动态类名与样式规则遵循 [UI 开发约定](./UI-CONVENTIONS.md#组件与样式边界)。

## 验证

默认由项目负责人手动完成功能、布局和页面交互验证。除非用户明确要求，Agent 不运行 `pnpm build`、`pnpm verify` 或启动应用。

所有 `pnpm` 命令必须在 Codex 沙箱外的系统环境运行，由系统 Corepack 根据 `package.json` 的 `packageManager` 选择 pnpm 版本；不得使用沙箱内的 fallback pnpm，也不得绕过项目声明手动选择其他版本。

### 纯文档修改

本次任务仅修改 Markdown 文档时，检查本次修改文档的链接与标题锚点、术语、规则归属及跨文档一致性，并运行 `git diff --check`。无需为纯文档修改运行 lint、全仓格式化、格式检查或 typecheck；同时涉及代码或工程配置时，执行下方完整清单。

### 代码或工程配置修改

完成代码或工程配置修改后，在最终回复前必须运行：

```bash
pnpm lint
pnpm fmt:check
git diff --check
```

### 变更范围检查

纯文档修改与代码或工程配置修改均须执行 GitNexus `detect_changes`，使用方式与检测时机遵循 [AGENTS.md](../AGENTS.md#验证) 及其 [GitNexus 工具规则](../AGENTS.md#gitnexus)。检查失败时先修复，无法在当前范围处理的既有问题必须如实记录。

回归审查统一与 `main` 分支比较。
