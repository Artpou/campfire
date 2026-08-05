export const mediaTypeEnum = ["movie", "tv"] as const;
export type MediaType = (typeof mediaTypeEnum)[number];

export const userRoleEnum = ["owner", "admin", "member", "viewer"] as const;
export type UserRole = (typeof userRoleEnum)[number];

export const indexerTypeEnum = ["prowlarr", "jackett", "stremio"] as const;
export type IndexerType = (typeof indexerTypeEnum)[number];

export const indexerPrivacyEnum = ["public", "semi-private", "private"] as const;
export type IndexerPrivacy = (typeof indexerPrivacyEnum)[number];

export const torrentStatusEnum = ["queued", "downloading", "completed", "failed", "paused"] as const;
export type TorrentStatus = (typeof torrentStatusEnum)[number];

export const storageProtocolEnum = ["ftp", "webdav"] as const;
export type StorageProtocol = (typeof storageProtocolEnum)[number];

export const activityLogTypeEnum = ["INFO", "SUCCESS", "WARNING", "ERROR"] as const;
export type ActivityLogType = (typeof activityLogTypeEnum)[number];

export const activityLogActionEnum = [
  "USER_LOGIN",
  "USER_CREATE",
  "USER_LOGOUT",
  "MEDIA_SEARCH",
  "STREAM_START",
  "DOWNLOAD_START",
  "DOWNLOAD_PAUSE",
  "DOWNLOAD_RESUME",
  "DOWNLOAD_DELETE",
  "DOWNLOAD_COMPLETE",
  "DOWNLOAD_TRANSFERRED",
  "INDEXER_ADD",
  "INDEXER_DELETE",
  "REMOTE_SYNC",
  "SYSTEM_ERROR",
] as const;
export type ActivityLogAction = (typeof activityLogActionEnum)[number];
