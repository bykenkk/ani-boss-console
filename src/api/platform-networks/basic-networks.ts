import { adminRequest } from "@/api/request";
import { runIdempotentRequest } from "@/api/idempotency";
import { createIdempotencyScope } from "@/lib/idempotency";
import type {
  BasicNetworkAllocationInput,
  CreateBasicNetworkInput,
  IntranetPoolDefaults,
  SetDefaultBasicNetworkInput,
} from "./types";

export const intranetPoolDefaultsKey = ["intranet-address-pool-defaults"] as const;
const createScope = createIdempotencyScope("basic-network-create", ["POST"]);
const defaultScope = createIdempotencyScope("basic-network-default", ["POST"]);
const autoAllocationScope = createIdempotencyScope("basic-network-auto-allocation", ["PUT"]);

export function getIntranetPoolDefaults(signal?: AbortSignal): Promise<IntranetPoolDefaults> {
  return adminRequest("/networks/intranet-address-pool-defaults", { signal });
}

export async function createBasicNetwork(input: CreateBasicNetworkInput): Promise<void> {
  await runIdempotentRequest(createScope, input, async (data) => {
    await adminRequest("/networks/intranet-address-pools", { method: "POST", data: { data } });
  });
}

export async function setDefaultBasicNetwork(
  id: string,
  input: SetDefaultBasicNetworkInput,
): Promise<void> {
  await runIdempotentRequest(
    defaultScope,
    input,
    async (data) => {
      await adminRequest(`/networks/intranet-address-pools/${encodeURIComponent(id)}/default`, {
        method: "POST",
        data: { data },
      });
    },
    [id],
  );
}

export async function setBasicNetworkAutoAllocation(
  id: string,
  input: BasicNetworkAllocationInput,
): Promise<void> {
  await runIdempotentRequest(
    autoAllocationScope,
    input,
    async (data) => {
      await adminRequest(
        `/networks/intranet-address-pools/${encodeURIComponent(id)}/auto-allocation`,
        {
          method: "PUT",
          data: { data },
        },
      );
    },
    [id],
  );
}
