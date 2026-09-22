import { Progress, Select, Space } from "@arco-design/web-react";
import { createFileRoute } from "@tanstack/react-router";
import clsx from "clsx";
import { useMemo, useState } from "react";
import {
  ListDataTable,
  DataTableNameCell,
  ListPageHeader,
  TableSectionFrame,
  type ListColumn,
} from "@/components/common";
import { Metric } from "@/components/overview/Metric";
import { RecentStorageEvents } from "@/components/infrastructure/StorageInfrastructure/RecentStorageEvents";
import { StorageClassOperations } from "@/components/infrastructure/StorageInfrastructure/StorageClassOperations";

type StorageType = "块" | "对象" | "文件" | "向量";
type StorageStatus = "healthy" | "degraded" | "error";

interface StorageBackend {
  id: string;
  name: string;
  type: StorageType;
  region: string;
  status: StorageStatus;
  usedGi: number;
  totalGi: number;
  tenants: number;
  version: string;
  endpoint: string;
  replicas: string;
  nodes: number;
  note: string;
}

const storageBackends: StorageBackend[] = [
  {
    id: "be-block-ceph",
    name: "块存储池 · Rook-Ceph",
    type: "块",
    region: "cn-east-1",
    status: "healthy",
    usedGi: 12800,
    totalGi: 50000,
    tenants: 12,
    version: "Ceph 18.2 / CSI",
    endpoint: "ceph-mon.infra.svc:6789",
    replicas: "3 副本",
    nodes: 12,
    note: "供 Console 云盘 / PVC",
  },
  {
    id: "be-obj-minio",
    name: "对象存储 · MinIO",
    type: "对象",
    region: "cn-east-1",
    status: "healthy",
    usedGi: 6200,
    totalGi: 20000,
    tenants: 12,
    version: "MinIO RELEASE.2026-05",
    endpoint: "https://s3.cn-east-1.ani.local",
    replicas: "纠删 EC:4+2",
    nodes: 6,
    note: "供 Console 桶；镜像 blob 另见镜像配额",
  },
  {
    id: "be-nfs-csi",
    name: "文件存储 · NFS CSI",
    type: "文件",
    region: "cn-east-1",
    status: "degraded",
    usedGi: 3100,
    totalGi: 10000,
    tenants: 8,
    version: "nfs.csi.k8s.io",
    endpoint: "nfs-server.infra.svc",
    replicas: "主备",
    nodes: 2,
    note: "降级：挂载目标延迟升高",
  },
  {
    id: "be-vector-milvus",
    name: "向量后端 · Milvus",
    type: "向量",
    region: "cn-east-1",
    status: "healthy",
    usedGi: 420,
    totalGi: 2000,
    tenants: 6,
    version: "Milvus 2.4",
    endpoint: "milvus.infra.svc:19530",
    replicas: "2 副本",
    nodes: 3,
    note: "供 Console 向量库 / 知识库",
  },
];

const statusMeta: Record<StorageStatus, { label: string; className: string }> = {
  healthy: { label: "健康", className: "bg-green-50 text-green-700" },
  degraded: { label: "降级", className: "bg-orange-50 text-orange-700" },
  error: { label: "异常", className: "bg-red-50 text-red-700" },
};

function formatCapacity(valueGi: number) {
  return valueGi >= 1024
    ? `${(valueGi / 1024).toFixed(valueGi % 1024 === 0 ? 0 : 1)} Ti`
    : `${valueGi} Gi`;
}

export const Route = createFileRoute("/ops-storage/")({
  component: function StorageInfrastructureRoute() {
    const [type, setType] = useState<"all" | StorageType>("all");
    const [status, setStatus] = useState<"all" | StorageStatus>("all");
    const [region, setRegion] = useState("all");
    const [keyword, setKeyword] = useState("");

    const regions = useMemo(
      () => [...new Set(storageBackends.map((backend) => backend.region))],
      [],
    );
    const filteredBackends = useMemo(() => {
      const query = keyword.trim().toLowerCase();
      return storageBackends.filter(
        (backend) =>
          (type === "all" || backend.type === type) &&
          (status === "all" || backend.status === status) &&
          (region === "all" || backend.region === region) &&
          (!query ||
            [backend.name, backend.note, backend.endpoint].some((value) =>
              value.toLowerCase().includes(query),
            )),
      );
    }, [keyword, region, status, type]);

    const totalUsed = storageBackends.reduce((sum, backend) => sum + backend.usedGi, 0);
    const totalCapacity = storageBackends.reduce((sum, backend) => sum + backend.totalGi, 0);
    const healthyCount = storageBackends.filter((backend) => backend.status === "healthy").length;
    const degradedCount = storageBackends.filter((backend) => backend.status === "degraded").length;
    const utilization = Math.round((totalUsed / totalCapacity) * 100);

    const columns: ListColumn<StorageBackend>[] = [
      {
        title: "存储后端 / ID",
        dataIndex: "name",
        width: 220,
        fixed: "left",
        render: (_, backend) => <DataTableNameCell name={backend.name} id={backend.id} />,
      },
      {
        title: "状态",
        dataIndex: "status",
        width: 90,
        render: (value: StorageStatus) => (
          <span
            className={clsx(
              "inline-flex rounded px-2 py-0.5 text-xs font-medium",
              statusMeta[value].className,
            )}
          >
            {statusMeta[value].label}
          </span>
        ),
      },
      { title: "类型", dataIndex: "type", width: 90 },
      { title: "区域", dataIndex: "region", width: 130 },
      {
        title: "容量使用",
        width: 210,
        render: (_, backend) => {
          const percent = Math.round((backend.usedGi / backend.totalGi) * 100);
          return (
            <div className="min-w-40">
              <div className="mb-1 text-sm text-gray-700">
                {formatCapacity(backend.usedGi)} / {formatCapacity(backend.totalGi)}
              </div>
              <Progress
                percent={percent}
                showText={false}
                status={percent >= 85 ? "warning" : "normal"}
              />
            </div>
          );
        },
      },
      { title: "租户数", dataIndex: "tenants", width: 90 },
      { title: "版本", dataIndex: "version", width: 190 },
      {
        title: "副本 / 节点",
        width: 150,
        render: (_, backend) => `${backend.replicas} / ${backend.nodes}`,
      },
      {
        title: "端点",
        dataIndex: "endpoint",
        width: 230,
        ellipsis: true,
      },
      {
        title: "说明",
        dataIndex: "note",
        width: 240,
        ellipsis: true,
      },
    ];

    return (
      <div className="space-y-4">
        <ListPageHeader
          title="存储基础设施"
          subtitle="查看平台块、对象、文件和向量存储后端的健康与容量状态。"
        />

        <section className="grid grid-cols-4 gap-3.5 max-[1180px]:grid-cols-2">
          <Metric
            label="存储后端"
            value={String(storageBackends.length)}
            hint="块、对象、文件、向量"
          />
          <Metric label="健康" value={String(healthyCount)} hint="运行正常" />
          <Metric label="降级" value={String(degradedCount)} hint="需要关注" />
          <Metric
            label="综合利用率"
            value={`${utilization}%`}
            hint={`${formatCapacity(totalUsed)} / ${formatCapacity(totalCapacity)}`}
          />
        </section>

        <TableSectionFrame
          header={
            <div className="flex items-center justify-between px-5 pt-5">
              <div>
                <div className="text-base font-semibold text-gray-900">存储后端</div>
                <div className="mt-1 text-xs text-gray-500">
                  当前为前端展示数据，尚未接入 ANI 存储接口。
                </div>
              </div>
              <span className="text-xs text-gray-500">
                显示 {filteredBackends.length} / {storageBackends.length} 个后端
              </span>
            </div>
          }
          toolbar={{
            search: {
              fields: [{ value: "keyword", label: "关键词" }],
              field: "keyword",
              value: keyword,
              placeholder: "搜索后端、端点或说明",
              onFieldChange: () => undefined,
              onChange: setKeyword,
            },
            filters: (
              <Space>
                <Select
                  value={type}
                  onChange={setType}
                  options={[
                    { label: "全部类型", value: "all" },
                    { label: "块存储", value: "块" },
                    { label: "对象存储", value: "对象" },
                    { label: "文件存储", value: "文件" },
                    { label: "向量存储", value: "向量" },
                  ]}
                />
                <Select
                  value={status}
                  onChange={setStatus}
                  options={[
                    { label: "全部状态", value: "all" },
                    { label: "健康", value: "healthy" },
                    { label: "降级", value: "degraded" },
                    { label: "异常", value: "error" },
                  ]}
                />
                <Select
                  value={region}
                  onChange={setRegion}
                  options={[
                    { label: "全部区域", value: "all" },
                    ...regions.map((value) => ({ label: value, value })),
                  ]}
                />
              </Space>
            ),
          }}
        >
          <ListDataTable
            rowKey="id"
            columns={columns}
            data={filteredBackends}
            pagination={false}
            scroll={{ x: 1650 }}
            emptyText="没有符合筛选条件的存储后端"
          />
        </TableSectionFrame>

        <StorageClassOperations />
        <RecentStorageEvents />
      </div>
    );
  },
});
