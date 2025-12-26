import { Trans } from "@lingui/react/macro";
import { useQuery } from "@tanstack/react-query";
import { Link, useLocation } from "@tanstack/react-router";
import { Home, Server, Settings } from "lucide-react";
import { LanguageSelector } from "@/components/language-selector";
import { SearchMovie } from "@/components/movies/search-movie";
import { Button } from "@/components/ui/button";
import {
  NavigationMenu,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  navigationMenuTriggerStyle,
} from "@/components/ui/navigation-menu";
import { cn } from "@/lib/utils";

interface AppTopbarProps {
  isAuthenticated?: boolean;
}

export function AppTopbar({ isAuthenticated = true }: AppTopbarProps) {
  const location = useLocation();

  useQuery({
    queryKey: ["accountInfo"],
    queryFn: async () => {
      return {};
    },
  });

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60">
      <div className="container mx-auto flex h-14 items-center px-4 md:px-6">
        {isAuthenticated ? (
          <>
            {/* Left: Navigation Menu (only when authenticated) */}
            <div className="flex items-center">
              <NavigationMenu viewport={false}>
                <NavigationMenuList>
                  <NavigationMenuItem>
                    <NavigationMenuLink asChild>
                      <Link
                        to="/"
                        className={cn(
                          navigationMenuTriggerStyle(),
                          location.pathname === "/" && "bg-accent text-accent-foreground",
                        )}
                        search={{ tab: "movie" }}
                      >
                        <Home className="mr-2 size-4" />
                        <Trans>Home</Trans>
                      </Link>
                    </NavigationMenuLink>
                  </NavigationMenuItem>
                  <NavigationMenuItem>
                    <NavigationMenuLink asChild>
                      <Link
                        to="/server"
                        className={cn(
                          navigationMenuTriggerStyle(),
                          location.pathname === "/server" && "bg-accent text-accent-foreground",
                        )}
                      >
                        <Server className="mr-2 size-4" />
                        <Trans>Server</Trans>
                      </Link>
                    </NavigationMenuLink>
                  </NavigationMenuItem>
                </NavigationMenuList>
              </NavigationMenu>
            </div>

            {/* Center: Search (only when authenticated) */}
            <div className="flex flex-1 items-center justify-center px-4">
              <SearchMovie />
            </div>

            {/* Right: Settings + Language (when authenticated) */}
            <div className="flex items-center gap-2">
              <LanguageSelector />
              <Button variant="ghost" size="icon" className="size-9" asChild>
                <Link to="/settings">
                  <Settings className="size-4" />
                  <span className="sr-only">
                    <Trans>Settings</Trans>
                  </span>
                </Link>
              </Button>
            </div>
          </>
        ) : (
          <>
            {/* When not authenticated: only show language selector */}
            <div className="flex-1" />
            <div className="flex items-center gap-2">
              <LanguageSelector />
            </div>
          </>
        )}
      </div>
    </header>
  );
}
