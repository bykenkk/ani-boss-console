import { useState } from "react";
import { Drawer, Tabs } from "@arco-design/web-react";
import type { GpuCluster, GpuPool } from "@/api/accelerator";
import { GpuPools } from "../GpuPools";
import { GpuSupplyGroups } from "../GpuSupplyGroups";
import { GpuProfiles } from "../GpuProfiles";
import { GpuDevices } from "../GpuDevices";
interface GpuClusterResourcesProps {
  cluster: GpuCluster;
}

export function GpuClusterResources({ cluster }: GpuClusterResourcesProps) {
  const [pool, setPool] = useState<GpuPool>();
  return (
    <>
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
