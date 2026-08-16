import { Trans } from "@lingui/react/macro";
import { EarthIcon } from "lucide-react";

import { DropSelect } from "@/shared/components/drop-select";
import { Flag } from "@/shared/components/flag";

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
  const options = [
    { value: "all", label: <LanguageOption lang="all" /> },
    ...languages.map((lang) => ({ value: lang, label: <LanguageOption lang={lang} /> })),
  ];

  return (
    <DropSelect
      value={value}
      onValueChange={onValueChange}
      options={options}
      triggerClassName={triggerClassName}
      label={<Trans>Language</Trans>}
    />
  );
}
