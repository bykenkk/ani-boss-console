import type { ClusterOpsResourceDocument, ClusterOpsResourceRef } from "@/api/cluster-ops";
import {
  ResourceIdentity,
  ListDataTable,
  StatusBadge,
  type ListColumn,
  type ListPagination,
} from "@/components/common";
import { formatDateTime } from "@/lib/date";
import { storageSummary } from "../storage-summary";
import type { ClusterStorageKind } from "../constants";

interface StorageTableProps {
  kind: ClusterStorageKind;
  resources: ClusterOpsResourceDocument[];
  loading: boolean;
  pagination: ListPagination;
  onOpen: (ref: ClusterOpsResourceRef) => void;
}
type StorageRow = ClusterOpsResourceDocument & { summary: ReturnType<typeof storageSummary> };

function storageColumns(kind: ClusterStorageKind): ListColumn<StorageRow>[] {
  if (kind === "classes")
    return [
      { title: "默认存储类", dataIndex: "summary.defaultClass", width: 110 },
      { title: "供应者", dataIndex: "summary.provisioner", width: 240, ellipsis: true },
      { title: "回收策略", dataIndex: "summary.reclaimPolicy", width: 120 },
      { title: "卷绑定模式", dataIndex: "summary.bindingMode", width: 180 },
      { title: "允许卷扩展", dataIndex: "summary.expansion", width: 120 },
    ];
  return [
    { title: "状态", width: 120, render: (_, doc) => <StatusBadge {...doc.summary.status} /> },
    ...(kind === "claims"
      ? [
          {
            title: "Namespace",
            dataIndex: "ref.namespace",
            width: 200,
            ellipsis: true,
            render: (_, doc) => <ResourceIdentity name={doc.ref.namespace} display="name" />,
          },
        ]
      : []),
    {
      title: "存储类",
      dataIndex: "summary.storageClass",
      width: 200,
      ellipsis: true,
      render: (_, doc) => <ResourceIdentity name={doc.summary.storageClass} display="name" />,
    },
    ...(kind === "claims"
      ? [{ title: "申请容量", dataIndex: "summary.requested", width: 120 }]
      : []),
    { title: "容量", dataIndex: "summary.capacity", width: 120 },
    { title: "访问模式", dataIndex: "summary.accessModes", width: 140 },
    kind === "claims"
      ? {
          title: "持久卷",
          dataIndex: "summary.volume",
          width: 200,
          ellipsis: true,
          render: (_, doc) => <ResourceIdentity name={doc.summary.volume} display="name" />,
        }
      : {
          title: "持久卷声明",
          dataIndex: "summary.claim",
          width: 200,
          ellipsis: true,
          render: (_, doc) => <ResourceIdentity name={doc.summary.claim} display="name" />,
        },
    ...(kind === "volumes"
      ? [{ title: "回收策略", dataIndex: "summary.reclaimPolicy", width: 120 }]
      : []),
  ];
}

export function StorageTable({ kind, resources, loading, pagination, onOpen }: StorageTableProps) {
  const rows = resources.map((resource) => ({ ...resource, summary: storageSummary(resource) }));
  const columns: ListColumn<StorageRow>[] = [
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
    ...storageColumns(kind),
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
