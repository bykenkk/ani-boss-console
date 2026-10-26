import { Form, Input, Modal } from "@arco-design/web-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  recordPublicPoolVerification,
  platformNetworkKeys,
  type PlatformNetwork,
} from "@/api/platform-networks";
import { validateForm } from "@/lib/form";
interface PublicPoolVerificationModalProps {
  resource: PlatformNetwork;
  onCancel: () => void;
  onSuccess: () => void;
}
interface PublicPoolVerificationFormValues {
  sourceRevision: string;
  images: string;
  fingerprint: string;
  evidence: string;
  scope: string;
  verifiedAt: string;
  expiresAt: string;
}
export function PublicPoolVerificationModal({
  resource,
  onCancel,
  onSuccess,
}: PublicPoolVerificationModalProps) {
  const [form] = Form.useForm<PublicPoolVerificationFormValues>();
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: (values: PublicPoolVerificationFormValues) =>
      recordPublicPoolVerification(resource.id, {
        expected_version: resource.version,
        verification: {
          provider_source_revision: values.sourceRevision.trim(),
          provider_image_digests: values.images
            .split(/[,\n]/)
            .map((x) => x.trim())
            .filter(Boolean),
          topology_fingerprint: values.fingerprint.trim(),
          evidence_reference: values.evidence.trim(),
          scope: values.scope.trim(),
          verified_at: values.verifiedAt,
          expires_at: values.expiresAt,
        },
      }),
    meta: {
      feedback: {
        channel: "message",
        id: "public-pool-verification",
        action: "记录公网池验证",
        successText: "验证记录已提交",
      },
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: platformNetworkKeys.all("public-address-pools"),
      });
      onSuccess();
    },
  });
  const submit = async () => {
    if (mutation.isPending) return;
    const values = await validateForm({ validate: () => form.validate() });
    await mutation.mutateAsync(values);
  };
  const fields: Array<{
    field: keyof PublicPoolVerificationFormValues;
    label: string;
    placeholder: string;
  }> = [
    { field: "sourceRevision", label: "Provider 源版本", placeholder: "请输入已验证的源码版本" },
    {
      field: "images",
      label: "Provider 镜像摘要",
      placeholder: "填写真实镜像摘要，多个条目用英文逗号或换行分隔",
    },
    { field: "fingerprint", label: "拓扑指纹", placeholder: "请输入验证对应的拓扑指纹" },
    { field: "evidence", label: "验证证据引用", placeholder: "请输入验证报告或证据引用" },
    { field: "scope", label: "验证范围", placeholder: "请输入验证对应的范围" },
    { field: "verifiedAt", label: "验证时间", placeholder: "RFC 3339，例如 2026-10-23T09:00:00Z" },
    { field: "expiresAt", label: "过期时间", placeholder: "RFC 3339，例如 2026-10-24T09:00:00Z" },
  ];
  return (
    <Modal
      visible
      title="记录公网池验证"
      onCancel={onCancel}
      onOk={submit}
      confirmLoading={mutation.isPending}
      cancelButtonProps={{ disabled: mutation.isPending }}
      closable={!mutation.isPending}
      escToExit={!mutation.isPending}
      style={{ width: 680 }}
    >
      <p className="mb-4 text-[var(--color-text-3)]">
        请填写已完成现场验证的真实证据；提交记录不会自动执行网络验证。
      </p>
      <Form
        form={form}
        layout="vertical"
        disabled={mutation.isPending}
        initialValues={{
          fingerprint: resource.pool?.topology_fingerprint,
          scope: resource.pool?.scope,
        }}
        onSubmitCapture={(event) => {
          event.preventDefault();
          event.stopPropagation();
        }}
      >
        {fields.map((item) => (
          <Form.Item
            key={item.field}
            field={item.field}
            label={item.label}
            rules={[{ required: true, match: /\S/, message: `请填写${item.label}` }]}
          >
            <Input placeholder={item.placeholder} />
          </Form.Item>
        ))}
      </Form>
    </Modal>
  );
}
