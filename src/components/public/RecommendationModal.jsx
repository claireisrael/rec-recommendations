"use client";

import {
  averageActionScore,
  getScoreColor,
  getScoreBgColor,
  resolveScoreTier,
} from "@/lib/score";
import { Dialog } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScoreGauge } from "./ScoreGauge";
import { ScoreBadge, ActionScoreDot } from "@/components/ui/score-badge";
import { ActionEvidenceDisplay } from "@/components/ui/action-evidence";
import { ActionPartnersDisplay } from "@/components/ui/action-partners";
import { CategoryBadge } from "@/components/ui/category-badge";
import { NumberCode } from "@/components/ui/number-code";

/**
 * @param {{
 *   recommendation: import("@/lib/types/recommendation").Recommendation | null,
 *   numberCode?: string,
 *   open: boolean,
 *   onClose: () => void
 * }} props
 */
export function RecommendationModal({
  recommendation,
  numberCode,
  open,
  onClose,
}) {
  if (!recommendation) return null;

  const overallScore = averageActionScore(recommendation.actions);

  return (
    <Dialog open={open} onClose={onClose}>
      <div className="p-6 md:p-8">
        <div className="flex items-start gap-6 mb-6 pr-8">
          <ScoreGauge score={overallScore} size="md" />
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              {numberCode && <NumberCode code={numberCode} size="lg" />}
              <Badge variant="secondary">{recommendation.year}</Badge>
              <CategoryBadge category={recommendation.category} showCode />
              <ScoreBadge
                scoreTier={resolveScoreTier(overallScore).key}
                showValue
                size="md"
              />
            </div>
            <h2 className="text-2xl font-semibold text-primary leading-tight">
              {recommendation.recommendation}
            </h2>
          </div>
        </div>

        <div className="space-y-6">
          <section>
            <h3 className="text-sm font-semibold text-muted uppercase tracking-wide mb-3">
              Actions &amp; implementation partners
            </h3>
            <ol className="space-y-2">
              {recommendation.actions.map((action, i) => (
                <li
                  key={i}
                  className="relative flex items-start gap-3 overflow-hidden rounded-xl border border-[rgba(46, 158, 204,0.1)] p-3 text-sm text-[#1f2937]"
                  style={{ backgroundColor: getScoreBgColor(action.scoreTier) }}
                >
                  <span
                    className="absolute left-0 top-0 h-full w-1"
                    style={{ backgroundColor: getScoreColor(action.scoreTier) }}
                  />
                  <ActionScoreDot
                    scoreTier={action.scoreTier}
                    className="ml-2 ring-2 ring-white/80"
                  />
                  <div className="min-w-0 flex-1 space-y-1">
                    <p className="font-medium">{action.text}</p>
                    <ActionPartnersDisplay partner={action.partner} size="md" />
                    <ActionEvidenceDisplay evidence={action.evidence} size="md" />
                  </div>
                  <ScoreBadge scoreTier={action.scoreTier} size="sm" />
                </li>
              ))}
            </ol>
          </section>

          {recommendation.comments && (
            <section>
              <h3 className="text-sm font-semibold text-muted uppercase tracking-wide mb-2">
                Notes
              </h3>
              <p className="text-sm font-light text-gray-600 italic">
                {recommendation.comments}
              </p>
            </section>
          )}
        </div>

        <div className="mt-8 flex justify-end">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
