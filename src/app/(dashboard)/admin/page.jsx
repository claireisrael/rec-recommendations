"use client";

import { Suspense, useState } from "react";
import { useRecommendations } from "@/lib/hooks/useRecommendations";
import { useAuth } from "@/lib/hooks/useAuth";
import { DashboardGreeting } from "@/components/admin/DashboardGreeting";
import { AdminPageContent } from "@/components/admin/AdminPageContent";
import { ConfirmDeleteDialog } from "@/components/admin/ConfirmDeleteDialog";
import { deleteRecommendation } from "@/lib/appwrite/database";
import { formatAppwriteError } from "@/lib/appwrite/errors";
import { revalidateGuestPortal } from "@/lib/revalidate-guest";
import { AdminTable } from "@/components/admin/AdminTable";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import {
  canCreateRecommendations,
  canDeleteRecommendation,
  canEditRecommendationNow,
} from "@/lib/recommendation-assignees";

export default function AdminDashboardPage() {
  const { user } = useAuth();
  const { recommendations, loading, refetch } = useRecommendations();
  const [pendingDeleteId, setPendingDeleteId] = useState(/** @type {string | null} */ (null));
  const [deleting, setDeleting] = useState(false);
  const showCreate = canCreateRecommendations(user?.email);

  const pendingRecommendation = recommendations.find(
    (r) => r.$id === pendingDeleteId
  );

  const handleConfirmDelete = async () => {
    if (!pendingDeleteId) return;
    setDeleting(true);
    try {
      await deleteRecommendation(pendingDeleteId);
      await revalidateGuestPortal();
      toast.success("Recommendation deleted");
      setPendingDeleteId(null);
      refetch();
    } catch (err) {
      toast.error(formatAppwriteError(err, "Failed to delete recommendation"));
    } finally {
      setDeleting(false);
    }
  };

  return (
    <>
      <DashboardGreeting user={user} />

      <AdminPageContent>
        <div className="space-y-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-[1.5rem] font-semibold tracking-tight text-foreground sm:text-[1.75rem]">
                Recommendations
              </h2>
              <p className="mt-0.5 text-sm font-medium text-muted">
                Browse, filter, and manage REC actions
              </p>
            </div>
            {showCreate && (
              <Link href="/admin/new">
                <Button className="rounded-xl shadow-[0_4px_12px_rgba(46, 158, 204,0.2)]">
                  <Plus className="h-4 w-4" />
                  New Recommendation
                </Button>
              </Link>
            )}
          </div>

          <Suspense fallback={<Skeleton className="h-64 w-full rounded-xl" />}>
            <AdminTable
              recommendations={recommendations}
              loading={loading}
              onDelete={(id) => setPendingDeleteId(id)}
              canEditItem={(rec, code) =>
                canEditRecommendationNow(
                  user?.email,
                  {
                    id: rec.$id,
                    code,
                    sectionCode: rec.sectionCode,
                    category: rec.category,
                  },
                  rec
                )
              }
              canDeleteItem={(rec, code) =>
                canDeleteRecommendation(user?.email, {
                  id: rec.$id,
                  code,
                  sectionCode: rec.sectionCode,
                  category: rec.category,
                })
              }
            />
          </Suspense>
        </div>
      </AdminPageContent>

      <ConfirmDeleteDialog
        open={pendingDeleteId !== null}
        description={
          pendingRecommendation
            ? `Delete “${pendingRecommendation.recommendation.slice(0, 120)}${pendingRecommendation.recommendation.length > 120 ? "…" : ""}”? This cannot be undone.`
            : undefined
        }
        confirming={deleting}
        onConfirm={handleConfirmDelete}
        onCancel={() => {
          if (!deleting) setPendingDeleteId(null);
        }}
      />
    </>
  );
}
