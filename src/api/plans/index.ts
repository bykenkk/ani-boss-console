import { adminRequest, ApiError } from "@/api/request";
import { withFirst100 } from "@/api/pagination";
import type { PageParams } from "@/api/types";
import type {
  CreatePlanInput,
  CreatePlanModuleInput,
  CreatePlanQuotaInput,
  Plan,
  PlanList,
  PlanListInput,
  PlanModule,
  PlanModuleCode,
  PlanQuota,
  QuotaDefinition,
  TenantQuotaAccounts,
  TenantUsage,
  UpdatePlanInput,
  UpdatePlanModuleInput,
  UpdatePlanQuotaInput,
} from "./types";

export * from "./types";

export const planKeys = {
  all: ["plan-management"] as const,
  list: (input: PlanListInput) => ["plan-management", "plans", "list", input] as const,
  options: (input: { search?: string }) => ["plan-management", "plans", "options", input] as const,
  detail: (id: number) => ["plan-management", "plans", "detail", id] as const,
  byName: (name: string) => ["plan-management", "plans", "by-name", name] as const,
  boundTenantCount: (id: number) => ["plan-management", "plans", id, "tenant-count"] as const,
  quotaList: (planId: number, input: PlanListInput) =>
    ["plan-management", "quotas", planId, input] as const,
  quotaDefinitions: ["plan-management", "quota-definitions", "options"] as const,
  moduleList: (planId: number, input: PageParams) =>
    ["plan-management", "modules", planId, input] as const,
  editableModules: (id: number) => ["plan-management", "modules", id, "edit"] as const,
  tenantUsage: (id: number) => ["plan-management", "tenant-usage", id] as const,
  tenantQuotaAccounts: (id: number) => ["plan-management", "tenant-accounts", id] as const,
};

// FIXME(pagination-migration): 这四组列表沿用旧 PagingRequest，缺参默认值与零值校验不满足正式分页约定，
// plans/plan-modules 的列表与 total 也未使用同一只读快照。始终显式传合法 page/pageSize；
// 待后端补齐独立默认值、严格参数校验及快照一致性并联调后移除此标记。
function pagingParams(input: PageParams) {
  return { page: input.page ?? 1, pageSize: input.pageSize ?? 20 };
}

// TODO(api-verification): 套餐、配额目录、模块及租户只读视图尚未在本轮联调；部署并允许联调后，
// 核对真实筛选总数、空列表、重名/重复配额、403 授权、409 绑定保护、取消与更新持久化。
export function listPlans(input: PlanListInput = {}, signal?: AbortSignal) {
  return adminRequest<PlanList<Plan>>("/plans", {
    method: "GET",
    signal,
    params: {
      ...pagingParams(input),
      query: JSON.stringify(input.search ? { name__contains: input.search } : {}),
      orderBy: "id desc",
    },
  });
}

// TODO(options-pagination): 套餐选项暂取首 100 项；后端选项能力完善后移除固定分页策略。
export const listPlanOptions = withFirst100(listPlans);

export function getPlan(id: number, signal?: AbortSignal) {
  return adminRequest<Plan>(`/plans/${id}`, { method: "GET", signal });
}

// FIXME(plan-module-save): 创建套餐只返回空对象，暂按全局唯一名称回查新套餐 ID；
// 待后端提供组合创建并返回套餐 ID 后移除此临时查询编排。
// TODO(api-verification): 联调确认创建后名称精确查询的可见性、唯一结果及取消行为。
export async function getPlanByExactName(name: string, signal?: AbortSignal): Promise<Plan> {
  const result = await adminRequest<PlanList<Plan>>("/plans", {
    method: "GET",
    signal,
    params: { page: 1, pageSize: 2, query: JSON.stringify({ name }) },
  });
  const plan = result.items?.[0];
  if (
    result.total !== "1" ||
    result.items?.length !== 1 ||
    !plan ||
    !Number.isInteger(plan.id) ||
    plan.id <= 0
  ) {
    throw new Error("套餐已创建，但未能确认新套餐，请刷新后继续");
  }
  return plan;
}

async function writePlanResource(resource: "plan" | "quota" | "module", request: Promise<unknown>) {
  try {
    await request;
  } catch (error) {
    if (!(error instanceof ApiError)) throw error;
    let message: string | undefined;
    if (resource === "plan" && error.status === 409) {
      message = "该套餐已被租户使用，不能删除，请先调整租户套餐";
    } else if (resource === "plan" && error.status === 400 && error.reason === "BAD_REQUEST") {
      message = "请检查套餐名称是否重复，以及填写内容是否符合要求";
    } else if (resource === "quota" && error.status === 409) {
      message = "该套餐已有相同配额编码，或配额编码未登记，请检查后重试";
    } else if (resource === "quota" && error.reason === "INVALID_QUOTA_REQUEST") {
      message = "配额编码或配额值不符合要求，请检查后重试";
    } else if (error.status === 404) {
      message = resource === "plan" ? "套餐不存在，请刷新后重试" : "该配置不存在，请刷新后重试";
    }
    if (!message) throw error;
    throw new ApiError(message, { ...error, cause: error });
  }
}

// 这些管理写接口没有幂等 key 契约；只提交 data 与已编辑字段的 updateMask。
export function createPlan(input: CreatePlanInput): Promise<void> {
  return writePlanResource(
    "plan",
    adminRequest("/plans", { method: "POST", data: { data: input } }),
  );
}

export function updatePlan(id: number, input: UpdatePlanInput): Promise<void> {
  return writePlanResource(
    "plan",
    adminRequest(`/plans/${id}`, {
      method: "PUT",
      data: { data: input, updateMask: Object.keys(input).join(",") },
    }),
  );
}

export function deletePlan(id: number): Promise<void> {
  return writePlanResource("plan", adminRequest("/plans", { method: "DELETE", params: { id } }));
}

export function listPlanQuotas(planId: number, input: PlanListInput = {}, signal?: AbortSignal) {
  return adminRequest<PlanList<PlanQuota>>("/plan-quotas", {
    method: "GET",
    signal,
    params: {
      ...pagingParams(input),
      query: JSON.stringify({
        plan_id: planId,
        ...(input.search ? { quota_code__contains: input.search } : {}),
      }),
      orderBy: "id desc",
    },
  });
}

export function createPlanQuota(input: CreatePlanQuotaInput): Promise<void> {
  const data = { planId: input.planId, quotaCode: input.quotaCode, quotaValue: input.quotaValue };
  return writePlanResource(
    "quota",
    adminRequest("/plan-quotas", { method: "POST", data: { data } }),
  );
}

export function updatePlanQuota(id: number, input: UpdatePlanQuotaInput): Promise<void> {
  const data: UpdatePlanQuotaInput = {};
  if (input.quotaCode !== undefined) data.quotaCode = input.quotaCode;
  if (input.quotaValue !== undefined) data.quotaValue = input.quotaValue;
  return writePlanResource(
    "quota",
    adminRequest(`/plan-quotas/${id}`, {
      method: "PUT",
      data: { data, updateMask: Object.keys(data).join(",") },
    }),
  );
}

export function deletePlanQuota(id: number): Promise<void> {
  return writePlanResource(
    "quota",
    adminRequest("/plan-quotas", { method: "DELETE", params: { id } }),
  );
}

export function listQuotaDefinitions(input: PageParams = {}, signal?: AbortSignal) {
  return adminRequest<PlanList<QuotaDefinition>>("/quota-definitions", {
    method: "GET",
    signal,
    params: pagingParams(input),
  });
}

// TODO(options-pagination): 配额目录选项暂取首 100 项；后端选项能力完善后移除固定分页策略。
export const listQuotaDefinitionOptions = withFirst100(listQuotaDefinitions);

export function listPlanModules(planId: number, input: PageParams = {}, signal?: AbortSignal) {
  return adminRequest<PlanList<PlanModule>>("/plan-modules", {
    method: "GET",
    signal,
    params: {
      ...pagingParams(input),
      query: JSON.stringify({ plan_id: planId }),
      orderBy: "id desc",
    },
  });
}

// TODO(options-pagination): 模块编辑暂取首 100 项，结果不完整时拒绝整组编辑；
// 待后端提供完整的模块集合或原子替换接口后移除此固定分页策略。
// TODO(api-verification): 联调确认空集合、重复关联、首 100 项边界及缺失字段时的拒绝行为。
export async function getPlanModulesForEditing(
  planId: number,
  signal?: AbortSignal,
): Promise<PlanModule[]> {
  const listModuleOptions = withFirst100((input: PageParams, requestSignal?: AbortSignal) =>
    listPlanModules(planId, input, requestSignal),
  );
  const result = await listModuleOptions({}, signal);
  const items = result.items ?? [];
  if (Number(result.total) !== items.length) {
    throw new Error("套餐可用模块未完整加载（当前最多读取 100 条），请刷新后联系管理员处理");
  }
  if (items.some((item) => !item.module || !Number.isInteger(item.id) || item.id <= 0)) {
    throw new Error("套餐可用模块数据不完整，请刷新后联系管理员处理");
  }
  return items;
}

// FIXME(plan-module-save): 套餐与模块独立提交，且模块关联没有唯一约束或幂等能力；
// 暂在每次提交前读取当前关联，逐条保存差量，失败保留已完成结果，下次提交重新查询后续写。
// 此编排不能保证并发下的原子性；待后端补齐组合创建、套餐 ID 返回及模块原子替换后移除。
// TODO(api-verification): 联调确认部分失败、网络中断后重试及重复关联的增删结果。
export async function savePlanModules(planId: number, modules: PlanModuleCode[]): Promise<void> {
  const current = await getPlanModulesForEditing(planId);
  const selected = new Set(modules);
  for (const item of current) {
    if (item.module && selected.has(item.module)) continue;
    await deletePlanModule(item.id);
  }
  const existing = new Set(current.map((item) => item.module));
  for (const module of selected) {
    if (existing.has(module)) continue;
    await createPlanModule({ planId, module });
  }
}

export function createPlanModule(input: CreatePlanModuleInput): Promise<void> {
  const data = { planId: input.planId, module: input.module };
  return writePlanResource(
    "module",
    adminRequest("/plan-modules", { method: "POST", data: { data } }),
  );
}

export function updatePlanModule(id: number, input: UpdatePlanModuleInput): Promise<void> {
  return writePlanResource(
    "module",
    adminRequest(`/plan-modules/${id}`, {
      method: "PUT",
      data: { data: { module: input.module }, updateMask: "module" },
    }),
  );
}

export function deletePlanModule(id: number): Promise<void> {
  return writePlanResource(
    "module",
    adminRequest("/plan-modules", { method: "DELETE", params: { id } }),
  );
}

export async function getPlanBoundTenantCount(id: number, signal?: AbortSignal): Promise<string> {
  // TODO(api-verification): 联调确认 plan_id 的服务端过滤 total 与实际绑定一致；409 仍作为删除最终保护。
  const result = await adminRequest<PlanList<unknown>>("/tenants", {
    method: "GET",
    signal,
    params: { page: 1, pageSize: 1, query: JSON.stringify({ plan_id: id }) },
  });
  return result.total;
}

export function getTenantUsage(id: number, signal?: AbortSignal) {
  return adminRequest<TenantUsage>(`/tenants/${id}/usage`, { method: "GET", signal });
}

export function getTenantQuotaAccounts(id: number, signal?: AbortSignal) {
  return adminRequest<TenantQuotaAccounts>(`/tenants/${id}/quota-accounts`, {
    method: "GET",
    signal,
  });
}
