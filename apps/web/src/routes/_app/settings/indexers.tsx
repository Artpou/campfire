import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_app/settings/indexers")({
  beforeLoad: () => {
    throw redirect({ to: "/settings/modules", search: { tab: "indexer" } });
  },
});
