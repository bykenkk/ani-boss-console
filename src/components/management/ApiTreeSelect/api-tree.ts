import type { ManagedApi } from "@/api/management";

export interface ApiTreeNode {
  key: string;
  title: string;
  children?: ApiTreeNode[];
}

export function buildPermissionApiTree(apis: ManagedApi[]): ApiTreeNode[] {
  const modules = new Map<string, ApiTreeNode>();
  for (const api of apis) {
    const module = api.module || "";
    let group = modules.get(module);
    if (!group) {
      group = {
        key: `api-module:${module}`,
        title: module || "未分组",
        children: [],
      };
      modules.set(module, group);
    }
    const endpoint = `${api.method || "-"} ${api.path || api.operation || api.id}`;
    group.children!.push({
      key: `api:${api.id}`,
      title: api.description ? `${endpoint} · ${api.description}` : endpoint,
    });
  }
  return [...modules.values()];
}

export function getCheckedApiIds(keys: string[], apis: ManagedApi[]): number[] {
  const checked = new Set(keys);
  return apis.filter((api) => checked.has(`api:${api.id}`)).map((api) => api.id);
}
