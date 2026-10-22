import { Select } from "@arco-design/web-react";
import type { PlanModuleCode } from "@/api/plans";

const planModuleOptions: Array<{ value: PlanModuleCode; label: string }> = [
  { value: "DASHBOARD", label: "仪表盘" },
  { value: "OPM", label: "组织人员管理" },
  { value: "SYSTEM", label: "系统管理" },
  { value: "DICT", label: "数据字典" },
  { value: "TENANT", label: "租户管理" },
  { value: "PERMISSION", label: "权限管理" },
  { value: "LOG", label: "日志审计" },
  { value: "INTERNAL_MESSAGE", label: "内部消息" },
  { value: "TASK", label: "任务管理" },
  { value: "MODEL", label: "模型目录" },
  { value: "NETWORK", label: "网络资源" },
  { value: "ACCELERATOR", label: "GPU 资源" },
  { value: "IMAGE", label: "容器镜像" },
  { value: "INFERENCE", label: "推理服务" },
  { value: "INSTANCE", label: "GPU 容器实例" },
];

interface PlanModuleSelectProps {
  value?: PlanModuleCode[];
  onChange?: (value: PlanModuleCode[] | undefined) => void;
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
