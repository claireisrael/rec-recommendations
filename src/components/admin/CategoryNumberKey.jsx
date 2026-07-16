"use client";

import {
  CATEGORY_LABELS,
  RECOMMENDATION_CATEGORIES,
} from "@/lib/categories";
import { getCategoryCode } from "@/lib/numbering";
import { NumberCode } from "@/components/ui/number-code";
import { ACCENT_BG } from "@/lib/accent-colors";
import { cn } from "@/lib/utils";

/**
 * @param {{
 *   availableCategories?: import("@/lib/categories").RecommendationCategory[],
 *   categoryCounts?: Partial<Record<import("@/lib/categories").RecommendationCategory, number>>,
 *   selectedCategory?: string,
 *   onSelectCategory?: (category: import("@/lib/categories").RecommendationCategory | "") => void,
 *   className?: string
 * }} props
 */
export function CategoryNumberKey({
  availableCategories = [...RECOMMENDATION_CATEGORIES],
  categoryCounts,
  selectedCategory = "",
  onSelectCategory,
  className,
}) {
  const cats = RECOMMENDATION_CATEGORIES.filter((c) =>
    availableCategories.includes(c)
  );

  if (cats.length === 0) return null;

  return (
    <div
      className={cn(
        "flex gap-3 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
        className
      )}
    >
      {cats.map((category, i) => {
        const code = getCategoryCode(category);
        const count = categoryCounts?.[category];
        const selected = selectedCategory === category;
        const interactive = !!onSelectCategory;
        const accent = ACCENT_BG[i % ACCENT_BG.length];

        const content = (
          <>
            <span
              className={cn(
                "absolute inset-y-0 left-0 w-[3px] rounded-l-[0.875rem]",
                selected ? "bg-secondary" : accent
              )}
            />
            <NumberCode code={code} size="sm" />
            <span className="min-w-0">
              <span className="block truncate text-[0.8rem] font-semibold text-foreground">
                {CATEGORY_LABELS[category]}
              </span>
              {typeof count === "number" && (
                <span className="block text-[11px] font-medium tabular-nums text-muted">
                  {count} item{count === 1 ? "" : "s"}
                </span>
              )}
            </span>
          </>
        );

        const base =
          "relative flex min-w-[10.5rem] shrink-0 items-center gap-2.5 overflow-hidden rounded-[0.875rem] border border-[rgba(5,70,83,0.06)] bg-white/95 px-3.5 py-3 pl-4 shadow-[0_2px_10px_rgba(0,0,0,0.04)] backdrop-blur transition-all duration-200";

        if (!interactive) {
          return (
            <div key={category} className={base}>
              {content}
            </div>
          );
        }

        return (
          <button
            key={category}
            type="button"
            onClick={() => onSelectCategory(selected ? "" : category)}
            className={cn(
              base,
              "text-left hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(0,0,0,0.08)]",
              selected && "border-[rgba(5,70,83,0.14)] bg-[#f8fafb]"
            )}
          >
            {content}
          </button>
        );
      })}
    </div>
  );
}
