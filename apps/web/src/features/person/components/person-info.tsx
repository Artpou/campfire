import { useMemo, useState } from "react";

import { Trans } from "@lingui/react/macro";
import type { TMDBPersonDetails } from "@seedarr/sdk";
import { MapPinIcon } from "lucide-react";

import { Button } from "@/shared/ui/button";

import { MediaBadgeLabel } from "@/features/media/components/badge/media-badge-label";

interface PersonInfoProps {
  person: TMDBPersonDetails;
}

const BIO_PREVIEW_LENGTH = 420;

function formatBirthday(birthday: string | null, deathday: string | null): string | null {
  if (!birthday) return null;
  const birth = new Date(birthday);
  const birthLabel = birth.toLocaleDateString(undefined, {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  if (deathday) {
    const death = new Date(deathday);
    const deathLabel = death.toLocaleDateString(undefined, {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
    const age = death.getFullYear() - birth.getFullYear();
    return `${birthLabel} – ${deathLabel} (${age})`;
  }

  const age = Math.floor((Date.now() - birth.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
  return `${birthLabel} (${age})`;
}

export function PersonInfo({ person }: PersonInfoProps) {
  const [expanded, setExpanded] = useState(false);
  const birthdayLabel = useMemo(
    () => formatBirthday(person.birthday, person.deathday),
    [person.birthday, person.deathday],
  );

  const biography = person.biography?.trim() ?? "";
  const isLongBio = biography.length > BIO_PREVIEW_LENGTH;
  const displayedBio = !expanded && isLongBio ? `${biography.slice(0, BIO_PREVIEW_LENGTH).trimEnd()}…` : biography;

  return (
    <div className="text-foreground flex flex-col gap-4">
      <div>
        <h1 className="md:text-5xl tracking-tight">{person.name}</h1>

        <div className="flex items-center gap-2 text-sm font-medium mt-4 flex-wrap">
          <MediaBadgeLabel show={!!person.known_for_department} variant="secondary">
            {person.known_for_department}
          </MediaBadgeLabel>

          <MediaBadgeLabel show={!!birthdayLabel} variant="outline">
            {birthdayLabel}
          </MediaBadgeLabel>

          <MediaBadgeLabel show={!!person.place_of_birth} variant="outline">
            {person.place_of_birth ? (
              <>
                <MapPinIcon />
                {person.place_of_birth}
              </>
            ) : null}
          </MediaBadgeLabel>
        </div>
      </div>

      {biography && (
        <div className="space-y-2">
          <p className="text-sm font-medium leading-relaxed whitespace-pre-line">{displayedBio}</p>
          {isLongBio && (
            <Button variant="ghost" size="sm" className="px-0 h-auto" onClick={() => setExpanded((v) => !v)}>
              {expanded ? <Trans>Show less</Trans> : <Trans>Read more</Trans>}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
