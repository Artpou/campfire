import { Trans } from "@lingui/react/macro";
import { useQuery } from "@tanstack/react-query";

import { StatBlock, StatDivider } from "@/shared/components/stats/stat-block";
import { Card } from "@/shared/ui/card";

import { userQueries } from "@/features/user/hooks/user.queries";

interface UserProfileStatsProps {
  userId: string;
  enabled?: boolean;
}

export function UserProfileStats({ userId, enabled = true }: UserProfileStatsProps) {
  const { data } = useQuery({
    ...userQueries.stats(userId),
    enabled,
  });

  if (!enabled || !data) return null;

  return (
    <Card className="w-full flex flex-row gap-3 py-2 px-6">
      <StatBlock value={data.movies.thisYear} label={<Trans>Movies</Trans>} sublabel={<Trans>this year</Trans>} />
      <StatDivider />
      <StatBlock value={data.movies.allTime} label={<Trans>Movies</Trans>} sublabel={<Trans>all time</Trans>} />
      <StatDivider />
      <StatBlock value={data.tv.thisYear} label={<Trans>TV</Trans>} sublabel={<Trans>this year</Trans>} />
      <StatDivider />
      <StatBlock value={data.tv.allTime} label={<Trans>TV</Trans>} sublabel={<Trans>all time</Trans>} />
    </Card>
  );
}
