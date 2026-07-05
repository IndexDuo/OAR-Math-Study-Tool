"use client";

import { Bar } from "react-chartjs-2";
import { ensureChartJsRegistered } from "./chartSetup";

ensureChartJsRegistered();

interface Props {
  labels: string[];
  accuracies: number[]; // 0-100
  title?: string;
}

export default function AccuracyBarChart({ labels, accuracies, title }: Props) {
  const colors = accuracies.map((a) => {
    if (a >= 80) return "#10B981";
    if (a >= 50) return "#F59E0B";
    return "#EF4444";
  });

  const data = {
    labels,
    datasets: [
      {
        label: "Accuracy %",
        data: accuracies,
        backgroundColor: colors,
        borderRadius: 6,
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
      <Bar data={data} options={options} />
    </div>
  );
}
