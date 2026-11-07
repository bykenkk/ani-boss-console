import { useState } from "react";
import { Button, Input, Select } from "@arco-design/web-react";
import { useQuery } from "@tanstack/react-query";
import { ApiError, getResource, listResources } from "@/api/cluster-ops";
import { clusterOpsKeys } from "@/api/cluster-ops/keys";
import { useCursorPagination } from "@/hooks/useCursorPagination";
import { readOnlyMessage } from "../model";

interface NamespacePickerProps {
  clusterId: string;
  value: string;
  onChange: (namespace: string) => void;
  allowAll?: boolean;
}
export function NamespacePicker({
  clusterId,
  value,
  onChange,
  allowAll = false,
}: NamespacePickerProps) {
  const [exact, setExact] = useState("");
  const scope = JSON.stringify([clusterId, exact]);
  const [expiredScope, setExpiredScope] = useState<string>();
  const expired = expiredScope === scope;
  const paging = useCursorPagination(scope, 50, "cursor");
  const params = {
    group: "",
    version: "v1",
    resource: "namespaces",
    page_size: paging.limit,
    continue_token: paging.cursor,
    name: exact || undefined,
  };
  const query = useQuery({
    queryKey: clusterOpsKeys.resources(clusterId, params),
    queryFn: ({ signal }) => listResources(clusterId, params, signal),
    enabled: Boolean(clusterId && !exact && !expired),
    meta: { errorNotification: { id: "cluster-namespaces", action: "读取命名空间" } },
  });
  if (query.error instanceof ApiError && query.error.reason === "LIST_EXPIRED" && !expired) {
    setExpiredScope(scope);
    paging.resetPagination();
  }
  const exactRef = {
    cluster_id: clusterId,
    type: { group: "", version: "v1", resource: "namespaces" },
    namespace: "",
    name: exact,
  };
  const exactQuery = useQuery({
    queryKey: clusterOpsKeys.resource(exactRef),
    queryFn: ({ signal }) => getResource(exactRef, { signal }),
    enabled: Boolean(clusterId && exact),
    meta: { errorNotification: { id: "cluster-exact-namespace", action: "精确读取命名空间" } },
  });
  const selected = {
    cluster_id: clusterId,
    type: { group: "", version: "v1", resource: "namespaces" },
    namespace: "",
    name: value,
  };
  const namespace = useQuery({
    queryKey: clusterOpsKeys.resource(selected),
    queryFn: ({ signal }) => getResource(selected, { signal }),
    enabled: Boolean(clusterId && value),
    meta: { errorNotification: { id: "cluster-namespace", action: "读取目标命名空间" } },
  });
  const options = (
    exact ? (exactQuery.data ? [exactQuery.data.resource] : []) : (query.data?.items ?? [])
  ).map((doc) => ({
    value: doc.ref.name,
    label: `${doc.ref.name}${doc.read_only ? "（只读）" : ""}`,
  }));
  if (value && !options.some((option) => option.value === value))
    options.unshift({ value, label: value });
  if (allowAll) options.unshift({ value: "", label: "全部 Namespace" });
  const pagination = paging.getPagination(
    query.data?.next_continue_token,
    query.isFetching || expired,
  );
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Select
        aria-label="Namespace"
        placeholder="选择具体 Namespace"
        value={value || (allowAll ? "" : undefined)}
        options={options}
        filterOption={false}
        onChange={onChange}
      />
      <Input.Search
        aria-label="精确查找 Namespace"
        placeholder="精确查找 Namespace"
        onSearch={(name) => {
          setExact(name);
          paging.resetPagination();
        }}
        searchButton="查找"
      />
      <Button
        disabled={Boolean(exact) || pagination.disabled || pagination.page === 1}
        onClick={() => pagination.onPageChange(pagination.page - 1)}
      >
        上一批
      </Button>
      <Button
        disabled={Boolean(exact) || pagination.disabled || !query.data?.next_continue_token}
        onClick={() => pagination.onPageChange(pagination.page + 1)}
      >
        下一批
      </Button>
      <Button
        onClick={() => {
          setExpiredScope(undefined);
          paging.resetPagination();
          if (exact) exactQuery.refetch();
          else if (!paging.cursor && !expired) query.refetch();
        }}
      >
        刷新候选
      </Button>
      {namespace.data?.resource.read_only ? (
        <span>{readOnlyMessage(namespace.data.resource.read_only_reason)}</span>
      ) : null}
    </div>
  );
}
