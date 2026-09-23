import { Empty } from "@arco-design/web-react";
import {
  IconApps,
  IconDown,
  IconSettings,
  IconStorage,
  IconThunderbolt,
  IconUserGroup,
} from "@arco-design/web-react/icon";
import clsx from "clsx";
import type { CSSProperties, ReactNode } from "react";
import type { PlatformCapacityRegion } from "@/api/platform";
import styles from "./index.module.less";

interface PlatformCapacitySummaryProps {
  region?: PlatformCapacityRegion;
  loading: boolean;
}

interface CapacityMetricProps {
  label: string;
  value: string;
  unit?: string;
  hint: string;
  icon: ReactNode;
  tone: "cpu" | "memory" | "nodes" | "tenants";
}

function formatValue(value: number | undefined) {
  return value === undefined ? "-" : value.toLocaleString("zh-CN");
}

function regionTitle(region?: PlatformCapacityRegion) {
  if (!region) return "默认区域";
  return region.displayName || region.name || region.code;
}

function CapacityMetric({ label, value, unit, hint, icon, tone }: CapacityMetricProps) {
  return (
    <div className={clsx(styles.metric, styles[tone])}>
      <span className={styles.metricIcon} aria-hidden="true">
        {icon}
      </span>
      <div className={styles.metricContent}>
        <span className={styles.metricLabel}>{label}</span>
        <div className={styles.metricValueRow}>
          <strong className={styles.metricValue}>{value}</strong>
          {unit ? <span className={styles.metricUnit}>{unit}</span> : null}
        </div>
        <span className={styles.metricHint}>{hint}</span>
      </div>
    </div>
  );
}

export function PlatformCapacitySummary({ region, loading }: PlatformCapacitySummaryProps) {
  const gpuTotal = region?.capacity.gpuTotal ?? 0;
  const gpuFree = region?.capacity.gpuFree ?? 0;
  const gpuProgress = gpuTotal > 0 ? (gpuFree / gpuTotal) * 100 : 0;
  const progressStyle = {
    "--gpu-progress": `${gpuProgress > 0 ? Math.max(gpuProgress, 3) : 3}%`,
  } as CSSProperties;

  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <span className={styles.title}>区域</span>
        <span className={styles.regionName} aria-label={`当前区域：${regionTitle(region)}`}>
          <span>{regionTitle(region)}</span>
          <IconDown aria-hidden="true" />
        </span>
      </div>
      <div className={styles.body}>
        {loading ? (
          <div className={styles.state}>正在加载平台容量…</div>
        ) : !region ? (
          <div className={styles.state}>
            <Empty description="暂无平台容量数据" />
          </div>
        ) : (
          <div className={styles.capacityGrid}>
            <section className={styles.gpuMetric} aria-label="GPU 容量">
              <div className={styles.gpuSummary}>
                <span className={styles.gpuIcon} aria-hidden="true">
                  <IconThunderbolt />
                </span>
                <div className={styles.gpuContent}>
                  <span className={styles.gpuLabel}>GPU 空闲 / 总量</span>
                  <div className={styles.gpuValueRow}>
                    <strong>{formatValue(gpuFree)}</strong>
                    <span>/ {formatValue(gpuTotal)} 卡</span>
                  </div>
                </div>
              </div>
              <div
                className={styles.gpuProgress}
                style={progressStyle}
                role="progressbar"
                aria-label="GPU 空闲比例"
                aria-valuemin={0}
                aria-valuemax={Math.max(gpuTotal, 1)}
                aria-valuenow={gpuFree}
              >
                <span />
              </div>
              <span className={styles.gpuHint}>
                当前空闲 {formatValue(gpuFree)} 卡，
                {gpuFree > 0 ? "可供租户分配" : "全部已被租户占用"}
              </span>
            </section>

            <CapacityMetric
              label="CPU 总量"
              value={formatValue(region.capacity.cpuCores)}
              unit="核"
              hint="allocatable"
              icon={<IconSettings />}
              tone="cpu"
            />
            <CapacityMetric
              label="内存总量"
              value={formatValue(region.capacity.memoryGiB)}
              unit="GiB"
              hint="allocatable"
              icon={<IconStorage />}
              tone="memory"
            />
            <CapacityMetric
              label="节点 / 可用区"
              value={formatValue(region.capacity.nodes)}
              unit="节点"
              hint={`AZ ${region.azs.join("、") || "未划分"}`}
              icon={<IconApps />}
              tone="nodes"
            />
            <CapacityMetric
              label="租户数"
              value={formatValue(region.tenantCount)}
              hint="已接入租户"
              icon={<IconUserGroup />}
              tone="tenants"
            />
          </div>
        )}
      </div>
    </div>
  );
}
