import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_auth")({
  beforeLoad: async () => {
    // Redirect if already authenticated
    if (typeof window === "undefined") {
      try {
        const { getApiServer } = await import("@/lib/api.server");
        const api = getApiServer();
        const { data: user } = await api.user.get();

        if (user) {
          throw redirect({ to: "/" });
        }
      } catch (error) {
        // Not authenticated, continue to auth pages
      }
    }
  },
  component: AuthLayout,
});

function AuthLayout() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Outlet />
    </div>
  );
}
