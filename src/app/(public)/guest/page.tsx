import {
  getRecommendations,
  getAvailableYears,
} from "@/lib/appwrite/database";
import { withPublicActions } from "@/lib/public-actions";
import { GuestDashboard } from "@/components/public/GuestDashboard";
import { countUniqueActionPartners, resolveScoreTier } from "@/lib/score";
import type {
  GlobalStats,
  Recommendation,
  YearStats,
} from "@/lib/types/recommendation";

export const dynamic = "force-dynamic";

const emptyGlobalStats: GlobalStats = {
  totalRecommendations: 0,
  averageScore: 0,
  totalActionPartners: 0,
  yearRange: null,
};

function statsFromPublic(recs: Recommendation[]): GlobalStats {
  const years = recs.map((r) => r.year);
  const allScores = recs.flatMap((r) =>
    r.actions.map((a) => resolveScoreTier(a.scoreTier).value)
  );
  return {
    totalRecommendations: recs.length,
    averageScore:
      allScores.length > 0
        ? Math.round(allScores.reduce((s, n) => s + n, 0) / allScores.length)
        : 0,
    totalActionPartners: countUniqueActionPartners(recs),
    yearRange:
      years.length > 0
        ? { min: Math.min(...years), max: Math.max(...years) }
        : null,
  };
}

export default async function GuestPage() {
  let recommendations: Recommendation[] = [];
  let availableYears: number[] = [];
  let globalStats: GlobalStats = emptyGlobalStats;
  let initialYearStats: YearStats = {
    year: new Date().getFullYear(),
    totalRecommendations: 0,
    averageScore: 0,
    totalActionPartners: 0,
  };

  try {
    const [recs, years] = await Promise.all([
      getRecommendations({}, true),
      getAvailableYears(undefined, true),
    ]);

    recommendations = recs.map(withPublicActions);
    availableYears = years;
    globalStats = statsFromPublic(recommendations);

    const initialYear = years[0] ?? new Date().getFullYear();
    const yearRecs = recommendations.filter((r) => r.year === initialYear);
    const yearScores = yearRecs.flatMap((r) =>
      r.actions.map((a) => resolveScoreTier(a.scoreTier).value)
    );
    initialYearStats = {
      year: initialYear,
      totalRecommendations: yearRecs.length,
      averageScore:
        yearScores.length > 0
          ? Math.round(
              yearScores.reduce((s, n) => s + n, 0) / yearScores.length
            )
          : 0,
      totalActionPartners: countUniqueActionPartners(yearRecs),
    };
  } catch {
    // Fall through with empty defaults — guest page should still render.
  }

  return (
    <GuestDashboard
      initialRecommendations={recommendations}
      globalStats={globalStats}
      availableYears={availableYears}
      initialYearStats={initialYearStats}
    />
  );
}
