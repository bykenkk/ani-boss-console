import { createImageWrite, imagePatch, imageRequest } from "./requests";
// 本域详情按既有契约保留 space / credential / image 包装，由本模块解包；平台空间内层组合视图不扁平化。
// 仅签发、重置保留 CredentialDelivery 供即时展示一次性密钥；其他写操作丢弃响应并由页面重新查询。
import type {
  CredentialDelivery,
  CredentialInput,
  ImageListInput,
  ImagePage,
  ImageRegistration,
  PlatformSpaceView,
  PublisherCredential,
  RegisterImageInput,
  UpdateImageInput,
} from "./types";
const enable = createImageWrite("platform-enable");
const issue = createImageWrite("platform-issue");
const reset = createImageWrite("platform-reset");
const disable = createImageWrite("platform-disable");
const register = createImageWrite("platform-register");
const update = createImageWrite("platform-update", "PATCH");
const unregister = createImageWrite("platform-unregister");
export async function getPlatformImageSpace(signal?: AbortSignal): Promise<PlatformSpaceView> {
  return (await imageRequest<{ space: PlatformSpaceView }>("/images/space", { signal })).space;
}
export async function enablePlatformImageSpace(signal?: AbortSignal): Promise<void> {
  await enable("/images", "/space:enable", {}, signal);
}
export async function getPlatformPublisherCredential(
  signal?: AbortSignal,
): Promise<PublisherCredential> {
  return (
    await imageRequest<{ credential: PublisherCredential }>("/images/publisher-credential", {
      signal,
    })
  ).credential;
}
export async function issuePlatformPublisherCredential(
  input: CredentialInput,
  signal?: AbortSignal,
): Promise<CredentialDelivery> {
  return issue<CredentialDelivery>("/images", "/publisher-credential:issue", input, signal);
}
export async function resetPlatformPublisherCredential(
  input: CredentialInput,
  signal?: AbortSignal,
): Promise<CredentialDelivery> {
  return reset<CredentialDelivery>("/images", "/publisher-credential:reset", input, signal);
}
export async function disablePlatformPublisherCredential(
  input: CredentialInput,
  signal?: AbortSignal,
): Promise<void> {
  await disable("/images", "/publisher-credential:disable", input, signal);
}
export function listPlatformImages(input: ImageListInput, signal?: AbortSignal) {
  return imageRequest<ImagePage>("/images/registrations", { params: input, signal });
}
export async function getPlatformImage(
  id: string,
  signal?: AbortSignal,
): Promise<ImageRegistration> {
  return (
    await imageRequest<{ image: ImageRegistration }>(
      `/images/registrations/${encodeURIComponent(id)}`,
      { signal },
    )
  ).image;
}
export async function registerPlatformImage(
  input: RegisterImageInput,
  signal?: AbortSignal,
): Promise<void> {
  await register("/images", "/registrations", input, signal);
}
export async function updatePlatformImage(
  id: string,
  input: UpdateImageInput,
  signal?: AbortSignal,
): Promise<void> {
  const patch = imagePatch(input);
  await update(
    "/images",
    `/registrations/${encodeURIComponent(id)}`,
    patch.data,
    signal,
    patch.updateMask,
  );
}
export async function unregisterPlatformImage(
  id: string,
  input: CredentialInput,
  signal?: AbortSignal,
): Promise<void> {
  await unregister("/images", `/registrations/${encodeURIComponent(id)}:unregister`, input, signal);
}
