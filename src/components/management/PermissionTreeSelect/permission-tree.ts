import type { ManagedPermission, ManagedPermissionGroup } from "@/api/management";

export interface PermissionTreeNode {
  key: string;
  title: string;
  children?: PermissionTreeNode[];
  disableCheckbox?: boolean;
}

export function buildRolePermissionTree(
  groups: ManagedPermissionGroup[],
  permissions: ManagedPermission[],
): PermissionTreeNode[] {
  const groupIds = new Set<number>();
  const byGroup = new Map<number, PermissionTreeNode[]>();
  const ungrouped: PermissionTreeNode[] = [];
  const collectGroups = (nodes: ManagedPermissionGroup[]) => {
    for (const group of nodes) {
      groupIds.add(group.id);
      collectGroups(group.children ?? []);
    }
  };
  collectGroups(groups);

  for (const permission of permissions) {
    const node: PermissionTreeNode = {
      key: `permission:${permission.id}`,
      title: permission.name || permission.code || String(permission.id),
    };
    if (permission.groupId !== undefined && groupIds.has(permission.groupId)) {
      const siblings = byGroup.get(permission.groupId) ?? [];
      siblings.push(node);
      byGroup.set(permission.groupId, siblings);
    } else {
      // 无分组或所属分组已不可见的权限点仍可选择。
      ungrouped.push(node);
    }
  }

  const buildGroups = (nodes: ManagedPermissionGroup[]): PermissionTreeNode[] =>
    nodes.map((group) => {
      const children = [...buildGroups(group.children ?? []), ...(byGroup.get(group.id) ?? [])];
      return {
        key: `group:${group.id}`,
        title: group.name || group.code || String(group.id),
        children: children.length ? children : undefined,
        disableCheckbox: children.every((child) => child.disableCheckbox),
      };
    });

  return [...buildGroups(groups), ...ungrouped];
}

export function getCheckedPermissionIds(
  keys: string[],
  permissions: ManagedPermission[],
): number[] {
  const checked = new Set(keys);
  return permissions
    .filter((permission) => checked.has(`permission:${permission.id}`))
    .map((permission) => permission.id);
}

export function getPermissionTreeExpandedKeys(nodes: PermissionTreeNode[]): string[] {
  return nodes.flatMap((node) =>
    node.children?.length ? [node.key, ...getPermissionTreeExpandedKeys(node.children)] : [],
  );
}
