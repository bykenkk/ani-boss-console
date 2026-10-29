import { Descriptions, Drawer, Spin } from "@arco-design/web-react";
import { useQuery } from "@tanstack/react-query";
import { auditLogKeys, getAuditLog, type AuditLogKind } from "@/api/audit-logs";
import { formatDateTime } from "@/lib/date";
import { withId } from "@/lib/id";
import { getAuditAction } from "../AuditLogsList/model";
import { auditTitles } from "../AuditLogsList/constants";
import { AuditResult } from "../AuditResult";
import { formatDetailValue } from "./utils";

interface AuditLogDetailDrawerProps {
  kind: AuditLogKind;
  id: number;
  onClose: () => void;
}

const labels: Record<string, string> = {
  sessionId: "会话 ID",
  deviceInfo: "设备信息",
  failureReason: "失败原因",
  mfaStatus: "MFA 状态",
  loginMethod: "登录方式",
  riskScore: "风险评分",
  riskLevel: "风险等级",
  riskFactors: "风险因素",
  subject_type: "主体类型",
  subject_id: "主体 ID",
  referer: "请求来源",
  appVersion: "客户端版本",
  httpMethod: "请求方法",
  path: "请求路径",
  requestUri: "完整请求 URI",
  apiModule: "API 模块",
  apiDescription: "API 描述",
  spanId: "Span ID",
  latencyMs: "耗时（ms）",
  statusCode: "HTTP 状态码",
  reason: "失败原因",
  requestHeader: "请求头",
  requestBody: "请求体",
  response: "响应",
  resourceType: "资源类型",
  resourceId: "资源 ID",
  beforeData: "操作前数据",
  afterData: "操作后数据",
  sensitiveLevel: "敏感等级",
};

export function AuditLogDetailDrawer({ kind, id, onClose }: AuditLogDetailDrawerProps) {
  const query = useQuery({
    queryKey: auditLogKeys.detail(kind, id),
    queryFn: ({ signal }) => getAuditLog(kind, id, signal),
    meta: {
      errorNotification: {
        id: withId("audit-log-detail", kind, id),
        action: `${auditTitles[kind]}详情加载`,
      },
    },
  });
  const item = query.data;
  const record: Record<string, unknown> = { ...item };
  return (
    <Drawer visible width={760} title={`${auditTitles[kind]}详情`} footer={null} onCancel={onClose}>
      <Spin loading={query.isFetching} className="w-full">
        {item && (
          <Descriptions
            column={1}
            border
            data={[
              { label: "日志 ID", value: item.id ?? "-" },
              { label: "时间", value: formatDateTime(item.createdAt) },
              { label: "租户 ID", value: item.tenantId ?? "-" },
              { label: "租户名称", value: item.tenantName || "-" },
              { label: "用户 ID", value: item.userId ?? "-" },
              { label: "操作者", value: item.username || "-" },
              { label: "IP 地址", value: item.ipAddress || "-" },
              { label: "动作", value: getAuditAction(item) },
              { label: "结果", value: <AuditResult item={item} /> },
              ...Object.entries(labels)
                .filter(([key]) => key in record)
                .map(([key, label]) => ({
                  label,
                  value: (
                    <pre className="m-0 whitespace-pre-wrap break-all">
                      {formatDetailValue(record[key], key)}
                    </pre>
                  ),
                })),
              { label: "请求 ID", value: item.requestId || "-" },
              { label: "Trace ID", value: item.traceId || "-" },
              { label: "日志哈希", value: <div className="break-all">{item.logHash || "-"}</div> },
              {
                label: "数字签名",
                value: <div className="break-all">{item.signature || "-"}</div>,
              },
            ]}
          />
        )}
      </Spin>
    </Drawer>
  );
}
