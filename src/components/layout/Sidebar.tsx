"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faPlay,
  faBookOpenReader,
  faClockRotateLeft,
  faAnchor,
  faGraduationCap,
  faClipboardCheck,
  faCircleInfo,
} from "@fortawesome/free-solid-svg-icons";

const NAV_GROUPS: Array<{
  label: string | null;
  items: Array<{ href: string; label: string; icon: typeof faPlay }>;
}> = [
  {
    label: "Study",
    items: [
      { href: "/learn", label: "Learn", icon: faGraduationCap },
      { href: "/practice", label: "Practice", icon: faPlay },
      { href: "/tests", label: "Tests", icon: faClipboardCheck },
      { href: "/review", label: "Review", icon: faBookOpenReader },
    ],
  },
  {
    label: "Records",
    items: [
      { href: "/history", label: "History", icon: faClockRotateLeft },
      { href: "/about", label: "About", icon: faCircleInfo },
    ],
  },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside
      className="fixed inset-y-0 left-0 z-20 hidden w-64 flex-col border-r border-line bg-navy-900/80 backdrop-blur lg:flex"
      aria-label="Primary navigation"
    >
      <div className="flex items-center gap-3 px-6 py-6">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent-teal/20 text-accent-teal">
          <FontAwesomeIcon icon={faAnchor} aria-hidden />
        </span>
        <div>
          <p className="text-sm font-bold text-ink-primary">OAR Math</p>
        </div>
      </div>

      <nav className="flex-1 px-4">
        {NAV_GROUPS.map((group, gi) => (
          <div key={group.label ?? gi} className={gi > 0 ? "mt-6" : undefined}>
            {group.label && (
              <p className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-wider text-ink-muted">
                {group.label}
              </p>
            )}
            <ul className="space-y-1">
              {group.items.map((item) => {
                const active =
                  item.href === "/"
                    ? pathname === "/"
                    : pathname.startsWith(item.href);
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      aria-current={active ? "page" : undefined}
                      className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                        active
                          ? "bg-accent-teal/15 text-accent-teal"
                          : "text-ink-secondary hover:bg-hover hover:text-ink-primary"
                      }`}
                    >
                      <FontAwesomeIcon icon={item.icon} className="h-4 w-4" aria-hidden />
                      <span>{item.label}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      <div className="h-4" aria-hidden />
    </aside>
  );
}
