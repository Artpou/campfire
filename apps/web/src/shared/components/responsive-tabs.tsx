import type { ReactNode } from "react";

import { CheckIcon, ChevronDownIcon, type LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { useIsMobile } from "@/shared/hooks/use-mobile";
import { Button } from "@/shared/ui/button";
import {
  DropDrawer,
  DropDrawerContent,
  DropDrawerGroup,
  DropDrawerItem,
  DropDrawerTrigger,
} from "@/shared/ui/dropdrawer";
import { Tabs, TabsList, TabsTrigger } from "@/shared/ui/tabs";

type ResponsiveTabOption = {
  value: string;
  label: ReactNode;
  icon?: LucideIcon;
};

interface ResponsiveTabsProps {
  value: string;
  onValueChange: (value: string) => void;
  options: ResponsiveTabOption[];
  className?: string;
  listClassName?: string;
  /** Force select/drawer UI even on desktop (useful for many options). */
  forceSelect?: boolean;
}

export function ResponsiveTabs({
  value,
  onValueChange,
  options,
  className,
  listClassName,
  forceSelect = false,
}: ResponsiveTabsProps) {
  const isMobile = useIsMobile();
  const useSelect = forceSelect || isMobile || options.length > 8;
  const selected = options.find((option) => option.value === value) ?? options[0];
  const SelectedIcon = selected?.icon;

  if (useSelect) {
    return (
      <DropDrawer>
        <DropDrawerTrigger asChild>
          <Button variant="outline" size="lg" className={cn("w-full bg-input justify-between gap-2", className)}>
            <span className="flex min-w-0 items-center gap-2">
              {SelectedIcon ? <SelectedIcon className="size-4 shrink-0 text-foreground" /> : null}
              <span className="truncate font-medium">{selected?.label}</span>
            </span>
            <ChevronDownIcon className="size-4 shrink-0 opacity-50" />
          </Button>
        </DropDrawerTrigger>
        <DropDrawerContent>
          <DropDrawerGroup>
            {options.map((option) => {
              const Icon = option.icon;
              return (
                <DropDrawerItem
                  key={option.value}
                  onSelect={() => onValueChange(option.value)}
                  icon={option.value === value ? <CheckIcon className="size-4" /> : undefined}
                >
                  <span className="flex items-center gap-2">
                    {Icon ? <Icon className="size-4 text-foreground" /> : null}
                    {option.label}
                  </span>
                </DropDrawerItem>
              );
            })}
          </DropDrawerGroup>
        </DropDrawerContent>
      </DropDrawer>
    );
  }

  return (
    <Tabs value={value} onValueChange={onValueChange} className={cn("min-w-0", className)}>
      <TabsList
        size="lg"
        className={cn("overflow-x-auto overscroll-x-contain touch-pan-x justify-start flex-nowrap", listClassName)}
      >
        {options.map((option) => {
          const Icon = option.icon;
          return (
            <TabsTrigger key={option.value} value={option.value} size="lg" className="shrink-0 gap-2">
              {Icon ? <Icon className="size-4 text-foreground" /> : null}
              <span className="font-medium">{option.label}</span>
            </TabsTrigger>
          );
        })}
      </TabsList>
    </Tabs>
  );
}
