"use client";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faMoon, faSun, faDesktop } from "@fortawesome/free-solid-svg-icons";
import { useTheme, type Theme } from "@/hooks/useTheme";

const OPTIONS: { value: Theme; icon: typeof faMoon; label: string }[] = [
  { value: "light", icon: faSun, label: "Light" },
  { value: "system", icon: faDesktop, label: "System" },
  { value: "dark", icon: faMoon, label: "Dark" },
];

export default function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  return (
    <div className="flex items-center rounded-lg border border-line bg-hover p-0.5" role="group" aria-label="Theme">
      {OPTIONS.map(({ value, icon, label }) => (
        <button
          key={value}
          type="button"
          onClick={() => setTheme(value)}
          aria-pressed={theme === value}
          aria-label={`${label} theme`}
          title={`${label} mode`}
          className={`flex items-center justify-center rounded-md p-1.5 transition-colors ${
            theme === value
              ? "bg-navy-800 text-accent-teal shadow-sm"
              : "text-ink-muted hover:text-ink-primary"
          }`}
        >
          <FontAwesomeIcon icon={icon} className="h-3.5 w-3.5" aria-hidden />
        </button>
      ))}
    </div>
  );
}
