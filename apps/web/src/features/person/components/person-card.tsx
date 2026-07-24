import { useState } from "react";

import { Trans } from "@lingui/react/macro";
import { Link } from "@tanstack/react-router";
import { UserIcon } from "lucide-react";

import { Card, CardContent } from "@/shared/ui/card";

import { getPosterUrl } from "@/features/media/helpers/media.helper";

interface PersonCardProps {
  id: number;
  name: string;
  profile_path?: string | null;
  role?: string;
  type: "Director" | "Actor";
}

export function PersonCard({ id, name, profile_path, role, type }: PersonCardProps) {
  const [imgError, setImgError] = useState(false);

  return (
    <Link to="/person/$id" params={{ id: id.toString() }} className="block">
      <Card className="group overflow-hidden gap-0 py-0 border-2 border-transparent transition-colors hover:border-primary">
        <div className="relative aspect-3/4 overflow-hidden bg-muted">
          {!imgError && !!profile_path ? (
            <img
              src={getPosterUrl(profile_path, "w185")}
              alt={name}
              className="size-full object-cover transition-transform duration-300 group-hover:scale-105"
              onError={() => setImgError(true)}
            />
          ) : (
            <div className="flex size-full items-center justify-center">
              <UserIcon className="size-10 text-muted-foreground" />
            </div>
          )}
        </div>
        <CardContent className="space-y-0.5 p-2">
          <p className="text-[11px] leading-tight text-muted-foreground">
            {type === "Director" ? <Trans>Director</Trans> : <Trans>Actor</Trans>}
          </p>
          <p className="text-xs font-semibold leading-tight line-clamp-2">{name}</p>
          {type === "Actor" && role && (
            <p className="text-[11px] leading-tight text-muted-foreground truncate" title={role}>
              {role}
            </p>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}
