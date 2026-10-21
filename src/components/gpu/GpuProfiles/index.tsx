import { ApiError } from "@/api/request";
import { useState } from "react";
import { Modal } from "@arco-design/web-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  acceleratorKeys,
  deleteGpuProfile,
  listGpuProfiles,
  setGpuProfileState,
  type GpuProfile,
} from "@/api/accelerator";
import {
  TableSectionFrame,
  ListDataTable,
  StatusBadge,
  type ListColumn,
} from "@/components/common";
import { useCursorPagination } from "@/hooks/useCursorPagination";
import { withId } from "@/lib/id";
import type { GpuAccess } from "../GpuResourcesPage/types";
import { GpuCapacityModal } from "../GpuCapacityModal";
const columns: ListColumn<GpuProfile>[] = [
  { title: "规格名称", dataIndex: "display_name", width: 200, ellipsis: true },
  { title: "规格 ID", dataIndex: "profile_id", width: 220, ellipsis: true },
  { title: "规格版本", dataIndex: "profile_version", width: 100, ellipsis: true },
  { title: "供给组 ID", dataIndex: "spec.group_id", width: 220, ellipsis: true },
  { title: "GPU 型号", dataIndex: "spec.model_key", width: 180, ellipsis: true },
  {
    title: "模式",
    render: (_, profile) => (profile.spec.mode === "SHARED_FIXED" ? "共享" : "整卡"),
    width: 100,
    ellipsis: true,
  },
  {
    title: "隔离方式",
    render: (_, profile) =>
      profile.spec.isolation_class === "SOFTWARE_COOPERATIVE" ? "软件协作隔离" : "整卡独占",
    width: 160,
    ellipsis: true,
  },
  {
    title: "每卡显存（MiB）",
    dataIndex: "spec.memory_mib_per_device",
    width: 160,
    ellipsis: true,
  },
  {
    title: "核心比例（%）",
    dataIndex: "spec.core_limit_percent",
    width: 140,
    ellipsis: true,
  },
  {
    title: "每副本设备上限",
    dataIndex: "spec.max_devices_per_replica",
    width: 160,
    ellipsis: true,
  },
  {
    title: "状态",
    width: 120,
    ellipsis: true,
    render: (_, profile) => (
      <StatusBadge
        value={
          profile.state === "PROFILE_ACTIVE"
            ? "可用"
            : profile.state === "PROFILE_DISABLED"
              ? "停用"
              : profile.state === "PROFILE_DELETED"
                ? "已删除"
                : profile.state
        }
        tone={profile.state === "PROFILE_ACTIVE" ? "success" : "warning"}
      />
    ),
  },
  { title: "修订号", dataIndex: "revision", width: 100, ellipsis: true },
];
export function GpuProfiles({ clusterId, access }: { clusterId: string; access: GpuAccess }) {
  const cursor = useCursorPagination(clusterId);
  const client = useQueryClient();
  const [capacity, setCapacity] = useState<GpuProfile>();
  const params = { cluster_id: clusterId, page_size: cursor.limit, page_token: cursor.cursor };
  const query = useQuery({
    queryKey: [...acceleratorKeys.all, "profiles", params],
    queryFn: ({ signal }) => listGpuProfiles(params, signal),
    enabled: Boolean(clusterId) && access.can("accelerator:profile:admin-list"),
    meta: { errorNotification: { id: withId("gpu-profiles", clusterId), action: "GPU 规格加载" } },
  });
  const refresh = () => client.invalidateQueries({ queryKey: acceleratorKeys.all });
  const stateMutation = useMutation({
    mutationFn: setGpuProfileState,
    meta: {
      feedback: (variables) => {
        const input = variables as Parameters<typeof setGpuProfileState>[0];
        const action = input.desired === "PROFILE_ACTIVE" ? "启用 GPU 规格" : "停用 GPU 规格";
        return {
          channel: "notification",
          id: withId("gpu-profile-state", input.profile_id),
          action,
          successText: action + "成功",
        };
      },
    },
    onSuccess: refresh,
    onError: (error) => {
      // 仅明确的版本冲突刷新版本；超时重试须保留原 body 与幂等 key，避免重复创建。
      if (error instanceof ApiError && error.reason === "VERSION_CONFLICT") void refresh();
    },
  });
  const deleteMutation = useMutation({
    mutationFn: deleteGpuProfile,
    meta: {
      feedback: {
        channel: "notification",
        id: "gpu-profile-delete",
        action: "GPU 规格删除",
        successText: "GPU 规格已删除",
      },
    },
    onSuccess: refresh,
    onError: (error) => {
      // 仅明确的版本冲突刷新版本；超时重试须保留原 body 与幂等 key，避免重复创建。
      if (error instanceof ApiError && error.reason === "VERSION_CONFLICT") void refresh();
    },
  });
  return (
    <>
      <TableSectionFrame>
        <ListDataTable
          rowKey="profile_id"
          data={query.data?.items ?? []}
          columns={columns}
          loading={query.isFetching}
          pagination={cursor.getPagination(query.data?.next_page_token, query.isFetching)}
          tableLabel="GPU 规格"
          emptyText="暂无 GPU 规格"
          rowActions={[
            {
              key: "capacity",
              label: "查看容量",
              visible: () => access.can("accelerator:capacity:admin-get"),
              onClick: setCapacity,
            },
            {
              key: "state",
              label: (profile) => (profile.state === "PROFILE_ACTIVE" ? "停用" : "启用"),
              widthLabel: "停用",
              visible: () => access.can("accelerator:profile:set-state"),
              disabled: (profile) =>
                profile.state === "PROFILE_DELETED" ||
                stateMutation.isPending ||
                deleteMutation.isPending,
              onClick: (profile) => {
                const desired =
                  profile.state === "PROFILE_ACTIVE" ? "PROFILE_DISABLED" : "PROFILE_ACTIVE";
                Modal.confirm({
                  title: desired === "PROFILE_DISABLED" ? "停用 GPU 规格" : "启用 GPU 规格",
                  content: `确认${desired === "PROFILE_DISABLED" ? "停用" : "启用"} ${profile.display_name}？现有实例不受影响。`,
                  onOk: () =>
                    stateMutation.mutateAsync({
                      profile_id: profile.profile_id,
                      expected_revision: profile.revision,
                      desired,
                    }),
                });
              },
            },
            {
              key: "delete",
              label: "删除",
              intent: "danger",
              visible: () => access.can("accelerator:profile:delete"),
              disabled: (profile) =>
                profile.state === "PROFILE_DELETED" ||
                stateMutation.isPending ||
                deleteMutation.isPending,
              onClick: (profile) => {
                Modal.confirm({
                  title: "删除 GPU 规格",
                  content: `确认删除 ${profile.display_name}？现有实例不受影响。`,
                  onOk: () =>
                    deleteMutation.mutateAsync({
                      profile_id: profile.profile_id,
                      expected_revision: profile.revision,
                    }),
                });
              },
            },
          ]}
        />
      </TableSectionFrame>
      {capacity ? (
        <GpuCapacityModal profile={capacity} onCancel={() => setCapacity(undefined)} />
      ) : null}
    </>
  );
}
