import { Form, Input, InputNumber, Select, type FormInstance } from "@arco-design/web-react";
import { useQuery } from "@tanstack/react-query";
import { acceleratorKeys, listGpuClusterOptions } from "@/api/accelerator";
import type { Layer2NetworkCreateFormValues } from "..";
import { NetworkResourceSelect } from "@/components/network/NetworkResourceSelect";
interface Layer2ConfigurationFieldsProps {
  form: FormInstance<Layer2NetworkCreateFormValues>;
  onClusterNameChange: (name: string) => void;
}
export function Layer2ConfigurationFields({
  form,
  onClusterNameChange,
}: Layer2ConfigurationFieldsProps) {
  const clusters = useQuery({
    queryKey: [...acceleratorKeys.all, "clusters", "options"],
    queryFn: ({ signal }) => listGpuClusterOptions(signal),
    meta: { errorNotification: { id: "gpu-cluster-options", action: "GPU 集群选项加载" } },
  });
  return (
    <>
      <Form.Item
        field="clusterId"
        label="集群"
        rules={[{ required: true, message: "请选择集群" }]}
        extra={clusters.data?.next_page_token ? "当前仅显示前 100 个集群。" : undefined}
      >
        <Select
          placeholder="请选择集群"
          loading={clusters.isFetching}
          filterOption={false}
          options={(clusters.data?.items ?? []).map((item) => ({
            label: item.display_name,
            value: item.cluster_id,
          }))}
          onChange={(id: string) => {
            onClusterNameChange(
              clusters.data?.items?.find((item) => item.cluster_id === id)?.display_name ?? "",
            );
            form.setFieldValue("switchId", undefined);
            form.setFieldValue("nic", undefined);
          }}
        />
      </Form.Item>
      <Form.Item
        field="switchId"
        label="虚拟交换机"
        rules={[{ required: true, message: "请选择虚拟交换机" }]}
      >
        <NetworkResourceSelect kind="virtual-switch" />
      </Form.Item>
      <Form.Item
        field="nic"
        label="网卡名称"
        rules={[{ required: true, match: /\S/, message: "请输入网卡名称" }]}
        extra="填写集群内一致且可用的网卡名称，实际准入由服务端核验。"
      >
        <Input placeholder="例如 bond0、eno2" />
      </Form.Item>
      <Form.Item
        field="vlanId"
        label="VLAN ID"
        rules={[
          { required: true, message: "请输入 VLAN ID" },
          {
            validator: (value, callback) =>
              callback(
                Number.isInteger(value) && value >= 0 && value <= 4094
                  ? undefined
                  : "VLAN ID 必须为 0–4094 的整数",
              ),
          },
        ]}
      >
        <InputNumber min={0} max={4094} placeholder="0–4094" className="w-full!" />
      </Form.Item>
    </>
  );
}
