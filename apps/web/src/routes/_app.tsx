import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { AppTopbar } from "@/components/app-topbar";
import { api } from "@/lib/api";
import { useAuthStore } from "@/stores/auth-store";

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
    <>
      <AppTopbar isAuthenticated={true} />
      <main className="flex-1 overflow-y-auto">
        <Outlet />
      </main>
    </>
  );
}
