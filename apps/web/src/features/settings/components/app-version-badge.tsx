import { useQuery } from "@tanstack/react-query";

import { versionQueries } from "@/features/settings/hooks/version.queries";

export function AppVersionBadge() {
  const { data } = useQuery(versionQueries.get());

  if (!data) {
    return <p className="text-xs text-muted-foreground">…</p>;
  }

  return (
    <p className="text-xs text-muted-foreground">
      v{data.version}
      {data.channel !== "development" && ` · ${data.channel}`}
    </p>
  );
}
