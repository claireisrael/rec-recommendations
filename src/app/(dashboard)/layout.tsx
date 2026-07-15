import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { AdminAuthGuard } from "@/components/admin/AdminAuthGuard";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AdminAuthGuard>
      <div className="app-shell min-h-screen">
        <AdminSidebar />
        <main className="min-h-screen pt-16 lg:pl-64 lg:pt-0">
          {children}
        </main>
      </div>
    </AdminAuthGuard>
  );
}
