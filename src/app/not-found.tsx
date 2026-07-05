import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center text-center">
      <p className="text-7xl font-bold text-accent-teal">404</p>
      <h1 className="mt-3 text-2xl font-bold text-ink-primary">Off course</h1>
      <p className="mt-2 max-w-md text-sm text-ink-secondary">
        We couldn&apos;t find the page you were looking for. It may have been moved, or you may have typed the URL wrong.
      </p>
      <Link href="/learn" className="btn-primary mt-6">
        Return to Learn
      </Link>
    </div>
  );
}
