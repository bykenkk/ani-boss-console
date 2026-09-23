import { Progress } from "@arco-design/web-react";
import {
  ResourceNameId,
  ListDataTable,
  TableSectionFrame,
  type ListColumn,
} from "@/components/common";

interface TenantHotItem {
  id: string;
  name: string;
  hot: number;
  blockUsedGi: number;
  objectUsedGi: number;
  iopsUsed: number;
  bandwidthMbpsUsed: number;
}

const tenantTopN: TenantHotItem[] = [
  {
    id: "acme-ai",
    name: "Acme AI",
    hot: 91,
    blockUsedGi: 1800,
    objectUsedGi: 900,
    iopsUsed: 36000,
    bandwidthMbpsUsed: 820,
  },
  {
    id: "trial-lab",
    name: "试用实验室",
    hot: 40,
    blockUsedGi: 40,
    objectUsedGi: 12,
    iopsUsed: 800,
    bandwidthMbpsUsed: 20,
  },
  {
    id: "demo-corp",
    name: "演示租户 demo-corp",
    hot: 30,
    blockUsedGi: 380,
    objectUsedGi: 220,
    iopsUsed: 12000,
    bandwidthMbpsUsed: 180,
  },
];

const columns: ListColumn<TenantHotItem>[] = [
  {
    title: "排名",
    width: 70,
    render: (_, __, index) => <span className="font-semibold text-gray-700">#{index + 1}</span>,
  },
  {
    title: "租户 / ID",
    dataIndex: "name",
    width: 220,
    render: (_, item) => <ResourceNameId name={item.name} id={item.id} />,
  },
  {
    title: "最高水位",
    dataIndex: "hot",
    width: 210,
    render: (value: number) => (
      <div className="min-w-40">
        <div className="mb-1 text-xs text-gray-700">{value}%</div>
        <Progress percent={value} showText={false} status={value >= 90 ? "warning" : "normal"} />
      </div>
    ),
  },
  {
    title: "块存储已用",
    dataIndex: "blockUsedGi",
    width: 130,
    render: (value: number) => `${value.toLocaleString()} Gi`,
  },
  {
    title: "对象存储已用",
    dataIndex: "objectUsedGi",
    width: 140,
    render: (value: number) => `${value.toLocaleString()} Gi`,
  },
  {
    title: "IOPS 已用",
    dataIndex: "iopsUsed",
    width: 120,
    render: (value: number) => value.toLocaleString(),
  },
  {
    title: "带宽已用",
    dataIndex: "bandwidthMbpsUsed",
    width: 130,
    render: (value: number) => `${value.toLocaleString()} Mbps`,
  },
];

export function TenantStorageTopN() {
  return (
    <TableSectionFrame>
      <ListDataTable
        header={{
          title: "租户热度 TopN",
          description: "按租户所有存储与性能配额维度中的最高水位排序。",
          extra: <span className="text-xs text-gray-500">Top {tenantTopN.length}</span>,
        }}
        rowKey="id"
        columns={columns}
        data={tenantTopN}
        pagination={false}
        scroll={{ x: 1020 }}
        emptyText="暂无租户热度数据"
      />
    </TableSectionFrame>
  );
}
