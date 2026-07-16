"use client";

import { cn } from "@/lib/utils";

/**
 * @param {{
 *   years: number[],
 *   yearCounts: Record<number, number>,
 *   selectedYear: number,
 *   onYearChange: (year: number) => void
 * }} props
 */
export function YearFilter({
  years,
  yearCounts,
  selectedYear,
  onYearChange,
}) {
  if (years.length === 0) return null;

  return (
    <div
      role="tablist"
      aria-label="Conference year"
      className="inline-flex max-w-full overflow-x-auto rounded-lg border border-border bg-white p-1 shadow-sm"
    >
      {years.map((year) => {
        const count = yearCounts[year] ?? 0;
        const isSelected = year === selectedYear;

        return (
          <button
            key={year}
            type="button"
            role="tab"
            aria-selected={isSelected}
            onClick={() => onYearChange(year)}
            className={cn(
              "shrink-0 rounded-md px-4 py-2 text-sm font-medium transition-colors",
              isSelected
                ? "bg-primary text-white"
                : "text-primary/70 hover:bg-primary/5 hover:text-primary"
            )}
          >
            {year}
            <span
              className={cn(
                "ml-1.5 text-xs tabular-nums",
                isSelected ? "text-white/80" : "text-muted"
              )}
            >
              {count}
            </span>
          </button>
        );
      })}
    </div>
  );
}
