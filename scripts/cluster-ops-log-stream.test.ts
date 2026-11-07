import assert from "node:assert/strict";
import { test } from "node:test";
import { ApiError } from "@/api/cluster-ops";
import { consumeClusterPodLogStream } from "@/components/cluster-ops/PodLogs/log-stream";

const encoder = new TextEncoder();
function frame(event: string, data: unknown): string {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}
const ready = frame("ready", { pod_uid: "test-uid", container: "主容器" });
function source(text: string, chunkSize = 7): ReadableStream<Uint8Array> {
  const bytes = encoder.encode(text);
  return new ReadableStream({
    start(controller) {
      for (let index = 0; index < bytes.length; index += chunkSize)
        controller.enqueue(bytes.slice(index, index + chunkSize));
      controller.close();
    },
  });
}
async function consume(text: string, chunkSize = 7) {
  const output: string[] = [],
    errors: ApiError[] = [],
    ends: string[] = [],
    readyValues: { pod_uid: string; container: string }[] = [];
  await consumeClusterPodLogStream(source(text, chunkSize), new AbortController().signal, {
    onReady: (value) => readyValues.push(value),
    onText: (value) => output.push(value),
    onError: (value) => errors.push(value),
    onEnd: (value) => ends.push(value),
  });
  return { output: output.join(""), errors, ends, readyValues };
}
test("incremental HTTP and log UTF-8 decoding retains empty and duplicate lines", async () => {
  const original = "中文\n\n重复行\n重复行\n";
  const data = [...encoder.encode(original)]
    .map((byte) => frame("data", { data_base64: btoa(String.fromCharCode(byte)) }))
    .join("");
  const result = await consume(
    `${ready}: heartbeat\n\n${data}${frame("end", { reason: "EOF" })}`,
    1,
  );
  assert.equal(result.output, original);
  assert.deepEqual(result.ends, ["EOF"]);
  assert.equal(result.errors.length, 0);
  assert.equal(result.readyValues[0].container, "主容器");
});
test("stream limit is a normal terminal reason", async () => {
  const result = await consume(ready + frame("end", { reason: "STREAM_LIMIT_REACHED" }));
  assert.deepEqual(result.ends, ["STREAM_LIMIT_REACHED"]);
  assert.equal(result.errors.length, 0);
});
test("ERROR is delivered once without a second EOF error", async () => {
  const result = await consume(
    ready +
      frame("error", {
        code: 503,
        reason: "LOG_READ_FAILED",
        message: "日志读取失败",
        metadata: {},
      }),
  );
  assert.deepEqual(
    result.errors.map((error) => error.reason),
    ["LOG_READ_FAILED"],
  );
  assert.equal(result.ends.length, 0);
});
test("EOF without END is an interruption", async () => {
  const result = await consume(ready);
  assert.deepEqual(
    result.errors.map((error) => error.reason),
    ["LOG_STREAM_INTERRUPTED"],
  );
});
test("first DATA, duplicate READY, unknown event and malformed base64 fail the protocol", async () => {
  for (const invalid of [
    frame("data", { data_base64: "YQ==" }),
    ready + ready,
    ready + frame("unknown", {}),
    ready + frame("data", { data_base64: "!bad!" }),
  ]) {
    const result = await consume(invalid);
    assert.deepEqual(
      result.errors.map((error) => error.reason),
      ["LOG_STREAM_PROTOCOL_ERROR"],
    );
  }
});
test("unfinished event buffer is bounded", async () => {
  const result = await consume(ready + "data: " + "x".repeat(64 * 1024));
  assert.deepEqual(
    result.errors.map((error) => error.reason),
    ["LOG_STREAM_PROTOCOL_ERROR"],
  );
});
test("user stop cancels and releases the reader without reporting an error", async () => {
  const controller = new AbortController();
  let cancelled = 0,
    errors = 0;
  const stream = new ReadableStream<Uint8Array>({
    start(value) {
      value.enqueue(encoder.encode(ready));
    },
    cancel() {
      cancelled += 1;
    },
  });
  await consumeClusterPodLogStream(stream, controller.signal, {
    onReady: () => controller.abort(),
    onText: () => undefined,
    onEnd: () => undefined,
    onError: () => {
      errors += 1;
    },
  });
  assert.equal(cancelled, 1);
  assert.equal(errors, 0);
  const reader = stream.getReader();
  reader.releaseLock();
});
test("business callback exceptions propagate without a second protocol callback", async () => {
  const failure = new ApiError("callback failed");
  let errors = 0;
  await assert.rejects(
    consumeClusterPodLogStream(source(ready), new AbortController().signal, {
      onReady: () => {
        throw failure;
      },
      onText: () => undefined,
      onEnd: () => undefined,
      onError: () => {
        errors += 1;
      },
    }),
    (error: unknown) => error === failure,
  );
  assert.equal(errors, 0);
});
