import { Trans } from "@lingui/react/macro";
import { EarthIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { Flag } from "@/shared/components/flag";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select";

function LanguageOption({ lang }: { lang: string }) {
  if (lang === "all") return <Trans>All languages</Trans>;
  if (lang === "multi") {
    return (
      <span className="flex items-center gap-2">
        <EarthIcon className="size-4" />
        MULTI
      </span>
    );
  }
  return (
    <span className="flex items-center gap-2">
      <Flag lang={lang} />
      {lang.toUpperCase()}
    </span>
  );
}

interface SelectLangProps {
  value: string;
  onValueChange: (value: string) => void;
  languages: string[];
  triggerClassName?: string;
}

export function SelectLang({ value, onValueChange, languages, triggerClassName }: SelectLangProps) {
  return (
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger className={cn(triggerClassName)}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">
          <LanguageOption lang="all" />
        </SelectItem>
        {languages.map((lang) => (
          <SelectItem key={lang} value={lang}>
            <LanguageOption lang={lang} />
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
