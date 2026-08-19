export const mediaTypeEnum = ["movie", "tv"] as const;
export type MediaType = (typeof mediaTypeEnum)[number];

export const userRoleEnum = ["owner", "admin", "member", "viewer"] as const;
export type UserRole = (typeof userRoleEnum)[number];

/** Numeric hierarchy for role comparisons (owner > admin > member > viewer). */
export const ROLE_LEVELS: Record<UserRole, number> = {
  owner: 4,
  admin: 3,
  member: 2,
  viewer: 1,
};

export function hasMinRole(role: UserRole | undefined, minRole: UserRole): boolean {
  if (!role) return false;
  return ROLE_LEVELS[role] >= ROLE_LEVELS[minRole];
}

export const indexerTypeEnum = ["prowlarr", "jackett", "stremio"] as const;
export type IndexerType = (typeof indexerTypeEnum)[number];

export const indexerPrivacyEnum = ["public", "semi-private", "private"] as const;
export type IndexerPrivacy = (typeof indexerPrivacyEnum)[number];

export const torrentStatusEnum = ["queued", "downloading", "completed", "failed", "paused"] as const;
export type TorrentStatus = (typeof torrentStatusEnum)[number];

export const storageProtocolEnum = ["ftp", "webdav"] as const;
export type StorageProtocol = (typeof storageProtocolEnum)[number];

export const activityTypeEnum = ["SUCCESS", "WARNING", "ERROR"] as const;
export type ActivityType = (typeof activityTypeEnum)[number];

export const activityActionEnum = [
  "USER_LOGIN",
  "USER_CREATE",
  "USER_LOGOUT",
  "USER_DELETE",
  "USER_MODIFY",
  "DOWNLOAD_START",
  "DOWNLOAD_DELETE",
  "DOWNLOAD_COMPLETE",
  "DOWNLOAD_TRANSFERRED",
  "REMOTE_SYNC",
  "ADDON_ENABLE",
  "ADDON_DISABLE",
  "ADDON_MODIFY",
  "MEDIA_WATCH",
  "SYSTEM_ERROR",
] as const;
export type ActivityAction = (typeof activityActionEnum)[number];

export const activityCategoryEnum = ["user", "download", "module", "others"] as const;
export type ActivityCategory = (typeof activityCategoryEnum)[number];
