# AGENTS.md

## 项目范围

本仓库只包含 ANI 平台管理端前端。仓库根目录已经代表产品原型中的 BOSS 范围，源码按业务语义命名。

## 规范入口

开始工作前按任务范围阅读对应规范：

- 工程目录、命名、路由适配、公共适配层和验证遵循 [工程约定](./docs/ENGINEERING-CONVENTIONS.md)。
- UI 实现顺序、组件复用、样式、页面组合、交互反馈、请求状态展示和组件拆分遵循 [UI 开发约定](./docs/UI-CONVENTIONS.md)。
- 接口契约核对、API 模块与类型落位、公共请求层、幂等、SSE、预签名上传及页面接入遵循 [API 对接流程](./docs/API-INTEGRATION.md)。

具体规则仅在所属规范文档维护；本文件只保留规范入口、Agent 工作流和工具约束，不重复业务或实现细则。

新增或调整规则时，先依据 [文档职责](./docs/README.md#文档职责) 确定唯一归属；完整规则只写入该文档，其他文档仅保留链接。无法唯一归属，或拟记录内容与现有规则的强度、范围、顺序或例外冲突时，必须先请用户确认，不得并行记录或自行取舍。

## 工作边界

- 不覆盖、清理或改写用户已有的无关工作区变更。
- 除非用户明确要求，不执行编译、构建或启动应用；页面与交互由项目负责人手动验证。
- 不维护集中式项目状态或开发记录文件；变更内容和验证结果在最终回复中说明。

## 验证

- 所有 `pnpm` 命令必须在 Codex 沙箱外的系统环境运行，由系统 Corepack 根据 `package.json` 的 `packageManager` 选择版本；不得使用沙箱内的 fallback pnpm，也不得绕过项目声明手动选择其他版本。
- 完成修改后、最终回复前按 [工程约定](./docs/ENGINEERING-CONVENTIONS.md#验证) 区分纯文档修改与代码或工程配置修改，执行对应验证清单和 GitNexus 变更检测；提交前若检测后又有修改，必须重新执行变更检测，确保结果覆盖待提交的最新变更。检查失败时先修复，无法在当前范围处理的既有问题必须如实记录。

## GitNexus

当前前端仓库索引名为 `ani-boss-console`，迁移期后端索引名为 `ani-governance`（目标后端）与 `ANI`（存量后端），产品原型索引名为 `产品原型-9.11`。

- 修改函数、类或方法前，必须通过 GitNexus `impact` 对目标符号执行 upstream 影响分析。
- `impact` 返回 HIGH 或 CRITICAL 风险时，必须先向用户说明直接调用方、受影响流程和风险，再继续修改。
- 完成代码修改后，必须通过 GitNexus `detect_changes` 检查变更范围，目标仓库为 `ani-boss-console`，检测范围为 `all`。
- 查看接口、后端契约或执行流时，必须按 [API 对接流程](./docs/API-INTEGRATION.md#迁移期后端归属) 判断接口归属，并通过 GitNexus 查询对应的 `ani-governance`（`repo: "ani-governance"`）或 `ANI`（`repo: "ANI"`）索引。
- 查看产品原型、页面信息架构或交互布局时，必须通过 GitNexus 查询产品原型索引 `产品原型-9.11`（`repo: "产品原型-9.11"`）。
- 文档指定的仓库或索引不可用、未建立或无法访问时，不得根据前端代码、训练数据或经验猜测接口契约、后端行为、产品原型或交互布局；必须立即暂停依赖该索引的判断。索引过期或不可用时，可先在现有授权和工具约束内更新或恢复索引，确认目标索引可访问且反映目标代码版本后再继续；无法恢复时，向用户说明阻塞并请求建立或恢复对应索引。不依赖该索引的工作可继续。

<!-- gitnexus:start -->
# GitNexus — Code Intelligence

This project is indexed by GitNexus as **ani-boss-console** (4665 symbols, 7195 relationships, 105 execution flows).

> Index stale? Run `node .gitnexus/run.cjs analyze --index-only` from the project root — it auto-selects an available runner. No `.gitnexus/run.cjs` yet? Bootstrap with `npx`, `bunx`, or `pnpm dlx` — e.g. `bunx gitnexus@latest analyze` (npm 11 npx crash; #1939).

## Always Do

- **MUST run impact before editing.** Use `impact({target: "symbolName", direction: "upstream"})` or `node .gitnexus/run.cjs impact "symbolName" --direction upstream --repo .`; report callers, processes, and risk. Never substitute grep for graph analysis.
- **MUST analyze graph changes before committing.** Use `detect_changes({scope: "all"})` (MCP) or `node .gitnexus/run.cjs detect-changes --scope all --repo .` (CLI fallback). `partial: true` or `truncated: true` is not a clean check — a zero means unseen, not unaffected; re-run it. For regression review: `detect_changes({scope: "compare", base_ref: "main"})` or `node .gitnexus/run.cjs detect-changes --scope compare --base-ref "main" --repo .`.
- MUST warn on HIGH/CRITICAL `risk` pre-edit; never use `riskSharedAxes` to waive a HIGH/CRITICAL `risk` warning. Compare File/symbol: MCP File omits axes; Graph-RAG expands File.
- **MUST treat `risk: UNKNOWN` as unresolved, not as low.** An empty caller set is not evidence the symbol is unused — it can also mean the callers are not resolvable by the index (plain-object property access, dynamic dispatch, cross-language calls). `impact` pairs `UNKNOWN` with a `riskNote` saying so. Confirm with a text search before treating the symbol as safe to change or delete; do not proceed on the strength of a zero.
- **MUST use `query({search_query: "concept"})` for concepts/flows, `context({name: "symbolName"})` for a named symbol, or `impact` for blast radius, on read-only callers, dependencies, imports, or execution flow.** Graph first; text search only for empty/`UNKNOWN`/literals.
- For security review, `explain({target: "fileOrSymbol"})` lists taint findings (source→sink flows; needs `analyze --pdg`).

## Never Do

- NEVER edit a function, class, or method before MCP/CLI impact analysis.
- NEVER ignore HIGH or CRITICAL risk warnings from impact analysis, and never read `UNKNOWN` as an all-clear — it means the walk could not answer, which is the one verdict that requires confirming by other means.
- NEVER rename symbols with find-and-replace — use `rename` which understands the call graph.
- NEVER commit before MCP/CLI graph change analysis.

## Resources

| Resource | Use for |
| --- | --- |
| `gitnexus://repo/ani-boss-console/context` | Codebase overview, check index freshness |
| `gitnexus://repo/ani-boss-console/clusters` | All functional areas |
| `gitnexus://repo/ani-boss-console/processes` | All execution flows |
| `gitnexus://repo/ani-boss-console/process/{name}` | Step-by-step execution trace |

## CLI

| Task | Read this skill file |
| --- | --- |
| Understand architecture / "How does X work?" | `.claude/skills/gitnexus-exploring/SKILL.md` |
| Blast radius / "What breaks if I change X?" | `.claude/skills/gitnexus-impact-analysis/SKILL.md` |
| Trace bugs / "Why is X failing?" | `.claude/skills/gitnexus-debugging/SKILL.md` |
| Rename / extract / split / refactor | `.claude/skills/gitnexus-refactoring/SKILL.md` |
| Tools, resources, schema reference | `.claude/skills/gitnexus-guide/SKILL.md` |
| Index, status, clean, wiki CLI commands | `.claude/skills/gitnexus-cli/SKILL.md` |

<!-- gitnexus:end -->
