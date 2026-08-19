import { Trans } from "@lingui/react/macro";
import {
  BellIcon,
  HardDriveIcon,
  LayoutGridIcon,
  type LucideIcon,
  RadarIcon,
  Settings2Icon,
  UsersIcon,
} from "lucide-react";

import { ResponsiveTabs } from "@/shared/components/responsive-tabs";

import type { ModuleListFilter } from "@/features/module/helpers/module-list.helper";

const FILTERS: { id: ModuleListFilter; label: React.ReactNode; icon: LucideIcon }[] = [
  { id: "all", label: <Trans>All</Trans>, icon: LayoutGridIcon },
  { id: "system", label: <Trans>System</Trans>, icon: Settings2Icon },
  { id: "indexer", label: <Trans>Indexers</Trans>, icon: RadarIcon },
  { id: "storage", label: <Trans>Storage</Trans>, icon: HardDriveIcon },
  { id: "social", label: <Trans>Social</Trans>, icon: UsersIcon },
  { id: "notification", label: <Trans>Notifications</Trans>, icon: BellIcon },
];

const VALID = new Set(FILTERS.map((f) => f.id));

export function parseModuleFilter(value: unknown): ModuleListFilter {
  if (typeof value === "string" && VALID.has(value as ModuleListFilter)) {
    return value as ModuleListFilter;
  }
  return "all";
}

interface ModuleTabsFilterProps {
  value: ModuleListFilter;
  onChange: (value: ModuleListFilter) => void;
  className?: string;
}

export function ModuleTabsFilter({ value, onChange, className }: ModuleTabsFilterProps) {
  return (
    <ResponsiveTabs
      className={className}
      value={value}
      onValueChange={(v) => onChange(v as ModuleListFilter)}
      options={FILTERS.map((f) => ({ value: f.id, label: f.label, icon: f.icon }))}
    />
  );
}
