import { Alert, Button, Card } from "@arco-design/web-react";
import { IconRefresh } from "@arco-design/web-react/icon";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { acceleratorKeys } from "@/api/accelerator";
import { gpuMonitoringKeys } from "@/api/gpu-monitoring";
import { listManagement, managementKeys } from "@/api/management";
import { ResourcePageFrame } from "@/components/common";
import { usePlatformGpuOverview } from "@/hooks/usePlatformGpuOverview";
import { PlatformCapacitySummary } from "../PlatformCapacitySummary";
import { ResourceUsageSummary } from "../ResourceUsageSummary";
import { GpuDeviceList } from "./GpuDeviceList";

export function PlatformOverviewPage() {
  const client = useQueryClient();
  const { clusters, overview, loading, refreshing } = usePlatformGpuOverview();
  const tenantParams = { page: 1, pageSize: 1, filters: { status: "ON" } };
  const tenants = useQuery({
    queryKey: managementKeys.list("tenants", tenantParams),
    queryFn: ({ signal }) => listManagement("tenants", tenantParams, signal),
    meta: { errorNotification: { id: "enabled-tenant-count", action: "启用租户数加载" } },
  });
  return (
    <ResourcePageFrame
      className="h-auto! min-h-(--app-content-available-height)"
      header={{
        title: "平台概览",
        subtitle: "平台 GPU 设备、资源承诺和启用租户的一屏总览。",
        extra: (
          <Button
            icon={<IconRefresh />}
            loading={refreshing || tenants.isFetching}
            onClick={() =>
              Promise.all([
                client.invalidateQueries({ queryKey: acceleratorKeys.all }),
                client.invalidateQueries({ queryKey: gpuMonitoringKeys.all }),
                client.invalidateQueries({
                  queryKey: managementKeys.list("tenants", tenantParams),
                }),
              ])
            }
          >
            刷新
          </Button>
        ),
      }}
    >
      <section className="grid grid-cols-[minmax(0,2fr)_minmax(340px,1fr)] gap-4 max-[1100px]:grid-cols-1">
        <ResourceUsageSummary overview={overview} tenantCount={tenants.data?.total} />
        <PlatformCapacitySummary models={overview.models} loading={loading} />
      </section>
      {!loading && overview.incomplete ? (
        <Alert
          type="info"
          content="部分 GPU 容量或观测不完整，相应统计显示未知。未配置规格或清单未完整覆盖时，不计为零。"
        />
      ) : null}
      <Card>
        <GpuDeviceList clusters={clusters} allocations={overview.allocations} />
      </Card>
    </ResourcePageFrame>
  );
}
