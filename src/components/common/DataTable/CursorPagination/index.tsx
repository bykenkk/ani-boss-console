import { Button, Select, Space } from "@arco-design/web-react";
import type { ListPagination } from "..";
export function CursorPagination({
  pagination,
}: {
  pagination: Extract<ListPagination, { mode: "legacy-cursor" }>;
}) {
  return (
    <Space className="justify-end p-4 w-full">
      <Select
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
    </Space>
  );
}
