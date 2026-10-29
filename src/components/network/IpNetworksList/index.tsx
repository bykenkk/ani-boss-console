import { Button, Input, Space } from "@arco-design/web-react";
import { useState, type ReactNode } from "react";
import { ListDataTable, ListPageFrame, StatusBadge, type ListColumn } from "@/components/common";
import { demoLayer2Networks } from "@/components/layer2-network/demo-data";
import { networkDemoRowActions } from "../constants";
import type { NetworkKind, NetworkRecord } from "../model";
import { NetworkAvailability } from "../NetworkAvailability";
import { NetworkCreateModal } from "../NetworkCreateModal";

interface IpNetworksListProps {
  kind: NetworkKind;
  networks: NetworkRecord[];
  renderName?: (record: NetworkRecord) => ReactNode;
}

export function IpNetworksList({ kind, networks, renderName }: IpNetworksListProps) {
  const [keyword, setKeyword] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [creating, setCreating] = useState(false);
  const title = kind === "basic" ? "基础网络" : "公有网络";
  // 演示数据在前端筛选；接入后须改为正式接口的服务端筛选和分页。
  const records = networks.filter((record) =>
    record.name.toLowerCase().includes(keyword.trim().toLowerCase()),
  );
  const columns: ListColumn<NetworkRecord>[] = [
    {
      key: "name",
      title: "名称",
      dataIndex: "name",
      width: 200,
      fixed: "left",
      ellipsis: true,
      ...(renderName
        ? {
            render: (_: string, record: NetworkRecord) => renderName(record),
          }
        : {}),
    },
    {
      key: "availability",
      title: "IPv4 地址可用量",
      width: 280,
      render: (_, record) => <NetworkAvailability percent={record.availablePercent} />,
    },
    { key: "cidr", title: "IPv4 CIDR", dataIndex: "cidr", width: 180 },
    {
      key: "vlan",
      title: "VLAN",
      width: 260,
      ellipsis: true,
      render: (_, record) => (
        <Space>
          <StatusBadge
            value={record.layer2Id ? "开启" : "关闭"}
            tone={record.layer2Id ? "success" : "default"}
          />
          {record.layer2Id && (
            <span>
              {demoLayer2Networks.find((network) => network.id === record.layer2Id)?.name ?? "-"}
            </span>
          )}
        </Space>
      ),
    },
    { key: "owner", title: "所有者", dataIndex: "owner", width: 160, ellipsis: true },
  ];

  return (
    <>
      <ListPageFrame
        header={{
          title,
          subtitle:
            kind === "basic"
              ? "管理基础网络网段、IP 地址与关联资源。（演示数据）"
              : "管理公有网络网段、IP 地址与 DNS 配置。（演示数据）",
        }}
        toolbar={{
          actions: (
            <Button type="primary" onClick={() => setCreating(true)}>
              创建{title}
            </Button>
          ),
          filters: (
            <Space>
              <Input.Search
                aria-label="搜索网络名称"
                placeholder="搜索网络名称"
                allowClear
                onSearch={(value) => {
                  setKeyword(value.trim());
                  setPage(1);
                }}
                onClear={() => {
                  setKeyword("");
                  setPage(1);
                }}
              />
            </Space>
          ),
          refresh: { disabled: true, label: "演示模式，暂不可刷新", onClick: () => undefined },
        }}
      >
        <ListDataTable
          tableLabel={title}
          rowKey="id"
          columns={columns}
          data={records.slice((page - 1) * pageSize, page * pageSize)}
          rowActions={networkDemoRowActions}
          pagination={{
            page,
            pageSize,
            total: records.length,
            onPageChange: setPage,
            onPageSizeChange: (size) => {
              setPageSize(size);
              setPage(1);
            },
          }}
        />
      </ListPageFrame>
      {creating && <NetworkCreateModal kind={kind} onCancel={() => setCreating(false)} />}
    </>
  );
}
