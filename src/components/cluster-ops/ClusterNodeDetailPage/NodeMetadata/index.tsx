import type { ClusterOpsResourceDocument } from "@/api/cluster-ops";
import { DataTable, type ListColumn } from "@/components/common";
import { field, nativeObject, record, text } from "../../model";

interface NodeMetadataProps {
  resource: ClusterOpsResourceDocument;
}

export function NodeMetadata({ resource }: NodeMetadataProps) {
  const object = nativeObject(resource);
  const entries = (key: string) =>
    Object.entries(record(field(object, "metadata", key))).map(([name, value]) => ({
      name,
      value: text(value),
    }));
  const labels = entries("labels");
  const annotations = entries("annotations");
  const columns: ListColumn<{ name: string; value: string }>[] = [
    { title: "键", dataIndex: "name", width: 260, ellipsis: true },
    { title: "值", dataIndex: "value", width: 360, ellipsis: true },
  ];
  return (
    <div className="flex flex-col gap-6">
      <DataTable
        header={{ title: "标签" }}
        columns={columns}
        data={labels}
        rowKey="name"
        pagination="client"
        tableLabel="节点标签"
      />
      <DataTable
        header={{ title: "注解" }}
        columns={columns}
        data={annotations}
        rowKey="name"
        pagination="client"
        tableLabel="节点注解"
      />
    </div>
  );
}
