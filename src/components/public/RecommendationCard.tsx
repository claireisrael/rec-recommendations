"use client";

import type { Recommendation } from "@/lib/types/recommendation";
import { averageActionScore, getScoreColor, getScoreBgColor } from "@/lib/score";
import { Card, CardContent } from "@/components/ui/card";
import { CategoryBadge } from "@/components/ui/category-badge";
import { NumberCode } from "@/components/ui/number-code";
import { ActionScoreDot } from "@/components/ui/score-badge";
import { ScoreRing } from "./ScoreRing";
import { ActionEvidenceDisplay } from "@/components/ui/action-evidence";
import { ActionPartnersDisplay } from "@/components/ui/action-partners";
import { ListChecks } from "lucide-react";

interface RecommendationCardProps {
  recommendation: Recommendation;
  numberCode?: string;
  onClick: () => void;
}

export function RecommendationCard({
  recommendation,
  numberCode,
  onClick,
}: RecommendationCardProps) {
  const overallScore = averageActionScore(recommendation.actions);
  const actionCount = recommendation.actions.length;
  const singleAction = actionCount === 1 ? recommendation.actions[0] : null;

  return (
    <Card
      className="group cursor-pointer overflow-hidden border-border/90 shadow-[0_1px_2px_rgba(6,90,107,0.04)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md"
      onClick={onClick}
    >
      <div className="h-[3px] bg-gradient-to-r from-primary via-primary-light to-secondary" />
      <CardContent className="p-5">
        <div className="mb-4 flex items-start gap-4">
          <ScoreRing score={overallScore} showLabel />
          <div className="min-w-0 flex-1">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              {numberCode && <NumberCode code={numberCode} size="md" />}
              <CategoryBadge category={recommendation.category} />
            </div>
            <p className="text-sm font-medium leading-snug text-[#1f2937] transition-colors group-hover:text-primary">
              {recommendation.recommendation}
            </p>
          </div>
        </div>

        {actionCount === 0 ? (
          <div className="rounded-lg border border-border bg-gray-50 px-3 py-2.5 text-sm text-muted">
            Actions not yet published
          </div>
        ) : singleAction ? (
          <div className="mb-1">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">
              Action
            </p>
            <div
              className="relative space-y-2 overflow-hidden rounded-lg border border-[rgba(5,70,83,0.1)] px-3 py-2.5"
              style={{ backgroundColor: getScoreBgColor(singleAction.scoreTier) }}
            >
              <span
                className="absolute left-0 top-0 h-full w-1"
                style={{ backgroundColor: getScoreColor(singleAction.scoreTier) }}
              />
              <div className="flex items-start gap-2 pl-2 text-sm text-[#1f2937]">
                <ActionScoreDot
                  scoreTier={singleAction.scoreTier}
                  className="h-6 w-6 shrink-0 text-[10px] ring-2 ring-white/80"
                />
                <span className="flex-1 break-words font-medium leading-snug">
                  {singleAction.text}
                </span>
              </div>
              <div className="pl-8">
                <ActionPartnersDisplay partner={singleAction.partner} />
              </div>
              <div className="pl-8">
                <ActionEvidenceDisplay evidence={singleAction.evidence} />
              </div>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between gap-3 rounded-lg border border-[rgba(5,70,83,0.08)] bg-[#f8fafb] px-3 py-2.5">
            <div className="flex items-center gap-2 text-sm text-primary-dark">
              <ListChecks className="h-4 w-4 shrink-0 text-primary" />
              <span className="font-medium">{actionCount} actions</span>
            </div>
            <span className="text-xs font-medium text-primary group-hover:underline">
              Open to view
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
