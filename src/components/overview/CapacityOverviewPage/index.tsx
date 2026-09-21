import { Alert, Button, Empty, Progress, Space } from "@arco-design/web-react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import {
  fetchPlatformCapacity,
  platformQueryKeys,
  type PlatformCapacityRegion,
} from "@/api/platform";
import { Metric } from "../Metric";
import { OverviewPageHeader } from "../OverviewPageHeader";
import { Panel } from "../Panel";
import { SoftList } from "../SoftList";
import { SoftRow } from "../SoftList/SoftRow";

function formatValue(value: number | undefined) {
  return value === undefined ? "-" : value.toLocaleString("zh-CN");
}

function regionTitle(region: PlatformCapacityRegion) {
  return `${region.displayName || region.name || region.code}  ${region.code}`;
}

function regionStatus(region: PlatformCapacityRegion) {
  if (region.status !== "enabled") return "未启用";
  return region.openForTenant ? "可开通" : "未开放租户";
}

function regionUsagePercent(region: PlatformCapacityRegion) {
  const { gpuTotal, gpuFree } = region.capacity;
  if (gpuTotal <= 0) return 0;
  return Math.round(((gpuTotal - gpuFree) / gpuTotal) * 100);
}

export function CapacityOverviewPage() {
  const navigate = useNavigate();
  const capacityQuery = useQuery({
    meta: {
      errorNotification: {
        id: "platform-capacity",
        action: "平台容量加载",
        fallback: "请求失败，请稍后重试",
      },
    },
    queryKey: platformQueryKeys.capacity,
    queryFn: fetchPlatformCapacity,
  });
  const summary = capacityQuery.data?.summary;
  const regions = capacityQuery.data?.regions || [];

  return (
    <>
      <OverviewPageHeader
        title="容量概览"
        subtitle="查看整平台 GPU、节点、CPU、内存与租户容量汇总。"
        extra={
          <Button loading={capacityQuery.isFetching} onClick={() => void capacityQuery.refetch()}>
            刷新
          </Button>
        }
      />

      {capacityQuery.data && !capacityQuery.data.profile.realProvider ? (
        <Alert
          type="warning"
          className="mb-4"
          content={`平台容量数据可能不完整。数据源：${capacityQuery.data.profile.provider || "-"}。${capacityQuery.data.profile.reason ? ` ${capacityQuery.data.profile.reason}` : ""}`}
        />
      ) : null}

      <section className="mb-4 grid grid-cols-4 gap-3.5">
        <Metric label="区域" value={formatValue(summary?.regionCount)} hint="有容量记录的区域" />
        <Metric
          label="GPU 总量"
          value={formatValue(summary?.gpuTotal)}
          hint="全部区域合计"
          onClick={() => navigate({ to: "/overview-gpu" })}
        />
        <Metric label="GPU 空闲" value={formatValue(summary?.gpuFree)} hint="当前可分配" />
        <Metric label="租户数" value={formatValue(summary?.tenantCount)} hint="状态可用的租户" />
      </section>

      {capacityQuery.isPending ? (
        <div className="rounded-lg bg-white py-20 text-center text-sm text-gray-500">
          正在加载平台容量数据…
        </div>
      ) : regions.length === 0 ? (
        <div className="rounded-lg bg-white py-16">
          <Empty description="暂无平台容量数据" />
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-3.5 max-[1320px]:grid-cols-1">
          {regions.map((region) => (
            <Panel key={region.id} title={regionTitle(region)} action={regionStatus(region)}>
              <div className="px-5 pt-4">
                <Progress percent={regionUsagePercent(region)} showText={false} />
              </div>
              <SoftList>
                <SoftRow
                  title="GPU 空闲 / 总量"
                  meta={`${region.capacity.gpuFree} / ${region.capacity.gpuTotal}`}
                />
                <SoftRow
                  title="节点 / AZ"
                  meta={`${region.capacity.nodes} · ${region.azs.join(", ") || "-"}`}
                />
                <SoftRow
                  title="CPU 总量（allocatable）"
                  meta={`${formatValue(region.capacity.cpuCores)} 核`}
                />
                <SoftRow
                  title="内存总量（allocatable）"
                  meta={`${formatValue(region.capacity.memoryGiB)} GiB`}
                />
                <SoftRow title="租户数" meta={formatValue(region.tenantCount)} />
              </SoftList>
              <Space className="flex justify-end border-t border-gray-100 px-4 py-2">
                <Button type="text" onClick={() => navigate({ to: "/tenants" })}>
                  查看租户
                </Button>
                <Button type="text" onClick={() => navigate({ to: "/ops-pool" })}>
                  资源池运维
                </Button>
              </Space>
            </Panel>
          ))}
        </div>
      )}
    </>
  );
}
