import { useCallback, useState } from "react";
import type { ListPagination } from "@/components/common";
/**
 * TODO(pagination-migration): 后端统一 page/pageSize 后切换 useListPagination，删除本 Hook 及 legacy-cursor 模式。
 * 仅记录已访问游标，不构造 offset/token，不预取或汇总其他分页；调用方原样适配字段名称。
 */
export function useCursorPagination(scope: string, initialPageSize = 20) {
  const [state, setState] = useState({
    scope,
    page: 1,
    pageSize: initialPageSize,
    cursors: [undefined] as (string | undefined)[],
  });
  const current =
    state.scope === scope ? state : { ...state, scope, page: 1, cursors: [undefined] };
  if (state.scope !== scope) setState(current);
  const resetPagination = useCallback(
    () => setState((value) => ({ ...value, page: 1, cursors: [undefined] })),
    [],
  );
  const getPagination = (nextCursor?: string, disabled = false): ListPagination => ({
    mode: "legacy-cursor",
    page: current.page,
    pageSize: current.pageSize,
    hasNextPage: Boolean(nextCursor),
    disabled,
    onPageChange: (page) => {
      if (disabled) return;
      if (page === current.page - 1 && page >= 1) setState({ ...current, page });
      else if (page === current.page + 1 && nextCursor)
        setState({
          ...current,
          page,
          cursors: [...current.cursors.slice(0, current.page), nextCursor],
        });
    },
    onPageSizeChange: (pageSize) => {
      if (!disabled) setState({ ...current, pageSize, page: 1, cursors: [undefined] });
    },
  });
  return {
    cursor: current.cursors[current.page - 1],
    limit: current.pageSize,
    getPagination,
    resetPagination,
  };
}
