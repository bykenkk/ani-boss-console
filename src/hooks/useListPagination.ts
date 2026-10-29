import { useCallback, useState } from "react";
/** 页码分页公共状态：筛选 scope 改变或修改 pageSize 时回到第一页，查询仍由调用方维护。 */
export function useListPagination(scope: string, initialPageSize = 20) {
  const [state, setState] = useState({ scope, page: 1, pageSize: initialPageSize });
  const current = state.scope === scope ? state : { ...state, scope, page: 1 };
  if (state.scope !== scope) setState(current);
  const resetPagination = useCallback(() => setState((value) => ({ ...value, page: 1 })), []);
  const setPage = useCallback(
    (page: number) => setState((value) => ({ ...value, page: Math.max(1, page) })),
    [],
  );
  const setPageSize = useCallback(
    (pageSize: number) => setState((value) => ({ ...value, page: 1, pageSize })),
    [],
  );
  return { page: current.page, pageSize: current.pageSize, setPage, setPageSize, resetPagination };
}
