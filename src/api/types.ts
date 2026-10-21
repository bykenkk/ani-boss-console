export interface PageParams {
  page?: number;
  pageSize?: number;
}
/** TODO(pagination-migration): 仅供未迁移接口保留；对应后端页码契约完成且所有调用方迁移至 PageParams 并验证后移除。 */
export interface CursorPageParams {
  cursor?: string;
  limit?: number;
}
