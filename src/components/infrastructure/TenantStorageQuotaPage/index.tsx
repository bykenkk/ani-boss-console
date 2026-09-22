import { Progress, Select, Space } from "@arco-design/web-react";
import clsx from "clsx";
import { useMemo, useState } from "react";
import {
  DataTableNameCell,
  ListDataTable,
  ListPageHeader,
  TableSectionFrame,
  type ListColumn,
} from "@/components/common";
import { Metric } from "@/components/overview/Metric";
import { TenantStorageRecentEvents } from "./TenantStorageRecentEvents";
import { TenantStorageTopN } from "./TenantStorageTopN";

interface QuotaValue {
  used: number;
  max: number;
}

interface PendingExpand {
  kind: string;
  current: number;
  requested: number;
  reason: string;
}

interface TenantStorageQuota {
  id: string;
  name: string;
  displayName: string;
  blockEssd: QuotaValue;
  blockSsd: QuotaValue;
  blockHdd: QuotaValue;
  object: QuotaValue;
  objectCount: QuotaValue;
  nfs: QuotaValue;
  vector: QuotaValue;
  iops: QuotaValue;
  bandwidth: QuotaValue;
  pendingExpand?: PendingExpand;
}

const tenantQuotas: TenantStorageQuota[] = [
  {
    id: "demo-corp",
    name: "demo-corp",
    displayName: "演示租户 demo-corp",
    blockEssd: { used: 200, max: 1024 },
    blockSsd: { used: 120, max: 512 },
    blockHdd: { used: 60, max: 512 },
    object: { used: 220, max: 1024 },
    objectCount: { used: 42000, max: 200000 },
    nfs: { used: 500, max: 2048 },
    vector: { used: 20920, max: 100000 },
    iops: { used: 12000, max: 40000 },
    bandwidth: { used: 180, max: 1000 },
  },
  {
    id: "acme-ai",
    name: "acme-ai",
    displayName: "Acme AI",
    blockEssd: { used: 1400, max: 1536 },
    blockSsd: { used: 300, max: 512 },
    blockHdd: { used: 100, max: 512 },
    object: { used: 900, max: 1024 },
    objectCount: { used: 180000, max: 200000 },
    nfs: { used: 1500, max: 2048 },
    vector: { used: 82000, max: 100000 },
    iops: { used: 36000, max: 40000 },
    bandwidth: { used: 820, max: 1000 },
    pendingExpand: {
      kind: "ESSD",
      current: 1536,
      requested: 3072,
      reason: "训练数据集扩容",
    },
  },
  {
    id: "trial-lab",
    name: "trial-lab",
    displayName: "试用实验室",
    blockEssd: { used: 20, max: 100 },
    blockSsd: { used: 20, max: 50 },
    blockHdd: { used: 0, max: 50 },
    object: { used: 12, max: 100 },
    objectCount: { used: 1200, max: 20000 },
    nfs: { used: 0, max: 200 },
    vector: { used: 420, max: 10000 },
    iops: { used: 800, max: 5000 },
    bandwidth: { used: 20, max: 200 },
  },
];

function percent(value: QuotaValue) {
  return value.max ? Math.round((value.used / value.max) * 100) : 0;
}

function blockTotal(tenant: TenantStorageQuota): QuotaValue {
  return {
    used: tenant.blockEssd.used + tenant.blockSsd.used + tenant.blockHdd.used,
    max: tenant.blockEssd.max + tenant.blockSsd.max + tenant.blockHdd.max,
  };
}

function highestUsage(tenant: TenantStorageQuota) {
  return Math.max(
    percent(tenant.blockEssd),
    percent(tenant.blockSsd),
    percent(tenant.blockHdd),
    percent(tenant.object),
    percent(tenant.objectCount),
    percent(tenant.nfs),
    percent(tenant.vector),
    percent(tenant.iops),
    percent(tenant.bandwidth),
  );
}

function formatCapacity(value: number) {
  return value >= 1024 ? `${(value / 1024).toFixed(1)} Ti` : `${value} Gi`;
}

function UsageCell({
  value,
  formatter = (item) => item.toLocaleString(),
}: {
  value: QuotaValue;
  formatter?: (value: number) => string;
}) {
  const usage = percent(value);
  return (
    <div className="min-w-36">
      <div className="mb-1 text-xs text-gray-700">
        {formatter(value.used)} / {formatter(value.max)}
      </div>
      <Progress percent={usage} showText={false} status={usage >= 90 ? "warning" : "normal"} />
    </div>
  );
}

export function TenantStorageQuotaPage() {
  const [scope, setScope] = useState("all");
  const [keyword, setKeyword] = useState("");

  const filteredQuotas = useMemo(() => {
    const query = keyword.trim().toLowerCase();
    return tenantQuotas.filter((tenant) => {
      const hot = highestUsage(tenant);
      const matchesScope =
        scope === "all" ||
        (scope === "pending" && tenant.pendingExpand) ||
        (scope === "high" && hot >= 85) ||
        (scope === "normal" && hot < 85 && !tenant.pendingExpand);
      return (
        matchesScope &&
        (!query || `${tenant.displayName} ${tenant.name}`.toLowerCase().includes(query))
      );
    });
  }, [keyword, scope]);

  const pendingCount = tenantQuotas.filter((tenant) => tenant.pendingExpand).length;
  const highCount = tenantQuotas.filter((tenant) => highestUsage(tenant) >= 85).length;
  const fullCount = tenantQuotas.filter((tenant) => highestUsage(tenant) >= 100).length;

  const columns: ListColumn<TenantStorageQuota>[] = [
    {
      title: "租户 / ID",
      dataIndex: "displayName",
      width: 190,
      fixed: "left",
      render: (_, tenant) => <DataTableNameCell name={tenant.displayName} id={tenant.name} />,
    },
    {
      title: "风险",
      width: 90,
      render: (_, tenant) => {
        const hot = highestUsage(tenant);
        return (
          <span
            className={clsx(
              "inline-flex rounded px-2 py-0.5 text-xs font-medium",
              hot >= 90
                ? "bg-red-50 text-red-700"
                : hot >= 85
                  ? "bg-orange-50 text-orange-700"
                  : "bg-green-50 text-green-700",
            )}
          >
            {hot >= 90 ? "高" : hot >= 85 ? "关注" : "正常"}
          </span>
        );
      },
    },
    {
      title: "块存储",
      width: 180,
      render: (_, tenant) => <UsageCell value={blockTotal(tenant)} formatter={formatCapacity} />,
    },
    {
      title: "对象存储",
      width: 180,
      render: (_, tenant) => <UsageCell value={tenant.object} formatter={formatCapacity} />,
    },
    {
      title: "对象数",
      width: 170,
      render: (_, tenant) => <UsageCell value={tenant.objectCount} />,
    },
    {
      title: "NFS",
      width: 180,
      render: (_, tenant) => <UsageCell value={tenant.nfs} formatter={formatCapacity} />,
    },
    {
      title: "向量数",
      width: 170,
      render: (_, tenant) => <UsageCell value={tenant.vector} />,
    },
    {
      title: "IOPS",
      width: 170,
      render: (_, tenant) => <UsageCell value={tenant.iops} />,
    },
    {
      title: "带宽 Mbps",
      width: 170,
      render: (_, tenant) => <UsageCell value={tenant.bandwidth} />,
    },
    {
      title: "待扩容申请",
      width: 240,
      render: (_, tenant) =>
        tenant.pendingExpand ? (
          <div className="text-xs leading-5 text-orange-700">
            <div className="font-medium">
              {tenant.pendingExpand.kind}：{tenant.pendingExpand.current} →{" "}
              {tenant.pendingExpand.requested}
            </div>
            <div className="truncate text-gray-500">{tenant.pendingExpand.reason}</div>
          </div>
        ) : (
          <span className="text-gray-400">-</span>
        ),
    },
  ];

  return (
    <div className="space-y-4">
      <ListPageHeader
        title="租户存储配额"
        subtitle="统一查看租户在块、对象、文件和向量存储上的容量与性能配额。"
      />

      <section className="grid grid-cols-4 gap-3.5 max-[1180px]:grid-cols-2">
        <Metric label="租户" value={String(tenantQuotas.length)} hint="当前配额对象" />
        <Metric label="待扩容" value={String(pendingCount)} hint="等待处理" />
        <Metric label="高水位" value={String(highCount)} hint="任一维度 ≥ 85%" />
        <Metric label="配额用尽" value={String(fullCount)} hint="任一维度 ≥ 100%" />
      </section>

      <TenantStorageTopN />

      <TableSectionFrame
        header={
          <div className="flex items-center justify-between px-5 pt-5">
            <div>
              <div className="text-base font-semibold text-gray-900">租户配额明细</div>
              <div className="mt-1 text-xs text-gray-500">
                当前为前端展示数据，尚未接入 ANI 存储配额接口。
              </div>
            </div>
            <span className="text-xs text-gray-500">
              显示 {filteredQuotas.length} / {tenantQuotas.length} 个租户
            </span>
          </div>
        }
        toolbar={{
          search: {
            fields: [{ value: "keyword", label: "关键词" }],
            field: "keyword",
            value: keyword,
            placeholder: "搜索租户名称或 ID",
            onFieldChange: () => undefined,
            onChange: setKeyword,
          },
          filters: (
            <Space>
              <Select
                value={scope}
                onChange={setScope}
                options={[
                  { label: "全部租户", value: "all" },
                  { label: "待扩容", value: "pending" },
                  { label: "高水位", value: "high" },
                  { label: "正常", value: "normal" },
                ]}
              />
            </Space>
          ),
        }}
      >
        <ListDataTable
          rowKey="id"
          columns={columns}
          data={filteredQuotas}
          pagination={false}
          scroll={{ x: 1740 }}
          emptyText="没有符合筛选条件的租户配额"
        />
      </TableSectionFrame>

      <TenantStorageRecentEvents />
    </div>
  );
}
