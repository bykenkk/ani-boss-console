import { useMemo, useState } from "react";
import { Button, Checkbox, Input, Select } from "@arco-design/web-react";
import type { ClusterOpsResourceDocument } from "@/api/cluster-ops";
import { StatusBadge } from "@/components/common";
import { useClusterPodLogs } from "@/hooks/useClusterPodLogs";
import { array, field, nativeObject } from "../model";

interface PodLogsProps {
  resource: ClusterOpsResourceDocument;
}
export function PodLogs({ resource }: PodLogsProps) {
  const containers = useMemo(() => {
    const object = nativeObject(resource);
    return ["containers", "initContainers", "ephemeralContainers"]
      .flatMap((key) =>
        array(field(object, "spec", key)).map((container) =>
          String(field(container, "name") ?? ""),
        ),
      )
      .filter(Boolean);
  }, [resource]);
  const [container, setContainer] = useState(containers.length === 1 ? containers[0] : "");
  const [follow, setFollow] = useState(true),
    [timestamps, setTimestamps] = useState(true),
    [previous, setPrevious] = useState(false);
  const [tail, setTail] = useState("200"),
    [sinceSeconds, setSinceSeconds] = useState(""),
    [sinceTime, setSinceTime] = useState(""),
    [limit, setLimit] = useState("");
  const options = useMemo(
    () => ({
      container: container || undefined,
      expected_pod_uid: resource.uid,
      follow,
      timestamps,
      previous,
      tail_lines: tail || undefined,
      since_seconds: sinceSeconds || undefined,
      since_time: sinceTime || undefined,
      limit_bytes: limit || undefined,
    }),
    [container, resource.uid, follow, timestamps, previous, tail, sinceSeconds, sinceTime, limit],
  );
  const logs = useClusterPodLogs(
    {
      cluster_id: resource.ref.cluster_id,
      namespace: resource.ref.namespace,
      pod_name: resource.ref.name,
    },
    options,
  );
  const states = {
    idle: "未连接",
    connecting: "连接中",
    streaming: "读取中",
    ended: logs.endReason === "STREAM_LIMIT_REACHED" ? "流期限已到，请手动重新连接" : "正常结束",
    stopped: "已停止",
    error: "异常中断",
  };
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <Select
          aria-label="日志容器"
          placeholder="选择容器"
          value={container || undefined}
          options={containers.map((name) => ({ value: name, label: name }))}
          onChange={setContainer}
        />
        <Input aria-label="尾部行数" placeholder="尾部行数" value={tail} onChange={setTail} />
        <Input
          aria-label="最近秒数"
          placeholder="最近秒数（与时间互斥）"
          value={sinceSeconds}
          onChange={setSinceSeconds}
        />
        <Input
          aria-label="起始时间"
          placeholder="起始时间 RFC 3339"
          value={sinceTime}
          onChange={setSinceTime}
        />
        <Input
          aria-label="字节上限"
          placeholder="字节上限（可选）"
          value={limit}
          onChange={setLimit}
        />
        <Checkbox checked={follow} onChange={setFollow}>
          持续跟随
        </Checkbox>
        <Checkbox checked={timestamps} onChange={setTimestamps}>
          时间戳
        </Checkbox>
        <Checkbox checked={previous} onChange={setPrevious}>
          上次容器
        </Checkbox>
      </div>
      <div className="flex items-center gap-3">
        <Button
          type="primary"
          disabled={(containers.length > 1 && !container) || Boolean(sinceSeconds && sinceTime)}
          onClick={logs.start}
        >
          {logs.state === "idle" ? "连接日志" : "重新连接"}
        </Button>
        <Button
          onClick={logs.stop}
          disabled={!(["connecting", "streaming"] as string[]).includes(logs.state)}
        >
          停止
        </Button>
        <Button onClick={logs.clear}>清空</Button>
        <StatusBadge
          tone={
            logs.state === "error" ? "danger" : logs.state === "streaming" ? "success" : "default"
          }
          value={states[logs.state]}
        />
      </div>
      {logs.error ? (
        <p>
          {logs.error.message}（{logs.error.reason}）
        </p>
      ) : null}
      {logs.truncated ? <p>较早日志已从本地显示中移除</p> : null}
      <pre
        className="min-h-80 max-h-[65vh] overflow-auto whitespace-pre-wrap break-all rounded bg-[var(--color-fill-1)] p-4 font-mono text-xs"
        aria-label="Pod 日志"
      >
        {logs.text || "等待日志"}
      </pre>
    </div>
  );
}
