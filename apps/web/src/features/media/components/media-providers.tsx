import type { MediaType } from "@seedarr/contracts";
import { useQuery } from "@tanstack/react-query";
import { XIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { useTmdbLocale } from "@/shared/hooks/use-tmdb-locale";

import { getBackdropUrl } from "@/features/media/helpers/media.helper";
import { providerQueries } from "@/features/media/hooks/provider.queries";

interface MediaProvidersProps {
  type: MediaType;
  value?: string;
  onValueChange: (value?: string) => void;
  className?: string;
}

export function MediaProviders({ type, value, onValueChange, className }: MediaProvidersProps) {
  const locale = useTmdbLocale();
  const { data: providers = [], isLoading } = useQuery(providerQueries.list(type, locale));
  const quickProviders = providers.slice(0, 5);

  if (isLoading || quickProviders.length === 0) {
    return null;
  }

  const handleProviderChange = (providerId: string) => {
    onValueChange(providerId === value ? undefined : providerId);
  };

  return (
    <div className={cn("flex items-center gap-2", className)}>
      {quickProviders.map((provider) => (
        <button
          key={provider.provider_id}
          type="button"
          onClick={() => handleProviderChange(provider.provider_id.toString())}
          className={cn(
            "cursor-pointer relative size-12 rounded-full border-2 transition-all",
            value === provider.provider_id.toString()
              ? "border-primary scale-110"
              : "border-border hover:border-primary/50 hover:scale-105",
          )}
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
