"use client";

import Link from "next/link";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faAnchor, faPlay } from "@fortawesome/free-solid-svg-icons";
import ThemeToggle from "./ThemeToggle";
import ProgressControls from "./ProgressControls";

export default function Header() {
  return (
    <header className="sticky top-0 z-10 flex items-center justify-between border-b border-line bg-navy-950/80 px-4 py-3 backdrop-blur sm:px-6 lg:px-10">
      <div className="flex items-center gap-3 lg:hidden">
        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent-teal/20 text-accent-teal">
          <FontAwesomeIcon icon={faAnchor} aria-hidden />
        </span>
        <div>
          <p className="text-sm font-bold">OAR Math</p>
        </div>
      </div>
      <div className="ml-auto flex items-center gap-3">
        <ProgressControls />
        <ThemeToggle />
        <Link href="/practice" className="btn-primary">
          <FontAwesomeIcon icon={faPlay} className="h-4 w-4" aria-hidden />
          <span className="hidden sm:inline">Start Practice</span>
          <span className="sm:hidden">Practice</span>
        </Link>
      </div>
    </header>
  );
}
