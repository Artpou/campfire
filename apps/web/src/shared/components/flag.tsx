import { useEffect, useState } from "react";

import { GlobeIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { getFlagUrl } from "@/shared/helpers/lang.helper";

interface FlagProps {
  lang: string;
  className?: string;
}

export function Flag({ lang, className }: FlagProps) {
  const [error, setError] = useState(false);

  // biome-ignore lint/correctness/useExhaustiveDependencies: we don't want to re-run this effect when the lang changes
  useEffect(() => {
    setError(false);
  }, [lang]);

  if (error) return <GlobeIcon className="size-4" />;

  return <img src={getFlagUrl(lang)} alt={lang} className={cn("size-4", className)} onError={() => setError(true)} />;
}
