// Centralized Chart.js registration — import this from any chart component.
// Registering modules here once avoids duplicate/missing-element errors.

import {
  Chart as ChartJS,
  ArcElement,
  BarElement,
  CategoryScale,
  Legend,
  LineElement,
  LinearScale,
  PointElement,
  Title,
  Tooltip,
  Filler,
} from "chart.js";

let registered = false;
export function ensureChartJsRegistered() {
  if (registered) return;
  ChartJS.register(
    ArcElement,
    BarElement,
    CategoryScale,
    LinearScale,
    LineElement,
    PointElement,
    Title,
    Tooltip,
    Legend,
    Filler
  );
  ChartJS.defaults.color = "#CBD5E1";
  ChartJS.defaults.borderColor = "rgba(255,255,255,0.08)";
  ChartJS.defaults.font.family =
    'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  registered = true;
}
