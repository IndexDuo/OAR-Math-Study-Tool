"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faPlay,
  faBookOpenReader,
  faClockRotateLeft,
  faGraduationCap,
  faClipboardCheck,
  faCircleInfo,
} from "@fortawesome/free-solid-svg-icons";

const ITEMS = [
  { href: "/learn", label: "Learn", icon: faGraduationCap },
  { href: "/practice", label: "Practice", icon: faPlay },
  { href: "/tests", label: "Tests", icon: faClipboardCheck },
  { href: "/review", label: "Review", icon: faBookOpenReader },
  { href: "/history", label: "History", icon: faClockRotateLeft },
  { href: "/about", label: "About", icon: faCircleInfo },
];

export default function MobileNav() {
  const pathname = usePathname();

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-navy-900/95 backdrop-blur lg:hidden"
      aria-label="Mobile navigation"
    >
      <ul className="grid grid-cols-6">
        {ITEMS.map((item) => {
          const active =
            item.href === "/"
              ? pathname === "/"
              : pathname.startsWith(item.href);
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`flex min-h-[56px] flex-col items-center justify-center gap-1 text-[11px] font-medium ${
                  active ? "text-accent-teal" : "text-ink-muted"
                }`}
              >
                <FontAwesomeIcon icon={item.icon} className="h-5 w-5" aria-hidden />
                <span>{item.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
