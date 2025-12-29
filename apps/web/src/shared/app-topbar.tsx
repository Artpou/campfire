import { useEffect, useState } from "react";

import { cn } from "@/lib/utils";
import { LanguageSelector } from "@/shared/language-selector";

import { MediaSearch } from "@/features/media/components/media-search";

interface AppTopbarProps {
  isAuthenticated?: boolean;
}

export function AppTopbar({ isAuthenticated = true }: AppTopbarProps) {
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      // Get the main element that has overflow-y-auto
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

  return (
    <header
      className={cn(
        "sticky top-0 z-50 w-full transition-all duration-200",
        isScrolled
          ? "border-b border-border bg-background/50"
          : "border-b border-transparent bg-transparent",
      )}
    >
      <div className="container mx-auto flex h-14 items-center px-4 md:px-6 gap-4">
        {isAuthenticated ? (
          <>
            {/* Full width search */}
            <div className="flex-1">
              <MediaSearch />
            </div>

            {/* Right: Language */}
            <div className="flex items-center gap-2">
              <LanguageSelector />
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
