import { useEffect, useMemo, useState } from "react";

import { Trans, useLingui } from "@lingui/react/macro";
import type { ListMediaQuery } from "@seedarr/contracts";
import type { Media } from "@seedarr/sdk";
import { useInfiniteQuery, useQuery, useSuspenseQuery } from "@tanstack/react-query";
import type { OnChangeFn, SortingState } from "@tanstack/react-table";
import { useDebounce } from "@uidotdev/usehooks";
import { BookmarkIcon, CalendarIcon, ClockIcon, HeartIcon, PencilIcon, SaveIcon } from "lucide-react";

import { ResponsiveTabs } from "@/shared/components/responsive-tabs";
import { SeedarrLoader } from "@/shared/components/seedarr-loader";
import { SentinelStuck, StickyFilterBar } from "@/shared/components/sentinel/sentinel-stuck";
import { flattenInfiniteResults, type InfiniteResultsQuery } from "@/shared/hooks/use-infinite-list";
import { useIsMobile } from "@/shared/hooks/use-mobile";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Card } from "@/shared/ui/card";
import { Container } from "@/shared/ui/container";
import { Input } from "@/shared/ui/input";

import { useAuth } from "@/features/auth/auth-store";
import { MediaCalendar } from "@/features/media/components/media-calendar";
import { MediaGrid } from "@/features/media/components/media-grid";
import { MediaTable } from "@/features/media/components/media-table";
import type { LibraryFiltersValue } from "@/features/media/components/sheet/media-sheet-filter-library";
import { LibraryFiltersSheet } from "@/features/media/components/sheet/media-sheet-filter-library";
import { MediaTabsViewMode } from "@/features/media/components/tabs/media-tabs-view-mode";
import { listQueryToSorting, sortingToListQuery } from "@/features/media/helpers/media-sort.helper";
import { mediaQueries } from "@/features/media/hooks/media.queries";
import { RequestCarousel } from "@/features/request/components/request-carousel";
import { requestQueries } from "@/features/request/hooks/request.queries";
import { useEffectiveViewMode } from "@/features/settings/hooks/use-effective-view-mode";
import { RoleBadge } from "@/features/user/components/role-badge";
import { UserAvatar } from "@/features/user/components/user-avatar";
import { UserButtonLetterboxd } from "@/features/user/components/user-button-letterboxd";
import { UserProfileStats } from "@/features/user/components/user-profile-stats";
import { userQueries, useUpdateProfile } from "@/features/user/hooks/user.queries";

type ProfileTab = "calendar" | "watchlist" | "liked" | "history";

function MediaCollectionView({
  items,
  query,
  viewMode,
  sorting,
  onSortingChange,
}: {
  items: Media[];
  query: InfiniteResultsQuery<Media>;
  viewMode: "grid" | "list";
  sorting?: SortingState;
  onSortingChange?: OnChangeFn<SortingState>;
}) {
  if (!query.isPending && items.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-10 text-center">
        <Trans>Nothing here yet</Trans>
      </p>
    );
  }

  if (viewMode === "grid") {
    return <MediaGrid items={items} query={query} showType />;
  }

  return <MediaTable media={items} query={query} sorting={sorting} onSortingChange={onSortingChange} />;
}

export interface UserProfileViewProps {
  userId: string;
}

export function UserProfileView({ userId: id }: UserProfileViewProps) {
  const { t } = useLingui();
  const currentUser = useAuth((s) => s.user);
  const isOwnProfile = currentUser?.id === id;
  const updateProfile = useUpdateProfile();
  const viewMode = useEffectiveViewMode("profile");
  const _isMobile = useIsMobile();
  const [tab, setTab] = useState<ProfileTab>("calendar");
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 300);
  const [isStuck, setIsStuck] = useState(false);
  const [libraryFilters, setLibraryFilters] = useState<LibraryFiltersValue>({});
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

  const listBase: Pick<
    ListMediaQuery,
    | "userId"
    | "with_genres"
    | "release_date_gte"
    | "release_date_lte"
    | "with_runtime_gte"
    | "with_runtime_lte"
    | "vote_average_gte"
    | "q"
    | "sortBy"
    | "sortOrder"
  > = {
    userId: id,
    with_genres: libraryFilters.with_genres,
    release_date_gte: libraryFilters.release_date_gte,
    release_date_lte: libraryFilters.release_date_lte,
    with_runtime_gte: libraryFilters.with_runtime_gte,
    with_runtime_lte: libraryFilters.with_runtime_lte,
    vote_average_gte: libraryFilters.vote_average_gte,
    q: debouncedSearch.trim() || undefined,
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

  const calendarItems = flattenInfiniteResults(calendarQuery);
  const watchListItems = flattenInfiniteResults(watchListQuery);
  const likesItems = flattenInfiniteResults(likesQuery);
  const historyItems = flattenInfiniteResults(historyQuery);
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

  return (
    <Container className="space-y-8 pb-20">
      <div className="flex flex-col lg:flex-row gap-6 items-center lg:items-start justify-between w-full">
        <Card className="flex flex-row items-center gap-6 p-6 w-full lg:min-w-[520px] lg:w-auto">
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
                    variant="secondary"
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
          <SentinelStuck setIsStuck={setIsStuck} marginTop={-30} />
          {!isStuck && (
            <Input
              type="search"
              search
              classNameWrapper="w-full"
              h="lg"
              placeholder={t`Search in my profile...`}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          )}

          <StickyFilterBar isStuck={isStuck}>
            {isStuck ? (
              <div className="flex w-full items-center gap-2">
                <Input
                  type="search"
                  search
                  classNameWrapper="w-full min-w-0 flex-1"
                  className="h-10"
                  placeholder={t`Search in my profile...`}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
                <LibraryFiltersSheet
                  genreScope="both"
                  type="movie"
                  value={libraryFilters}
                  onChange={(value) => {
                    setSorting([]);
                    setLibraryFilters(value);
                  }}
                />
              </div>
            ) : (
              <div className="flex items-center justify-between gap-2">
                <div className="flex min-w-0 flex-row items-center gap-2">
                  <MediaTabsViewMode scope="profile" />
                  <ResponsiveTabs
                    className="min-w-0 flex-1"
                    value={tab}
                    onValueChange={(v) => {
                      setSorting([]);
                      setTab(v as ProfileTab);
                    }}
                    options={availableTabs.map(({ value, label, icon }) => ({
                      value,
                      label,
                      icon,
                    }))}
                  />
                </div>
                <LibraryFiltersSheet
                  genreScope="both"
                  type="movie"
                  value={libraryFilters}
                  onChange={(value) => {
                    setSorting([]);
                    setLibraryFilters(value);
                  }}
                />
              </div>
            )}
          </StickyFilterBar>

          {activeQuery.isLoading ? (
            <SeedarrLoader />
          ) : tab === "calendar" ? (
            <MediaCalendar items={calendarItems} viewMode={viewMode} />
          ) : (
            <MediaCollectionView
              items={tab === "watchlist" ? watchListItems : tab === "liked" ? likesItems : historyItems}
              query={activeQuery}
              viewMode={viewMode}
              sorting={listQueryToSorting(sortQuery)}
              onSortingChange={setSorting}
            />
          )}
        </div>
      )}
    </Container>
  );
}
