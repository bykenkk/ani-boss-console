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
          const label =
            check.key === "connection" && confirmed
              ? "集群连接正常"
              : check.key === "provider_configs" && confirmed
                ? "供给配置已就绪"
                : check.key === "provider_configs" && missingConfig
                  ? "供给配置待补齐"
                  : unverifiedInventory
                    ? "设备观测未核验"
                    : `${checkLabels[check.key ?? ""] ?? check.key}${check.reason ? formatGpuInitializationReason(check.reason) : confirmed ? "已确认" : "待确认"}`;
          const descriptions: Record<string, string> = {
            connection: confirmed
              ? "当前集群的受管连接检查已通过。"
              : "集群连接检查尚未通过，请核对集群登记和连接配置。",
            provider_configs: confirmed
              ? "受管供给配置检查已通过，可按节点共同支持的配置继续组织资源。"
              : missingConfig
                ? "尚未登记可用的供给配置。请先准备供给配置，交由运维应用后刷新节点复检。"
                : "供给配置检查尚未通过，请核对受管配置后刷新节点。",
            inventory: unverifiedInventory
              ? "供给配置尚未登记，设备观测结果暂不能确认。请先补齐并应用供给配置，再刷新节点复检。"
              : confirmed
                ? "设备观测检查已通过，型号和显存仍以节点返回的数据为准。容量未知不影响目录初始化。"
                : "设备观测信息尚未就绪，请核对供给配置和设备观测服务后刷新节点。",
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
                          : "该项检查尚未通过，请核对配置后刷新节点。")}
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
      {missingConfig ? (
        <Alert
          type="warning"
          title="供给配置尚未准备完成"
          content={
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span className="min-w-0 flex-1">
                准备真实供给参数与配置交接单，由运维应用后返回复检。固定片需核实真实显存与 CU。
              </span>
              <Button
                type="text"
                size="small"
                className="shrink-0 bg-transparent! px-0! hover:underline"
                onClick={onPrepareSupply}
                disabled={prepareDisabled}
              >
                <span className="inline-flex items-center gap-1.5">
                  准备供给配置
                  <IconArrowRight />
                </span>
              </Button>
            </div>
          }
        />
      ) : null}
    </div>
  );
}
