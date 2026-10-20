export interface PageParams {
  page?: number;
  pageSize?: number;
}
/** TODO(pagination-migration): 仅供未迁移接口保留，后端支持 page/pageSize 后移除。 */
export interface CursorPageParams {
  cursor?: string;
  limit?: number;
}
