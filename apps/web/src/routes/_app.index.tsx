import { createFileRoute, Navigate } from "@tanstack/react-router";

export const Route = createFileRoute("/_app/")({
  component: IndexPage,
});

function IndexPage() {
  return <Navigate to="/movies" />;
}
