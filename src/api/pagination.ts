import type { PageParams } from "@/api/types";

// TODO(options-pagination): 普通页码选项暂只取首 100 项；服务端选项查询能力完善后移除固定分页策略。
// TODO(api-verification): 部署并允许联调后，验证搜索条件、首 100 项边界和 signal 取消行为。
export function withFirst100<TParams extends PageParams, TResult>(
  list: (params: TParams, signal?: AbortSignal) => Promise<TResult>,
) {
  return (params: Omit<TParams, keyof PageParams>, signal?: AbortSignal) =>
    list({ ...params, page: 1, pageSize: 100 } as TParams, signal);
}
