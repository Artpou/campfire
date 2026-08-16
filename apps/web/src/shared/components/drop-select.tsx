import type { ReactNode } from "react";

import { CheckIcon, ChevronDownIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { useIsMobile } from "@/shared/hooks/use-mobile";
import {
  DropDrawer,
  DropDrawerContent,
  DropDrawerGroup,
  DropDrawerItem,
  DropDrawerLabel,
  DropDrawerTrigger,
} from "@/shared/ui/dropdrawer";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select";

const TRIGGER_CLASS =
  "flex w-fit items-center justify-between gap-2 rounded-md bg-input px-3 py-2 text-sm whitespace-nowrap shadow-xs outline-none h-9 hover:border-ring/30 hover:ring-ring/20 hover:ring-[3px]";

type DropSelectOption<T extends string> = {
  value: T;
  label: ReactNode;
};

interface DropSelectProps<T extends string> {
  value: T;
  onValueChange: (value: T) => void;
  options: DropSelectOption<T>[];
  triggerClassName?: string;
  label?: ReactNode;
}

export function DropSelect<T extends string>({
  value,
  onValueChange,
  options,
  triggerClassName,
  label,
}: DropSelectProps<T>) {
  const isMobile = useIsMobile();
  const selected = options.find((option) => option.value === value);

  if (!isMobile) {
    return (
      <Select value={value} onValueChange={(next) => onValueChange(next as T)}>
        <SelectTrigger className={cn(triggerClassName)}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  }

  return (
    <DropDrawer>
      <DropDrawerTrigger asChild>
        <button type="button" className={cn(TRIGGER_CLASS, "w-full min-w-0", triggerClassName)}>
          <span className="flex min-w-0 items-center gap-2 truncate">{selected?.label}</span>
          <ChevronDownIcon className="size-4 shrink-0 opacity-50" />
        </button>
      </DropDrawerTrigger>
      <DropDrawerContent>
        {label ? <DropDrawerLabel>{label}</DropDrawerLabel> : null}
        <DropDrawerGroup>
          {options.map((option) => (
            <DropDrawerItem
              key={option.value}
              onSelect={() => onValueChange(option.value)}
              icon={option.value === value ? <CheckIcon className="size-4" /> : undefined}
            >
              {option.label}
            </DropDrawerItem>
          ))}
        </DropDrawerGroup>
      </DropDrawerContent>
    </DropDrawer>
  );
}
