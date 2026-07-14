"use client";

import type { Recommendation } from "@/lib/types/recommendation";
import { averageActionScore, getScoreColor, resolveScoreTier } from "@/lib/score";
import { ScoreBadge } from "@/components/ui/score-badge";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { ActionEvidenceDisplay } from "@/components/ui/action-evidence";
import { hasEvidence } from "@/lib/evidence";
import { getRecommendationPartners } from "@/lib/partners";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Eye, Pencil, Trash2 } from "lucide-react";
import Link from "next/link";

interface AdminRecommendationCardProps {
  recommendation: Recommendation;
  onDelete: (id: string) => void;
}

export function AdminRecommendationCard({
  recommendation,
  onDelete,
}: AdminRecommendationCardProps) {
  const overallScore = averageActionScore(recommendation.actions);
  const evidenceItems = recommendation.actions.flatMap((a) => a.evidence ?? []);
  const showEvidence = hasEvidence(evidenceItems);
  const partners = getRecommendationPartners(recommendation.actions);

  return (
    <Card className="overflow-hidden hover:shadow-md transition-shadow">
      <div className="h-1 gradient-card-header" />
      <CardContent className="p-5 space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary">{recommendation.year}</Badge>
            <StatusBadge status={recommendation.status} />
          </div>
          <div className="text-right shrink-0">
            <span
              className="text-lg font-bold"
              style={{ color: getScoreColor(overallScore) }}
            >
              {overallScore}
            </span>
            <ScoreBadge
              scoreTier={resolveScoreTier(overallScore).key}
              showValue
              size="sm"
            />
          </div>
        </div>

        <h3 className="font-semibold text-primary leading-snug line-clamp-3">
          {recommendation.recommendation}
        </h3>

        <p className="text-xs text-muted">
          {recommendation.actions.length} action
          {recommendation.actions.length === 1 ? "" : "s"}
        </p>

        {partners.length > 0 && (
          <div className="rounded-lg bg-gray-50 p-2.5">
            <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-muted">
              Implementation Partners
            </p>
            <p className="text-sm text-gray-700 break-words">
              {partners.join(", ")}
            </p>
          </div>
        )}

        {showEvidence && (
          <div className="rounded-lg bg-gray-50 p-2.5">
            <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-muted">
              Evidence
            </p>
            <ActionEvidenceDisplay evidence={evidenceItems} />
          </div>
        )}

        <div className="flex items-center justify-end gap-1 pt-1 border-t border-border">
          <Link href={`/admin/${recommendation.$id}`}>
            <Button variant="ghost" size="icon" title="View">
              <Eye className="h-4 w-4" />
            </Button>
          </Link>
          <Link href={`/admin/${recommendation.$id}/edit`}>
            <Button variant="ghost" size="icon" title="Edit">
              <Pencil className="h-4 w-4" />
            </Button>
          </Link>
          <Button
            variant="ghost"
            size="icon"
            title="Delete"
            onClick={() => onDelete(recommendation.$id)}
          >
            <Trash2 className="h-4 w-4 text-red-500" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
