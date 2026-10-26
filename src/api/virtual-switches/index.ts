import { runIdempotentRequest } from "@/api/idempotency";
import { adminRequest } from "@/api/request";
import { createIdempotencyScope } from "@/lib/idempotency";
import type {
  CreateVirtualSwitchInput,
  CreateVirtualSwitchRequest,
  VirtualSwitchList,
  VirtualSwitchListParams,
} from "./types";

export * from "./types";

const path = "/networks/virtual-switches";
const createScope = createIdempotencyScope("virtual-switch-create", ["POST"]);

export const virtualSwitchKeys = {
  all: ["virtual-switches"] as const,
  list: (params: VirtualSwitchListParams) => ["virtual-switches", "list", params] as const,
};

// TODO(virtual-switch-integration): 联调验证真实分页、名称筛选、空数据、401 刷新和请求取消。
export function listVirtualSwitches(
  params: VirtualSwitchListParams,
  signal?: AbortSignal,
): Promise<VirtualSwitchList> {
  return adminRequest(path, { params, signal });
}

// TODO(virtual-switch-integration): 联调验证创建结果及同名、网络失败后的幂等重试。
export async function createVirtualSwitch(input: CreateVirtualSwitchInput): Promise<void> {
  await runIdempotentRequest(createScope, input, async (data) => {
    const request: CreateVirtualSwitchRequest = { data };
    await adminRequest(path, { method: "POST", data: request });
  });
}

// TODO(virtual-switch-integration): 联调验证删除受理、典型失败、重复删除及 401 刷新。
export async function deleteVirtualSwitch(id: string): Promise<void> {
  await adminRequest(`${path}/${encodeURIComponent(id)}`, { method: "DELETE" });
}
