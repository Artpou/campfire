import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";

import { api } from "@/lib/api";
import { AppSidebar } from "@/shared/app-sidebar";
import { AppTopbar } from "@/shared/app-topbar";
import { SidebarProvider } from "@/shared/ui/sidebar";

import { useAuthStore } from "@/features/auth/auth-store";

export const Route = createFileRoute("/_app")({
  beforeLoad: async () => {
    try {
      const response = await api.auth.me.get();
      if (response.data) {
        useAuthStore.getState().setUser(response.data);
      } else {
        throw redirect({ to: "/login" });
      }
    } catch {
      throw redirect({ to: "/login" });
    }
  },
  component: AuthenticatedLayout,
});

function AuthenticatedLayout() {
  return (
    <SidebarProvider>
      <AppSidebar />
      <div className="flex-1 flex flex-col h-screen overflow-hidden min-w-0">
        <AppTopbar isAuthenticated={true} />
        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </SidebarProvider>
  );
}
