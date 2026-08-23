import { createFileRoute } from "@tanstack/react-router";

import { NotFoundView } from "@/shared/components/view/not-found-view";

export const Route = createFileRoute("/_app/404")({
  component: NotFoundView,
});
