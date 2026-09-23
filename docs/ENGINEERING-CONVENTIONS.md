# ANI BOSS Console 工程约定

本文档统一维护工程目录与命名、路由适配、公共适配层、全局类型和验证规则；UI 实现与 API 对接细则由各自规范维护。

## 项目与命名

- 仓库根目录已经代表 BOSS 应用范围，源码目录、路由、文件名、组件名及其他代码标识按业务语义命名，不得重复添加 `boss`、`Boss` 等域名前缀。
- 用户可见的产品名、品牌和菜单文案按产品原型保留，不受代码标识命名规则限制。

## 目录职责

- `src/routes/`：TanStack Router 文件路由。路由文件负责路由参数、路由级上下文、页面级状态与数据编排，以及领域组件组合。
- `src/components/<scope>/`：按页面范围组织的业务组件、领域模型、Provider 与组件业务逻辑；Provider 负责提供 store 实例和管理其生命周期。
- `src/hooks/`：集中放置自定义 React Hook 及其直接依赖的 Context；Provider 组件仍按页面范围放在 `src/components/<scope>/`，并从 Hook 模块引用对应 Context。
- `src/stores/`：按业务领域组织的 Zustand 客户端共享状态、操作及所属类型。简单领域使用独立文件，复杂领域使用目录按业务职责拆分；需要实例隔离的状态导出 store 工厂，由 Provider 创建实例。独立事件发布订阅使用 mitt，随所属领域组织；不另建自制事件总线。
- `src/api/`：按业务资源组织的 API 请求函数、静态类型与 Axios 公共请求基础设施。
- `src/components/common/`：跨页面、跨领域复用的公共组件；目录统一从 `@/components/common` 导入。
- `src/components/layouts/`：应用布局、认证中心、顶部导航、侧边栏和页面出口。
- `src/styles/`：全局样式；组件私有样式应与组件同目录，不进入全局样式目录。
- `src/routeTree.gen.ts`：TanStack Router 自动生成文件，不进行手工修改。
- `docs/`：工程、UI 与 API 对接规范，不保存接口契约或产品原型副本。

项目不使用 `src/pages/` 或 `src/features/` 承载新代码；已有遗留目录应在相关功能调整时迁移，不新增依赖。确需新增顶层目录时应先重构现有功能归属并更新本文档，不在多处重复记录。

## 路由组织

- 业务 URL 均落位于 `src/routes/`，业务页面使用 `<page-name>/index.tsx`。
- route component 是路由适配层：通过当前 `Route` 的 `useParams`、`useSearch` 或 loader 数据读取并整理路由输入，再以普通 props 传给 `src/components/<scope>/` 下的页面组件；领域页面不应仅为读取 path/search 而依赖 route 对象或 `getRouteApi`。
- 路由适配函数使用具名函数或等价的清晰写法，不强制箭头函数语法；没有路由输入时也只组合页面组件，不将查询、业务状态或完整页面 JSX 保留在 route 文件中。
- 不存在真实父子关系的模块直接放在路由根层级，并使用连字符连接语义，例如 `tenants-billing/index.tsx`。
- 只有模块自身的 index、详情或其他真实子路由放入对应模块目录；动态参数使用 `$param.tsx`。
- 有子路由的父 route 使用 `Outlet`，不得以薄 route 文件转发独立 pages 组件。
- 路由 UI 依赖 TanStack Router Vite 插件的 `autoCodeSplitting` 自动拆分，默认不新增 `.lazy.tsx` 或手工动态导入。

## 组件组织

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

## 导入与类名

- 源码使用 `@/` 指向 `src/`。
- 动态类名使用 `clsx`，不得使用数组过滤后 `join`、字符串拼接或模板字符串手工组合类名。

## 验证

默认由项目负责人手动完成功能、布局和页面交互验证。除非用户明确要求，Agent 不运行 `pnpm build`、`pnpm verify` 或启动应用。

所有 `pnpm` 命令必须在 Codex 沙箱外的系统环境运行，由系统 Corepack 根据 `package.json` 的 `packageManager` 选择 pnpm 版本；不得使用沙箱内的 fallback pnpm，也不得绕过项目声明手动选择其他版本。

完成代码或工程配置修改后，在最终回复前必须运行：

```bash
pnpm lint
pnpm fmt:check
git diff --check
```

文档修改还需检查 Markdown 链接、标题和术语一致性。代码修改完成后还必须通过当前会话接入的 GitNexus `detect_changes({ repo: "ani-boss-console", scope: "all" })` 检查变更范围；检查失败时先修复，无法在当前范围处理的既有问题必须如实记录。
