export * from "./types";
export * from "./platform";
export * from "./tenant";
import type { ImageTarget } from "./types";
export const imageKeys = {
  target: (target: ImageTarget) =>
    [
      "container-images",
      target.scope,
      target.scope === "tenant" ? target.tenantId : "platform",
    ] as const,
  space: (target: ImageTarget) => [...imageKeys.target(target), "space"] as const,
  credential: (target: ImageTarget) => [...imageKeys.target(target), "credential"] as const,
  detail: (target: ImageTarget, id: string) => [...imageKeys.target(target), "detail", id] as const,
};
