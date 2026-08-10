import { useEffect, useState } from "react";

import { Trans, useLingui } from "@lingui/react/macro";
import { useInfiniteQuery, useQuery, useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { BookmarkIcon, CalendarIcon, ClockIcon, HeartIcon, LockIcon, PencilIcon, SaveIcon } from "lucide-react";

import { SeedarrLoaderContainer } from "@/shared/components/seedarr-loader-container";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Container } from "@/shared/ui/container";
import { Input } from "@/shared/ui/input";

import { useAuth } from "@/features/auth/auth-store";
import { MediaCarousel } from "@/features/media/components/carousel/media-carousel";
import { mediaQueries } from "@/features/media/hooks/media.queries";
import { RequestCarousel } from "@/features/request/components/request-carousel";
import { requestQueries } from "@/features/request/hooks/request.queries";
import { RoleBadge } from "@/features/user/components/role-badge";
import { UserAvatar } from "@/features/user/components/user-avatar";
import { userQueries, useUpdateProfile } from "@/features/user/hooks/user.queries";

export const Route = createFileRoute("/_app/user/$id/")({
  loader: ({ context, params }) => context.queryClient.ensureQueryData(userQueries.details(params.id)),
  component: UserProfilePage,
  pendingComponent: () => <SeedarrLoaderContainer />,
});

function PrivateBadge() {
  return (
    <Badge variant="outline" className="text-xs gap-1 text-muted-foreground">
      <LockIcon className="size-3" />
      <Trans>Private</Trans>
    </Badge>
  );
}

function UserProfilePage() {
  const { id } = Route.useParams();
  const { t } = useLingui();
  const currentUser = useAuth((s) => s.user);
  const isOwnProfile = currentUser?.id === id;
  const updateProfile = useUpdateProfile();

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

  const canSeeWatchList = isOwnProfile || profileUser.showWatchList !== false;
  const canSeeLikes = isOwnProfile || profileUser.showLikes !== false;
  const canSeeHistory = isOwnProfile || profileUser.showWatchHistory === true;

  const { data: watchListData } = useInfiniteQuery({
    ...mediaQueries.list({ filter: "watch-list", userId: id, limit: 20 }),
    enabled: canSeeWatchList,
  });
  const { data: likesData } = useInfiniteQuery({
    ...mediaQueries.list({ filter: "like", userId: id, limit: 20 }),
    enabled: canSeeLikes,
  });
  const { data: historyData } = useInfiniteQuery({
    ...mediaQueries.list({ filter: "history", userId: id, limit: 20 }),
    enabled: canSeeHistory,
  });

  const watchListItems = watchListData?.pages?.flatMap((p) => p.results) ?? [];
  const likesItems = likesData?.pages?.flatMap((p) => p.results) ?? [];
  const historyItems = historyData?.pages?.flatMap((p) => p.results) ?? [];
  const displayName = profileUser.pseudo || profileUser.username;

  const handleSavePseudo = () => {
    const trimmed = pseudo.trim();
    updateProfile.mutate({ pseudo: trimmed.length > 0 ? trimmed : null }, { onSuccess: () => setEditingPseudo(false) });
  };

  return (
    <Container className="space-y-10 pb-20">
      <div className="flex flex-col lg:flex-row gap-6 items-center lg:items-start relative">
        <div className="max-w-[250px] flex justify-center lg:justify-start">
          <UserAvatar user={profileUser} editable={isOwnProfile} />
        </div>

        <div className="lg:w-3/4 flex flex-col md:flex-row justify-between items-center md:items-start w-full gap-4 text-center md:text-left min-w-0">
          <div className="flex flex-col gap-2 w-full max-w-md">
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
                <h1 className="text-2xl font-bold truncate">{displayName}</h1>
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
                <span className="text-sm text-muted-foreground flex items-center gap-1">
                  <CalendarIcon className="size-3.5" />
                  {new Date(profileUser.createdAt).toLocaleDateString()}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {isOwnProfile && requestsData && requestsData.length > 0 && <RequestCarousel requests={requestsData} />}

      {canSeeLikes && likesItems.length > 0 && (
        <MediaCarousel
          title={
            <span className="flex items-center gap-2">
              <HeartIcon className="size-5" />
              <Trans>Liked</Trans>
              {!profileUser.showLikes && isOwnProfile && <PrivateBadge />}
            </span>
          }
          data={likesItems}
          seeMoreTo={`/user/${id}/likes`}
        />
      )}

      {canSeeWatchList && watchListItems.length > 0 && (
        <MediaCarousel
          title={
            <span className="flex items-center gap-2">
              <BookmarkIcon className="size-5" />
              <Trans>Watch List</Trans>
              {!profileUser.showWatchList && isOwnProfile && <PrivateBadge />}
            </span>
          }
          data={watchListItems}
          seeMoreTo={`/user/${id}/watch-list`}
        />
      )}

      {canSeeHistory && historyItems.length > 0 && (
        <MediaCarousel
          title={
            <span className="flex items-center gap-2">
              <ClockIcon className="size-5" />
              <Trans>Watch History</Trans>
              {!profileUser.showWatchHistory && isOwnProfile && <PrivateBadge />}
            </span>
          }
          data={historyItems}
          seeMoreTo={`/user/${id}/history`}
        />
      )}
    </Container>
  );
}
