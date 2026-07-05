"use client";

import { Line } from "react-chartjs-2";
import { ensureChartJsRegistered } from "./chartSetup";

ensureChartJsRegistered();

interface Props {
  points: { date: string; accuracy: number }[];
  title?: string;
}

export default function ProgressLineChart({ points, title }: Props) {
  const data = {
    labels: points.map((p) => p.date),
    datasets: [
      {
        label: "Accuracy %",
        data: points.map((p) => Number(p.accuracy.toFixed(1))),
        borderColor: "#06B6D4",
        backgroundColor: "rgba(6, 182, 212, 0.15)",
        fill: true,
        tension: 0.35,
        pointBackgroundColor: "#06B6D4",
        pointRadius: 4,
        pointHoverRadius: 6,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      title: title ? { display: true, text: title, color: "#F8FAFC" } : undefined,
    },
    scales: {
      y: {
        beginAtZero: true,
        max: 100,
        ticks: { callback: (v: number | string) => `${v}%` },
      },
    },
  } as const;

  return (
    <div className="h-64 w-full">
      <Line data={data} options={options} />
    </div>
  );
}
