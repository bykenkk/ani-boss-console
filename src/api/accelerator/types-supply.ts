import type { PageParams } from "@/api/types";
import type { GpuAllocationType, GpuBaseline, GpuInitializationCheck, GpuNode } from "./types";

export interface GpuSupplyCandidatesParams extends PageParams {
  connection_ref: string;
}

export interface GpuSupplyFactSource {
  field: string;
  source: "AUTOMATIC_OBSERVATION" | "MANUAL_DECLARATION";
  ref: string;
}

export interface GpuSupplyCandidate {
  candidate_id: string;
  node: GpuNode;
  adapter_id: string;
  allocation_type: GpuAllocationType;
  resource_key: string;
  model_key: string;
  device_uids: string[];
  // Unknown facts stay null or absent; known zero, false and empty string remain values.
  memory_capacity_bytes?: string | null;
  compute_units_per_device?: number | null;
  memory_block_mib?: number | null;
  split_count?: number | null;
  core_budget_additive?: boolean | null;
  max_memory_mib_per_device?: string | null;
  runtime_class_name?: string | null;
  runtime_class_candidates: string[];
  resource_mapping_required: boolean;
  sources: GpuSupplyFactSource[];
  missing_fields: string[];
  blocking_reasons: string[];
}

export interface GpuSupplyCandidates {
  connection_ref: string;
  items: GpuSupplyCandidate[];
  total: string;
  discovery_revision: string;
  checks: GpuInitializationCheck[];
}

export type GpuSupplyDeclarationField =
  | "model_key"
  | "memory_capacity_bytes"
  | "compute_units_per_device"
  | "memory_block_mib"
  | "split_count"
  | "core_budget_additive"
  | "max_memory_mib_per_device"
  | "runtime_class_name";

export interface GpuSupplyDeclaration {
  field: GpuSupplyDeclarationField;
  value: string;
  source: string;
}

export interface GpuSupplyRegistrationInput {
  client_key: string;
  candidate_ids: string[];
  display_name: string;
  max_devices_per_replica: number;
  runtime_class_name: string;
  declarations: GpuSupplyDeclaration[];
  resource_mapping_confirmed: boolean;
  resource_mapping_source: string;
}

export interface RegisterGpuSupplyConfigurationInput {
  connection_ref: string;
  discovery_revision: string;
  registrations: GpuSupplyRegistrationInput[];
}

export interface RegisterGpuSupplyConfigurationRequest {
  data: RegisterGpuSupplyConfigurationInput & { idempotency_key: string };
}

export interface GpuRegisteredSupplyConfiguration {
  registration_id: string;
  client_key: string;
  connection_ref: string;
  provider_config_ref: string;
  version: string;
  display_name: string;
  nodes: GpuNode[];
  model_key: string;
  baseline: GpuBaseline;
  candidates: GpuSupplyCandidate[];
  declarations: GpuSupplyDeclaration[];
  resource_mapping_source: string;
  created_at: string;
}

export interface GpuSupplyRegistrationResult {
  registration_id: string;
  connection_ref: string;
  created_at: string;
  configurations: GpuRegisteredSupplyConfiguration[];
}
