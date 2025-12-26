import { Trans } from "@lingui/react/macro";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { type AvailableLanguage, TMDB } from "tmdb-ts";
import { MediaCarousel } from "@/components/media/media-carousel";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type TabType = "movie" | "tv";

const searchSchema = {
  tab: {
    default: "movie" as TabType,
    parse: (value: string): TabType => (value === "tv" ? "tv" : "movie"),
  },
};

const getLang = createServerFn({ method: "GET" }).handler(
  async (): Promise<AvailableLanguage | undefined> => {
    const { getRequest } = await import("@tanstack/react-start/server");
    const request = getRequest();
    const acceptLanguage = request.headers.get("accept-language")?.split(",")[0];

    // Return undefined if no language is provided
    if (!acceptLanguage) return undefined;

    // TMDB expects full locale format (e.g., "fr-FR", "en-US")
    // If only language code is provided, map it to common locale
    const languageMap: Record<string, AvailableLanguage> = {
      fr: "fr-FR",
      en: "en-US",
      es: "es-ES",
      de: "de-DE",
      it: "it-IT",
      pt: "pt-PT",
      ja: "ja-JP",
      ko: "ko-KR",
      zh: "zh-CN",
    };

    // If it's already a full locale, return it directly (after validation)
    // Otherwise, map the language code
    const lang = acceptLanguage.length > 2 ? acceptLanguage : languageMap[acceptLanguage];

    return lang as AvailableLanguage | undefined;
  },
);

const getHomeData = createServerFn({ method: "GET" })
  .inputValidator((tab: TabType) => tab)
  .handler(async ({ data: tab }) => {
    const apiKey = import.meta.env.VITE_TMDB_API_KEY || "";

    // Return null if no API key is configured
    if (!apiKey) {
      return null;
    }

    const language = await getLang();
    const tmdb = new TMDB(apiKey);

    // Only fetch data for the selected tab
    if (tab === "tv") {
      const [popularTV, latestTV, topRatedTV] = await Promise.all([
        tmdb.tvShows.popular({ language }),
        tmdb.tvShows.onTheAir({ language }),
        tmdb.tvShows.topRated({ language }),
      ]);

      return {
        tab: "tv" as const,
        popularTV,
        latestTV,
        topRatedTV,
      };
    }

    // Default: fetch movies
    const [popularMovies, latestMovies, topRatedMovies] = await Promise.all([
      tmdb.movies.popular({ language }),
      tmdb.movies.nowPlaying({ language }),
      tmdb.movies.topRated({ language }),
    ]);

    return {
      tab: "movie" as const,
      popularMovies,
      latestMovies,
      topRatedMovies,
    };
  });

export const Route = createFileRoute("/_app/")({
  component: App,
  validateSearch: (search: Record<string, unknown>) => {
    return {
      tab: searchSchema.tab.parse(String(search.tab || searchSchema.tab.default)),
    };
  },
  loaderDeps: ({ search }) => ({ tab: search.tab }),
  loader: async ({ deps }) => {
    return await getHomeData({ data: deps.tab });
  },
});

function App() {
  const data = Route.useLoaderData();
  const navigate = useNavigate();
  const { tab } = Route.useSearch();

  if (!data) {
    return (
      <div className="size-full flex flex-col items-center justify-center relative min-h-[50vh]">
        <div className="text-center space-y-4 max-w-md mx-auto">
          <h1 className="text-4xl font-black tracking-tighter">CAMPFIRE</h1>
          <p className="text-muted-foreground">
            <Trans>Configure your TMDB API Key in settings to get started.</Trans>
          </p>
        </div>
      </div>
    );
  }

  const handleTabChange = (value: string) => {
    navigate({
      to: "/",
      search: { tab: value as TabType },
    });
  };

  return (
    <div className="container mx-auto py-6 space-y-8 px-4 md:px-8 pb-20">
      <Tabs value={tab} onValueChange={handleTabChange} className="w-full space-y-8">
        <div className="flex items-center justify-start">
          <TabsList>
            <TabsTrigger value="movie">
              <Trans>Movies</Trans>
            </TabsTrigger>
            <TabsTrigger value="tv">
              <Trans>TV Shows</Trans>
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="movie" className="space-y-12">
          {data.tab === "movie" && (
            <>
              <MediaCarousel
                title={<Trans>Popular Movies</Trans>}
                data={data.popularMovies.results || []}
              />
              <MediaCarousel
                title={<Trans>Now Playing</Trans>}
                data={data.latestMovies.results || []}
              />
              <MediaCarousel
                title={<Trans>Top Rated</Trans>}
                data={data.topRatedMovies.results || []}
              />
            </>
          )}
        </TabsContent>

        <TabsContent value="tv" className="space-y-12">
          {data.tab === "tv" && (
            <>
              <MediaCarousel
                title={<Trans>Popular TV Shows</Trans>}
                data={data.popularTV.results || []}
              />
              <MediaCarousel title={<Trans>On The Air</Trans>} data={data.latestTV.results || []} />
              <MediaCarousel
                title={<Trans>Top Rated</Trans>}
                data={data.topRatedTV.results || []}
              />
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
