"use client";

import { useState, useMemo } from "react";
import type { Recommendation } from "@/lib/types/recommendation";
import { STATUS_LABELS, RECOMMENDATION_STATUSES } from "@/lib/types/recommendation";
import { getScoreColor, averageActionScore, resolveScoreTier } from "@/lib/score";
import { ScoreBadge } from "@/components/ui/score-badge";
import { ActionEvidenceDisplay } from "@/components/ui/action-evidence";
import { hasEvidence } from "@/lib/evidence";
import { getRecommendationPartners } from "@/lib/partners";
import { StatusBadge } from "./StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
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
}

const PAGE_SIZE = 10;
type ViewMode = "table" | "cards";

export function AdminTable({
  recommendations,
  loading,
  onDelete,
}: AdminTableProps) {
  const [search, setSearch] = useState("");
  const [yearFilter, setYearFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(0);
  const [sortField, setSortField] = useState<"recommendation" | "year" | "score">("year");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [viewMode, setViewMode] = useState<ViewMode>("table");

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
      const q = search.toLowerCase();
      result = result.filter((r) => r.recommendation.toLowerCase().includes(q));
    }
    if (yearFilter) {
      result = result.filter((r) => r.year === Number(yearFilter));
    }
    if (statusFilter) {
      result = result.filter((r) => r.status === statusFilter);
    }

    result.sort((a, b) => {
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
  }, [recommendations, search, yearFilter, statusFilter, sortField, sortDir]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const handleSort = (field: typeof sortField) => {
    if (sortField === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir("desc");
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
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
        <div className="flex flex-col sm:flex-row gap-3 flex-1">
        <Input
          placeholder="Search recommendations..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(0);
          }}
          className="sm:max-w-xs"
        />
        <Select
          value={yearFilter}
          onChange={(v) => {
            setYearFilter(v);
            setPage(0);
          }}
          options={years.map((y) => ({ value: y, label: y }))}
          placeholder="All Years"
          className="sm:w-36"
        />
        <Select
          value={statusFilter}
          onChange={(v) => {
            setStatusFilter(v);
            setPage(0);
          }}
          options={[
            { value: "", label: "All statuses" },
            ...RECOMMENDATION_STATUSES.map((value) => ({
              value,
              label: STATUS_LABELS[value],
            })),
          ]}
          placeholder="All Statuses"
          className="sm:w-40"
        />
        </div>
        <div className="flex rounded-lg border border-border p-0.5 shrink-0">
          <Button
            type="button"
            variant={viewMode === "table" ? "default" : "ghost"}
            size="sm"
            className="gap-1.5"
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
            className="gap-1.5"
            onClick={() => setViewMode("cards")}
            aria-pressed={viewMode === "cards"}
          >
            <LayoutGrid className="h-4 w-4" />
            Cards
          </Button>
        </div>
      </div>

      {viewMode === "cards" ? (
        paginated.length === 0 ? (
          <p className="text-center py-12 text-muted font-light rounded-xl border border-border">
            No recommendations found
          </p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {paginated.map((rec) => (
              <AdminRecommendationCard
                key={rec.$id}
                recommendation={rec}
                onDelete={onDelete}
              />
            ))}
          </div>
        )
      ) : (
      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-primary/5 border-b border-border">
              {(
                [
                  ["recommendation", "Recommendation"],
                  ["year", "Year"],
                  ["score", "Score"],
                ] as const
              ).map(([field, label]) => (
                <th
                  key={field}
                  className="text-left px-4 py-3 font-semibold text-primary cursor-pointer hover:bg-primary/10 transition-colors"
                  onClick={() => handleSort(field)}
                >
                  {label}
                  {sortField === field && (
                    <span className="ml-1 text-secondary">
                      {sortDir === "asc" ? "↑" : "↓"}
                    </span>
                  )}
                </th>
              ))}
              <th className="text-left px-4 py-3 font-semibold text-primary">
                Implementation Partners
              </th>
              <th className="text-left px-4 py-3 font-semibold text-primary">
                Status
              </th>
              <th className="text-right px-4 py-3 font-semibold text-primary">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {paginated.length === 0 ? (
              <tr>
                <td
                  colSpan={6}
                  className="text-center py-12 text-muted font-light"
                >
                  No recommendations found
                </td>
              </tr>
            ) : (
              paginated.map((rec) => {
                const overallScore = averageActionScore(rec.actions);
                const partners = getRecommendationPartners(rec.actions);
                return (
                <tr
                  key={rec.$id}
                  className="border-b border-border last:border-0 hover:bg-gray-50/50 transition-colors"
                >
                  <td className="px-4 py-3 max-w-xs">
                    <p className="font-medium text-gray-800 truncate">
                      {rec.recommendation}
                    </p>
                    {(() => {
                      const evidenceItems = rec.actions.flatMap(
                        (a) => a.evidence ?? []
                      );
                      return hasEvidence(evidenceItems) ? (
                        <div className="mt-1">
                          <ActionEvidenceDisplay evidence={evidenceItems} />
                        </div>
                      ) : null;
                    })()}
                  </td>
                  <td className="px-4 py-3 text-muted">{rec.year}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-col gap-1">
                      <span
                        className="inline-flex items-center gap-1.5 font-semibold"
                        style={{ color: getScoreColor(overallScore) }}
                      >
                        <span
                          className="w-2.5 h-2.5 rounded-full"
                          style={{ backgroundColor: getScoreColor(overallScore) }}
                        />
                        {overallScore}
                      </span>
                      <ScoreBadge scoreTier={resolveScoreTier(overallScore).key} showValue size="sm" />
                    </div>
                  </td>
                  <td className="px-4 py-3 text-muted max-w-xs">
                    {partners.length > 0 ? (
                      <p className="text-sm text-gray-700 break-words">
                        {partners.join(", ")}
                      </p>
                    ) : (
                      <span className="text-xs italic">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={rec.status} />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <Link href={`/admin/${rec.$id}`}>
                        <Button variant="ghost" size="icon" title="View">
                          <Eye className="h-4 w-4" />
                        </Button>
                      </Link>
                      <Link href={`/admin/${rec.$id}/edit`}>
                        <Button variant="ghost" size="icon" title="Edit">
                          <Pencil className="h-4 w-4" />
                        </Button>
                      </Link>
                      <Button
                        variant="ghost"
                        size="icon"
                        title="Delete"
                        onClick={() => onDelete(rec.$id)}
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
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
