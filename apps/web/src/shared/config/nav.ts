import { msg } from "@lingui/core/macro";
import type { LucideIcon } from "lucide-react";
import { FilmIcon, LibraryIcon, MonitorIcon, TvIcon } from "lucide-react";

export type AppNavItem = {
  title: ReturnType<typeof msg>;
  url: string;
  icon: LucideIcon;
  mobileIcon?: LucideIcon;
};

export const APP_NAV_ITEMS: AppNavItem[] = [
  { title: msg({ id: "nav.movies", message: "Movies" }), url: "/movies", icon: FilmIcon },
  { title: msg({ id: "nav.tv-shows", message: "TV Shows" }), url: "/tv", icon: TvIcon },
  {
    title: msg({ id: "nav.library", message: "Library" }),
    url: "/downloads",
    icon: MonitorIcon,
    mobileIcon: LibraryIcon,
  },
];
