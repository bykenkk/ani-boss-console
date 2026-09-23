import { Button, Modal, Progress, Switch } from "@arco-design/web-react";
import { IconRefresh } from "@arco-design/web-react/icon";
import { createFileRoute } from "@tanstack/react-router";
import clsx from "clsx";
import { useMemo, useState } from "react";
import {
  ListDataTable,
  DataTableNameCell,
  ResourcePageFrame,
  TableSectionFrame,
  type ListColumn,
} from "@/components/common";
import { Metric } from "@/components/overview/Metric";
import { formatCurrentDateTime, formatDateTimeMinute } from "@/lib/date";
import { showMessage } from "@/lib/feedback";

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

const statusMeta: Record<RegionStatus, { label: string; className: string }> = {
  enabled: { label: "已启用", className: "bg-green-50 text-green-700" },
  disabled: { label: "已停用", className: "bg-gray-100 text-gray-600" },
  planning: { label: "规划中", className: "bg-orange-50 text-orange-700" },
};

export const Route = createFileRoute("/ops-pool/")({
  component: function PlatformResourcePoolOverviewRoute() {
    const [regions, setRegions] = useState(initialRegions);

    const summary = useMemo(
      () => ({
        openRegions: regions.filter((region) => region.status === "enabled" && region.openForTenant)
          .length,
        gpuFree: regions.reduce((total, region) => total + region.capacity.gpuFree, 0),
        tenantsTotal: regions.reduce((total, region) => total + region.tenantCount, 0),
      }),
      [regions],
    );

    const updateRegion = (
      regionId: string,
      updater: (region: PlatformRegion) => PlatformRegion,
    ) => {
      setRegions((current) =>
        current.map((region) => (region.id === regionId ? updater(region) : region)),
      );
    };

    const refreshRegion = (region: PlatformRegion) => {
      updateRegion(region.id, (current) => ({
        ...current,
        updatedAt: formatCurrentDateTime(),
      }));
      showMessage({ type: "success", content: `${region.name}容量已刷新` });
    };

    const confirmTenantAccess = (region: PlatformRegion, open: boolean) => {
      if (open && region.status !== "enabled") {
        showMessage({ type: "warning", content: "仅已启用区域可开放租户开通" });
        return;
      }
      Modal.confirm({
        title: `${open ? "开放" : "关闭"}${region.name}的租户开通？`,
        content: open
          ? "开放后，新租户开通向导可以选择该区域。"
          : "关闭后不会影响存量租户，但新租户无法选择该区域。",
        okText: "确认",
        cancelText: "取消",
        onOk: () => {
          updateRegion(region.id, (current) => ({
            ...current,
            openForTenant: open,
            updatedAt: formatCurrentDateTime(),
          }));
          showMessage({
            type: "success",
            content: open ? "已开放租户开通" : "已关闭租户开通",
          });
        },
      });
    };

    const confirmStatusChange = (region: PlatformRegion) => {
      const enable = region.status !== "enabled";
      Modal.confirm({
        title: `${enable ? "启用" : "停用"}区域“${region.name}”？`,
        content: enable
          ? "启用后可以继续维护容量，并可单独开放租户开通。"
          : region.tenantCount > 0
            ? `该区域仍归属 ${region.tenantCount} 个租户。停用不会迁移存量租户，但会同步关闭新租户开通。`
            : "停用后将同步关闭新租户开通。",
        okText: enable ? "确认启用" : "确认停用",
        cancelText: "取消",
        okButtonProps: enable ? undefined : { status: "danger" },
        onOk: () => {
          updateRegion(region.id, (current) => ({
            ...current,
            status: enable ? "enabled" : "disabled",
            openForTenant: enable ? current.openForTenant : false,
            updatedAt: formatCurrentDateTime(),
          }));
          showMessage({ type: "success", content: enable ? "区域已启用" : "区域已停用" });
        },
      });
    };

    const refreshAll = () => {
      const updatedAt = formatCurrentDateTime();
      setRegions((current) => current.map((region) => ({ ...region, updatedAt })));
      showMessage({ type: "success", content: "全部区域容量已刷新" });
    };

    const columns: ListColumn<PlatformRegion>[] = [
      {
        title: "区域 / 编码",
        dataIndex: "name",
        width: 180,
        render: (_, region) => <DataTableNameCell name={region.name} id={region.code} />,
      },
      {
        title: "状态",
        dataIndex: "status",
        width: 100,
        render: (status: RegionStatus) => (
          <span
            className={clsx(
              "inline-flex rounded px-2 py-0.5 text-xs",
              statusMeta[status].className,
            )}
          >
            {statusMeta[status].label}
          </span>
        ),
      },
      {
        title: "租户开通",
        dataIndex: "openForTenant",
        width: 130,
        render: (_, region) => (
          <Switch
            checked={region.openForTenant}
            disabled={region.status !== "enabled"}
            checkedText="开放"
            uncheckedText="关闭"
            onChange={(open) => confirmTenantAccess(region, open)}
          />
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
        width: 160,
        render: (value: string) => formatDateTimeMinute(value),
      },
    ];

    return (
      <ResourcePageFrame
        header={{
          title: "平台资源池总览",
          subtitle: "维护区域主数据与平台容量，控制租户开通时可选择的区域。",
          extra: (
            <Button type="primary" icon={<IconRefresh />} onClick={refreshAll}>
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

        <TableSectionFrame
          header={
            <div className="flex items-center justify-between px-5 pt-5">
              <div>
                <div className="text-base font-semibold text-gray-900">区域与容量</div>
                <div className="mt-1 text-xs text-gray-500">
                  容量刷新会同步区域租户数与 GPU 可用量。
                </div>
              </div>
              <span className="text-xs text-gray-500">共 {regions.length} 个区域</span>
            </div>
          }
        >
          <ListDataTable
            rowKey="id"
            columns={columns}
            rowActions={[
              {
                key: "refresh",
                label: "刷新容量",
                onClick: refreshRegion,
              },
              {
                key: "status",
                label: (region) => (region.status === "enabled" ? "停用" : "启用"),
                widthLabel: "停用",
                onClick: confirmStatusChange,
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
