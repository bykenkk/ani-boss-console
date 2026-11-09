import { useRef, useState } from "react";
import { Form, InputNumber, Modal } from "@arco-design/web-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  scaleWorkload,
  type ClusterOpsResourceDocument,
  type ClusterOpsScaleWorkloadResponse,
} from "@/api/cluster-ops";
import { clusterOpsKeys } from "@/api/cluster-ops/keys";
import { validateForm } from "@/lib/form";
import { field, nativeObject } from "../model";

interface WorkloadScaleModalProps {
  resource: ClusterOpsResourceDocument;
  onCancel: () => void;
}
interface WorkloadScaleFormValues {
  replicas: number;
}
export function WorkloadScaleModal({ resource, onCancel }: WorkloadScaleModalProps) {
  const [form] = Form.useForm<WorkloadScaleFormValues>();
  const baseline = useRef({ uid: resource.uid, rv: resource.resource_version, ref: resource.ref });
  const client = useQueryClient();
  const [result, setResult] = useState<ClusterOpsScaleWorkloadResponse>();
  const mutation = useMutation({
    mutationFn: async (values: WorkloadScaleFormValues) =>
      scaleWorkload(baseline.current.ref, {
        expected_uid: baseline.current.uid,
        expected_resource_version: baseline.current.rv,
        replicas: values.replicas,
      }),
    meta: {
      feedback: { channel: "message", action: "设置副本数", successText: "已设置期望副本数" },
    },
    onSuccess: async (value) => {
      setResult(value);
      await client.invalidateQueries({ queryKey: clusterOpsKeys.all });
    },
  });
  const initial = field(nativeObject(resource), "spec", "replicas");
  return (
    <Modal
      visible
      title={`扩缩容 · ${resource.ref.name}`}
      okText={result ? "关闭" : "确认设置"}
      confirmLoading={mutation.isPending}
      onCancel={onCancel}
      onOk={async () => {
        if (result) {
          onCancel();
          return;
        }
        try {
          const values = await validateForm<WorkloadScaleFormValues>(form);
          await mutation.mutateAsync(values);
        } catch {
          /* Preserve the form after a conflict. */
        }
      }}
    >
      <Form
        form={form}
        layout="vertical"
        initialValues={{ replicas: typeof initial === "number" ? initial : 1 }}
        onValuesChange={() => setResult(undefined)}
      >
        <Form.Item
          label="期望副本数"
          field="replicas"
          rules={[
            { required: true, message: "请输入副本数" },
            {
              validator: (value, callback) =>
                callback(
                  Number.isInteger(value) && value >= 0 && value <= 2147483647
                    ? undefined
                    : "请输入 0 到 2147483647 的整数",
                ),
            },
          ]}
        >
          <InputNumber min={0} max={2147483647} precision={0} />
        </Form.Item>
      </Form>
      {result ? (
        <p>
          期望副本数：{result.desired_replicas}；当前观察副本数：{result.observed_replicas}
        </p>
      ) : null}
      <p>0 是合法值。设置期望副本数不代表 Pod 已就绪。</p>
    </Modal>
  );
}
