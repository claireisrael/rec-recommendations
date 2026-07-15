"use client";

import {
  CATEGORY_LABELS,
  type RecommendationCategory,
} from "@/lib/categories";
import { getCategoryCode } from "@/lib/numbering";
import { NumberCode } from "@/components/ui/number-code";
import { cn } from "@/lib/utils";

interface CategoryFilterProps {
  categories: RecommendationCategory[];
  categoryCounts: Partial<Record<RecommendationCategory, number>>;
  selectedCategory: RecommendationCategory | "all";
  onCategoryChange: (category: RecommendationCategory | "all") => void;
  totalCount: number;
}

export function CategoryFilter({
  categories,
  categoryCounts,
  selectedCategory,
  onCategoryChange,
  totalCount,
}: CategoryFilterProps) {
  if (categories.length === 0 && totalCount === 0) return null;

  const chips: {
    key: RecommendationCategory | "all";
    code?: string;
    label: string;
    count: number;
  }[] = [
    { key: "all", label: "All topics", count: totalCount },
    ...categories.map((category) => ({
      key: category as RecommendationCategory | "all",
      code: getCategoryCode(category),
      label: CATEGORY_LABELS[category],
      count: categoryCounts[category] ?? 0,
    })),
  ];

  return (
    <div
      role="listbox"
      aria-label="Recommendation topic"
      className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1"
    >
      {chips.map(({ key, code, label, count }) => {
        const isSelected = selectedCategory === key;

        return (
          <button
            type="button"
            role="option"
            aria-selected={isSelected}
            key={key}
            onClick={() => onCategoryChange(key)}
            className={cn(
              "flex shrink-0 items-center gap-2 rounded-lg border px-3 py-2 text-left transition-all",
              isSelected
                ? "border-primary/30 bg-primary/[0.06] shadow-[inset_3px_0_0_0_var(--secondary)]"
                : "border-border/90 bg-[#f8fbfc] hover:border-primary/20 hover:bg-primary/[0.03]"
            )}
          >
            {code && <NumberCode code={code} size="sm" />}
            <span className="text-sm font-medium text-foreground">{label}</span>
            <span className="text-xs tabular-nums text-muted">{count}</span>
          </button>
        );
      })}
    </div>
  );
}
