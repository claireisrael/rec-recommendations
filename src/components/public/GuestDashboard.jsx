"use client";

import Link from "next/link";
import { useState, useMemo, useEffect } from "react";
import {
  CATEGORY_LABELS,
  RECOMMENDATION_CATEGORIES,
} from "@/lib/categories";
import {
  buildRecommendationNumbering,
  getCategoryCode,
  getCategoryCodeLabel,
  sortByRecommendationNumber,
} from "@/lib/numbering";
import { NrepLogo } from "@/components/brand/NrepLogo";
import { HeroSection } from "./HeroSection";
import { YearFilter } from "./YearFilter";
import { CategoryFilter } from "./CategoryFilter";
import { StatsSummary } from "./StatsSummary";
import { RecommendationCard } from "./RecommendationCard";
import { RecommendationModal } from "./RecommendationModal";
import { NumberCode } from "@/components/ui/number-code";
import { useYearFilter } from "@/lib/hooks/useYearFilter";
import { getYearCounts } from "@/lib/appwrite/database";
import { countUniqueActionPartners, resolveScoreTier } from "@/lib/score";
import { Leaf } from "lucide-react";

/**
 * @param {{
 *   initialRecommendations: import("@/lib/types/recommendation").Recommendation[];
 *   globalStats: import("@/lib/types/recommendation").GlobalStats;
 *   availableYears: number[];
 *   initialYearStats: import("@/lib/types/recommendation").YearStats;
 * }} props
 */
export function GuestDashboard({
  initialRecommendations,
  globalStats,
  availableYears,
  initialYearStats,
}) {
  const { selectedYear, setSelectedYear } = useYearFilter(availableYears);
  const [selectedCategory, setSelectedCategory] = useState(
    /** @type {import("@/lib/categories").RecommendationCategory | "all"} */ ("all")
  );
  const [selectedRecommendation, setSelectedRecommendation] = useState(
    /** @type {import("@/lib/types/recommendation").Recommendation | null} */ (null)
  );
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    setSelectedCategory("all");
  }, [selectedYear]);

  const yearRecommendations = useMemo(
    () => initialRecommendations.filter((r) => r.year === selectedYear),
    [initialRecommendations, selectedYear]
  );

  const numbering = useMemo(
    () => buildRecommendationNumbering(yearRecommendations),
    [yearRecommendations]
  );

  const categoryCounts = useMemo(() => {
    /** @type {Partial<Record<import("@/lib/categories").RecommendationCategory, number>>} */
    const counts = {};
    for (const rec of yearRecommendations) {
      const key = rec.category;
      counts[key] = (counts[key] ?? 0) + 1;
    }
    return counts;
  }, [yearRecommendations]);

  const availableCategories = useMemo(
    () =>
      RECOMMENDATION_CATEGORIES.filter((c) => (categoryCounts[c] ?? 0) > 0),
    [categoryCounts]
  );

  const filteredRecommendations = useMemo(() => {
    const list =
      selectedCategory === "all"
        ? yearRecommendations
        : yearRecommendations.filter((r) => r.category === selectedCategory);
    return sortByRecommendationNumber(list, numbering);
  }, [yearRecommendations, selectedCategory, numbering]);

  const groupedRecommendations = useMemo(() => {
    if (selectedCategory !== "all") return null;
    /** @type {{ category: import("@/lib/categories").RecommendationCategory; code: string; label: string; items: import("@/lib/types/recommendation").Recommendation[] }[]} */
    const groups = [];

    for (const category of RECOMMENDATION_CATEGORIES) {
      const items = filteredRecommendations.filter(
        (r) => r.category === category
      );
      if (items.length === 0) continue;
      groups.push({
        category,
        code: getCategoryCode(category),
        label: CATEGORY_LABELS[category],
        items,
      });
    }
    return groups;
  }, [filteredRecommendations, selectedCategory]);

  const yearCounts = useMemo(
    () => getYearCounts(initialRecommendations),
    [initialRecommendations]
  );

  const yearStats = useMemo(() => {
    if (
      selectedYear === initialYearStats.year &&
      selectedCategory === "all"
    ) {
      return initialYearStats;
    }

    const recs = filteredRecommendations;
    const allActionScores = recs.flatMap((r) =>
      r.actions.map((a) => resolveScoreTier(a.scoreTier).value)
    );
    const averageScore =
      allActionScores.length > 0
        ? Math.round(
            allActionScores.reduce((sum, s) => sum + s, 0) /
              allActionScores.length
          )
        : 0;

    return {
      year: selectedYear,
      totalRecommendations: recs.length,
      averageScore,
      totalActionPartners: countUniqueActionPartners(recs),
    };
  }, [
    selectedYear,
    selectedCategory,
    initialYearStats,
    filteredRecommendations,
  ]);

  const selectedNumbering = selectedRecommendation
    ? numbering.get(selectedRecommendation.$id)
    : undefined;

  /** @param {import("@/lib/types/recommendation").Recommendation} rec */
  const handleCardClick = (rec) => {
    setSelectedRecommendation(rec);
    setModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="guest-nav sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <NrepLogo height={36} />
            <span className="text-sm font-semibold text-primary hidden sm:inline">
              Guest Dashboard
            </span>
          </Link>
          <Link
            href="/login"
            className="rounded-full border border-primary/15 bg-primary/5 px-4 py-1.5 text-sm font-medium text-primary transition-colors hover:border-primary/30 hover:bg-primary/10"
          >
            Login
          </Link>
        </div>
      </header>

      <HeroSection stats={globalStats} />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
        <section className="rounded-2xl border border-border/80 bg-white/70 p-5 sm:p-6 shadow-sm backdrop-blur-sm space-y-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="space-y-1 text-left">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">
                Explore
              </p>
              <h2 className="text-xl font-semibold text-primary sm:text-2xl">
                REC {selectedYear} recommendations
              </h2>
            </div>
            <YearFilter
              years={availableYears}
              yearCounts={yearCounts}
              selectedYear={selectedYear}
              onYearChange={setSelectedYear}
            />
          </div>

          <div className="space-y-2 border-t border-border/70 pt-4">
            <p className="text-xs font-medium text-muted">Filter by topic</p>
            <CategoryFilter
              categories={availableCategories}
              categoryCounts={categoryCounts}
              selectedCategory={selectedCategory}
              onCategoryChange={setSelectedCategory}
              totalCount={yearRecommendations.length}
            />
          </div>
        </section>

        <section className="animate-fade-in">
          <StatsSummary stats={yearStats} />
        </section>

        <section className="animate-fade-in space-y-6">
          <div className="flex items-baseline justify-between gap-3">
            <p className="text-sm text-muted">
              <span className="font-medium text-primary">
                {filteredRecommendations.length}
              </span>
              {selectedCategory === "all"
                ? ` recommendation${filteredRecommendations.length === 1 ? "" : "s"}`
                : ` · ${getCategoryCodeLabel(selectedCategory)}`}
            </p>
          </div>

          {filteredRecommendations.length === 0 ? (
            <div className="text-center py-16 gradient-subtle rounded-2xl">
              <Leaf className="h-12 w-12 mx-auto text-primary/40 mb-4" />
              <h3 className="text-xl font-semibold text-primary mb-2">
                No recommendations for this filter
              </h3>
              <p className="text-muted font-light">
                Try another year or topic.
              </p>
            </div>
          ) : groupedRecommendations ? (
            <div className="space-y-10">
              {groupedRecommendations.map((group) => (
                <div key={group.category} className="space-y-4">
                  <div className="sticky top-14 z-10 -mx-1 flex items-center gap-3 rounded-xl border border-primary/10 bg-white/95 px-3 py-2.5 shadow-[0_1px_3px_rgba(6,90,107,0.06)] backdrop-blur-md">
                    <NumberCode code={group.code} size="lg" />
                    <div className="min-w-0 flex-1">
                      <h3 className="truncate text-base font-semibold text-foreground">
                        {group.label}
                      </h3>
                      <p className="text-xs text-muted">
                        {group.items.length} recommendation
                        {group.items.length === 1 ? "" : "s"}
                      </p>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {group.items.map((rec) => (
                      <RecommendationCard
                        key={rec.$id}
                        recommendation={rec}
                        numberCode={numbering.get(rec.$id)?.code}
                        onClick={() => handleCardClick(rec)}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
              {filteredRecommendations.map((rec) => (
                <RecommendationCard
                  key={rec.$id}
                  recommendation={rec}
                  numberCode={numbering.get(rec.$id)?.code}
                  onClick={() => handleCardClick(rec)}
                />
              ))}
            </div>
          )}
        </section>
      </main>

      <footer className="guest-footer mt-16 py-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-2">
          <p className="text-sm font-semibold text-white/95">
            Renewable Energy Conference
          </p>
          <p className="text-xs font-light text-white/55">
            Recommendations &amp; Actions Portal
          </p>
          <p className="text-xs text-white/45 pt-1">
            &copy; {new Date().getFullYear()} NREP
          </p>
        </div>
      </footer>

      <RecommendationModal
        recommendation={selectedRecommendation}
        numberCode={selectedNumbering?.code}
        open={modalOpen}
        onClose={() => setModalOpen(false)}
      />
    </div>
  );
}
