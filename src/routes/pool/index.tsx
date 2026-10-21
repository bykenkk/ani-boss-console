import { Button, Progress, Switch } from "@arco-design/web-react";
import { IconRefresh } from "@arco-design/web-react/icon";
import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import {
  ListDataTable,
  ResourceNameId,
  ResourcePageFrame,
  TableSectionFrame,
  type ListColumn,
  StatusBadge,
  type StatusBadgeTone,
} from "@/components/common";
import { Metric } from "@/components/overview/Metric";
import { formatDateTimeMinute } from "@/lib/date";

type RegionStatus = "enabled" | "disabled" | "planning";

interface RegionCapacity {
  gpuTotal: number;
  gpuFree: number;
  cpuCores: number;
  memoryGi: number;
  storageGi: number;
  nodes: number;
}

interface PlatformRegion {
  id: string;
  code: string;
  name: string;
  status: RegionStatus;
  openForTenant: boolean;
  tenantCount: number;
  azs: string[];
  capacity: RegionCapacity;
  updatedAt: string;
}

const initialRegions: PlatformRegion[] = [
  {
    id: "reg-cn-east-1",
    code: "cn-east-1",
    name: "华东一区",
    status: "enabled",
    openForTenant: true,
    tenantCount: 21,
    azs: ["AZ-A", "AZ-B"],
    capacity: {
      gpuTotal: 64,
      gpuFree: 18,
      cpuCores: 1536,
      memoryGi: 6144,
      storageGi: 98304,
      nodes: 24,
    },
    updatedAt: "2026-08-31 10:28",
  },
  {
    id: "reg-cn-north-1",
    code: "cn-north-1",
    name: "华北一区",
    status: "enabled",
    openForTenant: true,
    tenantCount: 13,
    azs: ["AZ-A"],
    capacity: {
      gpuTotal: 48,
      gpuFree: 24,
      cpuCores: 1152,
      memoryGi: 4608,
      storageGi: 73728,
      nodes: 18,
    },
    updatedAt: "2026-08-31 10:25",
  },
  {
    id: "reg-cn-southwest-1",
    code: "cn-southwest-1",
    name: "西南一区",
    status: "planning",
    openForTenant: false,
    tenantCount: 4,
    azs: ["AZ-A"],
    capacity: {
      gpuTotal: 16,
      gpuFree: 4,
      cpuCores: 384,
      memoryGi: 1536,
      storageGi: 24576,
      nodes: 6,
    },
    updatedAt: "2026-08-31 09:40",
  },
];

const statusMeta: Record<RegionStatus, { label: string; tone: StatusBadgeTone }> = {
  enabled: { label: "已启用", tone: "success" },
  disabled: { label: "已停用", tone: "default" },
  planning: { label: "规划中", tone: "warning" },
};

export const Route = createFileRoute("/pool/")({
  component: function PlatformResourcePoolOverviewRoute() {
    // TODO(region-integration): 接入区域接口后替换演示数据，并开放容量刷新、区域启停和租户开通配置。
    const regions = initialRegions;

    const summary = useMemo(
      () => ({
        openRegions: regions.filter((region) => region.status === "enabled" && region.openForTenant)
          .length,
        gpuFree: regions.reduce((total, region) => total + region.capacity.gpuFree, 0),
        tenantsTotal: regions.reduce((total, region) => total + region.tenantCount, 0),
      }),
      [regions],
    );

    const columns: ListColumn<PlatformRegion>[] = [
      {
        title: "区域 / 编码",
        dataIndex: "name",
        width: 200,
        render: (_, region) => <ResourceNameId name={region.name} id={region.code} />,
      },
      {
        title: "状态",
        dataIndex: "status",
        width: 120,
        render: (status: RegionStatus) => (
          <StatusBadge value={statusMeta[status].label} tone={statusMeta[status].tone} />
        ),
      },
      {
        title: "租户开通",
        dataIndex: "openForTenant",
        width: 130,
        render: (_, region) => (
          <Switch checked={region.openForTenant} disabled checkedText="开放" uncheckedText="关闭" />
        ),
      },
      {
        title: "GPU 空闲 / 总量",
        width: 190,
        render: (_, region) => {
          const { gpuFree, gpuTotal } = region.capacity;
          const usedPercent = gpuTotal ? Math.round(((gpuTotal - gpuFree) / gpuTotal) * 100) : 0;
          return (
            <div className="min-w-36">
              <div className="mb-1 text-sm text-gray-700">
                {gpuFree} / {gpuTotal}
              </div>
              <Progress
                percent={usedPercent}
                showText={false}
                status={usedPercent >= 85 ? "warning" : "normal"}
              />
            </div>
          );
        },
      },
      {
        title: "CPU / 内存",
        width: 160,
        render: (_, region) =>
          `${region.capacity.cpuCores.toLocaleString()} C / ${region.capacity.memoryGi.toLocaleString()} Gi`,
      },
      {
        title: "存储",
        width: 120,
        render: (_, region) =>
          `${Math.round(region.capacity.storageGi / 1024).toLocaleString()} Ti`,
      },
      {
        title: "节点 / AZ",
        width: 140,
        render: (_, region) => `${region.capacity.nodes} / ${region.azs.join(", ")}`,
      },
      {
        title: "租户数",
        dataIndex: "tenantCount",
        width: 90,
      },
      {
        title: "更新时间",
        dataIndex: "updatedAt",
        width: 180,
        render: (value: string) => formatDateTimeMinute(value),
      },
    ];

    return (
      <ResourcePageFrame
        header={{
          title: "平台资源池总览",
          subtitle: "维护区域主数据与平台容量，控制租户开通时可选择的区域。",
          extra: (
            <Button type="primary" disabled icon={<IconRefresh />}>
              刷新全部容量
            </Button>
          ),
        }}
      >
        <section className="grid grid-cols-4 gap-3.5 max-[1180px]:grid-cols-2">
          <Metric
            label="区域"
            value={String(regions.length)}
            hint={`${regions.filter((region) => region.status === "enabled").length} 个已启用`}
          />
          <Metric
            label="开放开通区域"
            value={String(summary.openRegions)}
            hint="进入租户开通可选集"
          />
          <Metric label="租户合计" value={String(summary.tenantsTotal)} hint="全部区域租户" />
          <Metric label="GPU 空闲" value={String(summary.gpuFree)} hint="全部区域汇总" />
        </section>

        <TableSectionFrame>
          <ListDataTable
            header={{
              title: "区域与容量",
              description: "容量刷新会同步区域租户数与 GPU 可用量。",
              extra: <span className="text-xs text-gray-500">共 {regions.length} 个区域</span>,
            }}
            rowKey="id"
            columns={columns}
            rowActions={[
              {
                key: "refresh",
                label: "刷新容量",
                disabled: () => true,
                onClick: () => {},
              },
              {
                key: "status",
                label: (region) => (region.status === "enabled" ? "停用" : "启用"),
                widthLabel: "停用",
                disabled: () => true,
                onClick: () => {},
              },
            ]}
            data={regions}
            pagination={false}
            emptyText="还没有区域容量数据"
          />
        </TableSectionFrame>
      </ResourcePageFrame>
    );
  },
});
