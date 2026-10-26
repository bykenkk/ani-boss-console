import type { NetworkRecord } from "@/components/network/model";

// TODO(network-api): 正式网络契约确认后替换演示数据；当前资源及关联选项均不请求后端。
export const demoPublicNetworks: NetworkRecord[] = [23, 24].map((subnet, index) => ({
  id: `demo-public-${index + 1}`,
  name: index === 0 ? "公网资源网络" : "备用公有网络",
  kind: "public",
  availablePercent: index === 0 ? 77.05 : 99.21,
  cidr: `192.168.${subnet}.0/24`,
  startIp: `192.168.${subnet}.2`,
  endIp: `192.168.${subnet}.254`,
  layer2Id: "demo-l2-2",
  switchGateway: `192.168.${subnet}.1`,
  platformGateway: `192.168.${subnet}.1`,
  owner: "超级管理员",
  createdAt: "2026-09-17T17:09:17+08:00",
  updatedAt: "2026-09-29T11:37:56+08:00",
  description: "",
}));
