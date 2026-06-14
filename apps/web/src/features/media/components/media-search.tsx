import { useLingui } from "@lingui/react/macro";
import { useNavigate } from "@tanstack/react-router";
import { SearchIcon } from "lucide-react";

import { Button } from "@/shared/ui/button";

interface MediaSearchProps {
  className?: string;
}

export function MediaSearch({ className }: MediaSearchProps) {
  const navigate = useNavigate();
  const { t } = useLingui();

  return (
    <Button
      variant="ghost"
      size="icon"
      className={className}
      aria-label={t`Search`}
      onClick={() => navigate({ to: "/search", search: { q: "", type: "movie" } })}
    >
      <SearchIcon className="size-5" />
    </Button>
  );
}
