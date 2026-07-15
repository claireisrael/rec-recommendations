"use client";

import type { Recommendation } from "@/lib/types/recommendation";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { ActionEvidenceDisplay } from "@/components/ui/action-evidence";
import { hasEvidence } from "@/lib/evidence";
import { getRecommendationPartners } from "@/lib/partners";
import { PartnersList } from "@/components/ui/action-partners";
import { Card, CardContent } from "@/components/ui/card";
import { NumberCode } from "@/components/ui/number-code";
import { Button } from "@/components/ui/button";
import { Eye, Pencil, Trash2 } from "lucide-react";
import Link from "next/link";

interface AdminRecommendationCardProps {
  recommendation: Recommendation;
  numberCode?: string;
  onDelete: (id: string) => void;
  canEdit?: boolean;
  canDelete?: boolean;
}

export function AdminRecommendationCard({
  recommendation,
  numberCode,
  onDelete,
  canEdit = true,
  canDelete = canEdit,
}: AdminRecommendationCardProps) {
  const evidenceItems = recommendation.actions.flatMap((a) => a.evidence ?? []);
  const showEvidence = hasEvidence(evidenceItems);
  const partners = getRecommendationPartners(recommendation.actions);

  return (
    <Card className="hr-card overflow-hidden border-none shadow-[0_2px_12px_rgba(0,0,0,0.04)] transition-all hover:-translate-y-0.5 hover:shadow-[0_6px_24px_rgba(0,0,0,0.07)]">
      <div className="h-[3px] bg-gradient-to-r from-primary via-primary-light to-secondary" />
      <CardContent className="space-y-3 p-5">
        <div className="flex flex-wrap items-center gap-2">
          {numberCode && <NumberCode code={numberCode} size="md" />}
          <StatusBadge status={recommendation.status} />
        </div>

        {/* Match AdminTable body: text-sm font-medium — not global h3 bold */}
        <p className="line-clamp-3 text-sm font-medium leading-snug text-[#1f2937]">
          {recommendation.recommendation}
        </p>

        {recommendation.actions.length > 1 ? (
          <p className="text-xs font-normal text-muted">
            {recommendation.actions.length} actions · view for details
          </p>
        ) : (
          <>
            {partners.length > 0 && (
              <PartnersList partners={partners} showLabel={false} size="sm" />
            )}
            {showEvidence && (
              <ActionEvidenceDisplay evidence={evidenceItems} />
            )}
          </>
        )}

        <div className="flex items-center justify-end gap-2 border-t border-[#eceff1] pt-3">
          <Link href={`/admin/${recommendation.$id}`}>
            <Button
              variant="outline"
              size="icon"
              title="View"
              className="h-9 w-9 rounded-md border-[#0b7186] text-[#0b7186] hover:bg-[#0b7186]/10"
            >
              <Eye className="h-4 w-4" />
            </Button>
          </Link>
          {canEdit && (
            <Link href={`/admin/${recommendation.$id}/edit`}>
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
          {canDelete && (
            <Button
              variant="outline"
              size="icon"
              title="Delete"
              className="h-9 w-9 rounded-md border-red-500 text-red-500 hover:bg-red-50"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onDelete(recommendation.$id);
              }}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
