import type { ReactNode } from "react";
import { useMemo, useState } from "react";

import { CheckIcon, ChevronDownIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button, type ButtonProps } from "@/shared/ui/button";
import {
  DropDrawer,
  DropDrawerContent,
  DropDrawerGroup,
  DropDrawerItem,
  DropDrawerLabel,
  DropDrawerTrigger,
} from "@/shared/ui/dropdrawer";
import { Input } from "@/shared/ui/input";
import { LabelWrapper } from "@/shared/ui/label";

const SEARCH_THRESHOLD = 20;

type SelectOption<T extends string = string> = {
  value: T;
  label: ReactNode;
  image?: string;
};

interface BaseSelectProps<T extends string = string> {
  options: SelectOption<T>[];
  label?: ReactNode;
  placeholder?: ReactNode;
  emptyLabel?: ReactNode;
  triggerClassName?: string;
  contentClassName?: string;
  disabled?: boolean;
  panelLabel?: ReactNode;
  trigger?: ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onSearchChange?: (query: string) => void;
  searchPlaceholder?: string;
}

interface SingleSelectProps<T extends string = string> extends BaseSelectProps<T> {
  multi?: false;
  value: T;
  onValueChange: (value: T) => void;
}

interface MultiSelectProps<T extends string = string> extends BaseSelectProps<T> {
  multi: true;
  value: T[];
  onValueChange: (value: T[]) => void;
}

export type SelectProps<T extends string = string> = SingleSelectProps<T> | MultiSelectProps<T>;

function SelectTriggerButton({
  children,
  className,
  variant = "secondary",
  size = "default",
  ...props
}: Omit<ButtonProps, "icon">) {
  return (
    <Button
      variant={variant}
      size={size}
      className={cn("w-full justify-between gap-2 bg-input hover:bg-input/80", className)}
      {...props}
    >
      <span className="truncate font-medium">{children}</span>
      <ChevronDownIcon className="size-4 shrink-0 opacity-50" />
    </Button>
  );
}

export function Select<T extends string = string>(props: SelectProps<T>) {
  const {
    options,
    label,
    placeholder = "Select...",
    emptyLabel = "No options.",
    triggerClassName,
    contentClassName,
    disabled,
    panelLabel,
    trigger,
    open: openProp,
    onOpenChange: onOpenChangeProp,
    onSearchChange,
    searchPlaceholder = "Search...",
  } = props;

  const [search, setSearch] = useState("");
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);

  const isControlled = openProp !== undefined;
  const open = isControlled ? openProp : uncontrolledOpen;

  const showSearch = Boolean(onSearchChange) || options.length > SEARCH_THRESHOLD;

  const handleSearchChange = (next: string) => {
    setSearch(next);
    onSearchChange?.(next);
  };

  const handleOpenChange = (next: boolean) => {
    if (!next) {
      setSearch("");
      onSearchChange?.("");
    }
    if (!isControlled) {
      setUncontrolledOpen(next);
    }
    onOpenChangeProp?.(next);
  };

  const filteredOptions = useMemo(() => {
    if (onSearchChange || !search.trim()) return options;
    const q = search.trim().toLowerCase();
    return options.filter((option) => {
      if (typeof option.label === "string") return option.label.toLowerCase().includes(q);
      return String(option.value).toLowerCase().includes(q);
    });
  }, [options, onSearchChange, search]);

  const isSelected = (val: T) => {
    if (props.multi) {
      return props.value.includes(val);
    }
    return props.value === val;
  };

  const handleSelect = (val: T, event: Event) => {
    if (props.multi) {
      event.preventDefault();
      const currentValues = props.value;
      if (currentValues.includes(val)) {
        props.onValueChange(currentValues.filter((item) => item !== val));
      } else {
        props.onValueChange([...currentValues, val]);
      }
    } else {
      props.onValueChange(val);
    }
  };

  const renderTriggerContent = () => {
    if (props.multi) {
      if (props.value.length === 0) return placeholder;
      const selectedOpts = options.filter((o) => props.value.includes(o.value));
      if (selectedOpts.length === 0) return placeholder;

      return selectedOpts.map((o) => (typeof o.label === "string" ? o.label : o.value)).join(", ");
    }

    const selected = options.find((o) => o.value === props.value);
    return selected?.label ?? placeholder;
  };

  return (
    <LabelWrapper label={label}>
      <DropDrawer open={open} onOpenChange={handleOpenChange}>
        <DropDrawerTrigger asChild disabled={disabled}>
          {trigger ?? (
            <SelectTriggerButton className={triggerClassName} disabled={disabled}>
              {renderTriggerContent()}
            </SelectTriggerButton>
          )}
        </DropDrawerTrigger>
        <DropDrawerContent
          className={cn(
            !trigger && "w-(--radix-dropdown-menu-trigger-width) min-w-(--radix-dropdown-menu-trigger-width)",
            contentClassName,
          )}
        >
          {panelLabel ? <DropDrawerLabel>{panelLabel}</DropDrawerLabel> : null}
          {showSearch ? (
            <div className="px-2 pb-2" onPointerDown={(e) => e.stopPropagation()}>
              <Input
                type="search"
                search
                value={search}
                classNameWrapper="mt-2 sm:mt-0"
                onChange={(e) => handleSearchChange(e.target.value)}
                onKeyDown={(e) => e.stopPropagation()}
                onPointerDown={(e) => e.preventDefault()}
                placeholder={searchPlaceholder}
              />
            </div>
          ) : null}
          <DropDrawerGroup className="max-h-64 overflow-y-auto">
            {filteredOptions.length === 0 ? (
              <div className="px-4 py-3 text-sm text-muted-foreground">{emptyLabel}</div>
            ) : (
              filteredOptions.map((option) => {
                const active = isSelected(option.value);
                return (
                  <DropDrawerItem
                    key={option.value}
                    onSelect={(event) => handleSelect(option.value, event)}
                    icon={active ? <CheckIcon className="size-4" /> : undefined}
                  >
                    {option.image ? (
                      <span className="flex items-center gap-2">
                        <img src={option.image} alt="" className="size-4 rounded-sm object-cover" />
                        {option.label}
                      </span>
                    ) : (
                      option.label
                    )}
                  </DropDrawerItem>
                );
              })
            )}
          </DropDrawerGroup>
        </DropDrawerContent>
      </DropDrawer>
    </LabelWrapper>
  );
}
