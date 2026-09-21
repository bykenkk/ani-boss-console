import { Alert, Button, Form, InputNumber, Modal, Tabs } from "@arco-design/web-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import {
  fetchGpuInventory,
  fetchGpuOccupancy,
  fetchTenantGpuAllocations,
  gpuResourcePoolQueryKeys,
  updateTenantGpuQuota,
  updateTenantGpuReservation,
  type TenantGpuAllocation,
} from "@/api/gpu-inventory";
import { ListPageHeader } from "@/components/common";
import { showMessage } from "@/lib/feedback";
import { validateForm } from "@/lib/form";
import { GpuClusterPartitionFlow } from "../GpuClusterPartitionFlow";
import { GpuInventoryTable } from "../GpuInventoryTable";
import { GpuSummary } from "../GpuSummary";
import { TenantGpuAllocationTable } from "../TenantGpuAllocationTable";
import styles from "./index.module.less";

interface QuotaFormValues {
  total: number;
}

interface ReservationFormValues {
  allocatedGpuCount: number;
}

const TabPane = Tabs.TabPane;

export function GpuResourcePoolPage() {
  const queryClient = useQueryClient();
  const [quotaTarget, setQuotaTarget] = useState<TenantGpuAllocation | null>(null);
  const [reservationTarget, setReservationTarget] = useState<TenantGpuAllocation | null>(null);
  const [quotaForm] = Form.useForm<QuotaFormValues>();
  const [reservationForm] = Form.useForm<ReservationFormValues>();

  const inventoryQuery = useQuery({
    meta: {
      errorNotification: {
        id: "gpu-inventory",
        action: "GPU 设备库存加载",
        fallback: "请求失败，请稍后重试",
      },
    },
    queryKey: gpuResourcePoolQueryKeys.inventory,
    queryFn: fetchGpuInventory,
  });
  const occupancyQuery = useQuery({
    meta: {
      errorNotification: {
        id: "gpu-occupancy",
        action: "GPU 占用汇总加载",
        fallback: "请求失败，请稍后重试",
      },
    },
    queryKey: gpuResourcePoolQueryKeys.occupancy,
    queryFn: fetchGpuOccupancy,
  });
  const tenantsQuery = useQuery({
    meta: {
      errorNotification: {
        id: "tenant-gpu-allocations",
        action: "租户 GPU 台账加载",
        fallback: "请求失败，请稍后重试",
      },
    },
    queryKey: gpuResourcePoolQueryKeys.tenants,
    queryFn: fetchTenantGpuAllocations,
  });

  const refreshTenantLedger = () =>
    queryClient.invalidateQueries({
      queryKey: gpuResourcePoolQueryKeys.tenants,
    });

  const quotaMutation = useMutation({
    meta: {
      feedback: {
        channel: "message",
        action: "GPU 配额上限更新",
        successText: "GPU 配额上限已更新",
        errorFallback: "GPU 配额上限更新失败，请稍后重试",
      },
    },
    mutationFn: updateTenantGpuQuota,
    onSuccess: async () => {
      await refreshTenantLedger();
      setQuotaTarget(null);
      quotaForm.resetFields();
    },
  });

  const reservationMutation = useMutation({
    meta: {
      feedback: {
        channel: "message",
        action: "GPU 资源预留更新",
        successText: "GPU 资源预留已更新",
        errorFallback: "GPU 资源预留更新失败，请稍后重试",
      },
    },
    mutationFn: updateTenantGpuReservation,
    onSuccess: async () => {
      await refreshTenantLedger();
      setReservationTarget(null);
      reservationForm.resetFields();
    },
  });

  const refreshAll = async () => {
    await Promise.all([inventoryQuery.refetch(), occupancyQuery.refetch(), tenantsQuery.refetch()]);
  };

  const openQuotaModal = (tenant: TenantGpuAllocation) => {
    quotaForm.setFieldsValue({ total: tenant.quotaTotal });
    setQuotaTarget(tenant);
  };

  const openReservationModal = (tenant: TenantGpuAllocation) => {
    reservationForm.setFieldsValue({
      allocatedGpuCount: tenant.allocatedGpuCount,
    });
    setReservationTarget(tenant);
  };

  const submitQuota = async () => {
    const { total } = await validateForm<QuotaFormValues>(quotaForm);
    if (!quotaTarget) return;
    if (total < quotaTarget.allocatedGpuCount) {
      showMessage({
        type: "warning",
        content: `配额上限不能低于当前资源预留 ${quotaTarget.allocatedGpuCount} 张`,
      });
      return;
    }
    quotaMutation.mutate({ tenantId: quotaTarget.tenantId, total });
  };

  const submitReservation = async () => {
    const { allocatedGpuCount } = await validateForm<ReservationFormValues>(reservationForm);
    if (!reservationTarget) return;
    reservationMutation.mutate({
      tenantId: reservationTarget.tenantId,
      allocatedGpuCount,
    });
  };

  const refreshing =
    inventoryQuery.isFetching || occupancyQuery.isFetching || tenantsQuery.isFetching;
  const inventory = inventoryQuery.data?.items || [];
  const inventoryProfile = inventoryQuery.data?.profile;

  return (
    <div className={styles.page}>
      <ListPageHeader
        title="GPU资源池"
        subtitle="查看 GPU 库存与租户配额，并在集群上统一配置空闲整卡的切分规则。"
        extra={
          <Button loading={refreshing} onClick={() => void refreshAll()}>
            刷新
          </Button>
        }
      />

      <Alert
        type="info"
        content="集群切分会应用到所有空闲整卡，忙碌、离线或已切分节点会自动跳过。当前仍未提供指定物理卡分配、维护/恢复、平台级调度队列与资源池事件接口；库存中的租户/实例关系来自节点级占用推算，不能视为精确物理卡绑定。"
      />

      {inventoryProfile && !inventoryProfile.realProvider ? (
        <Alert
          type="warning"
          content={`当前库存来自开发 Provider“${inventoryProfile.provider || "-"}”，不是实际 Kubernetes 集群数据。${inventoryProfile.reason ? ` ${inventoryProfile.reason}` : ""}`}
        />
      ) : null}

      <GpuSummary
        occupancy={occupancyQuery.data}
        occupancyPending={occupancyQuery.isPending || !occupancyQuery.data}
      />

      <Tabs
        className={styles.tabs}
        defaultActiveTab="tenant-ledger"
        type="card-gutter"
        lazyload
        justify
      >
        <TabPane key="tenant-ledger" title="租户分配台账">
          <div className={styles.tabPanel}>
            <TenantGpuAllocationTable
              data={tenantsQuery.data || []}
              loading={tenantsQuery.isPending}
              onEditQuota={openQuotaModal}
              onEditReservation={openReservationModal}
            />
          </div>
        </TabPane>
        <TabPane key="inventory" title="设备列表">
          <div className={styles.tabPanel}>
            <GpuInventoryTable
              data={inventory}
              loading={inventoryQuery.isPending}
              extra={<GpuClusterPartitionFlow devices={inventory} />}
            />
          </div>
        </TabPane>
      </Tabs>

      <Modal
        title={`调整 GPU 配额上限${quotaTarget ? `：${quotaTarget.tenantName}` : ""}`}
        visible={Boolean(quotaTarget)}
        confirmLoading={quotaMutation.isPending}
        onOk={submitQuota}
        onCancel={() => {
          setQuotaTarget(null);
          quotaForm.resetFields();
        }}
      >
        <Alert
          type="warning"
          content={`配额上限不得低于当前资源预留 ${quotaTarget?.allocatedGpuCount ?? 0} 张；如需继续降低，请先调整资源预留。`}
          className="mb-4"
        />
        <Form form={quotaForm} layout="vertical">
          <Form.Item
            label="GPU 卡数上限"
            field="total"
            rules={[
              {
                required: true,
                type: "number",
                min: quotaTarget?.allocatedGpuCount ?? 0,
              },
            ]}
          >
            <InputNumber
              min={quotaTarget?.allocatedGpuCount ?? 0}
              precision={0}
              className="w-full"
            />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title={`调整 GPU 资源预留${reservationTarget ? `：${reservationTarget.tenantName}` : ""}`}
        visible={Boolean(reservationTarget)}
        confirmLoading={reservationMutation.isPending}
        onOk={submitReservation}
        onCancel={() => {
          setReservationTarget(null);
          reservationForm.resetFields();
        }}
      >
        <Alert
          type="warning"
          content="这里调整的是租户聚合预留上限，不会绑定到某一张物理 GPU。填写 0 会把预留上限设为 0；若低于当前已用量或处理中占用，后端会自动收紧到安全值。"
          className="mb-4"
        />
        <Form form={reservationForm} layout="vertical">
          <Form.Item
            label="预留 GPU 卡数"
            field="allocatedGpuCount"
            rules={[
              {
                required: true,
                type: "number",
                min: 0,
                max: reservationTarget?.quotaTotal,
              },
            ]}
          >
            <InputNumber
              min={0}
              max={reservationTarget?.quotaTotal}
              precision={0}
              className="w-full"
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
