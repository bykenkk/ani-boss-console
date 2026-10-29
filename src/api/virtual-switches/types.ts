import type { PageParams } from "@/api/types";

export type VirtualSwitchState =
  | "provisioning"
  | "available"
  | "degraded"
  | "failed"
  | "deleting"
  | "deleted";

export interface VirtualSwitchNode {
  node_name: string;
  node_uid: string;
  mac: string;
  priority: number;
  state: string;
  reason: string;
}

export interface VirtualSwitch {
  id: string;
  name: string;
  state: VirtualSwitchState;
  reason: string;
  reason_message: string;
  version: string;
  created_at?: string;
  updated_at?: string;
  last_operation_id: string;
  cluster_id: string;
  group_name: string;
  binding_state: string;
  binding_version: string;
  membership_fingerprint: string;
  nodes: VirtualSwitchNode[];
}

export interface VirtualSwitchListParams extends PageParams {
  name?: string;
  state?: VirtualSwitchState;
}

export interface VirtualSwitchList {
  items: VirtualSwitch[];
  total: string;
}

export interface CreateVirtualSwitchInput {
  name: string;
}

export interface CreateVirtualSwitchRequest {
  data: CreateVirtualSwitchInput & { idempotency_key: string };
}
