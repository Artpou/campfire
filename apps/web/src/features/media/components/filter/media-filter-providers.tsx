import { msg } from "@lingui/core/macro";
import { Trans, useLingui } from "@lingui/react/macro";
import type { Media } from "@seedarr/sdk";
import { useQuery } from "@tanstack/react-query";
import { MonitorPlayIcon } from "lucide-react";

import { Select } from "@/shared/components/select/select";
import { useTmdbLocale } from "@/shared/hooks/use-tmdb-locale";
import { LabelWrapper } from "@/shared/ui/label";

import {
  type FilterOption,
  joinFilterIds,
  optionsFromIds,
  splitFilterIds,
} from "@/features/media/helpers/filter-options.helper";
import { getPosterUrl } from "@/features/media/helpers/media.helper";
import { providerQueries } from "@/features/media/hooks/provider.queries";

interface MediaFilterProvidersProps {
  type: Media["type"];
  value?: string;
  onChange: (value: string | undefined) => void;
  enabled?: boolean;
}

export function MediaFilterProviders({ type, value, onChange, enabled = true }: MediaFilterProvidersProps) {
  const { t } = useLingui();
  const locale = useTmdbLocale();

  const { data: providers = [] } = useQuery({
    ...providerQueries.list(type, locale),
    enabled,
  });

  const providerOptions: FilterOption[] = providers.map((provider) => ({
    id: provider.provider_id.toString(),
    name: provider.provider_name,
    image: getPosterUrl(provider.logo_path, "w92"),
  }));

  const selected = optionsFromIds(splitFilterIds(value), providerOptions);

  return (
    <LabelWrapper label={<Trans>Streaming services</Trans>} icon={MonitorPlayIcon}>
      <Select
        multi
        options={providerOptions.map((option) => ({
          value: option.id,
          label: option.name,
          image: option.image,
        }))}
        value={selected.map((option) => option.id)}
        onValueChange={(ids) => onChange(joinFilterIds(ids))}
        placeholder={t(msg`Select streaming services...`)}
        emptyLabel={<Trans>No streaming services found.</Trans>}
        panelLabel={<Trans>Streaming services</Trans>}
      />
    </LabelWrapper>
  );
}
