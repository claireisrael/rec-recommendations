"use client";

import { BarChart3, Users, Zap, Calendar } from "lucide-react";

/**
 * @param {{ stats: { totalRecommendations: number, averageScore: number | string, totalActionPartners: number, yearRange?: { min: number, max: number } | null } }} props
 */
export function HeroSection({ stats }) {
  const statItems = [
    {
      icon: BarChart3,
      label: "Recommendations",
      value: stats.totalRecommendations,
    },
    {
      icon: Zap,
      label: "Avg. Score",
      value: stats.averageScore,
    },
    {
      icon: Users,
      label: "Action Implementation Partners",
      value: stats.totalActionPartners,
    },
    {
      icon: Calendar,
      label: "Year Range",
      value: stats.yearRange ? `${stats.yearRange.min}-${stats.yearRange.max}` : "N/A",
    },
  ];

  return (
    <section className="guest-hero text-white">
      <div
        className="absolute inset-0 pointer-events-none overflow-hidden"
        aria-hidden
      >
        <span className="absolute -right-16 -top-20 h-72 w-72 rounded-full bg-secondary/12 blur-3xl" />
        <span className="absolute bottom-8 left-1/4 h-48 w-48 rounded-full bg-white/6 blur-2xl" />
        <span className="absolute top-1/3 right-1/3 h-24 w-24 rounded-full bg-secondary/18 blur-xl" />
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-20">
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/12 px-4 py-1.5 mb-6 backdrop-blur-sm">
            <span className="text-secondary font-semibold text-sm">REC</span>
            <span className="h-3 w-px bg-white/25" aria-hidden />
            <span className="text-white/90 text-sm font-light">
              Renewable Energy Conference
            </span>
          </div>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-semibold mb-4 tracking-tight text-white drop-shadow-sm">
            Recommendations &amp; Actions
          </h1>
          <p className="text-lg md:text-xl font-light text-white/85 max-w-2xl mx-auto">
            Explore impactful recommendations driving the global renewable
            energy transition
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {statItems.map(({ icon: Icon, label, value }) => (
            <div
              key={label}
              className="rounded-xl border border-white/18 bg-white/10 p-4 text-center backdrop-blur-sm transition-colors hover:bg-white/14"
            >
              <Icon className="h-5 w-5 mx-auto mb-2 text-secondary" />
              <div className="text-2xl md:text-3xl font-semibold">{value}</div>
              <div className="text-sm font-light text-white/78 mt-1">
                {label}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
