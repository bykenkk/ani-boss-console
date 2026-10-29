import { withId } from "@/lib/id";
import { useState } from "react";
import { Button, Input, Modal, Select, Space } from "@arco-design/web-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  computePresetKeys,
  deleteComputePreset,
  listComputePresets,
  setComputePresetEnabled,
  type ComputePreset,
  type ComputePresetListParams,
} from "@/api/compute-presets";
import {
  ListDataTable,
  ListPageFrame,
  StatusBadge,
  type ListColumn,
  type RowAction,
} from "@/components/common";
import { useListPagination } from "@/hooks/useListPagination";
import { formatDateTime } from "@/lib/date";
import { ComputePresetEditModal } from "../ComputePresetEditModal";
const columns: ListColumn<ComputePreset>[] = [
  { title: "规格名称", dataIndex: "name", width: 200, ellipsis: true },
  { title: "规格编码", dataIndex: "code", width: 200, ellipsis: true },
  { title: "规格 ID", dataIndex: "id", width: 220, ellipsis: true },
  {
    title: "规格类型",
    width: 110,
    ellipsis: true,
    render: (_, row) => (row.compute_type === "gpu" ? "GPU" : "CPU"),
  },
  { title: "CPU（毫核）", dataIndex: "cpu_millis", width: 140, ellipsis: true },
  { title: "内存（MiB）", dataIndex: "memory_mib", width: 140, ellipsis: true },
  {
    title: "GPU 规格 ID",
    width: 220,
    ellipsis: true,
    dataIndex: "gpu.profile_id",
  },
  {
    title: "GPU 规格版本",
    width: 150,
    ellipsis: true,
    dataIndex: "gpu.profile_version",
  },
  { title: "GPU 型号", width: 180, ellipsis: true, dataIndex: "gpu.model_key" },
  {
    title: "GPU 模式",
    width: 120,
    ellipsis: true,
    render: (_, row) => (row.gpu ? (row.gpu.mode === "SHARED_FIXED" ? "共享" : "整卡") : "-"),
  },
  {
    title: "每实例 GPU 数量",
    width: 180,
    ellipsis: true,
    dataIndex: "gpu.devices_per_instance",
  },
  {
    title: "每卡显存（MiB）",
    width: 170,
    ellipsis: true,
    dataIndex: "gpu.memory_mib_per_device",
  },
  {
    title: "核心比例（%）",
    width: 150,
    ellipsis: true,
    dataIndex: "gpu.core_limit_percent",
  },
  {
    title: "状态",
    width: 120,
    render: (_, row) => (
      <StatusBadge
        value={row.enabled ? "启用" : "停用"}
        tone={row.enabled ? "success" : "default"}
      />
    ),
  },
  {
    title: "描述",
    dataIndex: "description",
    width: 220,
    ellipsis: true,
  },
  {
    title: "更新时间",
    width: 180,
    ellipsis: true,
    render: (_, row) => formatDateTime(row.updated_at),
  },
];
export function ComputePresetsPage() {
  const client = useQueryClient();
  const [filters, setFilters] = useState<Omit<ComputePresetListParams, "page" | "pageSize">>({});
  const [editing, setEditing] = useState<ComputePreset | "create">();
  const pagination = useListPagination(JSON.stringify(filters));
  const params = { ...filters, page: pagination.page, pageSize: pagination.pageSize };
  const query = useQuery({
    queryKey: [...computePresetKeys.all, params],
    queryFn: ({ signal }) => listComputePresets(params, signal),
    meta: { errorNotification: { id: "compute-presets", action: "计算规格加载" } },
  });
  const refresh = () => client.invalidateQueries({ queryKey: computePresetKeys.all });
  const stateMutation = useMutation({
    mutationFn: setComputePresetEnabled,
    meta: {
      feedback: (variables) => {
        const input = variables as Parameters<typeof setComputePresetEnabled>[0];
        const action = input.enabled ? "启用计算规格" : "停用计算规格";
        return {
          channel: "notification",
          id: withId("compute-preset-state", input.id),
          action,
          successText: action + "成功",
        };
      },
    },
    onSuccess: refresh,
  });
  const deletion = useMutation({
    mutationFn: deleteComputePreset,
    meta: {
      feedback: {
        channel: "notification",
        id: "compute-preset-delete",
        action: "计算规格删除",
        successText: "计算规格已删除",
      },
    },
    onSuccess: async () => {
      if (query.data?.items.length === 1 && pagination.page > 1)
        pagination.setPage(pagination.page - 1);
      await refresh();
    },
  });
  const busy = deletion.isPending || stateMutation.isPending;
  const rowActions: RowAction<ComputePreset>[] = [
    {
      key: "edit",
      label: "编辑",
      disabled: () => busy,
      onClick: setEditing,
    },
    {
      key: "enabled",
      label: (row) => (row.enabled ? "停用" : "启用"),
      widthLabel: "停用",
      disabled: () => busy,
      onClick: (row) => {
        Modal.confirm({
          title: row.enabled ? "停用计算规格" : "启用计算规格",
          content: (row.enabled ? "确认停用“" : "确认启用“") + row.name + "”？",
          onOk: () => stateMutation.mutateAsync({ id: row.id, enabled: !row.enabled }),
        });
      },
    },
    {
      key: "delete",
      label: "删除",
      intent: "danger",
      disabled: () => busy,
      onClick: (row) => {
        Modal.confirm({
          title: "删除计算规格",
          content: "确认删除“" + row.name + "”？",
          onOk: () => deletion.mutateAsync(row.id),
        });
      },
    },
  ];
  return (
    <>
      <ListPageFrame
        header={{ title: "计算规格" }}
        toolbar={{
          actions: (
            <Button type="primary" onClick={() => setEditing("create")}>
              创建计算规格
            </Button>
          ),
          filters: (
            <Space>
              <Input.Search
                aria-label="规格名称"
                placeholder="搜索规格名称"
                allowClear
                onSearch={(name) =>
                  setFilters((value) => ({ ...value, name: name.trim() || undefined }))
                }
                onClear={() => setFilters((value) => ({ ...value, name: undefined }))}
              />
              <Input.Search
                aria-label="规格编码"
                placeholder="搜索规格编码"
                allowClear
                onSearch={(code) =>
                  setFilters((value) => ({ ...value, code: code.trim() || undefined }))
                }
                onClear={() => setFilters((value) => ({ ...value, code: undefined }))}
              />
              <Select
                aria-label="规格类型"
                placeholder="全部类型"
                allowClear
                value={filters.compute_type}
                options={[
                  { label: "CPU", value: "cpu" },
                  { label: "GPU", value: "gpu" },
                ]}
                onChange={(compute_type: "cpu" | "gpu" | undefined) =>
                  setFilters((value) => ({
                    ...value,
                    compute_type,
                    gpu_mode: compute_type === "cpu" ? undefined : value.gpu_mode,
                  }))
                }
              />
              <Select
                aria-label="GPU 模式"
                placeholder="全部 GPU 模式"
                allowClear
                value={filters.gpu_mode}
                disabled={filters.compute_type === "cpu"}
                options={[
                  { label: "整卡", value: "WHOLE_EXCLUSIVE" },
                  { label: "共享", value: "SHARED_FIXED" },
                ]}
                onChange={(gpu_mode: ComputePresetListParams["gpu_mode"]) =>
                  setFilters((value) => ({ ...value, gpu_mode }))
                }
              />
              <Select
                aria-label="状态"
                placeholder="全部状态"
                allowClear
                value={filters.enabled === undefined ? undefined : String(filters.enabled)}
                options={[
                  { label: "启用", value: "true" },
                  { label: "停用", value: "false" },
                ]}
                onChange={(enabled: string | undefined) =>
                  setFilters((value) => ({
                    ...value,
                    enabled: enabled === undefined ? undefined : enabled === "true",
                  }))
                }
              />
            </Space>
          ),
          refresh: {
            onClick: refresh,
            spinning: query.isFetching,
          },
        }}
      >
        <ListDataTable
          rowKey="id"
          tableLabel="计算规格"
          emptyText="暂无计算规格"
          columns={columns}
          data={query.data?.items ?? []}
          loading={query.isFetching}
          rowActions={rowActions}
          pagination={{
            page: pagination.page,
            pageSize: pagination.pageSize,
            total: Number(query.data?.total ?? "0"),
            onPageChange: pagination.setPage,
            onPageSizeChange: pagination.setPageSize,
          }}
        />
      </ListPageFrame>
      {editing ? (
        <ComputePresetEditModal
          record={editing === "create" ? undefined : editing}
          onCancel={() => setEditing(undefined)}
        />
      ) : null}
    </>
  );
}
