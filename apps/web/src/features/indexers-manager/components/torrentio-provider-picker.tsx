import { useMemo, useState } from "react";

import { msg } from "@lingui/core/macro";
import { Trans, useLingui } from "@lingui/react/macro";
import { SearchIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { Flag } from "@/shared/components/flag";
import { Input } from "@/shared/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select";

import { TORRENTIO_ALL_PROVIDERS } from "@/features/indexers-manager/indexers-manager";

const ALL_LANGS = "all" as const;

interface TorrentioProviderPickerProps {
  selected: Set<string>;
  onToggle: (value: string) => void;
  exclude?: Set<string>;
}

export function TorrentioProviderPicker({ selected, onToggle, exclude }: TorrentioProviderPickerProps) {
  const { t } = useLingui();
  const [search, setSearch] = useState("");
  const [langFilter, setLangFilter] = useState<string>(ALL_LANGS);

  const availableProviders = useMemo(() => {
    return TORRENTIO_ALL_PROVIDERS.filter((p) => !exclude?.has(p.value));
  }, [exclude]);

  const availableLangs = useMemo(() => {
    const langs = new Set(availableProviders.map((p) => p.lang));
    return Array.from(langs).sort();
  }, [availableProviders]);

  const filteredProviders = useMemo(() => {
    const query = search.trim().toLowerCase();
    return availableProviders.filter((p) => {
      if (langFilter !== ALL_LANGS && p.lang !== langFilter) return false;
      if (!query) return true;
      return (
        p.label.toLowerCase().includes(query) ||
        p.value.toLowerCase().includes(query) ||
        ("description" in p && p.description?.toLowerCase().includes(query))
      );
    });
  }, [availableProviders, langFilter, search]);

  return (
    <div className="flex flex-col gap-3 py-2">
      <div className="flex flex-col sm:flex-row gap-2">
        <Select value={langFilter} onValueChange={setLangFilter}>
          <SelectTrigger className="w-full sm:w-40">
            <SelectValue placeholder={t(msg`Language`)} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_LANGS}>
              <Trans>All languages</Trans>
            </SelectItem>
            {availableLangs.map((lang) => (
              <SelectItem key={lang} value={lang}>
                <span className="flex items-center gap-2">
                  <Flag lang={lang} />
                  {lang.toUpperCase()}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="relative flex-1">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder={t(msg`Search providers...`)}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="flex flex-col gap-2 max-h-[50vh] overflow-y-auto pr-1">
        {filteredProviders.length > 0 ? (
          filteredProviders.map((provider) => (
            <button
              key={provider.value}
              type="button"
              onClick={() => onToggle(provider.value)}
              className={cn(
                "flex flex-col gap-2 p-3 rounded-lg border text-left transition-colors",
                selected.has(provider.value)
                  ? "border-primary bg-primary/10 ring-1 ring-primary/30"
                  : "border-border hover:border-muted-foreground/40 hover:bg-muted/50",
              )}
            >
              <div className="flex items-center gap-2">
                <Flag lang={provider.lang} />
                <span className="text-sm font-medium">{provider.label}</span>
              </div>
              {"description" in provider && (
                <p className="text-xs text-muted-foreground line-clamp-2">{provider.description}</p>
              )}
            </button>
          ))
        ) : (
          <p className="col-span-full py-8 text-center text-sm text-muted-foreground">
            <Trans>No providers match your filters.</Trans>
          </p>
        )}
      </div>
    </div>
  );
}
