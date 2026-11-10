import { useEffect, useMemo, useRef, useState } from "react";
import clsx from "clsx";
import { Button, Checkbox, Select } from "@arco-design/web-react";
import { IconPlayArrowFill, IconRecordStop, IconRefresh } from "@arco-design/web-react/icon";
import type { ClusterOpsResourceDocument } from "@/api/cluster-ops";
import { useClusterPodLogs } from "@/hooks/useClusterPodLogs";
import { array, field, nativeObject } from "../model";
import styles from "./index.module.less";

interface PodLogsProps {
  resource: ClusterOpsResourceDocument;
}

export function PodLogs({ resource }: PodLogsProps) {
  const containers = useMemo(() => {
    const object = nativeObject(resource);
    return [
      { spec: "containers", status: "containerStatuses", suffix: "" },
      { spec: "initContainers", status: "initContainerStatuses", suffix: "（初始化容器）" },
      { spec: "ephemeralContainers", status: "ephemeralContainerStatuses", suffix: "（临时容器）" },
    ].flatMap((group) => {
      const statuses = array(field(object, "status", group.status));
      return array(field(object, "spec", group.spec)).flatMap((item) => {
        const name = field(item, "name");
        if (typeof name !== "string" || !name) return [];
        const status = statuses.find((entry) => field(entry, "name") === name);
        return [
          {
            name,
            label: name + group.suffix,
            hasPrevious: Number(field(status, "restartCount") ?? 0) > 0,
          },
        ];
      });
    });
  }, [resource]);
  const [selectedContainer, setContainer] = useState(containers[0]?.name ?? "");
  const selected = containers.find((item) => item.name === selectedContainer) ?? containers[0];
  const container = selected?.name ?? "";
  const [previous, setPrevious] = useState(false);
  const [tail, setTail] = useState("200");
  const [atBottom, setAtBottom] = useState(true);
  const viewer = useRef<HTMLPreElement>(null);
  const showPrevious = previous && Boolean(selected?.hasPrevious);
  const target = useMemo(
    () => ({
      cluster_id: resource.ref.cluster_id,
      namespace: resource.ref.namespace,
      pod_name: resource.ref.name,
    }),
    [resource.ref.cluster_id, resource.ref.namespace, resource.ref.name],
  );
  const options = useMemo(
    () => ({
      container: container || undefined,
      expected_pod_uid: resource.uid,
      follow: !showPrevious,
      timestamps: true,
      previous: showPrevious,
      tail_lines: tail,
    }),
    [container, resource.uid, showPrevious, tail],
  );
  const logs = useClusterPodLogs(target, options, Boolean(container));
  const playing = logs.state === "connecting" || logs.state === "streaming";
  const playbackLabel = playing ? "停止日志" : "播放日志";
  useEffect(() => {
    if (atBottom && viewer.current) viewer.current.scrollTop = viewer.current.scrollHeight;
  }, [logs.text, atBottom]);
  const emptyText = !container
    ? "暂无可查看日志的容器"
    : logs.state === "connecting"
      ? "正在加载日志…"
      : logs.state === "streaming"
        ? "等待新日志…"
        : "暂无日志";
  return (
    <div className={clsx(styles.root, "flex h-full min-h-0 min-w-0 flex-col gap-3")}>
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 flex-wrap items-center gap-3">
          <Select
            className="w-auto! max-w-full!"
            aria-label="日志容器"
            placeholder="选择容器"
            value={container || undefined}
            disabled={!containers.length}
            options={containers.map((item) => ({ value: item.name, label: item.label }))}
            onChange={(name) => {
              setContainer(name);
              setPrevious(false);
              setAtBottom(true);
            }}
          />
          <Select
            className="w-auto! max-w-full!"
            aria-label="日志行数"
            value={tail}
            options={[100, 200, 500, 1000].map((count) => ({
              value: String(count),
              label: `最近 ${count} 行`,
            }))}
            onChange={(value) => {
              setTail(value);
              setAtBottom(true);
            }}
          />
          {selected?.hasPrevious ? (
            <Checkbox
              checked={showPrevious}
              onChange={(value) => {
                setPrevious(value);
                setAtBottom(true);
              }}
            >
              上次运行日志
            </Checkbox>
          ) : null}
        </div>
        <div className="ml-auto flex shrink-0 items-center gap-2">
          <Button
            size="small"
            aria-label={playbackLabel}
            title={playbackLabel}
            icon={playing ? <IconRecordStop /> : <IconPlayArrowFill />}
            disabled={!container}
            onClick={playing ? logs.stop : logs.start}
          />
          <Button
            size="small"
            aria-label="重新加载日志"
            title="重新加载日志"
            icon={<IconRefresh />}
            loading={logs.state === "connecting"}
            disabled={!container || playing}
            onClick={logs.start}
          />
        </div>
      </div>
      {logs.truncated ? (
        <p className="m-0 text-xs text-(--color-text-3)">当前窗口仅保留最近日志</p>
      ) : null}
      <div className="relative min-h-64 min-w-0 flex-1">
        <pre
          ref={viewer}
          className="m-0 h-full min-h-64 overflow-auto whitespace-pre-wrap break-all rounded bg-(--color-menu-dark-bg) p-4 font-mono text-xs leading-6 text-(--color-white)"
          aria-label="容器日志"
          aria-busy={logs.state === "connecting"}
          onScroll={(event) => {
            const element = event.currentTarget;
            setAtBottom(element.scrollHeight - element.scrollTop - element.clientHeight < 24);
          }}
        >
          {logs.text || emptyText}
        </pre>
        {!atBottom ? (
          <div className="absolute right-3 bottom-3">
            <Button
              onClick={() => {
                if (viewer.current) viewer.current.scrollTop = viewer.current.scrollHeight;
                setAtBottom(true);
              }}
            >
              回到底部
            </Button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
