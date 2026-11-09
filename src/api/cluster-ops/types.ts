export type ClusterOpsDecimal64 = string;
export interface ClusterOpsCluster {
  cluster_id: string;
  display_name: string;
}
export interface ClusterOpsResourceTypeRef {
  group: string;
  version: string;
  resource: string;
}
export interface ClusterOpsResourceRef {
  cluster_id: string;
  type: ClusterOpsResourceTypeRef;
  namespace: string;
  name: string;
}
export type ClusterOpsAction =
  | "list"
  | "get"
  | "create"
  | "update"
  | "delete"
  | "scale"
  | "restart"
  | "logs";
export interface ClusterOpsResourceDescriptor {
  type: ClusterOpsResourceTypeRef;
  kind: string;
  namespaced: boolean;
  actions: ClusterOpsAction[];
  custom_resource: boolean;
  crd_name: string;
}
export interface ClusterOpsResourceDocument {
  ref: ClusterOpsResourceRef;
  uid: string;
  resource_version: string;
  object_json: string;
  read_only: boolean;
  read_only_reason: string;
  secret_data_redacted: boolean;
  secret_keys: string[];
}
export interface ClusterOpsClusterOverview {
  cluster_id: string;
  kubernetes_version: string;
  nodes_total: ClusterOpsDecimal64;
  nodes_ready: ClusterOpsDecimal64;
  namespaces_total: ClusterOpsDecimal64;
  pods_total: ClusterOpsDecimal64;
  pod_phase_counts: Record<string, ClusterOpsDecimal64>;
  capacity: Record<string, string>;
  allocatable: Record<string, string>;
  sampled_at: string | null;
}
export interface ClusterOpsListClustersResponse {
  items: ClusterOpsCluster[];
}
export interface ClusterOpsListResourceTypesResponse {
  items: ClusterOpsResourceDescriptor[];
}
export interface ClusterOpsListResourcesResponse {
  items: ClusterOpsResourceDocument[];
  next_continue_token: string;
  list_resource_version: string;
}
export interface ClusterOpsGetResourceResponse {
  resource: ClusterOpsResourceDocument;
  manifest_yaml: string;
}
export interface ClusterOpsMutationResponse {
  resource: ClusterOpsResourceDocument;
  dry_run: boolean;
}
export interface ClusterOpsDeleteResourceResponse {
  deletion_requested: boolean;
  already_absent: boolean;
}
export interface ClusterOpsScaleWorkloadResponse {
  ref: ClusterOpsResourceRef;
  uid: string;
  resource_version: string;
  desired_replicas: number;
  observed_replicas: number;
  dry_run: boolean;
}
export interface ClusterOpsListResourcesParams extends ClusterOpsResourceTypeRef {
  namespace?: string;
  all_namespaces?: boolean;
  page_size?: number;
  continue_token?: string;
  name?: string;
  label_selector?: string;
  field_selector?: string;
}
export interface ClusterOpsCreateInput {
  type: ClusterOpsResourceTypeRef;
  namespace: string;
  name: string;
  manifest_yaml: string;
  dry_run?: boolean;
}
export interface ClusterOpsUpdateInput {
  manifest_yaml: string;
  expected_uid: string;
  expected_resource_version: string;
  dry_run?: boolean;
}
export interface ClusterOpsDeleteInput {
  expected_uid: string;
}
export interface ClusterOpsScaleInput {
  expected_uid: string;
  expected_resource_version: string;
  replicas: number;
  dry_run?: boolean;
}
export interface ClusterOpsRestartInput {
  expected_uid: string;
  expected_resource_version: string;
  dry_run?: boolean;
}
export interface ClusterOpsPodLogTarget {
  cluster_id: string;
  namespace: string;
  pod_name: string;
}
export interface ClusterOpsPodLogOptions {
  container?: string;
  expected_pod_uid?: string;
  follow?: boolean;
  previous?: boolean;
  timestamps?: boolean;
  tail_lines?: string;
  since_seconds?: string;
  since_time?: string;
  limit_bytes?: string;
}
