export type NetworkKind = "basic" | "public";

export interface NetworkRecord {
  id: string;
  name: string;
  kind: NetworkKind;
  availablePercent: number;
  cidr: string;
  startIp: string;
  endIp: string;
  layer2Id?: string;
  switchGateway: string;
  platformGateway: string;
  owner: string;
  createdAt: string;
  updatedAt: string;
  description: string;
}
