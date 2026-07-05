"use client";

import { useCallback, useEffect, useState } from "react";
import type { SessionSummary } from "@/types";
import { deleteLocalSession, getLocalSessions, subscribeToProgressChanges } from "@/lib/localProgress";

export function useSessions() {
  const [data, setData] = useState<SessionSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setData(getLocalSessions());
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => subscribeToProgressChanges(load), [load]);

  async function deleteSession(id: string) {
    deleteLocalSession(id);
    await load();
  }

  return { data, loading, error, reload: load, deleteSession };
}
