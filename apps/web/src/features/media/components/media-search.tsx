import { useEffect, useRef, useState } from "react";

import { useLingui } from "@lingui/react/macro";
import { useLocation, useNavigate, useSearch } from "@tanstack/react-router";
import { useDebounce } from "@uidotdev/usehooks";
import { Search, X } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";

interface MediaSearchProps {
  expanded?: boolean;
  onExpandedChange?: (expanded: boolean) => void;
  className?: string;
}

export function MediaSearch({ expanded, onExpandedChange, className }: MediaSearchProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const searchParams = useSearch({ strict: false }) as { q?: string };
  const [query, setQuery] = useState(searchParams.q || "");
  const [internalExpanded, setInternalExpanded] = useState(false);
  const debouncedQuery = useDebounce(query, 300);
  const isTypingRef = useRef(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const { t } = useLingui();

  const isExpanded = expanded ?? internalExpanded;

  const setExpanded = (value: boolean) => {
    if (onExpandedChange) {
      onExpandedChange(value);
    } else {
      setInternalExpanded(value);
    }
  };

  useEffect(() => {
    if (isExpanded) {
      inputRef.current?.focus();
    }
  }, [isExpanded]);

  useEffect(() => {
    if (!isTypingRef.current) return;

    if (debouncedQuery) {
      navigate({
        to: "/search",
        search: { q: debouncedQuery },
        replace: location.pathname === "/search",
      });
    } else if (searchParams.q) {
      navigate({ to: "/" });
    }

    isTypingRef.current = false;
  }, [debouncedQuery, navigate, searchParams.q, location.pathname]);

  const handleChange = (value: string) => {
    isTypingRef.current = true;
    setQuery(value);
  };

  const handleClose = () => {
    setExpanded(false);
    setQuery("");
    if (location.pathname === "/search") {
      navigate({ to: "/movies" });
    }
  };

  const handleBlur = () => {
    if (!query) {
      setExpanded(false);
    }
  };

  if (!isExpanded) {
    return (
      <Button
        variant="ghost"
        size="icon"
        className={className}
        aria-label={t`Search`}
        onClick={() => setExpanded(true)}
      >
        <Search className="size-5" />
      </Button>
    );
  }

  return (
    <div className={cn("relative flex items-center gap-2", className)}>
      <div className="relative flex-1 min-w-[200px] md:min-w-[280px]">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
        <Input
          ref={inputRef}
          type="text"
          className="font-bold placeholder:font-bold pl-9 pr-9 py-5"
          placeholder={t`Search movies and TV shows...`}
          value={query}
          onChange={(e) => handleChange(e.target.value)}
          onBlur={handleBlur}
        />
      </div>
      <Button variant="ghost" size="icon" aria-label={t`Close search`} onClick={handleClose}>
        <X className="size-5" />
      </Button>
    </div>
  );
}
