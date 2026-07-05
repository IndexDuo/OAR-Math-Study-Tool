"use client";

import { useRef, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faDownload, faFileImport, faRotateLeft } from "@fortawesome/free-solid-svg-icons";
import {
  exportProgressPackage,
  importProgressPackage,
  resetLocalProgress,
} from "@/lib/localProgress";
import { downloadJson } from "@/lib/exportResults";

export default function ProgressControls() {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [busy, setBusy] = useState(false);

  function exportProgress() {
    const date = new Date().toISOString().slice(0, 10);
    downloadJson(exportProgressPackage(), `oar-math-progress-${date}.json`);
  }

  async function importProgress(file: File | undefined) {
    if (!file) return;
    setBusy(true);
    try {
      const payload = JSON.parse(await file.text()) as unknown;
      importProgressPackage(payload);
      alert("Progress imported.");
    } catch (e) {
      alert((e as Error).message);
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  function resetProgress() {
    if (!confirm("Reset all local progress on this browser? This cannot be undone.")) return;
    resetLocalProgress();
  }

  return (
    <div className="flex items-center gap-1.5">
      <button
        type="button"
        onClick={exportProgress}
        className="rounded-lg border border-line bg-navy-800 px-2.5 py-2 text-xs font-semibold text-ink-secondary transition-colors hover:border-accent-teal/50 hover:text-accent-teal"
        title="Export progress"
      >
        <FontAwesomeIcon icon={faDownload} className="h-3.5 w-3.5" aria-hidden />
        <span className="ml-1.5 hidden xl:inline">Export</span>
      </button>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={busy}
        className="rounded-lg border border-line bg-navy-800 px-2.5 py-2 text-xs font-semibold text-ink-secondary transition-colors hover:border-accent-teal/50 hover:text-accent-teal disabled:opacity-60"
        title="Import progress"
      >
        <FontAwesomeIcon icon={faFileImport} className="h-3.5 w-3.5" aria-hidden />
        <span className="ml-1.5 hidden xl:inline">Import</span>
      </button>
      <button
        type="button"
        onClick={resetProgress}
        className="rounded-lg border border-line bg-navy-800 px-2.5 py-2 text-xs font-semibold text-ink-secondary transition-colors hover:border-accent-red/50 hover:text-accent-red"
        title="Reset progress"
      >
        <FontAwesomeIcon icon={faRotateLeft} className="h-3.5 w-3.5" aria-hidden />
        <span className="ml-1.5 hidden xl:inline">Reset</span>
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="application/json,.json"
        className="hidden"
        onChange={(event) => void importProgress(event.target.files?.[0])}
      />
    </div>
  );
}
