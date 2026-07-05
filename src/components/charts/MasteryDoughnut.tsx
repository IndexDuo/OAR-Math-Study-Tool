"use client";

import { Doughnut } from "react-chartjs-2";
import { ensureChartJsRegistered } from "./chartSetup";

ensureChartJsRegistered();

interface Props {
  accuracy: number; // 0-100
  color?: string;
  label?: string;
  size?: number;
}

export default function MasteryDoughnut({
  accuracy,
  color = "#06B6D4",
  label,
  size = 140,
}: Props) {
  const pct = Math.max(0, Math.min(100, Math.round(accuracy)));
  const data = {
    labels: ["Mastered", "Remaining"],
    datasets: [
      {
        data: [pct, 100 - pct],
        backgroundColor: [color, "rgba(255,255,255,0.08)"],
        borderWidth: 0,
        cutout: "78%",
      },
    ],
  };
  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: { enabled: false },
    },
  } as const;

  return (
    <div
      className="relative flex shrink-0 items-center justify-center"
      style={{ width: size, height: size }}
      role="img"
      aria-label={`${label ?? "Mastery"}: ${pct} percent`}
    >
      <Doughnut data={data} options={options} />
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-bold text-ink-primary">{pct}%</span>
        {label && <span className="text-[11px] text-ink-muted">{label}</span>}
      </div>
    </div>
  );
}
