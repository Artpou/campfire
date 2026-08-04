import { createFileRoute, redirect } from "@tanstack/react-router";

import { downloadQueries } from "@/features/downloads/hooks/download.queries";
import { mediaQueries } from "@/features/media/hooks/media.queries";

export const Route = createFileRoute("/_app/downloads/$id/")({
  beforeLoad: async ({ context, params }) => {
    const download = await context.queryClient.ensureQueryData(downloadQueries.details(params.id));
    if (download?.mediaId) {
      const media = await context.queryClient.ensureQueryData(mediaQueries.details(download.mediaId));
      throw redirect({
        to: media.type === "tv" ? "/tv/$id" : "/movies/$id",
        params: { id: download.mediaId.toString() },
      });
    }
    throw redirect({ to: "/downloads" });
  },
});
