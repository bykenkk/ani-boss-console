import { Form, Input, type FormInstance } from "@arco-design/web-react";
import { NetworkResourceSelect } from "@/components/network/NetworkResourceSelect";
import { AddressPoolValidationError, buildAddressPool } from "../address-pool";
import { getAddressPoolInput, type PublicNetworkCreateFormValues } from "../form";

interface PublicNetworkAddressFieldsProps {
  form: FormInstance<PublicNetworkCreateFormValues>;
  disabled: boolean;
}

const addressFields = [
  {
    field: "cidr",
    poolField: "cidr",
    label: "IPv4 网段（CIDR）",
    placeholder: "例如 10.10.20.0/22",
    extra: "填写网络所在的完整网段；允许平台使用的 IP 范围在下方单独设置。",
  },
  {
    field: "allocationStart",
    poolField: "allocationStart",
    label: "可用起始 IP",
    placeholder: "例如 10.10.20.201",
    extra: "仅使用此起止范围内的地址，包含下方云平台网关的预留地址。",
  },
  {
    field: "allocationEnd",
    poolField: "allocationEnd",
    label: "可用结束 IP",
    placeholder: "例如 10.10.20.210",
  },
  {
    field: "upstreamGateway",
    poolField: "upstreamGatewayIp",
    label: "上游网关",
    placeholder: "例如 10.10.23.254",
    extra: "外部网络已有的真实网关，通常由网络管理员提供。",
  },
  {
    field: "ovnGateway",
    poolField: "ovnGatewayIp",
    label: "云平台网关 IP（OVN）",
    placeholder: "从可用 IP 范围中预留一个地址",
    extra: "此地址用于云平台虚拟网关，不再分配给实例，且不能与上游网关相同。",
  },
] as const;

export function PublicNetworkAddressFields({ form, disabled }: PublicNetworkAddressFieldsProps) {
  return (
    <>
      <Form.Item
        field="vlanId"
        label="二层网络"
        rules={[{ required: true, message: "请选择二层网络" }]}
      >
        <NetworkResourceSelect kind="vlan" disabled={disabled} />
      </Form.Item>
      {addressFields.map(({ field, poolField, label, placeholder, ...options }) => (
        <Form.Item
          key={field}
          field={field}
          label={label}
          extra={"extra" in options ? options.extra : undefined}
          dependencies={addressFields
            .filter((item) => item.field !== field)
            .map((item) => item.field)}
          rules={[
            { required: true, message: `请输入${label}` },
            {
              validator: (value, callback) => {
                try {
                  buildAddressPool(
                    getAddressPoolInput({ ...form.getFieldsValue(), [field]: value }),
                  );
                  callback();
                } catch (error) {
                  callback(
                    error instanceof AddressPoolValidationError && error.field === poolField
                      ? error.message
                      : undefined,
                  );
                }
              },
            },
          ]}
        >
          <Input placeholder={placeholder} />
        </Form.Item>
      ))}
    </>
  );
}
