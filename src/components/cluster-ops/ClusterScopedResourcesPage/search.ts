export interface ClusterScopedResourceSearch {
  cluster_id?: string;
  page_size?: number;
}

export function validateScopedResourceSearch(
  search: Record<string, unknown>,
): ClusterScopedResourceSearch {
  const result: ClusterScopedResourceSearch = {};
  if (search.cluster_id !== undefined) {
    const value = search.cluster_id;
    if (
      typeof value !== "string" ||
      !value ||
      value.includes("/") ||
      [".", ".."].includes(value) ||
      [...value].some(
        (character) => character.charCodeAt(0) < 32 || character.charCodeAt(0) === 127,
      )
    )
      throw new Error("集群参数无效");
    result.cluster_id = value;
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

export function validateScopedResourceDetailSearch(search: Record<string, unknown>) {
  const result = validateScopedResourceSearch(search);
  if (!result.cluster_id) throw new Error("集群定位参数不完整");
  return { ...result, cluster_id: result.cluster_id };
}
