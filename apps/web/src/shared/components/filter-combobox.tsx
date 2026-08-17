import * as React from "react";

import { msg } from "@lingui/core/macro";
import { useLingui } from "@lingui/react/macro";

import {
  Combobox,
  ComboboxChip,
  ComboboxChips,
  ComboboxChipsInput,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxItem,
  ComboboxList,
  ComboboxValue,
  useComboboxAnchor,
} from "@/shared/ui/combobox";

import type { FilterOption } from "@/features/media/helpers/filter-options.helper";

interface FilterComboboxProps {
  items: FilterOption[];
  value: FilterOption[];
  onValueChange: (value: FilterOption[]) => void;
  placeholder?: string;
  emptyLabel?: React.ReactNode;
  onInputValueChange?: (value: string) => void;
  filter?: null | ((item: FilterOption, query: string) => boolean);
  disabled?: boolean;
}

export function FilterCombobox({
  items,
  value,
  onValueChange,
  placeholder,
  emptyLabel,
  onInputValueChange,
  filter,
  disabled,
}: FilterComboboxProps) {
  const { t } = useLingui();
  const anchor = useComboboxAnchor();

  return (
    <Combobox
      multiple
      autoHighlight
      items={items}
      value={value}
      onValueChange={onValueChange}
      itemToStringLabel={(item) => item.name}
      itemToStringValue={(item) => item.id}
      isItemEqualToValue={(a, b) => a.id === b.id}
      onInputValueChange={onInputValueChange}
      filter={filter}
      disabled={disabled}
    >
      <ComboboxChips ref={anchor} className="w-full">
        <ComboboxValue>
          {(values: FilterOption[]) => (
            <React.Fragment>
              {values.map((item) => (
                <ComboboxChip key={item.id}>
                  {item.image ? (
                    <span className="flex items-center gap-1.5">
                      <img src={item.image} alt="" className="size-4 rounded-sm object-cover" />
                      {item.name}
                    </span>
                  ) : (
                    item.name
                  )}
                </ComboboxChip>
              ))}
              <ComboboxChipsInput placeholder={placeholder ?? t(msg`Select...`)} />
            </React.Fragment>
          )}
        </ComboboxValue>
      </ComboboxChips>
      <ComboboxContent anchor={anchor}>
        <ComboboxEmpty>{emptyLabel ?? <span>{t(msg`No items found.`)}</span>}</ComboboxEmpty>
        <ComboboxList>
          {(item: FilterOption) => (
            <ComboboxItem key={item.id} value={item}>
              {item.image ? <img src={item.image} alt="" className="size-5 rounded-sm object-cover" /> : null}
              {item.name}
            </ComboboxItem>
          )}
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  );
}
