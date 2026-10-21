# ANI BOSS Console

ANI 平台管理端前端。

## 开发

```bash
pnpm install
pnpm dev
```

开发服务默认访问 `http://localhost:5174`。

环境变量按 [Vite 的 Env Variables and Modes](https://v6.vite.dev/guide/env-and-mode) 约定配置；本地覆盖可写入不提交的 `.env.local`。

## 常用命令

```bash
pnpm lint
pnpm fmt
pnpm fmt:check
pnpm typecheck
pnpm build
pnpm preview
```

## 技术栈

React、TypeScript、Vite、TanStack Router、TanStack Query、Arco Design React、Tailwind CSS、Zustand、Axios、ECharts。

## 文档

- [文档索引](./docs/README.md)
- [工程约定](./docs/ENGINEERING-CONVENTIONS.md)
- [UI 开发约定](./docs/UI-CONVENTIONS.md)
- [API 对接流程](./docs/API-INTEGRATION.md)
- [Agent 执行约定](./AGENTS.md)
