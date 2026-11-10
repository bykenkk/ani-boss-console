export interface ClusterWorkloadsSearch {
  cluster_id?: string;
  namespace?: string;
  page_size?: number;
}

export function validateWorkloadsSearch(search: Record<string, unknown>): ClusterWorkloadsSearch {
  const result: ClusterWorkloadsSearch = {};
  for (const key of ["cluster_id", "namespace"] as const) {
    const value = search[key];
    if (value === undefined) continue;
    if (
      typeof value !== "string" ||
      (key === "cluster_id" && !value) ||
      value.includes("/") ||
      [".", ".."].includes(value) ||
      [...value].some(
        (character) => character.charCodeAt(0) < 32 || character.charCodeAt(0) === 127,
      )
    )
      throw new Error("集群或 Namespace 参数无效");
    result[key] = value;
  }
  if (search.page_size !== undefined) {
    if (
      typeof search.page_size !== "number" ||
      !Number.isInteger(search.page_size) ||
      search.page_size < 1 ||
      search.page_size > 200
    )
      throw new Error("分页参数无效");
    result.page_size = search.page_size;
  }
  return result;
}

export function validateWorkloadDetailSearch(search: Record<string, unknown>) {
  const result = validateWorkloadsSearch(search);
  if (!result.cluster_id || !result.namespace) throw new Error("资源定位参数不完整");
  return { ...result, cluster_id: result.cluster_id, namespace: result.namespace };
}
