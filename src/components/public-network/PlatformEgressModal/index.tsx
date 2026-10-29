import { Alert, Button, Descriptions, Form, Modal, Space, Spin } from "@arco-design/web-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createDefaultVPCEgress,
  defaultEgressKey,
  deleteDefaultVPCEgress,
  getCurrentDefaultVPCEgress,
} from "@/api/platform-networks";
import { eipKeys } from "@/api/eips";
import { NetworkResourceSelect } from "@/components/network/NetworkResourceSelect";
import { PlatformNetworkStatus } from "@/components/network/PlatformNetworkStatus";
import { formatDateTime } from "@/lib/date";
import { validateForm } from "@/lib/form";

interface PlatformEgressModalProps {
  onCancel: () => void;
}
interface PlatformEgressFormValues {
  pool_id: string;
}

export function PlatformEgressModal({ onCancel }: PlatformEgressModalProps) {
  const [form] = Form.useForm<PlatformEgressFormValues>();
  const client = useQueryClient();
  const query = useQuery({
    queryKey: defaultEgressKey,
    queryFn: ({ signal }) => getCurrentDefaultVPCEgress(signal),
    meta: { errorNotification: { id: "platform-default-egress", action: "平台组件出网配置加载" } },
  });
  const refresh = async () => {
    await Promise.all([
      client.invalidateQueries({ queryKey: defaultEgressKey }),
      client.invalidateQueries({ queryKey: eipKeys.all }),
    ]);
  };
  const create = useMutation({
    mutationFn: createDefaultVPCEgress,
    meta: {
      feedback: {
        channel: "message",
        action: "配置平台组件出网",
        successText: "配置已提交",
      },
    },
    onSuccess: refresh,
  });
  const remove = useMutation({
    mutationFn: deleteDefaultVPCEgress,
    meta: {
      feedback: {
        channel: "notification",
        id: "platform-egress-delete",
        action: "删除平台组件出网配置",
        successText: "删除已提交",
      },
    },
    onSuccess: refresh,
  });
  const busy = create.isPending || remove.isPending;
  const item = query.data;
  const submit = async () => {
    if (busy || query.isFetching || query.isError || item) return;
    try {
      const values = await validateForm({ validate: () => form.validate() });
      await create.mutateAsync({ name: "kcn-cluster-egress", pool_id: values.pool_id });
    } catch {
      /* 表单和请求错误由公共反馈处理。 */
    }
  };
  return (
    <Modal
      visible
      title="平台组件出网"
      footer={null}
      onCancel={onCancel}
      closable={!busy}
      escToExit={!busy}
      style={{ width: 680 }}
    >
      <Spin loading={query.isLoading} className="block!">
        <p className="mb-4 text-[var(--color-text-3)]">
          为默认 VPC 内的 Pod 配置系统专用 EIP 和 SNAT。
        </p>
        {query.isError ? (
          <Alert type="error" content="无法加载出网配置，请刷新重试。" />
        ) : item ? (
          <Descriptions
            column={1}
            className="break-all"
            data={[
              { label: "VPC", value: `${item.default_vpc_namespace}/${item.default_vpc_name}` },
              { label: "出口状态", value: <PlatformNetworkStatus state={item.state} /> },
              { label: "出口 IP", value: item.address || "-" },
              { label: "EIP ID", value: item.eip_id || "-" },
              { label: "公网池 ID", value: item.pool_id },
              { label: "配置 ID", value: item.id },
              { label: "观测状态", value: item.observation_stale ? "已过期" : "有效" },
              { label: "最近观测", value: formatDateTime(item.observed_at) },
              { label: "状态说明", value: item.reason || "-" },
            ]}
          />
        ) : (
          !query.isLoading && (
            <Form
              form={form}
              layout="vertical"
              disabled={busy}
              onSubmitCapture={(event) => {
                event.preventDefault();
                event.stopPropagation();
                submit();
              }}
            >
              <Descriptions
                column={1}
                data={[
                  { label: "VPC", value: "kcn-system/kcn-cluster" },
                  { label: "出网配置", value: "未配置" },
                ]}
              />
              <Form.Item
                field="pool_id"
                label="公网池"
                rules={[{ required: true, message: "请选择公网池" }]}
              >
                <NetworkResourceSelect kind="public-pool" disabled={busy} />
              </Form.Item>
            </Form>
          )
        )}
        <Space className="mt-4 flex! justify-end">
          <Button disabled={busy} loading={query.isFetching} onClick={() => query.refetch()}>
            刷新
          </Button>
          {item ? (
            <Button
              status="danger"
              disabled={busy || item.state === "deleting"}
              loading={remove.isPending}
              onClick={() =>
                Modal.confirm({
                  title: "删除平台组件出网配置",
                  content:
                    "删除后，依赖此出口的 kcn-cluster Pod 将失去这条出网路径，系统 EIP 将被回收。确定删除？",
                  okButtonProps: { status: "danger" },
                  onOk: () => remove.mutateAsync(item.id),
                })
              }
            >
              删除出网配置
            </Button>
          ) : (
            <Button
              type="primary"
              disabled={query.isLoading || query.isError || query.isFetching}
              loading={create.isPending}
              onClick={submit}
            >
              配置出网
            </Button>
          )}
        </Space>
      </Spin>
    </Modal>
  );
}
