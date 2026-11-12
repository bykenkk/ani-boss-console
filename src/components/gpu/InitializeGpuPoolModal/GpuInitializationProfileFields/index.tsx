import {
  Alert,
  Button,
  Collapse,
  Descriptions,
  Form,
  Input,
  InputNumber,
  Select,
  Typography,
} from "@arco-design/web-react";
import { IconInfoCircle, IconRefresh } from "@arco-design/web-react/icon";
import { formatDateTime } from "@/lib/date";
import { formatGpuAllocationType } from "../../capacity";
import type { GpuInitializationSupplyFacts } from "../supply-facts";
import { formatGpuInitializationError } from "../presentation";
import type { NvidiaFixedProfilePreview } from "../nvidia-fixed-profile";
import { NvidiaFixedProfileFields } from "../NvidiaFixedProfileFields";

interface GpuInitializationProfileFieldsProps {
  facts: GpuInitializationSupplyFacts;
  nvidiaPreview: NvidiaFixedProfilePreview;
  onRefresh: () => Promise<unknown>;
  onLoadMore: () => Promise<unknown>;
}

export function GpuInitializationProfileFields({
  facts,
  nvidiaPreview,
  onRefresh,
  onLoadMore,
}: GpuInitializationProfileFieldsProps) {
  const { identity, registered, observed } = facts;
  const nvidia = identity.adapterId === "volcano-hami-mib-v1";
  const fixed = identity.allocationType === "FIXED_PARTITION";
  const shared = identity.allocationType === "DYNAMIC_SHARED";
  const physical = identity.allocationType === "PHYSICAL";
  const supported = identity.availableAllocationTypes;
  const maxDevices = Math.min(16, registered?.resourceType.max_devices_per_replica ?? 16);
  const memoryBlock = registered?.baseline.memory_block_mib ?? observed?.memoryBlockMiB;
  const splitCount = registered?.baseline.split_count ?? observed?.splitCount;
  const coreAdditive = registered?.baseline.core_budget_additive ?? observed?.coreBudgetAdditive;
  const runtimeClass = registered?.baseline.runtime_class_name;
  const approvedMemory = registered?.resourceType.max_memory_mib_per_device;
  const sourceLabel =
    facts.source === "registration"
      ? "已登记供给配置"
      : facts.source === "observation"
        ? "实际供给查询"
        : "尚未取得供给事实";

  return (
    <div className="flex min-w-0 flex-col gap-5">
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <Typography.Title heading={5} className="m-0! text-lg! font-medium!">
            创建第一条 GPU 规格
          </Typography.Title>
          <Typography.Text type="secondary" className="text-xs!">
            供给事实自动读取；管理员只设置名称与申请策略。
          </Typography.Text>
        </div>
        <Button
          type="text"
          icon={<IconRefresh />}
          aria-busy={facts.loading}
          aria-disabled={facts.loading}
          onClick={() => {
            if (!facts.loading) onRefresh().catch(() => undefined);
          }}
        >
          {facts.loading ? "正在刷新" : "刷新供给信息"}
        </Button>
      </div>
      {facts.issues.length || facts.error ? (
        <Alert
          type="warning"
          title="供给信息尚不完整"
          content={
            <div className="flex flex-col gap-1">
              {[
                ...new Set([
                  ...facts.issues,
                  ...(facts.error ? [formatGpuInitializationError(facts.error)] : []),
                ]),
              ].map((issue) => (
                <div key={issue}>{issue}</div>
              ))}
            </div>
          }
        />
      ) : null}
      <section className="rounded-lg bg-(--color-fill-1) p-4">
        <Typography.Text bold>供给事实（只读）</Typography.Text>
        <Descriptions
          className="mt-3"
          column={1}
          data={[
            { label: "参数来源", value: sourceLabel },
            {
              label: nvidia ? "供给方式" : "分配方式",
              value:
                nvidia && shared ? "固定切片" : formatGpuAllocationType(identity.allocationType),
            },
            { label: "设备型号", value: identity.modelKeys.join("、") || "未知：接口尚未返回型号" },
            {
              label: "资源类型键",
              value: (
                <span className="break-all">
                  {facts.resourceKey ||
                    (facts.resourceOptions.length > 1
                      ? "请从下方选择实际资源类型"
                      : "未知：接口尚未返回共同资源类型")}
                </span>
              ),
            },
            {
              label: "供给设备上限",
              value:
                fixed || shared
                  ? "1 个设备 / 副本（此分配方式固定为单设备）"
                  : registered
                    ? registered.resourceType.max_devices_per_replica + " 个设备 / 副本"
                    : "未知：未返回登记详情，提交时由后端复核",
            },
            {
              label: "运行时",
              value:
                runtimeClass === undefined
                  ? "由已登记供给自动应用（详情未返回）"
                  : runtimeClass || "默认运行时",
            },
            ...(fixed
              ? [
                  {
                    label: "固定片显存",
                    value: facts.fixed
                      ? facts.fixed.bytes + " bytes（向上换算 " + facts.fixed.memoryMiB + " MiB）"
                      : "未知：尚未取得一致的真实固定片显存",
                  },
                  {
                    label: "固定片计算单元",
                    value: facts.fixed
                      ? facts.fixed.computeUnits + " CU"
                      : "未知：尚未取得一致的真实 CU",
                  },
                ]
              : []),
            ...(nvidia
              ? [
                  {
                    label: "已登记显存上限",
                    value:
                      approvedMemory === undefined
                        ? "未知：未返回登记预算"
                        : approvedMemory + " MiB / 设备",
                  },
                  {
                    label: "显存分配单位",
                    value: memoryBlock === undefined ? "未知：接口尚未返回" : memoryBlock + " MiB",
                  },
                  {
                    label: "每卡最大共享份数",
                    value: splitCount === undefined ? "未知：接口尚未返回" : splitCount,
                  },
                  {
                    label: "核心预算累加",
                    value:
                      coreAdditive === undefined
                        ? "未知：接口尚未返回"
                        : coreAdditive
                          ? "是"
                          : "否",
                  },
                  ...(approvedMemory === undefined && observed?.maxMemoryMiBPerDevice !== undefined
                    ? [
                        {
                          label: "当前供给查询预算",
                          value: observed.maxMemoryMiBPerDevice + " MiB / 设备（不代替已登记预算）",
                        },
                      ]
                    : []),
                  ...(physical
                    ? [
                        {
                          label: "整卡规格显存",
                          value:
                            facts.protocol.memoryMiBPerDevice === undefined
                              ? "未知：需要已登记整卡预算"
                              : facts.protocol.memoryMiBPerDevice + " MiB / 设备",
                        },
                      ]
                    : []),
                ]
              : []),
          ]}
        />
      </section>
      {facts.notes.length || facts.hasMore ? (
        <div className="flex flex-col gap-1 text-xs text-(--color-text-3)">
          {facts.notes.map((note) => (
            <div key={note}>{note}</div>
          ))}
          {facts.hasMore ? (
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span>已加载部分供给记录，可继续查询后续页，补齐所选节点事实。</span>
              <Button
                type="text"
                disabled={facts.loading || Boolean(facts.error)}
                onClick={() => onLoadMore().catch(() => undefined)}
              >
                继续查询供给
              </Button>
            </div>
          ) : null}
        </div>
      ) : null}
      <section>
        <Typography.Text bold>本次规格策略</Typography.Text>
        <div className="mt-4">
          <Form.Item
            field="profile_name"
            label="GPU 规格名称"
            rules={[
              { required: true, match: /\S/, message: "请输入规格名称" },
              {
                validator: (value: string | undefined, callback) =>
                  callback(
                    [...(value?.trim() ?? "")].length > 128 || /[\0\r\n]/.test(value ?? "")
                      ? "规格名称应为不超过 128 字的单行文本"
                      : undefined,
                  ),
              },
            ]}
          >
            <Input placeholder="请输入规格名称" />
          </Form.Item>
          <Form.Item
            hidden={!nvidia && supported.length <= 1}
            field="allocation_type"
            label={nvidia ? "供给方式" : "分配方式"}
            rules={[{ required: true, message: "请选择分配方式" }]}
            extra={
              nvidia && !supported.includes("PHYSICAL")
                ? "当前所选供给为共享配置；整卡需选择支持整卡的已登记供给。"
                : undefined
            }
          >
            <Select
              filterOption={false}
              options={
                nvidia
                  ? [
                      {
                        label: "整卡",
                        value: "PHYSICAL",
                        disabled: !supported.includes("PHYSICAL"),
                      },
                      {
                        label: "固定切片",
                        value: "DYNAMIC_SHARED",
                        disabled: !supported.includes("DYNAMIC_SHARED"),
                      },
                    ]
                  : supported.map((type) => ({
                      label: formatGpuAllocationType(type),
                      value: type,
                    }))
              }
            />
          </Form.Item>
          {facts.resourceOptions.length > 1 ? (
            <Form.Item
              field="resource_key"
              label="资源类型"
              rules={[
                { required: true, message: "请选择实际资源类型" },
                {
                  validator: (value: string | undefined, callback) =>
                    callback(
                      value && !facts.resourceOptions.some((option) => option.key === value)
                        ? "请选择接口返回的实际资源类型"
                        : undefined,
                    ),
                },
              ]}
              extra="仅列出所选节点共同支持的真实资源类型。"
            >
              <Select
                options={facts.resourceOptions.map((option) => ({
                  value: option.key,
                  label: option.label,
                }))}
              />
            </Form.Item>
          ) : null}
          {physical && maxDevices > 1 ? (
            <Form.Item
              field="max_devices_per_replica"
              label="每副本最多申请设备数"
              rules={[
                {
                  required: true,
                  type: "number",
                  min: 1,
                  max: maxDevices,
                  message: "设备数须为 1–" + maxDevices + " 的整数",
                },
                {
                  validator: (value: number | undefined, callback) =>
                    callback(
                      value == null || Number.isInteger(value) ? undefined : "设备数须为整数",
                    ),
                },
              ]}
              extra={
                registered
                  ? "不超过已登记设备上限，本次初始化最多支持 16 个设备。"
                  : "本次初始化最多支持 16 个设备；实际登记上限由后端复核。"
              }
            >
              <InputNumber precision={0} min={1} max={maxDevices} />
            </Form.Item>
          ) : (
            <Descriptions
              className="mb-5"
              column={1}
              data={[
                {
                  label: "每副本申请设备数",
                  value: physical ? "1 个设备（已登记上限为 1）" : "1 个设备（当前分配方式固定）",
                },
              ]}
            />
          )}
          {nvidia && shared ? <NvidiaFixedProfileFields preview={nvidiaPreview} /> : null}
        </div>
      </section>
      <Collapse>
        <Collapse.Item name="observed-devices" header="节点设备观测（只读）">
          <div className="flex flex-col gap-4">
            <Typography.Text type="secondary" className="text-xs!">
              以下为设备实际观测；设备显存和 CU 不等同于规格申请预算，未知值不会填写为 0。
            </Typography.Text>
            {facts.nodes.map((node, nodeIndex) => (
              <div key={node.node?.uid ?? nodeIndex}>
                <Typography.Text bold>{node.node?.name || "未知节点"}</Typography.Text>
                {node.devices?.length ? (
                  node.devices.map((device, deviceIndex) => (
                    <Descriptions
                      key={device.device_uid || deviceIndex}
                      className="mt-3"
                      column={1}
                      data={[
                        {
                          label: "设备",
                          value: <span className="break-all">{device.device_uid || "未知"}</span>,
                        },
                        { label: "型号", value: device.model_key || "未知" },
                        { label: "设备类别", value: device.device_kind || "未知" },
                        { label: "适配器", value: device.adapter_id || "未知" },
                        {
                          label: "设备资源键",
                          value: (
                            <span className="break-all">{device.resource_key || "未返回"}</span>
                          ),
                        },
                        {
                          label: "父设备",
                          value: (
                            <span className="break-all">
                              {device.parent_device_uid || "未返回"}
                            </span>
                          ),
                        },
                        {
                          label: "观测显存",
                          value:
                            device.memory_capacity_bytes == null
                              ? "未知：接口尚未返回"
                              : device.memory_capacity_bytes + " bytes",
                        },
                        {
                          label: "观测计算单元",
                          value:
                            device.compute_units == null
                              ? "未知：接口尚未返回"
                              : device.compute_units + " CU",
                        },
                        { label: "PCI 地址", value: device.pci_bdf || "未知" },
                        { label: "健康观测", value: device.health || "未知" },
                        {
                          label: "观测时间",
                          value: formatDateTime(
                            device.observation?.observed_at,
                            "未知：未返回观测时间",
                          ),
                        },
                        {
                          label: "观测完整性",
                          value:
                            device.observation?.complete === undefined
                              ? "未知"
                              : device.observation.complete
                                ? "完整"
                                : "不完整",
                        },
                        ...(device.observation?.issues?.length
                          ? [{ label: "观测说明", value: device.observation.issues.join("、") }]
                          : []),
                      ]}
                    />
                  ))
                ) : (
                  <div className="mt-2 text-xs text-(--color-text-3)">未返回设备观测明细。</div>
                )}
              </div>
            ))}
          </div>
        </Collapse.Item>
      </Collapse>
      <div className="flex items-start gap-2 text-xs text-(--color-text-3)">
        <IconInfoCircle className="mt-0.5 shrink-0" />
        <span>
          {fixed
            ? "固定片的资源键、显存和 CU 使用真实供给事实；本操作只创建规格，不会在宿主机切卡。"
            : nvidia && shared
              ? "固定切片规格由所选等分方案生成，显存与算力限额不单独填写。"
              : "整卡规格只设置申请设备数，设备事实自动读取；当前空闲容量不作为目录初始化门槛。"}
        </span>
      </div>
    </div>
  );
}
