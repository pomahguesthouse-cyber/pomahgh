import { ReactNode } from "react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AdminSidebar } from "./AdminSidebar";
import { AdminGuard } from "./AdminGuard";

interface AdminLayoutProps {
  children: ReactNode;
}

export const AdminLayout = ({ children }: AdminLayoutProps) => {
  return (
    <AdminGuard>
      <SidebarProvider>
        <div className="min-h-screen flex w-full">
          <AdminSidebar />

          <div className="flex-1 flex flex-col transition-all">
            <div className="p-4 border-b bg-background sticky top-0 z-10">
              <SidebarTrigger />
            </div>

            <main className="flex-1 p-6 max-w-5xl mx-auto w-full">{children}</main>
          </div>
        </div>
      </SidebarProvider>
    </AdminGuard>
  );
};
