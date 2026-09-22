import {
  Alert,
  Button,
  Descriptions,
  Dropdown,
  Form,
  Menu,
  Modal,
  Result,
  Select,
  Tag,
  Tooltip,
  Typography,
} from "@arco-design/web-react";
import { IconMoreVertical } from "@arco-design/web-react/icon";
import { Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { showMessage } from "@/lib/feedback";
import {
  DataTable,
  DetailPageFrame,
  type DetailInfoCard,
  type DetailTab,
  type ListColumn,
} from "@/components/common";
import { useTenantManagement } from "@/components/tenant/TenantManagementProvider/useTenantManagement";
import type { Tenant, TenantQuotaLimits } from "@/components/tenant/model";
import { formatDateTimeMinute } from "@/lib/date";

const quotaLimitLabels: Array<[keyof TenantQuotaLimits, string]> = [
  ["gpuHours", "GPU-Hours"],
  ["cpuCores", "CPU 核"],
  ["memoryGi", "内存 Gi"],
  ["storageGi", "存储 Gi"],
  ["tokenQuota", "Token 配额"],
  ["kbQueries", "KB 查询"],
  ["maxMembers", "成员上限"],
  ["maxInferences", "推理服务上限"],
];

const quotaStatusMeta = {
  enabled: { label: "已启用", color: "green" },
  draft: { label: "草稿", color: "orange" },
} as const;

interface QuotaPolicyDetailProps {
  planCode: string;
}

export function QuotaPolicyDetail({ planCode }: QuotaPolicyDetailProps) {
  const navigate = useNavigate();
  const {
    quotaPackages,
    tenants,
    publishQuotaPackage,
    unregisterQuotaPackage,
    rebindTenantQuotaPackage,
  } = useTenantManagement();
  const [assignVisible, setAssignVisible] = useState(false);
  const [targetTenantId, setTargetTenantId] = useState("");
  const quotaPackage = quotaPackages.find((item) => item.planCode === planCode);

  const returnToList = () => {
    void navigate({ to: "/tenants-quotas" });
  };

  if (!quotaPackage) {
    return (
      <Result
        status="404"
        title="配额套餐不存在"
        subTitle="该套餐可能已被删除，或当前地址无效。"
        extra={<Button onClick={returnToList}>返回配额策略</Button>}
      />
    );
  }

  const boundTenants = tenants.filter((tenant) => tenant.planCode === quotaPackage.planCode);
  const status = quotaStatusMeta[quotaPackage.status];
  const description =
    quotaPackage.description ??
    (quotaPackage.planCode === "std"
      ? "适用于常规生产租户"
      : quotaPackage.planCode === "gpu-plus"
        ? "面向高 GPU 用量场景"
        : quotaPackage.planCode === "trial"
          ? "新租户试用配额"
          : "按企业合同定制限额");

  const publish = () => {
    if (!publishQuotaPackage(quotaPackage.planCode)) {
      showMessage({ type: "error", content: "套餐发布失败" });
      return;
    }
    showMessage({ type: "success", content: `套餐 ${quotaPackage.name} 已发布` });
  };

  const remove = () => {
    if (!unregisterQuotaPackage(quotaPackage.planCode)) {
      showMessage({ type: "warning", content: "有关联租户时不能删除套餐" });
      return;
    }
    showMessage({ type: "success", content: `套餐 ${quotaPackage.name} 已删除` });
    returnToList();
  };

  const confirmRemove = () => {
    Modal.confirm({
      title: `确定删除套餐“${quotaPackage.name}”吗？`,
      content: "有关联租户时不可删除。",
      okButtonProps: { status: "danger" },
      onOk: remove,
    });
  };

  const moreMenu = (
    <Menu
      onClickMenuItem={(key) => {
        if (key === "publish") publish();
        if (key === "delete") confirmRemove();
      }}
    >
      {quotaPackage.status === "draft" ? <Menu.Item key="publish">发布</Menu.Item> : null}
      <Menu.Item key="delete" disabled={boundTenants.length > 0}>
        删除套餐
      </Menu.Item>
    </Menu>
  );

  const assign = () => {
    if (!targetTenantId) {
      showMessage({ type: "warning", content: "请选择目标租户" });
      return;
    }
    if (!rebindTenantQuotaPackage(targetTenantId, quotaPackage.planCode)) {
      showMessage({ type: "error", content: "套餐改绑失败，请确认套餐已发布" });
      return;
    }
    setAssignVisible(false);
    setTargetTenantId("");
    showMessage({ type: "success", content: "套餐已改绑，租户当前配额上限保持不变" });
  };

  const tenantColumns: ListColumn<Tenant>[] = [
    {
      title: "租户",
      dataIndex: "name",
      render: (_, tenant) => (
        <Link
          to="/tenants/$tenantId"
          params={{ tenantId: tenant.id }}
          className="font-medium text-blue-600 no-underline hover:underline"
        >
          {tenant.name}
        </Link>
      ),
    },
    { title: "显示名", dataIndex: "displayName" },
    { title: "区域", dataIndex: "regionName", width: 130 },
    {
      title: "GPU 用量 / 上限",
      width: 160,
      render: (_, tenant) =>
        `${tenant.usage.gpuHours.toLocaleString()} / ${tenant.quotaLimits.gpuHours.toLocaleString()}`,
    },
  ];

  const infoCards: DetailInfoCard[] = [
    {
      key: "overview",
      title: "套餐概览",
      content: (
        <Descriptions
          column={1}
          data={[
            { label: "编码", value: quotaPackage.planCode },
            {
              label: "状态",
              value: <Tag color={status.color}>{status.label}</Tag>,
            },
            {
              label: "套餐类型",
              value: quotaPackage.isTrial ? "试用套餐" : "正式套餐",
            },
            {
              label: "GPU-Hours",
              value: quotaPackage.limits.gpuHours.toLocaleString(),
            },
            {
              label: "存储 Gi",
              value: quotaPackage.limits.storageGi.toLocaleString(),
            },
            { label: "绑定租户", value: "${boundTenants.length} 个" },
            { label: "更新时间", value: formatDateTimeMinute(quotaPackage.updatedAt) },
            { label: "说明", value: description },
          ]}
        />
      ),
    },
  ];

  const detailTabs: DetailTab[] = [
    {
      key: "limits",
      title: "限额明细",
      content: (
        <div className="py-4">
          <Alert
            type="info"
            content="限额为只读配置。如需不同限额，请新建套餐。"
            className="mb-4"
          />
          <Descriptions
            border
            column={2}
            data={quotaLimitLabels.map(([field, label]) => ({
              label,
              value: quotaPackage.limits[field].toLocaleString(),
            }))}
          />
        </div>
      ),
    },
    {
      key: "tenants",
      title: `绑定租户 (${boundTenants.length})`,
      content: (
        <div className="py-4">
          <div className="mb-4 flex items-center justify-between gap-4">
            <Typography.Text type="secondary">
              改绑只更新套餐归属，租户当前配额上限保持不变。
            </Typography.Text>
            <Button
              type="primary"
              disabled={quotaPackage.status !== "enabled"}
              onClick={() => {
                setTargetTenantId(tenants.find((tenant) => tenant.status !== "disabled")?.id ?? "");
                setAssignVisible(true);
              }}
            >
              分配给租户
            </Button>
          </div>
          <DataTable
            rowKey="id"
            columns={tenantColumns}
            data={boundTenants}
            pagination={false}
            noDataElement="未绑定租户"
          />
        </div>
      ),
    },
    {
      key: "operations",
      title: "操作历史",
      content: (
        <div className="py-4">
          <DataTable
            rowKey="id"
            pagination={false}
            columns={[
              { title: "操作", dataIndex: "operation" },
              { title: "说明", dataIndex: "message" },
              { title: "操作者", dataIndex: "by", width: 150 },
              {
                title: "时间",
                dataIndex: "createdAt",
                width: 170,
                render: (value: string) => formatDateTimeMinute(value),
              },
            ]}
            data={[
              ...tenants.flatMap((tenant) =>
                tenant.operations
                  .filter((operation) => operation.message.includes(quotaPackage.name))
                  .map((operation) => ({
                    ...operation,
                    operation: "分配/改绑套餐",
                  })),
              ),
              {
                id: `quota-${quotaPackage.planCode}-created`,
                operation: quotaPackage.status === "draft" ? "创建草稿" : "创建套餐",
                message: `套餐 ${quotaPackage.name}`,
                by: "platform-admin",
                createdAt: quotaPackage.updatedAt ?? "-",
              },
            ]}
          />
        </div>
      ),
    },
  ];

  return (
    <>
      <DetailPageFrame
        breadcrumbs={[
          { label: "租户管理" },
          { label: "配额策略", onClick: returnToList },
          { label: quotaPackage.name },
        ]}
        title={quotaPackage.name}
        subtitle={quotaPackage.planCode}
        status={<Tag color={status.color}>{status.label}</Tag>}
        headerItems={[
          { label: "GPU-Hours", value: quotaPackage.limits.gpuHours.toLocaleString() },
          { label: "存储 Gi", value: quotaPackage.limits.storageGi.toLocaleString() },
          { label: "绑定租户", value: "${boundTenants.length} 个" },
          { label: "更新时间", value: formatDateTimeMinute(quotaPackage.updatedAt) },
        ]}
        actions={
          <Tooltip content="更多操作">
            <Dropdown trigger="click" position="br" droplist={moreMenu}>
              <Button icon={<IconMoreVertical />} aria-label="更多操作" />
            </Dropdown>
          </Tooltip>
        }
        cards={infoCards}
        tabs={detailTabs}
        defaultTabKey="limits"
        onBack={returnToList}
      />

      <Modal
        title={`分配套餐：${quotaPackage.name}`}
        visible={assignVisible}
        okText="确认改绑"
        onOk={assign}
        onCancel={() => {
          setAssignVisible(false);
          setTargetTenantId("");
        }}
      >
        <Alert
          type="info"
          content="改绑只更新套餐归属，租户当前已审批或特批的配额上限保持不变。"
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
        </Form>
      </Modal>
    </>
  );
}
