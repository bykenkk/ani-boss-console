import { Alert, Descriptions, Modal } from "@arco-design/web-react";
import { useQuery } from "@tanstack/react-query";
import { acceleratorKeys, getGpuProfileCapacity, type GpuProfile } from "@/api/accelerator";
import { formatDateTime } from "@/lib/date";
import { withId } from "@/lib/id";
import {
  formatGpuAllocationType,
  formatGpuCapacityBasis,
  formatGpuCapacityGranularity,
} from "../capacity";
import { GpuCapacityDetails } from "../GpuCapacityDetails";

interface GpuCapacityModalProps {
  profile: GpuProfile;
  onCancel: () => void;
}

export function GpuCapacityModal({ profile, onCancel }: GpuCapacityModalProps) {
  const version = { profile_id: profile.profile_id, profile_version: profile.profile_version };
  const query = useQuery({
    queryKey: [...acceleratorKeys.all, "profile-capacity", version, { include_details: true }],
    queryFn: ({ signal }) => getGpuProfileCapacity(version, signal, true),
    meta: {
      errorNotification: {
        id: withId("gpu-profile-capacity", profile.profile_id, profile.profile_version),
        action: "GPU 规格容量加载",
      },
    },
  });
  const capacity = query.data;
  return (
    <Modal
      visible
      title={`${profile.display_name} · 容量`}
      style={{ width: "min(1280px, calc(100vw - 48px))" }}
      footer={null}
      onCancel={onCancel}
    >
      <div className="flex min-w-0 flex-col gap-4">
        <Alert content="容量为估算值，不同规格容量不可累加。缺少观测数据时显示 -；已分配单位不代表实际利用率。" />
        <Descriptions
          data={[
            { label: "分配类型", value: formatGpuAllocationType(capacity?.allocation_type) },
            { label: "资源类型", value: capacity?.resource_key ?? "-" },
            { label: "计算依据", value: formatGpuCapacityBasis(capacity?.basis) },
            { label: "统计粒度", value: formatGpuCapacityGranularity(capacity?.granularity) },
            { label: "理论规格份数", value: capacity?.nominal_units ?? "-" },
            { label: "估计可用规格份数", value: capacity?.estimated_available_units ?? "-" },
            { label: "观测时间", value: formatDateTime(capacity?.observed_at) },
            { label: "缺失项", value: capacity?.missing_fields?.join("、") || "-" },
          ]}
        />
        <GpuCapacityDetails
          totals={capacity?.totals}
          details={capacity?.details}
          loading={query.isFetching}
          profileUnits
        />
      </div>
    </Modal>
  );
}
