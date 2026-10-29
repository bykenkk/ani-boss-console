import { Form, Input, Switch } from "@arco-design/web-react";
import { NetworkLayer2Select } from "@/components/layer2-network/NetworkLayer2Select";

export function NetworkBasicFields() {
  return (
    <>
      <Form.Item
        field="name"
        label="名称"
        rules={[{ required: true, match: /\S/, message: "请输入网络名称" }]}
      >
        <Input placeholder="请输入名称" />
      </Form.Item>
      <Form.Item
        field="description"
        label="简介"
        rules={[{ maxLength: 100, message: "简介不能超过 100 字" }]}
      >
        <Input.TextArea
          placeholder="请输入简介"
          maxLength={100}
          showWordLimit
          autoSize={{ minRows: 3, maxRows: 5 }}
        />
      </Form.Item>
      <Form.Item field="vlanEnabled" label="VLAN" triggerPropName="checked">
        <Switch />
      </Form.Item>
      <Form.Item
        noStyle
        shouldUpdate={(previous, current) => previous.vlanEnabled !== current.vlanEnabled}
      >
        {(values) => (
          <div hidden={!values.vlanEnabled}>
            <Form.Item
              field="layer2Id"
              label="二层网络"
              rules={values.vlanEnabled ? [{ required: true, message: "请选择二层网络" }] : []}
            >
              <NetworkLayer2Select />
            </Form.Item>
          </div>
        )}
      </Form.Item>
      <Form.Item
        field="dhcpDisabled"
        label="关闭 DHCP 服务"
        triggerPropName="checked"
        extra="开启此开关后，网络将不提供 DHCP 地址分配服务。"
      >
        <Switch />
      </Form.Item>
    </>
  );
}
