import type { ClusterOpsResourceDocument, ClusterOpsResourceRef } from "@/api/cluster-ops";
import {
  ResourceIdentity,
  ListDataTable,
  StatusBadge,
  type ListColumn,
  type ListPagination,
} from "@/components/common";
import { formatDateTime } from "@/lib/date";
import type { ClusterScopedResourceKind } from "../constants";
import { scopedResourceSummary } from "../resource-summary";

interface ScopedResourcesTableProps {
  kind: ClusterScopedResourceKind;
  resources: ClusterOpsResourceDocument[];
  loading: boolean;
  pagination: ListPagination;
  onOpen: (ref: ClusterOpsResourceRef) => void;
}

export function ScopedResourcesTable({
  kind,
  resources,
  loading,
  pagination,
  onOpen,
}: ScopedResourcesTableProps) {
  const rows = resources.map((resource) => ({
    ...resource,
    summary: scopedResourceSummary(resource),
  }));
  const columns: ListColumn<(typeof rows)[number]>[] = [
    {
      title: "名称",
      key: "name",
      dataIndex: "ref.name",
      width: 200,
      bodyCellStyle: { maxWidth: 200 },
      fixed: "left",
      ellipsis: true,
      render: (_, doc) => (
        <ResourceIdentity name={doc.ref.name} display="name" onOpen={() => onOpen(doc.ref)} />
      ),
    },
    { title: "状态", width: 120, render: (_, doc) => <StatusBadge {...doc.summary.status} /> },
    ...(kind === "namespaces"
      ? [{ title: "标签", dataIndex: "summary.labels", width: 320, ellipsis: true }]
      : [
          { title: "API 组", dataIndex: "summary.group", width: 220, ellipsis: true },
          { title: "资源种类", dataIndex: "summary.kind", width: 180, ellipsis: true },
          { title: "作用域", dataIndex: "summary.scope", width: 120 },
          { title: "服务版本", dataIndex: "summary.servedVersions", width: 160, ellipsis: true },
          { title: "存储版本", dataIndex: "summary.storageVersion", width: 120, ellipsis: true },
        ]),
    { title: "创建时间", width: 180, render: (_, doc) => formatDateTime(doc.summary.createdAt) },
  ];
  return (
    <ListDataTable
      columns={columns}
      data={rows}
      rowKey={(doc) => JSON.stringify(doc.ref)}
      loading={loading}
      pagination={pagination}
      scroll={{
        x: columns.reduce(
          (width, column) => width + (typeof column.width === "number" ? column.width : 180),
          0,
        ),
      }}
    />
  );
}
