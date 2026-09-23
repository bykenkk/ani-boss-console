import { Button, Select, Space } from "@arco-design/web-react";
import { IconRefresh } from "@arco-design/web-react/icon";
import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  ListDataTable,
  ResourceNameId,
  ResourcePageFrame,
  TableSectionFrame,
  type ListColumn,
  StatusBadge,
} from "@/components/common";
import { Metric } from "@/components/overview/Metric";
import { formatCurrentDateTime, formatDateTimeMinute } from "@/lib/date";
import { showMessage } from "@/lib/feedback";

type NodeStatus = "Ready" | "NotReady";

interface InfrastructureNode {
  id: string;
  name: string;
  region: string;
  pool: string;
  status: NodeStatus;
  gpuTotal: number;
  gpuSchedulable: number;
  cpu: string;
  memory: string;
  heartbeat: string;
  taints: string;
  labels: string;
  workloads: number;
}

const initialNodes: InfrastructureNode[] = [
  {
    id: "node-gpu-01",
    name: "gpu-worker-01",
    region: "cn-east-1",
    pool: "pool-a100",
    status: "Ready",
    gpuTotal: 8,
    gpuSchedulable: 5,
    cpu: "64C",
    memory: "512Gi",
    heartbeat: "2026-07-28 13:40",
    taints: "-",
    labels: "ani.io/role=gpu, nvidia.com/gpu.present=true",
    workloads: 3,
  },
  {
    id: "node-gpu-02",
    name: "gpu-worker-02",
    region: "cn-east-1",
    pool: "pool-a100",
    status: "Ready",
    gpuTotal: 8,
    gpuSchedulable: 8,
    cpu: "64C",
    memory: "512Gi",
    heartbeat: "2026-07-28 13:41",
    taints: "-",
    labels: "ani.io/role=gpu",
    workloads: 1,
  },
  {
    id: "node-cpu-01",
    name: "cpu-worker-01",
    region: "cn-east-1",
    pool: "pool-general",
    status: "Ready",
    gpuTotal: 0,
    gpuSchedulable: 0,
    cpu: "48C",
    memory: "256Gi",
    heartbeat: "2026-07-28 13:41",
    taints: "-",
    labels: "ani.io/role=compute",
    workloads: 12,
  },
  {
    id: "node-edge-01",
    name: "edge-node-01",
    region: "cn-north-1",
    pool: "pool-edge",
    status: "NotReady",
    gpuTotal: 2,
    gpuSchedulable: 0,
    cpu: "32C",
    memory: "128Gi",
    heartbeat: "2026-07-28 11:02",
    taints: "node.kubernetes.io/unreachable:NoSchedule",
    labels: "ani.io/role=edge",
    workloads: 0,
  },
];

export const Route = createFileRoute("/nodes/")({
  component: function NodeStatusRoute() {
    const [nodes, setNodes] = useState(initialNodes);
    const [region, setRegion] = useState("all");
    const [pool, setPool] = useState("all");
    const [status, setStatus] = useState<"all" | NodeStatus>("all");
    const [keyword, setKeyword] = useState("");

    const regions = useMemo(() => [...new Set(nodes.map((node) => node.region))], [nodes]);
    const pools = useMemo(() => [...new Set(nodes.map((node) => node.pool))], [nodes]);
    const filteredNodes = useMemo(() => {
      const query = keyword.trim().toLowerCase();
      return nodes.filter(
        (node) =>
          (region === "all" || node.region === region) &&
          (pool === "all" || node.pool === pool) &&
          (status === "all" || node.status === status) &&
          (!query ||
            [node.name, node.id, node.pool, node.region].some((value) =>
              value.toLowerCase().includes(query),
            )),
      );
    }, [keyword, nodes, pool, region, status]);

    const refreshNodes = () => {
      const heartbeat = formatCurrentDateTime();
      setNodes((current) =>
        current.map((node) => (node.status === "Ready" ? { ...node, heartbeat } : node)),
      );
      showMessage({ type: "success", content: "节点状态已刷新" });
    };

    const columns: ListColumn<InfrastructureNode>[] = [
      {
        title: "节点 / ID",
        dataIndex: "name",
        width: 190,
        fixed: "left",
        render: (_, node) => <ResourceNameId name={node.name} id={node.id} />,
      },
      {
        title: "状态",
        dataIndex: "status",
        width: 140,
        render: (value: NodeStatus) => (
          <StatusBadge value={value} tone={value === "Ready" ? "success" : "danger"} />
        ),
      },
      { title: "区域", dataIndex: "region", width: 130 },
      { title: "资源池", dataIndex: "pool", width: 140 },
      {
        title: "GPU 可调度 / 总量",
        width: 160,
        render: (_, node) => `${node.gpuSchedulable} / ${node.gpuTotal}`,
      },
      {
        title: "CPU / 内存",
        width: 140,
        render: (_, node) => `${node.cpu} / ${node.memory}`,
      },
      { title: "工作负载", dataIndex: "workloads", width: 100 },
      {
        title: "标签",
        dataIndex: "labels",
        width: 220,
        ellipsis: true,
      },
      {
        title: "污点",
        dataIndex: "taints",
        width: 260,
        ellipsis: true,
      },
      {
        title: "最后心跳",
        dataIndex: "heartbeat",
        width: 160,
        render: (value: string) => formatDateTimeMinute(value),
      },
    ];

    return (
      <ResourcePageFrame
        header={{
          title: "节点状态",
          subtitle: "查看计算节点健康状态、资源规格、调度能力和最后心跳。",
          extra: (
            <Button type="primary" icon={<IconRefresh />} onClick={refreshNodes}>
              刷新状态
            </Button>
          ),
        }}
      >
        <section className="grid grid-cols-3 gap-3.5 max-[900px]:grid-cols-1">
          <Metric label="全部" value="8" hint="当前节点总数" />
          <Metric label="Ready" value="5" hint="当前健康节点" />
          <Metric label="NotReady" value="3" hint="当前异常节点" />
        </section>

        <TableSectionFrame
          toolbar={{
            search: {
              fields: [{ value: "keyword", label: "关键词" }],
              field: "keyword",
              value: keyword,
              placeholder: "搜索节点、ID、资源池或区域",
              onFieldChange: () => undefined,
              onChange: setKeyword,
            },
            filters: (
              <Space>
                <Select
                  value={region}
                  onChange={setRegion}
                  options={[
                    { label: "全部区域", value: "all" },
                    ...regions.map((value) => ({ label: value, value })),
                  ]}
                />
                <Select
                  value={pool}
                  onChange={setPool}
                  options={[
                    { label: "全部资源池", value: "all" },
                    ...pools.map((value) => ({ label: value, value })),
                  ]}
                />
                <Select
                  value={status}
                  onChange={setStatus}
                  options={[
                    { label: "全部状态", value: "all" },
                    { label: "Ready", value: "Ready" },
                    { label: "NotReady", value: "NotReady" },
                  ]}
                />
              </Space>
            ),
          }}
        >
          <ListDataTable
            header={{
              title: "节点列表",
              description: "当前为前端演示状态，尚未接入 ANI 节点接口。",
              extra: (
                <span className="text-xs text-gray-500">
                  显示 {filteredNodes.length} / {nodes.length} 个节点
                </span>
              ),
            }}
            rowKey="id"
            columns={columns}
            data={filteredNodes}
            pagination={false}
            scroll={{ x: 1640 }}
            emptyText="没有符合筛选条件的节点"
          />
        </TableSectionFrame>
      </ResourcePageFrame>
    );
  },
});
