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
import { canEditRecommendation } from "@/lib/recommendation-assignees";

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
          !canEditRecommendation(user.email, {
            id: rec.$id,
            code,
            sectionCode: section,
            category: rec.category,
          })
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
      !canEditRecommendation(user?.email, {
        id,
        code: numberCode,
        sectionCode,
        category: recommendation?.category,
      })
    ) {
      toast.error("You can only edit recommendations in your assigned sections");
      return;
    }
    setIsSubmitting(true);
    try {
      const filtered = {
        ...data,
        actions: finalizeActions(
          data.actions,
          recommendation?.actions ?? []
        ).map((a) => ({
          ...a,
          partner: formatActionPartners(a.partner),
        })),
      };
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
              ? "You can view this recommendation, but editing is limited to items assigned to you."
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
          <h1 className="text-3xl font-bold text-primary">
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
      />
      </div>
    </AdminPageContent>
  );
}
