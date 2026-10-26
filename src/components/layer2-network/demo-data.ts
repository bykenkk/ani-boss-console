// TODO(network-api): 正式网络契约确认后替换演示数据；当前资源及关联选项均不请求后端。
export interface Layer2NetworkRecord {
  id: string;
  name: string;
  clusterId: string;
  nic: string;
  vlanId: number;
  switchId?: string;
}

export const demoNetworkClusters = [
  { id: "demo-cluster-1", name: "计算集群 A" },
  { id: "demo-cluster-2", name: "计算集群 B" },
];

export const demoVirtualSwitches = [
  { id: "demo-switch-1", name: "业务虚拟交换机", clusterId: "demo-cluster-1" },
  { id: "demo-switch-2", name: "公网虚拟交换机", clusterId: "demo-cluster-1" },
  { id: "demo-switch-3", name: "裸金属虚拟交换机", clusterId: "demo-cluster-2" },
];

export const demoLayer2Networks: Layer2NetworkRecord[] = [
  {
    id: "demo-l2-1",
    name: "业务二层网络",
    clusterId: "demo-cluster-1",
    nic: "bond0",
    vlanId: 1635,
    switchId: "demo-switch-1",
  },
  {
    id: "demo-l2-2",
    name: "公网二层网络",
    clusterId: "demo-cluster-1",
    nic: "eno2",
    vlanId: 23,
    switchId: "demo-switch-2",
  },
  {
    id: "demo-l2-3",
    name: "裸金属二层网络",
    clusterId: "demo-cluster-2",
    nic: "bond1",
    vlanId: 25,
  },
];
