import {
  gpuScopeKey,
  requireGpuSupplyTarget,
  type GpuOperationScope,
} from "@/api/accelerator/scope";
import { useState } from "react";
import { Alert, Button, Collapse, Input, Select } from "@arco-design/web-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useStore } from "zustand";
import {
  getSupplyConfiguration,
  getGpuSupplyRegistration,
  registerSupplyConfiguration,
} from "@/api/accelerator";
import { DataTable } from "@/components/common";
import {
  gpuSupplyRegistrationIntents,
  rememberGpuSupplyRegistration,
  setGpuPolicySupplyRegistrationIntent,
} from "@/stores/gpu-supply-registration";
import { withId } from "@/lib/id";
interface SupplyConfigurationRecoveryProps {
  scope: GpuOperationScope;
  onSelect: (providerRef: string) => void;
}
const emptyReferences: Record<string, string> = {};
export function SupplyConfigurationRecovery({ scope, onSelect }: SupplyConfigurationRecoveryProps) {
  const client = useQueryClient();
  const connectionRef = scope.connection_ref;
  const scopeKey = gpuScopeKey(scope);
  const references = useStore(
    gpuSupplyRegistrationIntents,
    (state) => state.registrations[scopeKey] ?? emptyReferences,
  );
  const pending = useStore(gpuSupplyRegistrationIntents, (state) => state.policyInputs[scopeKey]);
  const [providerRef, setProviderRef] = useState("");
  const [lookupRef, setLookupRef] = useState("");
  const [receiptId, setReceiptId] = useState("");
  const configuration = useQuery({
    queryKey: ["accelerator", "supply-configuration", scopeKey, providerRef],
    queryFn: async ({ signal }) =>
      requireGpuSupplyTarget(
        await getSupplyConfiguration(connectionRef, providerRef, signal),
        scope,
      ),
    enabled: Boolean(providerRef),
    meta: {
      errorNotification: {
        id: withId("gpu-supply-configuration", providerRef),
        action: "已登记供给读取",
      },
    },
  });
  const receipt = useQuery({
    queryKey: ["accelerator", "supply-registration", scopeKey, receiptId],
    queryFn: async ({ signal }) =>
      requireGpuSupplyTarget(await getGpuSupplyRegistration(receiptId, signal), scope),
    enabled: Boolean(receiptId),
    meta: {
      errorNotification: {
        id: withId("gpu-supply-registration", receiptId),
        action: "原供给登记收据读取",
      },
    },
  });
  const replay = useMutation({
    mutationFn: () => {
      if (!pending) throw new Error("未找到原登记提交");
      return registerSupplyConfiguration(pending, scope);
    },
    retry: false,
    meta: {
      feedback: { channel: "message", action: "恢复原供给登记", successText: "原供给登记已确认" },
    },
    onSuccess: async (result) => {
      rememberGpuSupplyRegistration(
        { ...result, configurations: result.configurations ?? [] },
        scope,
      );
      setGpuPolicySupplyRegistrationIntent(scope);
      await client.invalidateQueries({
        queryKey: ["accelerator", "discovered-nodes", scopeKey],
      });
      const ref = result.configurations?.[0]?.provider_config_ref;
      if (ref) setProviderRef(ref);
    },
  });
  return (
    <Collapse bordered={false} defaultActiveKey={pending ? ["recovery"] : []}>
      <Collapse.Item name="recovery" header="恢复已有供给引用 / 原登记收据">
        <div className="flex flex-col gap-3">
          <Alert
            type="info"
            content="本浏览器之前保存的供给引用继续可选。配置始终按连接与引用从数据库重新读取，不用旧页面事实重建登记。"
          />
          {pending ? (
            <div className="flex flex-col gap-2">
              <Alert
                type="warning"
                content="发现此前结果未确认的登记，原正文和原 API 作用域保留，可按原文确认。新格式登记不会改写该请求。"
              />
              <div>
                <Button loading={replay.isPending} onClick={() => replay.mutate()}>
                  重发原供给登记请求
                </Button>
              </div>
            </div>
          ) : null}
          {Object.keys(references).length ? (
            <Select
              aria-label="浏览器保存的供给引用"
              value={providerRef || undefined}
              options={Object.keys(references)}
              onChange={(ref) => {
                setProviderRef(ref);
                setLookupRef(ref);
              }}
              placeholder="选择此前已登记的供给引用"
            />
          ) : null}
          <div className="flex gap-3">
            <Input
              aria-label="供给引用读取"
              value={lookupRef}
              onChange={setLookupRef}
              placeholder="也可填写已知 provider_config_ref"
            />
            <Button disabled={!lookupRef.trim()} onClick={() => setProviderRef(lookupRef.trim())}>
              读取供给引用
            </Button>
            <Button
              disabled={!providerRef || !references[providerRef]}
              onClick={() => setReceiptId(references[providerRef])}
            >
              查看原登记收据
            </Button>
          </div>
          {configuration.data ? (
            <div className="flex flex-col gap-2">
              <div className="break-all">
                登记 ID：{configuration.data.registration_id} · 供给：
                {configuration.data.provider_config_ref} · v{configuration.data.version}
              </div>
              <div>
                <Button
                  type="primary"
                  onClick={() => onSelect(configuration.data!.provider_config_ref)}
                >
                  选用此登记并继续
                </Button>
              </div>
            </div>
          ) : null}
          {receipt.data ? (
            <DataTable
              header={{ title: "原登记收据中的供给" }}
              rowKey="provider_config_ref"
              data={receipt.data.configurations}
              pagination={false}
              columns={[
                { title: "登记名称", dataIndex: "display_name", width: 200 },
                { title: "供给引用", dataIndex: "provider_config_ref", width: 280 },
                { title: "登记版本", dataIndex: "version", width: 120 },
              ]}
              rowActions={[
                {
                  key: "select",
                  label: "按双引用读取",
                  disabled: (row) => row.connection_ref !== connectionRef,
                  onClick: (row) => setProviderRef(row.provider_config_ref),
                },
              ]}
            />
          ) : null}
        </div>
      </Collapse.Item>
    </Collapse>
  );
}
