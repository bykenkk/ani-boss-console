import { adminRequest } from "@/api/request";
import { runIdempotentRequest } from "@/api/idempotency";
import { createIdempotencyScope } from "@/lib/idempotency";
import type {
  CreateLayer2NetworkInput,
  CreatePublicNetworkInput,
  PlatformNetworkKind,
  PlatformNetworkList,
  PlatformNetworkListParams,
  PublicPoolAllocationInput,
  PublicPoolVerificationInput,
} from "./types";
export * from "./types";
export const platformNetworkKeys = {
  all: (kind: PlatformNetworkKind) => ["platform-networks", kind] as const,
  list: (kind: PlatformNetworkKind, params: PlatformNetworkListParams) =>
    ["platform-networks", kind, "list", params] as const,
};
// TODO(pagination-migration): 后端完成 page/pageSize 后迁移；当前按正式 limit/cursor 契约逐页查询。
// TODO(underlay-integration): 联调验证创建、删除、游标分页、典型失败及 401 刷新。
export function listPlatformNetworks(
  kind: PlatformNetworkKind,
  params: PlatformNetworkListParams,
  signal?: AbortSignal,
): Promise<PlatformNetworkList> {
  return adminRequest(`/networks/${kind}`, { params, signal });
}
const layer2CreateScope = createIdempotencyScope("layer2-network-create", ["POST"]);
const publicCreateScope = createIdempotencyScope("public-network-create", ["POST"]);
export async function createLayer2Network(input: CreateLayer2NetworkInput): Promise<void> {
  await runIdempotentRequest(layer2CreateScope, input, async (data) => {
    await adminRequest("/networks/vlan-networks", { method: "POST", data: { data } });
  });
}
export async function createPublicNetwork(input: CreatePublicNetworkInput): Promise<void> {
  await runIdempotentRequest(publicCreateScope, input, async (data) => {
    await adminRequest("/networks/public-address-pools", { method: "POST", data: { data } });
  });
}
export async function deletePlatformNetwork(kind: PlatformNetworkKind, id: string): Promise<void> {
  await adminRequest(`/networks/${kind}/${encodeURIComponent(id)}`, { method: "DELETE" });
}
const verificationScope = createIdempotencyScope("public-pool-verification", ["POST"]);
const allocationScope = createIdempotencyScope("public-pool-allocation", ["PATCH"]);
// TODO(underlay-integration): 联调验证真实证据准入、版本冲突及分配启停条件。
export async function recordPublicPoolVerification(
  id: string,
  input: PublicPoolVerificationInput,
): Promise<void> {
  await runIdempotentRequest(
    verificationScope,
    input,
    async (data) => {
      await adminRequest(`/networks/public-address-pools/${encodeURIComponent(id)}/verification`, {
        method: "POST",
        data: { data },
      });
    },
    [id],
  );
}
export async function setPublicPoolAllocation(
  id: string,
  input: PublicPoolAllocationInput,
): Promise<void> {
  await runIdempotentRequest(
    allocationScope,
    input,
    async (data) => {
      await adminRequest(`/networks/public-address-pools/${encodeURIComponent(id)}/allocation`, {
        method: "PATCH",
        data: { data },
      });
    },
    [id],
  );
}
