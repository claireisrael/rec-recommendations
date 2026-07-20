"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  getRecommendationById,
  getRecommendations,
  updateRecommendation,
} from "@/lib/appwrite/database";
import { formatAppwriteError, isAuthError } from "@/lib/appwrite/errors";
import { revalidateGuestPortal } from "@/lib/revalidate-guest";
import { formatActionPartners } from "@/lib/partners";
import { RecommendationForm } from "@/components/admin/RecommendationForm";
import { AdminPageContent } from "@/components/admin/AdminPageContent";
import { finalizeActions } from "@/lib/schemas/recommendation";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { useAuth } from "@/lib/hooks/useAuth";
import { buildRecommendationNumbering } from "@/lib/numbering";
import {
  canEditRecommendationNow,
  hasEditableDraftAction,
} from "@/lib/recommendation-assignees";
import { isFinalPublisher, isSuperadmin } from "@/lib/roles";

export default function EditRecommendationPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const id = /** @type {string} */ (params.id);
  const [recommendation, setRecommendation] = useState(
    /** @type {import("@/lib/types/recommendation").Recommendation | null} */ (null)
  );
  const [numberCode, setNumberCode] = useState(/** @type {string | undefined} */ (undefined));
  const [sectionCode, setSectionCode] = useState(/** @type {string | undefined} */ (undefined));
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [forbidden, setForbidden] = useState(false);
  const canEditProtected = isFinalPublisher(user?.email);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const rec = await getRecommendationById(id);
        if (cancelled) return;
        setRecommendation(rec);
        const yearRecs = await getRecommendations({ year: rec.year });
        if (cancelled) return;
        const info = buildRecommendationNumbering(yearRecs).get(rec.$id);
        const code = info?.code;
        const section = info?.sectionCode || rec.sectionCode;
        setNumberCode(code);
        setSectionCode(section);
        if (
          user?.email &&
          !canEditRecommendationNow(
            user.email,
            {
              id: rec.$id,
              code,
              sectionCode: section,
              category: rec.category,
            },
            rec
          )
        ) {
          setForbidden(true);
        }
      } catch {
        if (!cancelled) toast.error("Failed to load recommendation");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id, user?.email]);

  /** @param {import("@/lib/schemas/recommendation").RecommendationFormData} data */
  const handleSubmit = async (data) => {
    if (
      !canEditRecommendationNow(
        user?.email,
        {
          id,
          code: numberCode,
          sectionCode,
          category: recommendation?.category,
        },
        recommendation
      )
    ) {
      toast.error(
        isSuperadmin(user?.email)
          ? "You can only edit recommendations in your assigned sections"
          : "This action has been submitted and can no longer be edited. It can only be changed while it is a draft."
      );
      return;
    }
    setIsSubmitting(true);
    try {
      const prevActions = recommendation?.actions ?? [];
      const prevPartnerById = new Map(
        prevActions.map((a) => [a.id, a.partner])
      );
      const filtered = {
        ...data,
        actions: finalizeActions(data.actions, prevActions).map((a) => ({
          ...a,
          // Recommendation text and partners are Dr. Mukisa's to change only —
          // for everyone else, keep whatever was already saved.
          partner: canEditProtected
            ? formatActionPartners(a.partner)
            : prevPartnerById.get(a.id) ?? "",
        })),
      };
      if (!canEditProtected) {
        filtered.recommendation = recommendation?.recommendation ?? "";
      }
      await updateRecommendation(id, filtered);
      await revalidateGuestPortal();
      toast.success("Recommendation updated successfully");
      router.push(`/admin/${id}`);
    } catch (err) {
      toast.error(
        formatAppwriteError(err, "Failed to update recommendation")
      );
      if (isAuthError(err)) {
        router.push(`/login?redirect=${encodeURIComponent(`/admin/${id}/edit`)}`);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <AdminPageContent>
        <div className="space-y-4">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-96 w-full rounded-xl" />
        </div>
      </AdminPageContent>
    );
  }

  if (!recommendation || forbidden) {
    return (
      <AdminPageContent>
        <div className="text-center py-16">
          <p className="text-muted">
            {forbidden
              ? recommendation &&
                !isSuperadmin(user?.email) &&
                !hasEditableDraftAction(recommendation)
                ? "This recommendation has been submitted for review or published, so it can no longer be edited here. Actions can only be changed while they are drafts."
                : "You can view this recommendation, but editing is limited to items assigned to you."
              : "Recommendation not found"}
          </p>
          <Link href={forbidden ? `/admin/${id}` : "/admin"}>
            <Button variant="outline" className="mt-4">
              {forbidden ? "Back to recommendation" : "Back to Dashboard"}
            </Button>
          </Link>
        </div>
      </AdminPageContent>
    );
  }

  return (
    <AdminPageContent>
      <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href={`/admin/${id}`}>
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-semibold text-primary">
            Edit Recommendation
          </h1>
          <p className="mt-1 text-sm font-medium text-foreground/80">
            {recommendation.recommendation}
          </p>
        </div>
      </div>

      <RecommendationForm
        initialData={recommendation}
        onSubmit={handleSubmit}
        isSubmitting={isSubmitting}
        lockProtected={!canEditProtected}
      />
      </div>
    </AdminPageContent>
  );
}
