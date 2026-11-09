import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@arco-design/web-react";
import { ApiError, listResources, type ClusterOpsResourceDocument } from "@/api/cluster-ops";
import { clusterOpsKeys } from "@/api/cluster-ops/keys";
import { DataTable, type ListColumn } from "@/components/common";
import { useCursorPagination } from "@/hooks/useCursorPagination";
import { formatDateTime } from "@/lib/date";
import { field, nativeObject, text } from "../model";

interface ResourceEventsProps {
  resource: ClusterOpsResourceDocument;
}
export function ResourceEvents({ resource }: ResourceEventsProps) {
  const scope = JSON.stringify([resource.ref, resource.uid]);
  const [expiredScope, setExpiredScope] = useState<string>();
  const expired = expiredScope === scope;
  const paging = useCursorPagination(scope, 50, "cursor");
  const params = {
    group: "",
    version: "v1",
    resource: "events",
    namespace: resource.ref.namespace,
    all_namespaces: !resource.ref.namespace,
    field_selector: `involvedObject.uid=${resource.uid}`,
    page_size: paging.limit,
    continue_token: paging.cursor,
  };
  const query = useQuery({
    queryKey: clusterOpsKeys.resources(resource.ref.cluster_id, params),
    queryFn: ({ signal }) => listResources(resource.ref.cluster_id, params, signal),
    enabled: !expired,
    meta: { errorNotification: { id: "cluster-resource-events", action: "读取资源事件" } },
  });
  if (query.error instanceof ApiError && query.error.reason === "LIST_EXPIRED" && !expired) {
    setExpiredScope(scope);
    paging.resetPagination();
  }
  const columns: ListColumn<ClusterOpsResourceDocument>[] = [
    { title: "类型", width: 110, render: (_, doc) => text(field(nativeObject(doc), "type")) },
    {
      title: "Reason",
      width: 180,
      ellipsis: true,
      render: (_, doc) => text(field(nativeObject(doc), "reason")),
    },
    {
      title: "Message",
      width: 400,
      ellipsis: true,
      render: (_, doc) => text(field(nativeObject(doc), "message")),
    },
    { title: "Count", width: 90, render: (_, doc) => text(field(nativeObject(doc), "count")) },
    {
      title: "时间",
      width: 180,
      render: (_, doc) => {
        const object = nativeObject(doc);
        return formatDateTime(
          String(
            field(object, "eventTime") ||
              field(object, "lastTimestamp") ||
              field(object, "metadata", "creationTimestamp") ||
              "",
          ),
        );
      },
    },
  ];
  return (
    <DataTable
      header={{
        title: "原生事件",
        description: "按当前对象 UID 查询，不混入同名旧对象",
        extra: (
          <Button
            onClick={() => {
              setExpiredScope(undefined);
              paging.resetPagination();
              if (!paging.cursor && !expired) query.refetch();
            }}
          >
            刷新
          </Button>
        ),
      }}
      columns={columns}
      data={query.data?.items ?? []}
      rowKey="uid"
      loading={query.isFetching}
      pagination={paging.getPagination(
        query.data?.next_continue_token,
        query.isFetching || expired,
      )}
    />
  );
}
