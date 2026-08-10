import { Trans } from "@lingui/react/macro";
import type { MediaRequest } from "@seedarr/sdk";
import { Link } from "@tanstack/react-router";
import { ClapperboardIcon, XIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/shared/ui/button";
import { Card } from "@/shared/ui/card";
import { Img } from "@/shared/ui/image";

import { useRole } from "@/features/auth/hooks/use-role";
import { getPosterUrl } from "@/features/media/helpers/media.helper";
import { useDismissRequest } from "@/features/request/hooks/request.queries";

interface RequestCardProps {
  request: MediaRequest;
  className?: string;
}

export function RequestCard({ request, className }: RequestCardProps) {
  const { isAdmin } = useRole();
  const dismiss = useDismissRequest();

  const detailLinkProps =
    request.media.type === "tv"
      ? ({ to: "/tv/$id", params: { id: request.media.id.toString() } } as const)
      : ({ to: "/movies/$id", params: { id: request.media.id.toString() } } as const);

  return (
    <div className={cn("relative group", className)}>
      <Link {...detailLinkProps} className="block">
        <div className="relative aspect-2/3">
          <Card className="overflow-hidden relative pt-0 pb-0 border-2 border-transparent transition-colors hover:border-primary size-full">
            <Img
              src={request.media.poster_path ? getPosterUrl(request.media.poster_path, "w342") : undefined}
              alt={request.media.title}
              className="size-full object-cover"
              fallback={<ClapperboardIcon className="size-10 text-muted-foreground" />}
            />
          </Card>
        </div>
      </Link>

      <div className="mt-2 space-y-0.5">
        <p className="text-sm font-medium truncate">{request.media.title}</p>
        <Link
          to="/user/$id"
          params={{ id: request.user.id }}
          className="text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          <Trans>by</Trans> {request.user.pseudo || request.user.username}
        </Link>
      </div>

      {isAdmin && (
        <Button
          variant="destructive"
          size="icon-xs"
          className="absolute top-1.5 right-1.5 opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={(e) => {
            e.preventDefault();
            dismiss.mutate(request.id);
          }}
          disabled={dismiss.isPending}
          icon={XIcon}
        />
      )}
    </div>
  );
}
