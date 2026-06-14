import { useQuery } from "@tanstack/react-query";
import { XIcon } from "lucide-react";

import { useTmdbLocale } from "@/shared/hooks/use-tmdb-locale";

import { getBackdropUrl } from "@/features/media/helpers/media.helper";
import { providerQueries } from "@/features/media/hooks/provider.queries";

interface TVProviderTabsProps {
  value?: string;
  onValueChange: (updates: { with_watch_providers?: string }) => void;
}

export function TVProviderTabs({ value, onValueChange }: TVProviderTabsProps) {
  const locale = useTmdbLocale();
  const { data: providers = [], isLoading } = useQuery(providerQueries.list("tv", locale));

  if (isLoading || providers.length === 0) {
    return null;
  }

  const handleProviderChange = (providerId: string) => {
    if (providerId === value) {
      onValueChange({ with_watch_providers: undefined });
    } else {
      onValueChange({ with_watch_providers: providerId });
    }
  };

  return (
    <div className="flex items-center gap-2">
      {providers.map((provider) => (
        <button
          key={provider.provider_id}
          type="button"
          onClick={() => handleProviderChange(provider.provider_id.toString())}
          className={`relative size-12 rounded-full border-2 transition-all ${
            value === provider.provider_id.toString()
              ? "border-primary scale-110"
              : "border-border hover:border-primary/50 hover:scale-105"
          }`}
          title={provider.provider_name}
        >
          <img
            src={getBackdropUrl(provider.logo_path, "original")}
            alt={provider.provider_name}
            className="size-full rounded-full object-cover"
          />
          {value === provider.provider_id.toString() && (
            <div className="absolute -top-1 -right-1 size-5 rounded-full bg-primary flex items-center justify-center">
              <XIcon className="size-3 text-primary-foreground" />
            </div>
          )}
        </button>
      ))}
    </div>
  );
}
