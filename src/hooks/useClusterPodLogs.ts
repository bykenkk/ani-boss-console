import { useCallback, useEffect, useRef, useState } from "react";
import {
  getAuthSessionSignal,
  streamPodLogs,
  toApiError,
  type ApiError,
  type ClusterOpsPodLogOptions,
  type ClusterOpsPodLogTarget,
} from "@/api/cluster-ops";
import { consumeClusterPodLogStream } from "@/components/cluster-ops/PodLogs/log-stream";
import { closeNotification, showNotification } from "@/lib/feedback";

type ClusterPodLogState = "idle" | "connecting" | "streaming" | "ended" | "stopped" | "error";
const DISPLAY_UNITS = 2 * 1024 * 1024;
export function useClusterPodLogs(
  target: ClusterOpsPodLogTarget,
  options: ClusterOpsPodLogOptions,
  autoStart = false,
) {
  const [state, setState] = useState<ClusterPodLogState>("idle");
  const [text, setText] = useState("");
  const [truncated, setTruncated] = useState(false);
  const [error, setError] = useState<ApiError>();
  const [endReason, setEndReason] = useState<"EOF" | "STREAM_LIMIT_REACHED">();
  const controller = useRef<AbortController>();
  const sequence = useRef(0);
  const stop = useCallback(() => {
    sequence.current += 1;
    controller.current?.abort();
    controller.current = undefined;
    setState((value) => (value === "connecting" || value === "streaming" ? "stopped" : value));
  }, []);
  const clear = useCallback(() => {
    stop();
    setText("");
    setTruncated(false);
    setError(undefined);
    setEndReason(undefined);
    setState("idle");
  }, [stop]);
  const clearDisplay = useCallback(() => {
    setText("");
    setTruncated(false);
  }, []);
  const start = useCallback(async () => {
    stop();
    const current = ++sequence.current;
    const connection = new AbortController();
    controller.current = connection;
    const session = getAuthSessionSignal();
    const cancelSession = () => {
      connection.abort();
      if (sequence.current === current) setState("stopped");
    };
    if (session.aborted) {
      cancelSession();
      return;
    }
    session.addEventListener("abort", cancelSession, { once: true });
    const active = () => current === sequence.current && !connection.signal.aborted;
    setText("");
    setTruncated(false);
    setError(undefined);
    setEndReason(undefined);
    setState("connecting");
    const onError = (value: ApiError) => {
      if (!active()) return;
      setError(value);
      setState("error");
      showNotification({
        id: "cluster-pod-logs",
        state: "error",
        action: "读取 Pod 日志",
        content: { error: value, fallback: "日志读取失败" },
      });
    };
    try {
      const stream = await streamPodLogs(target, { ...options, signal: connection.signal });
      if (!active()) {
        await stream.cancel().catch(() => undefined);
        return;
      }
      await consumeClusterPodLogStream(stream, connection.signal, {
        onReady: () => {
          if (active()) {
            setState("streaming");
            closeNotification("cluster-pod-logs");
          }
        },
        onText: (part) => {
          if (!active() || !part) return;
          setText((previous) => {
            let next = previous + part;
            if (next.length > DISPLAY_UNITS) {
              next = next.slice(-DISPLAY_UNITS);
              const first = next.charCodeAt(0);
              if (first >= 0xdc00 && first <= 0xdfff) next = next.slice(1);
              setTruncated(true);
            }
            return next;
          });
        },
        onEnd: (reason) => {
          if (active()) {
            setEndReason(reason);
            setState("ended");
          }
        },
        onError,
      });
    } catch (value) {
      if (active()) onError(toApiError(value));
    } finally {
      session.removeEventListener("abort", cancelSession);
      if (current === sequence.current) controller.current = undefined;
    }
  }, [target, options, stop]);
  useEffect(() => {
    let disposed = false;
    // 卸载或连续切换时，取消尚未开始的自动连接。
    if (autoStart)
      Promise.resolve().then(() => {
        if (!disposed) return start();
      });
    return () => {
      disposed = true;
      stop();
    };
  }, [autoStart, start, stop]);
  return { state, text, truncated, error, endReason, start, stop, clear, clearDisplay };
}
