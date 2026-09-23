import { Button } from "@arco-design/web-react";
import {
  ResourceNameId,
  ListDataTable,
  ResourcePageFrame,
  TableSectionFrame,
  type ListColumn,
} from "@/components/common";
import { Metric } from "@/components/overview/Metric";
import { formatDateTimeMinute } from "@/lib/date";
import {
  registryGcCandidates,
  registryGcRuns,
  registryTenantQuotas,
  type RegistryGcCandidate,
  type RegistryGcRun,
} from "../model";

export function RegistryGarbageCollectionPage() {
  const reclaimableGi = registryGcCandidates.reduce((total, layer) => total + layer.sizeGi, 0);
  const currentUsedGi = registryTenantQuotas.reduce((total, quota) => total + quota.usedGi, 0);
  const currentQuotaGi = registryTenantQuotas.reduce((total, quota) => total + quota.maxGi, 0);
  const lastRun = registryGcRuns[0];

  const candidateColumns: ListColumn<RegistryGcCandidate>[] = [
    {
      title: "层摘要",
      dataIndex: "digest",
      width: 220,
      fixed: "left",
      render: (_, layer) => <ResourceNameId name={layer.digest} id={layer.id} />,
    },
    { title: "所属仓库", dataIndex: "repository", width: 240 },
    {
      title: "预计可回收",
      dataIndex: "sizeGi",
      width: 130,
      render: (value) => `${String(value)} Gi`,
    },
    { title: "判定原因", dataIndex: "reason", width: 220 },
    {
      title: "最后引用时间",
      dataIndex: "lastReferencedAt",
      width: 165,
      render: (value: string) => formatDateTimeMinute(value),
    },
  ];

  const runColumns: ListColumn<RegistryGcRun>[] = [
    {
      title: "任务",
      dataIndex: "id",
      width: 170,
      render: (_, run) => <ResourceNameId name={run.id} id="镜像仓库 GC" />,
    },
    { title: "状态", dataIndex: "status", width: 110 },
    {
      title: "已回收",
      dataIndex: "reclaimedGi",
      width: 110,
      render: (value) => `${String(value)} Gi`,
    },
    { title: "删除层数", dataIndex: "deletedLayers", width: 110 },
    {
      title: "开始时间",
      dataIndex: "startedAt",
      width: 165,
      render: (value: string) => formatDateTimeMinute(value),
    },
    { title: "耗时", dataIndex: "duration", width: 120 },
  ];

  return (
    <ResourcePageFrame
      header={{
        title: "垃圾回收",
        subtitle: "评估并跟踪镜像仓库未引用层的回收空间与历史任务。",
        extra: (
          <Button type="primary" disabled>
            执行 GC
          </Button>
        ),
      }}
    >
      <section className="grid grid-cols-3 gap-3.5 max-[980px]:grid-cols-1">
        <Metric
          label="预计可回收"
          value={`${reclaimableGi.toFixed(1)} Gi`}
          hint={`${registryGcCandidates.length} 个候选层`}
        />
        <Metric
          label="上次回收"
          value={`${lastRun.reclaimedGi} Gi`}
          hint={formatDateTimeMinute(lastRun.startedAt)}
        />
        <Metric
          label="当前镜像用量"
          value={`${currentUsedGi.toFixed(1)} / ${currentQuotaGi} Gi`}
          hint="全平台租户合计"
        />
      </section>

      <TableSectionFrame>
        <ListDataTable
          header={{
            title: "待回收层",
            description: "当前仅展示预估结果；执行操作待仓库任务接口接入后开放。",
          }}
          rowKey="id"
          columns={candidateColumns}
          data={registryGcCandidates}
          pagination={false}
          emptyText="暂无可回收镜像层"
        />
      </TableSectionFrame>

      <TableSectionFrame>
        <ListDataTable
          header={{
            title: "GC 历史",
            description: "用于核对每次回收释放的容量、删除层数和执行结果。",
          }}
          rowKey="id"
          columns={runColumns}
          data={registryGcRuns}
          pagination={false}
          emptyText="暂无 GC 任务历史"
        />
      </TableSectionFrame>
    </ResourcePageFrame>
  );
}
