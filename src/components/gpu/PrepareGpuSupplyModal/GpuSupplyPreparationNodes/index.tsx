import type { GpuDiscoveredNode } from "@/api/accelerator";
import { DataTable, type ListColumn } from "@/components/common";
import { gpuSupplyNodeCanPrepare } from "../preparation";

interface GpuSupplyPreparationNodesProps {
  nodes: GpuDiscoveredNode[];
  fixed: boolean;
  value?: string[];
  onChange?: (value: string[]) => void;
}

const columns: ListColumn<GpuDiscoveredNode>[] = [
  { title: "节点", dataIndex: "node.name", width: 200, ellipsis: true, fixed: "left" },
  { title: "节点 UID", dataIndex: "node.uid", width: 240, ellipsis: true },
  {
    title: "Resource Key",
    width: 240,
    ellipsis: true,
    render: (_, row) =>
      [...new Set(row.devices?.map((device) => device.resource_key).filter(Boolean))].join("、") ||
      "待核实",
  },
  {
    title: "设备型号",
    width: 200,
    ellipsis: true,
    render: (_, row) =>
      [...new Set(row.devices?.map((device) => device.model_key).filter(Boolean))].join("、") ||
      "待核实",
  },
];

export function GpuSupplyPreparationNodes({
  nodes,
  fixed,
  value = [],
  onChange,
}: GpuSupplyPreparationNodesProps) {
  return (
    <div>
      <DataTable
        header={{
          title: "目标节点",
          extra: (
            <span className="text-xs text-(--color-text-3)">
              已选 {value.length} / {nodes.length} 个节点
            </span>
          ),
        }}
        data={nodes}
        columns={columns}
        rowKey={(row) => row.node?.uid ?? ""}
        tableLabel="供给准备节点"
        pagination={false}
        rowSelection={{
          type: "checkbox",
          fixed: true,
          selectedRowKeys: value,
          checkboxProps: (row) => ({ disabled: !gpuSupplyNodeCanPrepare(row, fixed) }),
          onChange: (keys) =>
            onChange?.(
              keys
                .map(String)
                .filter((uid) =>
                  nodes.some(
                    (node) => node.node?.uid === uid && gpuSupplyNodeCanPrepare(node, fixed),
                  ),
                ),
            ),
        }}
      />
      <p className="mt-3 mb-0 text-xs text-(--color-text-3)">
        已有归属或设备类型不匹配的节点不可选；未观测到的资源信息需由运维核实。
      </p>
    </div>
  );
}
