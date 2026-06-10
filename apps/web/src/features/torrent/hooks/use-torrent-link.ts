import { getBaseUrl } from "@seedarr/sdk";

import { useAuth } from "@/features/auth/auth-store";

export function useTorrentLink(id: string): string {
  const { user } = useAuth();
  return `${getBaseUrl()}/downloads/${id}/stream?session=${user?.sessionToken}`;
}
