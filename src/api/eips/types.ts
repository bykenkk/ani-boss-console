import type { PageParams } from "@/api/types";

export interface EIP {
  id: string;
  name: string;
  description: string;
  state: string;
  reason: string;
  reason_message: string;
  version: string;
  address: string;
  tenant_id: number;
  tenant_name: string;
  resource_tenant_id: string;
  pool_id: string;
  pool_name: string;
  cluster_id: string;
  scope: string;
  managed_by: string;
  binding_state: string;
  binding_target?: { kind: string; id: string; state: string };
  observation_stale: boolean;
  observed_at?: string;
  created_at?: string;
  updated_at?: string;
  last_operation_id: string;
}
export interface EIPListParams extends PageParams {
  tenant_id?: number;
  name?: string;
  address?: string;
  pool_id?: string;
  state?: string;
  scope?: string;
}
export interface EIPList {
  items: EIP[];
  total: string;
}
