"use client";

import { Suspense } from "react";
import { AdminPageContent } from "@/components/admin/AdminPageContent";
import { Skeleton } from "@/components/ui/skeleton";
import { AdminDetailPageContent } from "./detail-content";

export default function AdminDetailPage() {
  return (
    <Suspense
      fallback={
        <AdminPageContent>
          <div className="space-y-4">
            <Skeleton className="h-10 w-64" />
            <Skeleton className="h-64 w-full rounded-xl" />
          </div>
        </AdminPageContent>
      }
    >
      <AdminDetailPageContent />
    </Suspense>
  );
}
