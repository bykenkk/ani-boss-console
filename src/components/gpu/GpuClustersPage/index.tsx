import { useQuery } from "@tanstack/react-query";
import { fetchPermissionCodes } from "@/api/auth/permissions";
import { ResourcePageFrame } from "@/components/common";
import { useAuthState } from "@/hooks/useAuthState";
import { GpuClusters } from "../GpuClusters";
export function GpuClustersPage() {
  const auth = useAuthState();
  const permissions = useQuery({
    queryKey: ["auth", "permission-codes", auth.tokens?.access_token],
    queryFn: ({ signal }) => fetchPermissionCodes(signal),
    meta: { errorNotification: { id: "permission-codes", action: "当前权限加载" } },
  });
  const access = {
    can: (code: string) => permissions.data?.codes?.includes(code) === true,
    pending: permissions.isPending,
  };
  return (
    <ResourcePageFrame
      header={{
        title: "GPU 集群",
        subtitle: "登记并查看 GPU 受管集群。资源池等数据在 GPU 资源池页面按集群查看。",
      }}
    >
      <GpuClusters access={access} />
    </ResourcePageFrame>
  );
}
