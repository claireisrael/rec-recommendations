"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createRecommendation } from "@/lib/appwrite/database";
import { formatAppwriteError, isAuthError } from "@/lib/appwrite/errors";
import { formatActionPartners } from "@/lib/partners";
import { RecommendationForm } from "@/components/admin/RecommendationForm";
import { AdminPageContent } from "@/components/admin/AdminPageContent";
import type { RecommendationFormData } from "@/lib/schemas/recommendation";
import { toast } from "sonner";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export default function NewRecommendationPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

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
      await createRecommendation(filtered);
      toast.success("Recommendation created successfully");
      router.push("/admin");
    } catch (err) {
      toast.error(
        formatAppwriteError(err, "Failed to create recommendation")
      );
      if (isAuthError(err)) {
        router.push(`/login?redirect=${encodeURIComponent("/admin/new")}`);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AdminPageContent>
      <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/admin">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold text-primary">
            New Recommendation
          </h1>
          <p className="text-muted font-light mt-1">
            Create a new conference recommendation
          </p>
        </div>
      </div>

      <RecommendationForm onSubmit={handleSubmit} isSubmitting={isSubmitting} />
      </div>
    </AdminPageContent>
  );
}
