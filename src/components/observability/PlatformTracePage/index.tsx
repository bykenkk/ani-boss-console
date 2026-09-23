import { Select } from "@arco-design/web-react";
import { useState } from "react";
import { ResourcePageFrame } from "@/components/common";
import { Metric } from "@/components/overview/Metric";
import { traceSamples } from "../model";

export function PlatformTracePage() {
  const [traceId, setTraceId] = useState(traceSamples[0].id);
  const trace = traceSamples.find((item) => item.id === traceId) ?? traceSamples[0];

  return (
    <ResourcePageFrame
      header={{
        title: "Trace",
        subtitle: "按 request_id 或 trace_id 查看跨服务调用链和错误 Span。",
        extra: (
          <Select
            value={traceId}
            onChange={setTraceId}
            style={{ width: 280 }}
            options={traceSamples.map((item) => ({
              label: `${item.requestId} · ${item.entryService}`,
              value: item.id,
            }))}
          />
        ),
      }}
    >
      <section className="grid grid-cols-4 gap-3.5 max-[1100px]:grid-cols-2">
        <Metric
          label="Trace 状态"
          value={trace.status === "ok" ? "正常" : "异常"}
          hint={trace.id}
          tone={trace.status === "error" ? "danger" : ""}
        />
        <Metric
          label="总耗时"
          value={`${trace.totalMs} ms`}
          hint={trace.operation}
          tone={trace.totalMs > 1000 ? "warning" : ""}
        />
        <Metric label="Span 数" value={String(trace.spans.length)} hint="跨服务调用" />
        <Metric label="入口服务" value={trace.entryService} hint={trace.startedAt} />
      </section>

      <section className="rounded-lg border border-gray-200 bg-white p-5">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-base font-semibold text-gray-900">调用链瀑布图</div>
            <div className="mt-1 text-xs text-gray-500">
              request_id: <code>{trace.requestId}</code> · trace_id: <code>{trace.id}</code>
            </div>
          </div>
          <span className="text-xs text-gray-500">时间轴 0 - {trace.totalMs} ms</span>
        </div>
        <div className="mt-5 space-y-3">
          {trace.spans.map((span, index) => {
            const left = (span.startMs / trace.totalMs) * 100;
            const width = Math.max(4, (span.durationMs / trace.totalMs) * 100);
            return (
              <div
                key={`${span.service}-${span.operation}-${index}`}
                className="grid grid-cols-[220px_1fr_110px] items-center gap-4"
              >
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium text-gray-800">{span.service}</div>
                  <div className="truncate text-xs text-gray-500">{span.operation}</div>
                </div>
                <div className="h-5 overflow-hidden rounded bg-gray-100">
                  <div
                    className={
                      span.status === "error"
                        ? "h-full rounded bg-red-500"
                        : "h-full rounded bg-blue-500"
                    }
                    style={{
                      marginLeft: `${left}%`,
                      width: `${Math.min(width, 100 - left)}%`,
                    }}
                  />
                </div>
                <div
                  className={
                    span.status === "error"
                      ? "text-right text-sm text-red-600"
                      : "text-right text-sm text-gray-600"
                  }
                >
                  {span.durationMs} ms
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="rounded-lg border border-gray-200 bg-white p-5">
        <div className="text-base font-semibold text-gray-900">耗时排行</div>
        <div className="mt-3 space-y-2">
          {[...trace.spans]
            .sort((left, right) => right.durationMs - left.durationMs)
            .map((span) => (
              <div
                key={`${span.service}-${span.operation}`}
                className="flex items-center justify-between rounded border border-gray-100 px-4 py-3"
              >
                <span>
                  {span.service} · {span.operation}
                </span>
                <span className={span.status === "error" ? "text-red-600" : "text-gray-600"}>
                  {span.durationMs} ms · {span.status}
                </span>
              </div>
            ))}
        </div>
      </section>
    </ResourcePageFrame>
  );
}
