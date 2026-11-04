import { Select } from "@arco-design/web-react";
import { planModuleCodes, type PlanModuleCode, type PlanModuleValue } from "@/api/plans";

const planModuleLabels: Record<PlanModuleCode, string> = {
  DASHBOARD: "仪表盘",
  OPM: "组织人员管理",
  SYSTEM: "系统管理",
  DICT: "数据字典",
  TENANT: "租户管理",
  PERMISSION: "权限管理",
  LOG: "日志审计",
  INTERNAL_MESSAGE: "内部消息",
  TASK: "任务管理",
  MODEL: "模型仓库",
  MODELDEV: "模型开发",
  NETWORK: "网络资源",
  ACCELERATOR: "GPU 资源",
  IMAGE: "容器镜像",
  INFERENCE: "推理服务",
  INSTANCE: "GPU 容器实例",
  SANDBOX: "沙箱",
  VIRTUAL_MACHINE: "虚拟机",
  STORAGE: "存储",
};

const planModuleOptions = planModuleCodes.map((value) => ({
  value,
  label: planModuleLabels[value],
}));

interface PlanModuleSelectProps {
  value?: PlanModuleValue[];
  onChange?: (value: PlanModuleValue[] | undefined) => void;
  disabled?: boolean;
}

export function PlanModuleSelect({ value, onChange, disabled }: PlanModuleSelectProps) {
  return (
    <Select
      aria-label="可用模块"
      mode="multiple"
      options={planModuleOptions}
      value={value}
      onChange={onChange}
      disabled={disabled}
      placeholder="请选择可用模块"
      allowClear
    />
  );
}
