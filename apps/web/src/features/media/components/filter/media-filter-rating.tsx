import type { ReactNode } from "react";

import { Trans } from "@lingui/react/macro";
import { StarIcon } from "lucide-react";

import { Button } from "@/shared/ui/button";
import { LabelWrapper } from "@/shared/ui/label";

const RATING_LEVELS = [0, 1, 2, 3, 4] as const;

interface MediaFilterRatingProps {
  value?: number;
  onChange: (value: number | undefined) => void;
  label?: ReactNode;
}

export function MediaFilterRating({ value, onChange, label }: MediaFilterRatingProps) {
  const activeLevel = value == null ? 0 : value / 2;

  return (
    <LabelWrapper label={label ?? <Trans>Minimum rating</Trans>} icon={StarIcon}>
      <div className="flex w-full gap-2">
        {RATING_LEVELS.map((level) => (
          <Button
            key={level}
            type="button"
            size="sm"
            className="flex-1"
            variant={activeLevel === level ? "default" : "input"}
            onClick={() => onChange(level === 0 ? undefined : level * 2)}
          >
            {level === 0 ? <Trans>Any</Trans> : `${level}+`}
          </Button>
        ))}
      </div>
    </LabelWrapper>
  );
}
