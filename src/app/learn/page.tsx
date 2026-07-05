"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { startQuickPractice } from "@/lib/startQuickPractice";
import {
  faGraduationCap,
  faLock,
  faUnlock,
  faCheck,
  faBookOpen,
  faPlay,
  faArrowRight,
} from "@fortawesome/free-solid-svg-icons";
import { SECTIONS, getSubtopicMeta, getSectionMeta } from "@/lib/constants";
import {
  getLearningNodes,
  groupByRank,
  computeLockState,
  COMPLETE_THRESHOLD,
  type LearningNode,
} from "@/lib/learningPath";
import { useStats } from "@/hooks/useStats";
import { getLocalConceptPages } from "@/lib/localProgress";
import LoadingState, { ErrorState } from "@/components/ui/LoadingState";
import type { Section } from "@/types";

const VISITED_KEY_PREFIX = "concept_visited_";
const LOCK_PREF_KEY = "oar_learn_prereq_locks_enabled";

const LEVEL_NAMES: Partial<Record<Section, string[]>> = {
  math: ["Foundations", "Core Arithmetic", "Applied Problems", "Algebra", "Advanced Topics", "Geometry & Measurement"],
};

function levelName(section: Section, rank: number): string {
  const names = LEVEL_NAMES[section];
  return names?.[rank - 1] ?? `Stage ${rank}`;
}

export default function LearnIndexPage() {
  const router = useRouter();
  const { data, loading, error } = useStats();
  const [activeSection, setActiveSection] = useState<Section>("math");
  const [conceptIds, setConceptIds] = useState<Set<string>>(new Set());
  const [visited, setVisited] = useState<Set<string>>(new Set());
  const [startingId, setStartingId] = useState<string | null>(null);
  const [startErrorId, setStartErrorId] = useState<{ id: string; msg: string } | null>(null);
  const [locksEnabled, setLocksEnabled] = useState(true);

  function handleLocksEnabledChange(enabled: boolean) {
    setLocksEnabled(enabled);
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(LOCK_PREF_KEY, String(enabled));
    } catch {
      // localStorage may be unavailable; the toggle still works for this page view.
    }
  }

  async function handleQuickPractice(section: Section, subtopicId: string) {
    if (startingId) return;
    setStartingId(subtopicId);
    setStartErrorId(null);
    try {
      const sessionId = await startQuickPractice(section, subtopicId, 5, "smart", {
        origin: "learn",
        returnTo: "/learn",
        returnLabel: "Back to learning path",
        sourceSubtopic: subtopicId,
        sourceSection: section,
        sourceMode: "smart",
        sourceCta: "Practice",
      });
      router.push(`/practice/${sessionId}`);
    } catch (e) {
      setStartErrorId({ id: subtopicId, msg: (e as Error).message });
      setStartingId(null);
    }
  }

  useEffect(() => {
    setConceptIds(new Set(getLocalConceptPages().map((page) => page.subtopic)));
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      setLocksEnabled(window.localStorage.getItem(LOCK_PREF_KEY) !== "false");
    } catch {
      setLocksEnabled(true);
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const v = new Set<string>();
    for (let i = 0; i < window.localStorage.length; i++) {
      const key = window.localStorage.key(i);
      if (key?.startsWith(VISITED_KEY_PREFIX) && window.localStorage.getItem(key) === "true") {
        v.add(key.slice(VISITED_KEY_PREFIX.length));
      }
    }
    setVisited(v);
  }, []);

  const masteryById = useMemo(() => {
    const m = new Map<string, { accuracy: number; totalAnswered: number }>();
    if (!data) return m;
    for (const s of data.subtopics) {
      m.set(s.subtopic, { accuracy: s.accuracy, totalAnswered: s.totalAnswered });
    }
    return m;
  }, [data]);

  const questionsById = useMemo(() => {
    const m = new Map<string, number>();
    if (!data) return m;
    for (const s of data.subtopics) m.set(s.subtopic, s.questionsAvailable);
    return m;
  }, [data]);

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} />;

  const nodes = getLearningNodes(activeSection);
  const groups = groupByRank(nodes);
  const sectionMeta = getSectionMeta(activeSection);

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="page-title flex items-center gap-3">
          <FontAwesomeIcon icon={faGraduationCap} className="h-7 w-7 text-accent-teal" />
          Learning Path
        </h1>
        <p className="page-subtitle">
          {locksEnabled
            ? "Progress through each skill. Finish the foundations to unlock what comes next."
            : "Choose any skill and study in the order that fits you."}
        </p>
      </div>

      {/* Section tabs */}
      <div className="flex flex-col gap-3 border-b border-line pb-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-2">
          {SECTIONS.map((s) => {
            const active = activeSection === s.id;
            return (
              <button
                key={s.id}
                onClick={() => setActiveSection(s.id)}
                className={`rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${
                  active
                    ? "bg-accent-teal/15 text-accent-teal"
                    : "text-ink-secondary hover:bg-hover hover:text-ink-primary"
                }`}
                style={active ? { color: s.color } : undefined}
              >
                {s.shortLabel}
              </button>
            );
          })}
        </div>
        <label className="inline-flex w-fit cursor-pointer items-center gap-3 rounded-lg border border-line bg-navy-800 px-3 py-2 text-xs font-semibold text-ink-secondary">
          <input
            type="checkbox"
            checked={locksEnabled}
            onChange={(event) => handleLocksEnabledChange(event.target.checked)}
            className="peer sr-only"
            aria-label="Lock prerequisites"
          />
          <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
            <FontAwesomeIcon
              icon={locksEnabled ? faLock : faUnlock}
              className="h-3 w-3 text-accent-teal"
              aria-hidden
            />
            Lock prerequisites
          </span>
          <span
            className={`relative h-6 w-11 rounded-full transition-colors peer-focus-visible:ring-2 peer-focus-visible:ring-accent-teal peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-navy-950 ${
              locksEnabled ? "bg-accent-teal" : "bg-hover"
            }`}
            aria-hidden
          >
            <span
              className={`absolute left-1 top-1 h-4 w-4 rounded-full bg-white shadow transition-transform ${
                locksEnabled ? "translate-x-5" : ""
              }`}
            />
          </span>
        </label>
      </div>

      <div className="space-y-8">
        {groups.map(({ rank, nodes: groupNodes }) => {
          // Average mastery for the whole stage (for the horizontal progress bar)
          const avgMastery =
            groupNodes.reduce((acc, n) => acc + (masteryById.get(n.id)?.accuracy ?? 0), 0) /
            groupNodes.length;

          return (
            <section key={rank} aria-label={`Stage ${rank}`}>
              <div className="mb-3 flex items-end justify-between gap-3">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-muted">
                    Stage {rank}
                  </p>
                  <h2 className="text-lg font-bold text-ink-primary">
                    {levelName(activeSection, rank)}
                  </h2>
                </div>
                <div className="flex-1 max-w-sm">
                  <div className="flex items-center justify-between text-[11px] text-ink-muted">
                    <span>Stage progress</span>
                    <span>{Math.round(avgMastery)}%</span>
                  </div>
                  <div className="mt-1 h-2 overflow-hidden rounded-full bg-hover">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{ width: `${avgMastery}%`, backgroundColor: sectionMeta.color }}
                    />
                  </div>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {groupNodes.map((node) => (
                  <SkillCard
                    key={node.id}
                    node={node}
                    section={activeSection}
                    sectionColor={sectionMeta.color}
                    mastery={masteryById.get(node.id)?.accuracy ?? 0}
                    answered={masteryById.get(node.id)?.totalAnswered ?? 0}
                    questionsAvailable={questionsById.get(node.id) ?? 0}
                    hasConceptPage={conceptIds.has(node.id)}
                    visited={visited.has(node.id)}
                    lockState={computeLockState(node, masteryById)}
                    locksEnabled={locksEnabled}
                    onPractice={() => handleQuickPractice(activeSection, node.id)}
                    starting={startingId === node.id}
                    startError={startErrorId?.id === node.id ? startErrorId.msg : null}
                  />
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}

interface SkillCardProps {
  node: LearningNode;
  section: Section;
  sectionColor: string;
  mastery: number;
  answered: number;
  questionsAvailable: number;
  hasConceptPage: boolean;
  visited: boolean;
  lockState: { locked: boolean; blockingPrereqs: { id: string; label: string }[] };
  locksEnabled: boolean;
  onPractice: () => void;
  starting: boolean;
  startError: string | null;
}

function SkillCard({
  node,
  sectionColor,
  mastery,
  answered,
  questionsAvailable,
  hasConceptPage,
  visited,
  lockState,
  locksEnabled,
  onPractice,
  starting,
  startError,
}: SkillCardProps) {
  const meta = getSubtopicMeta(node.id);
  const label = meta?.label ?? node.id;
  const complete = mastery >= COMPLETE_THRESHOLD && answered > 0;
  const locked = locksEnabled && lockState.locked;

  const statusBadge = locked
    ? { text: "Locked", className: "bg-white/5 text-ink-muted border border-white/10" }
    : complete
    ? { text: "Mastered", className: "bg-accent-green/20 text-accent-green border border-accent-green/40" }
    : hasConceptPage && visited
    ? { text: "Review", className: "bg-blue-500/20 text-blue-400 border border-blue-500/40" }
    : hasConceptPage
    ? { text: "Learn", className: "bg-accent-teal/20 text-accent-teal border border-accent-teal/40" }
    : { text: "Practice", className: "bg-accent-amber/20 text-accent-amber border border-accent-amber/40" };

  return (
    <div
      className={`card flex flex-col ${locked ? "opacity-60" : ""}`}
      aria-disabled={locked || undefined}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-bold text-ink-primary">{label}</p>
        <span className={`chip whitespace-nowrap ${statusBadge.className}`}>
          {locked ? (
            <FontAwesomeIcon icon={faLock} className="mr-1 h-3 w-3" aria-hidden />
          ) : complete ? (
            <FontAwesomeIcon icon={faCheck} className="mr-1 h-3 w-3" aria-hidden />
          ) : null}
          {statusBadge.text}
        </span>
      </div>

      <p className="mt-2 text-xs text-ink-secondary">{node.description}</p>

      <div className="mt-3 flex items-baseline gap-2">
        <p
          className="text-xl font-bold"
          style={{ color: answered > 0 ? sectionColor : "#64748B" }}
        >
          {answered > 0 ? `${Math.round(mastery)}%` : "—"}
        </p>
        <p className="text-[11px] text-ink-muted">
          {questionsAvailable} question{questionsAvailable === 1 ? "" : "s"} available
        </p>
      </div>

      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-hover">
        <div
          className="h-full rounded-full transition-all"
          style={{
            width: `${mastery}%`,
            backgroundColor: answered > 0 ? sectionColor : "transparent",
          }}
        />
      </div>

      {locked ? (
        <div className="mt-3 rounded-lg border border-line bg-navy-950/40 p-2 text-[11px] text-ink-muted">
          <p className="font-semibold text-ink-secondary">
            <FontAwesomeIcon icon={faLock} className="mr-1 h-3 w-3" aria-hidden />
            Finish first:
          </p>
          <ul className="mt-1 space-y-0.5">
            {lockState.blockingPrereqs.map((p) => (
              <li key={p.id}>· {p.label}</li>
            ))}
          </ul>
        </div>
      ) : (
        <>
          <div className="mt-3 flex gap-2">
            {hasConceptPage ? (
              <Link
                href={`/learn/${node.id}`}
                className="btn-primary flex-1 justify-center text-xs"
              >
                <FontAwesomeIcon icon={faBookOpen} className="h-3 w-3" aria-hidden />
                {visited ? "Review" : "Start Learning"}
              </Link>
            ) : (
              <button
                type="button"
                onClick={onPractice}
                disabled={starting || questionsAvailable === 0}
                className="btn-primary flex-1 justify-center text-xs"
              >
                <FontAwesomeIcon icon={faPlay} className="h-3 w-3" aria-hidden />
                {starting ? "Starting…" : "Practice"}
              </button>
            )}
            {hasConceptPage && questionsAvailable > 0 && (
              <button
                type="button"
                onClick={onPractice}
                disabled={starting}
                className="flex items-center justify-center gap-1 rounded-lg border border-line px-3 py-2 text-xs text-ink-secondary hover:bg-hover hover:text-ink-primary disabled:opacity-50"
                title="Skip to 5 practice questions"
              >
                <FontAwesomeIcon icon={faArrowRight} className="h-3 w-3" aria-hidden />
              </button>
            )}
          </div>
          {startError && (
            <p className="mt-2 text-[11px] text-accent-red">{startError}</p>
          )}
        </>
      )}
    </div>
  );
}
