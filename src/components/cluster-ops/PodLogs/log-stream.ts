import { ApiError } from "@/api/cluster-ops";

interface ClusterPodLogHandlers {
  onReady(value: { pod_uid: string; container: string }): void;
  onText(text: string): void;
  onEnd(reason: "EOF" | "STREAM_LIMIT_REACHED"): void;
  onError(error: ApiError): void;
}
const MAX_EVENT_BYTES = 64 * 1024;
function protocolError(): ApiError {
  return new ApiError("日志流协议异常", { status: 502, reason: "LOG_STREAM_PROTOCOL_ERROR" });
}

export async function consumeClusterPodLogStream(
  stream: ReadableStream<Uint8Array>,
  signal: AbortSignal,
  handlers: ClusterPodLogHandlers,
): Promise<void> {
  const reader = stream.getReader();
  const sseDecoder = new TextDecoder("utf-8", { fatal: true });
  const logDecoder = new TextDecoder("utf-8");
  const encoder = new TextEncoder();
  let buffer = "",
    ready = false,
    terminated = false;
  const cancel = () => {
    reader.cancel().catch(() => undefined);
  };
  signal.addEventListener("abort", cancel, { once: true });
  const fail = (error: ApiError) => {
    if (!terminated && !signal.aborted) {
      terminated = true;
      handlers.onError(error);
    }
  };
  const event = (block: string): (() => void) | undefined => {
    if (encoder.encode(block).length > MAX_EVENT_BYTES) throw protocolError();
    let kind = "",
      data = "";
    for (const line of block.split(/\r?\n/)) {
      if (line.startsWith(":")) continue;
      if (line.startsWith("event:")) kind = line.slice(6).trim();
      else if (line.startsWith("data:"))
        data += `${data ? "\n" : ""}${line.slice(5).replace(/^ /, "")}`;
      else if (line) throw protocolError();
    }
    if (!kind && !data) return;
    let value: Record<string, unknown>;
    try {
      const parsed: unknown = JSON.parse(data);
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw protocolError();
      value = parsed as Record<string, unknown>;
    } catch {
      throw protocolError();
    }
    if (
      kind === "ready" &&
      !ready &&
      typeof value.pod_uid === "string" &&
      typeof value.container === "string"
    ) {
      ready = true;
      const readyValue = { pod_uid: value.pod_uid, container: value.container };
      return () => handlers.onReady(readyValue);
    }
    if (!ready) throw protocolError();
    if (kind === "data" && typeof value.data_base64 === "string") {
      // atob accepts some malformed encodings; the wire contract requires standard base64.
      if (
        !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(value.data_base64)
      )
        throw protocolError();
      let bytes: Uint8Array;
      try {
        bytes = Uint8Array.from(atob(value.data_base64), (character) => character.charCodeAt(0));
      } catch {
        throw protocolError();
      }
      const decoded = logDecoder.decode(bytes, { stream: true });
      return () => handlers.onText(decoded);
    }
    if (kind === "end" && (value.reason === "EOF" || value.reason === "STREAM_LIMIT_REACHED")) {
      const decoded = logDecoder.decode(),
        reason = value.reason;
      terminated = true;
      return () => {
        handlers.onText(decoded);
        handlers.onEnd(reason);
      };
    }
    if (
      kind === "error" &&
      typeof value.code === "number" &&
      typeof value.reason === "string" &&
      typeof value.message === "string"
    ) {
      const metadata =
        value.metadata && typeof value.metadata === "object" && !Array.isArray(value.metadata)
          ? Object.fromEntries(
              Object.entries(value.metadata).filter(([, entry]) => typeof entry === "string"),
            )
          : {};
      const decoded = logDecoder.decode(),
        error = new ApiError(value.message, {
          status: value.code,
          code: value.code,
          reason: value.reason,
          details: metadata,
          requestId: typeof metadata.request_id === "string" ? metadata.request_id : undefined,
        });
      terminated = true;
      return () => {
        handlers.onText(decoded);
        handlers.onError(error);
      };
    }
    throw protocolError();
  };
  try {
    while (!signal.aborted && !terminated) {
      let result: ReadableStreamReadResult<Uint8Array>;
      try {
        result = await reader.read();
      } catch {
        if (!signal.aborted)
          fail(
            new ApiError("日志流意外中断，请手动重新连接", {
              status: 503,
              reason: "LOG_STREAM_INTERRUPTED",
            }),
          );
        break;
      }
      if (signal.aborted) break;
      if (result.done) {
        fail(
          new ApiError("日志流未正常结束，请手动重新连接", {
            status: 503,
            reason: "LOG_STREAM_INTERRUPTED",
          }),
        );
        break;
      }
      try {
        buffer += sseDecoder.decode(result.value, { stream: true });
      } catch {
        fail(protocolError());
        break;
      }
      for (;;) {
        const separator = /\r?\n\r?\n/.exec(buffer);
        if (!separator || terminated) break;
        const block = buffer.slice(0, separator.index);
        buffer = buffer.slice(separator.index + separator[0].length);
        let deliver: (() => void) | undefined;
        try {
          deliver = event(block);
        } catch (error) {
          if (error instanceof ApiError) fail(error);
          else throw error;
        }
        deliver?.();
      }
      if (!terminated && encoder.encode(buffer).length > MAX_EVENT_BYTES) fail(protocolError());
    }
  } finally {
    signal.removeEventListener("abort", cancel);
    await reader.cancel().catch(() => undefined);
    reader.releaseLock();
  }
}
