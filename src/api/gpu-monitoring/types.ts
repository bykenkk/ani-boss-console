import type { GpuDevice } from "@/api/accelerator";
import type { PageParams } from "@/api/types";

export interface GpuDeviceListParams extends PageParams {
  clusterId: string;
  modelKey?: string;
}

export interface GpuDeviceList {
  items: GpuDevice[];
  total: string;
}
