import { requireGpuScope, requireGpuOperationTarget, type GpuOperationScope } from "./scope";
import { adminRequest } from "@/api/request";
import { runIdempotentRequest } from "@/api/idempotency";
import { createIdempotencyScope } from "@/lib/idempotency";
import type {
  CreateGpuInitializationRequest,
  GpuDiscoveredNodes,
  GpuDiscoveryParams,
  GpuInitialization,
  GpuInitializationInput,
  GpuInitializationOperation,
  RetryGpuInitializationInput,
  RetryGpuInitializationRequest,
} from "./types";

const createScope = createIdempotencyScope("gpu-initialization-create", ["POST"]);
const retryScope = createIdempotencyScope("gpu-initialization-retry", ["POST"]);

export function getGpuInitialization(
  connection_ref: string,
  signal?: AbortSignal,
): Promise<GpuInitialization> {
  return adminRequest("/accelerator/initialization", { params: { connection_ref }, signal });
}

// Gov 23f5d098 的发现页大小上限为 200；前端限制在 100 内，保留真实 items/total 页码契约。
export function discoverGpuNodes(
  params: GpuDiscoveryParams,
  signal?: AbortSignal,
): Promise<GpuDiscoveredNodes> {
  return adminRequest("/accelerator/discovered-nodes", { params, signal });
}

// GPU 初始化局部合同：保留任务响应并接入进度及重试，不套用普通创建丢弃响应和 task 暂缓规则。
// TODO(request-migration): Gov 去除初始化写请求 data 包装后同步调整；当前严格保留目标版本包装。
export function createGpuInitialization(
  input: GpuInitializationInput,
  scope: GpuOperationScope,
): Promise<GpuInitializationOperation> {
  requireGpuScope(scope, input.connection_ref);
  // 写请求不随弹窗关闭而取消；结果未知时保留原正文及作用域中的键，避免取消重置后重复创建。
  return runIdempotentRequest(
    createScope,
    input,
    async (data) => {
      const operation = await adminRequest<
        GpuInitializationOperation,
        CreateGpuInitializationRequest
      >("/accelerator/initializations", { method: "POST", data: { data } });
      // 缺失任务标识时结果仍未知，不让成功分支重置幂等键。
      if (!operation?.operation_id) throw new Error("初始化响应缺少任务 ID，请重发原请求确认结果");
      return requireGpuOperationTarget(operation, scope);
    },
    [scope.principal, scope.connection_ref, scope.cluster_id],
  );
}

export function getGpuInitializationOperation(
  operationId: string,
  signal?: AbortSignal,
): Promise<GpuInitializationOperation> {
  return adminRequest(`/accelerator/initializations/${encodeURIComponent(operationId)}`, {
    signal,
  });
}

// TODO(request-migration): Gov 去除重试请求 data 包装后同步调整；响应保留真实任务状态和版本。
export function retryGpuInitialization(
  { operation_id, ...input }: RetryGpuInitializationInput,
  scope: GpuOperationScope,
): Promise<GpuInitializationOperation> {
  requireGpuScope(scope);
  return runIdempotentRequest(
    retryScope,
    input,
    async (data) => {
      const operation = await adminRequest<
        GpuInitializationOperation,
        RetryGpuInitializationRequest
      >(`/accelerator/initializations/${encodeURIComponent(operation_id)}:retry`, {
        method: "POST",
        data: { data },
      });
      if (operation?.operation_id !== operation_id)
        throw new Error("重试响应的任务 ID 不匹配，请重发原请求确认结果");
      return requireGpuOperationTarget(operation, scope);
    },
    [scope.principal, scope.connection_ref, scope.cluster_id, operation_id],
  );
}
