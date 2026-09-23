import { Progress, Select, Space } from "@arco-design/web-react";
import clsx from "clsx";
import { useMemo, useState } from "react";
import {
  DataTableNameCell,
  ListDataTable,
  ResourcePageFrame,
  TableSectionFrame,
  type ListColumn,
} from "@/components/common";
import { Metric } from "@/components/overview/Metric";
import { formatDateTimeMinute } from "@/lib/date";

type ComponentStatus = "healthy" | "degraded";

interface NetworkEvent {
  type: "Normal" | "Warning";
  message: string;
  at: string;
}

interface NetworkComponent {
  id: string;
  name: string;
  type: string;
  status: ComponentStatus;
  version: string;
  region: string;
  cluster: string;
  heartbeat: string;
  replicas: string;
  note: string;
  events: NetworkEvent[];
}

interface IpPool {
  id: string;
  name: string;
  cidr: string;
  used: number;
  total: number;
  region: string;
}

const networkComponents: NetworkComponent[] = [
  {
    id: "net-ovn",
    name: "kube-ovn-controller",
    type: "SDN 控制器",
    status: "healthy",
    version: "v1.12.4",
    region: "cn-east-1",
    cluster: "ani-prod",
    heartbeat: "2026-07-28 13:40",
    replicas: "3/3",
    note: "支撑 Console VPC / 子网",
    events: [{ type: "Normal", message: "Leader election OK", at: "2026-07-28 10:00" }],
  },
  {
    id: "net-gw",
    name: "ani-egress-gateway",
    type: "出口网关",
    status: "healthy",
    version: "v0.9.1",
    region: "cn-east-1",
    cluster: "ani-prod",
    heartbeat: "2026-07-28 13:41",
    replicas: "2/2",
    note: "Sandbox / 容器出口策略落地",
    events: [],
  },
  {
    id: "net-ipam",
    name: "ani-ipam",
    type: "IPAM",
    status: "degraded",
    version: "v0.4.0",
    region: "cn-east-1",
    cluster: "ani-prod",
    heartbeat: "2026-07-28 13:38",
    replicas: "2/2",
    note: "IP 池将满 · 新建 VPC 可能失败",
    events: [
      {
        type: "Warning",
        message: "Pool vpc-pod nearing capacity (>80%)",
        at: "2026-07-28 12:50",
      },
    ],
  },
  {
    id: "net-ovn-north",
    name: "kube-ovn-northd",
    type: "SDN 组件",
    status: "healthy",
    version: "v1.12.4",
    region: "cn-north-1",
    cluster: "ani-north",
    heartbeat: "2026-07-28 13:40",
    replicas: "2/2",
    note: "-",
    events: [],
  },
];

const ipPools: IpPool[] = [
  {
    id: "pool-pod",
    name: "vpc-pod",
    cidr: "10.16.0.0/16",
    used: 42000,
    total: 65534,
    region: "cn-east-1",
  },
  {
    id: "pool-svc",
    name: "cluster-svc",
    cidr: "10.96.0.0/16",
    used: 1200,
    total: 65534,
    region: "cn-east-1",
  },
];

function usagePercent(pool: IpPool) {
  return Math.round((pool.used / Math.max(1, pool.total)) * 100);
}

function StatusBadge({ status }: { status: ComponentStatus }) {
  return (
    <span
      className={clsx(
        "inline-flex rounded px-2 py-0.5 text-xs font-medium",
        status === "healthy" ? "bg-green-50 text-green-700" : "bg-orange-50 text-orange-700",
      )}
    >
      {status === "healthy" ? "健康" : "降级"}
    </span>
  );
}

export function NetworkInfrastructurePage() {
  const [region, setRegion] = useState("all");
  const [status, setStatus] = useState("all");
  const [keyword, setKeyword] = useState("");

  const filteredComponents = useMemo(() => {
    const query = keyword.trim().toLowerCase();
    return networkComponents.filter((component) => {
      const matchesKeyword =
        !query ||
        `${component.name} ${component.type} ${component.cluster}`.toLowerCase().includes(query);
      return (
        (region === "all" || component.region === region) &&
        (status === "all" || component.status === status) &&
        matchesKeyword
      );
    });
  }, [keyword, region, status]);

  const worstPool = [...ipPools].sort((left, right) => usagePercent(right) - usagePercent(left))[0];
  const controller = networkComponents.find((item) => item.type.includes("控制器"));
  const gateway = networkComponents.find((item) => item.type.includes("网关"));

  const componentColumns: ListColumn<NetworkComponent>[] = [
    {
      title: "组件",
      dataIndex: "name",
      width: 220,
      fixed: "left",
      render: (_, component) => <DataTableNameCell name={component.name} id={component.type} />,
    },
    {
      title: "状态",
      dataIndex: "status",
      width: 90,
      render: (value) => <StatusBadge status={value as ComponentStatus} />,
    },
    { title: "区域", dataIndex: "region", width: 120 },
    { title: "集群", dataIndex: "cluster", width: 120 },
    { title: "版本", dataIndex: "version", width: 110 },
    { title: "副本", dataIndex: "replicas", width: 80 },
    {
      title: "说明",
      dataIndex: "note",
      width: 230,
      render: (value) => <span className="text-gray-600">{String(value)}</span>,
    },
    {
      title: "最后心跳",
      dataIndex: "heartbeat",
      width: 165,
      render: (value: string) => formatDateTimeMinute(value),
    },
    {
      title: "最近事件",
      width: 280,
      render: (_, component) => {
        const event = component.events[0];
        return event ? (
          <div className="text-xs leading-5">
            <div
              className={clsx(
                "font-medium",
                event.type === "Warning" ? "text-orange-700" : "text-gray-700",
              )}
            >
              {event.message}
            </div>
            <div className="text-gray-400">{formatDateTimeMinute(event.at)}</div>
          </div>
        ) : (
          <span className="text-gray-400">-</span>
        );
      },
    },
  ];

  const poolColumns: ListColumn<IpPool>[] = [
    {
      title: "地址池",
      dataIndex: "name",
      width: 190,
      render: (_, pool) => <DataTableNameCell name={pool.name} id={pool.id} />,
    },
    { title: "CIDR", dataIndex: "cidr", width: 160 },
    { title: "区域", dataIndex: "region", width: 130 },
    {
      title: "已使用 / 总量",
      width: 190,
      render: (_, pool) => (
        <span>
          {pool.used.toLocaleString()} / {pool.total.toLocaleString()}
        </span>
      ),
    },
    {
      title: "占用率",
      width: 260,
      render: (_, pool) => {
        const percent = usagePercent(pool);
        return (
          <div className="flex items-center gap-3">
            <Progress
              percent={percent}
              showText={false}
              status={percent >= 80 ? "warning" : "normal"}
              className="min-w-36 flex-1"
            />
            <span className="w-10 text-right text-xs text-gray-600">{percent}%</span>
          </div>
        );
      },
    },
    {
      title: "水位",
      width: 90,
      render: (_, pool) => {
        const percent = usagePercent(pool);
        return (
          <span className={percent >= 80 ? "text-orange-700" : "text-green-700"}>
            {percent >= 80 ? "关注" : "正常"}
          </span>
        );
      },
    },
  ];

  return (
    <ResourcePageFrame
      header={{
        title: "网络基础设施",
        subtitle: "查看平台 SDN、出口网关、IPAM 与地址池的运行状态。",
      }}
    >
      <section className="grid grid-cols-3 gap-3.5 max-[980px]:grid-cols-1">
        <Metric
          label="SDN 控制器"
          value={controller?.status === "healthy" ? "健康" : "降级"}
          hint={controller?.name ?? "-"}
        />
        <Metric
          label="出口网关"
          value={gateway?.status === "healthy" ? "健康" : "降级"}
          hint={gateway?.name ?? "-"}
        />
        <Metric
          label="最高 IP 池占用"
          value={`${usagePercent(worstPool)}%`}
          hint={worstPool.name}
        />
      </section>

      <TableSectionFrame
        header={
          <div className="flex items-center justify-between px-5 pt-5">
            <div>
              <div className="text-base font-semibold text-gray-900">网络组件</div>
              <div className="mt-1 text-xs text-gray-500">
                当前为前端展示数据，尚未接入 ANI 网络基础设施接口。
              </div>
            </div>
            <span className="text-xs text-gray-500">
              显示 {filteredComponents.length} / {networkComponents.length} 个组件
            </span>
          </div>
        }
        toolbar={{
          search: {
            fields: [{ value: "keyword", label: "关键词" }],
            field: "keyword",
            value: keyword,
            placeholder: "搜索组件、类型或集群",
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
                  { label: "cn-east-1", value: "cn-east-1" },
                  { label: "cn-north-1", value: "cn-north-1" },
                ]}
              />
              <Select
                value={status}
                onChange={setStatus}
                options={[
                  { label: "全部状态", value: "all" },
                  { label: "健康", value: "healthy" },
                  { label: "降级", value: "degraded" },
                ]}
              />
            </Space>
          ),
        }}
      >
        <ListDataTable
          rowKey="id"
          columns={componentColumns}
          data={filteredComponents}
          pagination={false}
          scroll={{ x: 1395 }}
          emptyText="没有符合筛选条件的网络组件"
        />
      </TableSectionFrame>

      <TableSectionFrame
        header={
          <div className="px-5 pt-5">
            <div className="text-base font-semibold text-gray-900">IP 地址池</div>
            <div className="mt-1 text-xs text-gray-500">
              展示地址使用量与水位，便于提前识别容量风险。
            </div>
          </div>
        }
      >
        <ListDataTable
          rowKey="id"
          columns={poolColumns}
          data={ipPools}
          pagination={false}
          emptyText="暂无 IP 地址池"
        />
      </TableSectionFrame>
    </ResourcePageFrame>
  );
}
