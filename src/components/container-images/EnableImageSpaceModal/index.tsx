import { Alert, Form, Input, Modal } from "@arco-design/web-react";
import { useMutation } from "@tanstack/react-query";
import {
  enablePlatformImageSpace,
  enableTenantImageSpace,
  type ImageTarget,
} from "@/api/container-images";
import { validateForm } from "@/lib/form";
interface EnableImageSpaceModalProps {
  target: ImageTarget;
  onCancel: () => void;
  onSuccess: () => Promise<unknown>;
}
interface EnableImageSpaceFormValues {
  slug: string;
}
export function EnableImageSpaceModal({ target, onCancel, onSuccess }: EnableImageSpaceModalProps) {
  const [form] = Form.useForm<EnableImageSpaceFormValues>();
  const mutation = useMutation({
    gcTime: 0,
    retry: false,
    mutationFn: async (values: EnableImageSpaceFormValues) => {
      if (target.scope === "platform") await enablePlatformImageSpace();
      else await enableTenantImageSpace(target.tenantId, values.slug.trim());
      await onSuccess();
    },
    meta: {
      feedback: { channel: "message", action: "开通或修复镜像空间", successText: "镜像空间已更新" },
    },
  });
  const submit = async () => {
    try {
      const values =
        target.scope === "tenant"
          ? await validateForm<EnableImageSpaceFormValues>(form)
          : { slug: "" };
      await mutation.mutateAsync(values);
    } catch {
      /* 表单与请求反馈由统一入口处理。 */
    }
  };
  return (
    <Modal
      visible
      title="开通或修复镜像空间"
      onCancel={onCancel}
      onOk={submit}
      confirmLoading={mutation.isPending}
      okText="确认"
    >
      <Alert content="开通或修复镜像空间后，请单独签发推送凭证，用于登录仓库并推送镜像。" />
      {target.scope === "tenant" && (
        <Form form={form} layout="vertical" className="mt-4">
          <Form.Item
            field="slug"
            label="空间标识"
            rules={[
              { required: true, message: "请输入空间标识" },
              {
                validator: (value, callback) => {
                  const slug = typeof value === "string" ? value.trim() : "";
                  if (slug.length < 3 || slug.length > 40 || slug !== slug.toLowerCase())
                    callback("请输入 3–40 个字符，字母须为小写");
                  else callback();
                },
              },
            ]}
          >
            <Input placeholder="例如 my-images" maxLength={40} />
          </Form.Item>
        </Form>
      )}
    </Modal>
  );
}
