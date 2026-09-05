import { useEffect, useState } from "react";

import { msg } from "@lingui/core/macro";
import { Trans } from "@lingui/react";
import { useLingui } from "@lingui/react/macro";
import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import { MoonIcon, SearchIcon, SettingsIcon, SunIcon, UserIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { SelectI18nLang } from "@/shared/components/select/select-i18n-lang";
import { APP_NAV_ITEMS } from "@/shared/config/nav";
import { useTheme } from "@/shared/hooks/use-theme";
import { Button } from "@/shared/ui/button";

import { useAuth } from "@/features/auth/auth-store";

interface AppTopbarProps {
  isAuthenticated?: boolean;
}

const PROFILE_LINK = msg({ id: "nav.profile", message: "Profile" });

export function AppTopbar({ isAuthenticated = true }: AppTopbarProps) {
  const [isScrolled, setIsScrolled] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useLingui();
  const currentUser = useAuth((s) => s.user);
  const { theme, toggleTheme } = useTheme();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 0);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const isProfileActive = location.pathname.startsWith("/user");

  return (
    <header
      className={cn(
        "sticky top-0 z-50 w-full h-14 transition-all duration-200",
        isScrolled
          ? "bg-background/80 backdrop-blur-md border-b border-border"
          : "bg-linear-to-b from-background/90 to-transparent",
      )}
    >
      <div className="container mx-auto flex h-14 items-center px-4 md:px-6 gap-4">
        {isAuthenticated ? (
          <>
            <div className="flex items-center gap-6 min-w-0">
              <Link to="/movies" className="group flex items-center gap-2 shrink-0">
                <img
                  src="/logo192.png"
                  alt="Seedarr"
                  className="size-8 transition-all duration-300 group-hover:drop-shadow-[0_0_16px_oklch(0.63_0.13_135/1)]"
                />
                <span className="text-lg font-semibold hidden sm:inline">Seedarr</span>
              </Link>

              <nav className="hidden lg:flex items-center gap-1">
                {APP_NAV_ITEMS.map((item) => {
                  const isActive = location.pathname.startsWith(item.url);
                  return (
                    <Button
                      key={item.url}
                      variant="ghost"
                      asChild
                      className={cn("font-medium", isActive && "text-foreground bg-accent")}
                      icon={item.icon}
                    >
                      <Link to={item.url} search={{}}>
                        <Trans id={item.title.id} />
                      </Link>
                    </Button>
                  );
                })}

                {currentUser && (
                  <Button
                    variant="ghost"
                    asChild
                    className={cn("font-medium", isProfileActive && "text-foreground bg-accent")}
                    icon={UserIcon}
                  >
                    <Link to="/user/$id" params={{ id: currentUser.id }}>
                      <Trans id={PROFILE_LINK.id} />
                    </Link>
                  </Button>
                )}
              </nav>
            </div>

            <div className="flex-1 flex justify-end items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate({ to: "/search", search: { q: "", type: "all" } })}
                aria-label={t`Search`}
                icon={SearchIcon}
              />

              <Button variant="ghost" size="icon" onClick={toggleTheme} icon={theme === "dark" ? SunIcon : MoonIcon} />

              <Button variant="ghost" size="icon" asChild aria-label={t`Settings`} icon={SettingsIcon}>
                <Link to="/settings" search={{}} />
              </Button>
            </div>
          </>
        ) : (
          <>
            <div className="flex-1" />
            <SelectI18nLang />
          </>
        )}
      </div>
    </header>
  );
}
