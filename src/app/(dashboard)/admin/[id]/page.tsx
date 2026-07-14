"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  getRecommendationById,
  updateRecommendation,
  deleteRecommendation,
} from "@/lib/appwrite/database";
import type { Recommendation } from "@/lib/types/recommendation";
import {
  RECOMMENDATION_STATUSES,
  STATUS_LABELS,
  STATUS_COLORS,
} from "@/lib/types/recommendation";
import { averageActionScore, getScoreColor } from "@/lib/score";
import { getRecommendationPartners } from "@/lib/partners";
import { formatAppwriteError, isAuthError } from "@/lib/appwrite/errors";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { AdminPageContent } from "@/components/admin/AdminPageContent";
import { ScoreGauge } from "@/components/public/ScoreGauge";
import { ScoreBadge } from "@/components/ui/score-badge";
import { ActionEvidenceDisplay } from "@/components/ui/action-evidence";
import { ActionPartnersDisplay } from "@/components/ui/action-partners";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import Link from "next/link";
import {
  ArrowLeft,
  Pencil,
  Trash2,
  Calendar,
  Users,
  ListChecks,
} from "lucide-react";

export default function AdminDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const [recommendation, setRecommendation] = useState<Recommendation | null>(
    null
  );
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getRecommendationById(id)
      .then(setRecommendation)
      .catch(() => toast.error("Failed to load recommendation"))
      .finally(() => setLoading(false));
  }, [id]);

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this recommendation?")) return;
    try {
      await deleteRecommendation(id);
      toast.success("Recommendation deleted");
      router.push("/admin");
    } catch (err) {
      toast.error(formatAppwriteError(err, "Failed to delete"));
      if (isAuthError(err)) {
        router.push(`/login?redirect=${encodeURIComponent(`/admin/${id}`)}`);
      }
    }
  };

  const handleStatusChange = async (status: string) => {
    try {
      await updateRecommendation(id, {
        status: status as Recommendation["status"],
      });
      setRecommendation((prev) =>
        prev ? { ...prev, status: status as Recommendation["status"] } : null
      );
      toast.success(`Status updated to ${STATUS_LABELS[status as Recommendation["status"]]}`);
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
        <div className="text-center py-16">
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

  return (
    <AdminPageContent>
      <div className="space-y-6">
        {/* Top bar */}
        <div className="flex items-center justify-between gap-4">
          <Link href="/admin">
            <Button variant="ghost" size="sm" className="gap-1.5 text-muted">
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
          </Link>
          <div className="flex gap-2">
            <Link href={`/admin/${id}/edit`}>
              <Button variant="outline">
                <Pencil className="h-4 w-4" />
                Edit
              </Button>
            </Link>
            <Button variant="destructive" onClick={handleDelete}>
              <Trash2 className="h-4 w-4" />
              Delete
            </Button>
          </div>
        </div>

        {/* Hero header */}
        <div className="relative overflow-hidden rounded-2xl gradient-hero p-6 sm:p-8 text-white shadow-lg">
          <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/10" />
          <div className="absolute -bottom-16 -left-8 h-48 w-48 rounded-full bg-black/5" />
          <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0 flex-1 space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center rounded-full bg-white/20 px-3 py-1 text-xs font-semibold backdrop-blur-sm">
                  <Calendar className="mr-1.5 h-3.5 w-3.5" />
                  {recommendation.year}
                </span>
                <StatusBadge status={recommendation.status} />
              </div>
              <h1 className="text-2xl font-extrabold leading-tight sm:text-3xl">
                {recommendation.recommendation}
              </h1>
              <div className="flex flex-wrap gap-4 pt-1 text-sm text-white/90">
                <span className="inline-flex items-center gap-1.5">
                  <ListChecks className="h-4 w-4" />
                  {recommendation.actions.length} action
                  {recommendation.actions.length === 1 ? "" : "s"}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Users className="h-4 w-4" />
                  {partners.length} partner{partners.length === 1 ? "" : "s"}
                </span>
              </div>
            </div>
            <div className="flex shrink-0 flex-col items-center gap-1 rounded-2xl bg-white/95 p-4 shadow-md">
              <ScoreGauge score={overallScore} size="md" />
              <p className="text-[11px] font-medium text-muted">Overall score</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Actions */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center gap-2">
              <div className="h-5 w-1 rounded-full bg-secondary" />
              <h2 className="text-lg font-bold text-primary">
                Actions &amp; Implementation Partners
              </h2>
            </div>
            <ol className="space-y-3">
              {recommendation.actions.map((action, i) => (
                <li
                  key={i}
                  className="group relative overflow-hidden rounded-2xl border border-border bg-white p-4 shadow-sm transition-shadow hover:shadow-md"
                >
                  <span
                    className="absolute left-0 top-0 h-full w-1.5"
                    style={{ backgroundColor: getScoreColor(action.scoreTier) }}
                  />
                  <div className="flex items-start gap-3 pl-2">
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                      {i + 1}
                    </div>
                    <div className="min-w-0 flex-1 space-y-2.5">
                      <p className="font-medium text-gray-800">{action.text}</p>
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
                    </div>
                  </div>
                </li>
              ))}
            </ol>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <Card className="overflow-hidden">
              <div className="gradient-card-header px-5 py-3">
                <h3 className="text-sm font-bold text-white">Update Status</h3>
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

            {partners.length > 0 && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">
                    Implementation Partners
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="flex flex-wrap gap-2">
                    {partners.map((p) => (
                      <span
                        key={p}
                        className="inline-flex items-center gap-1.5 rounded-full border border-border bg-gray-50 px-3 py-1 text-xs font-medium text-gray-700"
                      >
                        <Users className="h-3 w-3 text-primary" />
                        {p}
                      </span>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {recommendation.comments && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Internal Notes</CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <p className="text-sm font-light italic text-gray-600">
                    {recommendation.comments}
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </AdminPageContent>
  );
}
