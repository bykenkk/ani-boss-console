import { Button, Select } from "@arco-design/web-react";
import type { ListPagination } from "../DataTable";

interface CursorPaginationProps {
  pagination: Extract<ListPagination, { mode: "legacy-cursor" }>;
}

export default function CursorPagination({ pagination }: CursorPaginationProps) {
  return (
    <div className="flex w-full flex-wrap items-center justify-end gap-2 pt-4">
      <Select
        className="w-auto! shrink-0"
        aria-label="每页条数"
        value={pagination.pageSize}
        disabled={pagination.disabled}
        onChange={pagination.onPageSizeChange}
        options={(pagination.pageSizeOptions ?? [10, 20, 50]).map((value) => ({
          value,
          label: `${value} 条 / 页`,
        }))}
      />
      <Button
        disabled={pagination.disabled || pagination.page === 1}
        onClick={() => pagination.onPageChange(pagination.page - 1)}
      >
        上一页
      </Button>
      <span>第 {pagination.page} 页</span>
      <Button
        disabled={pagination.disabled || !pagination.hasNextPage}
        onClick={() => pagination.onPageChange(pagination.page + 1)}
      >
        下一页
      </Button>
    </div>
  );
}
