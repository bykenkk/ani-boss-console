import { Alert, Button, Tooltip } from "@arco-design/web-react";
import {
  IconArrowRight,
  IconCheckCircle,
  IconExclamationCircle,
} from "@arco-design/web-react/icon";
import type { GpuInitializationCheck } from "@/api/accelerator";
import { StatusBadge } from "@/components/common";
import { formatGpuInitializationReason } from "../presentation";
import styles from "../../initialization.module.less";

const checkLabels: Record<string, string> = {
  connection: "集群连接",
  provider_configs: "受管供给配置",
  inventory: "设备观测",
};

interface GpuInitializationEnvironmentProps {
  checks: GpuInitializationCheck[];
  onPrepareSupply: () => void;
  prepareDisabled: boolean;
}

export function GpuInitializationEnvironment({
  checks,
  onPrepareSupply,
  prepareDisabled,
}: GpuInitializationEnvironmentProps) {
  const missingConfig = checks.some((check) => check.reason === "PROVIDER_CONFIG_REQUIRED");
  return (
    <div className="flex flex-col gap-3">
      <div className={styles.environmentChecks}>
        {checks.map((check, index) => {
          // 未登记 adapter 时后端可能跳过 inventory 却返回 PASS，不能据此宣称设备已核验。
          const unverifiedInventory = missingConfig && check.key === "inventory";
          const confirmed = check.state === "PASS" && !unverifiedInventory;
          const warning = !unverifiedInventory && Boolean(check.reason);
          const key = check.key ?? "";
          const nodeName = key.slice(key.lastIndexOf(":") + 1);
          const checkName = key.startsWith("registered_mode:")
            ? `${nodeName} 供给模式`
            : key.startsWith("nvidia_units:")
              ? `${nodeName} 插件计量单位`
              : (checkLabels[key] ?? "供给检查");
          const label =
            check.key === "connection" && confirmed
              ? "集群连接正常"
              : check.key === "provider_configs" && confirmed
                ? "供给配置已就绪"
                : check.key === "provider_configs" && missingConfig
                  ? "尚未登记可用供给"
                  : unverifiedInventory
                    ? "设备观测未核验"
                    : `${checkName}${check.reason ? `：${formatGpuInitializationReason(check.reason)}` : confirmed ? "已确认" : "待确认"}`;
          const descriptions: Record<string, string> = {
            connection: confirmed
              ? "当前集群的受管连接检查已通过。"
              : "集群连接检查尚未通过，请核对集群登记和连接配置。",
            provider_configs: confirmed
              ? "受管供给配置检查已通过，可按节点共同支持的配置继续组织资源。"
              : missingConfig
                ? "先查询后端收集的供给信息，确认并登记可用供给，返回后手动刷新状态。"
                : "供给配置检查尚未通过，请查询登记信息后刷新状态。",
            inventory: unverifiedInventory
              ? "当前初始化状态尚不能确认设备观测。请打开查询登记查看实际供给信息，登记后刷新状态。"
              : confirmed
                ? "设备观测检查已通过，型号和显存仍以节点返回的数据为准。容量未知不影响目录初始化。"
                : "设备观测信息尚未就绪，请核对供给登记和设备观测服务后刷新状态。",
          };
          return (
            <div key={`${check.key}-${index}`}>
              <Tooltip
                content={
                  <div className="max-w-64 text-xs leading-5">
                    <div className="font-medium">{label}</div>
                    <p className="mt-1">
                      {descriptions[check.key ?? ""] ??
                        (confirmed
                          ? "该项检查已通过。"
                          : "该项检查尚未通过，请核对供给信息后刷新状态。")}
                    </p>
                  </div>
                }
                trigger={["hover", "focus"]}
              >
                <span className={styles.environmentCheck} tabIndex={0}>
                  {confirmed ? (
                    <IconCheckCircle className={styles.checkSuccess} />
                  ) : warning ? (
                    <IconExclamationCircle className={styles.checkWarning} />
                  ) : (
                    <span aria-hidden className={styles.checkPending} />
                  )}
                  <StatusBadge
                    className={styles.checkStatus}
                    value={label}
                    tone={confirmed ? "success" : warning ? "warning" : "default"}
                  />
                </span>
              </Tooltip>
            </div>
          );
        })}
      </div>
      <Alert
        type={missingConfig ? "warning" : "info"}
        title={missingConfig ? "尚未登记可用供给" : "查询登记供给"}
        content={
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="min-w-0 flex-1">
              {missingConfig
                ? "查询后端收集的供给信息，确认后登记。完成后返回点击“刷新状态”，再选择节点继续初始化。"
                : "可查询实际供给信息并追加登记，完成后返回手动刷新状态。"}
            </span>
            <Button
              type="text"
              size="small"
              className="shrink-0 bg-transparent! px-0! hover:underline"
              aria-disabled={prepareDisabled}
              onClick={() => {
                if (!prepareDisabled) onPrepareSupply();
              }}
            >
              <span className="inline-flex items-center gap-1.5">
                查询登记
                <IconArrowRight />
              </span>
            </Button>
          </div>
        }
      />
    </div>
  );
}
