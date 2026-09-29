# ANI BOSS Console

ANI 平台管理端前端，用于平台运营总览、资源池与基础设施管理，以及租户、配额、管理员和计费管理。

当前项目以产品原型 `产品原型-9.11` 为页面与信息架构基线：一级菜单位于顶部，二级菜单和三级分组位于左侧边栏。

## 开发

```bash
pnpm install
pnpm dev
```

开发服务默认访问 `http://localhost:5174`。环境变量按 [Vite 的 Env Variables and Modes](https://v6.vite.dev/guide/env-and-mode) 约定配置；本地覆盖可写入不提交的 `.env.local`。

## 常用命令

```bash
pnpm dev
pnpm typecheck
pnpm build
pnpm preview
pnpm lint
pnpm fmt:check
```

日常修改默认不由 Agent 启动应用或执行构建；页面与交互由项目负责人手动验证。具体规则以 `AGENTS.md` 为准。

## 技术栈

React 18、TypeScript、Vite、TanStack Router、TanStack Query、Arco Design React、Axios、Tailwind CSS、ECharts。

## 文档

- [文档索引](./docs/README.md)
- [工程约定](./docs/ENGINEERING-CONVENTIONS.md)
- [API 对接流程](./docs/API-INTEGRATION.md)
- [UI 开发约定](./docs/UI-CONVENTIONS.md)
- [Agent 执行约定](./AGENTS.md)
