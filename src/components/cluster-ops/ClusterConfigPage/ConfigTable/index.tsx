import type { ClusterOpsResourceDocument, ClusterOpsResourceRef } from "@/api/cluster-ops";
import {
  ResourceIdentity,
  ListDataTable,
  type ListColumn,
  type ListPagination,
} from "@/components/common";
import { formatDateTime } from "@/lib/date";
import { configSummary } from "../config-summary";
import type { ClusterConfigKind } from "../constants";

interface ConfigTableProps {
  kind: ClusterConfigKind;
  resources: ClusterOpsResourceDocument[];
  loading: boolean;
  pagination: ListPagination;
  onOpen: (ref: ClusterOpsResourceRef) => void;
}

export function ConfigTable({ kind, resources, loading, pagination, onOpen }: ConfigTableProps) {
  const rows = resources.map((resource) => ({ ...resource, summary: configSummary(resource) }));
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
    {
      title: "Namespace",
      dataIndex: "ref.namespace",
      width: 200,
      ellipsis: true,
      render: (_, doc) => <ResourceIdentity name={doc.ref.namespace} display="name" />,
    },
    ...(kind === "secrets"
      ? [{ title: "类型", dataIndex: "summary.type", width: 180, ellipsis: true }]
      : []),
    { title: "字段数量", dataIndex: "summary.keyCount", width: 100 },
    { title: "字段", dataIndex: "summary.keyNames", width: 280, ellipsis: true },
    { title: "创建时间", width: 180, render: (_, doc) => formatDateTime(doc.summary.createdAt) },
  ];
  return (
    <ListDataTable
      columns={columns}
      data={rows}
      rowKey={(doc) => JSON.stringify(doc.ref)}
      loading={loading}
      pagination={pagination}
    />
  );
}
