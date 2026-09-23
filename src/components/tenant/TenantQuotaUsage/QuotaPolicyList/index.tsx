import {
  Alert,
  Button,
  Form,
  Grid,
  Input,
  InputNumber,
  Modal,
  Select,
  Space,
  Tag,
  Typography,
} from "@arco-design/web-react";
import { IconDownload, IconPlus } from "@arco-design/web-react/icon";
import { Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { showMessage } from "@/lib/feedback";
import {
  ListDataTable,
  ListPageFrame,
  DataTableNameCell,
  type ListColumn,
} from "@/components/common";
import { useTenantManagement } from "@/components/tenant/TenantManagementProvider/useTenantManagement";
import type { TenantQuotaLimits } from "@/components/tenant/model";
import { formatCurrentDateTime, formatDateTimeMinute, getCurrentTimestamp } from "@/lib/date";

type QuotaPackageStatus = "enabled" | "draft" | "disabled";

interface QuotaPackageRow {
  id: string;
  name: string;
  planCode: string;
  status: QuotaPackageStatus;
  description: string;
  isTrial: boolean;
  limits: TenantQuotaLimits;
  updatedAt: string;
}

interface QuotaPackageDraft {
  name: string;
  planCode: string;
  description: string;
  limits: TenantQuotaLimits;
}

const initialDraft: QuotaPackageDraft = {
  name: "",
  planCode: "",
  description: "",
  limits: {
    gpuHours: 1000,
    cpuCores: 64,
    memoryGi: 256,
    storageGi: 2048,
    tokenQuota: 5_000_000,
    kbQueries: 50_000,
    maxMembers: 30,
    maxInferences: 10,
  },
};

const statusMeta = {
  enabled: { label: "已启用", color: "green" },
  draft: { label: "草稿", color: "orange" },
  disabled: { label: "已停用", color: "gray" },
} as const;

export function QuotaPolicyList() {
  const {
    tenants,
    rebindTenantQuotaPackage,
    registerQuotaPackage,
    publishQuotaPackage: publishCatalogPackage,
    unregisterQuotaPackage,
    quotaPackages,
  } = useTenantManagement();
  const [createVisible, setCreateVisible] = useState(false);
  const [assigningPackage, setAssigningPackage] = useState<QuotaPackageRow | null>(null);
  const [targetTenantId, setTargetTenantId] = useState("");
  const [draft, setDraft] = useState<QuotaPackageDraft>(initialDraft);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const packages = useMemo<QuotaPackageRow[]>(
    () =>
      quotaPackages.map((item, index) => ({
        id: `qp-${item.planCode}`,
        name: item.name,
        planCode: item.planCode,
        status: item.status,
        description:
          item.description ??
          (item.planCode === "std"
            ? "适用于常规生产租户"
            : item.planCode === "gpu-plus"
              ? "面向高 GPU 用量场景"
              : item.planCode === "trial"
                ? "新租户试用配额"
                : "按企业合同定制限额"),
        isTrial: item.isTrial,
        limits: { ...item.limits },
        updatedAt: item.updatedAt ?? `2026-08-${String(25 - index).padStart(2, `0`)} 10:30`,
      })),
    [quotaPackages],
  );

  const boundCount = (planCode: string) =>
    tenants.filter((tenant) => tenant.planCode === planCode).length;

  const publishPackage = (item: QuotaPackageRow) => {
    if (!publishCatalogPackage(item.planCode)) {
      showMessage({ type: "error", content: "配额策略发布失败" });
      return;
    }
    showMessage({ type: "success", content: `配额策略 ${item.name} 已发布` });
  };

  const deletePackage = (item: QuotaPackageRow) => {
    if (boundCount(item.planCode) > 0) {
      showMessage({ type: "warning", content: "有关联租户时不能删除配额策略" });
      return;
    }
    if (!unregisterQuotaPackage(item.planCode)) {
      showMessage({ type: "warning", content: "有关联租户时不能删除配额策略" });
      return;
    }
    showMessage({ type: "success", content: `配额策略 ${item.name} 已删除` });
  };

  const createPackage = () => {
    if (!draft.name.trim() || !draft.planCode.trim()) {
      showMessage({ type: "warning", content: "请填写策略名称和编码" });
      return;
    }
    if (packages.some((item) => item.planCode.toLowerCase() === draft.planCode.toLowerCase())) {
      showMessage({ type: "warning", content: "策略编码已存在" });
      return;
    }
    const item: QuotaPackageRow = {
      id: `qp-${getCurrentTimestamp()}`,
      name: draft.name.trim(),
      planCode: draft.planCode.trim(),
      description: draft.description.trim(),
      status: "enabled",
      isTrial: false,
      limits: { ...draft.limits },
      updatedAt: formatCurrentDateTime(),
    };
    if (
      !registerQuotaPackage({
        name: item.name,
        planCode: item.planCode,
        status: "enabled",
        isTrial: false,
        description: item.description,
        updatedAt: item.updatedAt,
        limits: { ...item.limits },
      })
    ) {
      showMessage({ type: "warning", content: "策略编码已存在" });
      return;
    }
    setCreateVisible(false);
    setDraft(initialDraft);
    showMessage({ type: "success", content: `配额策略 ${item.name} 已创建并发布` });
  };

  const assignPackage = () => {
    if (!assigningPackage || !targetTenantId) {
      showMessage({ type: "warning", content: "请选择目标租户" });
      return;
    }
    if (!rebindTenantQuotaPackage(targetTenantId, assigningPackage.planCode)) {
      showMessage({ type: "error", content: "配额策略改绑失败，请确认策略已发布" });
      return;
    }
    setAssigningPackage(null);
    setTargetTenantId("");
    showMessage({ type: "success", content: "配额策略已改绑，租户当前配额上限保持不变" });
  };

  const columns: ListColumn<QuotaPackageRow>[] = [
    {
      title: "配额策略 / 编码",
      dataIndex: "name",
      width: 200,
      render: (_, item) => (
        <DataTableNameCell
          name={
            <Link to="/tenants-quotas/$planCode" params={{ planCode: item.planCode }}>
              {item.name}
            </Link>
          }
          id={item.planCode}
        />
      ),
    },
    {
      title: "状态",
      dataIndex: "status",
      width: 100,
      render: (value: QuotaPackageStatus) => (
        <Tag color={statusMeta[value].color}>{statusMeta[value].label}</Tag>
      ),
    },
    {
      title: "GPU-Hours",
      width: 130,
      render: (_, item) => item.limits.gpuHours.toLocaleString(),
    },
    {
      title: "存储 Gi",
      width: 120,
      render: (_, item) => item.limits.storageGi.toLocaleString(),
    },
    {
      title: "绑定租户",
      width: 105,
      render: (_, item) => boundCount(item.planCode),
    },
    {
      title: "更新时间",
      dataIndex: "updatedAt",
      width: 160,
      render: (value: string) => formatDateTimeMinute(value),
    },
  ];

  return (
    <>
      <ListPageFrame
        header={{
          title: "配额策略",
          subtitle: "管理租户配额策略；策略发布后限额只读，变更请新建策略。",
          extra: (
            <Space>
              <Button
                icon={<IconDownload />}
                onClick={() => showMessage({ type: "success", content: "配额策略已导出" })}
              >
                导出
              </Button>
              <Button type="primary" icon={<IconPlus />} onClick={() => setCreateVisible(true)}>
                新建配额策略
              </Button>
            </Space>
          ),
        }}
      >
        <ListDataTable
          rowKey="id"
          columns={columns}
          rowActions={[
            {
              key: "assign",
              label: "分配/改绑",
              disabled: (item) => item.status !== "enabled",
              onClick: (item) => {
                setAssigningPackage(item);
                setTargetTenantId(tenants.find((tenant) => tenant.status !== "disabled")?.id ?? "");
              },
            },
            {
              key: "publish",
              label: "发布",
              visible: (item) => item.status === "draft",
              onClick: publishPackage,
            },
            {
              key: "delete",
              label: "删除",
              intent: "danger",
              disabled: (item) => boundCount(item.planCode) > 0,
              onClick: (item) => {
                Modal.confirm({
                  title: `确定删除配额策略“${item.name}”吗？`,
                  content: "有关联租户时不可删除。",
                  okButtonProps: { status: "danger" },
                  onOk: () => deletePackage(item),
                });
              },
            },
          ]}
          data={packages}
          pagination={{
            page,
            pageSize,
            total: packages.length,
            onPageChange: setPage,
            onPageSizeChange: (nextPageSize) => {
              setPage(1);
              setPageSize(nextPageSize);
            },
          }}
          emptyText="还没有配额策略"
        />
      </ListPageFrame>

      <Modal
        title="新建配额策略"
        visible={createVisible}
        style={{ width: 720 }}
        okText="创建并发布"
        onOk={createPackage}
        onCancel={() => {
          setCreateVisible(false);
          setDraft(initialDraft);
        }}
      >
        <Alert
          type="warning"
          content="配额策略创建并发布后，限额不可修改。请在提交前确认配置。"
          className="mb-4"
        />
        <Form layout="vertical">
          <Grid.Row gutter={16}>
            <Grid.Col span={12}>
              <Form.Item label="策略名称" required>
                <Input
                  value={draft.name}
                  placeholder="例如：定制策略"
                  onChange={(name) => setDraft((current) => ({ ...current, name }))}
                />
              </Form.Item>
            </Grid.Col>
            <Grid.Col span={12}>
              <Form.Item label="策略编码" required>
                <Input
                  value={draft.planCode}
                  placeholder="例如：custom-01"
                  onChange={(planCode) => setDraft((current) => ({ ...current, planCode }))}
                />
              </Form.Item>
            </Grid.Col>
          </Grid.Row>
          <Form.Item label="说明">
            <Input.TextArea
              value={draft.description}
              placeholder="按合同定制限额"
              onChange={(description) => setDraft((current) => ({ ...current, description }))}
            />
          </Form.Item>
          <Typography.Title heading={6}>限额配置</Typography.Title>
          <Grid.Row gutter={16}>
            {(
              [
                ["gpuHours", "GPU-Hours"],
                ["cpuCores", "CPU 核"],
                ["memoryGi", "内存 Gi"],
                ["storageGi", "存储 Gi"],
                ["tokenQuota", "Token 配额"],
                ["kbQueries", "KB 查询"],
                ["maxMembers", "成员上限"],
                ["maxInferences", "推理服务上限"],
              ] as const
            ).map(([field, label]) => (
              <Grid.Col span={12} key={field}>
                <Form.Item label={label}>
                  <InputNumber
                    min={0}
                    precision={0}
                    value={draft.limits[field]}
                    className="w-full"
                    onChange={(value) =>
                      setDraft((current) => ({
                        ...current,
                        limits: { ...current.limits, [field]: Number(value) || 0 },
                      }))
                    }
                  />
                </Form.Item>
              </Grid.Col>
            ))}
          </Grid.Row>
        </Form>
      </Modal>

      <Modal
        title={`分配配额策略${assigningPackage ? `：${assigningPackage.name}` : ``}`}
        visible={Boolean(assigningPackage)}
        okText="确认改绑"
        onOk={assignPackage}
        onCancel={() => {
          setAssigningPackage(null);
          setTargetTenantId("");
        }}
      >
        <Alert
          type="info"
          content="改绑只更新策略归属，租户当前已审批或特批的配额上限保持不变。"
          className="mb-4"
        />
        <Form layout="vertical">
          <Form.Item label="目标租户" required>
            <Select
              value={targetTenantId}
              onChange={setTargetTenantId}
              options={tenants
                .filter((tenant) => tenant.status !== "disabled")
                .map((tenant) => ({
                  label: `${tenant.name} · ${tenant.displayName}`,
                  value: tenant.id,
                }))}
            />
          </Form.Item>
          {targetTenantId ? (
            <Typography.Text type="secondary">
              当前配额策略：
              {tenants.find((tenant) => tenant.id === targetTenantId)?.quotaPackage ?? "-"}
              ，确认后可前往
              <Link to="/tenants/$tenantId" params={{ tenantId: targetTenantId }} className="ml-1">
                租户详情
              </Link>
              查看。
            </Typography.Text>
          ) : null}
        </Form>
      </Modal>
    </>
  );
}
