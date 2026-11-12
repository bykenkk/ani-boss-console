import {
  Alert,
  Checkbox,
  Collapse,
  Descriptions,
  Form,
  Input,
  InputNumber,
  Select,
  Typography,
} from "@arco-design/web-react";
import type { GpuSupplyCandidate } from "@/api/accelerator";
import type { SupplyCandidate } from "@/api/accelerator/types-group-policy";
import { formatGpuAllocationType } from "../../capacity";
import {
  formatSupplyField,
  formatSupplyReason,
  missingSupplyRegistrationFacts,
  supplyDeclarationFields,
  type SupplyCandidateDraft,
} from "../registration";

interface RegistrationDetailsProps {
  candidate: GpuSupplyCandidate;
  draft: SupplyCandidateDraft;
  onChange: (draft: SupplyCandidateDraft) => void;
  disabled?: boolean;
  factsOnly?: false;
}

type GpuSupplyCandidateDetailsProps =
  | RegistrationDetailsProps
  | { candidate: SupplyCandidate; factsOnly: true };

function factValue(value: string | number | boolean | null | undefined): string {
  if (value == null) return "未获取";
  if (value === "") return "未指定（已获取）";
  if (typeof value === "boolean") return value ? "是（true）" : "否（false）";
  return String(value);
}

export function GpuSupplyCandidateDetails(props: GpuSupplyCandidateDetailsProps) {
  if (props.factsOnly) {
    return (
      <GpuSupplyCandidateFacts
        candidate={props.candidate}
        missingFields={(props.candidate.missing_fields ?? []).filter(
          (field) => field !== "core_budget_additive",
        )}
      />
    );
  }
  return <GpuSupplyRegistrationDetails {...props} />;
}

function GpuSupplyCandidateFacts({
  candidate,
  missingFields,
}: {
  candidate: GpuSupplyCandidate | SupplyCandidate;
  missingFields: string[];
}) {
  const nvidia =
    "source_kind" in candidate
      ? candidate.source_kind === "PLUGIN"
      : candidate.adapter_id === "volcano-hami-mib-v1";
  const kindLabel =
    "source_kind" in candidate
      ? {
          PLUGIN: "插件供给（组策略在初始化时选择）",
          NATIVE_WHOLE: "原生整卡",
          NATIVE_FIXED_PARTITION: "原生固定切片",
        }[candidate.source_kind]
      : formatGpuAllocationType(candidate.allocation_type);
  const observedFacts = [
    { label: "节点", value: candidate.node.name },
    { label: "节点 UID", value: candidate.node.uid },
    { label: "适配器", value: candidate.adapter_id },
    { label: "供给类型", value: kindLabel },
    { label: "扩展资源名称", value: candidate.resource_key },
    { label: "设备型号标识", value: candidate.model_key || "未获取" },
    { label: "设备显存容量（Bytes）", value: factValue(candidate.memory_capacity_bytes) },
    { label: "每设备计算单元（CU）", value: factValue(candidate.compute_units_per_device) },
    ...supplyDeclarationFields
      .filter(
        ({ field }) =>
          !["model_key", "memory_capacity_bytes", "compute_units_per_device"].includes(field) &&
          (nvidia || field === "runtime_class_name") &&
          !(field === "core_budget_additive" && candidate.core_budget_additive == null),
      )
      .map(({ field, label }) => ({
        label:
          "source_kind" in candidate && field === "split_count"
            ? "单卡实际注册槽数（K）"
            : "source_kind" in candidate && field === "core_budget_additive"
              ? "历史算力预算声明（legacy）"
              : label,
        value: factValue(candidate[field]),
      })),
    ...((candidate.runtime_class_candidates ?? []).length
      ? [{ label: "已发现运行时选项", value: candidate.runtime_class_candidates?.join("、") }]
      : []),
    ...((candidate.device_uids ?? []).length
      ? [{ label: "设备 UID", value: candidate.device_uids?.join("\n") }]
      : []),
  ];

  return (
    <div className="flex min-w-0 flex-col gap-5">
      <section className="flex min-w-0 flex-col gap-3">
        <Typography.Text bold>{candidate.node.name} · 已收集事实</Typography.Text>
        <Descriptions
          column={2}
          size="small"
          data={observedFacts.map(({ label, value }) => ({
            label,
            value: <span className="whitespace-pre-wrap break-all">{value}</span>,
          }))}
        />
        <p className="m-0 text-xs text-(--color-text-3)">
          设备与安装参数由接口自动带出，保持只读；未获取不代表数值为 0 或 false，
          也不能在这里补成默认值。
        </p>
      </section>

      {"devices" in candidate && candidate.devices?.length ? (
        <section className="flex flex-col gap-3">
          <Typography.Text bold>设备身份与片型事实</Typography.Text>
          {candidate.devices.map((device) => (
            <Descriptions
              key={device.device_uid}
              column={2}
              size="small"
              data={[
                { label: "设备 UID", value: device.device_uid },
                { label: "设备类型", value: device.device_kind },
                { label: "父设备 UID", value: factValue(device.parent_device_uid) },
                { label: "实际显存（Bytes）", value: factValue(device.memory_capacity_bytes) },
                { label: "计算单元（CU）", value: factValue(device.compute_units) },
              ].map(({ label, value }) => ({
                label,
                value: <span className="whitespace-pre-wrap break-all">{value}</span>,
              }))}
            />
          ))}
        </section>
      ) : null}

      {(candidate.blocking_reasons ?? []).length ? (
        <Alert
          type="warning"
          title="当前供给存在阻塞项"
          content={
            <ul className="m-0 list-inside list-disc">
              {candidate.blocking_reasons?.map((reason) => (
                <li key={reason}>{formatSupplyReason(reason)}</li>
              ))}
            </ul>
          }
        />
      ) : null}

      <Collapse bordered={false}>
        <Collapse.Item
          name="sources"
          header={`查看采集来源（${(candidate.sources ?? []).length}项）`}
        >
          {(candidate.sources ?? []).length ? (
            <dl className="m-0 grid gap-3 text-sm">
              {candidate.sources?.map((source, index) => (
                <div key={`${source.field}:${source.source}:${index}`} className="min-w-0">
                  <dt className="text-(--color-text-2)">
                    {formatSupplyField(source.field)} ·{" "}
                    {source.source === "AUTOMATIC_OBSERVATION"
                      ? "自动观测"
                      : source.source === "MANUAL_DECLARATION"
                        ? "人工声明"
                        : source.source}
                  </dt>
                  <dd className="m-0 whitespace-pre-wrap break-all text-(--color-text-3)">
                    {source.ref || "未提供出处"}
                  </dd>
                </div>
              ))}
            </dl>
          ) : (
            <Typography.Text type="secondary">未提供事实来源</Typography.Text>
          )}
        </Collapse.Item>
      </Collapse>

      {missingFields.length ? (
        <Alert
          type="warning"
          title="本次新登记所需事实尚未取得"
          content={`未获取：${missingFields.map(formatSupplyField).join("、")}。请核实设备观测或插件配置后重新查询；此检查不影响使用已有有效供给继续初始化。`}
        />
      ) : null}
    </div>
  );
}

function GpuSupplyRegistrationDetails({
  candidate,
  draft,
  onChange,
  disabled = false,
}: RegistrationDetailsProps) {
  const missing = missingSupplyRegistrationFacts(candidate, draft).filter(
    (field) => field !== "core_budget_additive",
  );
  const runtimeUnknown = candidate.runtime_class_name == null;
  const nvidia = candidate.adapter_id === "volcano-hami-mib-v1";
  return (
    <div className="flex min-w-0 flex-col gap-5">
      <GpuSupplyCandidateFacts candidate={candidate} missingFields={missing} />
      <section className="flex flex-col gap-3">
        <Typography.Text bold>登记设置</Typography.Text>
        <Form.Item
          label="登记名称"
          extra="配置兼容且名称相同的节点会合并登记；名称不同则分别登记，之后分别纳入供给组。"
        >
          <Input
            aria-label="登记名称"
            placeholder={`${candidate.model_key || "GPU"} ${formatGpuAllocationType(candidate.allocation_type)}供给`}
            value={draft.displayName ?? ""}
            disabled={disabled}
            onChange={(displayName) => onChange({ ...draft, displayName })}
          />
        </Form.Item>
        {nvidia && candidate.core_budget_additive == null ? (
          <Form.Item
            label="按总算力预算计算容量"
            required
            extra="请按已验证的调度策略选择：是表示按每张卡 100% 的总算力预算估算容量；否表示仅按显存和分配份数估算。不会修改集群调度配置。"
          >
            <Select
              aria-label="按总算力预算计算容量"
              placeholder="请选择算力预算策略"
              value={
                draft.coreBudgetAdditive === undefined
                  ? undefined
                  : String(draft.coreBudgetAdditive)
              }
              disabled={disabled}
              options={[
                { value: "true", label: "是，按总算力预算估算" },
                { value: "false", label: "否，仅按显存和分配份数估算" },
              ]}
              onChange={(value) => onChange({ ...draft, coreBudgetAdditive: value === "true" })}
            />
          </Form.Item>
        ) : null}
        {candidate.allocation_type === "PHYSICAL" ? (
          <Form.Item
            label="登记每副本设备上限"
            extra="这是管理员设置的供给上限；初始化页面当前每副本最多 16 个设备。"
          >
            <InputNumber
              aria-label="登记每副本设备上限"
              min={1}
              max={nvidia ? 2147483647 : 4294967295}
              precision={0}
              value={draft.maxDevicesPerReplica ?? 1}
              disabled={disabled}
              onChange={(maxDevicesPerReplica) => onChange({ ...draft, maxDevicesPerReplica })}
            />
          </Form.Item>
        ) : (
          <Descriptions
            column={1}
            size="small"
            data={[{ label: "每副本设备上限", value: "1（供给合同限定）" }]}
          />
        )}
        {runtimeUnknown && candidate.runtime_class_candidates.length > 0 ? (
          <Form.Item
            label="运行时选择"
            required={nvidia}
            extra="仅列出集群实际已有的类别，是否用于本供给由管理员选择，不会自动替换设备事实。"
          >
            <Select
              aria-label="运行时选择"
              placeholder={nvidia ? "请选择实际已发现的运行时" : "可不指定，沿用海光默认行为"}
              value={draft.runtimeClassName}
              disabled={disabled}
              allowClear={!nvidia}
              options={candidate.runtime_class_candidates.map((value) => ({ value, label: value }))}
              onChange={(runtimeClassName) => onChange({ ...draft, runtimeClassName })}
            />
          </Form.Item>
        ) : runtimeUnknown && nvidia ? (
          <Alert
            type="warning"
            content="尚无可选择的运行时，本次 NVIDIA 新登记需核实集群运行时配置后重新查询。已有有效供给不受本次候选缺项影响。"
          />
        ) : runtimeUnknown ? (
          <Typography.Text type="secondary">
            未指定运行时；海光供给合同允许省略此项。
          </Typography.Text>
        ) : null}
      </section>

      {candidate.resource_mapping_required ? (
        <section className="flex flex-col gap-3">
          <Typography.Text bold>确认资源对应关系</Typography.Text>
          <Checkbox
            checked={draft.mappingConfirmed ?? false}
            disabled={disabled}
            onChange={(mappingConfirmed) => onChange({ ...draft, mappingConfirmed })}
          >
            已核实 {candidate.resource_key} 对应本节点的
            {formatGpuAllocationType(candidate.allocation_type)}设备
          </Checkbox>
        </section>
      ) : null}
    </div>
  );
}
