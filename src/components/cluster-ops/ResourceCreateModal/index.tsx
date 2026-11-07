import { useRef, useState } from "react";
import { Button, Form, Input, Modal } from "@arco-design/web-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createResource, getResource, type ClusterOpsResourceDescriptor } from "@/api/cluster-ops";
import { clusterOpsKeys } from "@/api/cluster-ops/keys";
import { validateForm } from "@/lib/form";
import { readOnlyMessage } from "../model";
import { NamespacePicker } from "../NamespacePicker";

interface ResourceCreateModalProps {
  clusterId: string;
  descriptor: ClusterOpsResourceDescriptor;
  initialNamespace: string;
  onCancel: () => void;
}
interface ResourceCreateFormValues {
  name: string;
  namespace: string;
  manifest_yaml: string;
}
export function ResourceCreateModal({
  clusterId,
  descriptor,
  initialNamespace,
  onCancel,
}: ResourceCreateModalProps) {
  const [form] = Form.useForm<ResourceCreateFormValues>();
  const [namespace, setNamespace] = useState(initialNamespace);
  const busy = useRef(false);
  const client = useQueryClient();
  const namespaceRef = {
    cluster_id: clusterId,
    type: { group: "", version: "v1", resource: "namespaces" },
    namespace: "",
    name: namespace,
  };
  const namespaceQuery = useQuery({
    queryKey: clusterOpsKeys.resource(namespaceRef),
    queryFn: ({ signal }) => getResource(namespaceRef, { signal }),
    enabled: Boolean(descriptor.namespaced && namespace),
    meta: { errorNotification: { id: "cluster-namespace", action: "读取目标命名空间" } },
  });
  const mutation = useMutation({
    mutationFn: async (input: { values: ResourceCreateFormValues; dry_run: boolean }) =>
      createResource(clusterId, {
        type: descriptor.type,
        namespace: descriptor.namespaced ? namespace : "",
        name: input.values.name,
        manifest_yaml: input.values.manifest_yaml,
        dry_run: input.dry_run,
      }),
    meta: {
      feedback: (input) => ({
        channel: "message",
        action: "创建资源",
        successText: (input as { dry_run: boolean }).dry_run ? "校验通过，未保存" : "资源已创建",
      }),
    },
    onSuccess: async (result) => {
      if (!result.dry_run) {
        await client.invalidateQueries({ queryKey: clusterOpsKeys.all });
        onCancel();
      }
    },
  });
  const submit = async (dry_run: boolean) => {
    if (busy.current) return;
    busy.current = true;
    try {
      const values = await validateForm<ResourceCreateFormValues>(form);
      await mutation.mutateAsync({ values, dry_run });
    } catch {
      /* Form and mutation own their feedback. The draft stays mounted. */
    } finally {
      busy.current = false;
    }
  };
  const blocked =
    descriptor.namespaced &&
    (!namespace || !namespaceQuery.data || namespaceQuery.data.resource.read_only);
  return (
    <Modal
      visible
      title={`创建 ${descriptor.kind}`}
      style={{ width: 900 }}
      onCancel={onCancel}
      footer={
        <div className="flex justify-end gap-3">
          <Button onClick={onCancel}>取消</Button>
          <Button disabled={blocked || mutation.isPending} onClick={() => submit(true)}>
            校验
          </Button>
          <Button
            type="primary"
            loading={mutation.isPending}
            disabled={blocked}
            onClick={() => submit(false)}
          >
            确认创建
          </Button>
        </div>
      }
    >
      <Form form={form} layout="vertical" initialValues={{ namespace: initialNamespace }}>
        <p>
          目标：{descriptor.type.group || "core"}/{descriptor.type.version}/
          {descriptor.type.resource}
        </p>
        {descriptor.namespaced ? (
          <Form.Item label="Namespace" required>
            <NamespacePicker clusterId={clusterId} value={namespace} onChange={setNamespace} />
            {namespaceQuery.data?.resource.read_only ? (
              <p>{readOnlyMessage(namespaceQuery.data.resource.read_only_reason)}</p>
            ) : null}
          </Form.Item>
        ) : null}
        <Form.Item
          label="名称"
          field="name"
          rules={[{ required: true, message: "请输入资源名称" }]}
        >
          <Input />
        </Form.Item>
        <Form.Item
          label="单对象 YAML"
          field="manifest_yaml"
          rules={[{ required: true, message: "请输入原始 YAML" }]}
        >
          <Input.TextArea autoSize={{ minRows: 16, maxRows: 26 }} className="font-mono" />
        </Form.Item>
        <p>校验不会保存；创建成功后，实际运行状态仍以资源查询为准。</p>
      </Form>
    </Modal>
  );
}
