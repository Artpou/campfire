import { Trans, useLingui } from "@lingui/react/macro";

import { cn } from "@/lib/utils";
import { setStoredCountry } from "@/shared/helpers/i18n.helper";

import { i18n } from "@/i18n";
// @ts-expect-error - Compiled message files don't have type definitions
import { messages as enMessages } from "@/locales/en/messages.mjs";
// @ts-expect-error - Compiled message files don't have type definitions
import { messages as frMessages } from "@/locales/fr/messages.mjs";

const OPTIONS = [
  { lang: "en" as const, country: "US", label: "English" },
  { lang: "fr" as const, country: "FR", label: "Français" },
];

function langFromLocale(locale: string): "en" | "fr" {
  const upper = locale.toUpperCase();
  if (upper === "FR" || upper.startsWith("FR")) return "fr";
  try {
    const language = new Intl.Locale(`und-${locale}`).maximize().language;
    return language === "fr" ? "fr" : "en";
  } catch {
    return "en";
  }
}

interface OnboardingLanguageProps {
  className?: string;
}

export function OnboardingLanguage({ className }: OnboardingLanguageProps) {
  const { i18n: linguiI18n } = useLingui();
  const selected = langFromLocale(linguiI18n.locale || i18n.locale || "US");

  const select = (lang: "en" | "fr") => {
    const option = OPTIONS.find((o) => o.lang === lang);
    if (!option) return;
    const messages = lang === "fr" ? frMessages : enMessages;
    i18n.load(option.country, messages);
    i18n.activate(option.country);
    setStoredCountry(option.country);
  };

  return (
    <div className={cn("space-y-3", className)}>
      <p className="text-sm font-medium">
        <Trans>Interface language</Trans>
      </p>
      <div className="grid grid-cols-2 gap-3">
        {OPTIONS.map((option) => (
          <button
            key={option.lang}
            type="button"
            onClick={() => select(option.lang)}
            className={cn(
              "rounded-md border px-4 py-3 text-left text-sm font-semibold transition-colors",
              selected === option.lang
                ? "border-primary bg-primary/10 text-foreground"
                : "border-border hover:border-primary/50 hover:bg-accent/40",
            )}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}
