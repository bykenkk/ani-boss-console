import { useEffect, useRef, useState } from "react";
import { Button, Form, Input, Modal } from "@arco-design/web-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ApiError,
  getResource,
  updateResource,
  type ClusterOpsGetResourceResponse,
  type ClusterOpsResourceRef,
} from "@/api/cluster-ops";
import { clusterOpsKeys } from "@/api/cluster-ops/keys";
import { validateForm } from "@/lib/form";

interface ResourceEditModalProps {
  resourceRef: ClusterOpsResourceRef;
  onCancel: () => void;
}
interface ResourceEditFormValues {
  manifest_yaml: string;
}
export function ResourceEditModal({ resourceRef, onCancel }: ResourceEditModalProps) {
  const client = useQueryClient();
  const secret = resourceRef.type.group === "" && resourceRef.type.resource === "secrets";
  const query = useQuery({
    // A new edit must fetch a fresh source, rather than reuse the visible detail snapshot.
    queryKey: [...clusterOpsKeys.resource(resourceRef, secret), "edit"],
    queryFn: ({ signal }) => getResource(resourceRef, { signal, include_secret_data: secret }),
    gcTime: 0,
    meta: { errorNotification: { id: "cluster-edit-source", action: "读取编辑配置" } },
  });
  useEffect(
    () => () => {
      if (secret)
        client.removeQueries({
          queryKey: [...clusterOpsKeys.resource(resourceRef, true), "edit"],
          exact: true,
        });
    },
    [client, resourceRef, secret],
  );
  if (!query.data)
    return (
      <Modal
        visible
        title={`编辑 ${resourceRef.name}`}
        onCancel={onCancel}
        footer={<Button onClick={onCancel}>关闭</Button>}
      >
        读取编辑配置中
      </Modal>
    );
  return (
    <FrozenResourceEditor
      resourceRef={resourceRef}
      onCancel={onCancel}
      initial={query.data}
      loading={query.isFetching}
      reload={async () => (await query.refetch()).data}
    />
  );
}
interface FrozenResourceEditorProps extends ResourceEditModalProps {
  initial: ClusterOpsGetResourceResponse;
  loading: boolean;
  reload: () => Promise<ClusterOpsGetResourceResponse | undefined>;
}
function FrozenResourceEditor({
  resourceRef,
  onCancel,
  initial,
  loading,
  reload: loadFresh,
}: FrozenResourceEditorProps) {
  const [form] = Form.useForm<ResourceEditFormValues>();
  const [base, setBase] = useState(initial);
  const busy = useRef(false);
  const client = useQueryClient();
  const mutation = useMutation({
    mutationFn: async ({ values, dry_run }: { values: ResourceEditFormValues; dry_run: boolean }) =>
      updateResource(resourceRef, {
        manifest_yaml: values.manifest_yaml,
        expected_uid: base!.resource.uid,
        expected_resource_version: base!.resource.resource_version,
        dry_run,
      }),
    meta: {
      feedback: (input) => ({
        channel: "message",
        action: "保存配置",
        successText: (input as { dry_run: boolean }).dry_run ? "校验通过，未保存" : "配置已保存",
        errorFallback: "保存结果尚未确认，请刷新资源查看",
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
    if (busy.current || !base) return;
    busy.current = true;
    try {
      const values = await validateForm<ResourceEditFormValues>(form);
      await mutation.mutateAsync({ values, dry_run });
    } catch {
      /* Keep the exact draft and UID/RV after validation or HTTP failure. */
    } finally {
      busy.current = false;
    }
  };
  const reload = () =>
    Modal.confirm({
      title: "放弃当前草稿并重新加载？",
      content: "重新加载会丢弃当前修改，并取得新的 UID 和 resourceVersion。",
      onOk: async () => {
        const result = await loadFresh();
        if (result) {
          setBase(result);
          form.setFieldValue("manifest_yaml", result.manifest_yaml);
          mutation.reset();
        }
      },
    });
  const conflict =
    mutation.error instanceof ApiError &&
    ["RESOURCE_VERSION_CONFLICT", "RESOURCE_UID_CHANGED"].includes(mutation.error.reason ?? "");
  const blocked =
    !base || !base.manifest_yaml || base.resource.secret_data_redacted || base.resource.read_only;
  return (
    <Modal
      visible
      title={`编辑 ${resourceRef.name}`}
      style={{ width: 980 }}
      onCancel={onCancel}
      footer={
        <div className="flex justify-end gap-3">
          <Button onClick={onCancel}>取消</Button>
          <Button disabled={mutation.isPending || loading} onClick={reload}>
            放弃草稿并重新加载
          </Button>
          <Button disabled={blocked || mutation.isPending} onClick={() => submit(true)}>
            校验
          </Button>
          <Button
            type="primary"
            loading={mutation.isPending}
            disabled={blocked}
            onClick={() => submit(false)}
          >
            确认保存
          </Button>
        </div>
      }
    >
      <p className="break-all">
        UID：{base?.resource.uid ?? "-"}　resourceVersion：{base?.resource.resource_version ?? "-"}
      </p>
      {conflict ? (
        <p>目标版本已变化，当前草稿已保留。请确认后重新加载，不会自动覆盖或再次提交。</p>
      ) : null}
      <Form form={form} layout="vertical" initialValues={{ manifest_yaml: initial.manifest_yaml }}>
        <Form.Item
          label="原始 YAML"
          field="manifest_yaml"
          rules={[{ required: true, message: "请输入原始 YAML" }]}
        >
          <Input.TextArea
            autoSize={{ minRows: 18, maxRows: 30 }}
            disabled={!base}
            className="font-mono"
          />
        </Form.Item>
      </Form>
      <p>保存表示配置请求成功，不代表应用已加载；校验不会保存或更新编辑基线。</p>
    </Modal>
  );
}
