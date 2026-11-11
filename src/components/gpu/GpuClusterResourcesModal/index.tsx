import { Modal } from "@arco-design/web-react";
import type { GpuCluster } from "@/api/accelerator";
import { GpuClusterResources } from "../GpuClusterResources";

interface GpuClusterResourcesModalProps {
  cluster: GpuCluster;
  onCancel: () => void;
}

export function GpuClusterResourcesModal({ cluster, onCancel }: GpuClusterResourcesModalProps) {
  return (
    <Modal
      visible
      title={`${cluster.display_name} · GPU 资源池`}
      footer={null}
      style={{ width: "min(1280px, calc(100vw - 48px))" }}
      onCancel={onCancel}
    >
      <GpuClusterResources cluster={cluster} />
    </Modal>
  );
}
