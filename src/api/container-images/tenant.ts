import { ApiError } from "@/api/request";
// 代管详情按既有契约解包 space / credential / image；空间是 ImageSpace，不套用平台组合视图。
// 签发、重置返回一次性凭据投递结果，其他写操作返回 void；目标租户只通过路径传递。
import { createImageWrite, imagePatch, imageRequest, tenantImageBase } from "./requests";
import type {
  CredentialDelivery,
  CredentialInput,
  ImageListInput,
  ImagePage,
  ImageRegistration,
  ImageSpace,
  PublisherCredential,
  RegisterImageInput,
  UpdateImageInput,
} from "./types";
const enable = createImageWrite("tenant-enable");
const issue = createImageWrite("tenant-issue");
const reset = createImageWrite("tenant-reset");
const disable = createImageWrite("tenant-disable");
const register = createImageWrite("tenant-register");
const update = createImageWrite("tenant-update", "PATCH");
const unregister = createImageWrite("tenant-unregister");
export async function getTenantImageSpace(
  tenantId: number,
  signal?: AbortSignal,
): Promise<ImageSpace | null> {
  try {
    return (
      await imageRequest<{ space: ImageSpace }>(`${tenantImageBase(tenantId)}/space`, { signal })
    ).space;
  } catch (error) {
    if (error instanceof ApiError && error.status === 404 && error.reason === "SPACE_NOT_FOUND")
      return null;
    throw error;
  }
}
export async function enableTenantImageSpace(
  tenantId: number,
  slug: string,
  signal?: AbortSignal,
): Promise<void> {
  await enable(tenantImageBase(tenantId), "/space:enable", { slug }, signal);
}
export async function getTenantPublisherCredential(
  tenantId: number,
  signal?: AbortSignal,
): Promise<PublisherCredential> {
  return (
    await imageRequest<{ credential: PublisherCredential }>(
      `${tenantImageBase(tenantId)}/publisher-credential`,
      { signal },
    )
  ).credential;
}
export async function issueTenantPublisherCredential(
  tenantId: number,
  input: CredentialInput,
  signal?: AbortSignal,
): Promise<CredentialDelivery> {
  return issue<CredentialDelivery>(
    tenantImageBase(tenantId),
    "/publisher-credential:issue",
    input,
    signal,
  );
}
export async function resetTenantPublisherCredential(
  tenantId: number,
  input: CredentialInput,
  signal?: AbortSignal,
): Promise<CredentialDelivery> {
  return reset<CredentialDelivery>(
    tenantImageBase(tenantId),
    "/publisher-credential:reset",
    input,
    signal,
  );
}
export async function disableTenantPublisherCredential(
  tenantId: number,
  input: CredentialInput,
  signal?: AbortSignal,
): Promise<void> {
  await disable(tenantImageBase(tenantId), "/publisher-credential:disable", input, signal);
}
export function listTenantImages(tenantId: number, input: ImageListInput, signal?: AbortSignal) {
  return imageRequest<ImagePage>(`${tenantImageBase(tenantId)}/registrations`, {
    params: input,
    signal,
  });
}
export async function getTenantImage(
  tenantId: number,
  id: string,
  signal?: AbortSignal,
): Promise<ImageRegistration> {
  return (
    await imageRequest<{ image: ImageRegistration }>(
      `${tenantImageBase(tenantId)}/registrations/${encodeURIComponent(id)}`,
      { signal },
    )
  ).image;
}
export async function registerTenantImage(
  tenantId: number,
  input: RegisterImageInput,
  signal?: AbortSignal,
): Promise<void> {
  await register(tenantImageBase(tenantId), "/registrations", input, signal);
}
export async function updateTenantImage(
  tenantId: number,
  id: string,
  input: UpdateImageInput,
  signal?: AbortSignal,
): Promise<void> {
  const patch = imagePatch(input);
  await update(
    tenantImageBase(tenantId),
    `/registrations/${encodeURIComponent(id)}`,
    patch.data,
    signal,
    patch.updateMask,
  );
}
export async function unregisterTenantImage(
  tenantId: number,
  id: string,
  input: CredentialInput,
  signal?: AbortSignal,
): Promise<void> {
  await unregister(
    tenantImageBase(tenantId),
    `/registrations/${encodeURIComponent(id)}:unregister`,
    input,
    signal,
  );
}
