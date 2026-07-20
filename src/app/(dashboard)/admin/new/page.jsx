"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createRecommendation } from "@/lib/appwrite/database";
import { formatAppwriteError, isAuthError } from "@/lib/appwrite/errors";
import { revalidateGuestPortal } from "@/lib/revalidate-guest";
import { formatActionPartners } from "@/lib/partners";
import { RecommendationForm } from "@/components/admin/RecommendationForm";
import { AdminPageContent } from "@/components/admin/AdminPageContent";
import { finalizeActions } from "@/lib/schemas/recommendation";
import { toast } from "sonner";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useAuth } from "@/lib/hooks/useAuth";
import { canCreateRecommendations } from "@/lib/recommendation-assignees";

export default function NewRecommendationPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const allowed = canCreateRecommendations(user?.email);

  useEffect(() => {
    if (user && !allowed) {
      toast.error("You can only edit recommendations assigned to you");
      router.replace("/admin/assignments");
    }
  }, [user, allowed, router]);

  /** @param {import("@/lib/schemas/recommendation").RecommendationFormData} data */
  const handleSubmit = async (data) => {
    if (!canCreateRecommendations(user?.email)) {
      toast.error("You can only edit recommendations assigned to you");
      return;
    }
    setIsSubmitting(true);
    try {
      const filtered = {
        ...data,
        actions: finalizeActions(data.actions).map((a) => ({
          ...a,
          partner: formatActionPartners(a.partner),
        })),
      };
      await createRecommendation(filtered);
      await revalidateGuestPortal();
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

  if (user && !allowed) {
    return (
      <AdminPageContent>
        <p className="py-12 text-center text-sm text-muted">Redirecting…</p>
      </AdminPageContent>
    );
  }

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
            <h1 className="text-3xl font-semibold text-primary">
              New Recommendation
            </h1>
            <p className="mt-1 text-sm font-medium text-foreground/80">
              Create a new conference recommendation
            </p>
          </div>
        </div>

        <RecommendationForm
          onSubmit={handleSubmit}
          isSubmitting={isSubmitting}
        />
      </div>
    </AdminPageContent>
  );
}
