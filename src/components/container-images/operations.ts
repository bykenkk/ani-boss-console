import * as api from "@/api/container-images";
import type {
  ImageTarget,
  ImageListInput,
  CredentialInput,
  RegisterImageInput,
  UpdateImageInput,
} from "@/api/container-images";
export function imageOperations(target: ImageTarget) {
  if (target.scope === "platform")
    return {
      getCredential: api.getPlatformPublisherCredential,
      issue: api.issuePlatformPublisherCredential,
      reset: api.resetPlatformPublisherCredential,
      disable: api.disablePlatformPublisherCredential,
      list: api.listPlatformImages,
      detail: api.getPlatformImage,
      register: api.registerPlatformImage,
      update: api.updatePlatformImage,
      unregister: api.unregisterPlatformImage,
    };
  const id = target.tenantId;
  return {
    getCredential: (signal?: AbortSignal) => api.getTenantPublisherCredential(id, signal),
    issue: (input: CredentialInput, signal?: AbortSignal) =>
      api.issueTenantPublisherCredential(id, input, signal),
    reset: (input: CredentialInput, signal?: AbortSignal) =>
      api.resetTenantPublisherCredential(id, input, signal),
    disable: (input: CredentialInput, signal?: AbortSignal) =>
      api.disableTenantPublisherCredential(id, input, signal),
    list: (input: ImageListInput, signal?: AbortSignal) => api.listTenantImages(id, input, signal),
    detail: (imageId: string, signal?: AbortSignal) => api.getTenantImage(id, imageId, signal),
    register: (input: RegisterImageInput, signal?: AbortSignal) =>
      api.registerTenantImage(id, input, signal),
    update: (imageId: string, input: UpdateImageInput, signal?: AbortSignal) =>
      api.updateTenantImage(id, imageId, input, signal),
    unregister: (imageId: string, input: CredentialInput, signal?: AbortSignal) =>
      api.unregisterTenantImage(id, imageId, input, signal),
  };
}
