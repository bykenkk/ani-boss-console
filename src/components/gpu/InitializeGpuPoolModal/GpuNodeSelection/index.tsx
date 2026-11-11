import { useEffect } from "react";
import { Button, Tooltip } from "@arco-design/web-react";
import { IconInfoCircle, IconQuestionCircle } from "@arco-design/web-react/icon";
import { useQuery } from "@tanstack/react-query";
import {
  acceleratorKeys,
  discoverGpuNodes,
  type GpuDiscoveredNode,
  type GpuInitializationCheck,
} from "@/api/accelerator";
import { DataTable, StatusBadge, ToolbarIconButton, type ListColumn } from "@/components/common";
import { useListPagination } from "@/hooks/useListPagination";
import { withId } from "@/lib/id";
import { formatGpuInitializationReason } from "../presentation";
import { GpuInitializationEnvironment } from "../GpuInitializationEnvironment";
import styles from "../../initialization.module.less";

interface GpuNodeSelectionProps {
  connectionRef: string;
  value: GpuDiscoveredNode[];
  revision: string;
  onChange: (nodes: GpuDiscoveredNode[]) => void;
  onSnapshot: (revision: string) => void;
  checks: GpuInitializationCheck[];
  onPrepareSupply: (nodes: GpuDiscoveredNode[], revision: string) => void;
  prepareDisabled: boolean;
}

const blockingReasonDescriptions: Record<string, string> = {
  NODE_MODEL_REQUIRED:
    "尚未确定节点型号。请核实设备型号，供给配置应用后刷新节点，等待设备观测确认。",
  PROVIDER_CONFIG_REQUIRED: "尚未登记可用的供给配置。请先准备并应用供给配置，再刷新节点。",
};

const columns: ListColumn<GpuDiscoveredNode>[] = [
  { title: "节点", dataIndex: "node.name", width: 200, ellipsis: true, fixed: "left" },
  {
    title: "设备型号",
    width: 200,
    ellipsis: true,
    render: (_, row) =>
      [...new Set(row.devices?.map((device) => device.model_key).filter(Boolean))].join("、") ||
      "未知",
  },
  {
    title: (
      <span className="inline-flex items-center gap-1.5">
        设备显存
        <Tooltip
          content={
            <div className="max-w-64 text-xs leading-5">
              <div className="font-medium">设备显存说明</div>
              <p className="mt-1">
                “未知”表示暂未取得显存观测值，不代表显存为
                0。容量未知不影响目录初始化，节点是否可选以纳管状态为准。
              </p>
            </div>
          }
          trigger={["hover", "focus"]}
        >
          <Button
            type="text"
            size="mini"
            className="h-auto! bg-transparent! p-0! text-(--color-text-3)!"
            icon={<IconQuestionCircle className="text-sm" />}
            aria-label="设备显存说明"
          />
        </Tooltip>
      </span>
    ),
    width: 200,
    ellipsis: true,
    render: (_, row) =>
      row.devices?.length
        ? row.devices
            .map((device) =>
              device.memory_capacity_bytes == null ? "未知" : `${device.memory_capacity_bytes} B`,
            )
            .join("、")
        : "未知",
  },
  {
    title: "纳管状态",
    width: 260,
    ellipsis: true,
    render: (_, row) => (
      <Tooltip
        content={
          <div className="max-w-64 text-xs leading-5">
            <div className="font-medium">{row.selectable ? "可选择" : "节点暂不可选择"}</div>
            {row.selectable ? (
              <p className="mt-1">节点已满足当前纳管条件，可以勾选并继续初始化。</p>
            ) : (
              <ul className="mt-1 space-y-1">
                {[
                  ...new Set(
                    (row.blocking_reasons?.length ? row.blocking_reasons : [""]).map(
                      (reason) =>
                        blockingReasonDescriptions[reason] ??
                        "节点尚未满足纳管条件，请核对节点信息和供给配置后刷新。",
                    ),
                  ),
                ].map((description) => (
                  <li key={description}>{description}</li>
                ))}
              </ul>
            )}
          </div>
        }
        trigger={["hover", "focus"]}
      >
        <span className="inline-flex" tabIndex={0}>
          <StatusBadge
            value={
              row.selectable
                ? "可选择"
                : row.blocking_reasons?.map(formatGpuInitializationReason).join("、") || "不可选择"
            }
            tone={row.selectable ? "success" : "warning"}
          />
        </span>
      </Tooltip>
    ),
  },
];

export function GpuNodeSelection({
  connectionRef,
  value,
  revision,
  onChange,
  onSnapshot,
  checks,
  onPrepareSupply,
  prepareDisabled,
}: GpuNodeSelectionProps) {
  const pagination = useListPagination(connectionRef);
  const params = {
    connection_ref: connectionRef,
    page: pagination.page,
    pageSize: pagination.pageSize,
  };
  const query = useQuery({
    queryKey: [...acceleratorKeys.all, "discovered-nodes", params],
    queryFn: ({ signal }) => discoverGpuNodes(params, signal),
    refetchOnMount: "always",
    meta: {
      errorNotification: {
        id: withId("gpu-node-discovery", connectionRef),
        action: "GPU 节点发现",
      },
    },
  });
  useEffect(() => {
    if (query.data?.discovery_revision) onSnapshot(query.data.discovery_revision);
  }, [query.data, query.dataUpdatedAt, onSnapshot]);
  const rows = query.data?.items ?? [];
  const ready = Boolean(revision && revision === query.data?.discovery_revision);
  return (
    <div className="flex min-w-0 flex-col gap-4">
      <GpuInitializationEnvironment
        checks={checks}
        onPrepareSupply={() => onPrepareSupply(rows, query.data?.discovery_revision ?? "")}
        prepareDisabled={prepareDisabled || query.isFetching || !ready}
      />
      <div>
        <DataTable
          className={styles.nodeTable}
          header={{
            className: "relative mb-4 block!",
            title: "节点选择",
            extra: (
              <div className="mt-3 sm:absolute sm:top-0 sm:right-0 sm:mt-0">
                <ToolbarIconButton
                  label="刷新节点"
                  spinning={query.isFetching}
                  // 保持按钮可聚焦，避免刷新时原生 disabled 让弹窗把焦点转给显存问号。
                  aria-disabled={query.isFetching}
                  aria-busy={query.isFetching}
                  onClick={() => {
                    if (query.isFetching) return;
                    onSnapshot("");
                    query.refetch();
                  }}
                />
              </div>
            ),
          }}
          rowKey={(row) => row.node?.uid ?? ""}
          columns={columns}
          data={rows}
          loading={query.isFetching}
          tableLabel="可纳管 GPU 节点"
          pagination={
            Number(query.data?.total ?? "0") <= pagination.pageSize && pagination.page === 1
              ? false
              : {
                  page: pagination.page,
                  pageSize: pagination.pageSize,
                  total: Number(query.data?.total ?? "0"),
                  onPageChange: pagination.setPage,
                  onPageSizeChange: pagination.setPageSize,
                  pageSizeOptions: [20, 50, 100],
                  disabled: query.isFetching,
                }
          }
          rowSelection={{
            type: "checkbox",
            fixed: true,
            preserveSelectedRowKeys: true,
            checkCrossPage: true,
            selectedRowKeys: value.map((item) => item.node!.uid),
            checkboxProps: (row) => ({
              disabled:
                !ready || query.isFetching || !row.selectable || !row.node?.uid || !row.node.name,
            }),
            onChange: (keys) => {
              const available = new Map([...value, ...rows].map((item) => [item.node?.uid, item]));
              onChange(
                keys.flatMap((key) => {
                  const node = available.get(String(key));
                  return node?.selectable && node.node?.uid && node.node.name ? [node] : [];
                }),
              );
            },
          }}
        />
      </div>
      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 rounded-md bg-(--color-fill-1) px-4 py-3 text-xs">
        <div className="flex items-center gap-3" aria-live="polite">
          <span>
            已选 <span className="font-semibold text-[rgb(var(--primary-6))]">{value.length}</span>{" "}
            个节点
          </span>
          <span aria-hidden className="h-3 w-px bg-(--color-border-3)" />
          <span className="text-(--color-text-3)">共 {query.data?.total ?? "0"} 个节点</span>
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <span className="inline-flex items-center gap-1.5 text-(--color-text-3)">
            <IconInfoCircle />
            刷新会清空已选节点
          </span>
          {value.length ? (
            <Button
              type="text"
              size="mini"
              disabled={query.isFetching}
              onClick={() => onChange([])}
            >
              清空选择
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
