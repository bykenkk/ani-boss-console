import { Alert, Form, Input, Modal } from "@arco-design/web-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRef } from "react";
import {
  createBasicNetwork,
  getIntranetPoolDefaults,
  intranetPoolDefaultsKey,
  platformNetworkKeys,
} from "@/api/platform-networks";
import { validateForm } from "@/lib/form";
import { BasicNetworkAddressFields } from "./BasicNetworkAddressFields";

interface BasicNetworkCreateModalProps {
  onCancel: () => void;
  onSuccess: () => void;
}
export interface BasicNetworkCreateFormValues {
  name: string;
  description?: string;
  cidr: string;
  gateway: string;
  excludedIps?: string;
}

export function BasicNetworkCreateModal({ onCancel, onSuccess }: BasicNetworkCreateModalProps) {
  const [form] = Form.useForm<BasicNetworkCreateFormValues>();
  const busy = useRef(false);
  const client = useQueryClient();
  const defaults = useQuery({
    queryKey: intranetPoolDefaultsKey,
    queryFn: ({ signal }) => getIntranetPoolDefaults(signal),
    staleTime: 0,
    meta: {
      errorNotification: { id: "intranet-address-pool-defaults", action: "集群基础网络配置加载" },
    },
  });
  const mutation = useMutation({
    mutationFn: createBasicNetwork,
    meta: {
      feedback: {
        channel: "message",
        action: "创建基础网络",
        successText: "创建已提交",
      },
    },
    onSuccess: async () => {
      // TODO(network-task): 创建任务跟踪后续统一接入。
      await client.invalidateQueries({
        queryKey: platformNetworkKeys.all("intranet-address-pools"),
      });
      onSuccess();
    },
  });
  const submit = async () => {
    if (
      busy.current ||
      mutation.isPending ||
      !defaults.data ||
      defaults.isFetching ||
      defaults.isError
    )
      return;
    busy.current = true;
    try {
      const values = await validateForm({ validate: () => form.validate() });
      await mutation.mutateAsync({
        name: values.name.trim(),
        description: values.description?.trim(),
        cidr: values.cidr.trim(),
        ovn_gateway_ip: values.gateway.trim(),
        excluded_ips: (values.excludedIps ?? "")
          .split(/[,\n]/)
          .map((entry) => entry.trim())
          .filter(Boolean),
        default_vpc_name: defaults.data.default_vpc_name,
        default_vpc_uid: defaults.data.default_vpc_uid,
        intranet_networks: defaults.data.intranet_networks,
      });
    } catch {
      /* 校验及请求错误由公共反馈处理。 */
    } finally {
      busy.current = false;
    }
  };
  return (
    <Modal
      visible
      title="创建基础网络"
      style={{ width: 680 }}
      onCancel={onCancel}
      onOk={submit}
      confirmLoading={mutation.isPending}
      okButtonProps={{ disabled: !defaults.data || defaults.isFetching || defaults.isError }}
      closable={!mutation.isPending}
      escToExit={!mutation.isPending}
    >
      {defaults.isError && (
        <Alert
          className="mb-4"
          type="warning"
          content="集群基础网络配置不可用，暂时无法创建基础网络。"
        />
      )}
      <Form
        form={form}
        layout="vertical"
        disabled={mutation.isPending}
        onSubmitCapture={(event) => {
          event.preventDefault();
          event.stopPropagation();
          submit();
        }}
      >
        <Form.Item
          field="name"
          label="名称"
          rules={[{ required: true, match: /\S/, message: "请输入基础网络名称" }]}
        >
          <Input placeholder="请输入名称" />
        </Form.Item>
        <Form.Item field="description" label="简介">
          <Input.TextArea maxLength={100} showWordLimit placeholder="请输入简介" />
        </Form.Item>
        <BasicNetworkAddressFields form={form} />
      </Form>
    </Modal>
  );
}
