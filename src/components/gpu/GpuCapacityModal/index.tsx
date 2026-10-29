import { Alert, Descriptions, Modal } from "@arco-design/web-react";
import { useQuery } from "@tanstack/react-query";
import {
  acceleratorKeys,
  getGpuCapacity,
  type GpuDeviceCapacity,
  type GpuProfile,
} from "@/api/accelerator";
import { DataTable, type ListColumn } from "@/components/common";
import { withId } from "@/lib/id";
const columns: ListColumn<GpuDeviceCapacity>[] = [
  { title: "设备 ID", width: 160, dataIndex: "device_id" },
  { title: "安全预算（MiB）", width: 160, dataIndex: "safe_memory_budget_mib" },
  { title: "实际占用（MiB）", width: 160, dataIndex: "committed_memory_mib" },
  { title: "理论份数", width: 160, dataIndex: "nominal_units" },
  { title: "跨规格已占槽数", width: 160, dataIndex: "known_committed_units" },
  { title: "本规格可用份数", width: 160, dataIndex: "known_free_units" },
];
export function GpuCapacityModal({
  profile,
  onCancel,
}: {
  profile: GpuProfile;
  onCancel: () => void;
}) {
  const version = { profile_id: profile.profile_id, profile_version: profile.profile_version };
  const query = useQuery({
    queryKey: [...acceleratorKeys.all, "capacity", version],
    queryFn: ({ signal }) => getGpuCapacity(version, signal),
    meta: {
      errorNotification: {
        id: withId("gpu-capacity", profile.profile_id, profile.profile_version),
        action: "GPU 规格容量加载",
      },
    },
  });
  const capacity = query.data;
  return (
    <Modal
      visible
      title={`${profile.display_name} · 容量`}
      style={{ width: 1100 }}
      footer={null}
      onCancel={onCancel}
    >
      <Alert className="mb-4" content="容量为估算值，不同规格容量不可累加。" />
      <Descriptions
        className="my-4"
        data={[
          { label: "物理卡记录数", value: capacity?.physical_device_count ?? "-" },
          { label: "空卡理论份数", value: capacity?.nominal_units ?? "-" },
          { label: "跨规格已占槽数", value: capacity?.known_committed_units ?? "-" },
          { label: "本规格已知可用份数", value: capacity?.known_free_units ?? "-" },
          { label: "已观察待放置请求量", value: capacity?.unplaced_requested_units ?? "-" },
        ]}
      />
      <DataTable
        rowKey="device_id"
        columns={columns}
        data={capacity?.devices ?? []}
        loading={query.isFetching}
        pagination={false}
        tableLabel="GPU 逐卡容量"
      />
    </Modal>
  );
}
