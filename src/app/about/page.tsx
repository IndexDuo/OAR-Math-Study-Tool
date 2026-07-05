import Link from "next/link";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faBookOpenReader,
  faClipboardCheck,
  faClockRotateLeft,
  faDownload,
  faFileImport,
  faGraduationCap,
  faPlay,
  faRotateLeft,
} from "@fortawesome/free-solid-svg-icons";

const PAGE_GUIDE = [
  {
    href: "/learn",
    label: "Learn",
    icon: faGraduationCap,
    text: "Read the short lesson pages and follow the math path when you want structure.",
  },
  {
    href: "/practice",
    label: "Practice",
    icon: faPlay,
    text: "Pick subtopics first, then start a focused question set.",
  },
  {
    href: "/tests",
    label: "Tests",
    icon: faClipboardCheck,
    text: "Use checkpoint-style quizzes when you want a broader readiness check.",
  },
  {
    href: "/review",
    label: "Review",
    icon: faBookOpenReader,
    text: "Come back to missed questions and weak spots after practice or tests.",
  },
  {
    href: "/history",
    label: "History",
    icon: faClockRotateLeft,
    text: "Reopen past sessions and results saved in this browser.",
  },
];

const PROGRESS_GUIDE = [
  {
    label: "Export",
    icon: faDownload,
    text: "Download your saved progress as a JSON file before switching browsers or computers.",
  },
  {
    label: "Import",
    icon: faFileImport,
    text: "Load that JSON file on another machine to bring your progress with you.",
  },
  {
    label: "Reset",
    icon: faRotateLeft,
    text: "Clear the progress stored in this browser when you want a fresh start.",
  },
];

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6 animate-fade-in">
      <div>
        <h1 className="page-title">About</h1>
        <p className="page-subtitle">
          This is a simple OAR math study tool. Start with Learn if you want a guided path, or go
          straight to Practice if you already know what you want to work on. Your progress is saved
          locally in this browser.
        </p>
      </div>

      <section className="card space-y-4" aria-labelledby="page-guide-heading">
        <div>
          <h2 id="page-guide-heading" className="text-lg font-bold text-ink-primary">
            Pages
          </h2>
          <p className="mt-1 text-sm text-ink-secondary">
            Each page has a small job, so you can move between learning, drilling, and checking
            results without extra setup.
          </p>
        </div>

        <div className="space-y-3">
          {PAGE_GUIDE.map((page) => (
            <Link
              key={page.href}
              href={page.href}
              className="block rounded-lg border border-line bg-hover/40 p-4 transition-colors hover:border-accent-teal/40 hover:bg-hover"
            >
              <span className="flex items-start gap-3">
                <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-accent-teal/15 text-accent-teal">
                  <FontAwesomeIcon icon={page.icon} className="h-4 w-4" aria-hidden />
                </span>
                <span>
                  <span className="text-sm font-bold text-accent-teal">{page.label}</span>
                  <span className="mt-1 block text-sm leading-relaxed text-ink-secondary">
                    {page.text}
                  </span>
                </span>
              </span>
            </Link>
          ))}
        </div>
      </section>

      <section className="card space-y-4" aria-labelledby="progress-heading">
        <div>
          <h2 id="progress-heading" className="text-lg font-bold text-ink-primary">
            Progress
          </h2>
          <p className="mt-1 text-sm text-ink-secondary">
            This app does not use an account. Lesson visits, practice results, and review history
            stay on the browser you are using now.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          {PROGRESS_GUIDE.map((item) => (
            <div key={item.label} className="rounded-lg border border-line bg-hover/40 p-4">
              <FontAwesomeIcon icon={item.icon} className="h-4 w-4 text-accent-teal" aria-hidden />
              <p className="mt-3 text-sm font-bold text-ink-primary">{item.label}</p>
              <p className="mt-1 text-sm leading-relaxed text-ink-secondary">{item.text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-xl border border-line bg-navy-800 p-4">
        <p className="text-sm leading-relaxed text-ink-secondary">
          Wish you all luck on your OAR!
        </p>
      </section>
    </div>
  );
}
