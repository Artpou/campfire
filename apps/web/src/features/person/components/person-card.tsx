import { Trans } from "@lingui/react/macro";

import { Badge } from "@/shared/ui/badge";
import { Card, CardContent } from "@/shared/ui/card";

import { getPosterUrl } from "@/features/media/helpers/media.helper";

interface PersonCardProps {
  id: number;
  name: string;
  profile_path?: string | null;
  role?: string;
  type: "Director" | "Actor";
}

export function PersonCard({ name, profile_path, role, type }: PersonCardProps) {
  return (
    <Card className="group overflow-hidden border-0 py-0 pb-4 gap-4 flex-1">
      <img
        src={getPosterUrl(profile_path, "w185")}
        alt={name}
        className="aspect-square object-cover"
      />
      <CardContent className="px-2 pb-2 space-y-1">
        <p className="text-xs font-bold line-clamp-2" title={name}>
          {name}
        </p>
        {role && (
          <p className="text-xs text-muted-foreground truncate" title={role}>
            {role}
          </p>
        )}
        <Badge variant={type === "Director" ? "default" : "secondary"} className="text-[10px]">
          <Trans>{type}</Trans>
        </Badge>
      </CardContent>
    </Card>
  );
}
