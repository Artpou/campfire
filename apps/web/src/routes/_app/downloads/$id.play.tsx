import { createFileRoute } from "@tanstack/react-router";

import { DownloadPlayView } from "@/features/downloads/components/download-play-view";
import { downloadQueries } from "@/features/downloads/hooks/download.queries";
import { mediaQueries } from "@/features/media/hooks/media.queries";
import { preloadMoviPlayer } from "@/features/player/helpers/movi-player.helper";
import { subtitleQueries } from "@/features/subtitles/hooks/subtitle.queries";

function validatePlaySearch(search: Record<string, unknown>): { season?: number; episode?: number } {
  const season = Number(search.season);
  const episode = Number(search.episode);
  return {
    ...(Number.isFinite(season) && season > 0 ? { season } : {}),
    ...(Number.isFinite(episode) && episode > 0 ? { episode } : {}),
  };
}

export const Route = createFileRoute("/_app/downloads/$id/play")({
  validateSearch: validatePlaySearch,
  loader: async ({ context, params }) => {
    // Start fetching the WASM player chunk while route data loads.
    preloadMoviPlayer();

    const download = await context.queryClient.ensureQueryData(downloadQueries.details(params.id));
    if (!download?.mediaId) throw new Error("Media ID not found");

    await Promise.all([
      context.queryClient.ensureQueryData(downloadQueries.playbackInfo(params.id)),
      context.queryClient.ensureQueryData(subtitleQueries.external(params.id)),
      // Always refetch — ensureQueryData would return stale progress from cache.
      context.queryClient.fetchQuery(mediaQueries.details(download.mediaId)),
    ]);
  },
  component: DownloadPlayRoute,
});

function DownloadPlayRoute() {
  const { id } = Route.useParams();
  const { season, episode } = Route.useSearch();
  return <DownloadPlayView id={id} season={season} episode={episode} />;
}
