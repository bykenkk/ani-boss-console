import { Button, Input, Space } from "@arco-design/web-react";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { listVirtualSwitches, virtualSwitchKeys, type VirtualSwitch } from "@/api/virtual-switches";
import { ListDataTable, ListPageFrame, type ListColumn } from "@/components/common";
import { useListPagination } from "@/hooks/useListPagination";
import { useVirtualSwitchActions } from "@/hooks/useVirtualSwitchActions";
import { formatDateTime } from "@/lib/date";
import { VirtualSwitchCreateModal } from "../VirtualSwitchCreateModal";

const columns: ListColumn<VirtualSwitch>[] = [
  {
    key: "name",
    title: "名称",
    dataIndex: "name",
    width: 200,
    fixed: "left",
    ellipsis: true,
  },
  {
    key: "createdAt",
    title: "创建时间",
    dataIndex: "created_at",
    width: 180,
    render: (value: VirtualSwitch["created_at"]) => formatDateTime(value),
  },
];

export function VirtualSwitchesPage() {
  const [keyword, setKeyword] = useState("");
  const [creating, setCreating] = useState(false);
  const pagination = useListPagination(keyword);
  const { actions } = useVirtualSwitchActions(pagination.resetPagination);
  const params = {
    name: keyword || undefined,
    page: pagination.page,
    pageSize: pagination.pageSize,
  };
  const query = useQuery({
    queryKey: virtualSwitchKeys.list(params),
    queryFn: ({ signal }) => listVirtualSwitches(params, signal),
    meta: { errorNotification: { id: "virtual-switch-list", action: "虚拟交换机列表加载" } },
  });

  return (
    <>
      <ListPageFrame
        header={{
          title: "虚拟交换机",
          subtitle: "管理虚拟交换机及其关联的二层网络。",
        }}
        toolbar={{
          actions: (
            <Button type="primary" onClick={() => setCreating(true)}>
              创建虚拟交换机
            </Button>
          ),
          filters: (
            <Space>
              <Input.Search
                aria-label="搜索虚拟交换机名称"
                placeholder="搜索虚拟交换机名称"
                allowClear
                onSearch={(value) => {
                  setKeyword(value.trim());
                  pagination.resetPagination();
                }}
                onClear={() => {
                  setKeyword("");
                  pagination.resetPagination();
                }}
              />
            </Space>
          ),
          refresh: {
            spinning: query.isFetching,
            onClick: () => {
              query.refetch();
            },
          },
        }}
      >
        <ListDataTable
          tableLabel="虚拟交换机"
          columns={columns}
          data={query.data?.items ?? []}
          loading={query.isFetching}
          rowActions={actions}
          pagination={{
            page: pagination.page,
            pageSize: pagination.pageSize,
            total: Number(query.data?.total ?? "0"),
            pageSizeOptions: [20, 50, 100],
            disabled: query.isFetching,
            onPageChange: pagination.setPage,
            onPageSizeChange: pagination.setPageSize,
          }}
        />
      </ListPageFrame>
      {creating && (
        <VirtualSwitchCreateModal
          onCancel={() => setCreating(false)}
          onSuccess={() => {
            setCreating(false);
            pagination.resetPagination();
          }}
        />
      )}
    </>
  );
}
