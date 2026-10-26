import type { RowAction } from "@/components/common";

export const networkDemoNotice = "演示模式，仅供预览，暂不支持提交。";
export const networkWriteUnavailable = "演示模式，暂不支持提交";

export const networkDemoRowActions: RowAction<unknown>[] = [
  {
    key: "edit",
    label: "修改",
    disabled: () => true,
    tooltip: "演示模式，暂不支持修改",
    onClick: () => undefined,
  },
  {
    key: "delete",
    label: "删除",
    intent: "danger",
    disabled: () => true,
    tooltip: "演示模式，暂不支持删除",
    onClick: () => undefined,
  },
];
