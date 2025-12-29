import { useEffect, useRef, useState } from "react";

import { useLingui } from "@lingui/react/macro";
import { useLocation, useNavigate, useSearch } from "@tanstack/react-router";
import { useDebounce } from "@uidotdev/usehooks";
import { Search } from "lucide-react";

import { Input } from "@/shared/ui/input";

export function MediaSearch() {
  const navigate = useNavigate();
  const location = useLocation();
  const searchParams = useSearch({ strict: false }) as { q?: string };
  const [query, setQuery] = useState(searchParams.q || "");
  const debouncedQuery = useDebounce(query, 300);
  const isTypingRef = useRef(false);
  const { t } = useLingui();

  useEffect(() => {
    if (!isTypingRef.current) return;

    if (debouncedQuery) {
      navigate({
        to: "/search",
        search: { q: debouncedQuery },
        replace: location.pathname === "/search",
      });
    } else if (searchParams.q) {
      navigate({ to: "/movies" });
    }

    isTypingRef.current = false;
  }, [debouncedQuery, navigate, searchParams.q, location.pathname]);

  const handleChange = (value: string) => {
    isTypingRef.current = true;
    setQuery(value);
  };

  return (
    <div className="relative">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
      <Input
        type="text"
        className="placeholder:font-bold placeholder:text-lg pl-9 py-5"
        placeholder={t`Search movies and TV shows...`}
        value={query}
        onChange={(e) => handleChange(e.target.value)}
      />
    </div>
  );
}
