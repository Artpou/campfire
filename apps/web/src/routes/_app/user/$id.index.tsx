import { useEffect, useMemo, useState } from "react";

import { Trans, useLingui } from "@lingui/react/macro";
import type { ListMediaQuery } from "@seedarr/contracts";
import type { Media } from "@seedarr/sdk";
import { useInfiniteQuery, useQuery, useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import type { OnChangeFn, SortingState } from "@tanstack/react-table";
import { BookmarkIcon, CalendarIcon, ClockIcon, HeartIcon, PencilIcon, SaveIcon } from "lucide-react";

import { SeedarrLoader } from "@/shared/components/seedarr-loader";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Card } from "@/shared/ui/card";
import { Container } from "@/shared/ui/container";
import { Input } from "@/shared/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/shared/ui/tabs";

import { useAuth } from "@/features/auth/auth-store";
import { MediaButtonCategory } from "@/features/media/components/button/media-button-category";
import { MediaCarouselCategory } from "@/features/media/components/carousel/media-carousel-category";
import { MediaCalendar } from "@/features/media/components/media-calendar";
import { MediaGrid } from "@/features/media/components/media-grid";
import { MediaTable } from "@/features/media/components/media-table";
import { MediaTabsViewMode } from "@/features/media/components/tabs/media-tabs-view-mode";
import { listQueryToSorting, sortingToListQuery } from "@/features/media/helpers/media-sort.helper";
import { mediaQueries } from "@/features/media/hooks/media.queries";
import { RequestCarousel } from "@/features/request/components/request-carousel";
import { requestQueries } from "@/features/request/hooks/request.queries";
import { useUserPreferences } from "@/features/settings/stores/user-preference-store";
import { RoleBadge } from "@/features/user/components/role-badge";
import { UserAvatar } from "@/features/user/components/user-avatar";
import { UserButtonLetterboxd } from "@/features/user/components/user-button-letterboxd";
import { UserProfileStats } from "@/features/user/components/user-profile-stats";
import { userQueries, useUpdateProfile } from "@/features/user/hooks/user.queries";

export const Route = createFileRoute("/_app/user/$id/")({
  loader: ({ context, params }) => context.queryClient.ensureQueryData(userQueries.details(params.id)),
  component: UserProfilePage,
});

type ProfileTab = "calendar" | "watchlist" | "liked" | "history";

function filterMedia(items: Media[], search: string): Media[] {
  const q = search.trim().toLowerCase();
  if (!q) return items;
  return items.filter(
    (media) => media.title?.toLowerCase().includes(q) || media.original_title?.toLowerCase().includes(q),
  );
}

function MediaCollectionView({
  items,
  viewMode,
  isLoading,
  onLoadMore,
  sorting,
  onSortingChange,
}: {
  items: Media[];
  viewMode: "grid" | "list";
  isLoading?: boolean;
  onLoadMore?: () => void;
  sorting?: SortingState;
  onSortingChange?: OnChangeFn<SortingState>;
}) {
  if (!isLoading && items.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-10 text-center">
        <Trans>Nothing here yet</Trans>
      </p>
    );
  }

  if (viewMode === "grid") {
    return <MediaGrid items={items} isLoading={isLoading} onLoadMore={onLoadMore} showType />;
  }

  return (
    <MediaTable
      media={items}
      isLoadingMore={isLoading}
      onLoadMore={onLoadMore}
      sorting={sorting}
      onSortingChange={onSortingChange}
    />
  );
}

function UserProfilePage() {
  const { id } = Route.useParams();
  const { t } = useLingui();
  const currentUser = useAuth((s) => s.user);
  const isOwnProfile = currentUser?.id === id;
  const updateProfile = useUpdateProfile();
  const viewMode = useUserPreferences((s) => s.viewMode);
  const showCategories = useUserPreferences((s) => s.showCategories);
  const [tab, setTab] = useState<ProfileTab>("calendar");
  const [search, setSearch] = useState("");
  const [withGenres, setWithGenres] = useState<string | undefined>();
  const [sorting, setSorting] = useState<SortingState>([]);
  const sortQuery = sortingToListQuery(sorting);

  const { data: profileUser } = useSuspenseQuery(userQueries.details(id));

  const [editingPseudo, setEditingPseudo] = useState(false);
  const [pseudo, setPseudo] = useState(profileUser.pseudo ?? profileUser.username);

  useEffect(() => {
    setPseudo(profileUser.pseudo ?? profileUser.username);
    setEditingPseudo(false);
  }, [profileUser.pseudo, profileUser.username]);

  const { data: requestsData } = useQuery({
    ...requestQueries.mine(),
    enabled: isOwnProfile,
  });

  const pendingRequests = useMemo(
    () =>
      (requestsData ?? []).filter((r) => {
        const status = (r as { status?: string }).status;
        return !status || status === "pending";
      }),
    [requestsData],
  );

  const listBase: Pick<ListMediaQuery, "userId" | "with_genres" | "sortBy" | "sortOrder"> = {
    userId: id,
    with_genres: withGenres,
    ...sortQuery,
  };

  const calendarQuery = useInfiniteQuery({
    ...mediaQueries.list({ filter: "calendar", ...listBase, limit: 100 }),
    enabled: tab === "calendar",
  });
  const watchListQuery = useInfiniteQuery({
    ...mediaQueries.list({ filter: "watch-list", ...listBase, limit: 40 }),
    enabled: tab === "watchlist",
  });
  const likesQuery = useInfiniteQuery({
    ...mediaQueries.list({ filter: "like", ...listBase, limit: 40 }),
    enabled: tab === "liked",
  });
  const historyQuery = useInfiniteQuery({
    ...mediaQueries.list({ filter: "history", ...listBase, limit: 40 }),
    enabled: tab === "history",
  });

  useEffect(() => {
    if (tab !== "calendar") return;
    if (calendarQuery.hasNextPage && !calendarQuery.isFetchingNextPage) {
      void calendarQuery.fetchNextPage();
    }
  }, [tab, calendarQuery.hasNextPage, calendarQuery.isFetchingNextPage, calendarQuery.fetchNextPage]);

  const calendarItems = useMemo(
    () => filterMedia(calendarQuery.data?.pages?.flatMap((p) => p.results) ?? [], search),
    [calendarQuery.data, search],
  );
  const watchListItems = useMemo(
    () => filterMedia(watchListQuery.data?.pages?.flatMap((p) => p.results) ?? [], search),
    [watchListQuery.data, search],
  );
  const likesItems = useMemo(
    () => filterMedia(likesQuery.data?.pages?.flatMap((p) => p.results) ?? [], search),
    [likesQuery.data, search],
  );
  const historyItems = useMemo(
    () => filterMedia(historyQuery.data?.pages?.flatMap((p) => p.results) ?? [], search),
    [historyQuery.data, search],
  );
  const displayName = profileUser.pseudo || profileUser.username;

  const handleSavePseudo = () => {
    const trimmed = pseudo.trim();
    updateProfile.mutate({ pseudo: trimmed.length > 0 ? trimmed : null }, { onSuccess: () => setEditingPseudo(false) });
  };

  const availableTabs = useMemo(
    () => [
      { value: "calendar" as const, label: <Trans>Calendar</Trans>, icon: CalendarIcon },
      { value: "watchlist" as const, label: <Trans>Watchlist</Trans>, icon: BookmarkIcon },
      { value: "liked" as const, label: <Trans>Liked</Trans>, icon: HeartIcon },
      { value: "history" as const, label: <Trans>Watch history</Trans>, icon: ClockIcon },
    ],
    [],
  );

  const activeQuery =
    tab === "calendar"
      ? calendarQuery
      : tab === "watchlist"
        ? watchListQuery
        : tab === "liked"
          ? likesQuery
          : historyQuery;

  const isInitialLoading = activeQuery.isLoading;
  const isFetchingMore = activeQuery.isFetchingNextPage;

  return (
    <Container className="space-y-8 pb-20">
      <div className="flex flex-col lg:flex-row gap-6 items-center lg:items-start justify-between w-full">
        <Card className="flex flex-row items-center gap-6 p-6 lg:min-w-[520px]">
          <div className="max-w-[250px] flex justify-center lg:justify-start">
            <UserAvatar user={profileUser} editable={isOwnProfile} />
          </div>

          <div className="flex flex-col gap-1 w-full max-w-md">
            {editingPseudo && isOwnProfile ? (
              <div className="flex items-center gap-2">
                <Input
                  value={pseudo}
                  onChange={(e) => setPseudo(e.target.value)}
                  placeholder={t`Display name`}
                  maxLength={64}
                  autoFocus
                  className="text-lg font-bold h-10"
                />
                <Button size="sm" icon={SaveIcon} loading={updateProfile.isPending} onClick={handleSavePseudo}>
                  <Trans>Save</Trans>
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-2 justify-center md:justify-start">
                <h2 className=" font-bold truncate">{displayName}</h2>
                {isOwnProfile && (
                  <Button
                    variant="outline"
                    size="icon-sm"
                    icon={PencilIcon}
                    aria-label={t`Edit display name`}
                    onClick={() => {
                      setPseudo(profileUser.pseudo ?? profileUser.username);
                      setEditingPseudo(true);
                    }}
                  />
                )}
              </div>
            )}
            <p className="text-sm text-muted-foreground">@{profileUser.username}</p>
            <div className="flex items-center gap-2 justify-center md:justify-start flex-wrap mt-1">
              <RoleBadge role={profileUser.role} />
              {profileUser.createdAt && (
                <Badge variant="outline">
                  <CalendarIcon className="size-3.5" />
                  {new Date(profileUser.createdAt).toLocaleDateString()}
                </Badge>
              )}
            </div>
          </div>
        </Card>

        <div className="flex flex-col gap-3">
          <UserProfileStats userId={id} enabled />
          {isOwnProfile && <UserButtonLetterboxd user={profileUser} />}
        </div>
      </div>

      {isOwnProfile && pendingRequests.length > 0 && (
        <RequestCarousel
          requests={pendingRequests}
          seeMoreTo={`/user/${id}/requests`}
          seeMoreSearch={{ status: "pending" }}
        />
      )}

      {availableTabs.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-2 flex-wrap">
              <MediaTabsViewMode />
              <Tabs
                value={tab}
                onValueChange={(v) => {
                  setSorting([]);
                  setTab(v as ProfileTab);
                }}
              >
                <TabsList size="lg">
                  {availableTabs.map(({ value, label, icon: Icon }) => (
                    <TabsTrigger key={value} value={value} size="lg" className="gap-2">
                      <Icon className="size-4" />
                      {label}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </Tabs>
            </div>
            <MediaButtonCategory />
          </div>

          {showCategories && (
            <MediaCarouselCategory
              type="movie"
              valueMode="name"
              value={withGenres}
              onValueChange={(value) => {
                setSorting([]);
                setWithGenres(value);
              }}
            />
          )}

          <Input
            type="text"
            search
            className="w-full"
            placeholder={t`Search in my profile...`}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />

          {isInitialLoading ? (
            <SeedarrLoader />
          ) : tab === "calendar" ? (
            <MediaCalendar items={calendarItems} viewMode={viewMode} />
          ) : (
            <MediaCollectionView
              items={tab === "watchlist" ? watchListItems : tab === "liked" ? likesItems : historyItems}
              viewMode={viewMode}
              isLoading={isFetchingMore}
              sorting={listQueryToSorting(sortQuery)}
              onSortingChange={setSorting}
              onLoadMore={() => {
                if (activeQuery.hasNextPage && !activeQuery.isFetchingNextPage) {
                  void activeQuery.fetchNextPage();
                }
              }}
            />
          )}
        </div>
      )}
    </Container>
  );
}
