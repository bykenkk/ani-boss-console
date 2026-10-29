import { adminRequest, ApiError } from "@/api/request";
import { runIdempotentRequest } from "@/api/idempotency";
import { createIdempotencyScope } from "@/lib/idempotency";
import type { DefaultVPCEgress, CreateDefaultVPCEgressInput } from "./types";

export const defaultEgressKey = ["platform-default-vpc-egress"] as const;
const createScope = createIdempotencyScope("platform-default-vpc-egress-create", ["POST"]);

export async function getCurrentDefaultVPCEgress(
  signal?: AbortSignal,
): Promise<DefaultVPCEgress | null> {
  try {
    return await adminRequest<DefaultVPCEgress>("/networks/default-vpc-egress", { signal });
  } catch (error) {
    if (error instanceof ApiError && error.status === 404 && error.reason === "RESOURCE_NOT_FOUND")
      return null;
    throw error;
  }
}
export async function createDefaultVPCEgress(input: CreateDefaultVPCEgressInput): Promise<void> {
  await runIdempotentRequest(createScope, input, async (data) => {
    await adminRequest("/networks/default-vpc-egresses", { method: "POST", data: { data } });
  });
}
export async function deleteDefaultVPCEgress(id: string): Promise<void> {
  await adminRequest(`/networks/default-vpc-egresses/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
}
