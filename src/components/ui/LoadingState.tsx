export default function LoadingState({ label = "Loading..." }: { label?: string }) {
  return (
    <div className="flex items-center justify-center py-16" role="status" aria-live="polite">
      <div className="flex flex-col items-center gap-3">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-line border-t-accent-teal" />
        <p className="text-sm text-ink-muted">{label}</p>
      </div>
    </div>
  );
}

export function ErrorState({ message }: { message: string }) {
  return (
    <div className="card border-accent-red/30">
      <p className="text-sm font-semibold text-accent-red">Something went wrong</p>
      <p className="mt-1 text-sm text-ink-secondary">{message}</p>
      <p className="mt-3 text-xs text-ink-muted">
        Tip: Try refreshing the page. If progress looks stuck, export anything you need from History and reset local progress from the header controls.
      </p>
    </div>
  );
}
