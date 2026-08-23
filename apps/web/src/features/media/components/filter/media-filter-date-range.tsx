import { Trans } from "@lingui/react/macro";

import { Input } from "@/shared/ui/input";

interface MediaFilterDateRangeProps {
  value: { date_gte?: string; date_lte?: string };
  onChange: (value: { date_gte?: string; date_lte?: string }) => void;
  idPrefix: string;
}

export function MediaFilterDateRange({ value, onChange, idPrefix }: MediaFilterDateRangeProps) {
  return (
    <div className="grid grid-cols-2 gap-3">
      <Input
        type="date"
        id={`${idPrefix}-gte`}
        label={<Trans>From</Trans>}
        value={value.date_gte}
        onChange={(e) => onChange({ ...value, date_gte: e.target.value })}
      />
      <Input
        type="date"
        id={`${idPrefix}-lte`}
        label={<Trans>To</Trans>}
        value={value.date_lte}
        onChange={(e) => onChange({ ...value, date_lte: e.target.value })}
      />
    </div>
  );
}
