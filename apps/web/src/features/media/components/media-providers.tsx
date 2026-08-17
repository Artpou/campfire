import { useMemo } from "react";

import { useLingui } from "@lingui/react";
import { Trans } from "@lingui/react/macro";
import { PlusIcon } from "lucide-react";

import { ProviderIcon } from "@/shared/components/provider-icon";
import { countryToTmdbLocale } from "@/shared/helpers/i18n.helper";
import { useIsMobile } from "@/shared/hooks/use-mobile";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/shared/ui/dropdown-menu";
import { Label } from "@/shared/ui/label";

import { getFirstWatchProviders, getUniqueWatchProviders } from "@/features/media/helpers/watch-providers.helper";

interface MediaProvidersProps {
  watchProviders?: { results?: Record<string, unknown> };
  mediaName: string;
}

/** Provider icons + contextual "Watch on …" button for the detail page. */
export function MediaProviders({ watchProviders, mediaName }: MediaProvidersProps) {
  const { i18n } = useLingui();
  const isMobile = useIsMobile();
  const tmdbLocale = countryToTmdbLocale(i18n.locale);

  const uniqueProviders = useMemo(
    () => getUniqueWatchProviders(watchProviders as Parameters<typeof getUniqueWatchProviders>[0], tmdbLocale),
    [watchProviders, tmdbLocale],
  );

  const firstProviders = useMemo(
    () => getFirstWatchProviders(uniqueProviders, isMobile ? 1 : 4),
    [uniqueProviders, isMobile],
  );
  const totalCount = uniqueProviders.flatrate.length + uniqueProviders.buyRent.length;

  if (firstProviders.length === 0) return null;

  return (
    <div className="flex flex-col gap-2">
      <Label variant="secondary">
        <Trans>Streaming</Trans>
      </Label>
      <div className="flex items-center gap-1.5">
        {firstProviders.map((provider) => (
          <ProviderIcon key={provider.provider_id} provider={provider} name={mediaName} />
        ))}
        {firstProviders.length < totalCount && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="size-12 rounded-full border-2 border-border shadow-sm bg-background hover:border-primary/50 hover:scale-105 transition-all flex items-center justify-center cursor-pointer"
                title={`See all (${totalCount})`}
              >
                <PlusIcon className="size-5" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-80">
              {uniqueProviders.flatrate.length > 0 && (
                <DropdownMenuGroup>
                  <DropdownMenuLabel>
                    <Trans>Streaming</Trans>
                  </DropdownMenuLabel>
                  <div className="flex flex-wrap gap-2 p-2">
                    {uniqueProviders.flatrate.map((provider) => (
                      <ProviderIcon key={provider.provider_id} provider={provider} name={mediaName} />
                    ))}
                  </div>
                </DropdownMenuGroup>
              )}
              {uniqueProviders.buyRent.length > 0 && (
                <>
                  {uniqueProviders.flatrate.length > 0 && <DropdownMenuSeparator />}
                  <DropdownMenuGroup>
                    <DropdownMenuLabel>
                      <Trans>Buy / Rent</Trans>
                    </DropdownMenuLabel>
                    <div className="flex flex-wrap gap-2 p-2">
                      {uniqueProviders.buyRent.map((provider) => (
                        <ProviderIcon key={provider.provider_id} provider={provider} name={mediaName} />
                      ))}
                    </div>
                  </DropdownMenuGroup>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </div>
  );
}
