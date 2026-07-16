import {
  getRecommendations,
  getAvailableYears,
} from "@/lib/appwrite/database";
import { withPublicActions } from "@/lib/public-actions";
import { GuestDashboard } from "@/components/public/GuestDashboard";
import { countUniqueActionPartners, resolveScoreTier } from "@/lib/score";

export const dynamic = "force-dynamic";

const emptyGlobalStats = {
  totalRecommendations: 0,
  averageScore: 0,
  totalActionPartners: 0,
  yearRange: null,
};

/** @param {import("@/lib/types/recommendation").Recommendation[]} recs */
function statsFromPublic(recs) {
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
  /** @type {import("@/lib/types/recommendation").Recommendation[]} */
  let recommendations = [];
  /** @type {number[]} */
  let availableYears = [];
  /** @type {import("@/lib/types/recommendation").GlobalStats} */
  let globalStats = emptyGlobalStats;
  /** @type {import("@/lib/types/recommendation").YearStats} */
  let initialYearStats = {
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
