"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/hooks/useAuth";
import { listCategoryAssignmentRows } from "@/lib/category-assignees";
import {
  getItemAssigneeEntry,
  listAssignedSectionsForEmail,
  RECOMMENDATION_ITEM_ASSIGNEES,
} from "@/lib/recommendation-assignees";
import { categoryFromSectionCode } from "@/lib/numbering";
import { CATEGORY_LABELS } from "@/lib/categories";
import { getDesignatedL1Reviewer } from "@/lib/roles";
import { AdminPageContent } from "@/components/admin/AdminPageContent";
import { NumberCode } from "@/components/ui/number-code";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ArrowRight, UserRound } from "lucide-react";

/** @param {string} section */
function topicLabel(section) {
  const cat = categoryFromSectionCode(section);
  return cat ? CATEGORY_LABELS[cat] : section;
}

/** @param {string} section */
function topicHref(section) {
  const cat = categoryFromSectionCode(section);
  return cat ? `/admin?category=${cat}` : "/admin";
}

export default function AssignmentsPage() {
  const { user } = useAuth();
  const rows = useMemo(() => listCategoryAssignmentRows(), []);
  const mySections = useMemo(
    () => listAssignedSectionsForEmail(user?.email),
    [user?.email]
  );
  const myEntry = useMemo(
    () => getItemAssigneeEntry(user?.email),
    [user?.email]
  );
  const unassigned = useMemo(
    () => rows.filter((r) => r.assignees.length === 0),
    [rows]
  );
  const myL1 = useMemo(
    () => getDesignatedL1Reviewer(user?.email),
    [user?.email]
  );
  return (
    <AdminPageContent>
      <div className="space-y-7">
        <div className="flex items-center gap-3">
          <Link href="/admin">
            <Button variant="ghost" size="icon" className="text-muted">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-primary">
              Assignments
            </h1>
            <p className="mt-0.5 text-sm text-muted">
              Your topics and the team roster
            </p>
          </div>
        </div>

        <section className="overflow-hidden rounded-2xl border border-[rgba(5,70,83,0.1)] bg-white shadow-[0_2px_12px_rgba(0,0,0,0.04)]">
          <div className="accent-bar h-[3px] w-full" />
          <div className="flex items-center gap-2 border-b border-[rgba(5,70,83,0.06)] px-5 py-3.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[rgba(5,70,83,0.08)] text-primary">
              <UserRound className="h-4 w-4" />
            </span>
            <h2 className="text-base font-semibold text-primary">
              Assigned to you
            </h2>
          </div>
          <div className="p-4 sm:p-5">
            {mySections.length === 0 ? (
              <p className="text-sm text-muted">
                No topic section is assigned to your account yet.
              </p>
            ) : (
              <ul className="grid gap-3 sm:grid-cols-2">
                {mySections.map((section) => (
                  <li key={section}>
                    <Link
                      href={topicHref(section)}
                      className="group flex items-center justify-between gap-3 rounded-xl border border-[rgba(5,70,83,0.08)] bg-[#f8fafb] px-4 py-3.5 transition-colors hover:border-primary/25 hover:bg-white"
                    >
                      <div className="min-w-0">
                        <NumberCode code={section} size="md" />
                        <p className="mt-2 truncate text-sm font-semibold text-[#1f2937]">
                          {topicLabel(section)}
                        </p>
                        {myEntry ? (
                          <p className="mt-0.5 text-xs font-medium text-rose-600">
                            {myEntry.name}
                          </p>
                        ) : null}
                      </div>
                      <span className="inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-primary transition-colors group-hover:gap-1.5">
                        Open
                        <ArrowRight className="h-3.5 w-3.5" />
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>

        {myL1 && (
          <section className="overflow-hidden rounded-2xl border border-[rgba(5,70,83,0.1)] bg-white shadow-[0_2px_12px_rgba(0,0,0,0.04)]">
            <div className="accent-bar h-[3px] w-full" />
            <div className="px-5 py-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">
                Level 1 review
              </p>
              <h2 className="mt-1 text-base font-semibold text-primary">
                Your L1 approver
              </h2>
              <div className="mt-3 rounded-xl border border-[rgba(5,70,83,0.08)] bg-[#f8fafb] px-4 py-3.5">
                <p className="text-sm font-semibold text-[#1f2937]">
                  {myL1.name}
                </p>
                <p className="mt-0.5 text-sm font-medium text-rose-600">
                  {myL1.email}
                </p>
                <p className="mt-2 text-xs text-muted">
                  Your actions are reviewed by this Level 1 approver only.
                </p>
              </div>
            </div>
          </section>
        )}

        <section className="space-y-3">
          <h2 className="text-base font-semibold text-primary">Team roster</h2>
          <ul className="overflow-hidden divide-y divide-[rgba(5,70,83,0.06)] rounded-2xl border border-[rgba(5,70,83,0.1)] bg-white shadow-[0_2px_12px_rgba(0,0,0,0.04)]">
            {RECOMMENDATION_ITEM_ASSIGNEES.map((a) => {
              const mine =
                (user?.email || "").trim().toLowerCase() ===
                a.email.trim().toLowerCase();
              return (
                <li
                  key={a.email}
                  className={mine ? "bg-[rgba(5,70,83,0.04)]" : "bg-white"}
                >
                  <div className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-[12rem]">
                      <p className="font-semibold text-[#1f2937]">
                        {a.name}
                        {mine ? (
                          <span className="ml-2 rounded-md bg-[rgba(5,70,83,0.08)] px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-primary">
                            You
                          </span>
                        ) : null}
                      </p>
                      <p className="mt-0.5 text-sm font-medium text-rose-600">
                        {a.email}
                      </p>
                    </div>
                    <ul className="flex flex-1 flex-wrap gap-2 sm:justify-end">
                      {a.sections.map((s) => (
                        <li key={s}>
                          <Link
                            href={topicHref(s)}
                            className="inline-flex items-center gap-2 rounded-lg border border-[rgba(5,70,83,0.1)] bg-white px-3 py-2 text-sm font-medium text-[#1f2937] transition-colors hover:border-primary/30 hover:bg-[#f8fafb]"
                          >
                            <NumberCode code={s} size="sm" />
                            <span>{topicLabel(s)}</span>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>

        {unassigned.length > 0 && (
          <section className="space-y-3">
            <h2 className="text-base font-semibold text-primary">
              Not assigned yet
            </h2>
            <ul className="flex flex-wrap gap-2">
              {unassigned.map((row) => (
                <li key={row.category}>
                  <Link
                    href={`/admin?category=${row.category}`}
                    className="inline-flex items-center gap-2 rounded-lg border border-dashed border-[rgba(5,70,83,0.15)] bg-white px-3 py-2 text-sm text-muted transition-colors hover:border-primary/40 hover:text-primary"
                  >
                    <NumberCode code={row.code} size="sm" />
                    {row.label}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </AdminPageContent>
  );
}
