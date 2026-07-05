"use client";

import { useCallback, useEffect, useState } from "react";
import type { QuestionRow } from "@/types";
import { getLocalQuestions, subscribeToProgressChanges } from "@/lib/localProgress";

export interface QuestionFilters {
  section?: string;
  subtopic?: string;
  difficulty?: string;
  bankId?: string;
}

// Fetches bank questions (the pool of possible questions). Not to be confused
// with answers, which are user attempts tied to sessions.
export function useQuestions(filters: QuestionFilters = {}) {
  const [data, setData] = useState<QuestionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const key = JSON.stringify(filters);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setData(getLocalQuestions(filters));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => subscribeToProgressChanges(load), [load]);

  return { data, loading, error, reload: load };
}
