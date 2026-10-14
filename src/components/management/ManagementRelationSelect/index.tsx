import { useState } from "react";
import { Select } from "@arco-design/web-react";
import { useQuery } from "@tanstack/react-query";
import {
  listManagementOptions,
  managementKeys,
  type ManagedApi,
  type ManagedRole,
  type Resource,
  type ManagementListInput,
} from "@/api/management";
import { withId } from "@/lib/id";
interface Props {
  resource: Resource;
  value?: number | number[];
  onChange?: (value: number | number[] | undefined) => void;
  multiple?: boolean;
  tenantId?: number;
  userRoles?: boolean;
  disabled?: boolean;
  excludeId?: number;
  includePlatform?: boolean;
  includeRoot?: boolean;
}
export function ManagementRelationSelect({
  resource,
  value,
  onChange,
  multiple,
  tenantId,
  userRoles,
  disabled,
  excludeId,
  includePlatform,
  includeRoot,
}: Props) {
  const [search, setSearch] = useState("");
  const filters: ManagementListInput["filters"] = {
    ...(userRoles ? { tenant_id: tenantId ?? 0, type: tenantId ? "TENANT" : "SYSTEM" } : {}),
    ...(excludeId !== undefined
      ? { [resource === "permission-groups" ? "exclude_subtree" : "id__ne"]: excludeId }
      : {}),
    ...(search ? { [resource === "apis" ? "path__contains" : "name__contains"]: search } : {}),
  };
  const query = useQuery({
    queryKey: managementKeys.list(resource, { noPaging: true, filters }),
    queryFn: ({ signal }) => listManagementOptions(resource, filters, signal),
    meta: {
      errorNotification: { id: withId("management-options", resource), action: "关联选项加载" },
    },
  });
  const options = (query.data ?? []).map((item) => {
    const api = item as ManagedApi;
    const role = item as ManagedRole;
    return {
      value: item.id,
      label:
        resource === "apis"
          ? `${api.method ?? ""} ${api.path ?? ""} · ${item.description ?? item.id}`
          : `${item.name ?? item.code ?? item.id}${resource === "roles" && role.tenantName ? ` · ${role.tenantName}` : ""}`,
    };
  });
  if (includePlatform) options.unshift({ value: 0, label: "平台（全局）" });
  if (includeRoot) options.unshift({ value: 0, label: "无上级分组" });
  return (
    <Select
      aria-label="关联资源"
      showSearch
      filterOption={false}
      onSearch={setSearch}
      allowClear
      mode={multiple ? "multiple" : undefined}
      value={value}
      onChange={onChange}
      options={options}
      loading={query.isFetching}
      disabled={disabled || query.isError}
      placeholder="请选择"
      maxTagCount={3}
    />
  );
}
