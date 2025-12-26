import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { AppTopbar } from "@/components/app-topbar";

export const Route = createFileRoute("/_app")({
  beforeLoad: async ({ location }) => {
    // Check authentication on server-side
    if (typeof window === "undefined") {
      try {
        const { getApiServer } = await import("@/lib/api.server");
        const api = getApiServer();
        const { data: user, error } = await api.user.get();

        if (!user || error) {
          throw redirect({
            to: "/login",
            search: {
              redirect: location.href,
            },
          });
        }

        return { user };
      } catch {
        throw redirect({
          to: "/login",
          search: {
            redirect: location.href,
          },
        });
      }
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
