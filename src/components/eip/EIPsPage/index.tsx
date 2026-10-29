import { Button } from "@arco-design/web-react";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { eipKeys, listEIPs, type EIP, type EIPListParams } from "@/api/eips";
import {
  ListDataTable,
  ListPageFrame,
  ResourceNameId,
  StatusBadge,
  type ListColumn,
} from "@/components/common";
import { PlatformNetworkStatus } from "@/components/network/PlatformNetworkStatus";
import { useListPagination } from "@/hooks/useListPagination";
import { useEIPActions } from "@/hooks/useEIPActions";
import { formatDateTime } from "@/lib/date";
import { EIPFilters } from "../EIPFilters";
import { EIPDetailModal } from "../EIPDetailModal";
import { eipBindingLabel } from "../model";

export function EIPsPage() {
  const [filters, setFilters] = useState<EIPListParams>({});
  const [filterVersion, setFilterVersion] = useState(0);
  const [detailId, setDetailId] = useState<string>();
  const pagination = useListPagination(JSON.stringify(filters));
  const params = { ...filters, page: pagination.page, pageSize: pagination.pageSize };
  const query = useQuery({
    queryKey: eipKeys.list(params),
    queryFn: ({ signal }) => listEIPs(params, signal),
    meta: { errorNotification: { id: "eip-list", action: "EIP 列表加载" } },
  });
  const { actions } = useEIPActions(pagination.resetPagination);
  const columns: ListColumn<EIP>[] = [
    {
      key: "name",
      title: "名称 / ID",
      width: 200,
      fixed: "left",
      ellipsis: true,
      render: (_, item) => (
        <Button
          type="text"
          className="h-auto! p-0! text-left!"
          onClick={() => setDetailId(item.id)}
        >
          <ResourceNameId name={item.name} id={item.id} />
        </Button>
      ),
    },
    { key: "address", title: "IP 地址", dataIndex: "address", width: 160 },
    {
      key: "tenant",
      title: "所属租户",
      width: 200,
      ellipsis: true,
      render: (_, item) =>
        item.managed_by === "system" && !item.resource_tenant_id
          ? "平台系统"
          : item.tenant_name || item.resource_tenant_id,
    },
    {
      key: "state",
      title: "状态",
      width: 120,
      render: (_, item) => <PlatformNetworkStatus state={item.state} />,
    },
    {
      key: "scope",
      title: "地址类型",
      width: 120,
      render: (_, item) =>
        item.scope === "public" ? "公网" : item.scope === "intranet" ? "基础内网" : item.scope,
    },
    { key: "pool", title: "地址池", dataIndex: "pool_name", width: 200, ellipsis: true },
    {
      key: "binding",
      title: "绑定资源",
      width: 220,
      ellipsis: true,
      render: (_, item) =>
        item.binding_target
          ? `${eipBindingLabel(item)} · ${item.binding_target.id}`
          : eipBindingLabel(item),
    },
    {
      key: "observation",
      title: "观测状态",
      width: 120,
      render: (_, item) => (
        <StatusBadge
          value={item.observation_stale ? "已过期" : "有效"}
          tone={item.observation_stale ? "warning" : "success"}
        />
      ),
    },
    {
      key: "created",
      title: "创建时间",
      dataIndex: "created_at",
      width: 180,
      render: (value: EIP["created_at"]) => formatDateTime(value),
    },
  ];
  return (
    <>
      <ListPageFrame
        header={{ title: "EIP 管理", subtitle: "统一查看全平台 EIP 的归属、分配和绑定状态。" }}
        toolbar={{
          filters: (
            <EIPFilters
              key={filterVersion}
              value={filters}
              onChange={(value) => {
                setFilters(value);
                if (Object.keys(value).length === 0) setFilterVersion((v) => v + 1);
              }}
            />
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
          tableLabel="EIP"
          columns={columns}
          data={query.data?.items ?? []}
          loading={query.isLoading}
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
      {detailId && <EIPDetailModal id={detailId} onCancel={() => setDetailId(undefined)} />}
    </>
  );
}
