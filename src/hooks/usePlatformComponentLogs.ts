import { useEffect, useRef, useState } from "react";
import { streamPlatformComponentLogs, type PlatformComponentLog } from "@/api/platform";
import { ApiError } from "@/api/request";
import {
  consumeComponentLogStream,
  createComponentLogBuffer,
  getLogReconnectDelay,
  type LogConnectionState,
} from "@/components/observability/PlatformLogsPage/log-stream";
import { closeNotification, showNotification } from "@/lib/feedback";
import { withId } from "@/lib/id";

export function usePlatformComponentLogs(component: string) {
  const [generation, setGeneration] = useState(0);
  const active = useRef<{
    component: string;
    generation: number;
    buffer: ReturnType<typeof createComponentLogBuffer>;
  }>();
  const [snapshot, setSnapshot] = useState<{
    component: string;
    generation: number;
    state: LogConnectionState;
    logs: PlatformComponentLog[];
  }>({ component: "", generation: 0, state: "idle", logs: [] });

  useEffect(() => {
    if (!component) return;
    const controller = new AbortController();
    const buffer = createComponentLogBuffer();
    const session = { component, generation, buffer };
    active.current = session;
    const feedbackId = withId("platform-component-logs", component);
    let timer: ReturnType<typeof setTimeout> | undefined;
    let failures = 0;
    const setConnection = (state: LogConnectionState) => {
      if (!controller.signal.aborted)
        setSnapshot((current) => ({
          component,
          generation,
          state,
          logs:
            current.component === component && current.generation === generation
              ? current.logs
              : [],
        }));
    };
    const schedule = (delay: number) => {
      setConnection("reconnecting");
      timer = setTimeout(connect, delay);
    };
    const connect = async () => {
      try {
        const stream = await streamPlatformComponentLogs({
          component,
          limit: 100,
          intervalSeconds: 2,
          signal: controller.signal,
        });
        await consumeComponentLogStream(
          stream,
          controller.signal,
          () => {
            closeNotification(feedbackId);
            setConnection("connected");
          },
          (log) => {
            if (controller.signal.aborted) return;
            const logs = buffer.append(log);
            if (logs)
              setSnapshot((current) => ({
                component,
                generation,
                logs,
                state:
                  current.component === component && current.generation === generation
                    ? current.state
                    : "connecting",
              }));
          },
        );
        if (controller.signal.aborted) return;
        failures = 0;
        // 8 秒正常 EOF 是工作循环，不显示失败；不发送 Last-Event-ID。
        schedule(200 + Math.random() * 300);
      } catch (error) {
        if (controller.signal.aborted) return;
        const delay = getLogReconnectDelay(error, failures++);
        const status = error instanceof ApiError ? error.status : undefined;
        const message =
          status === 403
            ? "无权查看日志"
            : status === 404
              ? "组件已不可用，请重新选择组件"
              : status === 429
                ? `日志连接数已达上限，${Math.ceil((delay ?? 8_000) / 1000)} 秒后重试`
                : status === 503
                  ? "日志服务暂不可用，正在重试"
                  : undefined;
        const requestId = error instanceof ApiError ? error.requestId : undefined;
        showNotification({
          id: feedbackId,
          state: "error",
          action: "组件日志流连接",
          content: message
            ? `${message}${requestId ? `（请求 ID：${requestId}）` : ""}`
            : { error, fallback: "组件日志流连接失败" },
        });
        if (delay === undefined) setConnection("failed");
        else schedule(delay);
      }
    };
    connect();
    return () => {
      controller.abort();
      clearTimeout(timer);
      closeNotification(feedbackId);
      if (active.current === session) active.current = undefined;
    };
  }, [component, generation]);

  const current = snapshot.component === component && snapshot.generation === generation;
  return {
    logs: current ? snapshot.logs : [],
    connectionState: !component
      ? ("idle" as const)
      : current
        ? snapshot.state
        : ("connecting" as const),
    restart: () => setGeneration((value) => value + 1),
    clear: () => {
      if (active.current?.component !== component || active.current.generation !== generation)
        return;
      active.current.buffer.clear();
      setSnapshot((value) => ({ ...value, logs: [] }));
    },
  };
}
