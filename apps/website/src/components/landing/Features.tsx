import type { LucideIcon } from "lucide-react";
import {
  CheckIcon,
  ClockIcon,
  CompassIcon,
  DownloadIcon,
  PlayIcon,
  PuzzleIcon,
  UserCircleIcon,
  UsersIcon,
} from "lucide-react";

type FeatureItem = {
  text: string;
  comingSoon?: boolean;
};

type Feature = {
  url: string;
  title: string;
  items: FeatureItem[];
  detail: string;
  image: string;
  imageAlt: string;
  icon: LucideIcon;
};

const features: Feature[] = [
  {
    url: "/movies/:id",
    title: "The best way to discover media",
    items: [
      { text: "Full TMDB catalog — movies, TV, trending, popular, and search" },
      { text: "IMDb, TMDB, and your own scores on every title" },
      { text: "Trailers, cast, genres, and where it’s streaming" },
      { text: "Watchlist, likes, and recommendations without leaving the page" },
    ],
    detail: "Title pages keep story and next action together — from trailer to torrents in one view.",
    image: "/assets/movie.png",
    imageAlt: "Seedarr movie details with ratings, trailer, and cast",
    icon: CompassIcon,
  },
  {
    url: "/movies/:id/torrents",
    title: "Search torrents without leaving the app",
    items: [
      { text: "Query Torrentio, Jackett, Prowlarr, or a custom Stremio addon" },
      { text: "Quality, language, peers, and seeds on every result" },
      { text: "Built-in WebTorrent client — no qBittorrent required" },
      { text: "Live progress, pause, resume, and transfer from the same UI" },
    ],
    detail: "Pick a release and Seedarr handles the rest, from magnet to disk.",
    image: "/assets/torrents.png",
    imageAlt: "Torrent search results in Seedarr",
    icon: DownloadIcon,
  },
  {
    url: "/downloads/:id/play",
    title: "Stream the moment it starts downloading",
    items: [
      { text: "Watch as soon as the torrent starts — no waiting for 100%" },
      { text: "Native MKV, HEVC, AV1, and HDR in the browser" },
      { text: "Subtitles detected from downloaded files" },
      { text: "Resume exactly where you left off" },
      { text: "Browse the next episodes from the player carousel" },
    ],
    detail: "No server transcoding. Series playback keeps season and episode navigation under the player.",
    image: "/assets/player-series.png",
    imageAlt: "Seedarr series player with episode carousel",
    icon: PlayIcon,
  },
  {
    url: "/settings/modules",
    title: "Plug in the modules you actually use",
    items: [
      { text: "One Settings: Modules catalog for the whole stack" },
      { text: "System modules for TMDB metadata and SUBDL subtitles" },
      { text: "Indexers: Torrentio, Jackett, Prowlarr, or a custom Stremio addon" },
      { text: "Offload finished downloads to your NAS over FTP or WebDAV" },
      { text: "SMB storage", comingSoon: true },
    ],
    detail: "Install what you need, toggle the rest. Health status and configuration live on the same list.",
    image: "/assets/modules.png",
    imageAlt: "Seedarr modules catalog with indexers, storage, and social integrations",
    icon: PuzzleIcon,
  },
  {
    url: "/user/:id",
    title: "A profile tailored to your cinema taste",
    items: [
      { text: "Per-user watchlist, likes, history, and ratings" },
      { text: "Import and sync Letterboxd diary and watchlist" },
      { text: "Household profiles that don’t mix each other’s taste" },
      { text: "Letterboxd synchronization for watchlists and ratings" },
      { text: "Trakt synchronization", comingSoon: true },
    ],
    detail: "Connect Letterboxd from Modules and your profile. Trakt will land in the same social category.",
    image: "/assets/profil.png",
    imageAlt: "Personalized user profile and library",
    icon: UserCircleIcon,
  },
  {
    url: "/settings/users",
    title: "Built for a household, not a free-for-all",
    items: [
      { text: "Owner, admin, member, and viewer roles" },
      { text: "Shared library — anyone signed in can browse and stream" },
      { text: "Downloads stay owned: pause, delete, and transfer need permission" },
      { text: "Media requests with guided onboarding for new members" },
      { text: "Notifications (Discord, Telegram, Email)", comingSoon: true },
    ],
    detail: "Designed for a trusted household install, not an open internet service.",
    image: "/assets/member.png",
    imageAlt: "Multi-user household roles",
    icon: UsersIcon,
  },
];

export default function Features() {
  return (
    <section id="features" className="relative px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <div className="mx-auto mb-14 max-w-2xl text-center">
          <p className="text-primary mb-2 text-sm font-semibold tracking-widest uppercase">Features</p>
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Everything between browse and play</h2>
          <p className="text-popover-foreground mt-3 text-base sm:text-lg">
            One app for catalog, torrents, downloads, and streaming — designed for a trusted household install.
          </p>
        </div>

        <div className="flex flex-col gap-16 lg:gap-20">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            const reverse = index % 2 === 1;
            return (
              <article
                key={feature.title}
                className={`flex flex-col-reverse gap-8 lg:grid lg:grid-cols-2 lg:items-center lg:gap-14 ${
                  reverse ? "lg:[&>*:first-child]:order-2" : ""
                }`}
              >
                <div>
                  <div className="mb-4 flex items-center gap-3 sm:mb-5">
                    <div className="bg-primary flex size-8 shrink-0 items-center justify-center rounded-lg shadow-md shadow-primary/20 sm:size-11 sm:rounded-xl sm:shadow-lg">
                      <Icon className="text-primary-foreground size-4 sm:size-5" aria-hidden />
                    </div>
                    <h3 className="text-xl font-bold tracking-tight text-foreground sm:text-3xl">{feature.title}</h3>
                  </div>

                  <ul className="space-y-2.5">
                    {feature.items.map((item) => (
                      <li key={item.text} className="flex items-start gap-2.5">
                        {item.comingSoon ? (
                          <ClockIcon className="text-muted-foreground mt-0.5 size-4 shrink-0" aria-hidden />
                        ) : (
                          <CheckIcon className="text-primary mt-0.5 size-4 shrink-0" aria-hidden />
                        )}
                        <span className="text-popover-foreground text-sm leading-relaxed sm:text-base">
                          {item.text}
                          {item.comingSoon ? (
                            <span className="text-muted-foreground ml-2 text-xs font-medium tracking-wide uppercase">
                              Coming soon
                            </span>
                          ) : null}
                        </span>
                      </li>
                    ))}
                  </ul>

                  <div className="h-px w-full bg-border my-5"></div>

                  <p className="text-muted-foreground text-xs leading-relaxed sm:text-sm">{feature.detail}</p>
                </div>

                <div className="animate-fade-up-delay-3 animate-float-soft relative mx-auto w-full max-w-5xl lg:mt-12">
                  <div className="from-primary/35 via-primary/10 absolute -inset-px rounded-xl bg-gradient-to-br to-transparent opacity-80 blur-[1px]"></div>
                  <div className="border-border/80 bg-card relative overflow-hidden rounded-xl border shadow-2xl shadow-black/40">
                    <div className="border-border/60 flex items-center gap-2 border-b px-4 py-2.5">
                      <span className="bg-muted-foreground/40 size-2.5 rounded-full"></span>
                      <span className="bg-muted-foreground/40 size-2.5 rounded-full"></span>
                      <span className="bg-primary/80 size-2.5 rounded-full"></span>
                      <span className="text-muted-foreground ml-3 text-xs">{feature.url}</span>
                    </div>
                    <img
                      src={feature.image}
                      alt={feature.imageAlt}
                      width={900}
                      height={520}
                      className="h-auto w-full"
                      loading="lazy"
                    />
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
