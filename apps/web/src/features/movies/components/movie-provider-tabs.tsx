import { X } from "lucide-react";

import { cn } from "@/lib/utils";

import { getBackdropUrl } from "@/features/media/helpers/media.helper";
import { useMovieProviders } from "@/features/movies/hooks/use-movie";

interface MovieProviderTabsProps {
  value?: string;
  onValueChange: (value?: string) => void;
  className?: string;
}

export function MovieProviderTabs({ value, onValueChange, className }: MovieProviderTabsProps) {
  const { data: providers = [], isLoading } = useMovieProviders();

  if (isLoading || providers.length === 0) {
    return null;
  }

  const handleProviderChange = (providerId: string) => {
    if (providerId === value) {
      onValueChange(undefined);
    } else {
      onValueChange(providerId);
    }
  };

  return (
    <div className={cn("flex items-center gap-2", className)}>
      {providers.map(
        (provider: { provider_id: number; logo_path: string; provider_name: string }) => (
          <button
            key={provider.provider_id}
            type="button"
            onClick={() => handleProviderChange(provider.provider_id.toString())}
            className={`cursor-pointer relative size-12 rounded-full border-2 transition-all ${
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
                <X className="size-3 text-primary-foreground" />
              </div>
            )}
          </button>
        ),
      )}
    </div>
  );
}
