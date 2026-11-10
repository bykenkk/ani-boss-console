import { Select } from "@arco-design/web-react";
import { useInfiniteQuery, useQuery, useQueryClient } from "@tanstack/react-query";
import { ApiError, getResource, listResources } from "@/api/cluster-ops";
import { clusterOpsKeys } from "@/api/cluster-ops/keys";
import { readOnlyMessage } from "../model";

interface NamespacePickerProps {
  clusterId: string;
  value: string;
  onChange: (namespace: string) => void;
  allowAll?: boolean;
  disabled?: boolean;
}
export function NamespacePicker({
  clusterId,
  value,
  onChange,
  allowAll = false,
  disabled = false,
}: NamespacePickerProps) {
  const client = useQueryClient();
  // TODO(pagination-migration): 当前按 page_size/continue_token 滚动加载；后端支持页码分页后复用 PageParams，并将续页参数改为页码。
  const params = {
    group: "",
    version: "v1",
    resource: "namespaces",
    page_size: 50,
  };
  const queryKey = [...clusterOpsKeys.resources(clusterId, params), "options"];
  const query = useInfiniteQuery({
    queryKey,
    queryFn: ({ signal, pageParam }) =>
      listResources(clusterId, { ...params, continue_token: pageParam || undefined }, signal),
    initialPageParam: "",
    getNextPageParam: (page) => page.next_continue_token || undefined,
    enabled: Boolean(clusterId && !disabled),
    staleTime: Infinity,
    meta: { errorNotification: { id: "cluster-namespaces", action: "读取命名空间" } },
  });
  const expired = query.error instanceof ApiError && query.error.reason === "LIST_EXPIRED";
  const selected = {
    cluster_id: clusterId,
    type: { group: "", version: "v1", resource: "namespaces" },
    namespace: "",
    name: value,
  };
  const namespace = useQuery({
    queryKey: clusterOpsKeys.resource(selected),
    queryFn: ({ signal }) => getResource(selected, { signal }),
    enabled: Boolean(clusterId && value && !disabled),
    meta: { errorNotification: { id: "cluster-namespace", action: "读取目标命名空间" } },
  });
  const options = (query.data?.pages.flatMap((page) => page.items) ?? []).map((doc) => ({
    value: doc.ref.name,
    label: `${doc.ref.name}${doc.read_only ? "（只读）" : ""}`,
  }));
  if (value && !options.some((option) => option.value === value))
    options.unshift({ value, label: value });
  if (allowAll) options.unshift({ value: "", label: "全部 Namespace" });
  return (
    <div className="flex min-w-0 flex-nowrap items-center gap-2">
      <Select
        aria-label="Namespace"
        placeholder="选择具体 Namespace"
        value={value || (allowAll ? "" : undefined)}
        options={options}
        disabled={disabled}
        loading={query.isFetching}
        filterOption={false}
        onChange={onChange}
        onVisibleChange={(visible) => {
          if (visible && expired && !disabled && !query.isFetching)
            client.resetQueries({ queryKey, exact: true }).catch(() => undefined);
        }}
        onPopupScroll={(element: HTMLElement) => {
          if (
            !disabled &&
            !expired &&
            query.hasNextPage &&
            !query.isFetching &&
            element.scrollHeight - element.scrollTop - element.clientHeight <= 24
          )
            query.fetchNextPage({ cancelRefetch: false }).catch(() => undefined);
        }}
      />
      {!disabled && namespace.data?.resource.read_only ? (
        <span>{readOnlyMessage(namespace.data.resource.read_only_reason)}</span>
      ) : null}
    </div>
  );
}
