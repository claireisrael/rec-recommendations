"use client";

import { useState, useMemo, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import type { Recommendation } from "@/lib/types/recommendation";
import { STATUS_LABELS, RECOMMENDATION_STATUSES } from "@/lib/types/recommendation";
import { averageActionScore } from "@/lib/score";
import { ActionEvidenceDisplay } from "@/components/ui/action-evidence";
import { hasEvidence } from "@/lib/evidence";
import { getRecommendationPartners } from "@/lib/partners";
import { PartnersList } from "@/components/ui/action-partners";
import { StatusBadge } from "./StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  CATEGORY_OPTIONS,
  RECOMMENDATION_CATEGORIES,
  type RecommendationCategory,
} from "@/lib/categories";
import {
  buildRecommendationNumbering,
  getCategoryCode,
  getCategorySectionIndex,
  type RecommendationNumbering,
} from "@/lib/numbering";
import { NumberCode } from "@/components/ui/number-code";
import { CategoryNumberKey } from "@/components/admin/CategoryNumberKey";
import {
  Pencil,
  Trash2,
  Eye,
  ChevronLeft,
  ChevronRight,
  LayoutGrid,
  Table2,
} from "lucide-react";
import Link from "next/link";
import { AdminRecommendationCard } from "./AdminRecommendationCard";

interface AdminTableProps {
  recommendations: Recommendation[];
  loading: boolean;
  onDelete: (id: string) => void;
  /** When set, edit only shown for items the user may change */
  canEditItem?: (rec: Recommendation, code?: string) => boolean;
  /** When set, delete only shown for items the user may delete */
  canDeleteItem?: (rec: Recommendation, code?: string) => boolean;
}

const PAGE_SIZE = 10;
type ViewMode = "table" | "cards";
type SortField = "number" | "recommendation" | "year" | "score";

export function AdminTable({
  recommendations,
  loading,
  onDelete,
  canEditItem,
  canDeleteItem,
}: AdminTableProps) {
  const searchParams = useSearchParams();
  const categoryFromUrl = searchParams.get("category") || "";

  const [search, setSearch] = useState("");
  const [yearFilter, setYearFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState(categoryFromUrl);
  const [page, setPage] = useState(0);
  const [sortField, setSortField] = useState<SortField>("number");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [viewMode, setViewMode] = useState<ViewMode>("table");

  useEffect(() => {
    if (
      categoryFromUrl &&
      RECOMMENDATION_CATEGORIES.includes(
        categoryFromUrl as RecommendationCategory
      )
    ) {
      setCategoryFilter(categoryFromUrl);
      setPage(0);
    }
  }, [categoryFromUrl]);

  const numbering = useMemo(() => {
    const map = new Map<string, RecommendationNumbering>();
    const byYear = new Map<number, Recommendation[]>();
    for (const rec of recommendations) {
      const list = byYear.get(rec.year) ?? [];
      list.push(rec);
      byYear.set(rec.year, list);
    }
    for (const yearRecs of byYear.values()) {
      const yearMap = buildRecommendationNumbering(yearRecs);
      for (const [id, info] of yearMap) map.set(id, info);
    }
    return map;
  }, [recommendations]);

  const categoryCounts = useMemo(() => {
    const counts: Partial<Record<RecommendationCategory, number>> = {};
    const source = yearFilter
      ? recommendations.filter((r) => r.year === Number(yearFilter))
      : recommendations;
    for (const rec of source) {
      const key = rec.category as RecommendationCategory;
      counts[key] = (counts[key] ?? 0) + 1;
    }
    return counts;
  }, [recommendations, yearFilter]);

  const availableCategories = useMemo(
    () =>
      RECOMMENDATION_CATEGORIES.filter((c) => (categoryCounts[c] ?? 0) > 0),
    [categoryCounts]
  );

  const years = useMemo(
    () =>
      [...new Set(recommendations.map((r) => r.year))]
        .sort((a, b) => b - a)
        .map(String),
    [recommendations]
  );

  const filtered = useMemo(() => {
    let result = [...recommendations];

    if (search) {
      const q = search.toLowerCase().replace(/\s+/g, "");
      result = result.filter((r) => {
        const code = (numbering.get(r.$id)?.code ?? "").toLowerCase();
        const cat = (numbering.get(r.$id)?.categoryCode ?? "").toLowerCase();
        return (
          r.recommendation.toLowerCase().includes(search.toLowerCase()) ||
          code.includes(q) ||
          cat.includes(q) ||
          code.replace(/^r/, "").includes(q.replace(/^r/, ""))
        );
      });
    }
    if (yearFilter) {
      result = result.filter((r) => r.year === Number(yearFilter));
    }
    if (statusFilter) {
      result = result.filter((r) => r.status === statusFilter);
    }
    if (categoryFilter) {
      result = result.filter(
        (r) => r.category === (categoryFilter as RecommendationCategory)
      );
    }

    result.sort((a, b) => {
      if (sortField === "number") {
        const na = numbering.get(a.$id);
        const nb = numbering.get(b.$id);
        const yearCmp = a.year - b.year;
        // Prefer newer years first when year differs and sorting by number? 
        // Keep year as secondary; primary is category index then item
        const catA = na ? getCategorySectionIndex(na.category) : 999;
        const catB = nb ? getCategorySectionIndex(nb.category) : 999;
        const itemA = na?.itemIndex ?? 999;
        const itemB = nb?.itemIndex ?? 999;
        const cmp = yearCmp !== 0 ? yearCmp : catA - catB || itemA - itemB;
        return sortDir === "asc" ? cmp : -cmp;
      }

      const getVal = (rec: Recommendation) =>
        sortField === "score"
          ? averageActionScore(rec.actions)
          : rec[sortField];
      const aVal = getVal(a);
      const bVal = getVal(b);
      const cmp =
        typeof aVal === "string"
          ? aVal.localeCompare(bVal as string)
          : (aVal as number) - (bVal as number);
      return sortDir === "asc" ? cmp : -cmp;
    });

    return result;
  }, [
    recommendations,
    search,
    yearFilter,
    statusFilter,
    categoryFilter,
    sortField,
    sortDir,
    numbering,
  ]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir(field === "number" ? "asc" : "desc");
    }
  };

  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-14 w-full rounded-lg" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <CategoryNumberKey
        availableCategories={availableCategories}
        categoryCounts={categoryCounts}
        selectedCategory={categoryFilter}
        onSelectCategory={(cat) => {
          setCategoryFilter(cat);
          setPage(0);
        }}
      />

      <div className="rounded-2xl border border-[#dce6e9]/70 bg-white/80 p-3.5 shadow-[0_1px_6px_rgba(5,70,83,0.03)] sm:p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="grid min-w-0 flex-1 grid-cols-1 gap-2.5 sm:grid-cols-2 xl:grid-cols-4">
            <Input
              placeholder="Search by text or ref…"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(0);
              }}
              className="rounded-xl border-[#d5e2e5] bg-[#f7fafb] placeholder:text-[#9aafb6]"
            />
            <Select
              value={yearFilter}
              onChange={(v) => {
                setYearFilter(v);
                setPage(0);
              }}
              options={years.map((y) => ({ value: y, label: y }))}
              placeholder="All Years"
            />
            <Select
              value={statusFilter}
              onChange={(v) => {
                setStatusFilter(v);
                setPage(0);
              }}
              options={RECOMMENDATION_STATUSES.map((value) => ({
                value,
                label: STATUS_LABELS[value],
              }))}
              placeholder="All Statuses"
            />
            <Select
              value={categoryFilter}
              onChange={(v) => {
                setCategoryFilter(v);
                setPage(0);
              }}
              options={CATEGORY_OPTIONS.map((o) => ({
                value: o.value,
                label: `${getCategoryCode(o.value)} · ${o.label}`,
              }))}
              placeholder="All Categories"
            />
          </div>
          <div className="flex shrink-0 self-start rounded-full border border-primary/10 bg-[#f8fafb] p-0.5">
            <Button
              type="button"
              variant={viewMode === "table" ? "default" : "ghost"}
              size="sm"
              className="gap-1.5 rounded-full"
              onClick={() => setViewMode("table")}
              aria-pressed={viewMode === "table"}
            >
              <Table2 className="h-4 w-4" />
              Table
            </Button>
            <Button
              type="button"
              variant={viewMode === "cards" ? "default" : "ghost"}
              size="sm"
              className="gap-1.5 rounded-full"
              onClick={() => setViewMode("cards")}
              aria-pressed={viewMode === "cards"}
            >
              <LayoutGrid className="h-4 w-4" />
              Cards
            </Button>
          </div>
        </div>
      </div>

      {viewMode === "cards" ? (
        paginated.length === 0 ? (
          <p className="text-center py-12 text-muted font-light rounded-xl border border-border">
            No recommendations found
          </p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {paginated.map((rec) => {
              const code = numbering.get(rec.$id)?.code;
              const editable = canEditItem
                ? canEditItem(rec, code)
                : true;
              const deletable = canDeleteItem
                ? canDeleteItem(rec, code)
                : editable;
              return (
              <AdminRecommendationCard
                key={rec.$id}
                recommendation={rec}
                numberCode={code}
                onDelete={onDelete}
                canEdit={editable}
                canDelete={deletable}
              />
            );
            })}
          </div>
        )
      ) : (
      <div className="overflow-hidden rounded-xl border border-[#dee2e6] bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b-2 border-[#dee2e6] bg-[#f8f9fa]">
              <th
                className="cursor-pointer whitespace-nowrap px-4 py-4 text-left text-sm font-semibold text-primary transition-colors hover:text-primary-dark"
                onClick={() => handleSort("number")}
              >
                Ref
                {sortField === "number" && (
                  <span className="ml-1 text-secondary-dark">
                    {sortDir === "asc" ? "↑" : "↓"}
                  </span>
                )}
              </th>
              <th
                className="cursor-pointer px-4 py-4 text-left text-sm font-semibold text-primary transition-colors hover:text-primary-dark"
                onClick={() => handleSort("recommendation")}
              >
                Recommendation
                {sortField === "recommendation" && (
                  <span className="ml-1 text-secondary-dark">
                    {sortDir === "asc" ? "↑" : "↓"}
                  </span>
                )}
              </th>
              <th className="px-4 py-4 text-left text-sm font-semibold text-primary">
                Implementation Partners
              </th>
              <th className="px-4 py-4 text-left text-sm font-semibold text-primary">
                Status
              </th>
              <th className="px-4 py-4 text-center text-sm font-semibold text-primary">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {paginated.length === 0 ? (
              <tr>
                <td
                  colSpan={5}
                  className="py-12 text-center font-light text-muted"
                >
                  No recommendations found
                </td>
              </tr>
            ) : (
              paginated.map((rec) => {
                const partners = getRecommendationPartners(rec.actions);
                const code = numbering.get(rec.$id)?.code;
                return (
                <tr
                  key={rec.$id}
                  className="border-b border-[#f1f3f4] last:border-0 transition-colors hover:bg-[rgba(5,70,83,0.02)]"
                >
                  <td className="whitespace-nowrap px-4 py-4 align-middle">
                    {code ? (
                      <NumberCode code={code} size="md" />
                    ) : (
                      <span className="text-muted">—</span>
                    )}
                  </td>
                  <td className="max-w-md px-4 py-4 align-middle">
                    <p className="line-clamp-2 text-sm font-medium leading-snug text-[#1f2937]">
                      {rec.recommendation}
                    </p>
                    {rec.actions.length > 1 ? (
                      <p className="mt-1 text-xs text-muted">
                        {rec.actions.length} actions · view for details
                      </p>
                    ) : (
                      (() => {
                        const evidenceItems = rec.actions.flatMap(
                          (a) => a.evidence ?? []
                        );
                        return hasEvidence(evidenceItems) ? (
                          <div className="mt-1">
                            <ActionEvidenceDisplay evidence={evidenceItems} />
                          </div>
                        ) : null;
                      })()
                    )}
                  </td>
                  <td className="max-w-sm px-4 py-4 align-middle">
                    {partners.length > 0 ? (
                      <PartnersList
                        partners={partners}
                        showLabel={false}
                        size="sm"
                      />
                    ) : (
                      <span className="text-xs italic text-muted">—</span>
                    )}
                  </td>
                  <td className="px-4 py-4 align-middle">
                    <StatusBadge status={rec.status} />
                  </td>
                  <td className="px-4 py-4 align-middle">
                    <div className="flex items-center justify-center gap-2">
                      <Link href={`/admin/${rec.$id}`}>
                        <Button
                          variant="outline"
                          size="icon"
                          title="View"
                          className="h-9 w-9 rounded-md border-[#0b7186] text-[#0b7186] hover:bg-[#0b7186]/10"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </Link>
                      {(canEditItem ? canEditItem(rec, code) : true) && (
                        <Link href={`/admin/${rec.$id}/edit`}>
                          <Button
                            variant="outline"
                            size="icon"
                            title="Edit"
                            className="h-9 w-9 rounded-md border-[#2563eb] text-[#2563eb] hover:bg-[#2563eb]/10"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                        </Link>
                      )}
                      {(canDeleteItem
                        ? canDeleteItem(rec, code)
                        : canEditItem
                          ? canEditItem(rec, code)
                          : true) && (
                        <Button
                          variant="outline"
                          size="icon"
                          title="Delete"
                          className="h-9 w-9 rounded-md border-red-500 text-red-500 hover:bg-red-50"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            onDelete(rec.$id);
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              );
              })
            )}
          </tbody>
        </table>
      </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted font-light">
            Showing {page * PAGE_SIZE + 1}–
            {Math.min((page + 1) * PAGE_SIZE, filtered.length)} of{" "}
            {filtered.length}
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page === 0}
              onClick={() => setPage((p) => p - 1)}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages - 1}
              onClick={() => setPage((p) => p + 1)}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
