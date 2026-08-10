import { useMemo } from "react";

import { Trans } from "@lingui/react/macro";
import type { TMDBWatchProvider } from "@seedarr/sdk";
import { ExternalLinkIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/shared/ui/button";

import { getBackdropUrl } from "@/features/media/helpers/media.helper";

type ProviderIconProps = {
  provider: TMDBWatchProvider;
  name: string;
  fullButton?: boolean;
};

export function ProviderIcon({ provider, name, fullButton = false }: ProviderIconProps) {
  const redirectUrl = useMemo(() => {
    const encodedName = encodeURIComponent(name);
    switch (provider.provider_name.toLowerCase()) {
      case "netflix":
        return `https://www.netflix.com/search?q=${encodedName}`;
      case "disney plus":
        return `https://www.disneyplus.com/`;
      case "canal+":
        return `https://www.canalplus.fr/`;
      case "hbo max":
        return `https://www.hbomax.com/`;
      case "amazon prime video":
        return `https://www.primevideo.com/search?phrase=${encodedName}`;
      case "apple tv+":
        return `https://www.apple.com/apple-tv-plus/`;
      case "peacock":
        return `https://www.peacocktv.com/`;
      case "paramount+":
        return `https://www.paramountplus.com/`;
    }
  }, [provider.provider_name, name]);

  if (fullButton && !redirectUrl) return null;

  if (fullButton) {
    return (
      <Button variant="secondary" onClick={() => window.open(redirectUrl, "_blank")} icon={ExternalLinkIcon}>
        <Trans>Watch on</Trans> {provider.provider_name}
      </Button>
    );
  }

  return (
    <button
      type="button"
      onClick={() => !!redirectUrl && window.open(redirectUrl, "_blank")}
      className={cn(
        "relative size-12 rounded-full border-2 border-border shadow-sm transition-all",
        redirectUrl && "cursor-pointer hover:border-primary/50 hover:scale-105",
      )}
      title={provider.provider_name}
      disabled={!redirectUrl}
    >
      <img
        src={getBackdropUrl(provider.logo_path, "original")}
        alt={provider.provider_name}
        className="size-full rounded-full object-cover"
      />
    </button>
  );
}
