"use client";

import Link from "next/link";
import { useState, useMemo } from "react";
import type {
  Recommendation,
  GlobalStats,
  YearStats,
} from "@/lib/types/recommendation";
import { NrepLogo } from "@/components/brand/NrepLogo";
import { HeroSection } from "./HeroSection";
import { YearFilter } from "./YearFilter";
import { StatsSummary } from "./StatsSummary";
import { RecommendationCard } from "./RecommendationCard";
import { RecommendationModal } from "./RecommendationModal";
import { useYearFilter } from "@/lib/hooks/useYearFilter";
import { getYearCounts } from "@/lib/appwrite/database";
import { countUniqueActionPartners, getTierByKey } from "@/lib/score";
import { Leaf } from "lucide-react";

interface GuestDashboardProps {
  initialRecommendations: Recommendation[];
  globalStats: GlobalStats;
  availableYears: number[];
  initialYearStats: YearStats;
}

export function GuestDashboard({
  initialRecommendations,
  globalStats,
  availableYears,
  initialYearStats,
}: GuestDashboardProps) {
  const { selectedYear, setSelectedYear } = useYearFilter(availableYears);
  const [selectedRecommendation, setSelectedRecommendation] =
    useState<Recommendation | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const yearRecommendations = useMemo(
    () => initialRecommendations.filter((r) => r.year === selectedYear),
    [initialRecommendations, selectedYear]
  );

  const yearCounts = useMemo(
    () => getYearCounts(initialRecommendations),
    [initialRecommendations]
  );

  const yearStats = useMemo((): YearStats => {
    if (selectedYear === initialYearStats.year) return initialYearStats;

    const recs = yearRecommendations;
    const allActionScores = recs.flatMap((r) =>
      r.actions.map((a) => getTierByKey(a.scoreTier).value)
    );
    const averageScore =
      allActionScores.length > 0
        ? Math.round(
            allActionScores.reduce((sum, s) => sum + s, 0) / allActionScores.length
          )
        : 0;

    return {
      year: selectedYear,
      totalRecommendations: recs.length,
      averageScore,
      totalActionPartners: countUniqueActionPartners(recs),
    };
  }, [selectedYear, initialYearStats, yearRecommendations]);

  const handleCardClick = (rec: Recommendation) => {
    setSelectedRecommendation(rec);
    setModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="guest-nav sticky top-0 z-10">
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
            Admin Login
          </Link>
        </div>
      </header>

      <HeroSection stats={globalStats} />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
        <section className="text-center space-y-4">
          <h2 className="text-2xl font-bold text-primary">
            Browse by Year
          </h2>
          <YearFilter
            years={availableYears}
            yearCounts={yearCounts}
            selectedYear={selectedYear}
            onYearChange={setSelectedYear}
          />
        </section>

        <section className="animate-fade-in">
          <StatsSummary stats={yearStats} />
        </section>

        <section className="animate-fade-in">
          {yearRecommendations.length === 0 ? (
            <div className="text-center py-16 gradient-subtle rounded-2xl">
              <Leaf className="h-12 w-12 mx-auto text-primary/40 mb-4" />
              <h3 className="text-xl font-semibold text-primary mb-2">
                No recommendations for {selectedYear} yet
              </h3>
              <p className="text-muted font-light">
                Check back soon for new recommendations!
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {yearRecommendations.map((rec) => (
                <RecommendationCard
                  key={rec.$id}
                  recommendation={rec}
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
        open={modalOpen}
        onClose={() => setModalOpen(false)}
      />
    </div>
  );
}
