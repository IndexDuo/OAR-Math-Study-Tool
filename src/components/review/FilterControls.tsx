"use client";

import { SECTIONS, SUBTOPICS } from "@/lib/constants";

export interface AnswerFilters {
  section?: string;
  subtopic?: string;
  difficulty?: string;
  correct?: "true" | "false";
  flagged?: "true" | "false";
}

interface Props {
  value: AnswerFilters;
  onChange: (next: AnswerFilters) => void;
}

export default function FilterControls({ value, onChange }: Props) {
  const availableSubtopics = value.section
    ? SUBTOPICS.filter((s) => s.section === value.section)
    : SUBTOPICS;

  function update<K extends keyof AnswerFilters>(key: K, v: AnswerFilters[K]) {
    const next: AnswerFilters = { ...value, [key]: v || undefined };
    if (key === "section") next.subtopic = undefined;
    onChange(next);
  }

  return (
    <div className="card">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <label className="flex flex-col gap-1 text-xs">
          <span className="font-semibold text-ink-secondary">Section</span>
          <select
            value={value.section ?? ""}
            onChange={(e) => update("section", e.target.value || undefined)}
            className="rounded-lg border border-line bg-navy-950/60 px-3 py-2 text-sm text-ink-primary focus:border-accent-teal focus:outline-none"
          >
            <option value="">All sections</option>
            {SECTIONS.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1 text-xs">
          <span className="font-semibold text-ink-secondary">Subtopic</span>
          <select
            value={value.subtopic ?? ""}
            onChange={(e) => update("subtopic", e.target.value || undefined)}
            className="rounded-lg border border-line bg-navy-950/60 px-3 py-2 text-sm text-ink-primary focus:border-accent-teal focus:outline-none"
          >
            <option value="">All subtopics</option>
            {availableSubtopics.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1 text-xs">
          <span className="font-semibold text-ink-secondary">Difficulty</span>
          <select
            value={value.difficulty ?? ""}
            onChange={(e) => update("difficulty", e.target.value || undefined)}
            className="rounded-lg border border-line bg-navy-950/60 px-3 py-2 text-sm text-ink-primary focus:border-accent-teal focus:outline-none"
          >
            <option value="">All difficulties</option>
            <option value="easy">Easy</option>
            <option value="medium">Medium</option>
            <option value="hard">Hard</option>
          </select>
        </label>

        <label className="flex flex-col gap-1 text-xs">
          <span className="font-semibold text-ink-secondary">Result</span>
          <select
            value={value.correct ?? ""}
            onChange={(e) =>
              update(
                "correct",
                (e.target.value || undefined) as "true" | "false" | undefined
              )
            }
            className="rounded-lg border border-line bg-navy-950/60 px-3 py-2 text-sm text-ink-primary focus:border-accent-teal focus:outline-none"
          >
            <option value="">All</option>
            <option value="true">Correct only</option>
            <option value="false">Incorrect only</option>
          </select>
        </label>

        <label className="flex flex-col gap-1 text-xs">
          <span className="font-semibold text-ink-secondary">Flagged</span>
          <select
            value={value.flagged ?? ""}
            onChange={(e) =>
              update(
                "flagged",
                (e.target.value || undefined) as "true" | "false" | undefined
              )
            }
            className="rounded-lg border border-line bg-navy-950/60 px-3 py-2 text-sm text-ink-primary focus:border-accent-teal focus:outline-none"
          >
            <option value="">Any</option>
            <option value="true">Flagged only</option>
            <option value="false">Unflagged only</option>
          </select>
        </label>
      </div>
    </div>
  );
}
