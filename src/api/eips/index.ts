import { adminRequest } from "@/api/request";
import type { EIP, EIPList, EIPListParams } from "./types";
export * from "./types";

export const eipKeys = {
  all: ["platform-eips"] as const,
  list: (params: EIPListParams) => ["platform-eips", "list", params] as const,
  detail: (id: string) => ["platform-eips", "detail", id] as const,
};
export function listEIPs(params: EIPListParams, signal?: AbortSignal): Promise<EIPList> {
  return adminRequest("/networks/eips", { params, signal });
}
export function getEIP(id: string, signal?: AbortSignal): Promise<EIP> {
  return adminRequest(`/networks/eips/${encodeURIComponent(id)}`, { signal });
}
export async function releaseEIP(id: string): Promise<void> {
  await adminRequest(`/networks/eips/${encodeURIComponent(id)}`, { method: "DELETE" });
}
