import { Button, Input, Modal } from "@arco-design/web-react";
import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getResource, type ClusterOpsResourceRef } from "@/api/cluster-ops";
import { clusterOpsKeys } from "@/api/cluster-ops/keys";

interface SecretContentModalProps {
  resourceRef: ClusterOpsResourceRef;
  onCancel: () => void;
}
export function SecretContentModal({ resourceRef, onCancel }: SecretContentModalProps) {
  const client = useQueryClient();
  const query = useQuery({
    queryKey: clusterOpsKeys.resource(resourceRef, true),
    queryFn: ({ signal }) => getResource(resourceRef, { include_secret_data: true, signal }),
    gcTime: 0,
    meta: { errorNotification: { id: "cluster-secret-content", action: "读取 Secret 内容" } },
  });
  useEffect(
    () => () =>
      client.removeQueries({ queryKey: clusterOpsKeys.resource(resourceRef, true), exact: true }),
    [client, resourceRef],
  );
  return (
    <Modal
      visible
      title={`Secret 内容 · ${resourceRef.name}`}
      style={{ width: 900 }}
      onCancel={onCancel}
      footer={
        <div className="flex justify-end gap-3">
          <Button onClick={onCancel}>关闭</Button>
        </div>
      }
    >
      <p>真实内容仅在当前弹窗使用，关闭后清理。</p>
      <Input.TextArea
        readOnly
        value={query.data?.manifest_yaml ?? ""}
        autoSize={{ minRows: 15, maxRows: 26 }}
        className="font-mono"
      />
    </Modal>
  );
}
