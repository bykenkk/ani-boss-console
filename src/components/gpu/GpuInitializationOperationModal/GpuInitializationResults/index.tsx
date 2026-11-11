import { Descriptions } from "@arco-design/web-react";
import type { GpuInitializationOperation } from "@/api/accelerator";
import { DataTable, StatusBadge, type ListColumn } from "@/components/common";

interface GpuInitializationResultsProps {
  operation: GpuInitializationOperation;
}

type GroupResult = NonNullable<GpuInitializationOperation["groups"]>[number];
const groupColumns: ListColumn<GroupResult>[] = [
  { title: "供给组 ID", dataIndex: "group_id", width: 220, ellipsis: true },
  { title: "记录版本", dataIndex: "recorded_group_version", width: 120, ellipsis: true },
  { title: "自动接单结果", dataIndex: "auto_open_result", width: 200, ellipsis: true },
  {
    title: "接单状态",
    width: 120,
    render: (_, row) => (
      <StatusBadge
        value={
          row.admission === "ADMISSION_OPEN"
            ? "已开启"
            : row.admission === "ADMISSION_CLOSED"
              ? "已关闭"
              : row.admission
        }
        tone={row.admission === "ADMISSION_OPEN" ? "success" : "default"}
      />
    ),
  },
];

export function GpuInitializationResults({ operation }: GpuInitializationResultsProps) {
  return (
    <div className="flex min-w-0 flex-col gap-4">
      <Descriptions
        column={1}
        data={[
          {
            label: "资源池 ID",
            value: (
              <span className="break-all">
                {operation.pools?.map((pool) => pool.pool_id).join("、") || "-"}
              </span>
            ),
          },
          {
            label: "规格 ID / 记录修订",
            value: (
              <span className="break-all">
                {operation.profiles
                  ?.map(
                    (profile) =>
                      `${profile.profile_id ?? "-"} / ${profile.recorded_revision ?? "-"} / ${profile.recorded_state ?? "-"}`,
                  )
                  .join("；") || "-"}
              </span>
            ),
          },
        ]}
      />
      {operation.groups?.length ? (
        <div className="p-4">
          <DataTable
            header={{ title: "供给组初始化结果" }}
            rowKey={(row) => row.client_key ?? row.group_id ?? ""}
            data={operation.groups}
            columns={groupColumns}
            pagination={false}
            tableLabel="供给组初始化结果"
          />
        </div>
      ) : null}
    </div>
  );
}
