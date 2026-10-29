import { Alert, Button, Card } from "@arco-design/web-react";
import { IconRefresh } from "@arco-design/web-react/icon";
import { useQueries, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  acceleratorKeys,
  getGpuCapacity,
  listGpuClusterOptions,
  listGpuPools,
  listGpuProfiles,
  listGpuSupplyGroups,
} from "@/api/accelerator";
import { gpuMonitoringKeys, listPhysicalGpuDevices } from "@/api/gpu-monitoring";
import { listManagement, managementKeys } from "@/api/management";
import { ResourcePageFrame } from "@/components/common";
import { withId } from "@/lib/id";
import { buildGpuOverview, selectCapacityProfiles } from "../gpu-capacity";
import { PlatformCapacitySummary } from "../PlatformCapacitySummary";
import { ResourceUsageSummary } from "../ResourceUsageSummary";
import { GpuDeviceList } from "./GpuDeviceList";

export function PlatformOverviewPage() {
  const client = useQueryClient();
  const clusters = useQuery({
    queryKey: [...acceleratorKeys.all, "clusters", "options"],
    queryFn: ({ signal }) => listGpuClusterOptions(signal),
    meta: { errorNotification: { id: "gpu-cluster-options", action: "GPU 集群选项加载" } },
  });
  const items = clusters.data?.items ?? [];
  // Bounded snapshots, not automatic pagination: a continuation or missing scope
  // makes the global figures unknown. The device table pages independently.
  const inventories = useQueries({
    queries: items.map((c) => {
      const params = { clusterId: c.cluster_id, page: 1, pageSize: 100 };
      return {
        queryKey: gpuMonitoringKeys.devices(params),
        queryFn: ({ signal }: { signal: AbortSignal }) => listPhysicalGpuDevices(params, signal),
        meta: {
          errorNotification: { id: withId("gpu-devices", c.cluster_id), action: "GPU 设备加载" },
        },
      };
    }),
  });
  // TODO(pagination-migration): keep the deployed ACC cursor contract; never
  // synthesize a total or traverse its remaining pages for overview statistics.
  const pools = useQueries({
    queries: items.map((c) => ({
      queryKey: [...acceleratorKeys.all, "overview-pools", c.cluster_id],
      queryFn: ({ signal }: { signal: AbortSignal }) =>
        listGpuPools({ cluster_id: c.cluster_id, page_size: 100 }, signal),
      meta: {
        errorNotification: { id: withId("gpu-pools", c.cluster_id), action: "GPU 资源池加载" },
      },
    })),
  });
  const profiles = useQueries({
    queries: items.map((c) => ({
      queryKey: [...acceleratorKeys.all, "overview-profiles", c.cluster_id],
      queryFn: ({ signal }: { signal: AbortSignal }) =>
        listGpuProfiles({ cluster_id: c.cluster_id, page_size: 100 }, signal),
      meta: {
        errorNotification: { id: withId("gpu-profiles", c.cluster_id), action: "GPU 规格加载" },
      },
    })),
  });
  const poolItems = pools.flatMap((p) => p.data?.items ?? []);
  const groups = useQueries({
    queries: poolItems.map((p) => ({
      queryKey: [...acceleratorKeys.all, "overview-groups", p.pool_id],
      queryFn: ({ signal }: { signal: AbortSignal }) =>
        listGpuSupplyGroups(
          { cluster_id: p.cluster_id, pool_id: p.pool_id, page_size: 100 },
          signal,
        ),
      meta: {
        errorNotification: { id: withId("gpu-supply-groups", p.pool_id), action: "GPU 供给组加载" },
      },
    })),
  });
  const selectedProfiles = profiles.flatMap((p) => selectCapacityProfiles(p.data?.items ?? []));
  const capacities = useQueries({
    queries: selectedProfiles.map((p) => ({
      queryKey: [
        ...acceleratorKeys.all,
        "capacity",
        { profile_id: p.profile_id, profile_version: p.profile_version },
      ],
      queryFn: ({ signal }: { signal: AbortSignal }) => getGpuCapacity(p, signal),
      meta: {
        errorNotification: {
          id: withId("gpu-capacity", p.profile_id, p.profile_version),
          action: "GPU 规格容量加载",
        },
      },
    })),
  });
  const snapshots = items.map((cluster, i) => ({
    cluster,
    inventory: inventories[i]?.data,
    pools: pools[i]?.data,
    profiles: profiles[i]?.data,
    groups: poolItems.flatMap((p, j) =>
      p.cluster_id === cluster.cluster_id ? [groups[j]?.data] : [],
    ),
    capacities: selectedProfiles.flatMap((p, j) =>
      profiles[i]?.data?.items?.some((candidate) => candidate.profile_id === p.profile_id)
        ? [capacities[j]?.data]
        : [],
    ),
  }));
  const queries = [clusters, ...inventories, ...pools, ...profiles, ...groups, ...capacities];
  const overview = buildGpuOverview(clusters.data, snapshots);
  const loading = queries.some((q) => q.isPending);
  const refreshing = queries.some((q) => q.isFetching);
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
        <GpuDeviceList clusters={items} allocations={overview.allocations} />
      </Card>
    </ResourcePageFrame>
  );
}
