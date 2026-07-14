"use client";

import { useRecommendations } from "@/lib/hooks/useRecommendations";
import { useAuth } from "@/lib/hooks/useAuth";
import { DashboardGreeting } from "@/components/admin/DashboardGreeting";
import { AdminPageContent } from "@/components/admin/AdminPageContent";
import {
  deleteRecommendation,
} from "@/lib/appwrite/database";
import { AdminTable } from "@/components/admin/AdminTable";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

export default function AdminDashboardPage() {
  const { user } = useAuth();
  const { recommendations, loading, refetch } = useRecommendations();

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this recommendation?")) return;

    try {
      await deleteRecommendation(id);
      toast.success("Recommendation deleted");
      refetch();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to delete recommendation"
      );
    }
  };

  return (
    <>
      <DashboardGreeting user={user} />

      <AdminPageContent>
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-primary">Recommendations</h1>
              <p className="text-muted font-light mt-1">
                Manage conference recommendations and actions
              </p>
            </div>
            <Link href="/admin/new">
              <Button size="lg">
                <Plus className="h-5 w-5" />
                New Recommendation
              </Button>
            </Link>
          </div>

          <AdminTable
            recommendations={recommendations}
            loading={loading}
            onDelete={handleDelete}
          />
        </div>
      </AdminPageContent>
    </>
  );
}
