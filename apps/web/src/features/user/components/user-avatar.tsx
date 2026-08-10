import { useRef, useState } from "react";

import { useLingui } from "@lingui/react/macro";
import type { User } from "@seedarr/sdk";
import { PencilIcon, UserIcon } from "lucide-react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";

import { useUploadAvatar } from "@/features/user/hooks/user.queries";

const AVATAR_MAX_BYTES = 2 * 1024 * 1024;
const AVATAR_ACCEPT = ["image/jpeg", "image/png", "image/webp", "image/gif"] as const;

interface UserAvatarProps {
  user: Pick<User, "id" | "avatarPath" | "username" | "pseudo">;
  editable?: boolean;
  size?: "sm" | "md";
  className?: string;
}

export function getAvatarUrl(userId: string, avatarPath: string | null | undefined): string | null {
  if (!avatarPath) return null;
  return `/avatars/${userId}?v=${encodeURIComponent(avatarPath)}`;
}

export function UserAvatar({ user, editable = false, size = "md", className }: UserAvatarProps) {
  const { t } = useLingui();
  const inputRef = useRef<HTMLInputElement>(null);
  const [previewError, setPreviewError] = useState(false);
  const uploadAvatar = useUploadAvatar();

  const handleFile = (file: File | undefined) => {
    if (!file) return;
    if (!(AVATAR_ACCEPT as readonly string[]).includes(file.type)) {
      toast.error(t`Invalid image type. Allowed: JPEG, PNG, WebP, GIF`);
      return;
    }
    if (file.size > AVATAR_MAX_BYTES) {
      toast.error(t`Image too large. Maximum size is 2MB`);
      return;
    }
    uploadAvatar.mutate(file, { onSuccess: () => setPreviewError(false) });
  };

  const avatarUrl = getAvatarUrl(user.id, user.avatarPath);
  const sizeClass = size === "sm" ? "size-16" : "size-20";

  return (
    <div className={cn("relative shrink-0 group", className)}>
      <div
        className={cn(
          sizeClass,
          "rounded-full bg-muted border border-border/60 flex items-center justify-center overflow-hidden shadow-lg",
        )}
      >
        {avatarUrl && !previewError ? (
          <img
            src={avatarUrl}
            alt={user.pseudo || user.username}
            className="size-full object-cover"
            onError={() => setPreviewError(true)}
          />
        ) : (
          <UserIcon className={size === "sm" ? "size-7 text-muted-foreground" : "size-8 text-muted-foreground"} />
        )}
      </div>

      {editable && (
        <>
          <button
            type="button"
            className="absolute inset-0 rounded-full bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer"
            onClick={() => inputRef.current?.click()}
            disabled={uploadAvatar.isPending}
            aria-label={t`Change profile picture`}
          >
            <PencilIcon className="size-5 text-white" />
          </button>
          <input
            ref={inputRef}
            type="file"
            accept={AVATAR_ACCEPT.join(",")}
            className="hidden"
            onChange={(e) => {
              handleFile(e.target.files?.[0]);
              e.target.value = "";
            }}
          />
        </>
      )}
    </div>
  );
}
