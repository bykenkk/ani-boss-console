export interface GpuOperationScope {
  principal: string;
  connection_ref: string;
  cluster_id: string;
}
export function gpuScopeKey(scope: GpuOperationScope) {
  return `ani-gpu-v2:${[scope.principal, scope.connection_ref, scope.cluster_id].map(encodeURIComponent).join(":")}`;
}
export function requireGpuScope(scope: GpuOperationScope, connectionRef?: string) {
  if (
    !scope.principal ||
    !scope.connection_ref ||
    !scope.cluster_id ||
    (connectionRef !== undefined && connectionRef !== scope.connection_ref)
  )
    throw new Error("当前平台主体或 GPU 目标尚未确认，请刷新目标后重试");
  return gpuScopeKey(scope);
}
export function requireGpuOperationTarget<T extends { cluster_id?: string }>(
  operation: T,
  scope: GpuOperationScope,
): T {
  requireGpuScope(scope);
  if (operation.cluster_id !== scope.cluster_id)
    throw new Error("此任务不属于当前目标，只可在原目标查询，不能导入或重试");
  return operation;
}
export function requireGpuSupplyTarget<T extends { connection_ref: string; cluster_id?: string }>(
  value: T,
  scope: GpuOperationScope,
): T {
  requireGpuScope(scope);
  if (
    value.connection_ref !== scope.connection_ref ||
    (value.cluster_id !== undefined && value.cluster_id !== scope.cluster_id)
  )
    throw new Error("此供给不属于当前受管目标，不能导入当前向导");
  return value;
}
