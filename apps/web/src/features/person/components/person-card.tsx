import { useState } from "react";

import { Trans } from "@lingui/react/macro";
import { UserIcon } from "lucide-react";

import { cn } from "@/lib/utils";

import { getPosterUrl } from "@/features/media/helpers/media.helper";

interface PersonCardProps {
  id: number;
  name: string;
  profile_path?: string | null;
  role?: string;
  type: "Director" | "Actor";
}

export function PersonCard({ name, profile_path, role, type }: PersonCardProps) {
  const [imgError, setImgError] = useState(false);

  return (
    <div className="group flex flex-col overflow-hidden rounded-lg bg-card">
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
        <div
          className={cn(
            "absolute top-1.5 left-1.5 rounded-md px-1.5 py-0.5 text-[10px] font-semibold leading-tight",
            type === "Director"
              ? "bg-primary text-primary-foreground"
              : "bg-background/80 text-foreground backdrop-blur-sm",
          )}
        >
          <Trans>{type}</Trans>
        </div>
      </div>
      <div className="space-y-0.5 p-2">
        <p className="text-xs font-semibold leading-tight line-clamp-2">{name}</p>
        {role && (
          <p className="text-[11px] leading-tight text-muted-foreground truncate" title={role}>
            {role}
          </p>
        )}
      </div>
    </div>
  );
}
