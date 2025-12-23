import { Link, useLocation } from "@tanstack/react-router";
import { CheckCircle2, ChevronDown, Home, Server, Settings, XCircle } from "lucide-react";
import { useState } from "react";
import { SearchMovie } from "@/components/movies/search-movie";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  NavigationMenu,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  navigationMenuTriggerStyle,
} from "@/components/ui/navigation-menu";
import { useTmdb } from "@/hooks/use-tmdb";
import { useTorrentIndexer } from "@/hooks/use-torrent-indexer";
import { cn } from "@/lib/utils";

export function AppTopbar() {
  const { isLogged } = useTmdb();
  const { indexerType, jackettApiKey, prowlarrApiKey } = useTorrentIndexer();
  const location = useLocation();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const isIndexerConnected = indexerType === "jackett" ? !!jackettApiKey : !!prowlarrApiKey;
  const isConnected = isLogged && isIndexerConnected;

  const getBadgeLabel = () => {
    if (isLogged && isIndexerConnected) return "Connected";
    if (!isLogged && !isIndexerConnected) return "TMDB & Indexer missing";
    if (!isLogged) return "TMDB missing";
    if (!isIndexerConnected) return "Indexer missing";
    return "Connected";
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60">
      <div className="container mx-auto flex h-14 items-center px-4 md:px-6">
        {/* Left: Navigation Menu */}
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
                  >
                    <Home className="mr-2 size-4" />
                    Home
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
                    Server
                  </Link>
                </NavigationMenuLink>
              </NavigationMenuItem>
            </NavigationMenuList>
          </NavigationMenu>
        </div>

        {/* Center: Search */}
        <div className="flex flex-1 items-center justify-center px-4">
          <SearchMovie />
        </div>

        {/* Right: Settings */}
        <div className="flex items-center gap-2">
          <DropdownMenu onOpenChange={setIsDropdownOpen}>
            <DropdownMenuTrigger asChild>
              <Badge
                variant={isConnected ? "default" : "secondary"}
                className={cn(
                  "text-xs font-medium uppercase tracking-wider cursor-pointer flex items-center gap-1",
                  isConnected
                    ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                    : "bg-destructive/10 text-destructive border-destructive/20",
                )}
              >
                {getBadgeLabel()}
                <ChevronDown
                  className={cn(
                    "size-3 transition-transform duration-200",
                    isDropdownOpen && "rotate-180",
                  )}
                />
              </Badge>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>Connection Status</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="flex items-center justify-between">
                <span className="text-sm">TMDB API</span>
                {isLogged ? (
                  <CheckCircle2 className="size-4 text-emerald-500" />
                ) : (
                  <XCircle className="size-4 text-destructive" />
                )}
              </DropdownMenuItem>
              <DropdownMenuItem className="flex items-center justify-between">
                <span className="text-sm">
                  {indexerType === "jackett" ? "Jackett" : "Prowlarr"}
                </span>
                {isIndexerConnected ? (
                  <CheckCircle2 className="size-4 text-emerald-500" />
                ) : (
                  <XCircle className="size-4 text-destructive" />
                )}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button variant="ghost" size="icon" className="size-9" asChild>
            <Link to="/settings">
              <Settings className="size-4" />
              <span className="sr-only">Settings</span>
            </Link>
          </Button>
        </div>
      </div>
    </header>
  );
}
