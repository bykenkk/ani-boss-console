import { Button } from "@arco-design/web-react";
import type { ClusterOpsResourceDocument, ClusterOpsResourceRef } from "@/api/cluster-ops";
import {
  ListDataTable,
  StatusBadge,
  type ListColumn,
  type ListPagination,
} from "@/components/common";
import { formatDateTime } from "@/lib/date";
import { workloadSummary } from "../workload-summary";
import type { ClusterWorkloadKind } from "../constants";

interface WorkloadTableProps {
  kind: ClusterWorkloadKind;
  resources: ClusterOpsResourceDocument[];
  loading: boolean;
  pagination: ListPagination;
  onOpen: (ref: ClusterOpsResourceRef) => void;
}

type WorkloadRow = ClusterOpsResourceDocument & { summary: ReturnType<typeof workloadSummary> };

function resourceColumns(kind: ClusterWorkloadKind): ListColumn<WorkloadRow>[] {
  if (kind === "services")
    return [
      { title: "类型", dataIndex: "summary.service.type", width: 140 },
      { title: "集群 IP", dataIndex: "summary.service.clusterIP", width: 180, ellipsis: true },
      {
        title: "外部地址",
        dataIndex: "summary.service.externalAddress",
        width: 220,
        ellipsis: true,
      },
      { title: "端口", dataIndex: "summary.service.ports", width: 200, ellipsis: true },
    ];
  if (kind === "pods")
    return [
      { title: "就绪容器", dataIndex: "summary.pod.ready", width: 120 },
      { title: "重启次数", dataIndex: "summary.pod.restarts", width: 100 },
      { title: "节点", dataIndex: "summary.pod.node", width: 160, ellipsis: true },
      { title: "容器组 IP", dataIndex: "summary.pod.ip", width: 160, ellipsis: true },
    ];
  if (kind === "jobs")
    return [
      {
        title: "完成数 / 目标",
        width: 140,
        render: (_, doc) => `${doc.summary.succeeded} / ${doc.summary.completions}`,
      },
      { title: "运行中", dataIndex: "summary.active", width: 100 },
      { title: "失败 Pod", dataIndex: "summary.failed", width: 100 },
    ];
  return [
    {
      title: kind === "daemonsets" ? "就绪 / 期望节点" : "就绪 / 期望副本",
      width: 150,
      render: (_, doc) => `${doc.summary.ready} / ${doc.summary.desired}`,
    },
    {
      title: kind === "daemonsets" ? "已更新节点" : "已更新副本",
      dataIndex: "summary.updated",
      width: 120,
    },
  ];
}

export function WorkloadTable({
  kind,
  resources,
  loading,
  pagination,
  onOpen,
}: WorkloadTableProps) {
  const rows = resources.map((resource) => ({ ...resource, summary: workloadSummary(resource) }));
  const columns: ListColumn<WorkloadRow>[] = [
    {
      title: "名称",
      key: "name",
      dataIndex: "ref.name",
      width: 200,
      bodyCellStyle: { maxWidth: 200 },
      fixed: "left",
      ellipsis: true,
      render: (_, doc) => (
        <Button
          type="text"
          className="h-auto! max-w-full! p-0!"
          title={doc.ref.name}
          onClick={() => onOpen(doc.ref)}
        >
          <span className="block truncate">{doc.ref.name}</span>
        </Button>
      ),
    },
    ...(kind === "services"
      ? []
      : [
          {
            title: "状态",
            width: 120,
            render: (_: unknown, doc: WorkloadRow) => <StatusBadge {...doc.summary.status} />,
          },
        ]),
    { title: "Namespace", dataIndex: "ref.namespace", width: 180, ellipsis: true },
    ...resourceColumns(kind),
    ...(kind === "services"
      ? []
      : [{ title: "镜像", dataIndex: "summary.images", width: 280, ellipsis: true }]),
    { title: "创建时间", render: (_, doc) => formatDateTime(doc.summary.createdAt) },
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
