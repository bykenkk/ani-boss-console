import { Alert, Descriptions, Empty, Modal } from "@arco-design/web-react";
import { useQuery } from "@tanstack/react-query";
import { acceleratorKeys, getGpuSupplyGroupCapacity, type GpuSupplyGroup } from "@/api/accelerator";
import { formatDateTime } from "@/lib/date";
import { withId } from "@/lib/id";
import {
  formatGpuAllocationType,
  formatGpuCapacityBasis,
  formatGpuCapacityGranularity,
} from "../capacity";
import { GpuCapacityDetails } from "../GpuCapacityDetails";

interface GpuGroupCapacityModalProps {
  group: GpuSupplyGroup;
  onCancel: () => void;
}

export function GpuGroupCapacityModal({ group, onCancel }: GpuGroupCapacityModalProps) {
  const query = useQuery({
    queryKey: [...acceleratorKeys.all, "group-capacity", group.group_id, { include_details: true }],
    queryFn: ({ signal }) => getGpuSupplyGroupCapacity(group.group_id, signal, true),
    meta: {
      errorNotification: {
        id: withId("gpu-group-capacity", group.group_id),
        action: "GPU 供给组容量加载",
      },
    },
  });
  const capacity = query.data;
  return (
    <Modal
      visible
      title={`${group.display_name} · 容量`}
      style={{ width: "min(1280px, calc(100vw - 48px))" }}
      footer={null}
      onCancel={onCancel}
    >
      <div className="flex min-w-0 flex-col gap-4">
        <Alert content="容量按资源类型分别统计。已分配量来自调度分配或已绑定工作负载请求，不代表实际利用率。" />
        <Descriptions
          data={[
            { label: "物理卡数量", value: capacity?.physical_device_count ?? "-" },
            { label: "观测时间", value: formatDateTime(capacity?.observed_at) },
          ]}
        />
        {(capacity?.resource_types ?? []).map((resource) => (
          <section
            key={JSON.stringify([resource.allocation_type, resource.resource_key])}
            className="flex min-w-0 flex-col gap-4"
          >
            <Descriptions
              data={[
                { label: "分配类型", value: formatGpuAllocationType(resource.allocation_type) },
                { label: "资源类型", value: resource.resource_key },
                { label: "计算依据", value: formatGpuCapacityBasis(resource.basis) },
                { label: "统计粒度", value: formatGpuCapacityGranularity(resource.granularity) },
                { label: "观测时间", value: formatDateTime(resource.observed_at) },
                { label: "缺失项", value: resource.missing_fields?.join("、") || "-" },
              ]}
            />
            <GpuCapacityDetails
              totals={resource.totals}
              details={resource.details}
              loading={query.isFetching}
            />
          </section>
        ))}
        {!capacity?.resource_types?.length ? <Empty /> : null}
      </div>
    </Modal>
  );
}
