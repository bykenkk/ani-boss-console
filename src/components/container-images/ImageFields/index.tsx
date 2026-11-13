import { Form, Input, Select } from "@arco-design/web-react";
import { acceleratorLabels, purposeLabels } from "../model";
interface ImageFieldsProps {
  registering: boolean;
}
export function ImageFields({ registering }: ImageFieldsProps) {
  return (
    <>
      {registering && (
        <Form.Item
          label="镜像地址"
          field="imageReference"
          rules={[
            { required: true, message: "请输入已推送至当前镜像空间的镜像地址" },
            { match: /^\S+$/, message: "镜像地址不能包含空白字符" },
          ]}
        >
          <Input
            placeholder="registry/project/repository:tag 或 repository@sha256:..."
            maxLength={512}
          />
        </Form.Item>
      )}
      <Form.Item
        label="名称"
        field="displayName"
        rules={[
          { required: true, message: "请输入镜像名称" },
          { minLength: 1, maxLength: 100, message: "名称应为 1–100 个字符" },
          { match: /\S/, message: "名称不能全为空白" },
        ]}
      >
        <Input maxLength={100} />
      </Form.Item>
      <Form.Item
        label="描述"
        field="description"
        rules={[{ maxLength: 2000, message: "描述不能超过 2000 个字符" }]}
      >
        <Input.TextArea maxLength={2000} />
      </Form.Item>
      <Form.Item
        label="用途"
        field="purposes"
        rules={[
          {
            required: true,
            type: "array",
            minLength: 1,
            maxLength: 5,
            message: "请选择 1–5 个用途",
          },
        ]}
      >
        <Select
          mode="multiple"
          options={Object.entries(purposeLabels).map(([value, label]) => ({ value, label }))}
        />
      </Form.Item>
      <Form.Item
        label="加速器"
        field="accelerator"
        rules={[{ required: true, message: "请选择加速器" }]}
      >
        <Select
          options={Object.entries(acceleratorLabels).map(([value, label]) => ({ value, label }))}
        />
      </Form.Item>
    </>
  );
}
