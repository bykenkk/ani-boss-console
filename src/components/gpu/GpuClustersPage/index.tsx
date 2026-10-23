import { ResourcePageFrame } from "@/components/common";
import { GpuClusters } from "../GpuClusters";
export function GpuClustersPage() {
  return (
    <ResourcePageFrame
      header={{
        title: "GPU 集群",
        subtitle: "登记并查看 GPU 受管集群。资源池等数据在 GPU 资源池页面按集群查看。",
      }}
    >
      <GpuClusters />
    </ResourcePageFrame>
  );
}
