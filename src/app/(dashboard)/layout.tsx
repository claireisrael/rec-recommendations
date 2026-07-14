import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { AdminAuthGuard } from "@/components/admin/AdminAuthGuard";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AdminAuthGuard>
      <div className="min-h-screen bg-background">
        <AdminSidebar />
        <main className="lg:pl-72 pt-16 lg:pt-0 min-h-screen">
          {children}
        </main>
      </div>
    </AdminAuthGuard>
  );
}
