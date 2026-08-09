import * as React from "react";

import { msg } from "@lingui/core/macro";
import { useLingui } from "@lingui/react/macro";

import { Button } from "@/shared/ui/button";
import { Calendar } from "@/shared/ui/calendar";
import { Field, FieldLabel } from "@/shared/ui/field";
import { Popover, PopoverContent, PopoverTrigger } from "@/shared/ui/popover";

function parseIsoDate(value?: string): Date | undefined {
  if (!value) return undefined;
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return undefined;
  return new Date(year, month - 1, day);
}

function toIsoDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

interface DatePickerProps {
  id: string;
  label: React.ReactNode;
  value?: string;
  onChange: (value?: string) => void;
  placeholder?: string;
}

export function DatePicker({ id, label, value, onChange, placeholder }: DatePickerProps) {
  const { t } = useLingui();
  const [open, setOpen] = React.useState(false);
  const date = parseIsoDate(value);

  return (
    <Field className="w-full gap-1.5">
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            id={id}
            className="w-full justify-start font-normal"
            aria-label={typeof label === "string" ? label : undefined}
          >
            {date ? date.toLocaleDateString() : (placeholder ?? t(msg`Select date`))}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto overflow-hidden p-0" align="start">
          <Calendar
            mode="single"
            selected={date}
            defaultMonth={date}
            captionLayout="dropdown"
            startMonth={new Date(1900, 0)}
            endMonth={new Date(2100, 11)}
            onSelect={(next) => {
              onChange(next ? toIsoDate(next) : undefined);
              setOpen(false);
            }}
          />
        </PopoverContent>
      </Popover>
    </Field>
  );
}
