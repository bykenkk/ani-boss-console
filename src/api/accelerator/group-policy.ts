import { adminRequest } from "@/api/request";
import { runIdempotentRequest } from "@/api/idempotency";
import { createIdempotencyScope } from "@/lib/idempotency";
import { initializationRequest, rememberInitializationOperation } from "./initialization-draft";
import type {
  CreateInitializationInput,
  DiscoveredNodes,
  InitializationOperation,
  InitializationStatus,
  PreviewSupplyGroupPolicyInput,
  RegisteredSupplyConfiguration,
  RegisterSupplyConfigurationInput,
  SupplyCandidates,
  SupplyGroupPolicyPreview,
  SupplyPageParams,
  SupplyRegistrationResult,
} from "./types-group-policy";
const registrationScope = createIdempotencyScope("gpu-supply-registration", ["POST"]);
const retryScope = createIdempotencyScope("gpu-initialization-retry", ["POST"]);
export function listSupplyCandidates(
  params: SupplyPageParams,
  signal?: AbortSignal,
): Promise<SupplyCandidates> {
  return adminRequest("/accelerator/supply-candidates", { params, signal });
}
export function registerSupplyConfiguration(
  input: RegisterSupplyConfigurationInput,
): Promise<SupplyRegistrationResult> {
  return runIdempotentRequest(registrationScope, input, async (data) => {
    const result = await adminRequest<SupplyRegistrationResult, { data: typeof data }>(
      "/accelerator/supply-registrations",
      { method: "POST", data: { data } },
    );
    if (!result?.registration_id) throw new Error("供给登记响应缺少登记 ID，请重发原请求确认结果");
    return result;
  });
}
export function getSupplyRegistration(
  registration_id: string,
  signal?: AbortSignal,
): Promise<SupplyRegistrationResult> {
  return adminRequest(`/accelerator/supply-registrations/${encodeURIComponent(registration_id)}`, {
    signal,
  });
}
export function getSupplyConfiguration(
  connection_ref: string,
  provider_config_ref: string,
  signal?: AbortSignal,
): Promise<RegisteredSupplyConfiguration> {
  return adminRequest("/accelerator/supply-configurations", {
    params: { connection_ref, provider_config_ref },
    signal,
  });
}
export function listDiscoveredNodes(
  params: SupplyPageParams,
  signal?: AbortSignal,
): Promise<DiscoveredNodes> {
  return adminRequest("/accelerator/discovered-nodes", { params, signal });
}
export function previewSupplyGroupPolicy(
  input: PreviewSupplyGroupPolicyInput,
  signal?: AbortSignal,
): Promise<SupplyGroupPolicyPreview> {
  return adminRequest("/accelerator/supply-groups:preview-policy", {
    method: "POST",
    data: { data: input },
    signal,
  });
}
export function getInitialization(
  connection_ref: string,
  signal?: AbortSignal,
): Promise<InitializationStatus> {
  return adminRequest("/accelerator/initialization", { params: { connection_ref }, signal });
}
export async function createInitialization(
  input: CreateInitializationInput,
  principal: string,
  signal?: AbortSignal,
): Promise<InitializationOperation> {
  const data = initializationRequest(principal, input);
  // Cancellation, timeout and transport failure leave this persisted request untouched.
  const result = await adminRequest<InitializationOperation, { data: typeof data }>(
    "/accelerator/initializations",
    { method: "POST", data: { data }, signal },
  );
  if (!result?.operation_id) throw new Error("初始化响应缺少任务 ID，请重发原请求确认结果");
  rememberInitializationOperation(principal, input.connection_ref, result);
  return result;
}
export function getInitializationOperation(
  operation_id: string,
  signal?: AbortSignal,
): Promise<InitializationOperation> {
  return adminRequest(`/accelerator/initializations/${encodeURIComponent(operation_id)}`, {
    signal,
  });
}
export function retryInitializationOperation(
  operation_id: string,
  expected_version: string,
): Promise<InitializationOperation> {
  return runIdempotentRequest(
    retryScope,
    { expected_version },
    (data) =>
      adminRequest(`/accelerator/initializations/${encodeURIComponent(operation_id)}:retry`, {
        method: "POST",
        data: { data },
      }),
    [operation_id],
  );
}
export { readInitializationDraft, beginNewInitializationIntent } from "./initialization-draft";
