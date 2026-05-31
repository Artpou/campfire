import { useEffect, useState } from "react";

import { msg } from "@lingui/core/macro";
import { Trans, useLingui } from "@lingui/react/macro";
import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import {
  ChevronDown,
  ClockPlus,
  Eye,
  Film,
  Heart,
  ListIcon,
  LogOutIcon,
  MonitorIcon,
  MoonIcon,
  Settings,
  SunIcon,
  Tv,
  UsersIcon,
  WrenchIcon,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { useTheme } from "@/shared/hooks/use-theme";
import { LanguageDropdown } from "@/shared/language-dropdown";
import { Button } from "@/shared/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/shared/ui/dropdown-menu";

import { useAuth } from "@/features/auth/auth-store";
import { useRole } from "@/features/auth/hooks/use-role";
import { MediaSearch } from "@/features/media/components/media-search";

interface AppTopbarProps {
  isAuthenticated?: boolean;
}

const navLinks = [
  { title: msg`Movies`, url: "/movies", icon: Film },
  { title: msg`TV Shows`, url: "/tv", icon: Tv },
  { title: msg`Library`, url: "/downloads", icon: MonitorIcon },
];

const listLinks = [
  { title: msg`Watch List`, url: "/lists/watch-list", icon: ClockPlus },
  { title: msg`Liked`, url: "/lists/like", icon: Heart },
  { title: msg`History`, url: "/lists/history", icon: Eye },
];

export function AppTopbar({ isAuthenticated = true }: AppTopbarProps) {
  const [isScrolled, setIsScrolled] = useState(false);
  const [searchExpanded, setSearchExpanded] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useLingui();
  const { isAdmin, hasRole } = useRole();
  const logout = useAuth((s) => s.logout);
  const { theme, toggleTheme } = useTheme();

  useEffect(() => {
    const handleScroll = () => {
      const mainElement = document.querySelector("main");
      if (mainElement) {
        setIsScrolled(mainElement.scrollTop > 0);
      }
    };

    const mainElement = document.querySelector("main");
    if (mainElement) {
      mainElement.addEventListener("scroll", handleScroll);
      return () => mainElement.removeEventListener("scroll", handleScroll);
    }
  }, []);

  const isListsActive = location.pathname.startsWith("/lists");

  const handleSignOut = () => {
    logout();
    navigate({ to: "/login" });
  };

  return (
    <header
      className={cn(
        "sticky top-0 z-50 w-full transition-all duration-200",
        isScrolled
          ? "border-b border-border bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/80"
          : "border-b border-transparent bg-linear-to-b from-background/90 to-transparent",
      )}
    >
      <div className="container mx-auto flex h-14 items-center px-4 md:px-6 gap-4">
        {isAuthenticated ? (
          <>
            <div
              className={cn("flex items-center gap-6 min-w-0", searchExpanded && "hidden md:flex")}
            >
              <Link to="/movies" className="flex items-center gap-2 shrink-0">
                <img src="/logo192.png" alt="Seedarr" className="size-8" />
                <span className="text-lg font-semibold hidden sm:inline">Seedarr</span>
              </Link>

              <nav className="hidden lg:flex items-center gap-1">
                {navLinks.map((item) => {
                  if (item.url === "/downloads" && !hasRole("member")) return null;

                  const isActive = location.pathname.startsWith(item.url);
                  return (
                    <Button
                      key={item.url}
                      variant="ghost"
                      asChild
                      className={cn("font-medium", isActive && "text-foreground bg-accent")}
                    >
                      <Link to={item.url} search={{}}>
                        <item.icon className="size-4" />
                        {t(item.title)}
                      </Link>
                    </Button>
                  );
                })}

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      className={cn(
                        "font-medium gap-1",
                        isListsActive && "text-foreground bg-accent",
                      )}
                    >
                      <ListIcon className="size-4" />
                      {t(msg`Lists`)}
                      <ChevronDown className="size-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start">
                    {listLinks.map((item) => (
                      <DropdownMenuItem key={item.url} asChild>
                        <Link to={item.url} className="flex items-center gap-2">
                          <item.icon className="size-4" />
                          {t(item.title)}
                        </Link>
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </nav>
            </div>

            <div className="flex-1 flex justify-end items-center gap-2">
              <MediaSearch
                expanded={searchExpanded}
                onExpandedChange={setSearchExpanded}
                className={searchExpanded ? "flex-1 justify-end" : undefined}
              />

              {!searchExpanded && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" aria-label={t(msg`Settings`)}>
                      <Settings className="size-5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuLabel>
                      <Trans>Settings</Trans>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />

                    <DropdownMenuItem
                      onClick={(e) => {
                        e.preventDefault();
                        toggleTheme();
                      }}
                      className="cursor-pointer"
                    >
                      {theme === "dark" ? (
                        <SunIcon className="size-4 mr-2" />
                      ) : (
                        <MoonIcon className="size-4 mr-2" />
                      )}
                      {theme === "dark" ? <Trans>Light mode</Trans> : <Trans>Dark mode</Trans>}
                    </DropdownMenuItem>

                    <div className="px-2 py-1.5">
                      <LanguageDropdown />
                    </div>

                    {isAdmin && (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem asChild>
                          <Link to="/users" search={{}} className="flex items-center gap-2">
                            <UsersIcon className="size-4" />
                            <Trans>Manage users</Trans>
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link to="/settings" search={{}} className="flex items-center gap-2">
                            <WrenchIcon className="size-4" />
                            <Trans>Advanced options</Trans>
                          </Link>
                        </DropdownMenuItem>
                      </>
                    )}

                    <DropdownMenuSeparator />
                    <div className="px-2 py-1.5">
                      <Button
                        variant="destructive"
                        size="sm"
                        className="w-full"
                        onClick={handleSignOut}
                      >
                        <LogOutIcon className="size-4" />
                        <Trans>Sign out</Trans>
                      </Button>
                    </div>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          </>
        ) : (
          <>
            <div className="flex-1" />
            <LanguageDropdown />
          </>
        )}
      </div>
    </header>
  );
}
