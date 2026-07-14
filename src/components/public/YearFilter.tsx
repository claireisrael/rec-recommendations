"use client";

import { cn } from "@/lib/utils";

interface YearFilterProps {
  years: number[];
  yearCounts: Record<number, number>;
  selectedYear: number;
  onYearChange: (year: number) => void;
}

export function YearFilter({
  years,
  yearCounts,
  selectedYear,
  onYearChange,
}: YearFilterProps) {
  if (years.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2 justify-center">
      {years.map((year) => {
        const count = yearCounts[year] ?? 0;
        const isSelected = year === selectedYear;

        return (
          <button
            key={year}
            onClick={() => onYearChange(year)}
            className={cn(
              "px-5 py-2.5 rounded-full text-sm font-semibold transition-all duration-200",
              isSelected
                ? "bg-primary text-white shadow-md scale-105"
                : "bg-white text-primary border-2 border-primary/20 hover:border-primary/50 hover:bg-primary/5"
            )}
          >
            {year}
            <span
              className={cn(
                "ml-2 text-xs font-medium",
                isSelected ? "text-secondary" : "text-muted"
              )}
            >
              ({count})
            </span>
          </button>
        );
      })}
    </div>
  );
}
