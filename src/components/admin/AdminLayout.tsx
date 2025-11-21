import { ReactNode } from "react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AdminSidebar } from "./AdminSidebar";
import { useAdminCheck } from "@/hooks/useAdminCheck";
interface AdminLayoutProps {
  children: ReactNode;
}
export const AdminLayout = ({
  children
}: AdminLayoutProps) => {
  const {
    isAdmin,
    isLoading
  } = useAdminCheck();

  // --- Loading State ---
  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Checking access...</div>
      </div>;
  }

  // --- Not Admin ---
  if (!isAdmin) {
    // daripada return null (kesannya error / blank), kasih feedback
    return <div className="min-h-screen flex items-center justify-center">
        <p className="text-red-500 font-medium">Access denied</p>
      </div>;
  }

  // --- Admin ---
  return <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AdminSidebar />

        <div className="flex-1 flex flex-col">
          

          <main className="flex-1 p-6">{children}</main>
        </div>
      </div>
    </SidebarProvider>;
};