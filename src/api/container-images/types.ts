import type { PageParams } from "@/api/types";
export type ImagePurpose = "container" | "development" | "inference" | "finetuning" | "training";
export type ImageAccelerator = "undeclared" | "none" | "nvidia" | "amd" | "ascend" | "other";
export type ImageTarget = { scope: "platform" } | { scope: "tenant"; tenantId: number };
export interface ImageSpace {
  spaceId: string;
  projectName: string;
  registryAuthority: string;
  state: "provisioning" | "available" | "blocked";
  reason: string;
  version: string;
  pullCredentialGeneration: string;
  createdAt: string;
  updatedAt: string;
}
export interface PlatformSpaceView {
  space: ImageSpace | null;
  configuredProject: string;
  configuredRegistryAuthority: string;
  bindingStatus: "uninitialized" | "ready" | "provisioning" | "blocked" | "configuration_mismatch";
}
export interface PublisherCredential {
  spaceId: string;
  generation: string;
  username: string;
  state: "not_issued" | "active" | "disabled" | "blocked";
  version: string;
  expiresAt: string | null;
  updatedAt: string;
}
export interface CredentialDelivery {
  credential: PublisherCredential;
  secret: string;
  replayUntil: string | null;
}
export interface ImageRegistration {
  image_id: string;
  scope: "platform" | "tenant";
  spaceId: string;
  displayName: string;
  description: string;
  repository: string;
  sourceReference: string;
  digest: string;
  resolvedReference: string;
  platforms: Array<{ os: string; architecture: string; variant: string }>;
  purposes: ImagePurpose[];
  accelerator: ImageAccelerator;
  version: string;
  createdAt: string;
  updatedAt: string;
  unregisteredAt: string | null;
}
export interface ImagePage {
  items: ImageRegistration[];
  total: string;
}
export interface ImageListInput extends PageParams {
  search?: string;
  purposes?: ImagePurpose[];
  accelerator?: ImageAccelerator;
}
export interface RegisterImageInput {
  imageReference: string;
  displayName: string;
  description: string;
  purposes: ImagePurpose[];
  accelerator: ImageAccelerator;
}
export interface UpdateImageInput {
  expectedVersion: string;
  displayName?: string;
  description?: string;
  purposes?: ImagePurpose[];
  accelerator?: ImageAccelerator;
}
export interface CredentialInput {
  expectedVersion: string;
}
