"use client";

import Link from "next/link";
import { getFirstName } from "@/lib/greeting";
import { listAssignedSectionsForEmail } from "@/lib/recommendation-assignees";
import { categoryFromSectionCode } from "@/lib/numbering";
import { CATEGORY_LABELS } from "@/lib/categories";
import { NumberCode } from "@/components/ui/number-code";
import { usePendingReviewCount } from "@/lib/hooks/usePendingReviewCount";

function timeGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

/**
 * @param {{ user: Pick<import("appwrite").Models.User<import("appwrite").Models.Preferences>, "name" | "email"> | null }} props
 */
export function DashboardGreeting({ user }) {
  const firstName = getFirstName(user);
  const pendingReviews = usePendingReviewCount();
  const sections = listAssignedSectionsForEmail(user?.email);

  return (
    <div className="px-4 pt-5 sm:px-6 lg:px-8">
      <div className="relative mx-auto max-w-7xl overflow-hidden rounded-[1.25rem] border border-primary/[0.06] bg-gradient-to-br from-white/97 to-slate-50/92 shadow-[0_4px_20px_rgba(0,0,0,0.06)] backdrop-blur-[25px]">
        <div className="accent-bar absolute inset-x-0 top-0 h-[3px]" />

        <div className="flex flex-wrap items-center justify-between gap-4 px-6 py-6 sm:px-8">
          <div>
            <h1
              className="m-0 text-[1.65rem] font-semibold leading-tight text-primary sm:text-[1.85rem]"
            >
              {timeGreeting()}, {firstName}
            </h1>
            <p className="mt-1 text-sm font-medium text-muted">
              REC Recommendations & Actions
            </p>

            {sections.length > 0 && (
              <ul className="mt-3 flex flex-wrap gap-2">
                {sections.map((section) => {
                  const cat = categoryFromSectionCode(section);
                  const label = cat ? CATEGORY_LABELS[cat] : section;
                  return (
                    <li
                      key={section}
                      className="inline-flex items-center gap-2 rounded-full border border-[rgba(46, 158, 204,0.08)] bg-white px-2.5 py-1"
                    >
                      <NumberCode code={section} size="sm" />
                      <span className="text-xs font-medium text-primary-dark">
                        {label}
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          {pendingReviews > 0 && (
            <Link
              href="/admin/reviews"
              className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2.5 text-xs font-semibold text-white shadow-[0_4px_12px_rgba(46, 158, 204,0.22)] transition hover:bg-primary-dark"
            >
              Review inbox
              <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-500 px-1.5 text-[11px] font-semibold text-white">
                {pendingReviews > 99 ? "99+" : pendingReviews}
              </span>
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
