import type { LucideIcon } from "lucide-react";
import { CompassIcon, DownloadIcon, HardDriveIcon, PlayIcon, UserCircleIcon, UsersIcon } from "lucide-react";

type Feature = {
  url: string;
  title: string;
  lead: string;
  detail: string;
  image: string;
  imageAlt: string;
  icon: LucideIcon;
};

const features: Feature[] = [
  {
    url: "/movies",
    title: "The best way to discover media",
    lead: "Browse the full TMDB catalog — movies, TV shows, trending, popular, and upcoming. Inline recommendations pull you deeper into titles you actually want to watch.",
    detail:
      "Media pages keep the essentials front and center: ratings, cast, trailers, genres, and streaming availability — plus watchlists and likes to track what’s next.",
    image: "/assets/discover.png",
    imageAlt: "Seedarr discover and catalog view",
    icon: CompassIcon,
  },
  {
    url: "/movies/:id/torrents",
    title: "Search torrents without leaving the app",
    lead: "Query Jackett, Prowlarr, or Stremio addons like Torrentio from one place. Results show quality, language, peers, and seeds so you pick the right release fast.",
    detail:
      "The built-in WebTorrent client handles the rest — live progress, pause/resume, and download management with no external client required.",
    image: "/assets/torrents.png",
    imageAlt: "Torrent search results in Seedarr",
    icon: DownloadIcon,
  },
  {
    url: "/downloads/:id/play",
    title: "Stream the moment it starts downloading",
    lead: "Progressive playback lets you watch before the torrent finishes. movi-player plays MKV, HEVC, AV1, and HDR natively in the browser — no server transcoding.",
    detail:
      "Subtitles are detected automatically from downloaded files, and watch progress means you always resume where you left off.",
    image: "/assets/player.png",
    imageAlt: "Seedarr video player",
    icon: PlayIcon,
  },
  {
    url: "/settings/remote-storage",
    title: "Offload to your NAS when you’re done",
    lead: "Transfer completed downloads over FTP/FTPS or WebDAV to a NAS, Nextcloud, or any remote server. Keep local disk light while your library lives where you want it.",
    detail:
      "Configure separate movie and TV paths, test the connection from settings, and optionally delete local files after a successful transfer.",
    image: "/assets/remote-storage.png",
    imageAlt: "Remote storage settings",
    icon: HardDriveIcon,
  },
  {
    url: "/user/:id",
    title: "A profile tailored to your cinema taste",
    lead: "Your Seedarr profile learns from you. Connect or import your Letterboxd account to instantly sync your watchlists, diary, and ratings.",
    detail:
      "Make Seedarr uniquely yours with customized activity feeds, personal watch stats, and seamless synchronization across household profiles.",
    image: "/assets/profil.png",
    imageAlt: "Personalized user profile and library settings",
    icon: UserCircleIcon,
  },
  {
    url: "/settings/users",
    title: "Built for a household, not a free-for-all",
    lead: "Owner, admin, member, and viewer roles keep permissions clear. Everyone can browse and stream the shared library; mutations stay with owners or admins.",
    detail:
      "Per-user watchlists, likes, history, and media requests — with guided onboarding so new household members get productive quickly.",
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
                  {/* Titre et icône alignés côte à côte */}
                  <div className="flex items-center gap-3 mb-4 sm:mb-5">
                    <div className="bg-primary flex size-8 shrink-0 items-center justify-center rounded-lg shadow-md shadow-primary/20 sm:size-11 sm:rounded-xl sm:shadow-lg">
                      <Icon className="text-primary-foreground size-4 sm:size-5" aria-hidden />
                    </div>
                    <h3 className="text-xl font-bold tracking-tight text-foreground sm:text-3xl">{feature.title}</h3>
                  </div>

                  <p className="text-popover-foreground text-base leading-relaxed sm:text-lg">{feature.lead}</p>

                  {/* Masqué sur mobile, visible sur sm (640px) et plus */}
                  <hr className="border-border my-6 hidden sm:block" />
                  <p className="text-muted-foreground text-base leading-relaxed hidden sm:block sm:text-lg">
                    {feature.detail}
                  </p>
                </div>

                {/* Image (se place en haut sur mobile grâce à flex-col-reverse) */}
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
