import { Trans } from "@lingui/react/macro";
import { useQuery } from "@tanstack/react-query";

import { Card } from "@/shared/ui/card";

import { userQueries } from "@/features/user/hooks/user.queries";

interface UserProfileStatsProps {
  userId: string;
  enabled?: boolean;
}

function StatBlock({ value, label, sublabel }: { value: number; label: React.ReactNode; sublabel?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center gap-0.5 px-3">
      <span className="text-xl md:text-2xl font-semibold tracking-tight tabular-nums">{value}</span>
      <span className="text-xs uppercase text-muted-foreground font-medium text-center">{label}</span>
      {sublabel && <span className="text-[9px] text-muted-foreground">{sublabel}</span>}
    </div>
  );
}

function StatDivider() {
  return <div className="w-px self-stretch bg-border/80" aria-hidden />;
}

export function UserProfileStats({ userId, enabled = true }: UserProfileStatsProps) {
  const { data } = useQuery({
    ...userQueries.stats(userId),
    enabled,
  });

  if (!enabled || !data) return null;

  return (
    <Card className="flex flex-row gap-3 py-2 px-6">
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
