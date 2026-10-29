import { adminRequest } from "@/api/request";
import type { GpuDeviceList, GpuDeviceListParams } from "./types";
export * from "./types";

export const gpuMonitoringKeys = {
  all: ["gpu-monitoring"] as const,
  devices: (params: GpuDeviceListParams) => ["gpu-monitoring", "devices", params] as const,
};

export function listPhysicalGpuDevices(params: GpuDeviceListParams, signal?: AbortSignal) {
  return adminRequest<GpuDeviceList>("/gpu/devices", { params: { ...params }, signal });
}
