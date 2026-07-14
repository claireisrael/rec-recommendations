import {
  getRecommendations,
  getAvailableYears,
  getGlobalStats,
  getStatsByYear,
} from "@/lib/appwrite/database";
import { GuestDashboard } from "@/components/public/GuestDashboard";
import type {
  GlobalStats,
  Recommendation,
  YearStats,
} from "@/lib/types/recommendation";

export const revalidate = 60;

const emptyGlobalStats: GlobalStats = {
  totalRecommendations: 0,
  averageScore: 0,
  totalActionPartners: 0,
  yearRange: null,
};

const emptyYearStats = (year: number): YearStats => ({
  year,
  totalRecommendations: 0,
  averageScore: 0,
  totalActionPartners: 0,
});

export default async function GuestPage() {
  let recommendations: Recommendation[] = [];
  let availableYears: number[] = [];
  let globalStats: GlobalStats = emptyGlobalStats;
  let initialYearStats: YearStats = emptyYearStats(new Date().getFullYear());

  try {
    const [recs, years, stats] = await Promise.all([
      getRecommendations({}, true),
      getAvailableYears(undefined, true),
      getGlobalStats(true),
    ]);

    recommendations = recs;
    availableYears = years;
    globalStats = stats;

    const initialYear = years[0] ?? new Date().getFullYear();
    initialYearStats = await getStatsByYear(initialYear, true);
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
