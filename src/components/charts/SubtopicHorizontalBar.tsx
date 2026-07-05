"use client";

import { Bar } from "react-chartjs-2";
import type { TooltipItem } from "chart.js";
import { ensureChartJsRegistered } from "./chartSetup";

ensureChartJsRegistered();

interface Props {
  items: { label: string; accuracy: number; total: number }[];
}

export default function SubtopicHorizontalBar({ items }: Props) {
  const colors = items.map((i) => {
    if (i.accuracy >= 80) return "#10B981";
    if (i.accuracy >= 50) return "#F59E0B";
    return "#EF4444";
  });

  const data = {
    labels: items.map((i) => i.label),
    datasets: [
      {
        label: "Accuracy %",
        data: items.map((i) => Number(i.accuracy.toFixed(1))),
        backgroundColor: colors,
        borderRadius: 6,
      },
    ],
  };

  const options = {
    indexAxis: "y" as const,
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (ctx: TooltipItem<"bar">) => {
            const i = items[ctx.dataIndex];
            const x = typeof ctx.parsed.x === "number" ? ctx.parsed.x : 0;
            return `${x.toFixed(1)}% · ${i.total} attempted`;
          },
        },
      },
    },
    scales: {
      x: {
        beginAtZero: true,
        max: 100,
        ticks: { callback: (v: number | string) => `${v}%` },
      },
    },
  };

  const height = Math.max(240, items.length * 32);

  return (
    <div style={{ height }} className="w-full">
      <Bar data={data} options={options} />
    </div>
  );
}
