"use client";

import { useState, useEffect, useCallback } from "react";
import { getRecommendations } from "@/lib/appwrite/database";

/**
 * @param {{ year?: number, status?: string }} [options]
 */
export function useRecommendations(options = {}) {
  const [recommendations, setRecommendations] = useState(
    /** @type {import("@/lib/types/recommendation").Recommendation[]} */ ([])
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(/** @type {string | null} */ (null));
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
