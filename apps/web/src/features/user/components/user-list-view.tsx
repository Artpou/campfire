import type { ReactNode } from "react";

import { Trans } from "@lingui/react/macro";
import type { ListMediaQuery } from "@seedarr/contracts";

import { flattenInfiniteResults } from "@/shared/hooks/use-infinite-list";
import { Container } from "@/shared/ui/container";

import { MediaGrid } from "@/features/media/components/media-grid";
import { useMediaList } from "@/features/media/hooks/use-media";

export interface UserListViewProps {
  userId: string;
  filter: Extract<ListMediaQuery["filter"], "like" | "watch-list" | "history">;
  title: ReactNode;
}

export function UserListView({ userId, filter, title }: UserListViewProps) {
  const query = useMediaList({ filter, userId });

  return (
    <Container>
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">{title}</h1>

        {!query.isPending && flattenInfiniteResults(query).length === 0 ? (
          <div className="flex items-center justify-center py-20 text-muted-foreground">
            <p className="text-lg">
              <Trans>No items yet.</Trans>
            </p>
          </div>
        ) : (
          <MediaGrid query={query} showType />
        )}
      </div>
    </Container>
  );
}
