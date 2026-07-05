"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faTrash,
  faChevronDown,
  faChevronRight,
  faDownload,
  faCircleCheck,
  faClipboardCheck,
} from "@fortawesome/free-solid-svg-icons";
import { useSessions } from "@/hooks/useSessions";
import { formatDuration, formatPercent } from "@/lib/calculateStats";
import { getSectionMeta } from "@/lib/constants";
import { downloadJson } from "@/lib/exportResults";
import { buildLocalExportPayload, getLocalJoinedAnswers } from "@/lib/localProgress";
import { getTestTypeLabel, inferCheckpointTestFromSession } from "@/lib/testCenter";
import {
  loadPracticeSessionContext,
  type PracticeSessionContext,
} from "@/lib/practiceModes";
import EmptyState from "@/components/ui/EmptyState";
import LoadingState, { ErrorState } from "@/components/ui/LoadingState";
import QuestionCard from "@/components/review/QuestionCard";
import type { AnswerWithQuestion, SessionSummary } from "@/types";

// Group sessions by calendar date (local).
function groupByDay(sessions: SessionSummary[]): { date: string; label: string; sessions: SessionSummary[] }[] {
  const map = new Map<string, SessionSummary[]>();
  for (const s of sessions) {
    const day = new Date(s.startedAt).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
    if (!map.has(day)) map.set(day, []);
    map.get(day)!.push(s);
  }
  const today = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
  const yesterday = new Date(Date.now() - 86400000).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
  return Array.from(map.entries()).map(([date, sessions]) => ({
    date,
    label: date === today ? "Today" : date === yesterday ? "Yesterday" : date,
    sessions,
  }));
}

export default function HistoryPage() {
  const { data, loading, error, deleteSession, reload } = useSessions();
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [expandedDays, setExpandedDays] = useState<Set<string>>(new Set());
  const [exporting, setExporting] = useState(false);
  const [exportingDay, setExportingDay] = useState<string | null>(null);
  const [sessionContexts, setSessionContexts] = useState<Record<string, PracticeSessionContext | null>>({});

  // Expand today's group by default.
  const groups = groupByDay(data);
  useEffect(() => {
    if (groups.length > 0) {
      setExpandedDays(new Set([groups[0].date]));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading]);

  useEffect(() => {
    const contexts: Record<string, PracticeSessionContext | null> = {};
    for (const session of data) {
      contexts[session.id] = loadPracticeSessionContext(session.id);
    }
    setSessionContexts(contexts);
  }, [data]);

  function toggleDay(date: string) {
    setExpandedDays((prev) => {
      const next = new Set(prev);
      if (next.has(date)) next.delete(date); else next.add(date);
      return next;
    });
  }

  function toggleSession(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  async function handleDelete(id: string) {
    if (!confirm(`Delete this session and all its answers? This cannot be undone.`)) return;
    try { await deleteSession(id); } catch (e) { alert((e as Error).message); }
  }

  async function exportSession(id: string) {
    const body = buildLocalExportPayload({ mode: "session", sessionId: id });
    downloadJson(body, `${body.exportId}.json`);
  }

  async function exportDay(dateStr: string) {
    // dateStr is something like "April 7, 2026" — we need YYYY-MM-DD.
    // Reconstruct from the sessions in that group.
    const group = groups.find((g) => g.date === dateStr);
    if (!group || group.sessions.length === 0) return;
    const isoDate = new Date(group.sessions[0].startedAt).toISOString().slice(0, 10);
    setExportingDay(dateStr);
    try {
      const body = buildLocalExportPayload({ mode: "day", date: isoDate });
      downloadJson(body, `${body.exportId}.json`);
      await reload();
    } catch (e) { alert((e as Error).message); }
    finally { setExportingDay(null); }
  }

  async function exportToday() {
    setExporting(true);
    try {
      const body = buildLocalExportPayload({ mode: "today" });
      if (body.stats?.totalQuestions === 0) {
        alert("No new results to export — everything has already been exported.");
      } else {
        downloadJson(body, `${body.exportId}.json`);
      }
      await reload();
    } catch (e) { alert((e as Error).message); }
    finally { setExporting(false); }
  }

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="page-title">Session History</h1>
          <p className="page-subtitle">View past sessions, results, and exports.</p>
        </div>
        <button type="button" className="btn-primary" onClick={exportToday} disabled={exporting}>
          <FontAwesomeIcon icon={faDownload} className="h-3.5 w-3.5" aria-hidden />
          {exporting ? "Exporting…" : "Export Today's Results"}
        </button>
      </div>

      {loading && <LoadingState />}
      {error && <ErrorState message={error} />}

      {!loading && !error && data.length === 0 && (
        <EmptyState
          title="No sessions yet"
          message="Start a practice session to see it here."
          ctaLabel="Go to Practice"
          ctaHref="/practice"
        />
      )}

      {!loading && groups.length > 0 && (
        <div className="space-y-4">
          {groups.map((group) => {
            const dayExpanded = expandedDays.has(group.date);
            const totalQ = group.sessions.reduce((s, x) => s + x.totalQuestions, 0);
            const totalCorrect = group.sessions.reduce((s, x) => s + x.correct, 0);
            const dayAcc = totalQ === 0 ? 0 : (totalCorrect / totalQ) * 100;
            const sectionSet = new Set(group.sessions.flatMap((s) => s.sections));

            return (
              <div key={group.date} className="card p-0">
                {/* Day header */}
                <div className="flex items-center gap-3 px-4 py-3 sm:px-5">
                  <button
                    type="button"
                    onClick={() => toggleDay(group.date)}
                    className="flex flex-1 items-center gap-3 text-left"
                    aria-expanded={dayExpanded}
                  >
                    <FontAwesomeIcon
                      icon={dayExpanded ? faChevronDown : faChevronRight}
                      className="h-3 w-3 text-ink-muted"
                      aria-hidden
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-ink-primary">
                        {group.label}
                      </p>
                      <p className="text-xs text-ink-muted">
                        {group.sessions.length} session{group.sessions.length === 1 ? "" : "s"} · {totalQ} questions ·{" "}
                        {[...sectionSet].map((s) => getSectionMeta(s).shortLabel).join(", ")}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-base font-bold text-accent-teal">{formatPercent(dayAcc, 0)}</p>
                      <p className="text-[11px] text-ink-muted">{totalCorrect}/{totalQ}</p>
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => exportDay(group.date)}
                    disabled={exportingDay === group.date}
                    className="flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs text-ink-secondary hover:bg-accent-teal/10 hover:text-accent-teal transition-colors"
                    title={`Export ${group.label}`}
                  >
                    <FontAwesomeIcon icon={faDownload} className="h-3.5 w-3.5" aria-hidden />
                    {exportingDay === group.date ? "…" : "Export Day"}
                  </button>
                </div>

                {/* Session list inside this day */}
                {dayExpanded && (
                  <ul className="divide-y divide-line border-t border-line">
                    {group.sessions.map((s) => {
                      const timeStr = new Date(s.startedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
                      const sessionExpanded = expanded.has(s.id);
                      const context = sessionContexts[s.id];
                      const inferredTest = inferCheckpointTestFromSession(s);
                      const isTest = s.sessionType === "section_exam" || Boolean(context?.isCheckpoint || context?.testId);
                      const title = context?.testTitle ?? inferredTest?.title;
                      const typeLabel =
                        context?.testType || inferredTest?.testType
                          ? getTestTypeLabel(context?.testType ?? inferredTest!.testType)
                          : "Checkpoint Test";
                      return (
                        <li key={s.id}>
                          <div className="flex items-center gap-2 bg-navy-950/20 px-4 py-2.5 sm:px-5">
                            <button
                              type="button"
                              onClick={() => toggleSession(s.id)}
                              className="flex flex-1 items-center gap-3 text-left"
                              aria-expanded={sessionExpanded}
                            >
                              <FontAwesomeIcon
                                icon={sessionExpanded ? faChevronDown : faChevronRight}
                                className="h-2.5 w-2.5 text-ink-muted"
                                aria-hidden
                              />
                              <div className="flex-1 min-w-0">
                                <div className="flex flex-wrap items-center gap-2">
                                  {isTest && (
                                    <span className="chip border-accent-teal/20 bg-accent-teal/10 text-accent-teal">
                                      <FontAwesomeIcon icon={faClipboardCheck} className="h-3 w-3" aria-hidden />
                                      {typeLabel}
                                    </span>
                                  )}
                                  <p className="text-xs font-semibold text-ink-primary">
                                    {title ?? s.sections.map((sec) => getSectionMeta(sec).label).join(", ")}
                                    {!title && s.subtopics && s.subtopics.length > 0 && (
                                      <span className="ml-1 font-normal text-ink-muted">
                                        - {s.subtopics.slice(0, 2).join(", ")}{s.subtopics.length > 2 ? `+${s.subtopics.length - 2}` : ""}
                                      </span>
                                    )}
                                  </p>
                                </div>
                                <p className="text-[11px] text-ink-muted">
                                  {timeStr} · {s.totalQuestions}q · {formatDuration(s.timeSpentSeconds)}
                                </p>
                              </div>
                              <p className="text-xs font-bold text-accent-teal">{formatPercent(s.accuracy, 0)}</p>
                            </button>
                            <Link href={`/results/${s.id}`} className="text-[11px] text-accent-teal hover:underline px-1">
                              View
                            </Link>
                            <button
                              type="button"
                              onClick={() => exportSession(s.id)}
                              className="p-1.5 text-ink-muted hover:text-accent-teal transition-colors"
                              aria-label="Export session"
                            >
                              <FontAwesomeIcon icon={faDownload} className="h-3.5 w-3.5" aria-hidden />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDelete(s.id)}
                              className="p-1.5 text-ink-muted hover:text-accent-red transition-colors"
                              aria-label="Delete session"
                            >
                              <FontAwesomeIcon icon={faTrash} className="h-3.5 w-3.5" aria-hidden />
                            </button>
                          </div>
                          {sessionExpanded && <SessionAnswers sessionId={s.id} />}
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function SessionAnswers({ sessionId }: { sessionId: string }) {
  const [answers, setAnswers] = useState<AnswerWithQuestion[] | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    try {
      setAnswers(getLocalJoinedAnswers({ sessionId }));
    } catch (e) {
      setErr((e as Error).message);
    }
  }, [sessionId]);

  if (err) return <div className="px-5 pb-4 text-xs text-accent-red">{err}</div>;
  if (!answers) return <div className="px-5 pb-4 text-xs text-ink-muted">Loading…</div>;
  if (answers.length === 0) return <div className="px-5 pb-4 text-xs text-ink-muted">No answers recorded.</div>;
  return (
    <div className="space-y-3 bg-navy-950/30 px-4 py-4 sm:px-5">
      {answers.map((a) => <QuestionCard key={a.id} answer={a} />)}
    </div>
  );
}
