import { useState } from "react";
import { Drawer, Tabs } from "@arco-design/web-react";
import type { GpuCluster, GpuPool } from "@/api/accelerator";
import type { GpuAccess } from "../GpuResourcesPage/types";
import { GpuPools } from "../GpuPools";
import { GpuSupplyGroups } from "../GpuSupplyGroups";
import { GpuProfiles } from "../GpuProfiles";
import { GpuDevices } from "../GpuDevices";
import { GpuBindings } from "../GpuBindings";
export function GpuClusterResources({
  cluster,
  access,
}: {
  cluster: GpuCluster;
  access: GpuAccess;
}) {
  const [pool, setPool] = useState<GpuPool>();
  return (
    <>
      <Tabs>
        <Tabs.TabPane key="pools" title="资源池" destroyOnHide>
          <GpuPools cluster={cluster} access={access} onSelect={setPool} />
        </Tabs.TabPane>
        {access.can("accelerator:profile:admin-list") ? (
          <Tabs.TabPane key="profiles" title="GPU 规格" destroyOnHide>
            <GpuProfiles clusterId={cluster.cluster_id} access={access} />
          </Tabs.TabPane>
        ) : null}
        {access.can("accelerator:device:list") ? (
          <Tabs.TabPane key="devices" title="物理库存" destroyOnHide>
            <GpuDevices clusterId={cluster.cluster_id} access={access} />
          </Tabs.TabPane>
        ) : null}
        {access.can("accelerator:binding:admin-list") ? (
          <Tabs.TabPane key="bindings" title="实际绑定" destroyOnHide>
            <GpuBindings clusterId={cluster.cluster_id} access={access} />
          </Tabs.TabPane>
        ) : null}
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
          <GpuSupplyGroups pool={pool} access={access} />
        </Drawer>
      ) : null}
    </>
  );
}
