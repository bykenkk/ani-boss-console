import { useState } from "react";
import { Alert, Button, Empty, Select, Skeleton, Space } from "@arco-design/web-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { acceleratorKeys, listGpuClusterOptions, type GpuCluster } from "@/api/accelerator";
import { fetchPermissionCodes } from "@/api/auth/permissions";
import { ResourcePageFrame } from "@/components/common";
import { GpuClusterResources } from "../GpuClusterResources";
export function GpuResourcesPage() {
  const client = useQueryClient();
  const [cluster, setCluster] = useState<GpuCluster>();
  const permissions = useQuery({
    queryKey: ["auth", "permission-codes"],
    queryFn: ({ signal }) => fetchPermissionCodes(signal),
    meta: { errorNotification: { id: "permission-codes", action: "当前权限加载" } },
  });
  const access = {
    can: (code: string) => permissions.data?.codes?.includes(code) === true,
    pending: permissions.isPending,
  };
  const clusters = useQuery({
    queryKey: [...acceleratorKeys.all, "clusters", "options"],
    queryFn: ({ signal }) => listGpuClusterOptions(signal),
    enabled: access.can("accelerator:cluster:list"),
    meta: { errorNotification: { id: "gpu-cluster-options", action: "GPU 集群选项加载" } },
  });
  const currentCluster = cluster ?? clusters.data?.items?.[0];
  const loadingClusters =
    !currentCluster &&
    (permissions.isPending || (access.can("accelerator:cluster:list") && clusters.isPending));
  return (
    <ResourcePageFrame
      header={{
        title: "GPU 资源池",
        subtitle: "切换集群后管理该集群的资源池、供给组、GPU 规格与实际库存。",
        extra: (
          <Space wrap>
            <Select
              aria-label="切换 GPU 集群"
              placeholder="请选择集群"
              value={currentCluster?.cluster_id}
              loading={clusters.isFetching}
              disabled={!access.can("accelerator:cluster:list")}
              filterOption={false}
              options={(clusters.data?.items ?? []).map((item) => ({
                label: item.display_name,
                value: item.cluster_id,
              }))}
              onChange={(id: string) =>
                setCluster(clusters.data?.items?.find((item) => item.cluster_id === id))
              }
            />
            <Button
              onClick={() => {
                void client.invalidateQueries({ queryKey: acceleratorKeys.all });
                void permissions.refetch();
              }}
            >
              刷新
            </Button>
          </Space>
        ),
      }}
      className="flex flex-col gap-4 min-w-0"
    >
      {clusters.data?.next_page_token ? (
        <Alert content="集群切换暂显示前 100 个集群，完整集群列表请进入管理集群查看。" />
      ) : null}
      {!access.pending && permissions.isSuccess && !access.can("accelerator:cluster:list") ? (
        <Alert type="warning" content="当前账号没有 GPU 集群列表权限，请联系管理员授权。" />
      ) : null}
      {loadingClusters ? (
        <div role="status" aria-label="GPU 集群加载中" aria-busy="true">
          <Skeleton animation text={{ rows: 8, width: "100%" }} />
        </div>
      ) : currentCluster ? (
        <GpuClusterResources
          key={currentCluster.cluster_id}
          cluster={currentCluster}
          access={access}
        />
      ) : (
        <Empty description="请先在顶部选择集群" />
      )}
    </ResourcePageFrame>
  );
}
