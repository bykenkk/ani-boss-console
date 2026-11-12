import { useGpuPermissions } from "@/hooks/useGpuTarget";
import { useState } from "react";
import { Button, Drawer, Tabs } from "@arco-design/web-react";
import type { GpuCluster, GpuPool } from "@/api/accelerator";
import { InitializeGpuSupplyModal } from "../InitializeGpuSupplyModal";
import { GpuInitializationOperationModal } from "../GpuInitializationOperationModal";
import { GpuPools } from "../GpuPools";
import { GpuSupplyGroups } from "../GpuSupplyGroups";
import { GpuProfiles } from "../GpuProfiles";
import { GpuDevices } from "../GpuDevices";
interface GpuClusterResourcesProps {
  cluster: GpuCluster;
}

export function GpuClusterResources({ cluster }: GpuClusterResourcesProps) {
  const { can } = useGpuPermissions();
  const [pool, setPool] = useState<GpuPool>();
  const [initializing, setInitializing] = useState(false);
  const [operationId, setOperationId] = useState<string>();
  return (
    <>
      <div className="mb-4 flex justify-end">
        <Button
          type="primary"
          disabled={!can("accelerator:initialization:create") || !can("accelerator:discovery:list")}
          onClick={() => setInitializing(true)}
        >
          初始化资源池
        </Button>
      </div>
      {initializing ? (
        <InitializeGpuSupplyModal
          cluster={cluster}
          onCancel={() => setInitializing(false)}
          onOperation={(id) => {
            setOperationId(id);
            setInitializing(false);
          }}
        />
      ) : null}
      {operationId ? (
        <GpuInitializationOperationModal
          cluster={cluster}
          operationId={operationId}
          onCancel={() => setOperationId(undefined)}
          onViewResources={() => setOperationId(undefined)}
        />
      ) : null}
      <Tabs>
        <Tabs.TabPane key="pools" title="资源池" destroyOnHide>
          <GpuPools cluster={cluster} onSelect={setPool} />
        </Tabs.TabPane>
        <Tabs.TabPane key="profiles" title="GPU 规格" destroyOnHide>
          <GpuProfiles clusterId={cluster.cluster_id} />
        </Tabs.TabPane>
        <Tabs.TabPane key="devices" title="设备库存" destroyOnHide>
          <GpuDevices clusterId={cluster.cluster_id} />
        </Tabs.TabPane>
      </Tabs>
      {pool ? (
        <Drawer
          visible
          placement="right"
          width="min(800px, 90vw)"
          title={`${pool.display_name} · 供给组`}
          footer={null}
          onCancel={() => setPool(undefined)}
        >
          <GpuSupplyGroups pool={pool} />
        </Drawer>
      ) : null}
    </>
  );
}
