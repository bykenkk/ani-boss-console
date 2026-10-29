import { useState } from "react";
import { Select } from "@arco-design/web-react";
import { useQuery } from "@tanstack/react-query";
import type { GpuCluster } from "@/api/accelerator";
import { gpuMonitoringKeys, listPhysicalGpuDevices } from "@/api/gpu-monitoring";
import { useListPagination } from "@/hooks/useListPagination";
import { withId } from "@/lib/id";
import { GpuDeviceTable } from "../../GpuDeviceTable";
import type { GpuAllocation } from "../../gpu-capacity";

interface GpuDeviceListProps {
  clusters: GpuCluster[];
  allocations: Map<string, GpuAllocation>;
}

export function GpuDeviceList({ clusters, allocations }: GpuDeviceListProps) {
  const [cluster, setCluster] = useState<string>();
  const clusterId =
    clusters.find((c) => c.cluster_id === cluster)?.cluster_id ?? clusters[0]?.cluster_id ?? "";
  const pagination = useListPagination(clusterId);
  const params = { clusterId, page: pagination.page, pageSize: pagination.pageSize };
  const query = useQuery({
    queryKey: gpuMonitoringKeys.devices(params),
    queryFn: ({ signal }) => listPhysicalGpuDevices(params, signal),
    enabled: Boolean(clusterId),
    meta: { errorNotification: { id: withId("gpu-devices", clusterId), action: "GPU 设备加载" } },
  });
  return (
    <GpuDeviceTable
      data={query.data?.items ?? []}
      allocations={allocations}
      loading={Boolean(clusterId) && query.isLoading}
      pagination={{
        page: pagination.page,
        pageSize: pagination.pageSize,
        total: Number(query.data?.total ?? 0),
        onPageChange: pagination.setPage,
        onPageSizeChange: pagination.setPageSize,
      }}
      header={{
        title: "设备列表",
        description: "按集群查看设备，已分配量表示资源承诺。",
        extra: (
          <Select
            aria-label="设备列表集群"
            placeholder="选择集群"
            value={clusterId || undefined}
            filterOption={false}
            options={clusters.map((c) => ({ label: c.display_name, value: c.cluster_id }))}
            onChange={setCluster}
          />
        ),
      }}
    />
  );
}
