import type { PlatformComponentLog } from "@/api/platform";
import { ApiError } from "@/api/request";

export type LogConnectionState = "idle" | "connecting" | "connected" | "reconnecting" | "failed";

export function getLogIdentity(log: PlatformComponentLog) {
  return JSON.stringify([log.timestamp, log.pod, log.container, log.stream, log.message]);
}

export function createComponentLogBuffer() {
  const seen = new Map<string, number>();
  let seenSize = 0;
  let entries: Array<{ identity: string; log: PlatformComponentLog }> = [];
  return {
    append(log: PlatformComponentLog) {
      const identity = getLogIdentity(log);
      if (seen.has(identity)) return;
      seen.set(identity, identity.length);
      seenSize += identity.length;
      while (seen.size > 500 || seenSize > 2 * 1024 * 1024) {
        const oldest = seen.entries().next().value;
        if (!oldest) break;
        seenSize -= oldest[1];
        seen.delete(oldest[0]);
      }
      entries = [...entries, { identity, log }].filter((entry) => seen.has(entry.identity));
      return entries.map((entry) => entry.log);
    },
    clear() {
      seen.clear();
      seenSize = 0;
      entries = [];
    },
  };
}

export function getLogReconnectDelay(error: unknown, failures: number): number | undefined {
  if (error instanceof ApiError) {
    if ([400, 401, 403, 404].includes(error.status ?? 0)) return;
    if (error.status === 429) return error.retryAfterMs ?? 8_000;
    if (error.details?.streamEvent) return 500;
  }
  return Math.min(30_000, 1_000 * 2 ** Math.min(failures, 5));
}

export async function consumeComponentLogStream(
  stream: ReadableStream<Uint8Array>,
  signal: AbortSignal,
  onConnected: () => void,
  onLog: (log: PlatformComponentLog) => void,
) {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let connected = false;
  const cancel = () => {
    reader.cancel().catch(() => undefined);
  };
  signal.addEventListener("abort", cancel, { once: true });

  const consumeFrame = (frame: string) => {
    if (frame.length > 256 * 1024)
      throw new ApiError("组件日志帧过大", { details: { streamEvent: true } });
    const lines = frame.split(/\r?\n/);
    if (lines.some((line) => line.startsWith(":") && line.slice(1).trim() === "connected")) {
      connected = true;
      onConnected();
    }
    const event = lines
      .find((line) => line.startsWith("event:"))
      ?.slice(6)
      .trim();
    const data = lines
      .filter((line) => line.startsWith("data:"))
      .map((line) => line.slice(5).trimStart())
      .join("\n");
    if (!data) return;
    if (event === "log") onLog(JSON.parse(data) as PlatformComponentLog);
    if (event === "error") {
      const payload = JSON.parse(data) as { code?: string; message?: string };
      throw new ApiError(payload.message || "组件日志流暂时中断", {
        code: payload.code,
        details: { streamEvent: true },
      });
    }
  };

  try {
    if (signal.aborted) return;
    while (!signal.aborted) {
      const { value, done } = await reader.read();
      if (signal.aborted) return;
      buffer += decoder.decode(value, { stream: !done });
      const frames = buffer.split(/\r?\n\r?\n/);
      buffer = frames.pop() ?? "";
      for (const frame of frames) {
        if (signal.aborted) return;
        consumeFrame(frame);
      }
      if (done) {
        if (!connected || buffer.trim()) throw new ApiError("组件日志流未完整返回，请稍后重试");
        return;
      }
      if (buffer.length > 256 * 1024)
        throw new ApiError("组件日志帧过大", { details: { streamEvent: true } });
    }
  } finally {
    signal.removeEventListener("abort", cancel);
    await reader.cancel().catch(() => undefined);
    reader.releaseLock();
  }
}
