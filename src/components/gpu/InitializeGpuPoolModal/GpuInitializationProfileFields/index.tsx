import { Alert, Form, Input, InputNumber, Select, Typography } from "@arco-design/web-react";
import { IconApps, IconInfoCircle } from "@arco-design/web-react/icon";
import type { GpuAllocationType, GpuProviderConfig } from "@/api/accelerator";
import { formatGpuAllocationType } from "../../capacity";
import { fixedPartitionMemoryMib, validateGpuMemory } from "../../initialization";

interface GpuInitializationProfileFieldsProps {
  config?: GpuProviderConfig;
  allocationType?: GpuAllocationType;
}

function FixedGpuValue({ value, description }: { value?: number; description: string }) {
  return (
    <div className="flex min-h-9 flex-wrap items-center gap-2">
      <span>{value ?? 0}</span>
      <span className="text-xs text-(--color-text-3)">{description}</span>
    </div>
  );
}

export function GpuInitializationProfileFields({
  config,
  allocationType,
}: GpuInitializationProfileFieldsProps) {
  const nvidia = config?.adapter_id === "volcano-hami-mib-v1";
  const hygon = config?.adapter_id === "hygon-hcu-v1";
  const fixed = allocationType === "FIXED_PARTITION";
  const shared = allocationType === "DYNAMIC_SHARED";
  const supported = (config?.allocation_types ?? []).filter(
    (type) =>
      (hygon && (type === "PHYSICAL" || type === "FIXED_PARTITION")) ||
      (nvidia && (type === "PHYSICAL" || type === "DYNAMIC_SHARED")),
  );
  return (
    <div>
      <div className="mb-5 flex flex-col gap-1">
        <Typography.Title heading={5} className="m-0! text-lg! font-medium!">
          创建第一条 GPU 规格
        </Typography.Title>
        <Typography.Text type="secondary" className="text-xs!">
          定义业务可申请的设备数、显存与计算上限。
        </Typography.Text>
      </div>
      <div className="mb-5 flex flex-wrap items-center gap-2 rounded-lg bg-(--color-fill-1) px-4 py-3 text-xs">
        <IconApps />
        <span className="font-medium">{formatGpuAllocationType(allocationType)}</span>
        <span className="break-all text-(--color-text-3)">
          {config?.provider_config_ref} · {config?.adapter_id}
        </span>
      </div>
      {!supported.length ? (
        <Alert type="warning" content="当前配置没有本引导支持的分配方式，请返回核对供给配置。" />
      ) : null}
      <Form.Item
        field="profile_name"
        label="GPU 规格名称"
        rules={[{ required: true, match: /\S/, message: "请输入规格名称" }]}
      >
        <Input placeholder="请输入规格名称" />
      </Form.Item>
      <Form.Item
        hidden={supported.length <= 1}
        field="allocation_type"
        label="分配方式"
        rules={[{ required: true, message: "请选择分配方式" }]}
      >
        <Select
          filterOption={false}
          options={supported.map((type) => ({
            label: formatGpuAllocationType(type),
            value: type,
          }))}
        />
      </Form.Item>
      <div className="grid grid-cols-1 gap-x-6 sm:grid-cols-2">
        <Form.Item
          field="resource_key"
          label="资源类型键"
          rules={[
            {
              required: true,
              match: /\S/,
              message: "请输入实际已登记的资源类型键",
            },
            {
              validator: (value: string | undefined, callback) =>
                callback(
                  nvidia && value !== "volcano.sh/vgpu-number"
                    ? "当前 NVIDIA 配置的资源键须为 volcano.sh/vgpu-number"
                    : undefined,
                ),
            },
          ]}
          extra="使用实际受管配置中的资源键，不从设备数量或型号推算。"
        >
          <Input placeholder="请输入实际已登记的资源类型键" readOnly={nvidia} />
        </Form.Item>
        <Form.Item
          field="max_devices_per_replica"
          label="每副本最多设备数"
          rules={[
            {
              required: true,
              type: "number",
              min: 1,
              max: shared || fixed ? 1 : 4294967295,
              message: shared || fixed ? "当前分配方式仅支持 1 个设备" : "请输入受管上限内的正整数",
            },
          ]}
        >
          {shared || fixed ? (
            <FixedGpuValue description="此分配方式固定为单设备" />
          ) : (
            <InputNumber precision={0} min={1} max={4294967295} />
          )}
        </Form.Item>
        {fixed ? (
          <Form.Item
            className="sm:col-span-2"
            field="fixed_memory_bytes"
            label="真实固定片显存（bytes）"
            rules={[
              { required: true, message: "请输入真实固定片显存" },
              {
                validator: (value: string | undefined, callback) =>
                  callback(
                    fixedPartitionMemoryMib(value ?? "")
                      ? undefined
                      : "请输入真实固定片显存的正整数字节数",
                  ),
              },
            ]}
            extra="来源为已登记固定片类型；自动向上换算 MiB，不按整卡比例推算。"
          >
            <Input placeholder="请输入真实固定片字节数" />
          </Form.Item>
        ) : null}
        <Form.Item
          field="memory_mib_per_device"
          label="每设备显存（MiB）"
          rules={[
            { required: true, message: "请输入每设备显存" },
            {
              validator: (value: string | undefined, callback) =>
                callback(validateGpuMemory(value, !(hygon && !fixed), nvidia)),
            },
          ]}
          extra={hygon && !fixed ? "海光整卡允许填 0。" : "按真实受管类型填写。"}
        >
          <Input readOnly={fixed} placeholder="请输入十进制整数" />
        </Form.Item>
        <Form.Item
          field="compute_units_per_device"
          label="每设备计算单元（CU）"
          rules={[
            {
              required: true,
              type: "number",
              min: fixed ? 1 : 0,
              max: fixed ? 4294967295 : 0,
              message: fixed ? "请输入真实固定片的正整数 CU" : "当前分配方式的 CU 须为 0",
            },
          ]}
          extra={fixed ? "须来自已登记的真实固定片，不可按显存比例推算。" : "不适用，固定为 0。"}
        >
          {fixed ? (
            <InputNumber precision={0} min={1} max={4294967295} />
          ) : (
            <FixedGpuValue description="不适用" />
          )}
        </Form.Item>
        <Form.Item
          field="core_limit_percent"
          label="核心比例（%）"
          rules={[
            {
              required: true,
              type: "number",
              min: shared ? 1 : nvidia ? 100 : 0,
              max: shared ? 99 : nvidia ? 100 : 0,
              message: shared
                ? "核心比例须为 1–99"
                : nvidia
                  ? "整卡核心比例须为 100"
                  : "海光核心比例须为 0",
            },
          ]}
        >
          {shared ? (
            <InputNumber min={1} max={99} precision={0} />
          ) : (
            <FixedGpuValue description={nvidia ? "NVIDIA 整卡" : "海光不适用"} />
          )}
        </Form.Item>
      </div>
      <div className="mt-2 flex items-start gap-2 text-xs text-(--color-text-3)">
        <IconInfoCircle className="mt-0.5 shrink-0" />
        <span>
          {fixed
            ? "这里只登记已实际存在的固定分区类型，不会创建分区或切卡。真实 bytes 和 CU 未知时请先由运维补齐。"
            : "显存、资源键和设备上限须符合已登记配置。NVIDIA 整卡显存应等于受管整卡类型最大显存，动态共享显存须满足受管块大小；当前空闲容量不作为目录初始化的门槛。"}
        </span>
      </div>
    </div>
  );
}
