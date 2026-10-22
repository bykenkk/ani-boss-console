import { Form, Input, InputNumber, Select } from "@arco-design/web-react";
import { PlanModuleSelect } from "@/components/tenant/PlanModuleSelect";

export function PlanFields() {
  return (
    <>
      <Form.Item
        field="name"
        label="套餐名称"
        rules={[{ required: true, message: "请填写套餐名称" }]}
      >
        <Input />
      </Form.Item>
      <Form.Item
        field="version"
        label="套餐版本"
        rules={[{ required: true, message: "请填写套餐版本" }]}
      >
        <Select
          options={[
            { value: "FREE", label: "免费版" },
            { value: "STANDARD", label: "标准版" },
            { value: "ENTERPRISE", label: "企业版" },
          ]}
        />
      </Form.Item>
      <Form.Item
        field="expiryPolicy"
        label="到期处置策略"
        rules={[{ required: true, message: "请填写到期处置策略" }]}
      >
        <Select
          options={[
            { value: "READONLY", label: "只读" },
            { value: "BLOCK_LOGIN", label: "禁止登录" },
            { value: "FREEZE", label: "冻结" },
          ]}
        />
      </Form.Item>
      <Form.Item field="modules" label="可用模块">
        <PlanModuleSelect />
      </Form.Item>
      <Form.Item field="dataRetentionDays" label="数据保留天数">
        <InputNumber min={0} max={4294967295} precision={0} />
      </Form.Item>
      <Form.Item field="description" label="描述">
        <Input.TextArea />
      </Form.Item>
      <Form.Item field="remark" label="备注">
        <Input />
      </Form.Item>
    </>
  );
}
