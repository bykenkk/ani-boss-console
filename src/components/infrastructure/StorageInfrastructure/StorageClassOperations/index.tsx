import {
  ListDataTable,
  ResourceNameId,
  TableSectionFrame,
  type ListColumn,
  StatusBadge,
} from "@/components/common";

interface StorageClassItem {
  id: string;
  name: string;
  type: "块" | "对象" | "文件";
  backend: string;
  media: string;
  reclaimPolicy: "Delete" | "Retain" | "-";
  isDefault: boolean;
  enabled: boolean;
  note: string;
}

const storageClasses: StorageClassItem[] = [
  {
    id: "sc-essd",
    name: "ani-block-essd",
    type: "块",
    backend: "块存储池 · Rook-Ceph",
    media: "essd",
    reclaimPolicy: "Delete",
    isDefault: true,
    enabled: true,
    note: "高性能 SSD，Console 默认",
  },
  {
    id: "sc-ssd",
    name: "ani-block-ssd",
    type: "块",
    backend: "块存储池 · Rook-Ceph",
    media: "ssd",
    reclaimPolicy: "Delete",
    isDefault: false,
    enabled: true,
    note: "通用 SSD",
  },
  {
    id: "sc-hdd",
    name: "ani-block-hdd",
    type: "块",
    backend: "块存储池 · Rook-Ceph",
    media: "hdd",
    reclaimPolicy: "Retain",
    isDefault: false,
    enabled: true,
    note: "冷数据",
  },
  {
    id: "sc-obj-std",
    name: "ani-object-standard",
    type: "对象",
    backend: "对象存储 · MinIO",
    media: "standard",
    reclaimPolicy: "-",
    isDefault: true,
    enabled: true,
    note: "标准存储类",
  },
  {
    id: "sc-nfs",
    name: "ani-nfs",
    type: "文件",
    backend: "文件存储 · NFS CSI",
    media: "nfs",
    reclaimPolicy: "Retain",
    isDefault: true,
    enabled: true,
    note: "NFS CSI",
  },
];

const columns: ListColumn<StorageClassItem>[] = [
  {
    title: "StorageClass / ID",
    dataIndex: "name",
    width: 210,
    render: (_, item) => <ResourceNameId name={item.name} id={item.id} />,
  },
  { title: "类型", dataIndex: "type", width: 80 },
  { title: "存储后端", dataIndex: "backend", width: 190 },
  { title: "介质", dataIndex: "media", width: 100 },
  { title: "回收策略", dataIndex: "reclaimPolicy", width: 110 },
  {
    title: "默认",
    dataIndex: "isDefault",
    width: 90,
    render: (value: boolean) => (value ? "是" : "否"),
  },
  {
    title: "状态",
    dataIndex: "enabled",
    width: 120,
    render: (value: boolean) => (
      <StatusBadge value={value ? "已启用" : "已停用"} tone={value ? "success" : "default"} />
    ),
  },
  { title: "说明", dataIndex: "note", width: 220, ellipsis: true },
];

export function StorageClassOperations() {
  return (
    <TableSectionFrame>
      <ListDataTable
        header={{
          title: "StorageClass 运营",
          description: "查看平台存储类与后端、介质和回收策略的映射关系。",
          extra: (
            <span className="text-xs text-gray-500">
              共 {storageClasses.length} 个 StorageClass
            </span>
          ),
        }}
        rowKey="id"
        columns={columns}
        data={storageClasses}
        pagination={false}
        scroll={{ x: 1090 }}
        emptyText="还没有 StorageClass 数据"
      />
    </TableSectionFrame>
  );
}
