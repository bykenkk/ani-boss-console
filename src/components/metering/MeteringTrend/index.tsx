import type { EChartsOption } from "echarts";
import ReactECharts from "echarts-for-react";

interface MeteringTrendProps {
  labels: string[];
  values: number[];
  label: string;
  unit: string;
}

export function MeteringTrend({ labels, values, label, unit }: MeteringTrendProps) {
  const option: EChartsOption = {
    animationDuration: 400,
    color: ["#2b5ce6"],
    grid: { top: 24, right: 24, bottom: 28, left: 58 },
    tooltip: {
      trigger: "axis",
      valueFormatter: (value) => `${value} ${unit}`,
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
    ],
  };

  return <ReactECharts option={option} notMerge lazyUpdate className="h-70 w-full" />;
}
