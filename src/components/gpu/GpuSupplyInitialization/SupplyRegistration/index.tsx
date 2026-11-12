import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Alert, Button, Checkbox, Form, Input, InputNumber, Select } from "@arco-design/web-react";
import { DataTable, type ListColumn } from "@/components/common";
import {
  listSupplyCandidates,
  registerSupplyConfiguration,
  type RegisteredSupplyConfiguration,
  type RegisterSupplyConfigurationInput,
  type SupplyCandidate,
  type SupplyDeclaration,
} from "@/api/accelerator";
import { withId } from "@/lib/id";
import { ApiError } from "@/api/request";
import { supplyReasonText } from "../reasons";
import { GpuSupplyCandidateDetails } from "../../PrepareGpuSupplyModal/GpuSupplyCandidateDetails";
import {
  buildSupplyRegistrationInput,
  commonSupplyRuntimes,
  requiredSupplyDeclarationFields,
  supplyDeclarationLabels,
  supplyRegistrationProblems,
} from "./registration";
interface SupplyRegistrationProps {
  connectionRef: string;
  onRegistered: (configuration: RegisteredSupplyConfiguration) => void;
}
const columns: ListColumn<SupplyCandidate>[] = [
  { title: "节点", dataIndex: "node.name", width: 200 },
  { title: "型号", dataIndex: "model_key", width: 200 },
  {
    title: "来源 / 资源键",
    width: 260,
    render: (_, row) => (
      <div>
        {row.source_kind}
        <br />
        {row.resource_key}
      </div>
    ),
  },
  {
    title: "原生设备 / 父卡",
    width: 280,
    render: (_, row) =>
      (row.devices ?? []).map((device) => (
        <div key={device.device_uid}>
          {device.device_kind}: {device.device_uid}
          {device.parent_device_uid ? ` / 父卡 ${device.parent_device_uid}` : ""}
          <br />
          {device.memory_capacity_bytes === undefined
            ? "显存未知"
            : `${device.memory_capacity_bytes} bytes`}{" "}
          · {device.compute_units === undefined ? "CU 未知" : `${device.compute_units} CU`}
        </div>
      )),
  },
  {
    title: "插件静态参数",
    width: 220,
    render: (_, row) => (
      <div>
        F: {row.memory_block_mib ?? "未知"} MiB/块 · K: {row.split_count ?? "未知"}
        <br />
        有效预算: {row.max_memory_mib_per_device ?? "未知"} MiB
      </div>
    ),
  },
  {
    title: "缺项 / 不可用原因",
    width: 320,
    render: (_, row) => (
      <div>
        {(row.missing_fields ?? []).filter((field) => field !== "core_budget_additive").join("、")}
        {(row.blocking_reasons ?? []).map((reason) => (
          <div key={reason}>{supplyReasonText(reason)}</div>
        ))}
      </div>
    ),
  },
  {
    title: "事实来源",
    width: 280,
    render: (_, row) =>
      (row.sources ?? []).map((source, index) => (
        <div key={index}>
          {source.field}: {source.source}
          {source.ref ? ` / ${source.ref}` : ""}
        </div>
      )),
  },
];
export function SupplyRegistration({ connectionRef, onRegistered }: SupplyRegistrationProps) {
  const client = useQueryClient();
  const [page, setPage] = useState(1);
  const [selection, setSelection] = useState<{ revision: string; rows: SupplyCandidate[] }>({
    revision: "",
    rows: [],
  });
  const [name, setName] = useState("");
  const [runtime, setRuntime] = useState("");
  const [maxDevices, setMaxDevices] = useState(1);
  const [declarations, setDeclarations] = useState<SupplyDeclaration[]>([]);
  const [mappingConfirmed, setMappingConfirmed] = useState(false);
  const [mappingSource, setMappingSource] = useState("");
  const [pending, setPending] = useState<RegisterSupplyConfigurationInput>();
  const query = useQuery({
    queryKey: ["accelerator", "supply-candidates", connectionRef, page],
    queryFn: ({ signal }) =>
      listSupplyCandidates({ connection_ref: connectionRef, page, pageSize: 20 }, signal),
    enabled: !pending,
    meta: {
      errorNotification: {
        id: withId("gpu-supply-candidates", connectionRef),
        action: "GPU 供给发现",
      },
    },
  });
  const discoveryError = query.error instanceof ApiError ? query.error : undefined;
  const revision = query.data?.discovery_revision ?? "";
  if (!pending && selection.revision !== revision) {
    setSelection({ revision, rows: [] });
    setDeclarations([]);
    setMappingConfirmed(false);
    setMappingSource("");
    setRuntime("");
  }
  const selected = selection.revision === revision ? selection.rows : [];
  const setSelected = (rows: SupplyCandidate[]) => setSelection({ revision, rows });
  const plugin = selected[0]?.source_kind === "PLUGIN";
  const nativeFixed = selected[0]?.source_kind === "NATIVE_FIXED_PARTITION";
  const mappingRequired = selected.some((candidate) => candidate.resource_mapping_required);
  const runtimeOptions = commonSupplyRuntimes(selected);
  const knownRuntime = selected[0]?.runtime_class_name;
  const effectiveRuntime =
    runtime ||
    (knownRuntime != null &&
    selected.every((candidate) => candidate.runtime_class_name === knownRuntime)
      ? knownRuntime
      : "");
  const requiredFields = requiredSupplyDeclarationFields(selected);
  const registrationForm = {
    connectionRef,
    discoveryRevision: revision,
    selected,
    name,
    runtime: effectiveRuntime,
    maxDevices,
    declarations,
    mappingConfirmed,
    mappingSource,
  };
  const registrationProblems = supplyRegistrationProblems(registrationForm);
  const mutation = useMutation({
    mutationFn: registerSupplyConfiguration,
    retry: false,
    onMutate: (input: RegisterSupplyConfigurationInput) => setPending(input),
    onError: (error) => {
      if (
        error instanceof ApiError &&
        error.status &&
        error.status >= 400 &&
        error.status < 500 &&
        error.status !== 408
      )
        setPending(undefined);
    },
    meta: { feedback: { channel: "message", action: "GPU 供给登记", successText: "供给已登记" } },
    onSuccess: async (result) => {
      setPending(undefined);
      await client.invalidateQueries({
        queryKey: ["accelerator", "discovered-nodes", connectionRef],
      });
      setSelected([]);
      const configuration = result.configurations?.[0];
      if (configuration) onRegistered(configuration);
    },
  });
  const busy = Boolean(pending) || mutation.isPending;
  const updateDeclaration = (index: number, patch: Partial<SupplyDeclaration>) =>
    setDeclarations((rows) => rows.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  return (
    <div className="flex flex-col gap-4">
      <Alert
        type="info"
        content="已有登记可直接进入下一步。供给发现只读；实际驱动、插件和分区由集群运维维护。"
      />
      {query.isError ? (
        <Alert
          type="error"
          title="供给发现请求失败"
          content={
            <div>
              <div>
                {query.error instanceof Error ? query.error.message : "供给发现请求失败，请重试。"}
              </div>
              {discoveryError?.reason ? (
                <div>原因：{supplyReasonText(discoveryError.reason)}</div>
              ) : null}
              {discoveryError?.requestId ? <div>请求 ID：{discoveryError.requestId}</div> : null}
            </div>
          }
        />
      ) : null}
      {query.isSuccess && !query.data?.items?.length ? (
        <Alert
          type="info"
          content="供给发现已完成，当前查询范围没有可展示的供给候选。请结合检查项核对采集范围和设备事实。"
        />
      ) : null}
      {(query.data?.checks ?? []).map((check) => (
        <div key={`${check.key}:${check.source}`}>
          {check.key} · {check.state}
          {check.reason ? ` · ${supplyReasonText(check.reason)}` : ""}
        </div>
      ))}
      <DataTable
        rowKey="candidate_id"
        columns={columns}
        data={query.data?.items ?? []}
        loading={query.isFetching}
        tableLabel="GPU 供给候选"
        header={{
          title: "发现的供给",
          extra: (
            <Button onClick={() => query.refetch()} loading={query.isFetching} disabled={busy}>
              刷新发现
            </Button>
          ),
        }}
        pagination={
          pending
            ? false
            : {
                page,
                pageSize: 20,
                total: Number(query.data?.total ?? 0),
                onPageChange: (next) => {
                  setPage(next);
                  setSelected([]);
                },
                onPageSizeChange: () => {},
                pageSizeOptions: [20],
              }
        }
        rowSelection={{
          checkboxProps: () => ({ disabled: busy }),
          selectedRowKeys: selected.map((candidate) => candidate.candidate_id),
          onChange: (_keys, rows) => {
            setSelected(rows);
            setRuntime("");
            setDeclarations(
              requiredSupplyDeclarationFields(rows).map((field) => ({
                field,
                value: "",
                source: "",
              })),
            );
            setMappingConfirmed(false);
            setMappingSource("");
          },
        }}
      />
      {selected.map((candidate) => (
        <GpuSupplyCandidateDetails key={candidate.candidate_id} candidate={candidate} factsOnly />
      ))}
      <Form layout="vertical" disabled={busy}>
        <div className="grid grid-cols-2 gap-x-4">
          <Form.Item label="登记名称" required>
            <Input aria-label="登记名称" value={name} onChange={setName} maxLength={64} />
          </Form.Item>
          <Form.Item
            label="运行时（所选节点的共同候选）"
            required={plugin}
            extra={
              plugin ? "插件供给必须选择共同运行时。" : "原生供给可留空，沿用后端批准的默认行为。"
            }
          >
            <Select
              value={effectiveRuntime || undefined}
              onChange={setRuntime}
              options={runtimeOptions}
              allowClear={!plugin}
              disabled={busy}
              placeholder={plugin ? "选择所有所选节点均可用的运行时" : "可留空"}
            />
          </Form.Item>
          <Form.Item
            label={plugin ? "批准的整卡单副本张数上限" : "单副本设备数上限"}
            extra={plugin ? "此值只批准整卡张数，共享策略仍每副本一份。" : undefined}
          >
            <InputNumber
              value={nativeFixed ? 1 : maxDevices}
              min={1}
              max={plugin ? 2147483647 : 4294967295}
              precision={0}
              disabled={busy || nativeFixed}
              onChange={setMaxDevices}
            />
          </Form.Item>
        </div>
        {mappingRequired ? (
          <>
            <Checkbox disabled={busy} checked={mappingConfirmed} onChange={setMappingConfirmed}>
              确认扩展资源键与所示设备类型的对应关系
            </Checkbox>
            <Form.Item label="资源键映射依据" required>
              <Input value={mappingSource} onChange={setMappingSource} />
            </Form.Item>
          </>
        ) : null}
        {requiredFields.length ? (
          <Alert
            type="warning"
            title="所选供给缺少必要事实"
            content={
              <div>
                请为下列缺项填写真实值及来源；未补齐不能登记，不会自动补入布尔值或预算：
                {requiredFields.map((field) => (
                  <div key={field}>
                    {supplyDeclarationLabels[field]}（{field}）
                  </div>
                ))}
              </div>
            }
          />
        ) : null}
        <Form.Item
          label="必要的人工声明"
          extra="缺项自动列出字段，值与来源由管理员依据真实配置填写。声明不能覆盖已知事实或消除已知片型冲突。"
        >
          <div className="flex flex-col gap-3">
            {declarations.map((row, index) =>
              row.field === "core_budget_additive" ? (
                <div key={index} className="rounded border border-[var(--color-border-2)] p-3">
                  <div>历史声明（legacy）：core_budget_additive = {row.value || "-"}</div>
                  <div className="mt-1 text-xs text-[var(--color-text-3)]">
                    该字段不再用于新登记，请移除后继续。旧登记和已受理请求保留原文。
                  </div>
                  <Button
                    className="mt-2"
                    disabled={busy}
                    onClick={() => setDeclarations((rows) => rows.filter((_, i) => i !== index))}
                  >
                    移除历史声明
                  </Button>
                </div>
              ) : (
                <div key={index} className="rounded border border-[var(--color-border-2)] p-3">
                  <div className="mb-2 flex items-center justify-between gap-3">
                    {requiredFields.includes(row.field as (typeof requiredFields)[number]) ? (
                      <span>
                        {supplyDeclarationLabels[row.field]}（{row.field}）· 必填
                      </span>
                    ) : (
                      <Select
                        aria-label={`声明字段 ${index + 1}`}
                        value={row.field || undefined}
                        options={Object.entries(supplyDeclarationLabels)
                          .filter(
                            ([field]) =>
                              field === row.field ||
                              !declarations.some((other) => other.field === field),
                          )
                          .map(([field, label]) => ({
                            value: field,
                            label: `${label}（${field}）`,
                          }))}
                        placeholder="选择需要补充的字段"
                        onChange={(field) =>
                          updateDeclaration(index, { field, value: "", source: "" })
                        }
                      />
                    )}
                    {requiredFields.includes(
                      row.field as (typeof requiredFields)[number],
                    ) ? null : (
                      <Button
                        disabled={busy}
                        onClick={() =>
                          setDeclarations((rows) => rows.filter((_, i) => i !== index))
                        }
                      >
                        移除
                      </Button>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <Input
                      aria-label={`声明值 ${index + 1}`}
                      placeholder="真实值（value）"
                      value={row.value}
                      maxLength={256}
                      onChange={(value) => updateDeclaration(index, { value })}
                    />
                    <Input
                      aria-label={`声明来源 ${index + 1}`}
                      placeholder="配置位置、变更记录等依据（source）"
                      value={row.source}
                      maxLength={512}
                      onChange={(source) => updateDeclaration(index, { source })}
                    />
                  </div>
                </div>
              ),
            )}
            <Button
              disabled={busy || declarations.length >= 8}
              onClick={() =>
                setDeclarations((rows) => [...rows, { field: "", value: "", source: "" }])
              }
            >
              添加其他声明
            </Button>
          </div>
        </Form.Item>
      </Form>
      {pending ? (
        <Alert
          type="warning"
          content="已冻结发送的登记正文。结果未确认时只按原文重试，不重新读取或更改设备事实。"
        />
      ) : null}
      {selected.length && registrationProblems.length && !pending ? (
        <div className="text-[var(--color-text-3)]">{registrationProblems[0]}</div>
      ) : null}
      <div>
        <Button
          type="primary"
          loading={mutation.isPending}
          disabled={
            mutation.isPending ||
            (!pending && (query.isFetching || query.isError || registrationProblems.length > 0))
          }
          onClick={() => mutation.mutate(pending ?? buildSupplyRegistrationInput(registrationForm))}
        >
          {pending ? "重发原登记请求" : "登记所选供给"}
        </Button>
      </div>
    </div>
  );
}
