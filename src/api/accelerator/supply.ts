import { requireGpuScope, requireGpuSupplyTarget, type GpuOperationScope } from "./scope";
import { adminRequest } from "@/api/request";
import { runIdempotentRequest } from "@/api/idempotency";
import { createIdempotencyScope } from "@/lib/idempotency";
import type {
  GpuSupplyCandidates,
  GpuSupplyCandidatesParams,
  GpuSupplyRegistrationResult,
  RegisterGpuSupplyConfigurationInput,
  RegisterGpuSupplyConfigurationRequest,
} from "./types-supply";

const registerScope = createIdempotencyScope("gpu-supply-register", ["POST"]);

export function listGpuSupplyCandidates(
  params: GpuSupplyCandidatesParams,
  signal?: AbortSignal,
): Promise<GpuSupplyCandidates> {
  return adminRequest("/accelerator/supply-candidates", { params, signal });
}

// 同步供给登记的局部合同：保留收据 ID，以便查询持久化结果并继续初始化。
// 登记成功后仍需重新发现节点，不能复用登记前的初始化 revision。
export function registerGpuSupplyConfiguration(
  input: RegisterGpuSupplyConfigurationInput,
  scope: GpuOperationScope,
): Promise<GpuSupplyRegistrationResult> {
  requireGpuScope(scope, input.connection_ref);
  return runIdempotentRequest(
    registerScope,
    input,
    async (data) => {
      const result = await adminRequest<
        GpuSupplyRegistrationResult,
        RegisterGpuSupplyConfigurationRequest
      >("/accelerator/supply-registrations", { method: "POST", data: { data } });
      if (!result?.registration_id) {
        throw new Error("供给登记响应缺少登记 ID，请重发原请求确认结果");
      }
      return requireGpuSupplyTarget(result, scope);
    },
    [scope.principal, scope.connection_ref, scope.cluster_id],
  );
}

export function getGpuSupplyRegistration(
  registrationId: string,
  signal?: AbortSignal,
): Promise<GpuSupplyRegistrationResult> {
  return adminRequest(`/accelerator/supply-registrations/${encodeURIComponent(registrationId)}`, {
    signal,
  });
}
