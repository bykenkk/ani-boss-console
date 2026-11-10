import { Descriptions } from "@arco-design/web-react";
import type { ReactNode } from "react";
import type { ClusterOpsResourceDocument } from "@/api/cluster-ops";
import { formatDateTime } from "@/lib/date";
import { field, nativeObject, readOnlyMessage } from "../model";

interface ResourceInfoProps {
  resource?: ClusterOpsResourceDocument;
  details?: { label: string; value: ReactNode }[];
}

export function ResourceInfo({ resource, details = [] }: ResourceInfoProps) {
  const data = resource
    ? [
        { label: "UID", value: resource.uid },
        { label: "资源版本", value: resource.resource_version },
        {
          label: "创建时间",
          value: formatDateTime(
            String(field(nativeObject(resource), "metadata", "creationTimestamp") ?? ""),
          ),
        },
        {
          label: "只读原因",
          value: resource.read_only
            ? readOnlyMessage(resource.read_only_reason) || "当前资源只读"
            : "-",
        },
        ...details,
      ]
    : [];
  return <Descriptions column={1} data={data} />;
}
