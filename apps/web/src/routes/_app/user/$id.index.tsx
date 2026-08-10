import { useEffect, useState } from "react";

import { Trans, useLingui } from "@lingui/react/macro";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import {
  BookmarkIcon,
  CalendarIcon,
  ClockIcon,
  GlobeIcon,
  HeartIcon,
  KeyIcon,
  MoonIcon,
  PaletteIcon,
  SaveIcon,
  SunIcon,
} from "lucide-react";

import { SeedarrLoaderContainer } from "@/shared/components/seedarr-loader-container";
import { SelectI18nLang } from "@/shared/components/select/select-i18n-lang";
import { useTheme } from "@/shared/hooks/use-theme";
import { Button } from "@/shared/ui/button";
import { Container } from "@/shared/ui/container";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";

import { useAuth } from "@/features/auth/auth-store";
import { MediaCarousel } from "@/features/media/components/carousel/media-carousel";
import { mediaQueries } from "@/features/media/hooks/media.queries";
import { RequestCarousel } from "@/features/request/components/request-carousel";
import { requestQueries } from "@/features/request/hooks/request.queries";
import { PasswordChangeModal } from "@/features/user/components/password-change-modal";
import { RoleBadge } from "@/features/user/components/role-badge";
import { UserAvatar } from "@/features/user/components/user-avatar";
import { userQueries, useUpdateProfile } from "@/features/user/hooks/user.queries";

export const Route = createFileRoute("/_app/user/$id/")({
  component: UserProfilePage,
  pendingComponent: () => <SeedarrLoaderContainer />,
});

function UserProfilePage() {
  const { id } = Route.useParams();
  const currentUser = useAuth((s) => s.user);
  const isOwnProfile = currentUser?.id === id;

  const { data: profileUser, isLoading } = useQuery(userQueries.details(id));

  const { data: requestsData } = useQuery({
    ...requestQueries.mine(),
    enabled: isOwnProfile,
  });

  const { data: watchListData } = useInfiniteQuery(mediaQueries.list({ filter: "watch-list", userId: id, limit: 20 }));
  const { data: likesData } = useInfiniteQuery(mediaQueries.list({ filter: "like", userId: id, limit: 20 }));
  const { data: historyData } = useInfiniteQuery(mediaQueries.list({ filter: "history", userId: id, limit: 20 }));

  if (isLoading || !profileUser) return <SeedarrLoaderContainer />;

  const watchListItems = watchListData?.pages?.flatMap((p) => p.results) ?? [];
  const likesItems = likesData?.pages?.flatMap((p) => p.results) ?? [];
  const historyItems = historyData?.pages?.flatMap((p) => p.results) ?? [];
  const displayName = profileUser.pseudo || profileUser.username;

  return (
    <div className="pb-20">
      <div className="relative w-full pb-6 pt-6">
        <div className="absolute inset-0 -z-10 bg-linear-to-br from-[oklch(0.22_0.004_240)] via-[oklch(0.18_0.01_250)] to-background">
          <div className="absolute inset-0 bg-linear-to-b from-black/40 via-transparent to-background" />
        </div>

        <Container className="flex flex-col md:flex-row gap-6 items-center md:items-start relative">
          <UserAvatar user={profileUser} editable={isOwnProfile} />

          <div className="flex-1 space-y-2 text-center md:text-left min-w-0">
            <h1 className="text-2xl font-bold truncate">{displayName}</h1>
            <p className="text-sm text-muted-foreground">@{profileUser.username}</p>
            <div className="flex items-center gap-2 justify-center md:justify-start flex-wrap">
              <RoleBadge role={profileUser.role} />
              {profileUser.createdAt && (
                <span className="text-sm text-muted-foreground flex items-center gap-1">
                  <CalendarIcon className="size-3.5" />
                  <Trans>Member since</Trans> {new Date(profileUser.createdAt).toLocaleDateString()}
                </span>
              )}
            </div>
          </div>
        </Container>
      </div>

      <Container className="space-y-10 mt-6">
        {isOwnProfile && <ProfilePreferences initialPseudo={profileUser.pseudo} />}

        {isOwnProfile && requestsData && requestsData.length > 0 && <RequestCarousel requests={requestsData} />}

        {watchListItems.length > 0 && (
          <MediaCarousel
            title={
              <span className="flex items-center gap-2">
                <BookmarkIcon className="size-5" />
                <Trans>Watch List</Trans>
              </span>
            }
            data={watchListItems}
            seeMoreTo={`/user/${id}/watch-list`}
          />
        )}

        {likesItems.length > 0 && (
          <MediaCarousel
            title={
              <span className="flex items-center gap-2">
                <HeartIcon className="size-5" />
                <Trans>Liked</Trans>
              </span>
            }
            data={likesItems}
            seeMoreTo={`/user/${id}/likes`}
          />
        )}

        {historyItems.length > 0 && (
          <MediaCarousel
            title={
              <span className="flex items-center gap-2">
                <ClockIcon className="size-5" />
                <Trans>Watch History</Trans>
              </span>
            }
            data={historyItems}
            seeMoreTo={`/user/${id}/history`}
          />
        )}
      </Container>
    </div>
  );
}

function ProfilePreferences({ initialPseudo }: { initialPseudo: string | null }) {
  const { t } = useLingui();
  const { theme, toggleTheme } = useTheme();
  const [pseudo, setPseudo] = useState(initialPseudo ?? "");
  const [passwordOpen, setPasswordOpen] = useState(false);
  const updateProfile = useUpdateProfile();

  useEffect(() => {
    setPseudo(initialPseudo ?? "");
  }, [initialPseudo]);

  const handleSavePseudo = () => {
    const trimmed = pseudo.trim();
    updateProfile.mutate({ pseudo: trimmed.length > 0 ? trimmed : null });
  };

  const pseudoDirty = (pseudo.trim() || null) !== (initialPseudo ?? null);

  return (
    <section className="space-y-4 max-w-xl">
      <h2 className="text-lg font-semibold">
        <Trans>Preferences</Trans>
      </h2>

      <div className="flex flex-col gap-4 border rounded-md p-4">
        <div className="space-y-2">
          <Label htmlFor="pseudo">
            <Trans>Display name</Trans>
          </Label>
          <div className="flex items-center gap-2">
            <Input
              id="pseudo"
              value={pseudo}
              onChange={(e) => setPseudo(e.target.value)}
              placeholder={t`Display name`}
              maxLength={64}
            />
            <Button
              type="button"
              size="sm"
              disabled={!pseudoDirty || updateProfile.isPending}
              onClick={handleSavePseudo}
            >
              <SaveIcon className="size-4" />
              <Trans>Save</Trans>
            </Button>
          </div>
          <p className="text-sm text-muted-foreground">
            <Trans>Shown on your profile. Your username stays the same for login.</Trans>
          </p>
        </div>
      </div>

      <div className="flex items-center justify-between gap-4 border rounded-md p-4">
        <h3 className="flex items-center gap-3">
          <GlobeIcon className="size-4" />
          <Trans>Language</Trans>
        </h3>
        <SelectI18nLang />
      </div>

      <div className="flex items-center justify-between gap-4 border rounded-md p-4">
        <h3 className="flex items-center gap-3">
          <PaletteIcon className="size-4" />
          <Trans>Theme</Trans>
        </h3>
        <Button variant="secondary" onClick={toggleTheme}>
          {theme === "dark" ? <SunIcon className="size-4" /> : <MoonIcon className="size-4" />}
          {theme === "dark" ? <Trans>Light mode</Trans> : <Trans>Dark mode</Trans>}
        </Button>
      </div>

      <div className="flex items-center justify-between gap-4 border rounded-md p-4">
        <h3 className="flex items-center gap-3">
          <KeyIcon className="size-4" />
          <Trans>Password</Trans>
        </h3>
        <Button variant="secondary" onClick={() => setPasswordOpen(true)}>
          <Trans>Change Password</Trans>
        </Button>
      </div>

      <PasswordChangeModal open={passwordOpen} onOpenChange={setPasswordOpen} />
    </section>
  );
}
