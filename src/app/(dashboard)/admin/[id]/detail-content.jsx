"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import {
  getRecommendationById,
  updateRecommendation,
  deleteRecommendation,
  getRecommendations,
} from "@/lib/appwrite/database";
import {
  RECOMMENDATION_STATUSES,
  STATUS_LABELS,
  STATUS_COLORS,
} from "@/lib/types/recommendation";
import { averageActionScore, getScoreColor } from "@/lib/score";
import { getRecommendationPartners } from "@/lib/partners";
import { buildRecommendationNumbering } from "@/lib/numbering";
import { formatAppwriteError, isAuthError } from "@/lib/appwrite/errors";
import { revalidateGuestPortal } from "@/lib/revalidate-guest";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { CategoryBadge } from "@/components/ui/category-badge";
import { NumberCode } from "@/components/ui/number-code";
import { ActionReviewPanel } from "@/components/admin/ActionReviewPanel";
import { AdminPageContent } from "@/components/admin/AdminPageContent";
import { useAuth } from "@/lib/hooks/useAuth";
import { ScoreGauge } from "@/components/public/ScoreGauge";
import { ScoreBadge } from "@/components/ui/score-badge";
import { ActionEvidenceDisplay } from "@/components/ui/action-evidence";
import {
  ActionPartnersDisplay,
  PartnersList,
} from "@/components/ui/action-partners";
import { ConfirmDeleteDialog } from "@/components/admin/ConfirmDeleteDialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import Link from "next/link";
import {
  ArrowLeft,
  BookOpenCheck,
  Calendar,
  ListChecks,
  Pencil,
  Trash2,
  Users,
} from "lucide-react";
import {
  canDeleteRecommendation,
  canEditRecommendationNow,
} from "@/lib/recommendation-assignees";
import { isFinalPublisher, isL1Reviewer } from "@/lib/roles";
import { cn } from "@/lib/utils";

export function AdminDetailPageContent() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const id = /** @type {string} */ (params.id);
  const reviewActionId = searchParams.get("review") || "";
  const [recommendation, setRecommendation] = useState(
    /** @type {import("@/lib/types/recommendation").Recommendation | null} */ (null)
  );
  const [numberCode, setNumberCode] = useState(/** @type {string | undefined} */ (undefined));
  const [sectionCode, setSectionCode] = useState(/** @type {string | undefined} */ (undefined));
  const [loading, setLoading] = useState(true);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const reload = async () => {
    const rec = await getRecommendationById(id);
    setRecommendation(rec);
    const yearRecs = await getRecommendations({ year: rec.year });
    const map = buildRecommendationNumbering(yearRecs);
    const info = map.get(rec.$id);
    setNumberCode(info?.code);
    setSectionCode(info?.sectionCode || rec.sectionCode);
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const rec = await getRecommendationById(id);
        if (cancelled) return;
        setRecommendation(rec);
        const yearRecs = await getRecommendations({ year: rec.year });
        if (cancelled) return;
        const map = buildRecommendationNumbering(yearRecs);
        const info = map.get(rec.$id);
        setNumberCode(info?.code);
        setSectionCode(info?.sectionCode || rec.sectionCode);
      } catch {
        if (!cancelled) toast.error("Failed to load recommendation");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  useEffect(() => {
    if (!reviewActionId || loading || !recommendation) return;
    const t = window.setTimeout(() => {
      document
        .getElementById(`action-${reviewActionId}`)
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 250);
    return () => window.clearTimeout(t);
  }, [reviewActionId, loading, recommendation]);

  const pendingForUser = useMemo(() => {
    if (!recommendation || !user) return [];
    return recommendation.actions.filter((a) => {
      const st = a.review?.status;
      const assignedL1 =
        isL1Reviewer(user.email) &&
        st === "awaiting_l1" &&
        (!a.review.l1ReviewerId || a.review.l1ReviewerId === user.$id) &&
        a.review.submitterId !== user.$id;
      const superPending =
        isFinalPublisher(user.email) && st === "awaiting_superadmin";
      return assignedL1 || superPending;
    });
  }, [recommendation, user]);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await deleteRecommendation(id);
      await revalidateGuestPortal();
      toast.success("Recommendation deleted");
      setConfirmDeleteOpen(false);
      router.push("/admin");
    } catch (err) {
      toast.error(formatAppwriteError(err, "Failed to delete"));
      if (isAuthError(err)) {
        router.push(`/login?redirect=${encodeURIComponent(`/admin/${id}`)}`);
      }
    } finally {
      setDeleting(false);
    }
  };

  /** @param {string} status */
  const handleStatusChange = async (status) => {
    try {
      await updateRecommendation(id, { status });
      await revalidateGuestPortal();
      setRecommendation((prev) => (prev ? { ...prev, status } : null));
      toast.success(`Status updated to ${STATUS_LABELS[status]}`);
    } catch (err) {
      toast.error(formatAppwriteError(err, "Failed to update status"));
      if (isAuthError(err)) {
        router.push(`/login?redirect=${encodeURIComponent(`/admin/${id}`)}`);
      }
    }
  };

  if (loading) {
    return (
      <AdminPageContent>
        <div className="space-y-4">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-64 w-full rounded-xl" />
        </div>
      </AdminPageContent>
    );
  }

  if (!recommendation) {
    return (
      <AdminPageContent>
        <div className="py-16 text-center">
          <p className="text-muted">Recommendation not found</p>
          <Link href="/admin">
            <Button variant="outline" className="mt-4">
              Back to Dashboard
            </Button>
          </Link>
        </div>
      </AdminPageContent>
    );
  }

  const overallScore = averageActionScore(recommendation.actions);
  const partners = getRecommendationPartners(recommendation.actions);
  const accessTarget = {
    id: recommendation.$id,
    code: numberCode,
    sectionCode: sectionCode || recommendation.sectionCode,
    category: recommendation.category,
  };
  const canEdit = canEditRecommendationNow(
    user?.email,
    accessTarget,
    recommendation
  );
  const canDelete = canDeleteRecommendation(user?.email, accessTarget);
  const isReviewMode = pendingForUser.length > 0 || Boolean(reviewActionId);

  return (
    <>
      <AdminPageContent>
        <div className="space-y-6">
          <div className="flex items-center justify-between gap-4">
            <Link href={isReviewMode ? "/admin/reviews" : "/admin"}>
              <Button variant="ghost" size="sm" className="gap-1.5 text-muted">
                <ArrowLeft className="h-4 w-4" />
                {isReviewMode ? "Back to inbox" : "Back"}
              </Button>
            </Link>
            {(canEdit || canDelete) && (
              <div className="flex gap-2">
                {canEdit && (
                  <Link href={`/admin/${id}/edit`}>
                    <Button variant="outline">
                      <Pencil className="h-4 w-4" />
                      Edit
                    </Button>
                  </Link>
                )}
                {canDelete && (
                  <Button
                    variant="destructive"
                    onClick={() => setConfirmDeleteOpen(true)}
                  >
                    <Trash2 className="h-4 w-4" />
                    Delete
                  </Button>
                )}
              </div>
            )}
          </div>

          {isReviewMode && (
            <section className="overflow-hidden rounded-2xl border border-[rgba(46, 158, 204,0.1)] bg-white shadow-[0_2px_12px_rgba(0,0,0,0.04)]">
              <div className="accent-bar h-[3px] w-full" />
              <div className="px-5 py-4 sm:px-6">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[rgba(46, 158, 204,0.08)] text-primary">
                    <BookOpenCheck className="h-4 w-4" />
                  </span>
                  <h2 className="text-base font-semibold tracking-tight text-primary">
                    Review workspace
                  </h2>
                  {numberCode && <NumberCode code={numberCode} size="sm" />}
                  {pendingForUser.length > 0 && (
                    <span className="rounded-md bg-rose-50 px-2 py-0.5 text-[11px] font-semibold tabular-nums text-rose-600">
                      {pendingForUser.length} awaiting you
                    </span>
                  )}
                </div>
                <p className="mt-2 max-w-2xl text-sm text-muted">
                  Confirm the recommendation context, then score and decide on
                  the action below.
                </p>
                <ol className="mt-3 flex flex-wrap gap-2">
                  {[
                    "Review context",
                    "Check action",
                    "Score & decide",
                  ].map((label, i) => (
                    <li
                      key={label}
                      className="inline-flex items-center gap-1.5 rounded-md border border-[rgba(46, 158, 204,0.1)] bg-[#f8fafb] px-2.5 py-1 text-[11px] font-medium text-primary"
                    >
                      <span className="flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] font-semibold text-white">
                        {i + 1}
                      </span>
                      {label}
                    </li>
                  ))}
                </ol>
              </div>
            </section>
          )}

          <section className="relative overflow-hidden rounded-2xl border border-[rgba(46, 158, 204,0.1)] bg-white shadow-[0_2px_12px_rgba(0,0,0,0.04)]">
            <div className="accent-bar h-[3px] w-full" />
            <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-start sm:justify-between sm:gap-6 sm:p-5">
              <div className="min-w-0 flex-1 space-y-2.5">
                <div className="flex flex-wrap items-center gap-2">
                  {numberCode && <NumberCode code={numberCode} size="md" />}
                  <span className="inline-flex items-center rounded-full border border-[rgba(46, 158, 204,0.12)] bg-[#f8f9fa] px-2.5 py-1 text-xs font-medium text-primary">
                    <Calendar className="mr-1.5 h-3.5 w-3.5" />
                    {recommendation.year}
                  </span>
                  <StatusBadge status={recommendation.status} />
                  <CategoryBadge category={recommendation.category} showCode />
                </div>
                <p className="text-sm font-medium leading-snug text-[#1f2937] sm:text-base">
                  {recommendation.recommendation}
                </p>
                <div className="flex flex-wrap gap-3 text-xs font-medium text-muted">
                  <span className="inline-flex items-center gap-1.5">
                    <ListChecks className="h-3.5 w-3.5 text-primary" />
                    {recommendation.actions.length} action
                    {recommendation.actions.length === 1 ? "" : "s"}
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <Users className="h-3.5 w-3.5 text-secondary-dark" />
                    {partners.length} partner
                    {partners.length === 1 ? "" : "s"}
                  </span>
                </div>
                {partners.length > 0 && (
                  <PartnersList partners={partners} showLabel={false} size="sm" />
                )}
                {recommendation.comments && (
                  <p className="rounded-lg border border-border/70 bg-[#f8f9fa] px-3 py-2 text-xs italic text-muted">
                    Internal notes: {recommendation.comments}
                  </p>
                )}
              </div>
              <div className="flex shrink-0 flex-col items-center gap-1 self-start rounded-xl border border-[rgba(46, 158, 204,0.08)] bg-[#f8fafb] px-3 py-3">
                <ScoreGauge score={overallScore} size="md" />
                <p className="text-[11px] font-medium text-muted">
                  Overall score
                </p>
              </div>
            </div>
          </section>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <div className="space-y-4 lg:col-span-2">
              <div className="flex items-center gap-2">
                <div className="h-5 w-1 rounded-full bg-secondary" />
                <h2 className="text-lg font-semibold text-primary">
                  Actions to review &amp; score
                </h2>
              </div>
              <ol className="space-y-4">
                {recommendation.actions.map((action, i) => {
                  const focused = reviewActionId === action.id;
                  const awaitingYou = pendingForUser.some(
                    (a) => a.id === action.id
                  );
                  return (
                    <li
                      key={action.id}
                      id={`action-${action.id}`}
                      className={cn(
                        "group relative scroll-mt-24 overflow-hidden rounded-2xl border bg-white p-4 shadow-sm transition-shadow",
                        focused || awaitingYou
                          ? "border-secondary/50 shadow-[0_10px_30px_rgba(239, 167, 79,0.15)]"
                          : "border-border hover:shadow-md"
                      )}
                    >
                      <span
                        className="absolute left-0 top-0 h-full w-1.5"
                        style={{
                          backgroundColor: getScoreColor(action.scoreTier),
                        }}
                      />
                      <div className="flex items-start gap-3 pl-2">
                        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                          {i + 1}
                        </div>
                        <div className="min-w-0 flex-1 space-y-3">
                          <div>
                            <p className="text-[10px] font-semibold uppercase tracking-wide text-muted">
                              Action {i + 1}
                              {(focused || awaitingYou) && (
                                <span className="ml-2 rounded bg-secondary px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-white">
                                  Your review
                                </span>
                              )}
                            </p>
                            <p className="mt-1 font-medium leading-relaxed text-gray-800">
                              {action.text}
                            </p>
                          </div>
                          <div className="flex flex-wrap items-center gap-2">
                            <ActionPartnersDisplay partner={action.partner} />
                            <ScoreBadge
                              scoreTier={action.scoreTier}
                              showValue
                              size="sm"
                            />
                          </div>
                          {action.evidence.length > 0 && (
                            <div className="rounded-lg bg-gray-50 p-2.5">
                              <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-muted">
                                Evidence
                              </p>
                              <ActionEvidenceDisplay
                                evidence={action.evidence}
                                size="md"
                              />
                            </div>
                          )}
                          <ActionReviewPanel
                            recommendation={recommendation}
                            action={action}
                            actionIndex={i}
                            userEmail={user?.email}
                            userId={user?.$id}
                            focused={focused || awaitingYou}
                            numberCode={numberCode}
                            onUpdated={() => {
                              void reload();
                            }}
                          />
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ol>
            </div>

            <div className="space-y-6">
              {canEdit && (
                <Card className="overflow-hidden">
                  <div className="gradient-card-header px-5 py-3">
                    <h3 className="text-sm font-semibold text-white">
                      Update Status
                    </h3>
                  </div>
                  <CardContent className="p-4">
                    <div className="flex flex-col gap-2">
                      {RECOMMENDATION_STATUSES.map((s) => {
                        const c = STATUS_COLORS[s];
                        const active = recommendation.status === s;
                        return (
                          <button
                            key={s}
                            type="button"
                            onClick={() => handleStatusChange(s)}
                            className="flex items-center gap-2.5 rounded-lg border px-3 py-2 text-sm font-semibold transition-all"
                            style={{
                              color: active ? "#fff" : c.color,
                              backgroundColor: active ? c.color : c.bg,
                              borderColor: active ? c.color : c.border,
                            }}
                          >
                            <span
                              className="h-2.5 w-2.5 rounded-full"
                              style={{
                                backgroundColor: active ? "#fff" : c.color,
                              }}
                            />
                            {STATUS_LABELS[s]}
                          </button>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </div>
      </AdminPageContent>

      <ConfirmDeleteDialog
        open={confirmDeleteOpen}
        description={
          recommendation
            ? `Delete “${recommendation.recommendation.slice(0, 120)}${
                recommendation.recommendation.length > 120 ? "…" : ""
              }”? This cannot be undone.`
            : undefined
        }
        confirming={deleting}
        onConfirm={handleDelete}
        onCancel={() => {
          if (!deleting) setConfirmDeleteOpen(false);
        }}
      />
    </>
  );
}
