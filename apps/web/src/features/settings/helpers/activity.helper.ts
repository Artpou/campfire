import type { ActivityAction } from "@seedarr/contracts";
import {
  ActivityIcon,
  AlertTriangleIcon,
  DownloadIcon,
  EyeIcon,
  HardDriveIcon,
  LogInIcon,
  LogOutIcon,
  type LucideIcon,
  PencilIcon,
  PuzzleIcon,
  RefreshCwIcon,
  Trash2Icon,
  UserMinusIcon,
  UserPlusIcon,
} from "lucide-react";

const ACTIVITY_ACTION_ICONS: Record<ActivityAction, LucideIcon> = {
  USER_LOGIN: LogInIcon,
  USER_CREATE: UserPlusIcon,
  USER_LOGOUT: LogOutIcon,
  USER_DELETE: UserMinusIcon,
  USER_MODIFY: PencilIcon,
  DOWNLOAD_START: DownloadIcon,
  DOWNLOAD_DELETE: Trash2Icon,
  DOWNLOAD_COMPLETE: DownloadIcon,
  DOWNLOAD_TRANSFERRED: HardDriveIcon,
  REMOTE_SYNC: RefreshCwIcon,
  ADDON_ENABLE: PuzzleIcon,
  ADDON_DISABLE: PuzzleIcon,
  ADDON_MODIFY: PuzzleIcon,
  MEDIA_WATCH: EyeIcon,
  SYSTEM_ERROR: AlertTriangleIcon,
};

export function getActivityActionIcon(action: string): LucideIcon {
  return ACTIVITY_ACTION_ICONS[action as ActivityAction] ?? ActivityIcon;
}

export function parseActivityMetadata(metadata: string | null): Record<string, unknown> | null {
  if (!metadata) return null;
  try {
    return JSON.parse(metadata) as Record<string, unknown>;
  } catch {
    return null;
  }
}

export function formatActivityAction(action: string): string {
  return action.replaceAll("_", " ").toLowerCase();
}
