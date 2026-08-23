import { useMemo, useState } from "react";

import { msg } from "@lingui/core/macro";
import { Trans, useLingui } from "@lingui/react/macro";
import { useQuery } from "@tanstack/react-query";
import { HashIcon } from "lucide-react";

import { Select } from "@/shared/components/select/select";
import { LabelWrapper } from "@/shared/ui/label";

import { parseLabeledOptions, serializeLabeledOptions } from "@/features/media/helpers/filter-options.helper";
import { mediaQueries } from "@/features/media/hooks/media.queries";

interface MediaFilterKeywordsProps {
  value?: string;
  valueLabels?: string;
  onChange: (ids: string | undefined, labels: string | undefined) => void;
  enabled?: boolean;
}

export function MediaFilterKeywords({ value, valueLabels, onChange, enabled = true }: MediaFilterKeywordsProps) {
  const { t } = useLingui();
  const [keywordQuery, setKeywordQuery] = useState("");

  const { data: keywordResults = [] } = useQuery({
    ...mediaQueries.keywords(keywordQuery),
    enabled: enabled && keywordQuery.trim().length >= 2,
  });

  const selectedKeywords = useMemo(() => parseLabeledOptions(value, valueLabels), [value, valueLabels]);

  const keywordItems = useMemo(() => {
    const byId = new Map(selectedKeywords.map((keyword) => [keyword.id, keyword]));
    for (const result of keywordResults) {
      byId.set(result.id.toString(), { id: result.id.toString(), name: result.name });
    }
    return [...byId.values()];
  }, [keywordResults, selectedKeywords]);

  return (
    <LabelWrapper label={<Trans>Keywords</Trans>} icon={HashIcon}>
      <Select
        multi
        options={keywordItems.map((item) => ({ value: item.id, label: item.name }))}
        value={selectedKeywords.map((item) => item.id)}
        onValueChange={(ids) => {
          const byId = new Map(keywordItems.map((item) => [item.id, item]));
          const next = ids.map((id) => byId.get(id)).filter(Boolean) as { id: string; name: string }[];
          const serialized = serializeLabeledOptions(next);
          onChange(serialized.ids, serialized.labels);
        }}
        onSearchChange={setKeywordQuery}
        placeholder={t(msg`Search and add keywords...`)}
        searchPlaceholder={t(msg`Search keywords...`)}
        panelLabel={<Trans>Keywords</Trans>}
        emptyLabel={
          keywordQuery.trim().length < 2 ? <Trans>Type at least 2 characters.</Trans> : <Trans>No keyword found.</Trans>
        }
      />
    </LabelWrapper>
  );
}
