import { Alert, Empty, Skeleton } from "@arco-design/web-react";
import { useQuery } from "@tanstack/react-query";
import { acceleratorKeys, listGpuClusterOptions } from "@/api/accelerator";
import { ResourcePageFrame } from "@/components/common";
import { useGpuTarget } from "@/hooks/useGpuTarget";
import { GpuClusterResources } from "../GpuClusterResources";
import { GpuTargetSummary } from "../GpuTargetSummary";
export function GpuResourcesPage() {
  const { principal, can, target, permissions } = useGpuTarget();
  const clusters = useQuery({
    queryKey: [...acceleratorKeys.all, "clusters", "options", principal, target.data?.cluster_id],
    queryFn: ({ signal }) => listGpuClusterOptions(signal),
    enabled:
      Boolean(principal) &&
      can("accelerator:cluster:list") &&
      target.data?.registration_state === "GPU_TARGET_REGISTRATION_STATE_REGISTERED",
  });
  const currentCluster = clusters.data?.items?.find(
    (item) =>
      item.cluster_id === target.data?.cluster_id &&
      item.connection_ref === target.data?.connection_ref,
  );
  const scopeKey = `${principal}:${target.data?.connection_ref}:${target.data?.cluster_id}`;
  return (
    <ResourcePageFrame
      header={{
        title: "GPU 资源池",
        subtitle: "管理已确认目标的资源池、供给组、GPU 规格与实际库存。",
      }}
      className="flex flex-col gap-4 min-w-0"
    >
      {!principal || permissions.isPending ? (
        <Skeleton animation text={{ rows: 4 }} />
      ) : !can("accelerator:cluster:list") ? (
        <Alert type="warning" content="需要 accelerator:cluster:list 权限才能查看 GPU 目标。" />
      ) : (
        <>
          <GpuTargetSummary
            key={scopeKey}
            target={target.data}
            principal={principal}
            canRegister={can("accelerator:cluster:register")}
            loading={target.isFetching}
            error={target.error}
            onRefresh={() => {
              target.refetch();
              clusters.refetch();
            }}
          />
          {target.isSuccess &&
          !target.isFetching &&
          target.data?.registration_state === "GPU_TARGET_REGISTRATION_STATE_REGISTERED" ? (
            clusters.isPending ? (
              <Skeleton animation text={{ rows: 8 }} />
            ) : currentCluster ? (
              <GpuClusterResources key={scopeKey} cluster={currentCluster} />
            ) : (
              <Alert
                type="warning"
                content={
                  clusters.error?.message ??
                  "尚未读到目标的原目录记录，请刷新目录。不会创建替代目录或资源池。"
                }
              />
            )
          ) : (
            <Empty description="确认并启用当前目标后，可管理 GPU 资源池。" />
          )}
        </>
      )}
    </ResourcePageFrame>
  );
}
