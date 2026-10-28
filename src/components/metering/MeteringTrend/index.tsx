import type { EChartsOption, LineSeriesOption } from "echarts";
import ReactECharts from "echarts-for-react";

interface MeteringTrendProps {
  labels: string[];
  values: (number | null)[];
  knownValues?: (number | null)[];
  label: string;
  unit: string;
}

export function MeteringTrend({ labels, values, knownValues, label, unit }: MeteringTrendProps) {
  const partialValues = values.map((value, index) =>
    value === null ? (knownValues?.[index] ?? null) : null,
  );
  const hasPartialValues = partialValues.some((value) => value !== null);
  const partialLabel = label + "（已知部分）";
  const partialSeries: LineSeriesOption[] = hasPartialValues
    ? [
        {
          name: partialLabel,
          type: "line",
          smooth: false,
          connectNulls: false,
          symbol: "circle",
          symbolSize: 6,
          itemStyle: { color: "#fff", borderColor: "#e6862b", borderWidth: 2 },
          lineStyle: { width: 2, color: "#e6862b", type: "dashed" },
          data: partialValues,
        },
      ]
    : [];
  const option: EChartsOption = {
    animationDuration: 400,
    color: ["#2b5ce6"],
    grid: { top: 24, right: 24, bottom: hasPartialValues ? 52 : 28, left: 58 },
    legend: hasPartialValues ? { bottom: 0, data: [label, partialLabel] } : undefined,
    tooltip: {
      trigger: "axis",
      valueFormatter: (value) => (value === null || value === undefined ? "-" : `${value} ${unit}`),
    },
    xAxis: {
      type: "category",
      boundaryGap: false,
      data: labels,
      axisLine: { lineStyle: { color: "#dde2ec" } },
      axisTick: { show: false },
      axisLabel: { color: "#9aa3b5", fontSize: 11 },
    },
    yAxis: {
      type: "value",
      name: unit,
      axisLabel: { color: "#9aa3b5", fontSize: 11 },
      nameTextStyle: { color: "#9aa3b5" },
      splitLine: { lineStyle: { color: "#edf0f6" } },
    },
    series: [
      {
        name: label,
        type: "line",
        smooth: false,
        connectNulls: false,
        symbol: "circle",
        symbolSize: 8,
        itemStyle: { color: "#fff", borderColor: "#2b5ce6", borderWidth: 2 },
        lineStyle: { width: 2.5, color: "#2b5ce6" },
        data: values,
        areaStyle: {
          color: {
            type: "linear",
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              { offset: 0, color: "rgba(43, 92, 230, 0.22)" },
              { offset: 1, color: "rgba(43, 92, 230, 0.02)" },
            ],
          },
        },
      },
      ...partialSeries,
    ],
  };

  return <ReactECharts option={option} notMerge lazyUpdate className="h-70 w-full" />;
}
