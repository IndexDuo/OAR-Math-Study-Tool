import Link from "next/link";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faFolderOpen, faPlay } from "@fortawesome/free-solid-svg-icons";

interface Props {
  title?: string;
  message?: string;
  ctaLabel?: string;
  ctaHref?: string;
}

export default function EmptyState({
  title = "No data yet",
  message = "Start a practice session to build progress in this browser.",
  ctaLabel = "Start Practice",
  ctaHref = "/practice",
}: Props) {
  return (
    <div className="card flex flex-col items-center justify-center py-14 text-center">
      <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-accent-teal/10 text-2xl text-accent-teal">
        <FontAwesomeIcon icon={faFolderOpen} aria-hidden />
      </span>
      <h2 className="mt-4 text-xl font-bold text-ink-primary">{title}</h2>
      <p className="mt-2 max-w-md text-sm text-ink-secondary">{message}</p>
      {ctaHref && (
        <Link href={ctaHref} className="btn-primary mt-5">
          <FontAwesomeIcon icon={faPlay} className="h-4 w-4" aria-hidden />
          {ctaLabel}
        </Link>
      )}
    </div>
  );
}
