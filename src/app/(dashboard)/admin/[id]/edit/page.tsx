"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  getRecommendationById,
  updateRecommendation,
} from "@/lib/appwrite/database";
import { formatAppwriteError, isAuthError } from "@/lib/appwrite/errors";
import type { Recommendation } from "@/lib/types/recommendation";
import { formatActionPartners } from "@/lib/partners";
import { RecommendationForm } from "@/components/admin/RecommendationForm";
import { AdminPageContent } from "@/components/admin/AdminPageContent";
import type { RecommendationFormData } from "@/lib/schemas/recommendation";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function EditRecommendationPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const [recommendation, setRecommendation] = useState<Recommendation | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    getRecommendationById(id)
      .then(setRecommendation)
      .catch(() => toast.error("Failed to load recommendation"))
      .finally(() => setLoading(false));
  }, [id]);

  const handleSubmit = async (data: RecommendationFormData) => {
    setIsSubmitting(true);
    try {
      const filtered = {
        ...data,
        actions: data.actions
          .filter((a) => a.text.trim())
          .map((a) => ({
            text: a.text.trim(),
            scoreTier: a.scoreTier,
            partner: formatActionPartners(a.partner),
            evidence: (a.evidence ?? []).filter(Boolean),
          })),
      };
      await updateRecommendation(id, filtered);
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
          <p className="text-muted font-light mt-1">{recommendation.recommendation}</p>
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
