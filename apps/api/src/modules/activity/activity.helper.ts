import type { ActivityAction, ActivityCategory } from "@seedarr/contracts";

const SENSITIVE_KEY = /password|apikey|token|secret|magnet|cookie|authorization|session/i;

export function sanitizeActivityMetadata(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sanitizeActivityMetadata);
  if (!value || typeof value !== "object") return value;

  const out: Record<string, unknown> = {};
  for (const [key, nested] of Object.entries(value as Record<string, unknown>)) {
    if (SENSITIVE_KEY.test(key)) continue;
    out[key] = sanitizeActivityMetadata(nested);
  }
  return out;
}

const ACTION_CATEGORY: Record<ActivityAction, ActivityCategory> = {
  USER_LOGIN: "user",
  USER_CREATE: "user",
  USER_LOGOUT: "user",
  USER_DELETE: "user",
  USER_MODIFY: "user",
  DOWNLOAD_START: "download",
  DOWNLOAD_DELETE: "download",
  DOWNLOAD_COMPLETE: "download",
  DOWNLOAD_TRANSFERRED: "download",
  REMOTE_SYNC: "module",
  ADDON_ENABLE: "module",
  ADDON_DISABLE: "module",
  ADDON_MODIFY: "module",
  MEDIA_WATCH: "others",
  SYSTEM_ERROR: "others",
};

export function actionsForCategory(category: ActivityCategory): ActivityAction[] {
  return (Object.keys(ACTION_CATEGORY) as ActivityAction[]).filter((action) => ACTION_CATEGORY[action] === category);
}

export function addonActionFromPatch(enabled: boolean | undefined): ActivityAction {
  if (enabled === true) return "ADDON_ENABLE";
  if (enabled === false) return "ADDON_DISABLE";
  return "ADDON_MODIFY";
}
