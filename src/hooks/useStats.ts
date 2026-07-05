"use client";

import { useCallback, useEffect, useState } from "react";
import type { DashboardStats } from "@/types";
import { getLocalDashboardStats, subscribeToProgressChanges } from "@/lib/localProgress";

export function useStats() {
  const [data, setData] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setData(getLocalDashboardStats());
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

  return { data, loading, error, reload: load };
}
