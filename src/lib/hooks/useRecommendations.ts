"use client";

import { useState, useEffect, useCallback } from "react";
import { getRecommendations } from "@/lib/appwrite/database";
import type { Recommendation } from "@/lib/types/recommendation";

interface UseRecommendationsOptions {
  year?: number;
  status?: string;
}

export function useRecommendations(options: UseRecommendationsOptions = {}) {
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const year = options.year;
  const status = options.status;

  const fetchRecommendations = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getRecommendations({ year, status });
      setRecommendations(data);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to fetch recommendations"
      );
    } finally {
      setLoading(false);
    }
  }, [year, status]);

  useEffect(() => {
    void fetchRecommendations();
  }, [fetchRecommendations]);

  return {
    recommendations,
    loading,
    error,
    refetch: fetchRecommendations,
  };
}
